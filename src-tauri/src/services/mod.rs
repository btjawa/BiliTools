pub mod aria2c;
pub mod ffmpeg;
pub mod login;
pub mod queue;

pub async fn init() -> crate::TauriResult<()> {
    aria2c::init().await?;
    ffmpeg::test().await?;
    Ok(())
}