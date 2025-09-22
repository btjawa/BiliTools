use serde::{Deserialize, Serialize};
use serde_json::Number;
use specta::Type;
use std::{
    collections::{HashMap, VecDeque},
    path::PathBuf,
    sync::Arc,
};

// Media

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MediaItem {
    pub title: String,
    pub cover: String,
    pub desc: String,
    pub duration: Number,
    pub pubtime: Number,
    #[serde(rename = "type")]
    pub media_type: String,
    #[specta(optional)]
    pub aid: Option<usize>,
    #[specta(optional)]
    pub sid: Option<usize>,
    #[specta(optional)]
    pub fid: Option<usize>,
    #[specta(optional)]
    pub cid: Option<usize>,
    #[specta(optional)]
    pub bvid: Option<String>,
    #[specta(optional)]
    pub epid: Option<usize>,
    #[specta(optional)]
    pub ssid: Option<usize>,
    #[specta(optional)]
    pub opid: Option<String>,
    pub index: usize,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MediaNfo {
    #[specta(optional)]
    pub showtitle: Option<String>,
    #[specta(optional)]
    pub intro: Option<String>,
    pub tags: Vec<String>,
    pub stat: serde_json::Value, // We don't want to handle this
    pub thumbs: Vec<MediaNfoThumb>,
    #[specta(optional)]
    pub premiered: Option<Number>,
    #[specta(optional)]
    pub upper: Option<MediaNfoUpper>,
    #[specta(optional)]
    pub credits: Option<MediaNfoCredits>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MediaNfoThumb {
    pub id: String,
    pub url: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MediaNfoUpper {
    pub name: String,
    pub mid: usize,
    pub avatar: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MediaNfoCredits {
    pub actors: Vec<MediaNfoCredit>,
    pub staff: Vec<MediaNfoCredit>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MediaNfoCredit {
    pub role: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaUrls {
    #[serde(rename = "videoUrls")]
    pub video_urls: Option<Vec<String>>,
    #[serde(rename = "audioUrls")]
    pub audio_urls: Option<Vec<String>>,
    pub subtasks: Vec<Arc<SubTask>>,
    pub folder: Arc<PathBuf>,
}

// Select

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct PopupSelect {
    #[specta(optional)]
    pub res: Option<usize>,
    #[specta(optional)]
    pub abr: Option<usize>,
    #[specta(optional)]
    pub enc: Option<usize>,
    pub fmt: StreamFormat,
    pub misc: PopupSelectMisc,
    pub nfo: PopupSelectNfo,
    pub danmaku: PopupSelectDanmaku,
    pub thumb: Vec<String>,
    pub media: PopupSelectMedia,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(untagged)]
pub enum StringOrFalse {
    String(String),
    False(bool),
}

impl StringOrFalse {
    pub fn as_str(&self) -> Option<&str> {
        match self {
            StringOrFalse::String(s) => Some(s.as_str()),
            StringOrFalse::False(_) => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum StreamFormat {
    Dash,
    Mp4,
    Flv,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct PopupSelectMisc {
    #[serde(rename = "aiSummary")]
    pub ai_summary: bool,
    pub subtitles: StringOrFalse,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct PopupSelectNfo {
    pub album: bool,
    pub single: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct PopupSelectDanmaku {
    pub live: bool,
    pub history: StringOrFalse,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct PopupSelectMedia {
    pub video: bool,
    pub audio: bool,
    #[serde(rename = "audioVideo")]
    pub audio_video: bool,
}

impl PopupSelectMedia {
    pub fn any_true(&self) -> bool {
        self.video || self.audio || self.audio_video
    }
}

// Tasks

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct QueueData {
    pub waiting: VecDeque<Arc<String>>,
    pub doing: VecDeque<Arc<String>>,
    pub complete: VecDeque<Arc<String>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum QueueType {
    Waiting,
    Doing,
    Complete,
}

impl QueueType {
    pub fn as_str(&self) -> &'static str {
        match self {
            QueueType::Waiting => "waiting",
            QueueType::Doing => "doing",
            QueueType::Complete => "complete",
        }
    }
    pub fn from_str_lossy(str: &str) -> QueueType {
        match str {
            "waiting" => QueueType::Waiting,
            "doing" => QueueType::Doing,
            "complete" => QueueType::Complete,
            _ => QueueType::Waiting,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct Task {
    pub id: Arc<String>,
    pub state: TaskState,
    pub subtasks: Vec<Arc<SubTask>>,
    pub status: HashMap<Arc<String>, Arc<SubTaskStatus>>,
    pub ts: u64,
    pub seq: usize,
    pub folder: Arc<PathBuf>,
    pub select: Arc<PopupSelect>,
    pub item: Arc<MediaItem>,
    #[serde(rename = "type")]
    pub media_type: String,
    pub nfo: Arc<MediaNfo>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Type)]
#[serde(rename_all = "camelCase")]
pub enum TaskState {
    Pending,
    Active,
    Completed,
    Paused,
    Failed,
    Cancelled,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct SubTask {
    pub id: Arc<String>,
    #[serde(rename = "type")]
    pub task_type: TaskType,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Type)]
#[serde(rename_all = "camelCase")]
pub enum TaskType {
    OpusContent,
    OpusImages,
    AiSummary,
    Subtitles,
    AlbumNfo,
    SingleNfo,
    LiveDanmaku,
    HistoryDanmaku,
    Thumb,
    Video,
    Audio,
    AudioVideo,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct SubTaskStatus {
    pub chunk: u64,
    pub content: u64,
}
