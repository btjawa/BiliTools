//! 转换任务类型定义
//!
//! 定义转换任务的配置、状态和进度类型。

use serde::{Deserialize, Serialize};
use specta::Type;
use std::path::PathBuf;

/// 视频质量预设
#[repr(u8)]
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum VideoQuality {
    /// 原始质量（直接复制，不重新编码）
    #[default]
    Original = 0,
    /// 高质量（CRF 18）
    High = 1,
    /// 标准质量（CRF 23）
    Standard = 2,
}

impl From<u8> for VideoQuality {
    fn from(value: u8) -> Self {
        match value {
            0 => Self::Original,
            1 => Self::High,
            2 => Self::Standard,
            _ => Self::Original,
        }
    }
}

impl From<VideoQuality> for u8 {
    fn from(value: VideoQuality) -> Self {
        value as u8
    }
}

/// 音频码率预设
#[repr(u8)]
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum AudioBitrate {
    /// 原始码率（直接复制）
    #[default]
    Original = 0,
    /// 192kbps
    Kbps192 = 1,
    /// 128kbps
    Kbps128 = 2,
}

impl From<u8> for AudioBitrate {
    fn from(value: u8) -> Self {
        match value {
            0 => Self::Original,
            1 => Self::Kbps192,
            2 => Self::Kbps128,
            _ => Self::Original,
        }
    }
}

impl From<AudioBitrate> for u8 {
    fn from(value: AudioBitrate) -> Self {
        value as u8
    }
}

impl AudioBitrate {
    /// 获取FFmpeg参数值
    pub fn to_ffmpeg_bitrate(&self) -> Option<&'static str> {
        match self {
            Self::Original => None,
            Self::Kbps192 => Some("192k"),
            Self::Kbps128 => Some("128k"),
        }
    }
}

/// 弹幕导出格式
#[repr(u8)]
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum DanmakuFormat {
    /// 不导出弹幕
    #[default]
    None = 0,
    /// 仅导出 XML 格式
    Xml = 1,
    /// 仅导出 ASS 格式（通过 DanmakuFactory 转换）
    Ass = 2,
    /// 同时导出 XML 和 ASS
    Both = 3,
}

impl From<u8> for DanmakuFormat {
    fn from(value: u8) -> Self {
        match value {
            0 => Self::None,
            1 => Self::Xml,
            2 => Self::Ass,
            3 => Self::Both,
            _ => Self::None,
        }
    }
}

impl From<DanmakuFormat> for u8 {
    fn from(value: DanmakuFormat) -> Self {
        value as u8
    }
}

impl DanmakuFormat {
    /// 是否需要导出 XML
    pub fn needs_xml(&self) -> bool {
        matches!(self, Self::Xml | Self::Both)
    }

    /// 是否需要导出 ASS
    pub fn needs_ass(&self) -> bool {
        matches!(self, Self::Ass | Self::Both)
    }

    /// 是否需要导出任何格式
    pub fn is_enabled(&self) -> bool {
        !matches!(self, Self::None)
    }
}

/// 转换配置
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ConvertConfig {
    /// 视频质量预设
    pub video_quality: VideoQuality,
    /// 音频码率
    pub audio_bitrate: AudioBitrate,
    /// 是否嵌入封面
    pub embed_cover: bool,
    /// 弹幕导出格式
    pub danmaku_format: DanmakuFormat,
    /// 是否写入元数据
    pub write_metadata: bool,
}

impl Default for ConvertConfig {
    fn default() -> Self {
        Self {
            video_quality: VideoQuality::Original,
            audio_bitrate: AudioBitrate::Original,
            embed_cover: true,
            danmaku_format: DanmakuFormat::None,
            write_metadata: true,
        }
    }
}

/// 转换阶段
#[repr(u8)]
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum ConvertStage {
    /// 准备中
    #[default]
    Preparing = 0,
    /// 处理m4s文件
    Processing = 1,
    /// 合并音视频
    Merging = 2,
    /// 导出弹幕
    ExportDanmaku = 3,
    /// 添加元数据
    AddingMeta = 4,
    /// 完成中
    Finalizing = 5,
    /// 已完成
    Completed = 6,
    /// 失败
    Failed = 7,
    /// 已暂停
    Paused = 8,
    /// 已取消
    Cancelled = 9,
}

impl From<u8> for ConvertStage {
    fn from(value: u8) -> Self {
        match value {
            0 => Self::Preparing,
            1 => Self::Processing,
            2 => Self::Merging,
            3 => Self::ExportDanmaku,
            4 => Self::AddingMeta,
            5 => Self::Finalizing,
            6 => Self::Completed,
            7 => Self::Failed,
            8 => Self::Paused,
            9 => Self::Cancelled,
            _ => Self::Preparing,
        }
    }
}

