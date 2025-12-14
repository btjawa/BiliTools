use serde::{Deserialize, Serialize};
use specta::Type;
use time::OffsetDateTime;

/// 传输操作类型
#[derive(Clone, Debug, Serialize, Deserialize, Type, PartialEq, Eq)]
pub enum TransferOperation {
    /// 复制操作，保留原文件
    Copy,
    /// 剪切操作，移动文件并删除原文件
    Cut,
    /// 缓存根目录迁移
    RootMigration,
}

/// 传输任务状态
#[derive(Clone, Debug, Serialize, Deserialize, Type, PartialEq, Eq)]
pub enum TaskStatus {
    /// 等待中
    Pending,
    /// 运行中
    Running,
    /// 已暂停
    Paused,
    /// 已完成
    Completed,
    /// 失败
    Failed,
    /// 已取消
    Cancelled,
}

/// 设备类型
#[derive(Clone, Debug, Serialize, Deserialize, Type, PartialEq, Eq)]
pub enum DeviceType {
    /// 本地驱动器
    LocalDrive,
    /// 可移动存储设备（U盘、移动硬盘等）
    RemovableStorage,
}

/// 设备连接状态
#[derive(Clone, Debug, Serialize, Deserialize, Type, PartialEq, Eq)]
pub enum ConnectionStatus {
    /// 已连接
    Connected,
    /// 已断开
    Disconnected,
}


/// 设备信息
#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct DeviceInfo {
    /// 设备唯一标识符
    pub id: String,
    /// 设备名称
    pub name: String,
    /// 设备类型
    pub device_type: DeviceType,
    /// 可用空间（字节）
    pub available_space: Option<u64>,
    /// 总空间（字节）
    pub total_space: Option<u64>,
    /// 连接状态
    pub connection_status: ConnectionStatus,
}

/// 传输目标
#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct TransferTarget {
    /// 目标唯一标识符
    pub id: String,
    /// 目标名称
    pub name: String,
    /// 设备类型
    pub device_type: DeviceType,
    /// 目标路径
    pub path: Option<String>,
    /// 可用空间（字节）
    pub available_space: Option<u64>,
    /// 连接状态
    pub connection_status: ConnectionStatus,
}

/// 传输进度信息
#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct TransferProgress {
    /// 任务ID
    pub task_id: String,
    /// 总文件数
    pub total_files: usize,
    /// 已完成文件数
    pub completed_files: usize,
    /// 总大小（字节）
    pub total_size: u64,
    /// 已传输大小（字节）
    pub transferred_size: u64,
    /// 传输速度（字节/秒）
    pub speed: f64,
    /// 预计剩余时间（秒）
    pub remaining_time: f64,
    /// 当前正在传输的文件
    pub current_file: String,
    /// 任务状态
    pub status: TaskStatus,
}

impl TransferProgress {
    /// 创建新的进度实例
    pub fn new(task_id: String, total_files: usize, total_size: u64) -> Self {
        Self {
            task_id,
            total_files,
            completed_files: 0,
            total_size,
            transferred_size: 0,
            speed: 0.0,
            remaining_time: 0.0,
            current_file: String::new(),
            status: TaskStatus::Pending,
        }
    }

    /// 计算完成百分比
    pub fn percentage(&self) -> f64 {
        if self.total_size == 0 {
            return 0.0;
        }
        (self.transferred_size as f64 / self.total_size as f64) * 100.0
    }
}


/// 传输任务
#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct TransferTask {
    /// 任务唯一标识符
    pub id: String,
    /// 传输操作类型
    pub operation: TransferOperation,
    /// 源文件路径列表
    pub source_files: Vec<String>,
    /// 传输目标
    pub target: TransferTarget,
    /// 任务状态
    pub status: TaskStatus,
    /// 传输进度
    pub progress: TransferProgress,
    /// 创建时间（Unix时间戳）
    pub created_at: i64,
    /// 更新时间（Unix时间戳）
    pub updated_at: i64,
    /// 错误消息（如果失败）
    pub error_message: Option<String>,
}

