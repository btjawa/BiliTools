pub mod aria2c;
pub mod ffmpeg;
pub mod login;

use crate::{config, TauriResult, shared::SECRET};

pub async fn init() -> TauriResult<()> {
    let secret = SECRET.read().unwrap().clone();
    config::rw_config("init", None, secret).await?;
    aria2c::init()?;
    Ok(())
}