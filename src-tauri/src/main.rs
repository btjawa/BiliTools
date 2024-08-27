// Prevents additional console window on Windows in release, DO NOT REMOVE!!
// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod logger;
mod services;

use lazy_static::lazy_static;
use backtrace::Backtrace;
use sea_orm::FromJsonQueryResult;
use serde_json::Value;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, env, fs, panic, path::PathBuf, sync::{Arc, RwLock}};
use tauri::{async_runtime, Manager, WebviewWindow};
use tauri_plugin_http::reqwest::{Client, header::{HeaderMap, HeaderName, HeaderValue}};
use rand::{distributions::Alphanumeric, Rng};
use walkdir::WalkDir;
use services::{*, storage::*};

#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

#[cfg(target_os = "windows")]
use window_vibrancy::{apply_acrylic, apply_blur};

lazy_static! {
    static ref WORKING_DIR: PathBuf = dirs_next::data_local_dir().unwrap().join("com.btjawa.bilitools");
    static ref DOWNLOAD_DIR: Arc<RwLock<PathBuf>> = Arc::new(RwLock::new(dirs_next::desktop_dir().unwrap()));
    static ref TEMP_DIR: Arc<RwLock<PathBuf>> = Arc::new(RwLock::new(PathBuf::from(env::temp_dir())));
    static ref CURRENT_BIN: PathBuf = {
        let root = env::current_exe().unwrap().parent().unwrap().to_path_buf();
        root.join(if root.join("bin").exists() { "bin" } else { "../Resources/bin" })
    };
    static ref SECRET: Arc<RwLock<String>> = Arc::new(RwLock::new(String::new()));
    static ref READY: Arc<RwLock<bool>> = Arc::new(RwLock::new(false));
}

fn handle_err<E: std::fmt::Display>(e: E) -> String {
    let err_msg = e.to_string();
    let bt = Backtrace::new();
    log::error!("{}\n{:?}", err_msg, bt);
    get_window().emit("error", &err_msg).unwrap();
    e.to_string()
}

async fn init_headers() -> Result<HashMap<String, String>, String> {
    let mut headers = HashMap::new();
    let cookies = cookies::load().await.map_err(|e| handle_err(e))?;
    headers.insert("Cookie".into(), cookies.iter()
    .filter_map(|(_, attr)| {
        attr.get("value").and_then(Value::as_str).map(|value| {
            let name = attr.get("name").and_then(Value::as_str).unwrap_or_default();
            format!("{}={}", name, value)
        })
    }).collect::<Vec<_>>().join("; "));
    headers.insert("User-Agent".into(), "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36".into());
    headers.insert("Referer".into(), "https://www.bilibili.com".into());
    headers.insert("Origin".into(), "https://www.bilibili.com".into());
    Ok(headers)
}

async fn init_client() -> Result<Client, String> {
    let mut headers = HeaderMap::new();
    for (key, value) in init_headers().await? {
    headers.insert(
        HeaderName::from_bytes(key.as_bytes()).unwrap(),
        HeaderValue::from_str(&value).unwrap()
    );}
    Ok(Client::builder()
        .default_headers(headers)
        .build()
        .unwrap())
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult)]
struct Settings {
    max_conc: i64,
    temp_dir: String,
    down_dir: String,
    df_dms: i64,
    df_ads: i64,
    df_cdc: i64
}

#[tauri::command]
async fn handle_temp(action: String) -> Result<String, String> {
    let mut bytes = 0;
    let target_dir = TEMP_DIR.read().unwrap().join("com.btjawa.bilitools");
    let walker = WalkDir::new(target_dir).into_iter();
    for entry in walker.filter_map(Result::ok).filter(|e| e.file_type().is_dir()) {
        let mut have_aria2 = false;
        let mut crr_bytes: u64 = 0;
        for entry in WalkDir::new(entry.path()).into_iter().filter_map(Result::ok) {
            let path = entry.path();
            if path.is_file() {
                let file_name = path.file_name().unwrap().to_str().unwrap();
                let file_size = fs::metadata(path).unwrap().len();
                if file_name.ends_with(".aria2") {
                    have_aria2 = true;
                }
                if action == "calc" || (action == "clear" && !have_aria2) {
                    crr_bytes += file_size;
                }
            }
        }
        if action == "clear" && !have_aria2 {
            let _ = fs::remove_dir_all(&entry.path());
        } else {
            bytes += crr_bytes; 
        }
    }
    const KIB: u64 = 1024;
    const MIB: u64 = KIB * 1024;
    const GIB: u64 = MIB * 1024;
    let r = if bytes >= GIB { format!("{:.2} GB", bytes as f64 / GIB as f64) }
    else if bytes >= MIB { format!("{:.2} MB", bytes as f64 / MIB as f64) }
    else { format!("{:.2} KB", bytes as f64 / KIB as f64) };
    Ok(r)
}

