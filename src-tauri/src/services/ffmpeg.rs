use tokio::{fs, io::{self, AsyncBufReadExt, AsyncSeekExt}, sync::mpsc::Sender, time::sleep};
use std::{io::SeekFrom, path::PathBuf, sync::Arc, time::Duration};
use tauri::{http::StatusCode, ipc::Channel};
use anyhow::{anyhow, bail, Context, Result};
use serde::{Deserialize, Serialize};
use tauri_plugin_shell::ShellExt;
use regex::Regex;

use crate::{shared::{get_app_handle, get_ts, get_unique_path, init_client, process_err}, config, TauriError, TauriResult};

macro_rules! svec {
    ( $( $x:expr ),* ) => {
        vec![ $( $x.to_string() ),* ]
    };
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct StreamInfo {
    duration: u64,
    video_codec: Option<String>,
    audio_codec: Option<String>,
}

fn clean_log(raw_log: &[u8]) -> String {
    return String::from_utf8_lossy(raw_log)
        .lines()
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n");
}

pub async fn test() -> Result<()> {
    let app = get_app_handle();
    let result = app.shell().sidecar("ffmpeg")?
        .args(["-version"])
        .output()
        .await?;
    log::info!("FFmpeg Test:\n{}", clean_log(&result.stdout));
    if !result.status.success() {
        return Err(anyhow!("FFmpeg test failed with status: {:?}", result.status.code()))
    }
    Ok(())
}

pub async fn merge(id: Arc<String>, tx: Sender<(u64, u64)>, video_path: PathBuf, audio_path: PathBuf) -> TauriResult<PathBuf> {
    let app = get_app_handle();
    let temp_root = config::read().temp_dir().join(format!("{id}_{}", get_ts(true)));
    fs::create_dir_all(&temp_root).await?;

    let log_path = temp_root.join(format!("{id}.log"));
    let output = temp_root.join(format!("{id}"));

    let result = app.shell().sidecar("ffmpeg")?
        .args([
            "-hide_banner", "-loglevel", "warning", "-nostats",
            "-i", video_path.to_str().unwrap(),
            "-i", audio_path.to_str().unwrap(),
            "-c", "copy", "-shortest",
            output.to_str().unwrap(), "-progress",
            log_path.to_str().unwrap(), "-y"
        ]).output().await?;

    let err = clean_log(&result.stderr);
    log::warn!("Merge warnings / errors:\n{err}");
    if result.status.success() {
        Ok(output)
    } else {
        Err(TauriError::new(err, result.status.code().map(|c| c as isize)))
    }
}