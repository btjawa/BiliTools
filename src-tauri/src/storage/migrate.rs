use anyhow::Result;
use sqlx::{sqlite::SqliteConnectOptions, Connection, SqliteConnection};
use std::str::FromStr;
use tokio::fs;

use crate::shared::{get_ts, DATABASE_URL, STORAGE_PATH, WORKING_PATH};

pub async fn try_migrate() -> Result<()> {
    fs::create_dir_all(&*WORKING_PATH).await?;

    if !STORAGE_PATH.exists() {
        return Ok(());
    }

    let opts = SqliteConnectOptions::from_str(&DATABASE_URL)?.create_if_missing(false);

    if let Ok(mut conn) = SqliteConnection::connect_with(&opts).await {
        let has_meta: Option<i64> = sqlx::query_scalar(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='meta' LIMIT 1;",
        )
        .fetch_optional(&mut conn)
        .await?;
        if has_meta.is_some() {
            return Ok(());
        }
    }

    fs::rename(
        &*STORAGE_PATH,
        &format!(
            "{}_{}",
            STORAGE_PATH.to_string_lossy().as_ref(),
            get_ts(true)
        ),
    )
    .await?;
    Ok(())
}
