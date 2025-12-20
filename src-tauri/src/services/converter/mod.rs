//! 转换模块
//!
//! 提供B站缓存文件（m4s格式）到标准MP4格式的转换功能。
//!
//! # 模块结构
//!
//! - `error`: 转换错误类型定义
//! - `m4s`: M4s文件处理器
//! - `stream`: 流识别器
//! - `task`: 转换任务类型定义
//!
//! # 功能特性
//!
//! - 处理m4s文件头部特殊标记
//! - 自动识别音视频流
//! - 复用现有FFmpeg服务完成合并
//! - 支持批量转换和自定义参数

pub mod error;
pub mod m4s;
pub mod stream;
pub mod task;

// 重新导出常用类型
pub use error::ConvertError;
pub use m4s::M4sProcessor;
pub use stream::{StreamIdentifier, StreamInfo};
pub use task::{
    AudioBitrate, BatchConvertResult, ConflictStrategy, ConvertConfig, ConvertProgress,
    ConvertResult, ConvertStage, ConvertTaskView, DanmakuFormat, DiskSpaceCheck, VideoQuality,
};

use serde::Serialize;
use specta::Type;
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
};
use tauri_plugin_shell::ShellExt;
use tauri_specta::Event;
use tokio::sync::{mpsc, RwLock};

use crate::{
    shared::{get_app_handle, random_string},
    storage::{cache_records, config, convert_tasks},
};

/// 转换事件类型
#[derive(Debug, Clone, Serialize, Type, Event)]
#[serde(
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    tag = "type"
)]
pub enum ConvertEvent {
    /// 进度更新事件
    Progress {
        task_id: String,
        progress: ConvertProgress,
    },
    /// 任务完成事件
    Completed {
        task_id: String,
        output_path: String,
    },
    /// 任务失败事件
    Failed {
        task_id: String,
        error: String,
    },
    /// 任务取消事件
    Cancelled {
        task_id: String,
    },
    /// 批量转换结果事件
    BatchResult {
        result: BatchConvertResult,
    },
}

/// 发送转换进度事件
fn emit_progress(task_id: &str, progress: &ConvertProgress) {
    let app = get_app_handle();
    let _ = ConvertEvent::Progress {
        task_id: task_id.to_string(),
        progress: progress.clone(),
    }
    .emit(app);
}

/// 发送转换完成事件
fn emit_completed(task_id: &str, output_path: &Path) {
    let app = get_app_handle();
    let _ = ConvertEvent::Completed {
        task_id: task_id.to_string(),
        output_path: output_path.to_string_lossy().to_string(),
    }
    .emit(app);
}

/// 发送转换失败事件
fn emit_failed(task_id: &str, error: &str) {
    let app = get_app_handle();
    let _ = ConvertEvent::Failed {
        task_id: task_id.to_string(),
        error: error.to_string(),
    }
    .emit(app);
}

/// 发送转换取消事件
fn emit_cancelled(task_id: &str) {
    let app = get_app_handle();
    let _ = ConvertEvent::Cancelled {
        task_id: task_id.to_string(),
    }
    .emit(app);
}

/// 发送批量转换结果事件
fn emit_batch_result(result: &BatchConvertResult) {
    let app = get_app_handle();
    let _ = ConvertEvent::BatchResult {
        result: result.clone(),
    }
    .emit(app);
}

/// 文件系统禁止的字符（Windows 限制最严格）
const INVALID_FILENAME_CHARS: &[char] = &['<', '>', ':', '"', '/', '\\', '|', '?', '*', '\0'];

/// 临时文件额外开销系数（1.5倍，用于保守估计）
const DISK_SPACE_OVERHEAD_FACTOR: f64 = 1.5;

/// 转换临时目录前缀
const CONVERT_TEMP_PREFIX: &str = "convert_";

/// 文件名处理器
pub struct FilenameGenerator;

impl FilenameGenerator {
    /// 生成安全的输出文件名
    ///
    /// 根据视频标题生成文件名，去除特殊字符，处理文件名冲突。
    ///
    /// # 参数
    /// - `title`: 视频标题
    /// - `output_dir`: 输出目录
    /// - `extension`: 文件扩展名（如 "mp4"）
    /// - `strategy`: 文件名冲突策略
    ///
    /// # 返回
    /// - `Ok(PathBuf)`: 生成的完整文件路径
    /// - `Err(ConvertError)`: 生成失败（如跳过策略时文件已存在）
    pub fn generate_filename(
        title: &str,
        output_dir: &Path,
        extension: &str,
        strategy: ConflictStrategy,
    ) -> Result<PathBuf, ConvertError> {
        // 清理文件名中的特殊字符
        let safe_name = Self::sanitize_filename(title);

        // 如果清理后为空，使用默认名称
        let safe_name = if safe_name.is_empty() {
            "untitled".to_string()
        } else {
            safe_name
        };

        // 构建完整路径
        let filename = format!("{}.{}", safe_name, extension);
        let target_path = output_dir.join(&filename);

        // 处理文件名冲突
        Self::handle_conflict(&target_path, strategy)
    }

    /// 清理文件名中的特殊字符
    ///
    /// 将不兼容的字符替换为下划线，并处理边界情况。
    pub fn sanitize_filename(filename: &str) -> String {
        let sanitized: String = filename
            .chars()
            .map(|c| {
                if INVALID_FILENAME_CHARS.contains(&c) || c.is_control() {
                    '_'
                } else {
                    c
                }
            })
            .collect();

        // 去除首尾空格和点（Windows 不允许文件名以点结尾）
        let trimmed = sanitized.trim().trim_end_matches('.');

        // 限制文件名长度（保留扩展名空间，最大200字符）
        if trimmed.chars().count() > 200 {
            trimmed.chars().take(200).collect()
        } else {
            trimmed.to_string()
        }
    }

    /// 处理文件名冲突
    fn handle_conflict(
        target_path: &Path,
        strategy: ConflictStrategy,
    ) -> Result<PathBuf, ConvertError> {
        if !target_path.exists() {
            return Ok(target_path.to_path_buf());
        }

        match strategy {
            ConflictStrategy::AutoRename => Ok(Self::generate_unique_filename(target_path)),
            ConflictStrategy::Overwrite => Ok(target_path.to_path_buf()),
            ConflictStrategy::Skip => Err(ConvertError::IoError {
                message: format!("文件已存在且选择跳过: {}", target_path.display()),
            }),
        }
    }