#[tauri::command]
fn rw_config(action: &str, settings: Option<HashMap<String, Value>>, secret: String) -> Result<&str, String> {
    let window = get_window();
    if secret != *SECRET.read().unwrap() {
        return Err("403 Forbidden".into())
    }
    let work_dir = WORKING_DIR.clone();
    let config = Arc::new(RwLock::new(Settings {
        temp_dir: TEMP_DIR.read().unwrap().to_string_lossy().into_owned(),
        down_dir: DOWNLOAD_DIR.read().unwrap().to_string_lossy().into_owned(),
        max_conc: *aria2c::MAX_CONC_DOWNS.read().unwrap(),
        df_dms: 32,
        df_ads: 30280,
        df_cdc: 7
    }));

    let update_config = |source: HashMap<String, Value>| {
        let mut config = config.write().unwrap();
        let mut config_json = serde_json::to_value(&*config).unwrap();
        if let Value::Object(ref mut config_obj) = config_json {
            for (key, value) in source {
                config_obj.insert(key, value);
            }
        }
        *config = serde_json::from_value(config_json).unwrap();
    };

    if action == "init" || action == "read" {
        if let Ok(s) = fs::read_to_string(work_dir.join("config.json")) {
            if let Ok(local_config) = serde_json::from_str::<HashMap<String, Value>>(&s) {
                update_config(local_config)
            }
        }
    } else if action == "write" {
        if let Some(new_config) = settings { update_config(new_config) }
    }

    let config = config.read().unwrap();
    if action != "read" {
        fs::write(work_dir.join("config.json"), serde_json::to_string_pretty(&*config).unwrap()).map_err(|e| handle_err(e))?;
        *aria2c::MAX_CONC_DOWNS.write().unwrap() = config.max_conc;
        *TEMP_DIR.write().unwrap() = PathBuf::from(&config.temp_dir);
        *DOWNLOAD_DIR.write().unwrap() = PathBuf::from(&config.down_dir);
        log::info!("{:?}", config);
    }
    window.emit("settings", config.clone()).unwrap();
    Ok(action)
}

#[tauri::command]
async fn save_file(content: Vec<u8>, path: String, secret: String) -> Result<String, String> {
    if secret != *SECRET.read().unwrap() {
        return Err("403 Forbidden".into())
    }
    if let Err(e) = fs::write(path.clone(), content) {
        handle_err(e.to_string());
        Err(e.to_string())
    } else { Ok(path) }
}

#[tauri::command]
async fn ready() -> Result<String, String> {
    #[cfg(not(debug_assertions))]
    { if *READY.read().unwrap() {
        return Ok("403 Forbidden".into());
    } }
    *READY.write().unwrap() = true;
    Ok(SECRET.read().unwrap().to_string())
}

#[tauri::command]
async fn init(window: WebviewWindow, secret: String) -> Result<(), String> {
    if secret != *SECRET.read().unwrap() {
        return Err("403 Forbidden".into())
    }
    rw_config("read", None, secret)?;
    window.emit("headers", init_headers().await?).unwrap();
    return Ok(());
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    logger::init_logger().map_err(|e| e.to_string())?;
    *SECRET.write().unwrap() = rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(10).map(char::from)
        .collect();
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            println!("{}, {argv:?}, {cwd}", app.package_info().name);
            app.emit("single-instance", (argv, cwd)).unwrap();
            let window = app.get_webview_window("main").unwrap();
            window.unminimize().unwrap();
            window.set_focus().unwrap();
        }))
        .setup(|app| {
            panic::set_hook(Box::new(move |e| { handle_err(e); }));
            let app_handle = app.app_handle().clone();
            let window = app_handle.get_webview_window("main").unwrap();
            async_runtime::spawn(async move {
                services::init(app_handle).await.map_err(|e| handle_err(e))?;
                Ok::<(), String>(())
            });
            #[cfg(target_os = "macos")]
            apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None)?;
            #[cfg(target_os = "windows")]
            match tauri_plugin_os::version() {
                tauri_plugin_os::Version::Semantic(major, minor, build) => {
                    if build > 22000 || (major == 10 && build <= 18362) { // Windows 10 & 11 Early Version
                        apply_acrylic(&window, Some((18, 18, 18, 160)))?;
                    } else if (build > 18362 && build <= 22000) || (major == 6 && minor == 1) { // Windows 7 & Windows 10 v1903+ to Windows 11 22000
                        apply_blur(&window, Some((18, 18, 18, 160)))?;
                    }
                },
                _ => log::error!("Failed to determine OS version"),
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![ready, init, rw_config,
            login::exit, login::refresh_cookie, login::scan_login, login::sms_login, login::pwd_login,
            save_file, aria2c::handle_download, aria2c::push_back_queue,
            aria2c::process_queue, handle_temp, handle_service])
        .run(tauri::generate_context!())
        .expect("error while running BiliTools");
    Ok(())
}