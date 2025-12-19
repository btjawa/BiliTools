//! 本地文件传输协议实现
//!
//! 提供本地文件系统和可移动存储设备的传输功能。

use super::constants::{buffer_sizes, concurrency, flush_intervals, progress_intervals, timing};
use super::error::TransferError;
use super::filename::FilenameHandler;
use super::protocol::{ProgressSender, TransferProtocol};
use super::types::{ConflictStrategy, TaskStatus, TransferProgress, TransferTarget};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::fs;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::RwLock;

/// 本地文件传输协议
pub struct LocalFileProtocol {
    /// 活跃的传输任务状态
    active_tasks: Arc<RwLock<HashMap<String, TaskState>>>,
}

/// 任务状态
#[derive(Clone, Debug, Default)]
struct TaskState {
    /// 是否已取消
    cancelled: bool,
    /// 是否已暂停
    paused: bool,
}

impl LocalFileProtocol {
    /// 创建新的本地文件传输协议实例
    pub fn new() -> Self {
        Self {
            active_tasks: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// 确保任务已注册（如果尚未注册则注册）
    async fn ensure_task_registered(&self, task_id: &str) {
        let mut tasks = self.active_tasks.write().await;
        tasks
            .entry(task_id.to_string())
            .or_insert_with(TaskState::default);
    }

    /// 移除任务
    pub async fn unregister_task(&self, task_id: &str) {
        let mut tasks = self.active_tasks.write().await;
        tasks.remove(task_id);
    }

    /// 检查任务是否已取消
    async fn is_cancelled(&self, task_id: &str) -> bool {
        let tasks = self.active_tasks.read().await;
        tasks.get(task_id).map(|s| s.cancelled).unwrap_or(false)
    }

    /// 检查任务是否已暂停
    async fn is_paused(&self, task_id: &str) -> bool {
        let tasks = self.active_tasks.read().await;
        tasks.get(task_id).map(|s| s.paused).unwrap_or(false)
    }

    /// 等待任务恢复（如果已暂停）
    async fn wait_if_paused(&self, task_id: &str) {
        loop {
            if !self.is_paused(task_id).await {
                break;
            }
            tokio::time::sleep(tokio::time::Duration::from_millis(
                timing::PAUSE_CHECK_INTERVAL_MS,
            ))
            .await;
        }
    }

    /// 处理目标文件路径（处理冲突和特殊字符）
    async fn resolve_target_path(
        &self,
        target_path: &Path,
        strategy: &ConflictStrategy,
    ) -> Result<PathBuf, TransferError> {
        // 清理路径中的特殊字符
        let sanitized_path = FilenameHandler::sanitize_path(target_path);

        // 处理文件名冲突
        if FilenameHandler::path_exists(&sanitized_path) {
            FilenameHandler::handle_conflict(&sanitized_path, strategy)
        } else {
            Ok(sanitized_path)
        }
    }

    /// 复制单个文件（简化版本，不管理进度）
    async fn copy_file_simple(
        &self,
        source: &Path,
        target: &Path,
        _task_id: &str,
        _progress_sender: Option<&ProgressSender>,
    ) -> Result<(), TransferError> {
        // 检查源文件是否存在
        if !source.exists() {
            return Err(TransferError::SourceNotFound {
                path: source.to_string_lossy().to_string(),
            });
        }

        // 验证源文件可读
        let metadata = fs::metadata(source)
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&source.to_string_lossy())))?;

        // 如果源文件是只读的，尝试修改权限
        if metadata.permissions().readonly() {
            // 尝试修改权限，但不失败
            let _ = FilenameHandler::make_writable(source);
        }

