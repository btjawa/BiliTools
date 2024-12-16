// Prevents additional console window on Windows in release, DO NOT REMOVE!!
// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod services;
pub mod storage;
pub mod shared;

use config::rw_config;
use lazy_static::lazy_static;
use serde::{Serialize, Deserialize};
use serde_json::Value;
use shared::{init_headers, APP_HANDLE, SECRET};
use tauri_plugin_shell::ShellExt;
use std::{collections::VecDeque, env, panic, sync::{Arc, RwLock}};
use tokio::fs;
use tauri::{async_runtime, Manager};
use rand::{distributions::Alphanumeric, Rng};
use walkdir::WalkDir;
use services::*;
use storage::*;

#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

#[cfg(target_os = "windows")]
use window_vibrancy::{apply_blur, apply_mica};

lazy_static! {
    static ref READY: Arc<RwLock<bool>> = Arc::new(RwLock::new(false));
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct InitData<'a> {
    downloads: VecDeque<aria2c::QueueInfo>,
    hash: &'a str,
}

#[tauri::command]
async fn get_size(path: String, event: tauri::ipc::Channel<u64>) -> Result<(), String> {
    let mut bytes = 0u64;
    let mut count = 0;
    for entry in WalkDir::new(&path).into_iter().filter_map(Result::ok) {
        let path = entry.path();
        if path.is_file() {
            // let file_name = path.file_name().unwrap().to_str().unwrap();
            match fs::metadata(path).await {
                Ok(meta) => {
                    bytes += meta.len();
                    count += 1;
                    if count > 200 {
                        event.send(bytes).unwrap();
                        count = 0;
                    }
                },
                Err(_) => continue
            }
        }
    }
    event.send(bytes).unwrap();
    Ok(())
}

#[tauri::command]
async fn clean_cache(path: String) -> Result<(), String> {
    if path.ends_with("Storage") {
        let _ = fs::remove_file(&path).await;
    } else {
        let mut entries = fs::read_dir(&path).await.map_err(|e| e.to_string())?;
        while let Some(entry) = entries.next_entry().await.map_err(|e| e.to_string())? {
            let path = entry.path();
            if path.is_dir() {
                async_runtime::spawn(async move { let _ = fs::remove_dir_all(&path).await; });
            } else {
                async_runtime::spawn(async move { let _ = fs::remove_file(&path).await; });
            }
        }
    }
    Ok(())
}

#[tauri::command]
async fn write_binary(secret: String, path: String, contents: Vec<u8>) -> Result<(), String> {
    if secret != *SECRET.read().unwrap() {
        return Err("403 Forbidden".into())
    }
    fs::write(&path, contents).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn xml_to_ass(app: tauri::AppHandle, secret: String, path: String, filename: String, contents: Vec<u8>) -> Result<(), String> {
    let config = shared::CONFIG.read().unwrap().clone();
    let input = config.temp_dir.join("com.btjawa.bilitools").join(format!("{filename}.xml"));
    write_binary(secret, input.to_string_lossy().into(), contents).await?;
    app.shell().sidecar("./bin/DanmakuFactory").unwrap()
        .args(["-i", input.to_str().unwrap(), "-o", &path])
        .status().await.map_err(|e| e.to_string())?;

    fs::remove_file(input).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn set_theme(window: tauri::Window, theme: tauri::Theme) -> Result<(), String> {
    window.set_theme(Some(theme)).unwrap();
    Ok(())
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
async fn init(secret: String) -> Result<InitData<'static>, Value> {
    if secret != *SECRET.read().unwrap() {
        return Err("403 Forbidden".into())
    }
    rw_config("read", None, secret).await?;
    login::stop_login();
    login::get_extra_cookies().await?;
    init_headers().await?;
    downloads::load().await.map_err(|e| e.to_string())?;
    let downloads = aria2c::COMPLETE_QUEUE.read().await.clone();
    let hash = env!("GIT_HASH");
    Ok(InitData { downloads, hash })
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    *SECRET.write().unwrap() = rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(10).map(char::from)
        .collect();
    #[cfg(target_os = "windows")]
    let mut _job: Option<win32job::Job> = None;
    #[cfg(target_os = "windows")]
    {
        let j = win32job::Job::create()?;
        let mut info = j.query_extended_limit_info()?;
        info.limit_kill_on_job_close();
        j.set_extended_limit_info(&mut info)?;
        j.assign_current_process()?;
        _job = Some(j);
    }
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
            log::info!("BiliTools v{}", VERSION.unwrap_or("unknown"));
            panic::set_hook(Box::new(move |e| { e.to_string(); }));
            APP_HANDLE.set(app.app_handle().clone()).unwrap();
            let window = app.get_webview_window("main").unwrap();
            async_runtime::spawn(async move {
                storage::init().await.map_err(|e| e.to_string())?;
                services::init().await.map_err(|e| e.to_string())?;
                Ok::<(), String>(())
            });
            #[cfg(debug_assertions)]
            window.open_devtools();
            match tauri_plugin_os::version() {
                tauri_plugin_os::Version::Semantic(major, _minor, _build) => {
                    #[cfg(target_os = "windows")]
                    if major == 10 {
                        if _build > 22000 {
                            apply_mica(&window, None)?;
                        } else if _build >= 1903 {
                            // apply_blur(&window, None)?;
                        } else {
                            // window_vibrancy::apply_acrylic(&window, None)?;
                        }
                    } else {
                        apply_blur(&window, None)?;
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
            ready, init, get_size, clean_cache, write_binary, xml_to_ass, set_theme,
            login::exit, login::sms_login, login::pwd_login, login::switch_cookie, login::scan_login, login::refresh_cookie,
            crate::config::rw_config,
            aria2c::push_back_queue, aria2c::process_queue, aria2c::post_aria2c])
        .run(tauri::generate_context!())
        .expect("error while running BiliTools");
    Ok(())
}