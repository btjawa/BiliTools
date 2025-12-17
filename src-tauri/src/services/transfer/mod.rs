//! 传输模块
//!
//! 提供可扩展的文件传输功能，支持本地文件系统和移动存储设备的传输。
//!
//! # 模块结构
//!
//! - `error`: 传输错误类型定义
//! - `types`: 传输相关的数据类型
//! - `protocol`: 传输协议 trait 定义
//! - `local`: 本地文件传输协议实现
//! - `manager`: 传输管理器，负责任务队列和并发控制
//! - `validator`: 文件验证器，提供 SHA256 哈希校验

pub mod constants;
pub mod error;
pub mod filename;
pub mod local;
pub mod manager;
pub mod protocol;
pub mod types;
pub mod validator;

// 重新导出常用类型
pub use error::TransferError;
pub use filename::FilenameHandler;
pub use local::{
    calculate_directory_size, get_available_space, LocalFileProtocol,
};
pub use manager::TransferManager;
pub use protocol::{ProgressCallback, ProgressSender, TransferProtocol};
pub use types::{
    ConflictStrategy, RootMigrationRequest, TaskStatus, TransferOperation, TransferProgress,
    TransferRequest, TransferTarget, TransferTask,
};
pub use validator::FileValidator;
