use std::{collections::HashMap, env, path::PathBuf, sync::{Arc, RwLock}, time::{SystemTime, UNIX_EPOCH}};
use lazy_static::lazy_static;
use regex::Regex;
use tauri_plugin_http::reqwest::{Client, Proxy};
use tokio::sync::OnceCell;
use tauri::{http::{HeaderMap, HeaderName, HeaderValue}, AppHandle, Emitter, Manager, WebviewWindow, Wry};

use crate::{cookies, config::{Settings, SettingsProxy}};

lazy_static! {
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
        proxy: SettingsProxy {
            addr: String::new(),
            username: String::new(),
            password: String::new()
        }
    }));
    pub static ref SECRET: Arc<RwLock<String>> = Arc::new(RwLock::new(String::new()));
    pub static ref WORKING_PATH: PathBuf = get_app_handle().path().app_data_dir().unwrap();
    pub static ref STORAGE_PATH: PathBuf = WORKING_PATH.join("Storage");
    pub static ref BINARY_PATH: PathBuf = env::current_exe().unwrap().parent().unwrap().to_path_buf().join("bin");
}

pub async fn init_headers() -> Result<HashMap<String, String>, String> {
    let mut headers = HashMap::new();
    let cookies = cookies::load().await.map_err(|e| e.to_string())?
        .iter().map(|(name, value)|
            format!("{}={}", name, value.to_string().replace("\\\"", "").trim_matches('"'))
        ).collect::<Vec<_>>().join("; ");
    headers.insert("Cookie".into(), cookies);
    headers.insert("User-Agent".into(), "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36".into());
    headers.insert("Referer".into(), "https://www.bilibili.com".into());
    headers.insert("Origin".into(), "https://www.bilibili.com".into());
    get_window().emit("headers", &headers).unwrap();
    Ok(headers)
}

pub async fn init_client() -> Result<Client, String> {
    let mut headers = HeaderMap::new();
    for (key, value) in init_headers().await? {
    headers.insert(
        HeaderName::from_bytes(key.as_bytes()).unwrap(),
        HeaderValue::from_str(&value).unwrap()
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
            .map_err(|e| e.to_string())?
            .basic_auth(&config.proxy.username, &config.proxy.password)
        )
    } else { client_builder };
    Ok(client_builder.build().unwrap())
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