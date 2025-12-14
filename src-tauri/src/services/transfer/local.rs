//! 本地文件传输协议实现
//!
//! 提供本地文件系统和可移动存储设备的传输功能。

use super::error::TransferError;
use super::filename::FilenameHandler;
use super::protocol::{ProgressSender, TransferProtocol};
use super::types::{
    ConflictStrategy, ConnectionStatus, DeviceInfo, DeviceType, TaskStatus, TransferProgress,
    TransferTarget,
};
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

    /// 注册任务
    async fn register_task(&self, task_id: &str) {
        let mut tasks = self.active_tasks.write().await;
        tasks.insert(task_id.to_string(), TaskState::default());
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
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
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

        // 使用缓冲区复制
        let mut buffer = vec![0u8; 1024 * 1024]; // 1MB 缓冲区
        let mut bytes_copied: u64 = 0;
        let start_time = std::time::Instant::now();

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

            bytes_copied += n as u64;

            // 更新进度
            if let Some(sender) = progress_sender {
                current_progress.transferred_size += n as u64;
                current_progress.current_file = source.to_string_lossy().to_string();

                // 计算速度和剩余时间
                let elapsed = start_time.elapsed().as_secs_f64();
                if elapsed > 0.0 {
                    current_progress.speed = bytes_copied as f64 / elapsed;
                    let remaining_bytes =
                        current_progress.total_size - current_progress.transferred_size;
                    current_progress.remaining_time =
                        remaining_bytes as f64 / current_progress.speed;
                }

                let _ = sender.send(current_progress.clone()).await;
            }
        }

        // 确保数据写入磁盘
        target_file
            .flush()
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&target.to_string_lossy())))?;

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

        while let Some(entry) = entries
            .next_entry()
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&source.to_string_lossy())))?
        {
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
                // 复制文件
                self.copy_file_with_progress(
                    &entry_path,
                    &target_path,
                    task_id,
                    progress_sender,
                    current_progress,
                )
                .await?;
                current_progress.completed_files += 1;
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

    async fn discover_targets(&self) -> Result<Vec<TransferTarget>, TransferError> {
        let mut targets = Vec::new();

        #[cfg(target_os = "windows")]
        {
            targets.extend(discover_windows_drives().await?);
        }

        #[cfg(target_os = "macos")]
        {
            targets.extend(discover_macos_volumes().await?);
        }

        #[cfg(target_os = "linux")]
        {
            targets.extend(discover_linux_mounts().await?);
        }

        Ok(targets)
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

        // 获取文件大小
        let metadata = fs::metadata(source)
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&source.to_string_lossy())))?;

        let mut progress = TransferProgress::new(task_id.to_string(), 1, metadata.len());
        progress.status = TaskStatus::Running;

        let mut target_file_path = PathBuf::from(target_path).join(target_filename);

        // 处理文件名冲突和特殊字符
        target_file_path = self
            .resolve_target_path(&target_file_path, &ConflictStrategy::Rename)
            .await?;

        self.copy_file_with_progress(
            source,
            &target_file_path,
            task_id,
            progress_sender.as_ref(),
            &mut progress,
        )
        .await
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

        // 计算目录总大小和文件数
        let (total_size, total_files) = calculate_directory_size(source).await?;

        let mut progress = TransferProgress::new(task_id.to_string(), total_files, total_size);
        progress.status = TaskStatus::Running;

        let mut target_dir_path = PathBuf::from(target_path).join(target_dirname);

        // 处理目录名冲突和特殊字符
        target_dir_path = self
            .resolve_target_path(&target_dir_path, &ConflictStrategy::Rename)
            .await?;

        self.copy_directory_recursive(
            source,
            &target_dir_path,
            task_id,
            progress_sender.as_ref(),
            &mut progress,
        )
        .await
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
        3
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

// ============================================================================
// Windows 设备发现
// ============================================================================

