use anyhow::Result;
use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;
use std::path::PathBuf;

use crate::storage::cache_records::CacheRecord;

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

    /// 从缓存记录构建显示项列表（组和单个视频的混合）
    ///
    /// # 参数
    /// * `records` - 缓存记录列表
    ///
    /// # 返回
    /// * `Result<Vec<DisplayItem>>` - 显示项列表
    pub async fn build_display_items_from_records(
        &self,
        records: Vec<CacheRecord>,
    ) -> Result<Vec<DisplayItem>> {
        let mut groups: HashMap<String, Vec<CacheRecord>> = HashMap::new();
        let mut singles: Vec<CacheRecord> = Vec::new();

        // 按group_id分组
        for record in records {
            if let Some(group_id) = &record.group_id {
                if !group_id.is_empty() {
                    groups.entry(group_id.clone()).or_default().push(record);
                } else {
                    singles.push(record);
                }
            } else {
                singles.push(record);
            }
        }

        let mut display_items = Vec::new();

        // 处理组（2个或以上视频才成组）
        for (group_id, mut videos) in groups {
            if videos.len() >= 2 {
                // 按下载时间排序
                videos.sort_by_key(|v| v.download_time);

                let group = CacheGroup {
                    group_id: group_id.clone(),
                    title: self.generate_group_title(&videos).await,
                    cover_url: self.get_group_cover(&group_id, &videos).await?,
                    uname: self.determine_group_uname(&videos).await,
                    video_count: videos.len() as i32,
                    total_duration: videos.iter().map(|v| v.duration).sum(),
                    total_file_size: videos.iter().map(|v| v.file_size).sum(),
                    latest_download_time: videos
                        .iter()
                        .map(|v| v.download_time)
                        .max()
                        .unwrap_or(0),
                    videos,
                    is_expanded: false, // 默认折叠，实际状态将在前端设置
                };

                display_items.push(DisplayItem::VideoGroup { group });
            } else {
                // 单个视频直接加入singles
                singles.extend(videos);
            }
        }

        // 添加单个视频
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
    pub async fn get_group_cover(
        &self,
        _group_id: &str,
        videos: &[CacheRecord],
    ) -> Result<String> {
        // 1. 尝试从任一视频目录获取group.jpg
        for video in videos {
            let group_cover_path = PathBuf::from(&video.cache_path).join("group.jpg");
            if group_cover_path.exists() {
                return Ok(format!("file://{}", group_cover_path.to_string_lossy()));
            }
        }

        // 2. 回退到第一个视频的封面
        if let Some(first_video) = videos.first() {
            Ok(first_video.cover_url.clone())
        } else {
            Ok(String::new())
        }
    }

    /// 生成组标题
    ///
    /// # 参数
    /// * `videos` - 组内视频列表
    ///
    /// # 返回
    /// * `String` - 组标题
    pub async fn generate_group_title(&self, videos: &[CacheRecord]) -> String {
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
        if let Some((most_common_uname, count)) = uname_counts
            .iter()
            .max_by_key(|(_, &count)| count)
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
            if strings.iter().all(|s| {
                s.chars().nth(char_index).map_or(false, |c| c == ch)
            }) {
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