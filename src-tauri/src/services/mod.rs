pub mod aria2c;
pub mod cookies;
pub mod dh;

use std::{fs, path::PathBuf, sync::{Arc, RwLock}, error::Error};
use lazy_static::lazy_static;
use tauri::{async_runtime, AppHandle, Manager, WebviewWindow, Wry};
use crate::{get_buvid, rw_config, SECRET, WORKING_DIR};

lazy_static! {
    pub static ref APP_HANDLE: Arc<RwLock<Option<AppHandle<Wry>>>> = Arc::new(RwLock::new(None));
    static ref COOKIE_PATH: PathBuf = WORKING_DIR.join("Cookies");
    static ref DH_PATH: PathBuf = WORKING_DIR.join("Downloads");
}

pub fn init(app_handle: AppHandle<Wry>) -> Result<(), Box<dyn Error>> {
    *APP_HANDLE.write().unwrap() = Some(app_handle);
    if !&COOKIE_PATH.exists() { fs::write(&*COOKIE_PATH, "{}")? }
    aria2c::init()?;
    rw_config("init", None, SECRET.read().unwrap().clone())?;
    async_runtime::spawn(async move {
        dh::init().await?;
        get_buvid().await?;
        Ok::<(), String>(())
    });
    Ok(())
}

pub fn get_app_handle() -> Result<AppHandle<Wry>, String> {
    if let Some(handle) = APP_HANDLE.read().unwrap().clone() {
        Ok(handle.clone())
    } else { Err("No AppHandle Found".into()) }
}

pub fn get_window() -> WebviewWindow {
    get_app_handle().unwrap().get_webview_window("main").unwrap()
}