impl From<ConvertStage> for u8 {
    fn from(value: ConvertStage) -> Self {
        value as u8
    }
}

impl ConvertStage {
    /// 判断是否为终态
    pub fn is_terminal(&self) -> bool {
        matches!(
            self,
            Self::Completed | Self::Failed | Self::Cancelled
        )
    }

    /// 判断是否可以暂停
    pub fn can_pause(&self) -> bool {
        matches!(
            self,
            Self::Preparing | Self::Processing | Self::Merging | Self::ExportDanmaku | Self::AddingMeta | Self::Finalizing
        )
    }

    /// 判断是否可以恢复
    pub fn can_resume(&self) -> bool {
        matches!(self, Self::Paused)
    }

    /// 判断是否可以取消
    pub fn can_cancel(&self) -> bool {
        !self.is_terminal()
    }

    /// 获取阶段的显示名称
    pub fn display_name(&self) -> &'static str {
        match self {
            Self::Preparing => "准备中",
            Self::Processing => "处理m4s文件",
            Self::Merging => "合并音视频",
            Self::ExportDanmaku => "导出弹幕",
            Self::AddingMeta => "添加元数据",
            Self::Finalizing => "完成中",
            Self::Completed => "已完成",
            Self::Failed => "失败",
            Self::Paused => "已暂停",
            Self::Cancelled => "已取消",
        }
    }
}

/// 转换进度
#[derive(Debug, Clone, Default, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ConvertProgress {
    /// 当前阶段
    pub stage: ConvertStage,
    /// 进度百分比 (0-100)
    pub percentage: f64,
    /// 当前处理的文件名
    pub current_file: String,
    /// 处理速度
    pub speed: String,
    /// 已处理字节数
    pub processed_bytes: u64,
    /// 总字节数
    pub total_bytes: u64,
}

impl ConvertProgress {
    /// 创建新的进度实例
    pub fn new() -> Self {
        Self::default()
    }

    /// 更新阶段
    pub fn set_stage(&mut self, stage: ConvertStage) {
        self.stage = stage;
    }

    /// 更新进度百分比
    pub fn set_percentage(&mut self, percentage: f64) {
        self.percentage = percentage.clamp(0.0, 100.0);
    }

    /// 更新当前文件
    pub fn set_current_file(&mut self, file: impl Into<String>) {
        self.current_file = file.into();
    }

    /// 更新处理速度
    pub fn set_speed(&mut self, speed: impl Into<String>) {
        self.speed = speed.into();
    }

    /// 更新字节进度
    pub fn set_bytes_progress(&mut self, processed: u64, total: u64) {
        self.processed_bytes = processed;
        self.total_bytes = total;
        if total > 0 {
            self.percentage = (processed as f64 / total as f64 * 100.0).clamp(0.0, 100.0);
        }
    }

    /// 标记为完成
    pub fn mark_completed(&mut self) {
        self.stage = ConvertStage::Completed;
        self.percentage = 100.0;
    }

    /// 标记为失败
    pub fn mark_failed(&mut self) {
        self.stage = ConvertStage::Failed;
    }

    /// 标记为暂停
    pub fn mark_paused(&mut self) {
        self.stage = ConvertStage::Paused;
    }

    /// 标记为取消
    pub fn mark_cancelled(&mut self) {
        self.stage = ConvertStage::Cancelled;
    }
}

/// 转换任务视图（用于前端展示和数据库存储）
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ConvertTaskView {
    /// 任务ID
    pub id: String,
    /// 缓存记录ID
    pub cache_id: String,
    /// 缓存路径
    pub cache_path: PathBuf,
    /// 输出目录
    pub output_dir: PathBuf,
    /// 输出文件路径（转换完成后设置）
    pub output_path: Option<PathBuf>,
    /// 转换配置
    pub config: ConvertConfig,
    /// 当前进度
    pub progress: ConvertProgress,
    /// 错误信息
    pub error_message: Option<String>,
    /// 视频标题
    pub title: String,
    /// 创建时间戳
    pub created_at: u64,
    /// 更新时间戳
    pub updated_at: u64,
    /// 完成时间戳
    pub completed_at: Option<u64>,
}