    /// 生成唯一的文件名（添加数字后缀）
    ///
    /// 如果目标文件已存在，自动在文件名后添加数字后缀。
    /// 例如: video.mp4 -> video (1).mp4 -> video (2).mp4
    fn generate_unique_filename(target_path: &Path) -> PathBuf {
        let parent = target_path.parent().unwrap_or_else(|| Path::new("."));
        let stem = target_path
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default();
        let extension = target_path
            .extension()
            .map(|e| e.to_string_lossy().to_string())
            .unwrap_or_default();

        for i in 1..=10000 {
            let new_name = if extension.is_empty() {
                format!("{} ({})", stem, i)
            } else {
                format!("{} ({}).{}", stem, i, extension)
            };

            let new_path = parent.join(&new_name);
            if !new_path.exists() {
                return new_path;
            }
        }

        // 如果找不到唯一的名称，返回原始路径（极端情况）
        target_path.to_path_buf()
    }

    /// 验证文件名是否有效
    pub fn is_valid_filename(filename: &str) -> bool {
        if filename.is_empty() || filename.trim().is_empty() {
            return false;
        }

        !filename
            .chars()
            .any(|c| INVALID_FILENAME_CHARS.contains(&c) || c.is_control())
    }
}

/// 转换任务管理器
///
/// 管理所有转换任务的状态和执行
pub struct ConvertTaskManager {
    /// 任务存储（任务ID -> 任务视图）
    tasks: RwLock<HashMap<String, ConvertTaskView>>,
    /// 取消信号发送器（任务ID -> 发送器）
    cancel_senders: RwLock<HashMap<String, mpsc::Sender<()>>>,
    /// 暂停状态（任务ID -> 是否暂停）
    paused: RwLock<HashMap<String, bool>>,
}

impl Default for ConvertTaskManager {
    fn default() -> Self {
        Self::new()
    }
}

impl ConvertTaskManager {
    /// 创建新的任务管理器
    pub fn new() -> Self {
        Self {
            tasks: RwLock::new(HashMap::new()),
            cancel_senders: RwLock::new(HashMap::new()),
            paused: RwLock::new(HashMap::new()),
        }
    }

    /// 添加任务（同时持久化到数据库）
    pub async fn add_task(&self, task: ConvertTaskView) {
        // 持久化到数据库
        if let Err(e) = convert_tasks::upsert(&task).await {
            log::error!("持久化转换任务失败: {}", e);
        }

        let mut tasks = self.tasks.write().await;
        tasks.insert(task.id.clone(), task);
    }

    /// 获取任务
    pub async fn get_task(&self, task_id: &str) -> Option<ConvertTaskView> {
        let tasks = self.tasks.read().await;
        tasks.get(task_id).cloned()
    }

    /// 更新任务进度（同时持久化到数据库）
    pub async fn update_progress(&self, task_id: &str, progress: ConvertProgress) {
        let mut tasks = self.tasks.write().await;
        if let Some(task) = tasks.get_mut(task_id) {
            task.update_progress(progress.clone());

            // 持久化进度到数据库
            if let Err(e) = convert_tasks::update_progress(task_id, &progress).await {
                log::error!("持久化转换进度失败: {}", e);
            }

            // 发送进度事件
            emit_progress(task_id, &progress);
        }
    }

    /// 设置任务输出路径（同时持久化到数据库）
    pub async fn set_output_path(&self, task_id: &str, path: PathBuf) {
        let mut tasks = self.tasks.write().await;
        if let Some(task) = tasks.get_mut(task_id) {
            task.set_output_path(path.clone());

            // 持久化到数据库
            if let Err(e) = convert_tasks::update_output_path(task_id, &path).await {
                log::error!("持久化输出路径失败: {}", e);
            }
        }
    }

    /// 设置任务错误（同时持久化到数据库）
    pub async fn set_error(&self, task_id: &str, message: &str) {
        let mut tasks = self.tasks.write().await;
        if let Some(task) = tasks.get_mut(task_id) {
            task.set_error(message);

            // 持久化到数据库
            if let Err(e) = convert_tasks::set_error(task_id, message, &task.progress).await {
                log::error!("持久化任务错误失败: {}", e);
            }
        }
    }

    /// 标记任务完成（同时持久化到数据库）
    pub async fn mark_completed(&self, task_id: &str) {
        let mut tasks = self.tasks.write().await;
        if let Some(task) = tasks.get_mut(task_id) {
            task.mark_completed();

            // 持久化到数据库
            if let Err(e) = convert_tasks::mark_completed(task_id, &task.progress).await {
                log::error!("持久化任务完成状态失败: {}", e);
            }
        }
    }

    /// 注册取消信号发送器
    pub async fn register_cancel_sender(&self, task_id: &str, sender: mpsc::Sender<()>) {
        let mut senders = self.cancel_senders.write().await;
        senders.insert(task_id.to_string(), sender);
    }

    /// 发送取消信号
    pub async fn send_cancel(&self, task_id: &str) -> bool {
        let senders = self.cancel_senders.read().await;
        if let Some(sender) = senders.get(task_id) {
            sender.send(()).await.is_ok()
        } else {
            false
        }
    }

    /// 移除取消信号发送器
    pub async fn remove_cancel_sender(&self, task_id: &str) {
        let mut senders = self.cancel_senders.write().await;
        senders.remove(task_id);
    }

    /// 设置暂停状态
    pub async fn set_paused(&self, task_id: &str, paused: bool) {
        let mut paused_map = self.paused.write().await;
        paused_map.insert(task_id.to_string(), paused);
    }

    /// 检查是否暂停
    pub async fn is_paused(&self, task_id: &str) -> bool {
        let paused_map = self.paused.read().await;
        paused_map.get(task_id).copied().unwrap_or(false)
    }

    /// 移除任务（同时从数据库删除）
    pub async fn remove_task(&self, task_id: &str) {
        // 从数据库删除
        if let Err(e) = convert_tasks::delete(task_id).await {
            log::error!("从数据库删除转换任务失败: {}", e);
        }

        let mut tasks = self.tasks.write().await;
        tasks.remove(task_id);
        let mut senders = self.cancel_senders.write().await;
        senders.remove(task_id);
        let mut paused = self.paused.write().await;
        paused.remove(task_id);
    }

    /// 获取所有任务
    pub async fn get_all_tasks(&self) -> Vec<ConvertTaskView> {
        let tasks = self.tasks.read().await;
        tasks.values().cloned().collect()
    }

    /// 从数据库加载未完成的任务
    ///
    /// 在应用启动时调用，恢复之前未完成的转换任务
    pub async fn load_incomplete_tasks(&self) -> Result<Vec<ConvertTaskView>, ConvertError> {
        let incomplete_tasks = convert_tasks::get_incomplete()
            .await
            .map_err(|e| ConvertError::DatabaseError {
                message: format!("加载未完成任务失败: {}", e),
            })?;

        let mut tasks = self.tasks.write().await;

        for task in &incomplete_tasks {
            // 将正在执行的任务标记为中断状态
            let mut task_to_add = task.clone();
            if !task_to_add.progress.stage.is_terminal() {
                // 将非终态任务标记为暂停，等待用户决定是否恢复
                task_to_add.progress.stage = ConvertStage::Paused;
            }
            tasks.insert(task_to_add.id.clone(), task_to_add);
        }

        Ok(incomplete_tasks)
    }

