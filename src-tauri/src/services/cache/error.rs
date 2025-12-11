use serde::{Deserialize, Serialize};
use specta::Type;
use std::path::PathBuf;
/// 缓存导入错误类型
#[derive(Debug, thiserror::Error, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type", content = "data")]
pub enum CacheImportError {
    #[error("目录不存在或无法访问: {path}")]
    DirectoryNotFound { path: String },

    #[error("videoInfo.json文件格式无效: {reason}")]
    InvalidJsonFormat { reason: String },

    #[error("缺少必需字段: {fields:?}")]
    MissingRequiredFields { fields: Vec<String> },

    #[error("文件大小不匹配，期望: {expected}, 实际: {actual}")]
    FileSizeMismatch { expected: u64, actual: u64 },

    #[error("数据库操作失败: {message}")]
    DatabaseError { message: String },

    #[error("导入操作被用户取消")]
    ImportCancelled,

    #[error("IO错误: {message}")]
    IoError { message: String },

    #[error("权限不足: {path}")]
    PermissionDenied { path: String },

    #[error("文件损坏或不完整: {path}")]
    CorruptedFile { path: String },

    #[error("不支持的文件格式: {format}")]
    UnsupportedFormat { format: String },

    #[error("网络错误: {message}")]
    NetworkError { message: String },

    #[error("解析超时: {timeout_seconds}秒")]
    ParseTimeout { timeout_seconds: u64 },

    #[error("内存不足")]
    OutOfMemory,

    #[error("未知错误: {message}")]
    Unknown { message: String },
}

/// 导入操作类型
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub enum ImportAction {
    /// 跳过当前项目，继续处理其他项目
    Skip,
    /// 重试当前操作（最多3次）
    Retry,
    /// 中止整个导入操作
    Abort,
    /// 继续处理，忽略错误
    Continue,
}

/// 错误恢复上下文
#[derive(Debug, Clone)]
pub struct ImportContext {
    pub current_directory: PathBuf,
    pub retry_count: u32,
    pub total_directories: usize,
    pub processed_directories: usize,
}

