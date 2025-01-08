pub mod cookies;
pub mod downloads;
pub mod config;

use std::{error::Error, fs};
use tauri::Manager;

use crate::shared::{get_app_handle, WORKING_PATH};

async fn migrate() -> Result<(), Box<dyn Error>> {
    let old_work_dir = get_app_handle().path().local_data_dir()?.join("com.btjawa.bilitools");
    for file in ["Downloads", "config.json"] {
        let path = old_work_dir.join(file);
        if path.exists() { let _ = fs::remove_file(&path); }
    }
    Ok(())
}

pub async fn init() -> Result<(), Box<dyn Error>> {
    if !WORKING_PATH.exists() { fs::create_dir_all(WORKING_PATH.as_os_str())?; }
    migrate().await?;
    config::init().await?;
    cookies::init().await?;
    downloads::init().await?;
    Ok(())
}