    /// 清理已完成的任务（从数据库）
    pub async fn cleanup_completed_tasks(&self, days_to_keep: Option<i64>) -> Result<i32, ConvertError> {
        let deleted_count = convert_tasks::cleanup_completed(days_to_keep)
            .await
            .map_err(|e| ConvertError::DatabaseError {
                message: format!("清理已完成任务失败: {}", e),
            })?;

        // 同时从内存中移除
        let mut tasks = self.tasks.write().await;
        tasks.retain(|_, task| !task.progress.stage.is_terminal());

        Ok(deleted_count)
    }
}

/// 全局任务管理器
static TASK_MANAGER: std::sync::LazyLock<ConvertTaskManager> =
    std::sync::LazyLock::new(ConvertTaskManager::new);

/// 获取全局任务管理器
pub fn get_task_manager() -> &'static ConvertTaskManager {
    &TASK_MANAGER
}

/// 转换服务
///
/// 提供缓存文件转换的核心功能
pub struct ConvertService;

impl ConvertService {
    /// 创建转换任务
    ///
    /// 为每个缓存ID创建一个独立的转换任务
    ///
    /// # 参数
    /// - `cache_ids`: 缓存记录ID列表
    /// - `output_dir`: 输出目录
    /// - `config`: 转换配置
    ///
    /// # 返回
    /// - `Ok(Vec<String>)`: 创建的任务ID列表
    /// - `Err`: 创建失败
    pub async fn create_task(
        cache_ids: Vec<String>,
        output_dir: PathBuf,
        config: ConvertConfig,
    ) -> Result<Vec<String>, ConvertError> {
        // 验证输出目录
        if !output_dir.exists() {
            tokio::fs::create_dir_all(&output_dir).await.map_err(|e| {
                ConvertError::from_io_error(e, Some(&output_dir.to_string_lossy()))
            })?;
        }

        // 检查输出目录是否可写
        let test_file = output_dir.join(".write_test");
        tokio::fs::write(&test_file, b"test")
            .await
            .map_err(|_| ConvertError::OutputDirNotWritable {
                path: output_dir.to_string_lossy().to_string(),
            })?;
        let _ = tokio::fs::remove_file(&test_file).await;

        let mut task_ids = Vec::new();
        let manager = get_task_manager();

        for cache_id in cache_ids {
            // 获取缓存记录
            let record = cache_records::get_by_id(&cache_id)
                .await
                .map_err(|e| ConvertError::DatabaseError {
                    message: e.to_string(),
                })?
                .ok_or_else(|| ConvertError::CacheNotFound {
                    path: cache_id.clone(),
                })?;

            // 验证缓存路径存在
            let cache_path = PathBuf::from(&record.cache_path);
            if !cache_path.exists() {
                return Err(ConvertError::CacheNotFound {
                    path: record.cache_path.clone(),
                });
            }

            // 生成任务ID
            let task_id = format!("convert_{}", random_string(8));

            // 创建任务视图
            let task = ConvertTaskView::new(
                task_id.clone(),
                cache_id.clone(),
                cache_path,
                output_dir.clone(),
                config.clone(),
                record.title.clone(),
            );

            // 添加到任务管理器
            manager.add_task(task).await;
            task_ids.push(task_id);
        }

        Ok(task_ids)
    }

    /// 执行单个转换任务
    ///
    /// 执行完整的转换流程：识别流 → 处理m4s → FFmpeg合并 → 清理
    ///
    /// # 参数
    /// - `task_id`: 任务ID
    ///
    /// # 返回
    /// - `Ok(PathBuf)`: 转换成功，返回输出文件路径
    /// - `Err`: 转换失败
    pub async fn execute_task(task_id: &str) -> Result<PathBuf, ConvertError> {
        let manager = get_task_manager();

        // 获取任务
        let task = manager
            .get_task(task_id)
            .await
            .ok_or_else(|| ConvertError::TaskNotFound {
                task_id: task_id.to_string(),
            })?;

        // 创建取消通道
        let (cancel_tx, mut cancel_rx) = mpsc::channel::<()>(1);
        manager.register_cancel_sender(task_id, cancel_tx).await;

        // 创建临时目录
        let temp_dir = config::read().temp_dir.join(format!("convert_{}", task_id));
        tokio::fs::create_dir_all(&temp_dir).await.map_err(|e| {
            ConvertError::from_io_error(e, Some(&temp_dir.to_string_lossy()))
        })?;

        // 执行转换流程
        let result = Self::execute_convert_pipeline(
            task_id,
            &task,
            &temp_dir,
            &mut cancel_rx,
        )
        .await;

        // 清理临时文件
        if let Err(e) = tokio::fs::remove_dir_all(&temp_dir).await {
            // 记录清理失败，下次启动时会重试
            TempFileCleaner::log_cleanup_failure(&temp_dir, &e.to_string());
        } else {
            log::debug!("已清理任务临时目录: {}", temp_dir.display());
        }

        // 移除取消信号发送器
        manager.remove_cancel_sender(task_id).await;

        // 根据结果发送事件
        match &result {
            Ok(output_path) => {
                emit_completed(task_id, output_path);
            }
            Err(ConvertError::TaskCancelled) => {
                // 取消事件已在 cancel_task 中发送
            }
            Err(e) => {
                // 更新任务错误状态
                manager.set_error(task_id, &e.to_string()).await;
                emit_failed(task_id, &e.to_string());
            }
        }

        result
    }

