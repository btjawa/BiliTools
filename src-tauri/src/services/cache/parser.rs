use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use specta::Type;
use std::path::PathBuf;

/// videoInfo.json中的视频信息
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct VideoInfo {
    pub aid: i64,
    pub bvid: String,
    pub cid: i64,
    pub title: String,
    pub uname: String,
    pub cover: String,
    pub duration: i64,
    pub total_size: u64,
    pub quality: Option<i32>,
    pub download_time: Option<i64>,
    pub group_id: Option<String>,    // 视频组ID
    pub group_title: Option<String>, // 视频组标题
    pub p: i32,                      // 分P序号，默认为1
    // 其他可选字段
    #[serde(flatten)]
    pub extra_fields: std::collections::HashMap<String, Value>,
}

/// JSON解析服务
#[derive(Debug, Clone)]
pub struct ParserService;

impl ParserService {
    /// 创建新的解析服务实例
    pub fn new() -> Self {
        Self
    }

    /// 解析videoInfo.json文件
    ///
    /// # 参数
    /// * `json_path` - videoInfo.json文件路径
    ///
    /// # 返回
    /// * `Result<VideoInfo>` - 解析后的视频信息
    pub async fn parse_video_info(&self, json_path: &PathBuf) -> Result<VideoInfo> {
        // 读取文件内容
        let content = tokio::fs::read_to_string(json_path)
            .await
            .map_err(|e| anyhow::anyhow!("无法读取文件 {:?}: {}", json_path, e))?;

        // 验证JSON格式
        let json_value = self.validate_json_format(&content)?;

        // 提取必需字段
        let video_info = self.extract_video_info(&json_value)?;

        Ok(video_info)
    }

    /// 验证JSON格式
    ///
    /// # 参数
    /// * `content` - JSON字符串内容
    ///
    /// # 返回
    /// * `Result<Value>` - 解析后的JSON值
    pub fn validate_json_format(&self, content: &str) -> Result<Value> {
        serde_json::from_str(content).map_err(|e| anyhow::anyhow!("JSON格式无效: {}", e))
    }

    /// 从JSON值中提取视频信息
    ///
    /// # 参数
    /// * `json_value` - 解析后的JSON值
    ///
    /// # 返回
    /// * `Result<VideoInfo>` - 提取的视频信息
    fn extract_video_info(&self, json_value: &Value) -> Result<VideoInfo> {
        let obj = json_value
            .as_object()
            .ok_or_else(|| anyhow::anyhow!("JSON根节点不是对象"))?;

        // 提取必需字段
        let aid = self.extract_i64_field(obj, "aid")?;
        let bvid = self.extract_string_field(obj, "bvid")?;
        let cid = self.extract_i64_field(obj, "cid")?;
        let title = self.extract_string_field(obj, "title")?;

        // UP主名称可能在不同字段中
        let uname = self
            .extract_string_field(obj, "uname")
            .or_else(|_| self.extract_string_field(obj, "owner_name"))
            .or_else(|_| self.extract_string_field(obj, "author"))
            .unwrap_or_else(|_| "未知UP主".to_string());

        // 封面URL
        let cover = self
            .extract_string_field(obj, "cover")
            .or_else(|_| self.extract_string_field(obj, "pic"))
            .unwrap_or_else(|_| "".to_string());

        // 时长（秒）
        let duration = self
            .extract_i64_field(obj, "duration")
            .or_else(|_| self.extract_i64_field(obj, "length"))
            .unwrap_or(0);

        // 文件总大小
        let total_size = self
            .extract_u64_field(obj, "totalSize")
            .or_else(|_| self.extract_u64_field(obj, "total_size"))
            .or_else(|_| self.extract_u64_field(obj, "size"))
            .unwrap_or(0);

        // 可选字段
        let quality = self.extract_i32_field(obj, "quality").ok();

        // 下载时间（时间戳）
        let download_time = self
            .extract_i64_field(obj, "completionTime")
            .or_else(|_| self.extract_i64_field(obj, "downloadTime"))
            .or_else(|_| self.extract_i64_field(obj, "download_time"))
            .or_else(|_| self.extract_i64_field(obj, "ctime"))
            .ok()
            .map(|timestamp| {
                // 处理时间戳格式：如果是秒级时间戳，转换为毫秒级
                if timestamp > 0 && timestamp < 10_000_000_000 {
                    // 秒级时间戳（小于10位数），转换为毫秒级
                    timestamp * 1000
                } else {
                    // 已经是毫秒级时间戳或无效时间戳
                    timestamp
                }
            });

        // 组ID（可选）- 支持数字和字符串格式
        let group_id = obj
            .get("groupId")
            .or_else(|| obj.get("group_id"))
            .and_then(|v| {
                // 如果是数字，转换为字符串
                if let Some(n) = v.as_i64() {
                    Some(n.to_string())
                } else if let Some(n) = v.as_u64() {
                    Some(n.to_string())
                } else {
                    // 如果是字符串，直接使用
                    v.as_str().map(|s| s.to_string())
                }
            })
            .filter(|s| !s.is_empty());

        // 分P序号，默认为1
        let p = self
            .extract_i32_field(obj, "p")
            .or_else(|_| self.extract_i32_field(obj, "page"))
            .unwrap_or(1);

        // 组标题（可选）
        let group_title = self
            .extract_string_field(obj, "groupTitle")
            .or_else(|_| self.extract_string_field(obj, "group_title"))
            .ok()
            .filter(|s| !s.is_empty());

        // 收集其他字段
        let mut extra_fields = std::collections::HashMap::new();
        for (key, value) in obj {
            if !matches!(
                key.as_str(),
                "aid"
                    | "bvid"
                    | "cid"
                    | "title"
                    | "uname"
                    | "owner_name"
                    | "author"
                    | "cover"
                    | "pic"
                    | "duration"
                    | "length"
                    | "totalSize"
                    | "total_size"
                    | "size"
                    | "quality"
                    | "completionTime"
                    | "downloadTime"
                    | "download_time"
                    | "ctime"
                    | "groupId"
                    | "group_id"
                    | "groupTitle"
                    | "group_title"
                    | "p"
                    | "page"
            ) {
                extra_fields.insert(key.clone(), value.clone());
            }
        }

        Ok(VideoInfo {
            aid,
            bvid,
            cid,
            title,
            uname,
            cover,
            duration,
            total_size,
            quality,
            download_time,
            group_id,
            group_title,
            p,
            extra_fields,
        })
    }

