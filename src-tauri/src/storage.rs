pub mod db;
mod migrate;

pub mod config;
pub mod cookies;

pub mod queue;
pub mod schedulers;
pub mod tasks;

use crate::shared::process_err as err;
use db::TableSpec;

pub async fn init() -> anyhow::Result<()> {
    migrate::try_migrate()
        .await
        .map_err(|e| err(e, "migrate"))?;

    db::init_db().await.map_err(|e| err(e, "db"))?;

    queue::QueueTable::check_latest()
        .await
        .map_err(|e| err(e, "queue"))?;
    tasks::TasksTable::check_latest()
        .await
        .map_err(|e| err(e, "tasks"))?;
    schedulers::SchedulersTable::check_latest()
        .await
        .map_err(|e| err(e, "schedulers"))?;
    cookies::CookiesTable::check_latest()
        .await
        .map_err(|e| err(e, "cookies"))?;
    config::ConfigTable::check_latest()
        .await
        .map_err(|e| err(e, "config"))?;

    config::load().await.map_err(|e| err(e, "config"))?;
    Ok(())
}