impl TransferTask {
    /// 创建新的传输任务
    pub fn new(
        id: String,
        operation: TransferOperation,
        source_files: Vec<String>,
        target: TransferTarget,
        total_size: u64,
    ) -> Self {
        let now = OffsetDateTime::now_utc().unix_timestamp();
        let total_files = source_files.len();
        Self {
            id: id.clone(),
            operation,
            source_files,
            target,
            status: TaskStatus::Pending,
            progress: TransferProgress::new(id, total_files, total_size),
            created_at: now,
            updated_at: now,
            error_message: None,
        }
    }
}

/// 传输请求
#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct TransferRequest {
    /// 传输操作类型
    pub operation: TransferOperation,
    /// 源文件路径列表
    pub source_files: Vec<String>,
    /// 目标路径
    pub target_path: String,
    /// 文件名冲突处理策略
    pub conflict_strategy: ConflictStrategy,
}

/// 缓存根目录迁移请求
#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct RootMigrationRequest {
    /// 当前缓存根目录
    pub current_root: String,
    /// 目标缓存根目录
    pub target_root: String,
    /// 是否更新数据库
    pub update_database: bool,
}

/// 文件名冲突处理策略
#[derive(Clone, Debug, Serialize, Deserialize, Type, PartialEq, Eq)]
pub enum ConflictStrategy {
    /// 跳过
    Skip,
    /// 覆盖
    Overwrite,
    /// 重命名（添加数字后缀）
    Rename,
    /// 询问用户
    Ask,
}

impl Default for ConflictStrategy {
    fn default() -> Self {
        Self::Rename
    }
}


/// 检查点状态
#[derive(Clone, Debug, Serialize, Deserialize, Type, PartialEq, Eq)]
pub enum CheckpointStatus {
    /// 进行中
    InProgress,
    /// 已暂停
    Paused,
    /// 已完成
    Completed,
    /// 失败
    Failed,
}

/// 传输检查点（用于断点续传）
#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct TransferCheckpoint {
    /// 任务ID
    pub task_id: String,
    /// 源文件路径
    pub source_path: String,
    /// 目标文件路径
    pub target_path: String,
    /// 总大小（字节）
    pub total_size: u64,
    /// 已传输大小（字节）
    pub transferred_size: u64,
    /// 文件哈希（用于完整性校验）
    pub file_hash: String,
    /// 检查点状态
    pub status: CheckpointStatus,
    /// 创建时间（Unix时间戳）
    pub created_at: i64,
    /// 更新时间（Unix时间戳）
    pub updated_at: i64,
}

impl TransferCheckpoint {
    /// 创建新的检查点
    pub fn new(task_id: String, source_path: String, target_path: String, total_size: u64) -> Self {
        let now = OffsetDateTime::now_utc().unix_timestamp();
        Self {
            task_id,
            source_path,
            target_path,
            total_size,
            transferred_size: 0,
            file_hash: String::new(),
            status: CheckpointStatus::InProgress,
            created_at: now,
            updated_at: now,
        }
    }

    /// 更新传输进度
    pub fn update_progress(&mut self, transferred_size: u64) {
        self.transferred_size = transferred_size;
        self.updated_at = OffsetDateTime::now_utc().unix_timestamp();
    }

    /// 标记为完成
    pub fn mark_completed(&mut self, file_hash: String) {
        self.file_hash = file_hash;
        self.status = CheckpointStatus::Completed;
        self.updated_at = OffsetDateTime::now_utc().unix_timestamp();
    }

    /// 标记为失败
    pub fn mark_failed(&mut self) {
        self.status = CheckpointStatus::Failed;
        self.updated_at = OffsetDateTime::now_utc().unix_timestamp();
    }
}


