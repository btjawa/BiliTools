use anyhow::Result;
use arc_swap::ArcSwap;
use rand::{distr::Alphanumeric, Rng};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::{
    collections::BTreeMap,
    path::PathBuf,
    sync::{Arc, LazyLock},
};
use tauri::{
    http::{HeaderMap, HeaderName, HeaderValue, StatusCode},
    utils::WindowEffect as TauriWindowEffect,
    AppHandle, Manager, Theme as TauriTheme, Wry,
};
use tauri_plugin_http::reqwest::{Client, Proxy};
use tauri_specta::Event;
use time::OffsetDateTime;
use tokio::sync::{OnceCell, RwLock};

use crate::storage::{
    config::{
        self, Settings, SettingsConvert, SettingsDefault, SettingsFormat, SettingsOrganize,
        SettingsProxy,
    },
    cookies,
};

use crate::{TauriError, TauriResult};

pub static APP_HANDLE: LazyLock<Arc<OnceCell<AppHandle<Wry>>>> =
    LazyLock::new(|| Arc::new(OnceCell::new()));
pub static CONFIG: LazyLock<ArcSwap<Settings>> = LazyLock::new(|| {
    ArcSwap::from_pointee(Settings {
        add_metadata: true,
        auto_check_update: true,
        auto_download: false,
        block_pcdn: true,
        check_update: true,
        clipboard: false,
        convert: SettingsConvert {
            danmaku: true,
            mp3: false,
        },
        default: SettingsDefault {
            res: 80,
            abr: 30280,
            enc: 7,
        },
        down_dir: get_app_handle()
            .path()
            .desktop_dir()
            .expect("Failed to get desktop_dir"),
        drag_search: true,
        format: SettingsFormat {
            series: "{container} - {showtitle} ({downtime:YYYY-MM-DD_HH-mm-ss})".into(),
            item: "({index}) {mediaType} - {title}".into(),
            file: "{taskType} - {title}".into(),
        },
        language: sys_locale::get_locale()
            .map(|c| {
                let code = c.to_lowercase();
                if code.as_str().starts_with("en") {
                    "en-US".into()
                } else if code.as_str().starts_with("zh") {
                    if code.as_str().ends_with("MO") || code.as_str().ends_with("TW") {
                        "zh-HK".into()
                    } else {
                        "zh-CN".into()
                    }
                } else {
                    c
                }
            })
            .unwrap_or("en-US".into()),
        max_conc: 3,
        notify: true,
        temp_dir: get_app_handle()
            .path()
            .temp_dir()
            .expect("Failed to get temp_dir"),
        theme: Theme::Auto,
        ui_scale: "auto".into(),
        window_effect: WindowEffect::Auto,
        organize: SettingsOrganize {
            auto_rename: true,
            top_folder: true,
            sub_folder: true,
        },
        proxy: SettingsProxy {
            address: String::new(),
            username: String::new(),
            password: String::new(),
        },
    })
});
pub static HEADERS: LazyLock<Headers> = LazyLock::new(Headers::new);
pub static READY: LazyLock<OnceCell<()>> = LazyLock::new(OnceCell::new);
pub static DATABASE_URL: LazyLock<String> =
    LazyLock::new(|| format!("sqlite://{}", STORAGE_PATH.to_string_lossy()));
pub static STORAGE_PATH: LazyLock<PathBuf> = LazyLock::new(|| WORKING_PATH.join("Storage"));
pub static WORKING_PATH: LazyLock<PathBuf> = LazyLock::new(|| {
    get_app_handle()
        .path()
        .app_data_dir()
        .expect("Failed to get app_data_dir")
});

pub const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";

// Modified from tauri::Theme for Type and Event derive
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type, Event)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    /// Light theme.
    Light,
    /// Dark theme.
    Dark,
    /// Auto theme.
    Auto,
}