    /// 执行转换流水线
    async fn execute_convert_pipeline(
        task_id: &str,
        task: &ConvertTaskView,
        temp_dir: &Path,
        cancel_rx: &mut mpsc::Receiver<()>,
    ) -> Result<PathBuf, ConvertError> {
        let manager = get_task_manager();

        // 检查取消
        if cancel_rx.try_recv().is_ok() {
            return Err(ConvertError::TaskCancelled);
        }

        // 阶段1: 准备中
        let mut progress = ConvertProgress::new();
        progress.set_stage(ConvertStage::Preparing);
        progress.set_current_file("识别音视频流...".to_string());
        manager.update_progress(task_id, progress.clone()).await;

        // 识别音视频流
        let stream_info = StreamIdentifier::identify(&task.cache_path).await?;

        // 检查暂停
        while manager.is_paused(task_id).await {
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            if cancel_rx.try_recv().is_ok() {
                return Err(ConvertError::TaskCancelled);
            }
        }

        // 检查取消
        if cancel_rx.try_recv().is_ok() {
            return Err(ConvertError::TaskCancelled);
        }

        // 阶段2: 处理m4s文件
        progress.set_stage(ConvertStage::Processing);
        progress.set_current_file("处理视频流...".to_string());
        manager.update_progress(task_id, progress.clone()).await;

        // 处理视频流
        let processed_video = temp_dir.join("video.m4s");
        let task_id_clone = task_id.to_string();
        M4sProcessor::process_file(&stream_info.video_path, &processed_video, |processed, total| {
            // 进度回调（异步更新需要在外部处理）
            log::debug!(
                "Task {}: 视频处理进度 {}/{}",
                task_id_clone,
                processed,
                total
            );
        })
        .await?;

        // 检查暂停
        while manager.is_paused(task_id).await {
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            if cancel_rx.try_recv().is_ok() {
                return Err(ConvertError::TaskCancelled);
            }
        }

        // 检查取消
        if cancel_rx.try_recv().is_ok() {
            return Err(ConvertError::TaskCancelled);
        }

        // 处理音频流
        progress.set_current_file("处理音频流...".to_string());
        progress.set_percentage(50.0);
        manager.update_progress(task_id, progress.clone()).await;

        let processed_audio = temp_dir.join("audio.m4s");
        let task_id_clone = task_id.to_string();
        M4sProcessor::process_file(&stream_info.audio_path, &processed_audio, |processed, total| {
            log::debug!(
                "Task {}: 音频处理进度 {}/{}",
                task_id_clone,
                processed,
                total
            );
        })
        .await?;

        // 检查暂停
        while manager.is_paused(task_id).await {
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            if cancel_rx.try_recv().is_ok() {
                return Err(ConvertError::TaskCancelled);
            }
        }

        // 检查取消
        if cancel_rx.try_recv().is_ok() {
            return Err(ConvertError::TaskCancelled);
        }

        // 阶段3: 合并音视频
        progress.set_stage(ConvertStage::Merging);
        progress.set_current_file("合并音视频...".to_string());
        progress.set_percentage(60.0);
        manager.update_progress(task_id, progress.clone()).await;

        // 使用FFmpeg合并
        let merged_output = temp_dir.join("merged.mp4");
        Self::merge_with_ffmpeg(
            &processed_video,
            &processed_audio,
            &merged_output,
            &task.config,
        )
        .await?;

        // 检查暂停
        while manager.is_paused(task_id).await {
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            if cancel_rx.try_recv().is_ok() {
                return Err(ConvertError::TaskCancelled);
            }
        }

        // 检查取消
        if cancel_rx.try_recv().is_ok() {
            return Err(ConvertError::TaskCancelled);
        }

        // 阶段4: 添加元数据（如果启用）
        let final_output = if task.config.write_metadata || task.config.embed_cover {
            progress.set_stage(ConvertStage::AddingMeta);
            progress.set_current_file("添加元数据...".to_string());
            progress.set_percentage(80.0);
            manager.update_progress(task_id, progress.clone()).await;

            // 获取缓存记录以获取元数据
            let record = cache_records::get_by_id(&task.cache_id)
                .await
                .map_err(|e| ConvertError::DatabaseError {
                    message: e.to_string(),
                })?
                .ok_or_else(|| ConvertError::CacheNotFound {
                    path: task.cache_id.clone(),
                })?;

            let output_with_meta = temp_dir.join("output_with_meta.mp4");
            Self::add_metadata_and_cover(
                &merged_output,
                &output_with_meta,
                &record,
                &task.cache_path,
                temp_dir,
                &task.config,
            )
            .await?;

            output_with_meta
        } else {
            merged_output
        };

        // 检查暂停
        while manager.is_paused(task_id).await {
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            if cancel_rx.try_recv().is_ok() {
                return Err(ConvertError::TaskCancelled);
            }
        }

        // 检查取消
        if cancel_rx.try_recv().is_ok() {
            return Err(ConvertError::TaskCancelled);
        }

        // 阶段5: 完成中
        progress.set_stage(ConvertStage::Finalizing);
        progress.set_current_file("生成输出文件...".to_string());
        progress.set_percentage(95.0);
        manager.update_progress(task_id, progress.clone()).await;

        // 生成输出文件名
        let output_path = FilenameGenerator::generate_filename(
            &task.title,
            &task.output_dir,
            "mp4",
            ConflictStrategy::AutoRename,
        )?;

        // 移动到输出目录
        tokio::fs::copy(&final_output, &output_path)
            .await
            .map_err(|e| ConvertError::from_io_error(e, Some(&output_path.to_string_lossy())))?;

        // 更新任务状态
        manager.set_output_path(task_id, output_path.clone()).await;
        progress.mark_completed();
        manager.update_progress(task_id, progress).await;
        manager.mark_completed(task_id).await;

        Ok(output_path)
    }

    /// 添加元数据和封面到视频文件
    ///
    /// 使用 FFmpeg 将元数据（标题、作者等）和封面嵌入到 MP4 文件中。
    ///
    /// # 参数
    /// - `input`: 输入视频文件路径
    /// - `output`: 输出视频文件路径
    /// - `record`: 缓存记录（包含元数据信息）
    /// - `cache_path`: 缓存目录路径（用于查找封面文件）
    /// - `temp_dir`: 临时目录路径（用于存放转换后的封面）
    /// - `config`: 转换配置
    async fn add_metadata_and_cover(
        input: &Path,
        output: &Path,
        record: &crate::storage::cache_records::CacheRecord,
        cache_path: &Path,
        temp_dir: &Path,
        config: &ConvertConfig,
    ) -> Result<(), ConvertError> {
        let app = get_app_handle();
        let sidecar = crate::shared::Sidecar::FFmpeg;

        // 构建 FFmpeg 命令
        let mut cmd = app
            .shell()
            .sidecar(crate::storage::config::read().sidecar(sidecar))
            .map_err(|e| ConvertError::MetadataFailed {
                reason: format!("无法启动FFmpeg: {}", e),
            })?;

        cmd = cmd
            .args(["-hide_banner", "-nostats", "-loglevel", "warning"])
            .arg("-i")
            .arg(input.as_os_str());

        // 查找封面文件
        let cover_path = if config.embed_cover {
            Self::find_cover_file(cache_path, temp_dir).await
        } else {
            None
        };

        // 如果有封面，添加封面输入
        if let Some(ref cover) = cover_path {
            cmd = cmd.arg("-i").arg(cover.as_os_str());
        }

        // 映射流
        if cover_path.is_some() {
            // 有封面：映射视频、音频和封面
            cmd = cmd.args([
                "-map", "0:v:0",      // 视频流
                "-map", "0:a:0",      // 音频流
                "-map", "1:v:0",      // 封面图片
                "-c:v:0", "copy",     // 复制视频流
                "-c:a", "copy",       // 复制音频流
                "-c:v:1", "mjpeg",    // 封面编码为 MJPEG
                "-disposition:v:1", "attached_pic",  // 标记为附加图片
            ]);
        } else {
            // 无封面：只映射视频和音频
            cmd = cmd.args([
                "-map", "0",
                "-c", "copy",
            ]);
        }

        // 添加元数据
        if config.write_metadata {
            // 标题
            cmd = cmd.arg("-metadata").arg(format!("title={}", record.title));

            // 作者/UP主
            cmd = cmd.arg("-metadata").arg(format!("artist={}", record.uname));
            cmd = cmd.arg("-metadata").arg(format!("author={}", record.uname));

            // 原始 URL
            let original_url = format!("https://www.bilibili.com/video/{}", record.bvid);
            cmd = cmd.arg("-metadata").arg(format!("comment={}", original_url));
            cmd = cmd.arg("-metadata").arg(format!("original_url={}", original_url));

            // 时长（秒转换为时间格式）
            let duration_str = Self::format_duration(record.duration);
            cmd = cmd.arg("-metadata").arg(format!("duration={}", duration_str));

            // 下载时间作为创建日期
            let date_str = Self::format_timestamp(record.download_time);
            cmd = cmd.arg("-metadata").arg(format!("date={}", date_str));
        }

        // 其他参数
        cmd = cmd
            .args(["-movflags", "+faststart"])
            .arg(output.as_os_str())
            .arg("-y");

        // 执行命令
        let result = cmd.output().await.map_err(|e| ConvertError::MetadataFailed {
            reason: format!("FFmpeg执行失败: {}", e),
        })?;

        if !result.status.success() {
            let stderr = String::from_utf8_lossy(&result.stderr);
            return Err(ConvertError::MetadataFailed {
                reason: format!("FFmpeg返回错误: {}", stderr),
            });
        }

        Ok(())
    }

