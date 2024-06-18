pub mod cookies;
pub mod downloads;

use std::error::Error;

pub async fn init() -> Result<(), Box<dyn Error>> {
    cookies::init().await?;
    downloads::init().await?;
    Ok(())
}