impl Theme {
    pub fn as_tauri(&self) -> TauriTheme {
        match self {
            Theme::Light => TauriTheme::Light,
            Theme::Dark => TauriTheme::Dark,
            Theme::Auto => match dark_light::detect() {
                Ok(dark_light::Mode::Dark) => TauriTheme::Dark,
                Ok(dark_light::Mode::Light) => TauriTheme::Light,
                _ => TauriTheme::Light,
            },
        }
    }
}

// Window effect configuration
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type, Default)]
#[serde(rename_all = "lowercase")]
pub enum WindowEffect {
    /// Auto window effect based on platform
    #[default]
    Auto,
    /// Mica effect (Windows 11+)
    Mica,
    /// Acrylic effect (Windows 10+)
    Acrylic,
    /// Sidebar effect (macOS)
    Sidebar,
    /// No window effect
    None,
}

impl WindowEffect {
    pub fn as_tauri(&self) -> Option<TauriWindowEffect> {
        match self {
            WindowEffect::Auto => match tauri_plugin_os::platform() {
                "windows" => {
                    if let tauri_plugin_os::Version::Semantic(_, _, patch) =
                        tauri_plugin_os::version()
                    {
                        if patch >= 22000 {
                            Some(TauriWindowEffect::Mica)
                        } else if !(18362..=22000).contains(&patch) {
                            Some(TauriWindowEffect::Acrylic)
                        } else {
                            None
                        }
                    } else {
                        None
                    }
                }
                "macos" => Some(TauriWindowEffect::Sidebar),
                _ => None,
            },
            WindowEffect::Mica => Some(TauriWindowEffect::Mica),
            WindowEffect::Acrylic => Some(TauriWindowEffect::Acrylic),
            WindowEffect::Sidebar => Some(TauriWindowEffect::Sidebar),
            WindowEffect::None => None,
        }
    }
}

#[derive(Clone, Serialize, Deserialize, Type, Event)]
pub struct ProcessError {
    pub name: String,
    pub error: String,
}

#[derive(Clone, Serialize, Deserialize, Type, Event)]
pub struct HeadersData {
    #[serde(rename = "Cookie")]
    cookie: String,
    #[serde(rename = "User-Agent")]
    user_agent: String,
    #[serde(rename = "Referer")]
    referer: String,
    #[serde(rename = "Origin")]
    origin: String,
}

pub struct Headers {
    map: RwLock<BTreeMap<String, String>>,
}

impl Default for Headers {
    fn default() -> Self {
        Self::new()
    }
}

impl Headers {
    pub fn new() -> Self {
        let mut map = BTreeMap::new();
        map.insert("User-Agent".into(), USER_AGENT.into());
        map.insert("Referer".into(), "https://www.bilibili.com/".into());
        map.insert("Origin".into(), "https://www.bilibili.com".into());
        map.insert("Cookie".into(), String::new());
        Self {
            map: RwLock::new(map),
        }
    }
    pub async fn refresh(&self) -> Result<()> {
        let mut map = self.map.write().await;
        let cookies = cookies::load()
            .await?
            .iter()
            .map(|(name, value)| {
                format!(
                    "{}={}",
                    name,
                    value.to_string().replace("\\\"", "").trim_matches('"')
                )
            })
            .collect::<Vec<_>>()
            .join("; ");
        map.insert("Cookie".into(), cookies);
        let headers: HeadersData = serde_json::from_value(serde_json::to_value(&*map)?)?;
        drop(map);
        let app = get_app_handle();
        headers.emit(app)?;
        Ok(())
    }
    pub async fn to_header_map(&self) -> Result<HeaderMap> {
        let mut headers = HeaderMap::new();
        let map = self.map.read().await;
        for (key, value) in &*map {
            headers.insert(
                HeaderName::from_bytes(key.as_bytes())?,
                HeaderValue::from_str(value)?,
            );
        }
        Ok(headers)
    }
}

pub async fn init_client() -> Result<Client> {
    init_client_inner(true).await
}

pub async fn init_client_no_proxy() -> Result<Client> {
    init_client_inner(false).await
}