        // 创建目标目录
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent)
                .await
                .map_err(|e| TransferError::from_io_error(e, Some(&parent.to_string_lossy())))?;
        }

        // 简单的文件复制，不报告进度
        fs::copy(source, target)
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&target.to_string_lossy())))?;

        Ok(())
    }

    /// 复制单个文件（带进度报告）
    async fn copy_file_with_progress(
        &self,
        source: &Path,
        target: &Path,
        task_id: &str,
        progress_sender: Option<&ProgressSender>,
        current_progress: &mut TransferProgress,
    ) -> Result<(), TransferError> {
        // 检查源文件是否存在
        if !source.exists() {
            return Err(TransferError::SourceNotFound {
                path: source.to_string_lossy().to_string(),
            });
        }

        // 验证源文件可读
        let metadata = fs::metadata(source)
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&source.to_string_lossy())))?;

        let file_size = metadata.len();

        // 如果源文件是只读的，尝试修改权限
        if metadata.permissions().readonly() {
            // 尝试修改权限，但不失败
            let _ = FilenameHandler::make_writable(source);
        }

        // 创建目标目录
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent)
                .await
                .map_err(|e| TransferError::from_io_error(e, Some(&parent.to_string_lossy())))?;
        }

        // 打开源文件和目标文件
        let mut source_file = fs::File::open(source)
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&source.to_string_lossy())))?;

        let mut target_file = fs::File::create(target)
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&target.to_string_lossy())))?;

        // 使用缓冲区复制 - 增大缓冲区提高性能
        let mut buffer = vec![0u8; buffer_sizes::HIGH_PERFORMANCE_BUFFER_SIZE];
        let mut total_copied = 0u64;
        let initial_transferred = current_progress.transferred_size;

        let mut flush_counter = 0;

        loop {
            // 检查是否取消
            if self.is_cancelled(task_id).await {
                // 删除不完整的目标文件
                let _ = fs::remove_file(target).await;
                return Err(TransferError::UserCancelled);
            }

            // 等待恢复（如果暂停）
            self.wait_if_paused(task_id).await;

            let n = source_file
                .read(&mut buffer)
                .await
                .map_err(|e| TransferError::from_io_error(e, Some(&source.to_string_lossy())))?;

            if n == 0 {
                break;
            }

            target_file
                .write_all(&buffer[..n])
                .await
                .map_err(|e| TransferError::from_io_error(e, Some(&target.to_string_lossy())))?;

            total_copied += n as u64;
            flush_counter += 1;

            // 每写入约96MB刷新一次缓冲区
            if flush_counter >= flush_intervals::FLUSH_COUNTER_THRESHOLD {
                target_file.flush().await.map_err(|e| {
                    TransferError::from_io_error(e, Some(&target.to_string_lossy()))
                })?;
                flush_counter = 0;
            }

            // 更新进度 - 减少更新频率
            if total_copied % progress_intervals::PROGRESS_UPDATE_INTERVAL == 0
                || total_copied == file_size
            {
                if let Some(sender) = progress_sender {
                    let new_transferred_size = initial_transferred + total_copied;
                    current_progress.update_progress(new_transferred_size);
                    current_progress.set_current_file(
                        current_progress.current_video_name.clone(),
                        source.to_string_lossy().to_string(),
                    );

                    let _ = sender.send(current_progress.clone()).await;
                }
            }
        }

        // 确保数据写入磁盘
        target_file
            .flush()
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&target.to_string_lossy())))?;

        Ok(())
    }

    /// 简单的目录复制（不管理进度）
    async fn copy_directory_simple(
        &self,
        source: &Path,
        target: &Path,
        task_id: &str,
        _progress_sender: Option<&ProgressSender>,
    ) -> Result<(), TransferError> {
        // 创建目标目录
        fs::create_dir_all(target)
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&target.to_string_lossy())))?;

        // 递归复制目录内容
        let mut entries = fs::read_dir(source)
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&source.to_string_lossy())))?;

        while let Some(entry) = entries
            .next_entry()
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&source.to_string_lossy())))?
        {
            let entry_path = entry.path();
            let entry_name = entry.file_name();
            let target_path = target.join(&entry_name);

            if entry_path.is_file() {
                // 复制文件
                fs::copy(&entry_path, &target_path).await.map_err(|e| {
                    TransferError::from_io_error(e, Some(&entry_path.to_string_lossy()))
                })?;
            } else if entry_path.is_dir() {
                // 递归复制子目录
                Box::pin(self.copy_directory_simple(&entry_path, &target_path, task_id, None))
                    .await?;
            }
        }

        Ok(())
    }

    /// 递归复制目录
    async fn copy_directory_recursive(
        &self,
        source: &Path,
        target: &Path,
        task_id: &str,
        progress_sender: Option<&ProgressSender>,
        current_progress: &mut TransferProgress,
    ) -> Result<(), TransferError> {
        // 创建目标目录
        fs::create_dir_all(target)
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&target.to_string_lossy())))?;

        // 读取源目录内容
        let mut entries = fs::read_dir(source)
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&source.to_string_lossy())))?;

        let mut _entry_count = 0;
        while let Some(entry) = entries
            .next_entry()
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&source.to_string_lossy())))?
        {
            _entry_count += 1;

            // 检查是否取消
            if self.is_cancelled(task_id).await {
                return Err(TransferError::UserCancelled);
            }

            let entry_path = entry.path();
            let file_name = entry.file_name();
            let target_path = target.join(&file_name);

            let file_type = entry.file_type().await.map_err(|e| {
                TransferError::from_io_error(e, Some(&entry_path.to_string_lossy()))
            })?;

            if file_type.is_dir() {
                // 递归复制子目录
                Box::pin(self.copy_directory_recursive(
                    &entry_path,
                    &target_path,
                    task_id,
                    progress_sender,
                    current_progress,
                ))
                .await?;
            } else if file_type.is_file() {
                // 更新当前文件信息
                current_progress.set_current_file(
                    current_progress.current_video_name.clone(),
                    entry_path.to_string_lossy().to_string(),
                );

                // 复制文件
                self.copy_file_with_progress(
                    &entry_path,
                    &target_path,
                    task_id,
                    progress_sender,
                    current_progress,
                )
                .await?;
                // 注意：不再按文件数量更新 completed_files，因为整个目录算作一个单位
            }
        }

        Ok(())
    }
}

