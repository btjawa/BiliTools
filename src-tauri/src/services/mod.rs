pub mod aria2c;
pub mod ffmpeg;
pub mod storage;
pub mod login;

use std::{error::Error, fs, path::PathBuf, sync::Arc};
use lazy_static::lazy_static;
use tokio::sync::OnceCell;
use tauri::{AppHandle, Manager, WebviewWindow, Wry};
use crate::{rw_config, SECRET, WORKING_DIR};

lazy_static! {
    pub static ref APP_HANDLE: Arc<OnceCell<AppHandle<Wry>>> = Arc::new(OnceCell::new());
    pub static ref STORAGE_PATH: PathBuf = WORKING_DIR.join("Storage");
}

pub async fn init(app_handle: AppHandle<Wry>) -> Result<(), Box<dyn Error>> {
    APP_HANDLE.set(app_handle).unwrap();
    if !WORKING_DIR.exists() { fs::create_dir_all(WORKING_DIR.as_os_str())? }
    aria2c::init()?;
    storage::init().await?;
    login::init();
    let secret = SECRET.read().unwrap().clone();
    rw_config("init", None, secret).await?;
    Ok(())
}

pub fn get_app_handle() -> AppHandle<Wry> {
    APP_HANDLE.get().unwrap().clone()
}

pub fn get_window() -> WebviewWindow {
    get_app_handle().get_webview_window("main").unwrap()
}