pub async fn init_client_inner(use_proxy: bool) -> Result<Client> {
    let proxy = &config::read().proxy;
    let client_builder = Client::builder().default_headers(HEADERS.to_header_map().await?);
    let client_builder = if !proxy.address.is_empty() && use_proxy {
        client_builder
            .proxy(Proxy::all(&proxy.address)?.basic_auth(&proxy.username, &proxy.password))
    } else {
        client_builder.no_proxy()
    };
    Ok(client_builder.build()?)
}

pub fn get_app_handle() -> &'static AppHandle<Wry> {
    APP_HANDLE.get().expect("Failed to get APP_HANDLE")
}

pub fn get_ts(mills: bool) -> i64 {
    let now = OffsetDateTime::now_utc();
    let sec = now.unix_timestamp();
    if mills {
        sec
    } else {
        sec * 1000 + (now.millisecond() as i64)
    }
}

pub fn random_string(len: usize) -> String {
    rand::rng()
        .sample_iter(&Alphanumeric)
        .take(len)
        .map(char::from)
        .collect()
}

pub fn get_unique_path(mut path: PathBuf) -> PathBuf {
    if !config::read().organize.auto_rename {
        return path;
    }
    let mut count = 1;
    let stem = path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or("file".into());

    let ext = path.extension().map(|e| e.to_string_lossy().to_string());
    while path.exists() {
        path.set_file_name(match &ext {
            Some(ext) => format!("{}_{}.{}", stem, count, ext),
            None => format!("{}_{}", stem, count),
        });
        count += 1;
    }
    path
}

pub fn process_err<T: ToString>(e: T, name: &str) -> T {
    let app = get_app_handle();
    log::error!("{name}: {}", e.to_string());
    let _ = ProcessError {
        name: name.into(),
        error: e.to_string(),
    }
    .emit(app);
    e
}

pub async fn get_image(path: &PathBuf, url: &String) -> TauriResult<()> {
    let client = init_client().await?;
    let response = client.get(url).send().await?;
    if response.status() != StatusCode::OK {
        return Err(TauriError::new(
            format!("Error while fetching thumb {url}"),
            Some(response.status()),
        ));
    }
    let bytes = response.bytes().await?;
    tokio::fs::write(path, &bytes).await?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn set_window(
    window: tauri::WebviewWindow,
    theme: Theme,
    window_effect: WindowEffect,
) -> TauriResult<(bool, Option<&'static str>)> {
    use tauri::{utils::config::WindowEffectsConfig, window::Color};
    #[cfg(target_os = "windows")]
    window.with_webview(move |webview| unsafe {
        (|| -> crate::TauriResult<()> {
            use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Settings5;
            use windows::core::Interface;
            let s = webview
                .controller()
                .CoreWebView2()
                .and_then(|c| c.Settings())
                .and_then(|s| s.cast::<ICoreWebView2Settings5>())?;
            #[cfg(not(debug_assertions))]
            s.SetAreBrowserAcceleratorKeysEnabled(false)?;
            s.SetAreDefaultContextMenusEnabled(false)?;
            s.SetIsPasswordAutosaveEnabled(false)?;
            s.SetIsGeneralAutofillEnabled(false)?;
            s.SetIsZoomControlEnabled(false)?;
            Ok(())
        })()
        .map_err(|e| process_err(e, "set_window"))
        .ok();
    })?;
    let theme = theme.as_tauri();
    let is_dark = theme == TauriTheme::Dark;
    window.set_theme(Some(theme))?;
    match window_effect.as_tauri() {
        Some(v) => {
            window.set_background_color(Some(Color(0, 0, 0, 0)))?;
            window.set_effects(WindowEffectsConfig {
                effects: vec![v],
                ..Default::default()
            })?;
            Ok((is_dark, None))
        }
        None => {
            let (hex, rgb) = if is_dark {
                ("#202020", Color(32, 32, 32, 255))
            } else {
                ("#f9f9f9", Color(249, 249, 249, 255))
            };
            window.set_background_color(Some(rgb))?;
            window.set_effects(WindowEffectsConfig {
                effects: vec![],
                ..Default::default()
            })?;
            Ok((is_dark, Some(hex)))
        }
    }
}
