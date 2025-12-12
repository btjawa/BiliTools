use anyhow::Result;
use base64::prelude::*;
use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;
use std::path::PathBuf;

use super::error::CacheImportError;
use crate::storage::{cache_group_states, cache_records::CacheRecord};

/// 缓存视频组
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CacheGroup {
    pub group_id: String,
    pub title: String,
    pub cover_url: String,
    pub uname: String,
    pub video_count: i32,
    pub total_duration: i64,
    pub total_file_size: i64,
    pub latest_download_time: i64,
    pub videos: Vec<CacheRecord>,
    pub is_expanded: bool,
}

/// 显示项枚举（组或单个视频）
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type")]
pub enum DisplayItem {
    #[serde(rename = "single_video")]
    SingleVideo { video: CacheRecord },
    #[serde(rename = "video_group")]
    VideoGroup { group: CacheGroup },
}

/// 组服务
#[derive(Debug, Clone)]
pub struct GroupService;

impl GroupService {
    /// 创建新的组服务实例
    pub fn new() -> Self {
        Self
    }

    /// 从缓存记录构建显示项列表，包含展开状态
    ///
    /// # 参数
    /// * `records` - 缓存记录列表
    ///
    /// # 返回
    /// * `Result<Vec<DisplayItem>>` - 显示项列表
    pub async fn build_display_items_with_states(
        &self,
        records: Vec<CacheRecord>,
    ) -> Result<Vec<DisplayItem>> {
        let mut display_items = self.build_display_items_from_records(records).await?;

        // 为每个组设置展开状态
        for item in &mut display_items {
            if let DisplayItem::VideoGroup { group } = item {
                group.is_expanded =
                    cache_group_states::get_expansion_state(&group.group_id).await?;
            }
        }

        Ok(display_items)
    }

    /// 切换组的展开状态
    ///
    /// # 参数
    /// * `group_id` - 组ID
    ///
    /// # 返回
    /// * `Result<bool>` - 新的展开状态
    pub async fn toggle_group_expansion(&self, group_id: &str) -> Result<bool> {
        let current_state = cache_group_states::get_expansion_state(group_id).await?;
        let new_state = !current_state;
        cache_group_states::set_expansion_state(group_id, new_state).await?;
        Ok(new_state)
    }

    /// 设置组的展开状态
    ///
    /// # 参数
    /// * `group_id` - 组ID
    /// * `is_expanded` - 是否展开
    ///
    /// # 返回
    /// * `Result<()>`
    pub async fn set_group_expansion(&self, group_id: &str, is_expanded: bool) -> Result<()> {
        cache_group_states::set_expansion_state(group_id, is_expanded).await?;
        Ok(())
    }

    /// 获取组统计信息
    ///
    /// # 参数
    /// * `display_items` - 显示项列表
    ///
    /// # 返回
    /// * `GroupStatistics` - 组统计信息
    pub fn calculate_group_statistics(&self, display_items: &[DisplayItem]) -> GroupStatistics {
        GroupStatistics::from_display_items(display_items)
    }

    /// 根据组ID获取组内视频
    ///
    /// # 参数
    /// * `group_id` - 组ID
    ///
    /// # 返回
    /// * `Result<Vec<CacheRecord>>` - 组内视频列表
    pub async fn get_videos_by_group_id(&self, group_id: &str) -> Result<Vec<CacheRecord>> {
        use crate::storage::cache_records;
        cache_records::get_by_group_id(group_id).await
    }

    /// 删除组（删除组内所有视频）
    ///
    /// # 参数
    /// * `group_id` - 组ID
    ///
    /// # 返回
    /// * `Result<i32>` - 删除的视频数量
    pub async fn delete_group(&self, group_id: &str) -> Result<i32> {
        use crate::storage::cache_records;

        let videos = self.get_videos_by_group_id(group_id).await?;
        let count = videos.len() as i32;

        // 删除所有组内视频记录
        for video in videos {
            cache_records::delete(&video.id).await?;
        }

        // 删除组状态记录
        cache_group_states::delete_state(group_id).await?;

        Ok(count)
    }

    /// 清理孤立的组状态
    ///
    /// # 返回
    /// * `Result<()>`
    pub async fn cleanup_orphaned_group_states(&self) -> Result<()> {
        cache_group_states::cleanup_orphaned_states().await?;
        Ok(())
    }

    /// 判断视频是否属于集合
    /// 规则：
    /// - p > 1 → 属于集合（多P视频）
    /// - p = 1 + groupId ≠ bvid → 属于集合（官方合集首集）
    /// - p = 1 + groupId = bvid → 不属于集合（纯独立视频）
    fn is_collection_video(record: &CacheRecord) -> bool {
        // p > 1 直接判定为集合
        if record.p > 1 {
            return true;
        }

        // p = 1 时，对比 groupId 和 bvid
        if let Some(group_id) = &record.group_id {
            // groupId 不为空且与 bvid 不同 → 集合
            !group_id.is_empty() && group_id != &record.bvid
        } else {
            // 没有 groupId → 非集合
            false
        }
    }