#[cfg(target_os = "windows")]
async fn discover_windows_drives() -> Result<Vec<TransferTarget>, TransferError> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{
        GetDiskFreeSpaceExW, GetDriveTypeW, GetLogicalDrives, GetVolumeInformationW,
    };

    // Windows drive type constants
    const DRIVE_UNKNOWN: u32 = 0;
    const DRIVE_NO_ROOT_DIR: u32 = 1;
    const DRIVE_REMOVABLE: u32 = 2;
    const DRIVE_FIXED: u32 = 3;
    const DRIVE_REMOTE: u32 = 4;
    const DRIVE_CDROM: u32 = 5;
    const DRIVE_RAMDISK: u32 = 6;

    let mut targets = Vec::new();
    let drives_bitmask = unsafe { GetLogicalDrives() };
    
    println!("=== Windows 设备发现开始 ===");
    println!("发现驱动器位掩码: {:b} (十进制: {})", drives_bitmask, drives_bitmask);
    println!("检查 26 个可能的驱动器字母 (A-Z)...");

    for i in 0..26 {
        if drives_bitmask & (1 << i) != 0 {
            let drive_letter = (b'A' + i as u8) as char;
            let drive_path = format!("{}:\\", drive_letter);
            let wide_path: Vec<u16> = OsStr::new(&drive_path)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();

            let drive_type = unsafe { GetDriveTypeW(wide_path.as_ptr()) };
            
            let _drive_type_name = match drive_type {
                DRIVE_UNKNOWN => "UNKNOWN",
                DRIVE_NO_ROOT_DIR => "NO_ROOT_DIR", 
                DRIVE_REMOVABLE => "REMOVABLE",
                DRIVE_FIXED => "FIXED",
                DRIVE_REMOTE => "REMOTE",
                DRIVE_CDROM => "CDROM",
                DRIVE_RAMDISK => "RAMDISK",
                _ => "OTHER",
            };
            
            // 处理固定驱动器、可移动设备和CD-ROM
            if drive_type != DRIVE_FIXED && drive_type != DRIVE_REMOVABLE && drive_type != DRIVE_CDROM {
                continue;
            }

            // 获取卷标
            let mut volume_name: [u16; 261] = [0; 261];
            let volume_info_result = unsafe {
                GetVolumeInformationW(
                    wide_path.as_ptr(),
                    volume_name.as_mut_ptr(),
                    volume_name.len() as u32,
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    0,
                )
            };

            let volume_label = if volume_info_result != 0 {
                let len = volume_name.iter().position(|&c| c == 0).unwrap_or(0);
                String::from_utf16_lossy(&volume_name[..len])
            } else {
                String::new()
            };

            // 获取可用空间
            let mut free_bytes_available: u64 = 0;
            let mut total_bytes: u64 = 0;
            let space_result = unsafe {
                GetDiskFreeSpaceExW(
                    wide_path.as_ptr(),
                    &mut free_bytes_available,
                    &mut total_bytes,
                    std::ptr::null_mut(),
                )
            };

            let available_space = if space_result != 0 {
                Some(free_bytes_available)
            } else {
                None
            };

            let device_type = if drive_type == DRIVE_REMOVABLE || drive_type == DRIVE_CDROM {
                DeviceType::RemovableStorage
            } else {
                DeviceType::LocalDrive
            };

            let name = if volume_label.is_empty() {
                match drive_type {
                    DRIVE_REMOVABLE => format!("可移动磁盘 ({}:)", drive_letter),
                    DRIVE_CDROM => format!("CD/DVD 驱动器 ({}:)", drive_letter),
                    _ => format!("本地磁盘 ({}:)", drive_letter),
                }
            } else {
                format!("{} ({}:)", volume_label, drive_letter)
            };


            
            targets.push(TransferTarget {
                id: drive_path.clone(),
                name,
                device_type,
                path: Some(drive_path),
                available_space,
                connection_status: ConnectionStatus::Connected,
            });
        }
    }

    println!("发现 {} 个可用驱动器", targets.len());

    Ok(targets)
}

// ============================================================================
// macOS 设备发现
// ============================================================================

