// Prevents additional console window on Windows in release, DO NOT REMOVE!!
// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod services;

use lazy_static::lazy_static;
use sea_orm::FromJsonQueryResult;
use serde_json::Value;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, env, fs, panic, path::PathBuf, sync::{Arc, RwLock}};
use tauri::{async_runtime, Emitter, Manager};
use tauri_plugin_http::reqwest::{Client, header::{HeaderMap, HeaderName, HeaderValue}, Proxy};
use rand::{distributions::Alphanumeric, Rng};
use walkdir::WalkDir;
use services::{*, storage::*};

#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

#[cfg(target_os = "windows")]
use window_vibrancy::{apply_acrylic, apply_blur};

lazy_static! {
    static ref WORKING_DIR: PathBuf = get_app_handle().path().app_data_dir().unwrap();
    static ref CONFIG: Arc<RwLock<Settings>> = Arc::new(RwLock::new(Settings {
        temp_dir: env::temp_dir(),
        down_dir: get_app_handle().path().desktop_dir().unwrap(),
        max_conc: 3,
        df_dms: 32,
        df_ads: 30280,
        df_cdc: 7,
        auto_check_update: true,
        proxy: SettingsProxy {
            addr: String::new(),
            username: String::new(),
            password: String::new()
        }
    }));
    static ref CURRENT_BIN: PathBuf = {
        let root = env::current_exe().unwrap().parent().unwrap().to_path_buf();
        root.join(if root.join("bin").exists() { "bin" } else { "../Resources/bin" })
    };
    static ref SECRET: Arc<RwLock<String>> = Arc::new(RwLock::new(String::new()));
    static ref READY: Arc<RwLock<bool>> = Arc::new(RwLock::new(false));
}

async fn init_headers() -> Result<HashMap<String, String>, String> {
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

async fn init_client() -> Result<Client, String> {
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

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult)]
struct Settings {
    max_conc: usize,
    temp_dir: PathBuf,
    down_dir: PathBuf,
    df_dms: usize,
    df_ads: usize,
    df_cdc: usize,
    auto_check_update: bool,
    proxy: SettingsProxy
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult)]
struct SettingsProxy {
    addr: String,
    username: String,
    password: String
}

#[tauri::command]
async fn get_size(path: String, event: tauri::ipc::Channel<usize>) -> Result<usize, String> {
    let mut bytes = 0usize;
    let mut _have_aria2 = false;
    for entry in WalkDir::new(&path).into_iter().filter_map(Result::ok) {
        let path = entry.path();
        if path.is_file() {
            let file_name = path.file_name().unwrap().to_str().unwrap();
            let file_size = fs::metadata(path).unwrap().len() as usize;
            if file_name.ends_with(".aria2") {
                _have_aria2 = true;
            }
            bytes += file_size;
            event.send(bytes).unwrap();
        }
    }
    Ok(bytes)
}

#[tauri::command]
async fn clean_cache(path: String, ptype: String) -> Result<(), String> {
    if ptype == "database" {
        if let Err(_) = fs::remove_file(&path) {}
    } else {
        let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;
        for entry in entries {
            let entry = match entry {
                Ok(entry) => entry,
                Err(_) => continue
            };
            let path = entry.path();
            if path.is_dir() {
                if let Err(_) = fs::remove_dir_all(&path) {}
            } else {
                if let Err(_) = fs::remove_file(&path) {}
            }
        }
    }
    Ok(())
}

#[tauri::command]
async fn rw_config(action: &str, settings: Option<HashMap<String, Value>>, secret: String) -> Result<&str, String> {
    let window = get_window();
    if secret != *SECRET.read().unwrap() {
        return Err("403 Forbidden".into())
    }
    let update_config = |source: HashMap<String, Value>| {
        let mut config = CONFIG.write().unwrap();
        let mut config_json = serde_json::to_value(&*config).unwrap();
        if let Value::Object(ref mut config_obj) = config_json {
            for (key, value) in source {
                config_obj.insert(key.clone(), value.clone());
                async_runtime::spawn(async move {
                    config::insert(key, value).await.map_err(|e| e.to_string()).unwrap();
                });
            }
        }
        *config = serde_json::from_value(config_json).map_err(|e| e.to_string()).unwrap();
    };
    if action == "init" || action == "read" {
        update_config(config::load().await.map_err(|e| e.to_string())?);
    } else if action == "write" {
        if let Some(new_config) = settings { update_config(new_config.clone()) }
    }
    let config = CONFIG.read().unwrap().clone();
    if action != "read" {
        if let Value::Object(map) = serde_json::to_value(&config).unwrap() {
            update_config(map.into_iter().collect::<HashMap<String, Value>>());
        }
        #[cfg(debug_assertions)]
        log::info!("{:?}", config)
    }
    window.emit("rw_config:settings", config).unwrap();
    Ok(action)
}

#[tauri::command]
async fn ready() -> Result<String, String> {
    #[cfg(not(debug_assertions))]
    if *READY.read().unwrap() {
        return Ok("403 Forbidden".into());
    }
    *READY.write().unwrap() = true;
    Ok(SECRET.read().unwrap().to_string())
}

#[tauri::command]
async fn init(secret: String) -> Result<(), Value> {
    if secret != *SECRET.read().unwrap() {
        return Err("403 Forbidden".into())
    }
    rw_config("read", None, secret).await?;
    init_headers().await?;
    login::stop_login();
    login::get_extra_cookies().await?;
    Ok(())
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    *SECRET.write().unwrap() = rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(10).map(char::from)
        .collect();
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_log::Builder::new()
            .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
            .target(tauri_plugin_log::Target::new(
                tauri_plugin_log::TargetKind::Webview,
            ))
            .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
            .level(log::LevelFilter::Info)
            .level_for("sqlx::query", log::LevelFilter::Warn)
        .build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            let windows = app.webview_windows();
            windows.values().next().expect("Sorry, no window found")
            .set_focus().expect("Can't Bring Window to Focus");
        }))
        .setup(|app| {
            const VERSION: Option<&str> = option_env!("CARGO_PKG_VERSION");
            log::info!("BiliTools v{}", VERSION.unwrap_or("unkown"));
            panic::set_hook(Box::new(move |e| { e.to_string(); }));
            let app_handle = app.app_handle().clone();
            let window = app_handle.get_webview_window("main").unwrap();
            async_runtime::spawn(async move {
                services::init(app_handle).await.map_err(|e| e.to_string())?;
                Ok::<(), String>(())
            });
            match tauri_plugin_os::version() {
                tauri_plugin_os::Version::Semantic(major, _minor, build) => {
                    #[cfg(target_os = "windows")]
                    if major == 10 && build >= 1903 {
                        apply_acrylic(&window, Some((18, 18, 18, 160)))?;
                    } else {
                        apply_blur(&window, Some((18, 18, 18, 160)))?;
                    }
                    #[cfg(target_os = "macos")]
                    if major >= 10 {
                        apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None)?;
                    }
                },
                _ => log::error!("Failed to determine OS version"),
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ready, init, rw_config, get_size, clean_cache,
            login::exit, login::sms_login, login::pwd_login, login::switch_cookie, login::scan_login, login::refresh_cookie,
            aria2c::handle_download, aria2c::push_back_queue, aria2c::process_queue])
        .run(tauri::generate_context!())
        .expect("error while running BiliTools");
    Ok(())
}