pub mod archive;
pub mod config;
pub mod cookies;
mod migrate;

pub async fn init() -> anyhow::Result<()> {
    migrate::init().await?;
    config::init().await?;
    cookies::init().await?;
    archive::init().await?;
    Ok(())
}