    /// 在缓存目录中查找封面文件，PNG 会自动转换为 JPG
    async fn find_cover_file(cache_path: &Path, temp_dir: &Path) -> Option<PathBuf> {
        // 优先使用 JPG
        let jpg_path = cache_path.join("image.jpg");
        if jpg_path.exists() && jpg_path.is_file() {
            return Some(jpg_path);
        }

        // PNG 需要转换为 JPG（精简版 FFmpeg 不支持 PNG 像素格式）
        let png_path = cache_path.join("image.png");
        if png_path.exists() && png_path.is_file() {
            let converted_jpg = temp_dir.join("cover.jpg");
            if Self::convert_png_to_jpg(&png_path, &converted_jpg).await.is_ok() {
                return Some(converted_jpg);
            }
        }

        None
    }

    /// 使用 image crate 将 PNG 转换为 JPG
    async fn convert_png_to_jpg(png_path: &Path, jpg_path: &Path) -> Result<(), ConvertError> {
        let png_path = png_path.to_path_buf();
        let jpg_path = jpg_path.to_path_buf();

        tokio::task::spawn_blocking(move || {
            let img = image::open(&png_path).map_err(|e| ConvertError::MetadataFailed {
                reason: format!("无法读取封面图片: {}", e),
            })?;
            img.save(&jpg_path).map_err(|e| ConvertError::MetadataFailed {
                reason: format!("无法保存封面图片: {}", e),
            })
        })
        .await
        .map_err(|e| ConvertError::MetadataFailed {
            reason: format!("封面转换任务失败: {}", e),
        })?
    }

    /// 格式化时长（秒转换为 HH:MM:SS 格式）
    fn format_duration(seconds: i64) -> String {
        let hours = seconds / 3600;
        let minutes = (seconds % 3600) / 60;
        let secs = seconds % 60;
        format!("{:02}:{:02}:{:02}", hours, minutes, secs)
    }

    /// 格式化时间戳为日期字符串（YYYY-MM-DD 格式）
    fn format_timestamp(timestamp: i64) -> String {
        use time::{OffsetDateTime, UtcOffset};

        let utc = OffsetDateTime::from_unix_timestamp(timestamp).unwrap_or(OffsetDateTime::UNIX_EPOCH);
        let offset = UtcOffset::from_hms(8, 0, 0).unwrap_or(UtcOffset::UTC);
        let local = utc.to_offset(offset);

        format!(
            "{:04}-{:02}-{:02}",
            local.year(),
            local.month() as u8,
            local.day()
        )
    }

    /// 使用FFmpeg合并音视频
    async fn merge_with_ffmpeg(
        video: &Path,
        audio: &Path,
        output: &Path,
        config: &ConvertConfig,
    ) -> Result<(), ConvertError> {
        let app = get_app_handle();
        let sidecar = crate::shared::Sidecar::FFmpeg;

        // 构建FFmpeg命令
        let mut cmd = app
            .shell()
            .sidecar(crate::storage::config::read().sidecar(sidecar))
            .map_err(|e| ConvertError::MergeFailed {
                reason: format!("无法启动FFmpeg: {}", e),
            })?;

        cmd = cmd
            .args(["-hide_banner", "-nostats", "-loglevel", "warning"])
            .arg("-i")
            .arg(video.as_os_str())
            .arg("-i")
            .arg(audio.as_os_str());

        // 视频编码参数
        match config.video_quality {
            VideoQuality::Original => {
                cmd = cmd.args(["-c:v", "copy"]);
            }
            VideoQuality::High => {
                cmd = cmd.args(["-c:v", "libx264", "-crf", "18", "-preset", "medium"]);
            }
            VideoQuality::Standard => {
                cmd = cmd.args(["-c:v", "libx264", "-crf", "23", "-preset", "medium"]);
            }
        }

        // 音频编码参数
        match config.audio_bitrate {
            AudioBitrate::Original => {
                cmd = cmd.args(["-c:a", "copy"]);
            }
            AudioBitrate::Kbps192 => {
                cmd = cmd.args(["-c:a", "aac", "-b:a", "192k"]);
            }
            AudioBitrate::Kbps128 => {
                cmd = cmd.args(["-c:a", "aac", "-b:a", "128k"]);
            }
        }

        // 其他参数
        cmd = cmd
            .args(["-shortest", "-movflags", "+faststart"])
            .arg(output.as_os_str())
            .arg("-y");

        // 执行命令
        let result = cmd.output().await.map_err(|e| ConvertError::MergeFailed {
            reason: format!("FFmpeg执行失败: {}", e),
        })?;

        if !result.status.success() {
            let stderr = String::from_utf8_lossy(&result.stderr);
            return Err(ConvertError::MergeFailed {
                reason: format!("FFmpeg返回错误: {}", stderr),
            });
        }

        Ok(())
    }

