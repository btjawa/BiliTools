pub mod cookies;
pub mod downloads;
pub mod config;
mod migrate;

pub async fn init() -> anyhow::Result<()> {
    migrate::init().await?;
    config::init().await?;
    cookies::init().await?;
    downloads::init().await?;
    Ok(())
}