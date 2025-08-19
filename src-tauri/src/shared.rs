use tauri::{http::{HeaderMap, HeaderName, HeaderValue}, AppHandle, Manager, Wry};
use std::{collections::BTreeMap, path::PathBuf, sync::{Arc, RwLock}};
use tauri_plugin_http::reqwest::{Client, Proxy};
use rand::{distr::Alphanumeric, Rng};
use serde::{Deserialize, Serialize};
use lazy_static::lazy_static;
use tokio::sync::OnceCell;
use tauri_specta::Event;
use serde_json::Value;
use anyhow::Result;
use specta::Type;
use chrono::Utc;

use crate::storage::{config::{
        self, Settings, SettingsConvert, SettingsDefault, SettingsFormat, SettingsProxy
    }, cookies};

lazy_static! {
    pub static ref READY: Arc<RwLock<bool>> = Arc::new(RwLock::new(false));
    pub static ref APP_HANDLE: Arc<OnceCell<AppHandle<Wry>>> = Arc::new(OnceCell::new());
    pub static ref CONFIG: RwLock<Arc<Settings>> = RwLock::new(Arc::new(Settings {
        add_metadata: true,
        auto_check_update: true,
        auto_download: false,
        block_pcdn: true,
        check_update: true,
        clipboard: true,
        default: SettingsDefault {
            res: 80,
            abr: 30280,
            enc: 7
        },
        down_dir: get_app_handle().path().desktop_dir().unwrap(),
        format: SettingsFormat {
            filename: "{taskType}_{title}".into(),
            folder: "{index}_{mediaType}_{title}".into(),
            favorite: "".into(),
        },
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
        max_conc: 3,
        notify: true,
        task_folder: true,
        temp_dir: get_app_handle().path().temp_dir().unwrap(),
        theme: Theme::Auto,
        proxy: SettingsProxy {
            address: String::new(),
            username: String::new(),
            password: String::new()
        },
        convert: SettingsConvert {
            danmaku: true,
            mp3: false,
        }
    }));
    pub static ref SECRET: Arc<RwLock<String>> = Arc::new(RwLock::new(String::new()));
    pub static ref WORKING_PATH: PathBuf = get_app_handle().path().app_data_dir().unwrap();
    pub static ref STORAGE_PATH: PathBuf = WORKING_PATH.join("Storage");
    pub static ref DATABASE_URL: String = format!("sqlite://{}", STORAGE_PATH.to_string_lossy());
}

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
    pub fn as_tauri(&self) -> Option<tauri::Theme> {
        match self {
            Theme::Light => Some(tauri::Theme::Light),
            Theme::Dark => Some(tauri::Theme::Dark),
            Theme::Auto => None,
        }
    }
}

#[derive(Clone, Serialize, Deserialize, Type, Event)]
pub struct SidecarError {
    pub name: String,
    pub error: String,
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
}

pub async fn init_headers() -> Result<BTreeMap<String, String>> {
    let mut map = BTreeMap::new();
    let cookies = cookies::load().await?
        .iter().map(|(name, value)|
            format!("{}={}", name, value.to_string().replace("\\\"", "").trim_matches('"'))
        ).collect::<Vec<_>>().join("; ");
    map.insert("Cookie".into(), cookies);
    map.insert("User-Agent".into(), USER_AGENT.into());
    map.insert("Referer".into(), "https://www.bilibili.com/".into());
    map.insert("Origin".into(), "https://www.bilibili.com".into());
    let app = get_app_handle();
    let headers_value: Value = serde_json::to_value(&map)?;
    let headers: Headers = serde_json::from_value(headers_value)?;
    app.run_on_main_thread(move || {
        let app = get_app_handle();
        let _ = headers.emit(app);
    })?;
    Ok(map)
}

pub async fn init_client() -> Result<Client> {
    init_client_inner(true).await
}

pub async fn init_client_no_proxy() -> Result<Client> {
    init_client_inner(false).await
}