impl Default for LocalFileProtocol {
    fn default() -> Self {
        Self::new()
    }
}

impl super::protocol::AsAny for LocalFileProtocol {
    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}

#[async_trait::async_trait]
impl TransferProtocol for LocalFileProtocol {
    fn name(&self) -> &str {
        "local"
    }

    fn description(&self) -> &str {
        "本地文件系统传输协议"
    }

    async fn validate_target(&self, target: &TransferTarget) -> Result<bool, TransferError> {
        let path = target
            .path
            .as_ref()
            .ok_or_else(|| TransferError::InvalidTargetPath {
                path: "路径为空".to_string(),
            })?;

        let path = Path::new(path);

        // 检查路径是否存在
        if !path.exists() {
            return Ok(false);
        }

        // 检查是否是目录
        if !path.is_dir() {
            return Ok(false);
        }

        // 检查写入权限（尝试创建临时文件）
        let test_file = path.join(".bilitools_write_test");
        match fs::write(&test_file, b"test").await {
            Ok(_) => {
                let _ = fs::remove_file(&test_file).await;
                Ok(true)
            }
            Err(_) => Ok(false),
        }
    }

    async fn check_space(
        &self,
        target: &TransferTarget,
        required_size: u64,
    ) -> Result<bool, TransferError> {
        let path = target
            .path
            .as_ref()
            .ok_or_else(|| TransferError::InvalidTargetPath {
                path: "路径为空".to_string(),
            })?;

        let available = get_available_space(Path::new(path))?;
        Ok(available >= required_size)
    }

    async fn transfer_file(
        &self,
        source: &Path,
        target: &TransferTarget,
        target_filename: &str,
        task_id: &str,
        progress_sender: Option<ProgressSender>,
    ) -> Result<(), TransferError> {
        let target_path = target
            .path
            .as_ref()
            .ok_or_else(|| TransferError::InvalidTargetPath {
                path: "路径为空".to_string(),
            })?;

        // 确保任务已注册（如果尚未注册）
        self.ensure_task_registered(task_id).await;

        let mut target_file_path = PathBuf::from(target_path).join(target_filename);

        // 处理文件名冲突和特殊字符
        target_file_path = self
            .resolve_target_path(&target_file_path, &ConflictStrategy::Rename)
            .await?;

        // 根据是否有 progress_sender 选择不同的复制方式
        if progress_sender.is_some() {
            // 有进度发送器，使用带进度的复制
            let metadata = fs::metadata(source)
                .await
                .map_err(|e| TransferError::from_io_error(e, Some(&source.to_string_lossy())))?;

            let mut progress = TransferProgress::new(task_id.to_string(), 1, metadata.len());
            progress.status = TaskStatus::Running;

            self.copy_file_with_progress(
                source,
                &target_file_path,
                task_id,
                progress_sender.as_ref(),
                &mut progress,
            )
            .await
        } else {
            // 没有进度发送器，使用简单复制
            self.copy_file_simple(source, &target_file_path, task_id, progress_sender.as_ref())
                .await
        }
    }

    async fn transfer_directory(
        &self,
        source: &Path,
        target: &TransferTarget,
        target_dirname: &str,
        task_id: &str,
        progress_sender: Option<ProgressSender>,
    ) -> Result<(), TransferError> {
        let target_path = target
            .path
            .as_ref()
            .ok_or_else(|| TransferError::InvalidTargetPath {
                path: "路径为空".to_string(),
            })?;

        // 确保任务已注册（如果尚未注册）
        self.ensure_task_registered(task_id).await;

        let mut target_dir_path = PathBuf::from(target_path).join(target_dirname);

        // 处理目录名冲突和特殊字符
        target_dir_path = self
            .resolve_target_path(&target_dir_path, &ConflictStrategy::Rename)
            .await?;

        // 根据是否有 progress_sender 选择不同的复制方式
        if progress_sender.is_some() {
            // 有进度发送器，使用带进度的复制
            let (total_size, _) = calculate_directory_size(source).await?;

            let mut progress = TransferProgress::new(task_id.to_string(), 1, total_size);
            progress.status = TaskStatus::Running;
            progress.current_file = source.to_string_lossy().to_string();

            self.copy_directory_recursive(
                source,
                &target_dir_path,
                task_id,
                progress_sender.as_ref(),
                &mut progress,
            )
            .await?;

            // 整个目录传输完成，更新进度
            progress.complete_file();
            progress.update_progress(total_size);
            progress.status = TaskStatus::Completed;
        } else {
            // 没有进度发送器，使用简单复制
            self.copy_directory_simple(source, &target_dir_path, task_id, progress_sender.as_ref())
                .await?;
        }

        Ok(())
    }

