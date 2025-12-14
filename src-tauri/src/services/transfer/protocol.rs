use super::error::TransferError;
use super::types::{TransferProgress, TransferTarget};
use std::path::Path;
use std::sync::Arc;
use tokio::sync::mpsc;

/// 进度回调类型
pub type ProgressCallback = Arc<dyn Fn(TransferProgress) + Send + Sync>;

/// 进度发送器类型
pub type ProgressSender = mpsc::Sender<TransferProgress>;

/// 传输协议 trait
/// 
/// 定义了传输协议的标准接口，支持插件式扩展不同的传输协议实现。
/// 所有传输协议实现都必须实现此 trait。
#[async_trait::async_trait]
pub trait TransferProtocol: Send + Sync {
    /// 获取协议名称
    fn name(&self) -> &str;

    /// 获取协议描述
    fn description(&self) -> &str;

    /// 发现可用的传输目标
    /// 
    /// 扫描并返回所有可用的传输目标设备或位置。
    async fn discover_targets(&self) -> Result<Vec<TransferTarget>, TransferError>;

    /// 验证传输目标是否有效
    /// 
    /// 检查目标路径是否存在、是否可写等。
    async fn validate_target(&self, target: &TransferTarget) -> Result<bool, TransferError>;

    /// 检查目标空间是否足够
    /// 
    /// 检查目标设备是否有足够的空间存储指定大小的文件。
    async fn check_space(
        &self,
        target: &TransferTarget,
        required_size: u64,
    ) -> Result<bool, TransferError>;

    /// 传输单个文件
    /// 
    /// 将源文件传输到目标位置，通过进度发送器报告传输进度。
    async fn transfer_file(
        &self,
        source: &Path,
        target: &TransferTarget,
        target_filename: &str,
        progress_sender: Option<ProgressSender>,
    ) -> Result<(), TransferError>;

    /// 传输目录
    /// 
    /// 将整个目录及其内容传输到目标位置。
    async fn transfer_directory(
        &self,
        source: &Path,
        target: &TransferTarget,
        target_dirname: &str,
        progress_sender: Option<ProgressSender>,
    ) -> Result<(), TransferError>;

    /// 取消传输
    /// 
    /// 取消正在进行的传输操作。
    async fn cancel_transfer(&self, task_id: &str) -> Result<(), TransferError>;

    /// 暂停传输
    /// 
    /// 暂停正在进行的传输操作。
    async fn pause_transfer(&self, task_id: &str) -> Result<(), TransferError>;

    /// 恢复传输
    /// 
    /// 恢复已暂停的传输操作。
    async fn resume_transfer(&self, task_id: &str) -> Result<(), TransferError>;

    /// 检查是否支持断点续传
    fn supports_resume(&self) -> bool {
        false
    }

    /// 检查是否支持并发传输
    fn supports_concurrent(&self) -> bool {
        true
    }

    /// 获取最大并发传输数
    fn max_concurrent_transfers(&self) -> usize {
        3
    }
}
