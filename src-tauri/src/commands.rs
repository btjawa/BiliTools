// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use std::{env, path::PathBuf, sync::Arc};
use tauri::{async_runtime, Manager};
use serde::Serialize;
use anyhow::anyhow;
use specta::Type;
use tokio::fs;

// Re-export for lib.rs to register commands
pub use crate::{
    services::{
        login::{
            self, stop_login, exit, sms_login, pwd_login, switch_cookie, scan_login, refresh_cookie
        },
        queue::{
            self, submit_task, process_queue, task_event, update_max_conc
        },
        ffmpeg,
    },
    storage::{
        config::{
            self, config_write
        },
        cookies,
    },
    shared::{
        self, set_window
    },
    errors::{TauriResult, TauriError},
};

#[derive(Serialize, Type)]
pub struct Paths {
    log: PathBuf,
    temp: PathBuf,
    webview: PathBuf,
    database: PathBuf,
}

#[derive(Serialize, Type)]
pub struct InitData {
    version: String,
    hash: String,
    // downloads: Vec<Arc<aria2c::QueueInfo>>,
    config: Arc<config::Settings>,
    paths: Paths,
}

#[tauri::command(async)]
#[specta::specta]
pub async fn get_size(path: String, event: tauri::ipc::Channel<u64>) -> TauriResult<()> {
    let mut bytes = 0u64;
    let mut count = 0;
    for entry in walkdir::WalkDir::new(&path).into_iter().filter_map(Result::ok) {
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

#[tauri::command(async)]
#[specta::specta]
pub async fn clean_cache(path: String) -> TauriResult<()> {
    if path.ends_with("Storage") {
        let _ = fs::remove_file(&path).await;
    } else {
        let mut entries = fs::read_dir(&path).await?;
        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();
            async_runtime::spawn(async move {
                let _ = if path.is_dir() {
                    fs::remove_dir_all(&path).await
                } else {
                    fs::remove_file(&path).await
                };
            });
        }
    }
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn ready() -> TauriResult<String> {
    #[cfg(not(debug_assertions))]
    if *shared::READY.read().unwrap() {
        return Ok("403 Forbidden".into());
    }
    *shared::READY.write().unwrap() = true;
    Ok(shared::SECRET.read().unwrap().to_string())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn init(app: tauri::AppHandle, secret: String) -> TauriResult<InitData> {
    if secret != *shared::SECRET.read().unwrap() {
        return Err(anyhow!("403 Forbidden").into())
    }
    let version = app.package_info().version.to_string();
    let hash = env!("GIT_HASH").to_string();
    // let archives = archive::load().await?;
    let config = config::read();
    let path = app.path();
    let paths = Paths {
        log: path.app_log_dir()?,
        temp: config::read().temp_dir(),
        webview: match env::consts::OS {
            "macos" => path.app_cache_dir()?.join("../WebKit/BiliTools/WebsiteData"),
            "linux" => path.app_cache_dir()?.join("bilitools"),
            _ => path.app_local_data_dir()?.join("EBWebView"), // windows
        },
        database: path.app_data_dir()?.join("Storage")
    };
    Ok(InitData { version, hash, config, paths })
}

#[tauri::command(async)]
#[specta::specta]
pub async fn init_login(secret: String) -> TauriResult<()> {
    if secret != *shared::SECRET.read().unwrap() {
        return Err(anyhow!("403 Forbidden").into())
    }
    login::stop_login();
    login::get_buvid().await?;
    login::get_bili_ticket().await?;
    login::get_uuid().await?;
    shared::init_headers().await?;
    Ok(())
}