use tauri::{http::{HeaderMap, HeaderName, HeaderValue}, AppHandle, Manager, Wry};
use std::{collections::BTreeMap, env, path::PathBuf, sync::{Arc, RwLock}};
use tauri_plugin_http::reqwest::{Client, Proxy};
use rand::{distr::Alphanumeric, Rng};
use serde::{Deserialize, Serialize};
use lazy_static::lazy_static;
use anyhow::{anyhow, Result};
use tokio::sync::OnceCell;
use tauri_specta::Event;
use serde_json::Value;
use specta::Type;
use chrono::Utc;

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
        auto_check_update: true,
        auto_download: false,
        theme: Theme::Auto,
        proxy: SettingsProxy {
            addr: String::new(),
            username: String::new(),
            password: String::new()
        },
        advanced: SettingsAdvanced {
            prefer_pb_danmaku: true,
            add_metadata: true,
            filename_format: "{index}_{title}".into()
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

impl From<Theme> for tauri::Theme {
    fn from(theme: Theme) -> Self {
        match theme {
            Theme::Light => tauri::Theme::Light,
            Theme::Dark => tauri::Theme::Dark,
            Theme::Auto => {
                match dark_light::detect() {
                    Ok(dark_light::Mode::Dark) => tauri::Theme::Dark,
                    Ok(dark_light::Mode::Light) => tauri::Theme::Light,
                    Ok(dark_light::Mode::Unspecified) => tauri::Theme::Light,
                    Err(_) => tauri::Theme::Light,
                }
            },
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
    #[serde(flatten)]
    extra: BTreeMap<String, String>,
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
    let headers_value: Value = serde_json::to_value(&map)?;
    let headers: Headers = serde_json::from_value(headers_value)?;
    headers.emit(&get_app_handle()).unwrap();
    Ok(map)
}

pub async fn init_client() -> Result<Client> {
    init_client_inner(true).await
}

pub async fn init_client_no_proxy() -> Result<Client> {
    init_client_inner(false).await
}

pub async fn init_client_inner(proxy: bool) -> Result<Client> {
    let mut headers = HeaderMap::new();
    for (key, value) in init_headers().await? {
        headers.insert(
            HeaderName::from_bytes(key.as_bytes())?,
            HeaderValue::from_str(&value)?
        );
    }
    let config = CONFIG.read().unwrap();
    let client_builder = Client::builder()
        .default_headers(headers);
    let client_builder = if !config.proxy.addr.is_empty() && proxy {
        let proxy = Proxy::all(&config.proxy.addr)?
            .basic_auth(&config.proxy.username, &config.proxy.password);
        client_builder.proxy(proxy)
    } else {
        client_builder.no_proxy()
    };
    Ok(client_builder.build()?)
}

pub fn get_app_handle() -> AppHandle<Wry> {
    APP_HANDLE.get().unwrap().clone()
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

pub fn process_err<T: ToString>(e: T, name: &str) -> T {
    let app = get_app_handle();
    while !*READY.read().unwrap() {
        std::thread::sleep(std::time::Duration::from_millis(250));
    }
    SidecarError {
        name: name.into(), error: e.to_string(),
    }.emit(&app).unwrap(); e
}

pub fn set_window(window: tauri::WebviewWindow, theme: Option<tauri::Theme>) -> Result<()> {
    use tauri::utils::{config::WindowEffectsConfig, WindowEffect};
    use tauri_plugin_os::Version;
    #[cfg(all(target_os = "windows", not(debug_assertions)))]
    window.with_webview(|webview| unsafe {
        use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Settings4;
        use windows::core::Interface;
        let core = webview.controller().CoreWebView2().unwrap();
        let settings = core.Settings().unwrap().cast::<ICoreWebView2Settings4>().unwrap();
        settings.SetAreBrowserAcceleratorKeysEnabled(false).unwrap();
        settings.SetIsGeneralAutofillEnabled(false).unwrap();
        settings.SetIsPasswordAutosaveEnabled(false).unwrap();
    })?;
    let set_default = || {
        let mut c = 0;
        let theme: tauri::Theme = if let Some(theme) = theme { theme }
        else { Theme::Auto.into() };
        match theme {
            tauri::Theme::Dark => c = 32,
            tauri::Theme::Light => c = 249,
            _ => ()
        }
        window.set_background_color(Some(tauri::window::Color(c, c, c, 255)))?;
        Ok::<(), anyhow::Error>(())
    };
    match tauri_plugin_os::platform() {
        "windows" => if let Version::Semantic(major, minor, patch) = tauri_plugin_os::version() {
            if major < 6 || (major == 6 && minor < 2) {
                return Err(anyhow!("Unsupported Windows Version"));
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
