//! 可恢复的文件传输
//!
//! 实现断点续传功能，支持从中断点恢复传输。

use super::checkpoint::CheckpointManager;
use super::error::TransferError;
use super::protocol::ProgressSender;
use super::types::{CheckpointStatus, TransferCheckpoint, TransferProgress};
use super::validator::FileValidator;
use std::path::Path;
use tokio::fs::File;
use tokio::io::{AsyncReadExt, AsyncSeekExt, AsyncWriteExt};
use time::OffsetDateTime;

/// 可恢复的文件传输
pub struct ResumableTransfer;

impl ResumableTransfer {
    /// 执行可恢复的文件传输
    ///
    /// # 参数
    /// * `source` - 源文件路径
    /// * `target` - 目标文件路径
    /// * `checkpoint_mgr` - 检查点管理器
    /// * `task_id` - 任务ID
    /// * `progress_sender` - 进度发送器
    ///
    /// # 返回
    /// 传输成功返回 Ok(())，失败返回错误
    pub async fn transfer_with_resume(
        source: &Path,
        target: &Path,
        checkpoint_mgr: &CheckpointManager,
        task_id: &str,
        progress_sender: Option<ProgressSender>,
    ) -> Result<(), TransferError> {
        // 1. 尝试加载已有的检查点
        let mut checkpoint = match checkpoint_mgr.load_checkpoint(task_id).await? {
            Some(cp) => cp,
            None => {
                // 创建新的检查点
                let source_metadata = tokio::fs::metadata(source)
                    .await
                    .map_err(|e| TransferError::from_io_error(e, Some(&source.to_string_lossy())))?;

                TransferCheckpoint::new(
                    task_id.to_string(),
                    source.to_string_lossy().to_string(),
                    target.to_string_lossy().to_string(),
                    source_metadata.len(),
                )
            }
        };

        // 2. 验证源文件是否存在且未改变
        let source_metadata = tokio::fs::metadata(source)
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&source.to_string_lossy())))?;

        if source_metadata.len() != checkpoint.total_size {
            // 源文件大小已改变，重新开始传输
            checkpoint.transferred_size = 0;
            checkpoint.status = CheckpointStatus::InProgress;
            if target.exists() {
                tokio::fs::remove_file(target)
                    .await
                    .map_err(|e| TransferError::from_io_error(e, Some(&target.to_string_lossy())))?;
            }
        }

        // 3. 验证目标文件的完整性
        if checkpoint.transferred_size > 0 && target.exists() {
            let target_metadata = tokio::fs::metadata(target)
                .await
                .map_err(|e| TransferError::from_io_error(e, Some(&target.to_string_lossy())))?;

            let target_size = target_metadata.len();

            if target_size > checkpoint.transferred_size {
                // 目标文件已超过检查点，可能是其他进程修改，重新开始
                checkpoint.transferred_size = 0;
                checkpoint.status = CheckpointStatus::InProgress;
                tokio::fs::remove_file(target)
                    .await
                    .map_err(|e| TransferError::from_io_error(e, Some(&target.to_string_lossy())))?;
            } else if target_size < checkpoint.transferred_size {
                // 目标文件被截断，需要验证已传输部分的完整性
                // 这里简单起见，重新开始传输
                checkpoint.transferred_size = 0;
                checkpoint.status = CheckpointStatus::InProgress;
                tokio::fs::remove_file(target)
                    .await
                    .map_err(|e| TransferError::from_io_error(e, Some(&target.to_string_lossy())))?;
            }
        }

        // 4. 从断点继续传输
        let mut source_file = File::open(source)
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&source.to_string_lossy())))?;

        // 跳转到已传输的位置
        if checkpoint.transferred_size > 0 {
            source_file
                .seek(std::io::SeekFrom::Start(checkpoint.transferred_size))
                .await
                .map_err(|e| TransferError::from_io_error(e, Some(&source.to_string_lossy())))?;
        }

        let mut target_file = if checkpoint.transferred_size > 0 {
            // 追加模式打开
            tokio::fs::OpenOptions::new()
                .write(true)
                .append(true)
                .open(target)
                .await
                .map_err(|e| TransferError::from_io_error(e, Some(&target.to_string_lossy())))?
        } else {
            // 创建新文件
            File::create(target)
                .await
                .map_err(|e| TransferError::from_io_error(e, Some(&target.to_string_lossy())))?
        };

        // 5. 执行传输
        let mut buffer = vec![0u8; 1024 * 1024]; // 1MB 缓冲区
        let mut transferred = checkpoint.transferred_size;
        let start_time = std::time::Instant::now();
        let checkpoint_interval = 10 * 1024 * 1024; // 每 10MB 保存一次检查点

        loop {
            let n = source_file
                .read(&mut buffer)
                .await
                .map_err(|e| TransferError::from_io_error(e, Some(&source.to_string_lossy())))?;

            if n == 0 {
                break;
            }

            target_file
                .write_all(&buffer[..n])
                .await
                .map_err(|e| TransferError::from_io_error(e, Some(&target.to_string_lossy())))?;

            transferred += n as u64;

            // 定期保存检查点
            if transferred % checkpoint_interval == 0 || transferred == checkpoint.total_size {
                checkpoint.transferred_size = transferred;
                checkpoint.updated_at = OffsetDateTime::now_utc().unix_timestamp();
                checkpoint_mgr.save_checkpoint(&checkpoint).await?;
            }

            // 发送进度更新
            if let Some(ref sender) = progress_sender {
                let elapsed = start_time.elapsed().as_secs_f64();
                let speed = if elapsed > 0.0 {
                    transferred as f64 / elapsed
                } else {
                    0.0
                };

                let remaining_bytes = checkpoint.total_size - transferred;
                let remaining_time = if speed > 0.0 {
                    remaining_bytes as f64 / speed
                } else {
                    0.0
                };

                let progress = TransferProgress {
                    task_id: task_id.to_string(),
                    total_files: 1,
                    completed_files: if transferred == checkpoint.total_size { 1 } else { 0 },
                    total_size: checkpoint.total_size,
                    transferred_size: transferred,
                    speed,
                    remaining_time,
                    current_file: source.to_string_lossy().to_string(),
                    status: super::types::TaskStatus::Running,
                };

                let _ = sender.send(progress).await;
            }
        }

        // 6. 确保数据写入磁盘
        target_file
            .flush()
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&target.to_string_lossy())))?;

        // 7. 计算最终哈希并保存
        let file_hash = FileValidator::calculate_hash(target).await?;
        checkpoint.file_hash = file_hash;
        checkpoint.transferred_size = checkpoint.total_size;
        checkpoint.status = CheckpointStatus::Completed;
        checkpoint.updated_at = OffsetDateTime::now_utc().unix_timestamp();
        checkpoint_mgr.save_checkpoint(&checkpoint).await?;

        Ok(())
    }

    /// 恢复传输
    ///
    /// # 参数
    /// * `task_id` - 任务ID
    /// * `checkpoint_mgr` - 检查点管理器
    /// * `progress_sender` - 进度发送器
    ///
    /// # 返回
    /// 传输成功返回 Ok(())，失败返回错误
    pub async fn resume_transfer(
        task_id: &str,
        checkpoint_mgr: &CheckpointManager,
        progress_sender: Option<ProgressSender>,
    ) -> Result<(), TransferError> {
        let checkpoint = checkpoint_mgr
            .load_checkpoint(task_id)
            .await?
            .ok_or_else(|| TransferError::TaskNotFound {
                task_id: task_id.to_string(),
            })?;

        Self::transfer_with_resume(
            Path::new(&checkpoint.source_path),
            Path::new(&checkpoint.target_path),
            checkpoint_mgr,
            task_id,
            progress_sender,
        )
        .await
    }

    /// 清理检查点
    ///
    /// # 参数
    /// * `task_id` - 任务ID
    /// * `checkpoint_mgr` - 检查点管理器
    ///
    /// # 返回
    /// 清理成功返回 Ok(())，失败返回错误
    pub async fn cleanup_checkpoint(
        task_id: &str,
        checkpoint_mgr: &CheckpointManager,
    ) -> Result<(), TransferError> {
        checkpoint_mgr.delete_checkpoint(task_id).await
    }

    /// 暂停传输
    ///
    /// # 参数
    /// * `task_id` - 任务ID
    /// * `checkpoint_mgr` - 检查点管理器
    ///
    /// # 返回
    /// 暂停成功返回 Ok(())，失败返回错误
    pub async fn pause_transfer(
        task_id: &str,
        checkpoint_mgr: &CheckpointManager,
    ) -> Result<(), TransferError> {
        let mut checkpoint = checkpoint_mgr
            .load_checkpoint(task_id)
            .await?
            .ok_or_else(|| TransferError::TaskNotFound {
                task_id: task_id.to_string(),
            })?;

        checkpoint.status = CheckpointStatus::Paused;
        checkpoint.updated_at = OffsetDateTime::now_utc().unix_timestamp();
        checkpoint_mgr.save_checkpoint(&checkpoint).await?;

        Ok(())
    }

    /// 取消传输
    ///
    /// # 参数
    /// * `task_id` - 任务ID
    /// * `checkpoint_mgr` - 检查点管理器
    /// * `delete_target` - 是否删除目标文件
    ///
    /// # 返回
    /// 取消成功返回 Ok(())，失败返回错误
    pub async fn cancel_transfer(
        task_id: &str,
        checkpoint_mgr: &CheckpointManager,
        delete_target: bool,
    ) -> Result<(), TransferError> {
        let checkpoint = checkpoint_mgr
            .load_checkpoint(task_id)
            .await?
            .ok_or_else(|| TransferError::TaskNotFound {
                task_id: task_id.to_string(),
            })?;

        // 删除目标文件（如果需要）
        if delete_target {
            let target_path = Path::new(&checkpoint.target_path);
            if target_path.exists() {
                tokio::fs::remove_file(target_path)
                    .await
                    .map_err(|e| TransferError::from_io_error(e, Some(&checkpoint.target_path)))?;
            }
        }

        // 删除检查点
        checkpoint_mgr.delete_checkpoint(task_id).await?;

        Ok(())
    }
}
