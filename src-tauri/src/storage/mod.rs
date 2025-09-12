pub mod archive;
pub mod config;
pub mod cookies;
pub mod db;
mod migrate;
pub mod schedulers;

use crate::shared::process_err as err;
use db::TableSpec;

pub async fn init() -> anyhow::Result<()> {
    migrate::try_migrate()
        .await
        .map_err(|e| err(e, "migrate"))?;
    db::init_db().await.map_err(|e| err(e, "db"))?;
    archive::ArchiveTable::check_latest()
        .await
        .map_err(|e| err(e, "archive"))?;
    schedulers::ArchiveTable::check_latest()
        .await
        .map_err(|e| err(e, "schedulers"))?;
    cookies::CookiesTable::check_latest()
        .await
        .map_err(|e| err(e, "cookies"))?;
    config::ConfigTable::check_latest()
        .await
        .map_err(|e| err(e, "config"))?;

    archive::load().await.map_err(|e| err(e, "archive"))?;
    schedulers::load().await.map_err(|e| err(e, "schedulers"))?;
    config::load().await.map_err(|e| err(e, "config"))?;
    Ok(())
}
