pub mod archive;
pub mod config;
pub mod cookies;
mod migrate;

use crate::shared::process_err as err;

pub async fn init() -> anyhow::Result<()> {
    migrate::init().await.map_err(|e| err(e, "migrate"))?;
    config::init().await.map_err(|e| err(e, "config"))?;
    cookies::init().await.map_err(|e| err(e, "cookies"))?;
    archive::init().await.map_err(|e| err(e, "archive"))?;
    Ok(())
}