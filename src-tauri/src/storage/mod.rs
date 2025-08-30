pub mod schedulers;
pub mod archive;
pub mod config;
pub mod cookies;
pub mod db;

use db::TableSpec;
use crate::shared::process_err as err;

pub async fn init() -> anyhow::Result<()> {
    db::init_db().await
        .map_err(|e| err(e, "db"))?;
    
    cookies::CookiesTable::check_latest().await
        .map_err(|e| err(e, "cookies"))?;

    archive::ArchiveTable::check_latest().await.map_err(|e| err(e, "archive"))?;
    archive::load().await.map_err(|e| err(e, "archive"))?;

    schedulers::ArchiveTable::check_latest().await.map_err(|e| err(e, "schedulers"))?;
    schedulers::check_waiting().await.map_err(|e| err(e, "schedulers"))?;
    schedulers::load().await.map_err(|e| err(e, "schedulers"))?;

    config::ConfigTable::check_latest().await.map_err(|e| err(e, "config"))?;
    config::load().await.map_err(|e| err(e, "config"))?;
    Ok(())
}