pub async fn init_client_inner(use_proxy: bool) -> Result<Client> {
    let mut headers = HeaderMap::new();
    for (key, value) in init_headers().await? {
        headers.insert(
            HeaderName::from_bytes(key.as_bytes())?,
            HeaderValue::from_str(&value)?
        );
    }
    let proxy = &config::read().proxy;
    let client_builder = Client::builder()
        .default_headers(headers);
    let client_builder = if !proxy.address.is_empty() && use_proxy {
        client_builder.proxy(
            Proxy::all(&proxy.address)?
                .basic_auth(&proxy.username, &proxy.password)
        )
    } else {
        client_builder.no_proxy()
    };
    Ok(client_builder.build()?)
}

pub fn get_app_handle() -> &'static AppHandle<Wry> {
    APP_HANDLE.get().unwrap()
}

pub fn get_ts(mills: bool) -> i64 {
    let now = Utc::now();
    if mills { now.timestamp_millis() }
    else { now.timestamp() }
}

pub fn random_string(len: usize) -> String {
    rand::rng().sample_iter(&Alphanumeric)
        .take(len).map(char::from).collect()
}

pub fn get_unique_path(mut path: PathBuf) -> PathBuf {
    let mut count = 1;
    let stem = path.file_stem().unwrap().to_string_lossy().to_string();
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
    while !*READY.read().unwrap() {
        std::thread::sleep(std::time::Duration::from_millis(250));
    }
    log::error!("{name}: {}", e.to_string());
    SidecarError {
        name: name.into(), error: e.to_string(),
    }.emit(app).unwrap(); e
}

#[tauri::command]
#[specta::specta]
pub fn set_window(window: tauri::WebviewWindow, theme: Theme) -> crate::TauriResult<()> {
    use tauri::{utils::{config::WindowEffectsConfig, WindowEffect}, window::Color};
    use tauri_plugin_os::Version;
    #[cfg(target_os = "windows")]
    window.with_webview(|webview| unsafe {
        use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Settings5;
        use windows::core::Interface;
        let core = webview.controller().CoreWebView2().unwrap();
        let settings = core.Settings().unwrap().cast::<ICoreWebView2Settings5>().unwrap();
        #[cfg(not(debug_assertions))]
        settings.SetAreBrowserAcceleratorKeysEnabled(false).unwrap();
        settings.SetAreDefaultContextMenusEnabled(false).unwrap();
        settings.SetIsPasswordAutosaveEnabled(false).unwrap();
        settings.SetIsGeneralAutofillEnabled(false).unwrap();
        settings.SetIsZoomControlEnabled(false).unwrap();
    })?;
    window.set_theme(theme.as_tauri())?;
    let set_default = || {
        let theme = if theme == Theme::Auto {
            match dark_light::detect() {
                Ok(dark_light::Mode::Dark) => tauri::Theme::Dark,
                Ok(dark_light::Mode::Light) => tauri::Theme::Light,
                _ => tauri::Theme::Light,
            }
        } else { theme.as_tauri().unwrap() };
        window.set_background_color(Some(match theme {
            tauri::Theme::Dark => Color(32, 32, 32, 255),
            _ => Color(249, 249, 249, 255),
        }))?;
        Ok::<(), anyhow::Error>(())
    };
    match tauri_plugin_os::platform() {
        "windows" => if let Version::Semantic(major, minor, patch) = tauri_plugin_os::version() {
            if major < 6 || (major == 6 && minor < 2) {
                panic!("Unsupported Windows Version");
            } else if major >= 10 {
                if patch >= 22000 {
                    window.set_effects(WindowEffectsConfig {
                        effects: vec![WindowEffect::Mica],
                        ..Default::default()
                    })?
                } else if patch < 18362 || patch > 22000 {
                    window.set_effects(WindowEffectsConfig {
                        effects: vec![WindowEffect::Acrylic],
                        ..Default::default()
                    })?
                } else if patch < 22621 {
                    set_default()?
                }
            }
        } else { set_default()? },
        "macos" => window.set_effects(WindowEffectsConfig {
            effects: vec![WindowEffect::Sidebar],
            ..Default::default()
        })?,
        _ => set_default()?
    }
    Ok(())
}