    /// 暂停转换任务
    ///
    /// # 参数
    /// - `task_id`: 任务ID
    ///
    /// # 返回
    /// - `Ok(())`: 暂停成功
    /// - `Err`: 暂停失败
    pub async fn pause_task(task_id: &str) -> Result<(), ConvertError> {
        let manager = get_task_manager();

        // 检查任务是否存在
        let task = manager
            .get_task(task_id)
            .await
            .ok_or_else(|| ConvertError::TaskNotFound {
                task_id: task_id.to_string(),
            })?;

        // 检查任务是否可以暂停
        if !task.progress.stage.can_pause() {
            return Err(ConvertError::Unknown {
                message: format!("任务当前状态不支持暂停: {:?}", task.progress.stage),
            });
        }

        // 设置暂停状态
        manager.set_paused(task_id, true).await;

        // 更新进度
        let mut progress = task.progress.clone();
        progress.mark_paused();
        manager.update_progress(task_id, progress).await;

        Ok(())
    }

    /// 恢复转换任务
    ///
    /// # 参数
    /// - `task_id`: 任务ID
    ///
    /// # 返回
    /// - `Ok(())`: 恢复成功
    /// - `Err`: 恢复失败
    pub async fn resume_task(task_id: &str) -> Result<(), ConvertError> {
        let manager = get_task_manager();

        // 检查任务是否存在
        let task = manager
            .get_task(task_id)
            .await
            .ok_or_else(|| ConvertError::TaskNotFound {
                task_id: task_id.to_string(),
            })?;

        // 检查任务是否可以恢复
        if !task.progress.stage.can_resume() {
            return Err(ConvertError::Unknown {
                message: format!("任务当前状态不支持恢复: {:?}", task.progress.stage),
            });
        }

        // 取消暂停状态
        manager.set_paused(task_id, false).await;

        // 恢复之前的阶段状态（从暂停状态恢复到处理中）
        let mut progress = task.progress.clone();
        // 恢复到 Processing 阶段，让任务继续执行
        progress.set_stage(ConvertStage::Processing);
        manager.update_progress(task_id, progress).await;

        Ok(())
    }

    /// 取消转换任务
    ///
    /// # 参数
    /// - `task_id`: 任务ID
    ///
    /// # 返回
    /// - `Ok(())`: 取消成功
    /// - `Err`: 取消失败
    pub async fn cancel_task(task_id: &str) -> Result<(), ConvertError> {
        let manager = get_task_manager();

        // 检查任务是否存在
        let task = manager
            .get_task(task_id)
            .await
            .ok_or_else(|| ConvertError::TaskNotFound {
                task_id: task_id.to_string(),
            })?;

        // 检查任务是否可以取消
        if !task.progress.stage.can_cancel() {
            return Err(ConvertError::Unknown {
                message: format!("任务当前状态不支持取消: {:?}", task.progress.stage),
            });
        }

        // 发送取消信号
        manager.send_cancel(task_id).await;

        // 取消暂停状态（如果有）
        manager.set_paused(task_id, false).await;

        // 更新进度
        let mut progress = task.progress.clone();
        progress.mark_cancelled();
        manager.update_progress(task_id, progress).await;

        // 发送取消事件
        emit_cancelled(task_id);

        Ok(())
    }

    /// 获取任务状态
    ///
    /// # 参数
    /// - `task_id`: 任务ID
    ///
    /// # 返回
    /// - `Ok(ConvertTaskView)`: 任务视图
    /// - `Err`: 任务不存在
    pub async fn get_task(task_id: &str) -> Result<ConvertTaskView, ConvertError> {
        let manager = get_task_manager();
        manager
            .get_task(task_id)
            .await
            .ok_or_else(|| ConvertError::TaskNotFound {
                task_id: task_id.to_string(),
            })
    }

    /// 获取所有任务
    pub async fn get_all_tasks() -> Vec<ConvertTaskView> {
        let manager = get_task_manager();
        manager.get_all_tasks().await
    }

    /// 批量执行转换任务
    ///
    /// 按顺序执行多个转换任务，单个任务失败不影响其他任务
    ///
    /// # 参数
    /// - `task_ids`: 任务ID列表
    ///
    /// # 返回
    /// - `BatchConvertResult`: 批量转换结果
    pub async fn execute_batch(task_ids: Vec<String>) -> BatchConvertResult {
        let start_time = std::time::Instant::now();
        let mut batch_result = BatchConvertResult::new();

        for task_id in task_ids {
            // 获取任务信息
            let task = match get_task_manager().get_task(&task_id).await {
                Some(t) => t,
                None => {
                    batch_result.add_result(ConvertResult::failure(
                        task_id.clone(),
                        String::new(),
                        "任务不存在",
                    ));
                    continue;
                }
            };

            let cache_id = task.cache_id.clone();

            // 执行单个任务
            match Self::execute_task(&task_id).await {
                Ok(output_path) => {
                    batch_result.add_result(ConvertResult::success(
                        task_id,
                        cache_id,
                        output_path,
                    ));
                }
                Err(e) => {
                    batch_result.add_result(ConvertResult::failure(
                        task_id,
                        cache_id,
                        e.to_string(),
                    ));
                }
            }
        }

        batch_result.set_total_time(start_time.elapsed().as_secs());

        // 发送批量结果事件
        emit_batch_result(&batch_result);

        batch_result
    }

    /// 删除任务
    ///
    /// 从任务管理器中移除任务（仅限已完成、失败或取消的任务）
    ///
    /// # 参数
    /// - `task_id`: 任务ID
    ///
    /// # 返回
    /// - `Ok(())`: 删除成功
    /// - `Err`: 删除失败
    pub async fn remove_task(task_id: &str) -> Result<(), ConvertError> {
        let manager = get_task_manager();

        // 检查任务是否存在
        let task = manager
            .get_task(task_id)
            .await
            .ok_or_else(|| ConvertError::TaskNotFound {
                task_id: task_id.to_string(),
            })?;

        // 只能删除已完成的任务
        if !task.is_terminal() {
            return Err(ConvertError::Unknown {
                message: "只能删除已完成、失败或取消的任务".to_string(),
            });
        }

        manager.remove_task(task_id).await;
        Ok(())
    }

    /// 获取未完成的任务（用于恢复）
    ///
    /// 在应用启动时调用，检测之前未完成的转换任务
    ///
    /// # 返回
    /// - `Ok(Vec<ConvertTaskView>)`: 未完成的任务列表
    /// - `Err`: 加载失败
    pub async fn get_incomplete_tasks() -> Result<Vec<ConvertTaskView>, ConvertError> {
        let manager = get_task_manager();
        manager.load_incomplete_tasks().await
    }