    /// 提取字符串字段
    fn extract_string_field(
        &self,
        obj: &serde_json::Map<String, Value>,
        field: &str,
    ) -> Result<String> {
        obj.get(field)
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .ok_or_else(|| anyhow::anyhow!("缺少必需字段: {}", field))
    }

    /// 提取i64字段
    fn extract_i64_field(&self, obj: &serde_json::Map<String, Value>, field: &str) -> Result<i64> {
        obj.get(field)
            .and_then(|v| {
                // 尝试直接获取数字
                v.as_i64()
                    // 或者尝试从字符串解析
                    .or_else(|| v.as_str().and_then(|s| s.parse().ok()))
            })
            .ok_or_else(|| anyhow::anyhow!("缺少或无效的数字字段: {}", field))
    }

    /// 提取u64字段
    fn extract_u64_field(&self, obj: &serde_json::Map<String, Value>, field: &str) -> Result<u64> {
        obj.get(field)
            .and_then(|v| {
                // 尝试直接获取数字
                v.as_u64()
                    // 或者尝试从字符串解析
                    .or_else(|| v.as_str().and_then(|s| s.parse().ok()))
                    // 或者从i64转换
                    .or_else(|| {
                        v.as_i64()
                            .and_then(|i| if i >= 0 { Some(i as u64) } else { None })
                    })
            })
            .ok_or_else(|| anyhow::anyhow!("缺少或无效的数字字段: {}", field))
    }

    /// 提取i32字段
    fn extract_i32_field(&self, obj: &serde_json::Map<String, Value>, field: &str) -> Result<i32> {
        obj.get(field)
            .and_then(|v| {
                // 尝试直接获取数字
                v.as_i64()
                    .and_then(|i| i.try_into().ok())
                    // 或者尝试从字符串解析
                    .or_else(|| v.as_str().and_then(|s| s.parse().ok()))
            })
            .ok_or_else(|| anyhow::anyhow!("缺少或无效的数字字段: {}", field))
    }

    /// 提取元数据（用于后续处理）
    pub fn extract_metadata(&self, video_info: &VideoInfo) -> Result<CacheMetadata> {
        Ok(CacheMetadata {
            video_info: video_info.clone(),
            directory_path: PathBuf::new(), // 将在调用时设置
            media_files: Vec::new(),        // 将在调用时设置
            total_size: video_info.total_size,
        })
    }
}

/// 缓存元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheMetadata {
    pub video_info: VideoInfo,
    pub directory_path: PathBuf,
    pub media_files: Vec<PathBuf>,
    pub total_size: u64,
}

impl Default for ParserService {
    fn default() -> Self {
        Self::new()
    }
}
