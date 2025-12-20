use serde::{Deserialize, Serialize};
use specta::Type;

/// 转换错误类型
#[derive(Debug, thiserror::Error, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type", content = "data")]
pub enum ConvertError {
    #[error("缓存目录不存在: {path}")]
    CacheNotFound { path: String },

    #[error("无法识别音视频流: {reason}")]
    StreamIdentificationFailed { reason: String },

    #[error("m4s文件处理失败: {reason}")]
    M4sProcessingFailed { reason: String },

    #[error("FFmpeg合并失败: {reason}")]
    MergeFailed { reason: String },

    #[error("元数据处理失败: {reason}")]
    MetadataFailed { reason: String },

    #[error("弹幕解析失败: {reason}")]
    DanmakuParseFailed { reason: String },

    #[error("弹幕转换失败: {reason}")]
    DanmakuConvertFailed { reason: String },

    #[error("磁盘空间不足: 需要 {required} 字节，可用 {available} 字节")]
    InsufficientDiskSpace { required: u64, available: u64 },

    #[error("源文件已被移动或删除: {path}")]
    SourceFileMissing { path: String },

    #[error("输出目录不可写: {path}")]
    OutputDirNotWritable { path: String },

    #[error("任务已取消")]
    TaskCancelled,

    #[error("任务暂停中")]
    TaskPaused,

    #[error("任务不存在: {task_id}")]
    TaskNotFound { task_id: String },

    #[error("IO错误: {message}")]
    IoError { message: String },

    #[error("数据库错误: {message}")]
    DatabaseError { message: String },

    #[error("未知错误: {message}")]
    Unknown { message: String },
}

impl ConvertError {
    /// 从标准IO错误转换
    pub fn from_io_error(err: std::io::Error, path: Option<&str>) -> Self {
        match err.kind() {
            std::io::ErrorKind::NotFound => Self::SourceFileMissing {
                path: path.unwrap_or("unknown").to_string(),
            },
            std::io::ErrorKind::PermissionDenied => Self::OutputDirNotWritable {
                path: path.unwrap_or("unknown").to_string(),
            },
            _ => Self::IoError {
                message: err.to_string(),
            },
        }
    }

    /// 从数据库错误转换
    pub fn from_database_error(err: sqlx::Error) -> Self {
        Self::DatabaseError {
            message: err.to_string(),
        }
    }

    /// 判断错误是否可恢复
    pub fn is_recoverable(&self) -> bool {
        matches!(
            self,
            ConvertError::InsufficientDiskSpace { .. }
                | ConvertError::TaskPaused
                | ConvertError::IoError { .. }
        )
    }

    /// 获取建议的解决方案
    pub fn suggested_action(&self) -> String {
        match self {
            ConvertError::CacheNotFound { .. } => "请检查缓存文件是否存在".to_string(),
            ConvertError::StreamIdentificationFailed { .. } => {
                "请确保缓存文件完整，包含音视频流".to_string()
            }
            ConvertError::M4sProcessingFailed { .. } => "请检查m4s文件是否损坏".to_string(),
            ConvertError::MergeFailed { .. } => "请检查FFmpeg是否正确安装".to_string(),
            ConvertError::MetadataFailed { .. } => "请检查FFmpeg是否正确安装".to_string(),
            ConvertError::DanmakuParseFailed { .. } => {
                "弹幕文件可能已损坏，将跳过弹幕导出".to_string()
            }
            ConvertError::DanmakuConvertFailed { .. } => {
                "请检查DanmakuFactory是否正确安装".to_string()
            }
            ConvertError::InsufficientDiskSpace { .. } => {
                "请清理磁盘空间或选择其他输出目录".to_string()
            }
            ConvertError::SourceFileMissing { .. } => "请检查源文件是否存在".to_string(),
            ConvertError::OutputDirNotWritable { .. } => {
                "请检查输出目录权限或选择其他目录".to_string()
            }
            ConvertError::TaskCancelled => "任务已取消".to_string(),
            ConvertError::TaskPaused => "任务已暂停，可以恢复".to_string(),
            ConvertError::TaskNotFound { .. } => "请检查任务是否存在".to_string(),
            ConvertError::IoError { .. } => "请重试操作".to_string(),
            ConvertError::DatabaseError { .. } => "请重试操作".to_string(),
            ConvertError::Unknown { .. } => "请重试操作".to_string(),
        }
    }

    /// 获取用户友好的错误消息
    pub fn user_friendly_message(&self) -> String {
        match self {
            ConvertError::CacheNotFound { path } => format!("缓存目录不存在：{}", path),
            ConvertError::StreamIdentificationFailed { reason } => {
                format!("无法识别音视频流：{}", reason)
            }
            ConvertError::M4sProcessingFailed { reason } => {
                format!("m4s文件处理失败：{}", reason)
            }
            ConvertError::MergeFailed { reason } => format!("FFmpeg合并失败：{}", reason),
            ConvertError::MetadataFailed { reason } => format!("元数据处理失败：{}", reason),
            ConvertError::DanmakuParseFailed { reason } => {
                format!("弹幕解析失败：{}", reason)
            }
            ConvertError::DanmakuConvertFailed { reason } => {
                format!("弹幕转换失败：{}", reason)
            }
            ConvertError::InsufficientDiskSpace {
                required,
                available,
            } => {
                format!(
                    "磁盘空间不足（需要：{}MB，可用：{}MB）",
                    required / (1024 * 1024),
                    available / (1024 * 1024)
                )
            }
            ConvertError::SourceFileMissing { path } => format!("源文件已被移动或删除：{}", path),
            ConvertError::OutputDirNotWritable { path } => format!("输出目录不可写：{}", path),
            ConvertError::TaskCancelled => "转换任务已取消".to_string(),
            ConvertError::TaskPaused => "转换任务已暂停".to_string(),
            ConvertError::TaskNotFound { task_id } => format!("转换任务不存在：{}", task_id),
            ConvertError::IoError { message } => format!("IO错误：{}", message),
            ConvertError::DatabaseError { message } => format!("数据库错误：{}", message),
            ConvertError::Unknown { message } => format!("未知错误：{}", message),
        }
    }
}

impl From<std::io::Error> for ConvertError {
    fn from(err: std::io::Error) -> Self {
        Self::from_io_error(err, None)
    }
}

impl From<sqlx::Error> for ConvertError {
    fn from(err: sqlx::Error) -> Self {
        Self::from_database_error(err)
    }
}