#[cfg(target_os = "macos")]
async fn discover_macos_volumes() -> Result<Vec<TransferTarget>, TransferError> {
    let mut targets = Vec::new();

    // 扫描 /Volumes 目录
    let volumes_path = Path::new("/Volumes");
    if volumes_path.exists() {
        let mut entries = fs::read_dir(volumes_path)
            .await
            .map_err(|e| TransferError::from_io_error(e, Some("/Volumes")))?;

        while let Some(entry) = entries
            .next_entry()
            .await
            .map_err(|e| TransferError::from_io_error(e, Some("/Volumes")))?
        {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();

            // 跳过系统卷
            if name == "Macintosh HD" || name.starts_with('.') {
                continue;
            }

            let path_str = path.to_string_lossy().to_string();

            // 获取空间信息
            let (available_space, total_space) = match get_available_space_unix(&path) {
                Ok(available) => {
                    // 尝试获取总空间
                    let total = get_total_space_unix(&path).ok();
                    (Some(available), total)
                }
                Err(_) => (None, None),
            };

            // 判断是否为可移动设备
            let device_type = if is_removable_volume_macos(&path).await {
                DeviceType::RemovableStorage
            } else {
                DeviceType::LocalDrive
            };

            targets.push(TransferTarget {
                id: path_str.clone(),
                name,
                device_type,
                path: Some(path_str),
                available_space,
                connection_status: ConnectionStatus::Connected,
            });
        }
    }

    // 添加用户主目录
    if let Some(home) = dirs::home_dir() {
        let home_str = home.to_string_lossy().to_string();
        let available_space = get_available_space_unix(&home).ok();

        targets.push(TransferTarget {
            id: home_str.clone(),
            name: "主目录".to_string(),
            device_type: DeviceType::LocalDrive,
            path: Some(home_str),
            available_space,
            connection_status: ConnectionStatus::Connected,
        });
    }

    Ok(targets)
}

#[cfg(target_os = "macos")]
async fn is_removable_volume_macos(path: &Path) -> bool {
    // 简单判断：检查是否在 /Volumes 下且不是系统卷
    let path_str = path.to_string_lossy();
    path_str.starts_with("/Volumes/") && !path_str.contains("Macintosh HD")
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
fn get_total_space_unix(path: &Path) -> Result<u64, TransferError> {
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
        Ok(stat.f_blocks as u64 * stat.f_frsize as u64)
    } else {
        Err(TransferError::FileSystemError {
            message: "无法获取磁盘空间信息".to_string(),
        })
    }
}

// ============================================================================
// Linux 设备发现
// ============================================================================

#[cfg(target_os = "linux")]
async fn discover_linux_mounts() -> Result<Vec<TransferTarget>, TransferError> {
    let mut targets = Vec::new();

    // 读取 /proc/mounts 获取挂载点
    let mounts_content = fs::read_to_string("/proc/mounts")
        .await
        .map_err(|e| TransferError::from_io_error(e, Some("/proc/mounts")))?;

    for line in mounts_content.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 2 {
            continue;
        }

        let device = parts[0];
        let mount_point = parts[1];

        // 跳过系统挂载点
        if mount_point == "/"
            || mount_point.starts_with("/sys")
            || mount_point.starts_with("/proc")
            || mount_point.starts_with("/dev")
            || mount_point.starts_with("/run")
            || mount_point.starts_with("/snap")
            || mount_point.starts_with("/boot")
        {
            continue;
        }

        // 只处理实际的块设备
        if !device.starts_with("/dev/") {
            continue;
        }

        let path = Path::new(mount_point);
        if !path.exists() {
            continue;
        }

        // 获取空间信息
        let (available_space, total_space) = match get_available_space_unix(path) {
            Ok(available) => {
                let total = get_total_space_unix(path).ok();
                (Some(available), total)
            }
            Err(_) => (None, None),
        };

        // 判断设备类型
        let device_type = if is_removable_device_linux(device).await {
            DeviceType::RemovableStorage
        } else {
            DeviceType::LocalDrive
        };

        let name = if mount_point.starts_with("/media/") || mount_point.starts_with("/mnt/") {
            // 使用挂载点最后一部分作为名称
            Path::new(mount_point)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| mount_point.to_string())
        } else if mount_point.starts_with("/home/") {
            "主目录".to_string()
        } else {
            mount_point.to_string()
        };

        targets.push(TransferTarget {
            id: mount_point.to_string(),
            name,
            device_type,
            path: Some(mount_point.to_string()),
            available_space,
            connection_status: ConnectionStatus::Connected,
        });
    }

    // 添加用户主目录（如果不在列表中）
    if let Some(home) = dirs::home_dir() {
        let home_str = home.to_string_lossy().to_string();
        if !targets.iter().any(|t| t.path.as_ref() == Some(&home_str)) {
            let available_space = get_available_space_unix(&home).ok();

            targets.push(TransferTarget {
                id: home_str.clone(),
                name: "主目录".to_string(),
                device_type: DeviceType::LocalDrive,
                path: Some(home_str),
                available_space,
                connection_status: ConnectionStatus::Connected,
            });
        }
    }

    Ok(targets)
}

