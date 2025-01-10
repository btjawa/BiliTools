use std::{collections::HashMap, env, path::PathBuf, sync::{Arc, RwLock}, time::{SystemTime, UNIX_EPOCH}};
use tauri::{http::{HeaderMap, HeaderName, HeaderValue}, AppHandle, Manager, WebviewWindow, Wry};
use tauri_plugin_http::reqwest::{Client, Proxy};
use rand::{distributions::Alphanumeric, Rng};
use serde::{Deserialize, Serialize};
use lazy_static::lazy_static;
use anyhow::{anyhow, Result};
use tokio::sync::OnceCell;
use tauri_specta::Event;
use serde_json::Value;
use specta::Type;
use regex::Regex;

use crate::{
    storage::config::{
        Settings,
        SettingsAdvanced,
        SettingsProxy
    },
    storage::cookies,
};

lazy_static! {
    pub static ref READY: Arc<RwLock<bool>> = Arc::new(RwLock::new(false));
    pub static ref APP_HANDLE: Arc<OnceCell<AppHandle<Wry>>> = Arc::new(OnceCell::new());
    pub static ref CONFIG: Arc<RwLock<Settings>> = Arc::new(RwLock::new(Settings {
        temp_dir: env::temp_dir(),
        down_dir: get_app_handle().path().desktop_dir().unwrap(),
        max_conc: 3,
        df_dms: 80,
        df_ads: 30280,
        df_cdc: 7,
        language: sys_locale::get_locale()
            .map(|c| {
                let code = c.to_lowercase();
                if code.as_str().starts_with("en") {
                    "en-US".into()
                } else if code.as_str().starts_with("zh") {
                    if code.as_str().ends_with("MO") || code.as_str().ends_with("TW") {
                        "zh-HK".into()
                    } else { "zh-CN".into() }
                } else { c }
            }).unwrap_or_else(|| "en-US".into()),
        filename: "{mediaType}_{title}_{date}".into(),
        auto_check_update: true,
        theme: Theme::Dark,
        proxy: SettingsProxy {
            addr: String::new(),
            username: String::new(),
            password: String::new()
        },
        advanced: SettingsAdvanced {
            auto_convert_flac: true,
            prefer_pb_danmaku: true,
        }
    }));
    pub static ref SECRET: Arc<RwLock<String>> = Arc::new(RwLock::new(String::new()));
    pub static ref WORKING_PATH: PathBuf = get_app_handle().path().app_data_dir().unwrap();
    pub static ref STORAGE_PATH: PathBuf = WORKING_PATH.join("Storage");
    pub static ref BINARY_PATH: PathBuf = {
        let current = env::current_exe().unwrap().parent().unwrap().to_path_buf();
        if cfg!(target_os = "macos")  && cfg!(not(debug_assertions)){
            current.parent().unwrap().join("Resources").join("bin")
        } else { current.join("bin") }
    };
    pub static ref BINARY_RELATIVE: String = {
        if cfg!(target_os = "macos")  && cfg!(not(debug_assertions)){
            "../Resources/bin".into()
        } else { "./bin".into() }
    };
}

// Copied from tauri::Theme because we need a Type and Event derive
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type, Event)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    /// Light theme.
    Light,
    /// Dark theme.
    Dark,
}

impl From<Theme> for tauri::Theme {
    fn from(theme: Theme) -> Self {
        match theme {
            Theme::Light => tauri::Theme::Light,
            Theme::Dark => tauri::Theme::Dark,
        }
    }
}

#[derive(Clone, Serialize, Deserialize, Type, Event)]
pub struct Headers {
    #[serde(rename = "Cookie")]
    cookie: String,
    #[serde(rename = "User-Agent")]
    user_agent: String,
    #[serde(rename = "Referer")]
    referer: String,
    #[serde(rename = "Origin")]
    origin: String,
    #[serde(flatten)]
    extra: HashMap<String, String>,
}

pub async fn init_headers() -> Result<HashMap<String, String>> {
    let mut map = HashMap::new();
    let cookies = cookies::load().await?
        .iter().map(|(name, value)|
            format!("{}={}", name, value.to_string().replace("\\\"", "").trim_matches('"'))
        ).collect::<Vec<_>>().join("; ");
    map.insert("Cookie".into(), cookies);
    map.insert("User-Agent".into(), "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36".into());
    map.insert("Referer".into(), "https://www.bilibili.com".into());
    map.insert("Origin".into(), "https://www.bilibili.com".into());
    let headers_value: Value = serde_json::to_value(&map)?;
    let headers: Headers = serde_json::from_value(headers_value)?;
    headers.emit(&get_app_handle()).unwrap();
    Ok(map)
}

pub async fn init_client() -> Result<Client> {
    let mut headers = HeaderMap::new();
    for (key, value) in init_headers().await? {
    headers.insert(
        HeaderName::from_bytes(key.as_bytes())?,
        HeaderValue::from_str(&value)?
    ); }
    let config = CONFIG.read().unwrap();
    let client_builder = Client::builder()
        .default_headers(headers);
    let client_builder = if !config.proxy.addr.is_empty() {
        client_builder.proxy(
            match config.proxy.addr.starts_with("https") {
                true => Proxy::https(&config.proxy.addr),
                false => Proxy::http(&config.proxy.addr),
            }
            .map_err(|e| anyhow!(e))?
            .basic_auth(&config.proxy.username, &config.proxy.password)
        )
    } else { client_builder };
    Ok(client_builder.build()?)
}

pub fn get_app_handle() -> AppHandle<Wry> {
    APP_HANDLE.get().unwrap().clone()
}

pub fn get_window() -> WebviewWindow {
    get_app_handle().get_webview_window("main").unwrap()
}

pub fn filename(filename: String) -> String {
    let re = Regex::new(r##"[\\/:*?\"<>|]"##).unwrap();
    re.replace_all(&filename, "_").to_string()
}

pub fn get_ts(mills: bool) -> u128 {
    let ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
    if mills { ts.as_millis() } else { ts.as_secs().into() }
}

pub fn random_string(len: usize) -> String {
    rand::thread_rng().sample_iter(&Alphanumeric)
        .take(len).map(char::from).collect()
}