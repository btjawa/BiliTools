pub mod aria2c;
pub mod cache;
pub mod converter;
pub mod ffmpeg;
pub mod login;
pub mod queue;
pub mod transfer;

use crate::shared::process_err as err;

pub async fn init() -> anyhow::Result<()> {
    aria2c::init().await.map_err(|e| err(e, "aria2c"))?;
    ffmpeg::test().await.map_err(|e| err(e, "ffmpeg"))?;
    
    // 初始化转换服务（清理残留临时文件、加载未完成任务）
    if let Err(e) = converter::init().await {
        log::warn!("转换服务初始化警告: {}", e);
        // 不阻塞应用启动，只记录警告
    }
    
    Ok(())
}
