use crate::shared::{get_app_handle, get_ts, DATABASE_URL, STORAGE_PATH, WORKING_PATH};
use sea_orm::{entity::prelude::*, Database, Statement};
use anyhow::{Context, Result};
use tauri::Manager;
use tokio::fs;

const STORAGE_VERSION: i32 = 5;

async fn init_empty() -> Result<()> {
    fs::write(STORAGE_PATH.as_path(), &[]).await?;
    let db = Database::connect(&*DATABASE_URL)
        .await.context("Failed to connect to the database")?;
    db.execute(Statement::from_string(
        db.get_database_backend(), format!("PRAGMA user_version = {STORAGE_VERSION}")
    )).await?;
    Ok(())
}

pub async fn init() -> Result<()> {
    let app = get_app_handle();
    let old_work_dir = app.path().local_data_dir()?.join("com.btjawa.bilitools");
    for file in ["Downloads", "config.json"] { // For 1.1.x users
        let path = old_work_dir.join(file);
        if path.exists() { fs::remove_file(&path).await?; }
    }
    if !WORKING_PATH.exists() {
        fs::create_dir_all(WORKING_PATH.as_os_str()).await?;
    }
    if !STORAGE_PATH.exists() {
        init_empty().await?;
        return Ok(());
    }
    let db = Database::connect(&*DATABASE_URL)
        .await.context("Failed to connect to the database")?;
    let result = db.query_one(Statement::from_string(
        db.get_database_backend(), "PRAGMA user_version".to_string()
    )).await?;
    drop(db);
    let backup_path = format!("{}_{}", STORAGE_PATH.to_string_lossy(), get_ts(true));
    if let Some(row) = result {
        let version: i32 = row.try_get("", "user_version").unwrap_or(0);
        log::info!("Storage version {version}");
        if version == STORAGE_VERSION {
            return Ok(());
        }
    }
    fs::rename(STORAGE_PATH.as_path(), backup_path).await?;
    init_empty().await?;
    Ok(())
}
