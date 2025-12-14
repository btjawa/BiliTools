//! 文件验证器
//!
//! 提供文件完整性校验功能，使用 SHA256 哈希算法。

use super::error::TransferError;
use sha2::{Digest, Sha256};
use std::path::Path;
use tokio::fs::File;
use tokio::io::AsyncReadExt;

/// 文件验证器
///
/// 提供文件哈希计算和完整性校验功能。
pub struct FileValidator;

impl FileValidator {
    /// 计算文件的 SHA256 哈希
    ///
    /// # 参数
    /// * `file_path` - 文件路径
    ///
    /// # 返回
    /// 返回十六进制格式的 SHA256 哈希值
    pub async fn calculate_hash(file_path: &Path) -> Result<String, TransferError> {
        let mut file = File::open(file_path)
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&file_path.to_string_lossy())))?;

        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 8192];

        loop {
            let n = file
                .read(&mut buffer)
                .await
                .map_err(|e| TransferError::from_io_error(e, Some(&file_path.to_string_lossy())))?;

            if n == 0 {
                break;
            }

            hasher.update(&buffer[..n]);
        }

        Ok(format!("{:x}", hasher.finalize()))
    }

    /// 验证文件的完整性
    ///
    /// # 参数
    /// * `file_path` - 文件路径
    /// * `expected_hash` - 期望的哈希值
    ///
    /// # 返回
    /// 如果哈希匹配返回 true，否则返回 false
    pub async fn verify_file(file_path: &Path, expected_hash: &str) -> Result<bool, TransferError> {
        let actual_hash = Self::calculate_hash(file_path).await?;
        Ok(actual_hash == expected_hash)
    }

    /// 计算文件的部分哈希（用于断点续传验证）
    ///
    /// # 参数
    /// * `file_path` - 文件路径
    /// * `offset` - 起始偏移量（字节）
    /// * `length` - 要计算的长度（字节）
    ///
    /// # 返回
    /// 返回十六进制格式的 SHA256 哈希值
    pub async fn calculate_partial_hash(
        file_path: &Path,
        offset: u64,
        length: u64,
    ) -> Result<String, TransferError> {
        let mut file = File::open(file_path)
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&file_path.to_string_lossy())))?;

        // 跳转到指定偏移量
        use tokio::io::AsyncSeekExt;
        file.seek(std::io::SeekFrom::Start(offset))
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&file_path.to_string_lossy())))?;

        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 8192];
        let mut remaining = length;

        loop {
            let to_read = std::cmp::min(remaining, buffer.len() as u64) as usize;
            if to_read == 0 {
                break;
            }

            let n = file
                .read(&mut buffer[..to_read])
                .await
                .map_err(|e| TransferError::from_io_error(e, Some(&file_path.to_string_lossy())))?;

            if n == 0 {
                break;
            }

            hasher.update(&buffer[..n]);
            remaining -= n as u64;
        }

        Ok(format!("{:x}", hasher.finalize()))
    }

    /// 快速验证文件是否完整（通过文件大小）
    ///
    /// # 参数
    /// * `file_path` - 文件路径
    /// * `expected_size` - 期望的文件大小
    ///
    /// # 返回
    /// 如果文件大小匹配返回 true，否则返回 false
    pub async fn verify_file_size(
        file_path: &Path,
        expected_size: u64,
    ) -> Result<bool, TransferError> {
        let metadata = tokio::fs::metadata(file_path)
            .await
            .map_err(|e| TransferError::from_io_error(e, Some(&file_path.to_string_lossy())))?;

        Ok(metadata.len() == expected_size)
    }
}
