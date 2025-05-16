pub mod aria2c;
pub mod ffmpeg;
pub mod login;

pub async fn init() -> crate::TauriResult<()> {
    aria2c::init()?;
    Ok(())
}