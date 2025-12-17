//! 传输服务常量定义
//!
//! 定义传输过程中使用的各种常量，避免魔法数字。

/// 缓冲区大小常量
pub mod buffer_sizes {
    /// 默认文件复制缓冲区大小 (1MB)
    pub const DEFAULT_BUFFER_SIZE: usize = 1024 * 1024;

    /// 高性能文件复制缓冲区大小 (8MB)
    pub const HIGH_PERFORMANCE_BUFFER_SIZE: usize = 8 * 1024 * 1024;

    /// 可恢复传输缓冲区大小 (1MB)
    pub const RESUMABLE_BUFFER_SIZE: usize = 1024 * 1024;
}

/// 进度报告间隔常量
pub mod progress_intervals {
    /// 进度更新间隔 (5MB)
    pub const PROGRESS_UPDATE_INTERVAL: u64 = 5 * 1024 * 1024;

    /// 调试输出间隔 (50MB)
    pub const DEBUG_OUTPUT_INTERVAL: u64 = 50 * 1024 * 1024;

    /// 检查点保存间隔 (10MB)
    pub const CHECKPOINT_SAVE_INTERVAL: u64 = 10 * 1024 * 1024;
}

/// 缓冲区刷新常量
pub mod flush_intervals {
    /// 缓冲区刷新计数器阈值 (12次 * 8MB = 96MB)
    pub const FLUSH_COUNTER_THRESHOLD: usize = 12;
}

/// 单位转换常量
pub mod units {
    /// 字节转MB的除数
    pub const BYTES_TO_MB: u64 = 1024 * 1024;

    /// 字节转KB的除数
    pub const BYTES_TO_KB: u64 = 1024;
}

/// 时间间隔常量
pub mod timing {
    /// 暂停检查间隔 (100毫秒)
    pub const PAUSE_CHECK_INTERVAL_MS: u64 = 100;
}

/// Windows 驱动器类型常量
#[cfg(target_os = "windows")]
pub mod windows_drive_types {
    /// 未知驱动器类型
    pub const DRIVE_UNKNOWN: u32 = 0;
    /// 无根目录的驱动器
    pub const DRIVE_NO_ROOT_DIR: u32 = 1;
    /// 可移动驱动器
    pub const DRIVE_REMOVABLE: u32 = 2;
    /// 固定驱动器
    pub const DRIVE_FIXED: u32 = 3;
    /// 远程驱动器
    pub const DRIVE_REMOTE: u32 = 4;
    /// CD-ROM 驱动器
    pub const DRIVE_CDROM: u32 = 5;
    /// RAM 磁盘
    pub const DRIVE_RAMDISK: u32 = 6;
}

/// Windows 卷标缓冲区大小
#[cfg(target_os = "windows")]
pub mod windows_buffers {
    /// 卷标名称缓冲区大小
    pub const VOLUME_NAME_BUFFER_SIZE: usize = 261;
}

/// 驱动器字母范围
pub mod drive_letters {
    /// 驱动器字母数量 (A-Z)
    pub const DRIVE_LETTER_COUNT: usize = 26;
    /// 第一个驱动器字母 (A)
    pub const FIRST_DRIVE_LETTER: u8 = b'A';
}

/// 并发传输限制
pub mod concurrency {
    /// 最大并发传输数
    pub const MAX_CONCURRENT_TRANSFERS: usize = 3;
}
