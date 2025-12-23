use anyhow::Result;
use serde::{Deserialize, Serialize};
use specta::Type;
use std::path::{Path, PathBuf};

/// 验证结果
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub has_video_info: bool,
    pub has_media_files: bool,
    pub file_size_match: bool,
    pub size_difference: i64,
    pub errors: Vec<String>,
}

/// 文件完整性验证服务
#[derive(Debug, Clone)]
pub struct ValidatorService;

impl ValidatorService {
    /// 创建新的验证服务实例
    pub fn new() -> Self {
        Self
    }

    /// 验证缓存目录的完整性
    ///
    /// # 参数
    /// * `dir_path` - 缓存目录路径
    ///
    /// # 返回
    /// * `Result<ValidationResult>` - 验证结果
    pub async fn validate_cache_directory(&self, dir_path: &PathBuf) -> Result<ValidationResult> {
        let mut errors = Vec::new();

        // 检查目录是否存在
        if !dir_path.exists() || !dir_path.is_dir() {
            return Ok(ValidationResult {
                is_valid: false,
                has_video_info: false,
                has_media_files: false,
                file_size_match: false,
                size_difference: 0,
                errors: vec![format!("目录不存在或不是有效目录: {:?}", dir_path)],
            });
        }

        // 检查必需文件
        let has_video_info = self.check_video_info_file(dir_path, &mut errors).await;
        let (has_media_files, media_files) = self.check_media_files(dir_path, &mut errors).await;

        // 验证文件大小（如果videoInfo.json存在）
        let (file_size_match, size_difference) = if has_video_info {
            self.verify_file_sizes(dir_path, &media_files, &mut errors)
                .await
        } else {
            (false, 0)
        };

        let is_valid = has_video_info && has_media_files && errors.is_empty();

        Ok(ValidationResult {
            is_valid,
            has_video_info,
            has_media_files,
            file_size_match,
            size_difference,
            errors,
        })
    }

    /// 检查videoInfo.json文件是否存在
    async fn check_video_info_file(&self, dir_path: &Path, errors: &mut Vec<String>) -> bool {
        let video_info_path = dir_path.join("videoInfo.json");

        if !video_info_path.exists() {
            errors.push("缺少videoInfo.json文件".to_string());
            return false;
        }

        if !video_info_path.is_file() {
            errors.push("videoInfo.json不是有效文件".to_string());
            return false;
        }

        // 检查文件是否可读
        match tokio::fs::metadata(&video_info_path).await {
            Ok(metadata) => {
                if metadata.len() == 0 {
                    errors.push("videoInfo.json文件为空".to_string());
                    false
                } else {
                    true
                }
            }
            Err(e) => {
                errors.push(format!("无法读取videoInfo.json文件: {}", e));
                false
            }
        }
    }

    /// 检查媒体文件是否存在
    async fn check_media_files(
        &self,
        dir_path: &PathBuf,
        errors: &mut Vec<String>,
    ) -> (bool, Vec<PathBuf>) {
        let mut media_files = Vec::new();

        match tokio::fs::read_dir(dir_path).await {
            Ok(mut entries) => {
                while let Ok(Some(entry)) = entries.next_entry().await {
                    let path = entry.path();
                    if let Some(extension) = path.extension() {
                        if extension == "m4s" || extension == "mp4" || extension == "flv" {
                            media_files.push(path);
                        }
                    }
                }
            }
            Err(e) => {
                errors.push(format!("无法读取目录内容: {}", e));
                return (false, media_files);
            }
        }

        if media_files.is_empty() {
            errors.push("未找到媒体文件（.m4s, .mp4, .flv）".to_string());
            (false, media_files)
        } else {
            (true, media_files)
        }
    }

