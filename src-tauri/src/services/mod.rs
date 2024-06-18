pub mod aria2c;
pub mod ffmpeg;
pub mod storage;
pub mod login;

use std::{error::Error, path::PathBuf, sync::Arc};
use lazy_static::lazy_static;
use tokio::sync::OnceCell;
use tauri::{AppHandle, Manager, WebviewWindow, Wry};
use crate::{login::get_buvid, rw_config, SECRET, WORKING_DIR};

lazy_static! {
    pub static ref APP_HANDLE: Arc<OnceCell<AppHandle<Wry>>> = Arc::new(OnceCell::new());
    pub static ref STORAGE_PATH: PathBuf = WORKING_DIR.join("Storage");
}

pub async fn init(app_handle: AppHandle<Wry>) -> Result<(), Box<dyn Error>> {
    APP_HANDLE.set(app_handle).unwrap();
    #[cfg(target_os = "windows")]
    match tauri_plugin_os::version() {
        tauri_plugin_os::Version::Semantic(major, minor, build) => {
            use window_vibrancy::{apply_acrylic, apply_blur};
            if build > 22000 || (major == 10 && build <= 18362) { // Windows 10 & 11 Early Version
                apply_acrylic(&window, Some((18, 18, 18, 160)))?;
            } else if (build > 18362 && build <= 22000) || (major == 6 && minor == 1) { // Windows 7 & Windows 10 v1903+ to Windows 11 22000
                apply_blur(&window, Some((18, 18, 18, 160)))?;
            }
        },
        _ => log::error!("Failed to determine OS version"),
    }
    aria2c::init()?;
    storage::init().await?;
    login::init();
    rw_config("init", None, SECRET.read().unwrap().clone())?;
    get_buvid().await?;
    Ok(())
}

pub fn get_app_handle() -> AppHandle<Wry> {
    APP_HANDLE.get().unwrap().clone()
}

pub fn get_window() -> WebviewWindow {
    get_app_handle().get_webview_window("main").unwrap()
}

#[tauri::command]
pub async fn handle_service(secret: String, action: [String; 2]) -> Result<(), String> {
    if secret != *SECRET.read().unwrap() {
        return Err("403 Forbidden".into())
    }
    if action[0] == "aria2c" {
        if action[1] == "restart" {
            log::info!("Restart aria2c");
            aria2c::kill()?;
            aria2c::init()?;
        }
    } else if action[0] == "ffmpeg" {
        if action[1] == "kill" {
            log::info!("Kill aria2c");
            ffmpeg::kill()?;
        }
    }
    Ok(())
}