    /// 获取视频的分组键
    /// 优先使用 groupId（官方合集），其次使用 bvid（多P视频）
    fn get_group_key(record: &CacheRecord) -> Option<String> {
        // 优先检查 groupId：如果存在且与 bvid 不同，使用 groupId（官方合集）
        if let Some(group_id) = &record.group_id {
            if !group_id.is_empty() && group_id != &record.bvid {
                return Some(group_id.clone());
            }
        }

        // 其次检查 p：如果 p > 1，使用 bvid（多P视频）
        if record.p > 1 {
            return Some(record.bvid.clone());
        }

        // 否则不属于任何组
        None
    }

    /// 从缓存记录构建显示项列表（组和单个视频的混合）
    pub async fn build_display_items_from_records(
        &self,
        records: Vec<CacheRecord>,
    ) -> Result<Vec<DisplayItem>> {
        let mut groups: HashMap<String, Vec<CacheRecord>> = HashMap::new();
        let mut singles: Vec<CacheRecord> = Vec::new();

        for record in records {
            if Self::is_collection_video(&record) {
                if let Some(group_key) = Self::get_group_key(&record) {
                    groups.entry(group_key).or_default().push(record);
                } else {
                    singles.push(record);
                }
            } else {
                singles.push(record);
            }
        }

        let mut display_items = Vec::new();

        for (group_id, mut videos) in groups {
            if videos.len() >= 2 {
                videos.sort_by_key(|v| v.p);

                let title = videos
                    .iter()
                    .find_map(|v| v.group_title.clone())
                    .unwrap_or_else(|| self.generate_group_title_sync(&videos));

                let group = CacheGroup {
                    group_id: group_id.clone(),
                    title,
                    cover_url: self.get_group_cover(&group_id, &videos).await?,
                    uname: self.determine_group_uname(&videos).await,
                    video_count: videos.len() as i32,
                    total_duration: videos.iter().map(|v| v.duration).sum(),
                    total_file_size: videos.iter().map(|v| v.file_size).sum(),
                    latest_download_time: videos.iter().map(|v| v.download_time).max().unwrap_or(0),
                    videos,
                    is_expanded: false,
                };

                display_items.push(DisplayItem::VideoGroup { group });
            } else {
                singles.extend(videos);
            }
        }

        for record in singles {
            display_items.push(DisplayItem::SingleVideo { video: record });
        }

        Ok(display_items)
    }

    /// 获取组封面
    ///
    /// # 参数
    /// * `group_id` - 组ID
    /// * `videos` - 组内视频列表
    ///
    /// # 返回
    /// * `Result<String>` - 封面URL
    pub async fn get_group_cover(&self, _group_id: &str, videos: &[CacheRecord]) -> Result<String> {
        // 1. 尝试从任一视频目录获取组封面（支持多种格式）
        let group_cover_files = ["group.jpg", "group.png", "image.jpg", "image.png"];

        for video in videos {
            let cache_dir = PathBuf::from(&video.cache_path);

            for cover_file in &group_cover_files {
                let group_cover_path = cache_dir.join(cover_file);

                if group_cover_path.exists() && group_cover_path.is_file() {
                    // 读取文件并转换为 base64 data URL
                    match tokio::fs::read(&group_cover_path).await {
                        Ok(file_data) => {
                            let base64_data = BASE64_STANDARD.encode(&file_data);
                            let mime_type =
                                match group_cover_path.extension().and_then(|ext| ext.to_str()) {
                                    Some("jpg") | Some("jpeg") => "image/jpeg",
                                    Some("png") => "image/png",
                                    Some("webp") => "image/webp",
                                    _ => "image/jpeg", // 默认
                                };
                            return Ok(format!("data:{};base64,{}", mime_type, base64_data));
                        }
                        Err(e) => {
                            eprintln!("读取组封面文件失败 {:?}: {}", group_cover_path, e);
                            continue;
                        }
                    }
                }
            }
        }

        // 2. 回退到第一个视频的封面
        if let Some(first_video) = videos.first() {
            // 尝试获取本地封面
            if let Ok(Some(local_cover)) = self.get_local_cover(&first_video.cache_path).await {
                return Ok(local_cover);
            }
            // 回退到原始封面URL
            Ok(first_video.cover_url.clone())
        } else {
            Err(CacheImportError::MissingRequiredFields {
                fields: vec!["group videos".to_string()],
            }
            .into())
        }
    }

