pub mod cookies;
pub mod downloads;
pub mod config;

use std::{collections::HashMap, error::Error, fs};
use tauri::Manager;
use crate::{rw_config, SECRET};

async fn migrate() -> Result<(), Box<dyn Error>> {
    let old_work_dir = super::get_app_handle().path().local_data_dir()?.join("com.btjawa.bilitools");
    for file in ["Storage", "Downloads", "config.json"] {
        let path = old_work_dir.join(file);
        if path.exists() { let _ = fs::remove_file(&path); }
        if file == "config.json" {
            if let Ok(s) = fs::read_to_string(path) {
                if let Ok(local_config) = serde_json::from_str::<HashMap<String, serde_json::Value>>(&s) {
                    let secret = SECRET.read().unwrap().clone();
                    rw_config("write", Some(local_config), secret).await?;
                }
            }
        }
    }
    Ok(())
}

pub async fn init() -> Result<(), Box<dyn Error>> {
    config::init().await?;
    migrate().await?;
    cookies::init().await?;
    downloads::init().await?;
    Ok(())
}