impl CacheImportError {
    /// 从标准错误类型转换
    pub fn from_io_error(err: std::io::Error, path: Option<&str>) -> Self {
        match err.kind() {
            std::io::ErrorKind::NotFound => Self::DirectoryNotFound {
                path: path.unwrap_or("unknown").to_string(),
            },
            std::io::ErrorKind::PermissionDenied => Self::PermissionDenied {
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

    /// 从JSON解析错误转换
    pub fn from_json_error(err: serde_json::Error) -> Self {
        Self::InvalidJsonFormat {
            reason: err.to_string(),
        }
    }

    /// 从anyhow错误转换
    pub fn from_anyhow_error(err: &anyhow::Error) -> Self {
        Self::Unknown {
            message: err.to_string(),
        }
    }

    /// 判断错误是否可以重试
    pub fn is_retryable(&self) -> bool {
        match self {
            Self::DatabaseError { .. } => true,
            Self::NetworkError { .. } => true,
            Self::ParseTimeout { .. } => true,
            Self::IoError { .. } => true,
            Self::OutOfMemory => false,
            Self::ImportCancelled => false,
            Self::DirectoryNotFound { .. } => false,
            Self::PermissionDenied { .. } => false,
            Self::InvalidJsonFormat { .. } => false,
            Self::MissingRequiredFields { .. } => false,
            Self::FileSizeMismatch { .. } => false,
            Self::CorruptedFile { .. } => false,
            Self::UnsupportedFormat { .. } => false,
            Self::Unknown { .. } => false,
        }
    }

    /// 获取错误的严重程度
    pub fn severity(&self) -> ErrorSeverity {
        match self {
            Self::ImportCancelled => ErrorSeverity::Info,
            Self::FileSizeMismatch { .. } => ErrorSeverity::Warning,
            Self::DirectoryNotFound { .. } => ErrorSeverity::Warning,
            Self::InvalidJsonFormat { .. } => ErrorSeverity::Warning,
            Self::MissingRequiredFields { .. } => ErrorSeverity::Warning,
            Self::CorruptedFile { .. } => ErrorSeverity::Warning,
            Self::UnsupportedFormat { .. } => ErrorSeverity::Warning,
            Self::DatabaseError { .. } => ErrorSeverity::Error,
            Self::IoError { .. } => ErrorSeverity::Error,
            Self::PermissionDenied { .. } => ErrorSeverity::Error,
            Self::NetworkError { .. } => ErrorSeverity::Error,
            Self::ParseTimeout { .. } => ErrorSeverity::Error,
            Self::OutOfMemory => ErrorSeverity::Critical,
            Self::Unknown { .. } => ErrorSeverity::Error,
        }
    }

    /// 获取用户友好的错误消息
    pub fn user_friendly_message(&self) -> String {
        match self {
            Self::DirectoryNotFound { path } => {
                format!("找不到目录：{}", path)
            }
            Self::InvalidJsonFormat { .. } => "视频信息文件格式无效，可能已损坏".to_string(),
            Self::MissingRequiredFields { fields } => {
                format!("视频信息缺少必要字段：{}", fields.join(", "))
            }
            Self::FileSizeMismatch { expected, actual } => {
                format!(
                    "文件大小不匹配（期望：{}MB，实际：{}MB）",
                    expected / 1024 / 1024,
                    actual / 1024 / 1024
                )
            }
            Self::DatabaseError { .. } => "数据库操作失败，请检查磁盘空间和权限".to_string(),
            Self::ImportCancelled => "导入操作已取消".to_string(),
            Self::IoError { .. } => "文件读取失败，请检查文件权限和磁盘状态".to_string(),
            Self::PermissionDenied { path } => {
                format!("没有访问权限：{}", path)
            }
            Self::CorruptedFile { path } => {
                format!("文件已损坏：{}", path)
            }
            Self::UnsupportedFormat { format } => {
                format!("不支持的文件格式：{}", format)
            }
            Self::NetworkError { .. } => "网络连接失败，请检查网络设置".to_string(),
            Self::ParseTimeout { timeout_seconds } => {
                format!("解析超时（{}秒），文件可能过大", timeout_seconds)
            }
            Self::OutOfMemory => "内存不足，请关闭其他程序后重试".to_string(),
            Self::Unknown { message } => format!("未知错误：{}", message),
        }
    }

    /// 获取建议的解决方案
    pub fn suggested_solution(&self) -> Option<String> {
        match self {
            Self::DirectoryNotFound { .. } => {
                Some("请检查目录路径是否正确，或选择其他目录".to_string())
            }
            Self::InvalidJsonFormat { .. } => {
                Some("请尝试重新下载该视频，或跳过此文件".to_string())
            }
            Self::MissingRequiredFields { .. } => {
                Some("该缓存文件可能来自旧版本客户端，建议跳过".to_string())
            }
            Self::FileSizeMismatch { .. } => {
                Some("文件可能未完全下载，建议重新下载或跳过".to_string())
            }
            Self::DatabaseError { .. } => {
                Some("请检查磁盘空间是否充足，或重启应用程序".to_string())
            }
            Self::PermissionDenied { .. } => {
                Some("请以管理员身份运行程序，或更改文件权限".to_string())
            }
            Self::CorruptedFile { .. } => Some("请重新下载该文件，或从备份中恢复".to_string()),
            Self::NetworkError { .. } => Some("请检查网络连接，或稍后重试".to_string()),
            Self::OutOfMemory => Some("请关闭其他程序释放内存，或重启计算机".to_string()),
            _ => None,
        }
    }
}

/// 错误严重程度
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub enum ErrorSeverity {
    /// 信息性消息
    Info,
    /// 警告，不影响主要功能
    Warning,
    /// 错误，影响当前操作
    Error,
    /// 严重错误，可能影响整个应用
    Critical,
}

/// 错误恢复策略
pub struct ErrorRecoveryStrategy;

impl ErrorRecoveryStrategy {
    /// 根据错误类型和上下文决定恢复操作
    pub fn decide_action(error: &CacheImportError, context: &ImportContext) -> ImportAction {
        match error {
            CacheImportError::ImportCancelled => ImportAction::Abort,
            CacheImportError::OutOfMemory => ImportAction::Abort,

            // 可重试的错误
            error if error.is_retryable() && context.retry_count < 3 => ImportAction::Retry,

            // 严重错误但可以跳过
            CacheImportError::DatabaseError { .. } if context.retry_count >= 3 => {
                ImportAction::Skip
            }
            CacheImportError::NetworkError { .. } if context.retry_count >= 3 => ImportAction::Skip,
            CacheImportError::ParseTimeout { .. } if context.retry_count >= 3 => ImportAction::Skip,
            CacheImportError::IoError { .. } if context.retry_count >= 3 => ImportAction::Skip,

            // 文件级别的错误，跳过当前文件
            CacheImportError::DirectoryNotFound { .. } => ImportAction::Skip,
            CacheImportError::InvalidJsonFormat { .. } => ImportAction::Skip,
            CacheImportError::MissingRequiredFields { .. } => ImportAction::Skip,
            CacheImportError::CorruptedFile { .. } => ImportAction::Skip,
            CacheImportError::UnsupportedFormat { .. } => ImportAction::Skip,
            CacheImportError::PermissionDenied { .. } => ImportAction::Skip,

            // 警告级别的错误，继续处理
            CacheImportError::FileSizeMismatch { .. } => ImportAction::Continue,

            // 其他未知错误，跳过
            _ => ImportAction::Skip,
        }
    }

    /// 获取重试延迟时间（毫秒）
    pub fn get_retry_delay(retry_count: u32) -> u64 {
        match retry_count {
            0 => 1000,  // 1秒
            1 => 2000,  // 2秒
            2 => 5000,  // 5秒
            _ => 10000, // 10秒
        }
    }
}

/// 错误统计信息
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ErrorStatistics {
    pub total_errors: u32,
    pub error_by_type: std::collections::HashMap<String, u32>,
    pub error_by_severity: std::collections::HashMap<String, u32>,
    pub retried_operations: u32,
    pub skipped_operations: u32,
    pub aborted_operations: u32,
}

impl ErrorStatistics {
    pub fn new() -> Self {
        Self {
            total_errors: 0,
            error_by_type: std::collections::HashMap::new(),
            error_by_severity: std::collections::HashMap::new(),
            retried_operations: 0,
            skipped_operations: 0,
            aborted_operations: 0,
        }
    }

    pub fn record_error(&mut self, error: &CacheImportError) {
        self.total_errors += 1;

        let error_type = format!("{:?}", error)
            .split('(')
            .next()
            .unwrap_or("Unknown")
            .to_string();
        *self.error_by_type.entry(error_type).or_insert(0) += 1;

        let severity = format!("{:?}", error.severity());
        *self.error_by_severity.entry(severity).or_insert(0) += 1;
    }

    pub fn record_action(&mut self, action: &ImportAction) {
        match action {
            ImportAction::Retry => self.retried_operations += 1,
            ImportAction::Skip => self.skipped_operations += 1,
            ImportAction::Abort => self.aborted_operations += 1,
            ImportAction::Continue => {} // 不需要特别记录
        }
    }
}

impl Default for ErrorStatistics {
    fn default() -> Self {
        Self::new()
    }
}