    /// 验证文件大小是否匹配
    async fn verify_file_sizes(
        &self,
        dir_path: &Path,
        media_files: &[PathBuf],
        errors: &mut Vec<String>,
    ) -> (bool, i64) {
        // 读取videoInfo.json获取期望大小
        let video_info_path = dir_path.join("videoInfo.json");
        let expected_size = match self.get_expected_size(&video_info_path).await {
            Ok(size) => size,
            Err(e) => {
                errors.push(format!("无法从videoInfo.json获取文件大小: {}", e));
                return (false, 0);
            }
        };

        // 计算实际文件大小
        let mut actual_size = 0u64;
        for file_path in media_files {
            match tokio::fs::metadata(file_path).await {
                Ok(metadata) => {
                    actual_size += metadata.len();
                }
                Err(e) => {
                    errors.push(format!("无法获取文件大小 {:?}: {}", file_path, e));
                }
            }
        }

        let size_difference = actual_size as i64 - expected_size as i64;
        let size_difference_abs = size_difference.abs() as u64;

        // 使用百分比容差：允许 1% 的差异，最小 1MB
        let percentage_tolerance = (expected_size as f64 * 0.01) as u64;
        let min_tolerance: u64 = 1024 * 1024; // 1MB
        let max_allowed_difference = percentage_tolerance.max(min_tolerance);

        if size_difference_abs > max_allowed_difference {
            errors.push(format!(
                "文件大小不匹配，期望: {} bytes, 实际: {} bytes, 差异: {} bytes (容差: {} bytes)",
                expected_size, actual_size, size_difference, max_allowed_difference
            ));
            (false, size_difference)
        } else {
            (true, size_difference)
        }
    }

    /// 从videoInfo.json获取期望的文件大小
    async fn get_expected_size(&self, video_info_path: &PathBuf) -> Result<u64> {
        let content = tokio::fs::read_to_string(video_info_path).await?;
        let json_value: serde_json::Value = serde_json::from_str(&content)?;

        let obj = json_value
            .as_object()
            .ok_or_else(|| anyhow::anyhow!("JSON根节点不是对象"))?;

        // 尝试多个可能的字段名
        let size = obj
            .get("totalSize")
            .or_else(|| obj.get("total_size"))
            .or_else(|| obj.get("size"))
            .and_then(|v| {
                v.as_u64()
                    .or_else(|| v.as_str().and_then(|s| s.parse().ok()))
                    .or_else(|| {
                        v.as_i64()
                            .and_then(|i| if i >= 0 { Some(i as u64) } else { None })
                    })
            })
            .unwrap_or(0);

        Ok(size)
    }

    /// 检查必需文件是否存在（简化版本）
    pub async fn check_required_files(&self, dir_path: &PathBuf) -> Result<bool> {
        let video_info_exists = dir_path.join("videoInfo.json").exists();

        if !video_info_exists {
            return Ok(false);
        }

        // 检查是否有媒体文件
        let mut has_media = false;
        if let Ok(mut entries) = tokio::fs::read_dir(dir_path).await {
            while let Ok(Some(entry)) = entries.next_entry().await {
                let path = entry.path();
                if let Some(extension) = path.extension() {
                    if extension == "m4s" || extension == "mp4" || extension == "flv" {
                        has_media = true;
                        break;
                    }
                }
            }
        }

        Ok(has_media)
    }

    /// 验证文件大小是否匹配（简化版本）
    pub async fn verify_file_sizes_simple(
        &self,
        dir_path: &PathBuf,
        expected_size: u64,
    ) -> Result<bool> {
        let mut actual_size = 0u64;

        if let Ok(mut entries) = tokio::fs::read_dir(dir_path).await {
            while let Ok(Some(entry)) = entries.next_entry().await {
                let path = entry.path();
                if let Some(extension) = path.extension() {
                    if extension == "m4s" || extension == "mp4" || extension == "flv" {
                        if let Ok(metadata) = tokio::fs::metadata(&path).await {
                            actual_size += metadata.len();
                        }
                    }
                }
            }
        }

        let difference = (actual_size as i64 - expected_size as i64).abs() as u64;
        // 使用百分比容差：允许 1% 的差异，最小 1MB
        let percentage_tolerance = (expected_size as f64 * 0.01) as u64;
        let min_tolerance: u64 = 1024 * 1024; // 1MB
        let max_allowed_difference = percentage_tolerance.max(min_tolerance);

        Ok(difference <= max_allowed_difference)
    }
}

impl Default for ValidatorService {
    fn default() -> Self {
        Self::new()
    }
}
