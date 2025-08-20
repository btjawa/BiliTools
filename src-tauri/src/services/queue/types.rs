
use std::{collections::VecDeque, path::PathBuf, sync::Arc};
use serde::{Serialize, Deserialize};
use tauri_specta::Event;
use serde_json::Number;
use specta::Type;

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
    pub index: usize,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MediaNfo {
    pub tags: Vec<String>,
    pub thumbs: Vec<MediaNfoThumb>,
    pub showtitle: String,
    pub premiered: Number,
    pub upper: Option<MediaNfoUpper>,
    pub actors: Vec<MediaNfoActor>,
    pub staff: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MediaNfoThumb {
    pub id: String,
    pub url: String
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MediaNfoUpper {
    pub name: String,
    pub mid: usize,
    pub avatar: String
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MediaNfoActor {
    pub role: String,
    pub name: String
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaUrls {
    #[serde(rename = "videoUrls")]
    pub video_urls: Option<Vec<String>>,
    #[serde(rename = "audioUrls")]
    pub audio_urls: Option<Vec<String>>,
    pub select: Arc<PopupSelect>,
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

#[derive(Debug, Clone, Serialize, Deserialize, Type, Event)]
pub struct QueueData {
    pub waiting:  VecDeque<Arc<String>>,
    pub doing:    VecDeque<Arc<String>>,
    pub complete: VecDeque<Arc<String>>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct GeneralTask {
    pub id: Arc<String>,
    pub ts: u64,
    pub index: usize,
    pub folder: Arc<PathBuf>,
    pub select: Arc<PopupSelect>,
    pub item: Arc<MediaItem>,
    #[serde(rename = "type")]
    pub media_type: String,
    pub nfo: Arc<MediaNfo>,
    pub subtasks: Vec<Arc<SubTask>>
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

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Type)]
#[serde(rename_all = "camelCase")]
pub enum TaskState {
    Pending,
    Active,
    Completed,
    Paused,
    Failed,
    Cancelled
}