    /// 恢复未完成的任务
    ///
    /// 重新执行之前中断的转换任务
    ///
    /// # 参数
    /// - `task_id`: 任务ID
    ///
    /// # 返回
    /// - `Ok(PathBuf)`: 转换成功，返回输出文件路径
    /// - `Err`: 转换失败
    pub async fn recover_task(task_id: &str) -> Result<PathBuf, ConvertError> {
        let manager = get_task_manager();

        // 获取任务
        let task = manager
            .get_task(task_id)
            .await
            .ok_or_else(|| ConvertError::TaskNotFound {
                task_id: task_id.to_string(),
            })?;

        // 验证缓存路径仍然存在
        if !task.cache_path.exists() {
            return Err(ConvertError::SourceFileMissing {
                path: task.cache_path.to_string_lossy().to_string(),
            });
        }

        // 验证输出目录仍然存在或可以创建
        if !task.output_dir.exists() {
            tokio::fs::create_dir_all(&task.output_dir).await.map_err(|e| {
                ConvertError::from_io_error(e, Some(&task.output_dir.to_string_lossy()))
            })?;
        }

        // 重置任务状态为准备中
        let mut progress = ConvertProgress::new();
        progress.set_stage(ConvertStage::Preparing);
        progress.set_current_file("恢复任务...".to_string());
        manager.update_progress(task_id, progress).await;

        // 执行转换
        Self::execute_task(task_id).await
    }

    /// 批量恢复未完成的任务
    ///
    /// # 参数
    /// - `task_ids`: 任务ID列表
    ///
    /// # 返回
    /// - `BatchConvertResult`: 批量转换结果
    pub async fn recover_batch(task_ids: Vec<String>) -> BatchConvertResult {
        let start_time = std::time::Instant::now();
        let mut batch_result = BatchConvertResult::new();

        for task_id in task_ids {
            // 获取任务信息
            let task = match get_task_manager().get_task(&task_id).await {
                Some(t) => t,
                None => {
                    batch_result.add_result(ConvertResult::failure(
                        task_id.clone(),
                        String::new(),
                        "任务不存在",
                    ));
                    continue;
                }
            };

            let cache_id = task.cache_id.clone();

            // 执行恢复
            match Self::recover_task(&task_id).await {
                Ok(output_path) => {
                    batch_result.add_result(ConvertResult::success(
                        task_id,
                        cache_id,
                        output_path,
                    ));
                }
                Err(e) => {
                    batch_result.add_result(ConvertResult::failure(
                        task_id,
                        cache_id,
                        e.to_string(),
                    ));
                }
            }
        }

        batch_result.set_total_time(start_time.elapsed().as_secs());

        // 发送批量结果事件
        emit_batch_result(&batch_result);

        batch_result
    }

    /// 放弃未完成的任务
    ///
    /// 将未完成的任务标记为取消状态
    ///
    /// # 参数
    /// - `task_id`: 任务ID
    pub async fn abandon_task(task_id: &str) -> Result<(), ConvertError> {
        let manager = get_task_manager();

        // 获取任务
        let task = manager
            .get_task(task_id)
            .await
            .ok_or_else(|| ConvertError::TaskNotFound {
                task_id: task_id.to_string(),
            })?;

        // 只能放弃未完成的任务
        if task.is_terminal() {
            return Err(ConvertError::Unknown {
                message: "任务已经完成，无需放弃".to_string(),
            });
        }

        // 更新进度为取消状态
        let mut progress = task.progress.clone();
        progress.mark_cancelled();
        manager.update_progress(task_id, progress).await;

        // 发送取消事件
        emit_cancelled(task_id);

        Ok(())
    }

    /// 批量放弃未完成的任务
    ///
    /// # 参数
    /// - `task_ids`: 任务ID列表
    ///
    /// # 返回
    /// - 成功放弃的任务数量
    pub async fn abandon_batch(task_ids: Vec<String>) -> i32 {
        let mut abandoned_count = 0;

        for task_id in task_ids {
            if Self::abandon_task(&task_id).await.is_ok() {
                abandoned_count += 1;
            }
        }

        abandoned_count
    }

    /// 清理已完成的任务记录
    ///
    /// # 参数
    /// - `days_to_keep`: 保留最近 N 天的记录，None 表示清理所有已完成的任务
    ///
    /// # 返回
    /// - 清理的任务数量
    pub async fn cleanup_completed_tasks(days_to_keep: Option<i64>) -> Result<i32, ConvertError> {
        let manager = get_task_manager();
        manager.cleanup_completed_tasks(days_to_keep).await
    }
}

/// 磁盘空间检查器
pub struct DiskSpaceChecker;

impl DiskSpaceChecker {
    /// 检查磁盘空间是否充足
    ///
    /// 根据源文件大小估算所需空间，并与目标目录可用空间比较。
    ///
    /// # 参数
    /// - `source_paths`: 源文件路径列表
    /// - `output_dir`: 输出目录
    ///
    /// # 返回
    /// - `Ok(DiskSpaceCheck)`: 检查结果
    /// - `Err(ConvertError)`: 检查失败
    pub fn check_disk_space(
        source_paths: &[PathBuf],
        output_dir: &Path,
    ) -> Result<DiskSpaceCheck, ConvertError> {
        // 计算源文件总大小
        let total_source_size = Self::calculate_total_size(source_paths)?;

        // 估算所需空间（考虑临时文件开销）
        let required_space = (total_source_size as f64 * DISK_SPACE_OVERHEAD_FACTOR) as u64;

        // 获取目标目录可用空间
        let available_space = Self::get_available_space(output_dir)?;

        Ok(DiskSpaceCheck::new(required_space, available_space))
    }

    /// 计算文件总大小
    fn calculate_total_size(paths: &[PathBuf]) -> Result<u64, ConvertError> {
        let mut total = 0u64;

        for path in paths {
            if path.exists() {
                let metadata = std::fs::metadata(path).map_err(|e| {
                    ConvertError::from_io_error(e, Some(&path.to_string_lossy()))
                })?;
                total += metadata.len();
            }
        }

        Ok(total)
    }

