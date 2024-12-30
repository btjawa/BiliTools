pub mod aria2c;
pub mod ffmpeg;
pub mod login;

use crate::{config, shared::SECRET};

pub async fn init() -> Result<(), Box<dyn std::error::Error>> {
    aria2c::init()?;
    login::init();
    let secret = SECRET.read().unwrap().clone();
    config::rw_config("init", None, secret).await?;
    Ok(())
}