impl ConvertTaskView {
    /// 创建新的任务视图
    pub fn new(
        id: String,
        cache_id: String,
        cache_path: PathBuf,
        output_dir: PathBuf,
        config: ConvertConfig,
        title: String,
    ) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        Self {
            id,
            cache_id,
            cache_path,
            output_dir,
            output_path: None,
            config,
            progress: ConvertProgress::new(),
            error_message: None,
            title,
            created_at: now,
            updated_at: now,
            completed_at: None,
        }
    }

    /// 更新进度
    pub fn update_progress(&mut self, progress: ConvertProgress) {
        self.progress = progress;
        self.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
    }

    /// 设置输出路径
    pub fn set_output_path(&mut self, path: PathBuf) {
        self.output_path = Some(path);
    }

    /// 设置错误信息
    pub fn set_error(&mut self, message: impl Into<String>) {
        self.error_message = Some(message.into());
        self.progress.mark_failed();
        self.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
    }

    /// 标记完成
    pub fn mark_completed(&mut self) {
        self.progress.mark_completed();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        self.updated_at = now;
        self.completed_at = Some(now);
    }

    /// 判断任务是否已完成
    pub fn is_completed(&self) -> bool {
        self.progress.stage == ConvertStage::Completed
    }

    /// 判断任务是否失败
    pub fn is_failed(&self) -> bool {
        self.progress.stage == ConvertStage::Failed
    }

    /// 判断任务是否已取消
    pub fn is_cancelled(&self) -> bool {
        self.progress.stage == ConvertStage::Cancelled
    }

    /// 判断任务是否处于终态
    pub fn is_terminal(&self) -> bool {
        self.progress.stage.is_terminal()
    }
}

/// 磁盘空间检查结果
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DiskSpaceCheck {
    /// 预估所需空间（字节）
    pub required_space: u64,
    /// 可用空间（字节）
    pub available_space: u64,
    /// 空间是否充足
    pub is_sufficient: bool,
}

impl DiskSpaceCheck {
    /// 创建新的检查结果
    pub fn new(required_space: u64, available_space: u64) -> Self {
        Self {
            required_space,
            available_space,
            is_sufficient: available_space >= required_space,
        }
    }
}

/// 文件名冲突策略
#[repr(u8)]
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum ConflictStrategy {
    /// 自动添加数字后缀
    #[default]
    AutoRename = 0,
    /// 覆盖
    Overwrite = 1,
    /// 跳过
    Skip = 2,
}

impl From<u8> for ConflictStrategy {
    fn from(value: u8) -> Self {
        match value {
            0 => Self::AutoRename,
            1 => Self::Overwrite,
            2 => Self::Skip,
            _ => Self::AutoRename,
        }
    }
}

impl From<ConflictStrategy> for u8 {
    fn from(value: ConflictStrategy) -> Self {
        value as u8
    }
}

/// 批量转换结果
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct BatchConvertResult {
    /// 总任务数
    pub total_count: usize,
    /// 成功数量
    pub success_count: usize,
    /// 失败数量
    pub failure_count: usize,
    /// 总耗时（秒）
    pub total_time: u64,
    /// 各任务结果
    pub results: Vec<ConvertResult>,
}

impl BatchConvertResult {
    /// 创建新的批量结果
    pub fn new() -> Self {
        Self {
            total_count: 0,
            success_count: 0,
            failure_count: 0,
            total_time: 0,
            results: Vec::new(),
        }
    }

    /// 添加任务结果
    pub fn add_result(&mut self, result: ConvertResult) {
        if result.success {
            self.success_count += 1;
        } else {
            self.failure_count += 1;
        }
        self.total_count += 1;
        self.results.push(result);
    }

    /// 设置总耗时
    pub fn set_total_time(&mut self, time: u64) {
        self.total_time = time;
    }
}

impl Default for BatchConvertResult {
    fn default() -> Self {
        Self::new()
    }
}

/// 单个转换结果
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ConvertResult {
    /// 任务ID
    pub task_id: String,
    /// 缓存ID
    pub cache_id: String,
    /// 是否成功
    pub success: bool,
    /// 输出文件路径
    pub output_path: Option<PathBuf>,
    /// 错误信息
    pub error: Option<String>,
}

impl ConvertResult {
    /// 创建成功结果
    pub fn success(task_id: String, cache_id: String, output_path: PathBuf) -> Self {
        Self {
            task_id,
            cache_id,
            success: true,
            output_path: Some(output_path),
            error: None,
        }
    }

    /// 创建失败结果
    pub fn failure(task_id: String, cache_id: String, error: impl Into<String>) -> Self {
        Self {
            task_id,
            cache_id,
            success: false,
            output_path: None,
            error: Some(error.into()),
        }
    }
}
