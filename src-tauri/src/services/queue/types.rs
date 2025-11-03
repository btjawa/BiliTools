use serde::{Deserialize, Serialize};
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
    #[serde(default)]
    pub url: String,
    #[specta(optional)]
    pub aid: Option<Number>,
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
    #[specta(optional)]
    pub rlid: Option<usize>,
    pub index: usize,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, Type)]
pub struct MediaNfo {
    #[specta(optional)]
    pub showtitle: Option<String>,
    #[specta(optional)]
    pub intro: Option<String>,
    pub tags: Vec<String>,
    #[serde(default)]
    pub url: String,
    pub stat: serde_json::Value, // We don't need to handle this
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
    pub role: Option<String>,
    pub name: Option<String>,
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
