use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::VecDeque;
use std::time::{Duration, Instant};
use time::OffsetDateTime;

/// 速度样本
#[derive(Clone, Debug)]
struct SpeedSample {
    /// 时间戳
    timestamp: Instant,
    /// 累计传输大小
    transferred_size: u64,
}

/// 滑动平均速度计算器
#[derive(Clone, Debug)]
pub struct SpeedCalculator {
    /// 速度样本队列
    samples: VecDeque<SpeedSample>,
    /// 时间窗口大小（秒）
    window_size: Duration,
    /// 最大样本数量
    max_samples: usize,
    /// 开始时间
    start_time: Option<Instant>,
}

impl SpeedCalculator {
    /// 创建新的速度计算器
    pub fn new() -> Self {
        const TIME_WINDOW_SECONDS: u64 = 10;
        const MAX_SAMPLES: usize = 50;
        
        Self {
            samples: VecDeque::new(),
            window_size: Duration::from_secs(TIME_WINDOW_SECONDS),
            max_samples: MAX_SAMPLES,
            start_time: None,
        }
    }

    /// 添加速度样本
    pub fn add_sample(&mut self, transferred_size: u64) {
        let now = Instant::now();

        // 设置开始时间
        if self.start_time.is_none() {
            self.start_time = Some(now);
        }

        // 添加新样本
        self.samples.push_back(SpeedSample {
            timestamp: now,
            transferred_size,
        });

        // 清理过期样本（超出时间窗口）
        let cutoff_time = now - self.window_size;
        while let Some(front) = self.samples.front() {
            if front.timestamp < cutoff_time {
                self.samples.pop_front();
            } else {
                break;
            }
        }

        // 限制样本数量
        while self.samples.len() > self.max_samples {
            self.samples.pop_front();
        }
    }

    /// 计算滑动平均速度（字节/秒）
    pub fn calculate_speed(&self) -> f64 {
        if self.samples.len() < 2 {
            return 0.0;
        }

        let first = &self.samples[0];
        let last = &self.samples[self.samples.len() - 1];

        let time_diff = last.timestamp.duration_since(first.timestamp).as_secs_f64();
        if time_diff <= 0.0 {
            return 0.0;
        }

        let size_diff = last.transferred_size.saturating_sub(first.transferred_size);
        size_diff as f64 / time_diff
    }

    /// 计算剩余时间（秒）
    pub fn calculate_remaining_time(&self, total_size: u64, transferred_size: u64) -> f64 {
        let speed = self.calculate_speed();
        if speed <= 0.0 || transferred_size >= total_size {
            return 0.0;
        }

        let remaining_size = total_size - transferred_size;
        remaining_size as f64 / speed
    }

    /// 重置计算器
    pub fn reset(&mut self) {
        self.samples.clear();
        self.start_time = None;
    }
}

impl Default for SpeedCalculator {
    fn default() -> Self {
        Self::new()
    }
}

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

/// 传输目标
#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct TransferTarget {
    /// 目标唯一标识符
    pub id: String,
    /// 目标名称
    pub name: String,
    /// 目标路径
    pub path: Option<String>,
    /// 可用空间（字节）
    pub available_space: Option<u64>,
}

/// 传输进度信息
#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct TransferProgress {
    /// 任务ID
    #[serde(rename = "taskId")]
    pub task_id: String,
    /// 总文件数
    #[serde(rename = "totalFiles")]
    pub total_files: usize,
    /// 已完成文件数
    #[serde(rename = "completedFiles")]
    pub completed_files: usize,
    /// 总大小（字节）
    #[serde(rename = "totalSize")]
    pub total_size: u64,
    /// 已传输大小（字节）
    #[serde(rename = "transferredSize")]
    pub transferred_size: u64,
    /// 传输速度（字节/秒）
    pub speed: f64,
    /// 预计剩余时间（秒）
    #[serde(rename = "remainingTime")]
    pub remaining_time: f64,
    /// 当前视频名称
    #[serde(rename = "currentVideoName")]
    pub current_video_name: String,
    /// 当前正在传输的文件路径
    #[serde(rename = "currentFile")]
    pub current_file: String,
    /// 任务状态
    pub status: TaskStatus,
    /// 速度样本收集器（不序列化到前端）
    #[serde(skip)]
    pub(crate) speed_calculator: SpeedCalculator,
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
            current_video_name: String::new(),
            current_file: String::new(),
            status: TaskStatus::Pending,
            speed_calculator: SpeedCalculator::new(),
        }
    }

    /// 更新传输进度并计算速度
    pub fn update_progress(&mut self, new_transferred_size: u64) {
        // 进度计算溢出保护：确保已传输大小不超过总大小
        self.transferred_size = new_transferred_size.min(self.total_size);

        // 添加速度样本
        self.speed_calculator.add_sample(self.transferred_size);

        // 计算滑动平均速度
        self.speed = self.speed_calculator.calculate_speed();

        // 计算剩余时间
        self.remaining_time = self
            .speed_calculator
            .calculate_remaining_time(self.total_size, self.transferred_size);

        // 确保速度和剩余时间的合理性
        if self.speed < 0.0 || !self.speed.is_finite() {
            self.speed = 0.0;
        }

        if self.remaining_time < 0.0 || !self.remaining_time.is_finite() {
            self.remaining_time = 0.0;
        }
    }

    /// 设置当前文件信息
    pub fn set_current_file(&mut self, video_name: String, file_path: String) {
        self.current_video_name = video_name;
        self.current_file = file_path;
    }

    /// 完成当前文件
    pub fn complete_file(&mut self) {
        // 文件计数管理完整性保护：确保已完成文件数不超过总文件数
        if self.completed_files < self.total_files {
            self.completed_files += 1;
        }
    }

    /// 计算完成百分比
    pub fn percentage(&self) -> f64 {
        if self.total_size == 0 {
            return 0.0;
        }
        const PERCENTAGE_MULTIPLIER: f64 = 100.0;
        (self.transferred_size as f64 / self.total_size as f64) * PERCENTAGE_MULTIPLIER
    }

    /// 重置速度计算器
    pub fn reset_speed_calculator(&mut self) {
        self.speed_calculator.reset();
    }

    /// 验证和修正进度数据的一致性
    pub fn validate_and_fix(&mut self) {
        // 确保已完成文件数不超过总文件数
        if self.completed_files > self.total_files {
            self.completed_files = self.total_files;
        }

        // 确保已传输大小不超过总大小
        if self.transferred_size > self.total_size {
            self.transferred_size = self.total_size;
        }

        // 确保速度和剩余时间的合理性
        if self.speed < 0.0 || !self.speed.is_finite() {
            self.speed = 0.0;
        }

        if self.remaining_time < 0.0 || !self.remaining_time.is_finite() {
            self.remaining_time = 0.0;
        }

        // 如果传输完成，确保进度为100%
        if self.status == TaskStatus::Completed {
            self.completed_files = self.total_files;
            self.transferred_size = self.total_size;
            self.speed = 0.0;
            self.remaining_time = 0.0;
        }
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
        total_files: usize,
    ) -> Self {
        let now = OffsetDateTime::now_utc().unix_timestamp();
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
    /// 目标缓存根目录
    pub target_root: String,
    /// 是否更新数据库
    pub update_database: bool,
}

/// 文件名冲突处理策略
#[derive(Clone, Debug, Serialize, Deserialize, Type, PartialEq, Eq, Default)]
pub enum ConflictStrategy {
    /// 跳过
    Skip,
    /// 覆盖
    Overwrite,
    /// 重命名（添加数字后缀）
    #[default]
    Rename,
    /// 询问用户
    Ask,
}