    /// 获取目录可用空间
    #[cfg(target_os = "windows")]
    fn get_available_space(path: &Path) -> Result<u64, ConvertError> {
        use std::ffi::OsStr;
        use std::os::windows::ffi::OsStrExt;
        use windows_sys::Win32::Storage::FileSystem::GetDiskFreeSpaceExW;

        // 确保路径存在，如果不存在则使用父目录
        let check_path = if path.exists() {
            path.to_path_buf()
        } else {
            path.parent()
                .map(|p| p.to_path_buf())
                .unwrap_or_else(|| PathBuf::from("."))
        };

        // 转换为宽字符串
        let wide_path: Vec<u16> = OsStr::new(&check_path)
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
            Err(ConvertError::IoError {
                message: format!("无法获取磁盘空间信息: {}", check_path.display()),
            })
        }
    }

    /// 获取目录可用空间（Unix 系统）
    #[cfg(unix)]
    fn get_available_space(path: &Path) -> Result<u64, ConvertError> {
        use std::ffi::CString;
        use std::os::unix::ffi::OsStrExt;

        // 确保路径存在，如果不存在则使用父目录
        let check_path = if path.exists() {
            path.to_path_buf()
        } else {
            path.parent()
                .map(|p| p.to_path_buf())
                .unwrap_or_else(|| PathBuf::from("."))
        };

        let c_path = CString::new(check_path.as_os_str().as_bytes()).map_err(|_| {
            ConvertError::IoError {
                message: format!("无效的路径: {}", check_path.display()),
            }
        })?;

        let mut stat: libc::statvfs = unsafe { std::mem::zeroed() };

        let result = unsafe { libc::statvfs(c_path.as_ptr(), &mut stat) };

        if result == 0 {
            // 可用空间 = 块大小 * 可用块数
            Ok(stat.f_bsize as u64 * stat.f_bavail as u64)
        } else {
            Err(ConvertError::IoError {
                message: format!("无法获取磁盘空间信息: {}", check_path.display()),
            })
        }
    }

    /// 格式化字节大小为人类可读格式
    pub fn format_size(bytes: u64) -> String {
        const KB: u64 = 1024;
        const MB: u64 = KB * 1024;
        const GB: u64 = MB * 1024;

        if bytes >= GB {
            format!("{:.2} GB", bytes as f64 / GB as f64)
        } else if bytes >= MB {
            format!("{:.2} MB", bytes as f64 / MB as f64)
        } else if bytes >= KB {
            format!("{:.2} KB", bytes as f64 / KB as f64)
        } else {
            format!("{} B", bytes)
        }
    }
}


/// 临时文件清理器
///
/// 负责清理转换过程中产生的临时文件
pub struct TempFileCleaner;

impl TempFileCleaner {
    /// 清理指定任务的临时目录
    ///
    /// # 参数
    /// - `task_id`: 任务ID
    ///
    /// # 返回
    /// - `Ok(bool)`: 是否成功清理（true=清理成功或目录不存在，false=清理失败）
    pub async fn cleanup_task_temp(task_id: &str) -> Result<bool, ConvertError> {
        let temp_dir = config::read().temp_dir.join(format!("{}{}", CONVERT_TEMP_PREFIX, task_id));
        
        if !temp_dir.exists() {
            return Ok(true);
        }

        match tokio::fs::remove_dir_all(&temp_dir).await {
            Ok(_) => {
                log::info!("已清理任务临时目录: {}", temp_dir.display());
                Ok(true)
            }
            Err(e) => {
                log::warn!("清理任务临时目录失败: {} - {}", temp_dir.display(), e);
                Ok(false)
            }
        }
    }

    /// 清理所有残留的转换临时目录
    ///
    /// 在应用启动时调用，清理之前未正常清理的临时文件。
    /// 只清理以 "convert_" 开头的目录。
    ///
    /// # 返回
    /// - `Ok((cleaned, failed))`: 清理成功的数量和失败的数量
    pub async fn cleanup_all_temp() -> Result<(i32, i32), ConvertError> {
        let temp_base = config::read().temp_dir();
        
        if !temp_base.exists() {
            return Ok((0, 0));
        }

        let mut cleaned = 0;
        let mut failed = 0;

        // 读取临时目录中的所有条目
        let mut entries = match tokio::fs::read_dir(&temp_base).await {
            Ok(entries) => entries,
            Err(e) => {
                log::warn!("无法读取临时目录: {} - {}", temp_base.display(), e);
                return Ok((0, 0));
            }
        };

        while let Ok(Some(entry)) = entries.next_entry().await {
            let path = entry.path();
            
            // 只处理目录
            if !path.is_dir() {
                continue;
            }

            // 只处理以 convert_ 开头的目录
            let dir_name = match path.file_name().and_then(|n| n.to_str()) {
                Some(name) => name,
                None => continue,
            };

            if !dir_name.starts_with(CONVERT_TEMP_PREFIX) {
                continue;
            }

            // 尝试删除目录
            match tokio::fs::remove_dir_all(&path).await {
                Ok(_) => {
                    log::info!("已清理残留临时目录: {}", path.display());
                    cleaned += 1;
                }
                Err(e) => {
                    log::warn!("清理残留临时目录失败: {} - {}", path.display(), e);
                    failed += 1;
                }
            }
        }

        if cleaned > 0 || failed > 0 {
            log::info!("临时文件清理完成: 成功 {} 个, 失败 {} 个", cleaned, failed);
        }

        Ok((cleaned, failed))
    }

    /// 清理指定目录下的所有临时文件
    ///
    /// 用于清理特定目录中的临时文件（如转换过程中的中间文件）
    ///
    /// # 参数
    /// - `dir`: 要清理的目录路径
    ///
    /// # 返回
    /// - `Ok(bool)`: 是否成功清理
    pub async fn cleanup_directory(dir: &Path) -> Result<bool, ConvertError> {
        if !dir.exists() {
            return Ok(true);
        }

        match tokio::fs::remove_dir_all(dir).await {
            Ok(_) => {
                log::debug!("已清理目录: {}", dir.display());
                Ok(true)
            }
            Err(e) => {
                log::warn!("清理目录失败: {} - {}", dir.display(), e);
                Ok(false)
            }
        }
    }

    /// 记录清理失败的文件路径
    ///
    /// 将清理失败的文件路径记录到日志，以便下次启动时重试
    pub fn log_cleanup_failure(path: &Path, error: &str) {
        log::error!("临时文件清理失败 - 路径: {}, 错误: {}", path.display(), error);
    }
}

/// 初始化转换服务
///
/// 在应用启动时调用，执行以下操作：
/// 1. 清理残留的临时文件
/// 2. 加载未完成的转换任务
///
/// # 返回
/// - `Ok(())`: 初始化成功
/// - `Err`: 初始化失败
pub async fn init() -> Result<(), ConvertError> {
    // 清理残留的临时文件
    match TempFileCleaner::cleanup_all_temp().await {
        Ok((cleaned, failed)) => {
            if cleaned > 0 {
                log::info!("转换服务初始化: 清理了 {} 个残留临时目录", cleaned);
            }
            if failed > 0 {
                log::warn!("转换服务初始化: {} 个临时目录清理失败", failed);
            }
        }
        Err(e) => {
            log::warn!("转换服务初始化: 清理临时文件时出错 - {}", e);
        }
    }

    // 加载未完成的任务（不阻塞初始化）
    let manager = get_task_manager();
    match manager.load_incomplete_tasks().await {
        Ok(tasks) => {
            if !tasks.is_empty() {
                log::info!("转换服务初始化: 发现 {} 个未完成的转换任务", tasks.len());
            }
        }
        Err(e) => {
            log::warn!("转换服务初始化: 加载未完成任务时出错 - {}", e);
        }
    }

    Ok(())
}
