// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use std::{collections::VecDeque, env, path::PathBuf, sync::Arc};
use tauri_plugin_shell::ShellExt;
use tauri::async_runtime;
use serde_json::Value;
use serde::Serialize;
use specta::Type;
use tokio::fs;

// Re-export for lib.rs to register commands
pub use crate::{
    services::{
        login::{
            self, stop_login, exit, sms_login, pwd_login, switch_cookie, scan_login, refresh_cookie
        },
        aria2c::{
            self, push_back_queue, process_queue, post_aria2c, remove_aria2c_task
        },
        ffmpeg
    },
    storage::{
        config::{self, rw_config},
        cookies,
        downloads,
    },
    shared,
};

#[derive(Serialize, Type)]
pub struct InitData {
    downloads: VecDeque<Arc<aria2c::QueueInfo>>,
    hash: String,
    binary_path: String,
}

#[tauri::command(async)]
#[specta::specta]
pub async fn get_size(path: String, event: tauri::ipc::Channel<u64>) -> Result<(), String> {
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
pub async fn clean_cache(path: String) -> Result<(), String> {
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

#[tauri::command(async)]
#[specta::specta]
pub async fn write_binary(secret: String, path: String, contents: Vec<u8>) -> Result<(), String> {
    if secret != *shared::SECRET.read().unwrap() {
        return Err("403 Forbidden".into())
    }
    fs::create_dir_all(PathBuf::from(&path).parent().unwrap()).await.map_err(|e| e.to_string())?;
    let mut _path = PathBuf::from(path);
    if _path.exists() {
        if let (Some(stem), Some(ext)) = (_path.file_stem(), _path.extension()) {
            _path.set_file_name(format!("{}_1.{}", stem.to_string_lossy(), ext.to_string_lossy()));
        }
    }
    fs::write(&_path, contents).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn xml_to_ass(app: tauri::AppHandle, secret: String, path: String, filename: String, contents: Vec<u8>) -> Result<(), String> {
    let input = {
        let config = shared::CONFIG.read().unwrap();
        config.temp_dir.join("com.btjawa.bilitools").join(format!("{filename}_{}.xml", shared::get_ts(true)))
    };
    write_binary(secret, input.to_string_lossy().into(), contents).await?;
    let output = app.shell().sidecar(format!("{}/DanmakuFactory", &*shared::BINARY_RELATIVE)).unwrap()
        .args(["-i", input.to_str().unwrap(), "-o", &path])
        .output().await.map_err(|e| e.to_string())?;

    log::info!("{:?}", String::from_utf8_lossy(&output.stdout));
    fs::remove_file(input).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn ready() -> Result<String, String> {
    #[cfg(not(debug_assertions))]
    if *READY.read().unwrap() {
        return Ok("403 Forbidden".into());
    }
    *shared::READY.write().unwrap() = true;
    Ok(shared::SECRET.read().unwrap().to_string())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn init(secret: String) -> Result<InitData, Value> {
    if secret != *shared::SECRET.read().unwrap() {
        return Err("403 Forbidden".into())
    }
    rw_config("read", None, secret).await?;
    login::stop_login();
    login::get_extra_cookies().await?;
    shared::init_headers().await?;
    downloads::load().await.map_err(|e| e.to_string())?;
    let downloads = {
        let queue = aria2c::COMPLETE_QUEUE.read().await;
        queue.clone()
    };
    let hash = env!("GIT_HASH").to_string();
    let binary_path = shared::BINARY_PATH.to_string_lossy().to_string();
    Ok(InitData { downloads, hash, binary_path })
}