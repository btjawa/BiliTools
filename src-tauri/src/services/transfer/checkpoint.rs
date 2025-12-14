//! 检查点管理器
//!
//! 管理传输检查点，支持断点续传功能。
//! 检查点存储在本地文件系统中，用于在传输中断后恢复。

use super::error::TransferError;
use super::types::TransferCheckpoint;
use std::path::PathBuf;
use tokio::fs;

/// 检查点管理器
///
/// 负责检查点的保存、加载和删除，支持断点续传功能。
pub struct CheckpointManager {
    /// 检查点存储目录
    checkpoint_dir: PathBuf,
}

impl CheckpointManager {
    /// 创建新的检查点管理器
    pub fn new(checkpoint_dir: PathBuf) -> Self {
        Self { checkpoint_dir }
    }

    /// 获取默认的检查点目录
    pub fn default_checkpoint_dir() -> Result<PathBuf, TransferError> {
        #[cfg(target_os = "windows")]
        {
            if let Ok(appdata) = std::env::var("APPDATA") {
                return Ok(PathBuf::from(appdata)
                    .join("com.btjawa.bilitools")
                    .join("checkpoints"));
            }
        }

        #[cfg(target_os = "macos")]
        {
            if let Some(home) = dirs::home_dir() {
                return Ok(
                    home.join("Library/Application Support/com.btjawa.bilitools/checkpoints")
                );
            }
        }

        #[cfg(target_os = "linux")]
        {
            if let Some(home) = dirs::home_dir() {
                return Ok(home.join(".local/share/com.btjawa.bilitools/checkpoints"));
            }
        }

        Err(TransferError::FileSystemError {
            message: "无法确定检查点目录".to_string(),
        })
    }

    /// 创建默认的检查点管理器
    pub async fn create_default() -> Result<Self, TransferError> {
        let checkpoint_dir = Self::default_checkpoint_dir()?;
        fs::create_dir_all(&checkpoint_dir).await.map_err(|e| {
            TransferError::from_io_error(e, Some(&checkpoint_dir.to_string_lossy()))
        })?;
        Ok(Self::new(checkpoint_dir))
    }

    /// 保存检查点
    pub async fn save_checkpoint(
        &self,
        checkpoint: &TransferCheckpoint,
    ) -> Result<(), TransferError> {
        // 确保目录存在
        fs::create_dir_all(&self.checkpoint_dir)
            .await
            .map_err(|e| {
                TransferError::from_io_error(e, Some(&self.checkpoint_dir.to_string_lossy()))
            })?;

        let checkpoint_file = self.get_checkpoint_path(&checkpoint.task_id);
        let json =
            serde_json::to_string_pretty(checkpoint).map_err(|e| TransferError::Unknown {
                message: format!("序列化检查点失败: {}", e),
            })?;

        fs::write(&checkpoint_file, json).await.map_err(|e| {
            TransferError::from_io_error(e, Some(&checkpoint_file.to_string_lossy()))
        })?;

        Ok(())
    }

    /// 加载检查点
    pub async fn load_checkpoint(
        &self,
        task_id: &str,
    ) -> Result<Option<TransferCheckpoint>, TransferError> {
        let checkpoint_file = self.get_checkpoint_path(task_id);

        if !checkpoint_file.exists() {
            return Ok(None);
        }

        let json = fs::read_to_string(&checkpoint_file).await.map_err(|e| {
            TransferError::from_io_error(e, Some(&checkpoint_file.to_string_lossy()))
        })?;

        let checkpoint =
            serde_json::from_str(&json).map_err(|_| TransferError::CheckpointCorrupted {
                task_id: task_id.to_string(),
            })?;

        Ok(Some(checkpoint))
    }

    /// 删除检查点
    pub async fn delete_checkpoint(&self, task_id: &str) -> Result<(), TransferError> {
        let checkpoint_file = self.get_checkpoint_path(task_id);

        if checkpoint_file.exists() {
            fs::remove_file(&checkpoint_file).await.map_err(|e| {
                TransferError::from_io_error(e, Some(&checkpoint_file.to_string_lossy()))
            })?;
        }

        Ok(())
    }

    /// 清理过期的检查点（超过7天）
    pub async fn cleanup_expired_checkpoints(&self) -> Result<(), TransferError> {
        if !self.checkpoint_dir.exists() {
            return Ok(());
        }

        let mut entries = fs::read_dir(&self.checkpoint_dir).await.map_err(|err| {
            TransferError::from_io_error(err, Some(&self.checkpoint_dir.to_string_lossy()))
        })?;

        let now = std::time::SystemTime::now();
        let seven_days = std::time::Duration::from_secs(7 * 24 * 60 * 60);

        while let Some(entry) = entries.next_entry().await.map_err(|err| {
            TransferError::from_io_error(err, Some(&self.checkpoint_dir.to_string_lossy()))
        })? {
            let path = entry.path();

            // 只处理 .json 文件
            if path.extension().map(|ext| ext == "json").unwrap_or(false) {
                if let Ok(metadata) = fs::metadata(&path).await {
                    if let Ok(modified) = metadata.modified() {
                        if let Ok(elapsed) = now.duration_since(modified) {
                            if elapsed > seven_days {
                                let _ = fs::remove_file(&path).await;
                            }
                        }
                    }
                }
            }
        }

        Ok(())
    }

    /// 获取检查点文件路径
    fn get_checkpoint_path(&self, task_id: &str) -> PathBuf {
        self.checkpoint_dir.join(format!("{}.json", task_id))
    }

    /// 获取所有检查点
    pub async fn get_all_checkpoints(&self) -> Result<Vec<TransferCheckpoint>, TransferError> {
        let mut checkpoints = Vec::new();

        if !self.checkpoint_dir.exists() {
            return Ok(checkpoints);
        }

        let mut entries = fs::read_dir(&self.checkpoint_dir).await.map_err(|err| {
            TransferError::from_io_error(err, Some(&self.checkpoint_dir.to_string_lossy()))
        })?;

        while let Some(entry) = entries.next_entry().await.map_err(|err| {
            TransferError::from_io_error(err, Some(&self.checkpoint_dir.to_string_lossy()))
        })? {
            let path = entry.path();

            if path.extension().map(|ext| ext == "json").unwrap_or(false) {
                if let Ok(json) = fs::read_to_string(&path).await {
                    if let Ok(checkpoint) = serde_json::from_str::<TransferCheckpoint>(&json) {
                        checkpoints.push(checkpoint);
                    }
                }
            }
        }

        Ok(checkpoints)
    }
}
