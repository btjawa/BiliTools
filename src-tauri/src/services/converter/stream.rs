//! 流识别器
//!
//! 从缓存目录中识别音视频流文件。
//! 优先级：.playurl > entry.json > 文件大小推断

use serde::{Deserialize, Serialize};
use specta::Type;
use std::path::{Path, PathBuf};
use tokio::fs;

use super::ConvertError;

/// 流信息
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct StreamInfo {
    /// 视频流文件路径
    pub video_path: PathBuf,
    /// 音频流文件路径
    pub audio_path: PathBuf,
    /// 视频流ID
    pub video_id: String,
    /// 音频流ID
    pub audio_id: String,
}

/// 流识别器
pub struct StreamIdentifier;

impl StreamIdentifier {
    /// 从缓存目录识别音视频流
    ///
    /// 优先级：.playurl > entry.json > 文件大小推断
    ///
    /// # 参数
    /// - `cache_dir`: 缓存目录路径
    ///
    /// # 返回
    /// - `Ok(StreamInfo)`: 识别成功
    /// - `Err`: 识别失败
    pub async fn identify(cache_dir: &Path) -> Result<StreamInfo, ConvertError> {
        // 检查目录是否存在
        if !cache_dir.exists() {
            return Err(ConvertError::CacheNotFound {
                path: cache_dir.to_string_lossy().to_string(),
            });
        }

        // 按优先级尝试识别
        // 1. 从 .playurl 文件读取
        if let Some(info) = Self::from_playurl(cache_dir).await? {
            return Ok(info);
        }

        // 2. 从 entry.json 文件读取（Android模式）
        if let Some(info) = Self::from_entry_json(cache_dir).await? {
            return Ok(info);
        }

        // 3. 根据文件大小推断
        Self::from_file_size(cache_dir).await
    }

    /// 从 .playurl 文件读取流ID
    ///
    /// .playurl 文件是 Windows 客户端缓存的配置文件，
    /// 包含视频和音频流的ID信息。
    async fn from_playurl(cache_dir: &Path) -> Result<Option<StreamInfo>, ConvertError> {
        let playurl_path = cache_dir.join(".playurl");

        if !playurl_path.exists() {
            return Ok(None);
        }

        let content = fs::read_to_string(&playurl_path).await.map_err(|e| {
            ConvertError::from_io_error(e, Some(playurl_path.to_string_lossy().as_ref()))
        })?;

        // 解析 .playurl 文件（JSON格式）
        let playurl: PlayUrlFile = serde_json::from_str(&content).map_err(|e| {
            ConvertError::StreamIdentificationFailed {
                reason: format!("解析 .playurl 文件失败: {}", e),
            }
        })?;

        // 提取视频和音频流ID
        let video_id = playurl
            .video
            .as_ref()
            .and_then(|v| v.first())
            .map(|v| v.id.to_string());

        let audio_id = playurl
            .audio
            .as_ref()
            .and_then(|a| a.first())
            .map(|a| a.id.to_string());

        match (video_id, audio_id) {
            (Some(vid), Some(aid)) => {
                // 查找对应的 m4s 文件
                let (video_path, audio_path) =
                    Self::find_m4s_files_by_id(cache_dir, &vid, &aid).await?;

                Ok(Some(StreamInfo {
                    video_path,
                    audio_path,
                    video_id: vid,
                    audio_id: aid,
                }))
            }
            _ => Ok(None),
        }
    }

    /// 从 entry.json 文件读取流ID（Android模式）
    ///
    /// entry.json 是 Android 客户端缓存的配置文件。
    async fn from_entry_json(cache_dir: &Path) -> Result<Option<StreamInfo>, ConvertError> {
        let entry_path = cache_dir.join("entry.json");

        if !entry_path.exists() {
            return Ok(None);
        }

        let content = fs::read_to_string(&entry_path).await.map_err(|e| {
            ConvertError::from_io_error(e, Some(entry_path.to_string_lossy().as_ref()))
        })?;

        // 解析 entry.json 文件
        let entry: EntryJsonFile = serde_json::from_str(&content).map_err(|e| {
            ConvertError::StreamIdentificationFailed {
                reason: format!("解析 entry.json 文件失败: {}", e),
            }
        })?;

        // 从 type_tag 或 page_data 中提取流ID
        let video_id = entry
            .type_tag
            .as_ref()
            .or(entry.page_data.as_ref().and_then(|p| p.download_subtitle.as_ref()))
            .map(|s| s.to_string());

        // Android 缓存通常在子目录中
        // 尝试查找 m4s 文件
        if let Some(vid) = video_id {
            // Android 模式下，音视频可能在同一目录或子目录
            if let Ok((video_path, audio_path)) =
                Self::find_m4s_files_android(cache_dir, &vid).await
            {
                return Ok(Some(StreamInfo {
                    video_path,
                    audio_path,
                    video_id: vid.clone(),
                    audio_id: vid,
                }));
            }
        }

        Ok(None)
    }