#[cfg(target_os = "linux")]
async fn is_removable_device_linux(device: &str) -> bool {
    // 从设备路径提取设备名（如 /dev/sdb1 -> sdb）
    let device_name = device.strip_prefix("/dev/").and_then(|s| {
        // 移除分区号
        let base = s.trim_end_matches(|c: char| c.is_ascii_digit());
        Some(base)
    });

    if let Some(name) = device_name {
        // 检查 /sys/block/{device}/removable
        let removable_path = format!("/sys/block/{}/removable", name);
        if let Ok(content) = fs::read_to_string(&removable_path).await {
            return content.trim() == "1";
        }
    }

    false
}

// ============================================================================
// 设备信息辅助函数
// ============================================================================

/// 获取设备信息
pub async fn get_device_info(path: &Path) -> Result<DeviceInfo, TransferError> {
    let path_str = path.to_string_lossy().to_string();

    // 获取空间信息
    let available_space = get_available_space(path).ok();

    #[cfg(any(target_os = "macos", target_os = "linux"))]
    let total_space = get_total_space_unix(path).ok();

    #[cfg(target_os = "windows")]
    let total_space = get_total_space_windows(path).ok();

    // 判断设备类型
    let device_type = detect_device_type(path).await;

    // 生成设备名称
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path_str.clone());

    Ok(DeviceInfo {
        id: path_str.clone(),
        name,
        device_type,
        available_space,
        total_space,
        connection_status: ConnectionStatus::Connected,
    })
}

/// 检测设备类型
async fn detect_device_type(path: &Path) -> DeviceType {
    #[cfg(target_os = "windows")]
    {
        detect_device_type_windows(path)
    }

    #[cfg(target_os = "macos")]
    {
        if is_removable_volume_macos(path).await {
            DeviceType::RemovableStorage
        } else {
            DeviceType::LocalDrive
        }
    }

    #[cfg(target_os = "linux")]
    {
        // 尝试从 /proc/mounts 获取设备信息
        let path_str = path.to_string_lossy();
        if let Ok(mounts) = fs::read_to_string("/proc/mounts").await {
            for line in mounts.lines() {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 && parts[1] == path_str {
                    if is_removable_device_linux(parts[0]).await {
                        return DeviceType::RemovableStorage;
                    }
                }
            }
        }
        DeviceType::LocalDrive
    }
}

#[cfg(target_os = "windows")]
fn detect_device_type_windows(path: &Path) -> DeviceType {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::GetDriveTypeW;

    const DRIVE_REMOVABLE: u32 = 2;

    let path_str = path.to_string_lossy();
    // 获取驱动器根路径（如 C:\）
    let root = if path_str.len() >= 3 && path_str.chars().nth(1) == Some(':') {
        format!("{}\\", &path_str[..2])
    } else {
        return DeviceType::LocalDrive;
    };

    let wide_path: Vec<u16> = OsStr::new(&root)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    let drive_type = unsafe { GetDriveTypeW(wide_path.as_ptr()) };

    if drive_type == DRIVE_REMOVABLE {
        DeviceType::RemovableStorage
    } else {
        DeviceType::LocalDrive
    }
}

#[cfg(target_os = "windows")]
fn get_total_space_windows(path: &Path) -> Result<u64, TransferError> {
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
        Ok(total_bytes)
    } else {
        Err(TransferError::FileSystemError {
            message: "无法获取磁盘空间信息".to_string(),
        })
    }
}

/// 检查路径是否可写
pub async fn check_write_permission(path: &Path) -> bool {
    let test_file = path.join(".bilitools_write_test");
    match fs::write(&test_file, b"test").await {
        Ok(_) => {
            let _ = fs::remove_file(&test_file).await;
            true
        }
        Err(_) => false,
    }
}

/// 检查设备是否已连接
pub fn is_device_connected(path: &Path) -> bool {
    path.exists()
}

impl LocalFileProtocol {
    /// 获取所有可用的设备
    pub async fn get_all_devices(&self) -> Result<Vec<DeviceInfo>, TransferError> {
        let targets = self.discover_targets().await?;
        let mut devices = Vec::new();

        for target in targets {
            if let Some(path) = &target.path {
                if let Ok(device_info) = get_device_info(Path::new(path)).await {
                    devices.push(device_info);
                }
            }
        }

        Ok(devices)
    }
}
