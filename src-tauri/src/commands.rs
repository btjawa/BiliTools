// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use std::{env, path::PathBuf, sync::Arc};
use tauri_plugin_shell::ShellExt;
use tauri::async_runtime;
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
        aria2c::{
            self, push_back_queue, process_queue, toggle_pause, remove_task
        },
        ffmpeg,
    },
    storage::{
        config::{self, rw_config},
        cookies,
        downloads,
    },
    shared,
    errors::{TauriResult, TauriError},
};

#[derive(Serialize, Type)]
pub struct InitData {
    version: String,
    hash: String,
    downloads: Vec<Arc<aria2c::QueueInfo>>,
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
pub async fn new_folder(secret: String, path: String) -> TauriResult<()> {
    if secret != *shared::SECRET.read().unwrap() {
        return Err(anyhow!("403 Forbidden").into())
    }
    let path = PathBuf::from(path);
    fs::create_dir_all(path).await?;
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
pub async fn write_binary(secret: String, path: String, contents: Vec<u8>) -> TauriResult<()> {
    if secret != *shared::SECRET.read().unwrap() {
        return Err(anyhow!("403 Forbidden").into())
    }
    fs::create_dir_all(PathBuf::from(&path).parent().unwrap()).await?;
    let mut _path = PathBuf::from(path);
    if _path.exists() {
        if let (Some(stem), Some(ext)) = (_path.file_stem(), _path.extension()) {
            _path.set_file_name(format!("{}_1.{}", stem.to_string_lossy(), ext.to_string_lossy()));
        }
    }
    fs::write(&_path, contents).await?;
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn xml_to_ass(app: tauri::AppHandle, secret: String, path: String, contents: Vec<u8>) -> TauriResult<()> {
    let ts = shared::get_ts(true);
    let temp_dir = shared::CONFIG.read().unwrap().temp_dir.join("com.btjawa.bilitools");
    let input = temp_dir.join(format!("{ts}.xml"));
    let output = temp_dir.join(format!("{ts}.ass"));
    write_binary(secret, input.to_string_lossy().into(), contents).await?;
    let result = app.shell().sidecar("DanmakuFactory")?
        .args(["-i", input.to_str().unwrap(), "-o", output.to_str().unwrap()])
        .output().await?;

    log::info!("STDOUT:\n{}", String::from_utf8_lossy(&result.stdout));
    log::info!("STDERR:\n{}", String::from_utf8_lossy(&result.stderr));
    fs::rename(output, path).await?;
    fs::remove_file(input).await?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn set_theme(window: tauri::WebviewWindow, theme: shared::Theme, modify: bool) -> TauriResult<shared::Theme> {
    use shared::Theme;
    let new_theme = if modify {
        match theme {
            Theme::Auto => {
                let theme: tauri::Theme = theme.into();
                if theme == tauri::Theme::Dark {
                    Theme::Light
                } else {
                    Theme::Dark
                }
            },
            Theme::Dark => Theme::Light,
            Theme::Light => Theme::Dark,
        }
    } else { theme };
    let tauri_theme = new_theme.clone().into();
    window.set_theme(Some(tauri_theme))?;
    shared::set_window(window, Some(tauri_theme))?;
    Ok(new_theme)
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
    rw_config("read", None, secret).await?;
    login::stop_login();
    login::get_extra_cookies().await?;
    shared::init_headers().await?;
    let downloads = downloads::load().await?;
    let hash = env!("GIT_HASH").to_string();
    let version = app.package_info().version.to_string();
    Ok(InitData { version, hash, downloads })
}