    /// 根据文件大小推断音视频流
    ///
    /// 较大的文件识别为视频流，较小的识别为音频流。
    async fn from_file_size(cache_dir: &Path) -> Result<StreamInfo, ConvertError> {
        let m4s_files = Self::collect_m4s_files(cache_dir).await?;

        if m4s_files.len() < 2 {
            return Err(ConvertError::StreamIdentificationFailed {
                reason: format!(
                    "缓存目录中 m4s 文件数量不足，需要至少2个，实际找到 {} 个",
                    m4s_files.len()
                ),
            });
        }

        // 按文件大小排序（降序）
        let mut files_with_size: Vec<(PathBuf, u64)> = Vec::new();
        for path in m4s_files {
            let metadata = fs::metadata(&path).await.map_err(|e| {
                ConvertError::from_io_error(e, Some(path.to_string_lossy().as_ref()))
            })?;
            files_with_size.push((path, metadata.len()));
        }

        files_with_size.sort_by(|a, b| b.1.cmp(&a.1));

        // 最大的是视频，第二大的是音频
        let video_path = files_with_size[0].0.clone();
        let audio_path = files_with_size[1].0.clone();

        // 从文件名提取ID
        let video_id = Self::extract_id_from_filename(&video_path);
        let audio_id = Self::extract_id_from_filename(&audio_path);

        Ok(StreamInfo {
            video_path,
            audio_path,
            video_id,
            audio_id,
        })
    }

    /// 根据流ID查找对应的 m4s 文件
    async fn find_m4s_files_by_id(
        cache_dir: &Path,
        video_id: &str,
        audio_id: &str,
    ) -> Result<(PathBuf, PathBuf), ConvertError> {
        let m4s_files = Self::collect_m4s_files(cache_dir).await?;

        let mut video_path: Option<PathBuf> = None;
        let mut audio_path: Option<PathBuf> = None;

        for path in m4s_files {
            let filename = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or_default();

            // 文件名格式: {itemId}-{param1}-{streamId}.m4s
            if filename.contains(video_id) && video_path.is_none() {
                video_path = Some(path.clone());
            }
            if filename.contains(audio_id) && audio_path.is_none() {
                audio_path = Some(path.clone());
            }

            if video_path.is_some() && audio_path.is_some() {
                break;
            }
        }

        match (video_path, audio_path) {
            (Some(v), Some(a)) => Ok((v, a)),
            _ => {
                // 如果按ID找不到，回退到文件大小推断
                let info = Self::from_file_size(cache_dir).await?;
                Ok((info.video_path, info.audio_path))
            }
        }
    }

    /// Android 模式下查找 m4s 文件
    async fn find_m4s_files_android(
        cache_dir: &Path,
        _type_tag: &str,
    ) -> Result<(PathBuf, PathBuf), ConvertError> {
        // Android 缓存可能在子目录中
        // 先检查当前目录
        let m4s_files = Self::collect_m4s_files(cache_dir).await?;

        if m4s_files.len() >= 2 {
            return Self::from_file_size(cache_dir)
                .await
                .map(|info| (info.video_path, info.audio_path));
        }

        // 检查子目录
        let mut entries = fs::read_dir(cache_dir).await.map_err(|e| {
            ConvertError::from_io_error(e, Some(cache_dir.to_string_lossy().as_ref()))
        })?;

        while let Some(entry) = entries.next_entry().await.map_err(|e| {
            ConvertError::from_io_error(e, Some(cache_dir.to_string_lossy().as_ref()))
        })? {
            let path = entry.path();
            if path.is_dir() {
                let sub_m4s = Self::collect_m4s_files(&path).await?;
                if sub_m4s.len() >= 2 {
                    return Self::from_file_size(&path)
                        .await
                        .map(|info| (info.video_path, info.audio_path));
                }
            }
        }

        Err(ConvertError::StreamIdentificationFailed {
            reason: "无法在缓存目录中找到足够的 m4s 文件".to_string(),
        })
    }

    /// 收集目录中的所有 m4s 文件
    async fn collect_m4s_files(dir: &Path) -> Result<Vec<PathBuf>, ConvertError> {
        let mut m4s_files = Vec::new();

        let mut entries = fs::read_dir(dir).await.map_err(|e| {
            ConvertError::from_io_error(e, Some(dir.to_string_lossy().as_ref()))
        })?;

        while let Some(entry) = entries.next_entry().await.map_err(|e| {
            ConvertError::from_io_error(e, Some(dir.to_string_lossy().as_ref()))
        })? {
            let path = entry.path();
            if let Some(ext) = path.extension() {
                if ext == "m4s" {
                    m4s_files.push(path);
                }
            }
        }

        Ok(m4s_files)
    }

    /// 从文件名提取流ID
    ///
    /// 文件名格式: {itemId}-{param1}-{streamId}.m4s
    fn extract_id_from_filename(path: &Path) -> String {
        path.file_stem()
            .and_then(|s| s.to_str())
            .and_then(|name| {
                // 尝试提取最后一个 '-' 后的部分作为ID
                name.rsplit('-').next()
            })
            .unwrap_or("unknown")
            .to_string()
    }
}

/// .playurl 文件结构
#[derive(Debug, Deserialize)]
struct PlayUrlFile {
    video: Option<Vec<PlayUrlStream>>,
    audio: Option<Vec<PlayUrlStream>>,
}

/// 流信息
#[derive(Debug, Deserialize)]
struct PlayUrlStream {
    id: i64,
    #[serde(default)]
    #[allow(dead_code)]
    codecid: Option<i32>,
}

/// entry.json 文件结构（Android模式）
#[derive(Debug, Deserialize)]
struct EntryJsonFile {
    #[serde(default)]
    type_tag: Option<String>,
    #[serde(default)]
    page_data: Option<PageData>,
}

/// Android 缓存页面数据
#[derive(Debug, Deserialize)]
struct PageData {
    #[serde(default)]
    download_subtitle: Option<String>,
}
