use serde::{Deserialize, Serialize};
use specta::Type;

/// 传输错误类型
#[derive(Debug, thiserror::Error, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type", content = "data")]
pub enum TransferError {
    #[error("目标路径无效: {path}")]
    InvalidTargetPath { path: String },

    #[error("空间不足: 需要 {required} 字节，可用 {available} 字节")]
    InsufficientSpace { required: u64, available: u64 },

    #[error("设备连接中断: {device_name}")]
    DeviceDisconnected { device_name: String },

    #[error("文件访问被拒绝: {file_path}")]
    AccessDenied { file_path: String },

    #[error("传输被用户取消")]
    UserCancelled,

    #[error("文件系统错误: {message}")]
    FileSystemError { message: String },

    #[error("设备未找到: {device_id}")]
    DeviceNotFound { device_id: String },

    #[error("文件名冲突: {file_name}")]
    FileNameConflict { file_name: String },

    #[error("源文件不存在: {path}")]
    SourceNotFound { path: String },

    #[error("传输任务不存在: {task_id}")]
    TaskNotFound { task_id: String },

    #[error("检查点损坏: {task_id}")]
    CheckpointCorrupted { task_id: String },

    #[error("哈希校验失败: 期望 {expected}, 实际 {actual}")]
    HashMismatch { expected: String, actual: String },

    #[error("数据库错误: {message}")]
    DatabaseError { message: String },

    #[error("IO错误: {message}")]
    IoError { message: String },

    #[error("未知错误: {message}")]
    Unknown { message: String },
}

impl TransferError {
    /// 从标准IO错误转换
    pub fn from_io_error(err: std::io::Error, path: Option<&str>) -> Self {
        match err.kind() {
            std::io::ErrorKind::NotFound => Self::SourceNotFound {
                path: path.unwrap_or("unknown").to_string(),
            },
            std::io::ErrorKind::PermissionDenied => Self::AccessDenied {
                file_path: path.unwrap_or("unknown").to_string(),
            },
            std::io::ErrorKind::AlreadyExists => Self::FileNameConflict {
                file_name: path.unwrap_or("unknown").to_string(),
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
            TransferError::DeviceDisconnected { .. }
                | TransferError::FileSystemError { .. }
                | TransferError::FileNameConflict { .. }
                | TransferError::IoError { .. }
        )
    }

    /// 获取建议的解决方案
    pub fn suggested_action(&self) -> String {
        match self {
            TransferError::InsufficientSpace { .. } => {
                "请清理目标设备空间或选择其他设备".to_string()
            }
            TransferError::DeviceDisconnected { .. } => "请重新连接设备并重试".to_string(),
            TransferError::AccessDenied { .. } => "请检查文件权限或以管理员身份运行".to_string(),
            TransferError::DeviceNotFound { .. } => "请检查设备连接状态".to_string(),
            TransferError::FileNameConflict { .. } => "系统将自动重命名文件".to_string(),
            TransferError::SourceNotFound { .. } => "请检查源文件是否存在".to_string(),
            TransferError::HashMismatch { .. } => "文件可能已损坏，请重新传输".to_string(),
            _ => "请重试操作".to_string(),
        }
    }

    /// 获取用户友好的错误消息
    pub fn user_friendly_message(&self) -> String {
        match self {
            TransferError::InvalidTargetPath { path } => format!("目标路径无效：{}", path),
            TransferError::InsufficientSpace {
                required,
                available,
            } => {
                format!(
                    "空间不足（需要：{}MB，可用：{}MB）",
                    required / 1024 / 1024,
                    available / 1024 / 1024
                )
            }
            TransferError::DeviceDisconnected { device_name } => {
                format!("设备已断开连接：{}", device_name)
            }
            TransferError::AccessDenied { file_path } => format!("没有访问权限：{}", file_path),
            TransferError::UserCancelled => "传输已取消".to_string(),
            TransferError::FileSystemError { message } => format!("文件系统错误：{}", message),
            TransferError::DeviceNotFound { device_id } => format!("设备未找到：{}", device_id),
            TransferError::FileNameConflict { file_name } => format!("文件名冲突：{}", file_name),
            TransferError::SourceNotFound { path } => format!("源文件不存在：{}", path),
            TransferError::TaskNotFound { task_id } => format!("传输任务不存在：{}", task_id),
            TransferError::CheckpointCorrupted { task_id } => {
                format!("检查点数据损坏：{}", task_id)
            }
            TransferError::HashMismatch { .. } => "文件完整性校验失败".to_string(),
            TransferError::DatabaseError { message } => format!("数据库错误：{}", message),
            TransferError::IoError { message } => format!("IO错误：{}", message),
            TransferError::Unknown { message } => format!("未知错误：{}", message),
        }
    }
}