    async fn cancel_transfer(&self, task_id: &str) -> Result<(), TransferError> {
        let mut tasks = self.active_tasks.write().await;
        if let Some(state) = tasks.get_mut(task_id) {
            state.cancelled = true;
            Ok(())
        } else {
            Err(TransferError::TaskNotFound {
                task_id: task_id.to_string(),
            })
        }
    }

    async fn pause_transfer(&self, task_id: &str) -> Result<(), TransferError> {
        let mut tasks = self.active_tasks.write().await;
        if let Some(state) = tasks.get_mut(task_id) {
            state.paused = true;
            Ok(())
        } else {
            Err(TransferError::TaskNotFound {
                task_id: task_id.to_string(),
            })
        }
    }

    async fn resume_transfer(&self, task_id: &str) -> Result<(), TransferError> {
        let mut tasks = self.active_tasks.write().await;
        if let Some(state) = tasks.get_mut(task_id) {
            state.paused = false;
            Ok(())
        } else {
            Err(TransferError::TaskNotFound {
                task_id: task_id.to_string(),
            })
        }
    }

    fn supports_resume(&self) -> bool {
        true
    }

    fn supports_concurrent(&self) -> bool {
        true
    }

    fn max_concurrent_transfers(&self) -> usize {
        concurrency::MAX_CONCURRENT_TRANSFERS
    }
}

// ============================================================================
// 辅助函数
// ============================================================================

/// 计算目录总大小和文件数
pub async fn calculate_directory_size(path: &Path) -> Result<(u64, usize), TransferError> {
    let mut total_size: u64 = 0;
    let mut file_count: usize = 0;

    let mut stack = vec![path.to_path_buf()];

    while let Some(current) = stack.pop() {
        let mut entries = fs::read_dir(&current)
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&current.to_string_lossy())))?;

        while let Some(entry) = entries
            .next_entry()
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&current.to_string_lossy())))?
        {
            let entry_path = entry.path();
            let file_type = entry.file_type().await.map_err(|e| {
                TransferError::from_io_error(e, Some(&entry_path.to_string_lossy()))
            })?;

            if file_type.is_dir() {
                stack.push(entry_path);
            } else if file_type.is_file() {
                let metadata = entry.metadata().await.map_err(|e| {
                    TransferError::from_io_error(e, Some(&entry_path.to_string_lossy()))
                })?;
                total_size += metadata.len();
                file_count += 1;
            }
        }
    }

    Ok((total_size, file_count))
}

/// 获取指定路径的可用空间
pub fn get_available_space(path: &Path) -> Result<u64, TransferError> {
    #[cfg(target_os = "windows")]
    {
        get_available_space_windows(path)
    }

    #[cfg(target_os = "macos")]
    {
        get_available_space_unix(path)
    }

    #[cfg(target_os = "linux")]
    {
        get_available_space_unix(path)
    }
}

#[cfg(target_os = "windows")]
fn get_available_space_windows(path: &Path) -> Result<u64, TransferError> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::GetDiskFreeSpaceExW;

    let path_str = path.to_string_lossy();
    let wide_path: Vec<u16> = OsStr::new(&*path_str)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    let mut free_bytes_available: u64 = 0;
    let mut total_bytes: u64 = 0;
    let mut total_free_bytes: u64 = 0;

    let result = unsafe {
        GetDiskFreeSpaceExW(
            wide_path.as_ptr(),
            &mut free_bytes_available,
            &mut total_bytes,
            &mut total_free_bytes,
        )
    };

    if result != 0 {
        Ok(free_bytes_available)
    } else {
        Err(TransferError::FileSystemError {
            message: "无法获取磁盘空间信息".to_string(),
        })
    }
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
fn get_available_space_unix(path: &Path) -> Result<u64, TransferError> {
    use std::ffi::CString;
    use std::os::unix::ffi::OsStrExt;

    let path_cstr = CString::new(path.as_os_str().as_bytes()).map_err(|_| {
        TransferError::InvalidTargetPath {
            path: path.to_string_lossy().to_string(),
        }
    })?;

    let mut stat: libc::statvfs = unsafe { std::mem::zeroed() };
    let result = unsafe { libc::statvfs(path_cstr.as_ptr(), &mut stat) };

    if result == 0 {
        Ok(stat.f_bavail as u64 * stat.f_frsize as u64)
    } else {
        Err(TransferError::FileSystemError {
            message: "无法获取磁盘空间信息".to_string(),
        })
    }
}
