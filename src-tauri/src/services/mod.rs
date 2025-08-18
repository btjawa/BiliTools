use crate::shared::process_err;

pub mod aria2c;
pub mod ffmpeg;
pub mod login;
pub mod queue;

pub async fn init() -> crate::TauriResult<()> {
    aria2c::init().map_err(|e| process_err(e, "services"))?;
    ffmpeg::test().await?;
    Ok(())
}