    /// 获取本地封面文件（复用现有逻辑）
    async fn get_local_cover(&self, cache_path: &str) -> Result<Option<String>> {
        let cache_dir = PathBuf::from(cache_path);
        if !cache_dir.exists() {
            return Ok(None);
        }

        // B站缓存的封面文件名（按优先级排序）
        let cover_files = ["image.jpg", "image.png"];

        for file_name in &cover_files {
            let cover_path = cache_dir.join(file_name);
            if cover_path.exists() && cover_path.is_file() {
                // 读取文件并转换为 base64 data URL
                match tokio::fs::read(&cover_path).await {
                    Ok(file_data) => {
                        let base64_data = BASE64_STANDARD.encode(&file_data);
                        let mime_type = match cover_path.extension().and_then(|ext| ext.to_str()) {
                            Some("jpg") | Some("jpeg") => "image/jpeg",
                            Some("png") => "image/png",
                            Some("webp") => "image/webp",
                            _ => "image/jpeg", // 默认
                        };
                        return Ok(Some(format!("data:{};base64,{}", mime_type, base64_data)));
                    }
                    Err(e) => {
                        eprintln!("读取封面文件失败 {:?}: {}", cover_path, e);
                        continue;
                    }
                }
            }
        }

        Ok(None)
    }

    /// 生成组标题（同步版本）
    fn generate_group_title_sync(&self, videos: &[CacheRecord]) -> String {
        if videos.is_empty() {
            return "视频合集".to_string();
        }

        // 尝试找到公共标题前缀
        let titles: Vec<&str> = videos.iter().map(|v| v.title.as_str()).collect();
        let common_prefix = self.find_common_prefix(&titles);

        if !common_prefix.is_empty() && common_prefix.len() > 3 {
            // 移除末尾的数字和特殊字符
            let cleaned = common_prefix
                .trim_end_matches(|c: char| c.is_ascii_digit() || "()[]{}【】-_·第 ".contains(c))
                .trim();

            if !cleaned.is_empty() {
                return cleaned.to_string();
            }
        }

        // 如果无法确定公共标题，使用默认标题
        "视频合集".to_string()
    }

    /// 生成组标题（异步版本，向后兼容）
    pub async fn generate_group_title(&self, videos: &[CacheRecord]) -> String {
        self.generate_group_title_sync(videos)
    }

    /// 确定组的UP主名称
    ///
    /// # 参数
    /// * `videos` - 组内视频列表
    ///
    /// # 返回
    /// * `String` - UP主名称
    pub async fn determine_group_uname(&self, videos: &[CacheRecord]) -> String {
        if videos.is_empty() {
            return "未知UP主".to_string();
        }

        // 统计UP主出现次数
        let mut uname_counts: HashMap<String, usize> = HashMap::new();
        for video in videos {
            *uname_counts.entry(video.uname.clone()).or_insert(0) += 1;
        }

        // 如果只有一个UP主，直接返回
        if uname_counts.len() == 1 {
            return videos[0].uname.clone();
        }

        // 如果有多个UP主，返回出现次数最多的，或者"多个UP主"
        if let Some((most_common_uname, count)) =
            uname_counts.iter().max_by_key(|(_, &count)| count)
        {
            // 如果某个UP主占主导地位（超过70%），使用该UP主
            if *count as f64 / videos.len() as f64 > 0.7 {
                most_common_uname.clone()
            } else {
                "多个UP主".to_string()
            }
        } else {
            "多个UP主".to_string()
        }
    }

    /// 查找字符串列表的公共前缀
    ///
    /// # 参数
    /// * `strings` - 字符串列表
    ///
    /// # 返回
    /// * `String` - 公共前缀
    fn find_common_prefix(&self, strings: &[&str]) -> String {
        if strings.is_empty() {
            return String::new();
        }

        if strings.len() == 1 {
            return strings[0].to_string();
        }

        let first = strings[0];
        let mut prefix_len = 0;
        let mut char_index = 0;

        for ch in first.chars() {
            if strings
                .iter()
                .all(|s| s.chars().nth(char_index) == Some(ch))
            {
                prefix_len += ch.len_utf8();
                char_index += 1;
            } else {
                break;
            }
        }

        first[..prefix_len].to_string()
    }
}

impl Default for GroupService {
    fn default() -> Self {
        Self::new()
    }
}

/// 组统计信息
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct GroupStatistics {
    pub total_groups: i32,
    pub total_videos_in_groups: i32,
    pub total_single_videos: i32,
    pub total_duration_in_groups: i64,
    pub total_size_in_groups: i64,
}

impl GroupStatistics {
    /// 从显示项列表计算统计信息
    pub fn from_display_items(items: &[DisplayItem]) -> Self {
        let mut total_groups = 0;
        let mut total_videos_in_groups = 0;
        let mut total_single_videos = 0;
        let mut total_duration_in_groups = 0;
        let mut total_size_in_groups = 0;

        for item in items {
            match item {
                DisplayItem::VideoGroup { group } => {
                    total_groups += 1;
                    total_videos_in_groups += group.video_count;
                    total_duration_in_groups += group.total_duration;
                    total_size_in_groups += group.total_file_size;
                }
                DisplayItem::SingleVideo { .. } => {
                    total_single_videos += 1;
                }
            }
        }

        Self {
            total_groups,
            total_videos_in_groups,
            total_single_videos,
            total_duration_in_groups,
            total_size_in_groups,
        }
    }
}
