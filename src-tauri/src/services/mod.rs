pub mod browser;
pub mod aria2c;
pub mod ffmpeg;
pub mod login;

use crate::{config, TauriResult, shared::SECRET};

pub async fn init() -> TauriResult<()> {
    aria2c::init()?;
    let secret = SECRET.read().unwrap().clone();
    config::rw_config("init", None, secret).await?;
    Ok(())
}