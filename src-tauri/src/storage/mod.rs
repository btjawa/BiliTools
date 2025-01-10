pub mod cookies;
pub mod downloads;
pub mod config;

use tauri::Manager;
use anyhow::Result;
use std::fs;

use crate::shared::{get_app_handle, STORAGE_PATH, WORKING_PATH};

async fn migrate() -> Result<()> {
    let old_work_dir = get_app_handle().path().local_data_dir()?.join("com.btjawa.bilitools");
    for file in ["Downloads", "config.json"] {
        let path = old_work_dir.join(file);
        if path.exists() { let _ = fs::remove_file(&path); }
    }
    Ok(())
}

pub async fn init() -> Result<()> {
    if !WORKING_PATH.exists() { fs::create_dir_all(WORKING_PATH.as_os_str())?; }
    if !STORAGE_PATH.exists() { fs::write(STORAGE_PATH.as_path(), &[])?; }
    migrate().await?;
    config::init().await?;
    cookies::init().await?;
    downloads::init().await?;
    Ok(())
}