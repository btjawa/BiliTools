//! M4s 文件处理器
//!
//! 处理B站缓存的m4s文件，移除特殊头部标记。

use std::path::Path;
use tokio::fs::File;
use tokio::io::{AsyncReadExt, AsyncSeekExt, AsyncWriteExt, BufReader, BufWriter, SeekFrom};

use super::ConvertError;

/// B站m4s文件头部标记长度（9字节）
const BILIBILI_HEADER_LENGTH: usize = 9;

/// B站m4s文件头部标记（ASCII '0' = 0x30）
/// B站缓存的m4s文件开头是 "000000000"（9个ASCII字符'0'）
const BILIBILI_HEADER_MARKER: u8 = 0x30; // ASCII '0'

/// 流式处理缓冲区大小（64KB）
const BUFFER_SIZE: usize = 64 * 1024;

/// M4s 文件处理器
pub struct M4sProcessor;

impl M4sProcessor {
    /// 检查文件是否包含B站特殊头部标记
    ///
    /// B站m4s文件开头有9个字节的特殊标记（ASCII "000000000"，即9个0x30），
    /// 需要在转换前移除。
    ///
    /// # 参数
    /// - `path`: m4s文件路径
    ///
    /// # 返回
    /// - `Ok(true)`: 文件包含B站头部标记
    /// - `Ok(false)`: 文件不包含B站头部标记
    /// - `Err`: 读取文件失败
    pub async fn has_bilibili_header(path: &Path) -> Result<bool, ConvertError> {
        let mut file = File::open(path).await.map_err(|e| {
            ConvertError::from_io_error(e, Some(path.to_string_lossy().as_ref()))
        })?;

        let mut header = [0u8; BILIBILI_HEADER_LENGTH];
        let bytes_read = file.read(&mut header).await.map_err(|e| {
            ConvertError::from_io_error(e, Some(path.to_string_lossy().as_ref()))
        })?;

        // 文件太小，不可能包含有效内容
        if bytes_read < BILIBILI_HEADER_LENGTH {
            return Ok(false);
        }

        // 检查是否全为 ASCII '0' (0x30)
        // B站缓存文件头部是 "000000000"
        Ok(header.iter().all(|&b| b == BILIBILI_HEADER_MARKER))
    }

    /// 处理m4s文件，移除头部标记并写入输出文件
    ///
    /// 使用流式处理避免大文件占用过多内存。
    /// 如果文件包含B站头部标记，则跳过前9字节；
    /// 否则直接复制原始内容。
    ///
    /// # 参数
    /// - `input`: 输入m4s文件路径
    /// - `output`: 输出文件路径
    /// - `progress_callback`: 进度回调函数，参数为 (已处理字节数, 总字节数)
    ///
    /// # 返回
    /// - `Ok(())`: 处理成功
    /// - `Err`: 处理失败
    pub async fn process_file<F>(
        input: &Path,
        output: &Path,
        progress_callback: F,
    ) -> Result<(), ConvertError>
    where
        F: Fn(u64, u64),
    {
        let input_file = File::open(input).await.map_err(|e| {
            ConvertError::from_io_error(e, Some(input.to_string_lossy().as_ref()))
        })?;

        let file_size = input_file.metadata().await.map_err(|e| {
            ConvertError::from_io_error(e, Some(input.to_string_lossy().as_ref()))
        })?.len();

        // 检查是否包含B站头部标记
        let has_header = Self::has_bilibili_header(input).await?;
        let skip_bytes = if has_header { BILIBILI_HEADER_LENGTH as u64 } else { 0 };

        // 重新打开文件并跳过头部
        let mut input_file = File::open(input).await.map_err(|e| {
            ConvertError::from_io_error(e, Some(input.to_string_lossy().as_ref()))
        })?;

        if skip_bytes > 0 {
            input_file.seek(SeekFrom::Start(skip_bytes)).await.map_err(|e| {
                ConvertError::from_io_error(e, Some(input.to_string_lossy().as_ref()))
            })?;
        }

        // 创建输出文件
        let output_file = File::create(output).await.map_err(|e| {
            ConvertError::from_io_error(e, Some(output.to_string_lossy().as_ref()))
        })?;

        let mut reader = BufReader::with_capacity(BUFFER_SIZE, input_file);
        let mut writer = BufWriter::with_capacity(BUFFER_SIZE, output_file);

        let mut buffer = vec![0u8; BUFFER_SIZE];
        let mut processed: u64 = skip_bytes;
        let total = file_size;

        // 流式复制
        loop {
            let bytes_read = reader.read(&mut buffer).await.map_err(|e| {
                ConvertError::M4sProcessingFailed {
                    reason: format!("读取文件失败: {}", e),
                }
            })?;

            if bytes_read == 0 {
                break;
            }

            writer.write_all(&buffer[..bytes_read]).await.map_err(|e| {
                ConvertError::M4sProcessingFailed {
                    reason: format!("写入文件失败: {}", e),
                }
            })?;

            processed += bytes_read as u64;
            progress_callback(processed, total);
        }

        // 确保所有数据写入磁盘
        writer.flush().await.map_err(|e| {
            ConvertError::M4sProcessingFailed {
                reason: format!("刷新缓冲区失败: {}", e),
            }
        })?;

        Ok(())
    }

    /// 验证处理后文件的完整性
    ///
    /// 检查输出文件是否为有效的媒体文件。
    /// 通过检查文件头部的 ftyp box 来验证。
    ///
    /// # 参数
    /// - `path`: 输出文件路径
    ///
    /// # 返回
    /// - `Ok(true)`: 文件有效
    /// - `Ok(false)`: 文件无效
    /// - `Err`: 读取文件失败
    pub async fn validate_output(path: &Path) -> Result<bool, ConvertError> {
        let mut file = File::open(path).await.map_err(|e| {
            ConvertError::from_io_error(e, Some(path.to_string_lossy().as_ref()))
        })?;

        // 读取前12字节检查 ftyp box
        // MP4/M4S 文件结构: [4字节大小][4字节类型][4字节品牌]
        let mut header = [0u8; 12];
        let bytes_read = file.read(&mut header).await.map_err(|e| {
            ConvertError::from_io_error(e, Some(path.to_string_lossy().as_ref()))
        })?;

        if bytes_read < 12 {
            return Ok(false);
        }

        // 检查是否为 ftyp box（MP4容器格式标识）
        // 或者 moof/mdat box（分片媒体格式）
        let box_type = &header[4..8];
        let is_valid = box_type == b"ftyp"
            || box_type == b"moof"
            || box_type == b"mdat"
            || box_type == b"moov"
            || box_type == b"styp";  // 分片类型

        Ok(is_valid)
    }

    /// 获取文件大小（不包含B站头部标记）
    ///
    /// # 参数
    /// - `path`: m4s文件路径
    ///
    /// # 返回
    /// - `Ok(size)`: 实际内容大小
    /// - `Err`: 读取文件失败
    pub async fn get_content_size(path: &Path) -> Result<u64, ConvertError> {
        let metadata = tokio::fs::metadata(path).await.map_err(|e| {
            ConvertError::from_io_error(e, Some(path.to_string_lossy().as_ref()))
        })?;

        let file_size = metadata.len();
        let has_header = Self::has_bilibili_header(path).await?;

        if has_header && file_size > BILIBILI_HEADER_LENGTH as u64 {
            Ok(file_size - BILIBILI_HEADER_LENGTH as u64)
        } else {
            Ok(file_size)
        }
    }
}
