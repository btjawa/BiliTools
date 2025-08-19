use tauri_plugin_shell::{process::CommandEvent, ShellExt};
use tokio::{fs, sync::{mpsc::{self, Sender}, oneshot}};
use anyhow::{anyhow, Context, Result};
use std::{path::PathBuf, sync::Arc};
use serde::{Deserialize, Serialize};
use regex::Regex;

use crate::{shared::{get_app_handle, get_ts}, config, TauriError, TauriResult};

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

async fn get_duration(path: &PathBuf) -> Result<u64> {
    let app = get_app_handle();
    let result = app.shell().sidecar("ffmpeg")?
        .args([
            "-hide_banner", "-nostats",
            "-i", path.to_str().unwrap(),
            "-c", "copy", "-f", "null", "-"
        ]).output().await?;
    
    log::info!("Stream info for {}\n:{}", path.display(), &clean_log(&result.stderr));

    Ok(Regex::new(r"Duration:\s*(\d+):(\d+):(\d+)")?
        .captures_iter(&clean_log(&result.stderr))
        .filter_map(|caps| {
            let h = caps[1].parse::<u64>().ok()?;
            let m = caps[2].parse::<u64>().ok()?;
            let s = caps[3].parse::<u64>().ok()?;
            Some((h * 60 + m) * 60 + s)
        })
        .min()
        .context("No duration found in stream info")?
    )
}

pub async fn merge(id: Arc<String>, ext: &str, tx: Arc<Sender<(u64, u64)>>, mut cancel: oneshot::Receiver<()>, video_path: &PathBuf, audio_path: &PathBuf) -> TauriResult<PathBuf> {
    let app = get_app_handle();
    let temp_root = config::read().temp_dir().join(format!("{id}_{}", get_ts(true)));
    fs::create_dir_all(&temp_root).await?;

    let output = temp_root.join(format!("{id}.{ext}"));
    let duration = get_duration(&video_path).await?;

    let mut args = vec![
        "-hide_banner", "-nostats", "-loglevel", "warning",
        "-i", video_path.to_str().unwrap(),
        "-i", audio_path.to_str().unwrap(),
        "-c", "copy", "-shortest",
    ];

    if ext == "mp4" {
        args.push("-movflags");
        args.push("+faststart");
    }

    args.extend_from_slice(&[
        "-progress", "pipe:1",
        output.to_str().unwrap(), "-y"
    ]);

    let (mut _rx, child) = app.shell().sidecar("ffmpeg")?.args(args).spawn()?;
    let mut child = Some(child);
    let mut monitor = Box::pin(monitor(duration, _rx, tx));
    tokio::select! {
        res = &mut monitor => res?,
        _ = &mut cancel => if let Some(c) = child.take() {
            c.kill()?;
        }
    };
    Ok(output)
}

pub async fn convert_audio(id: Arc<String>, mut ext: &str, tx: Arc<Sender<(u64, u64)>>, input: &PathBuf) -> TauriResult<PathBuf> {
    let app = get_app_handle();
    let temp_root = config::read().temp_dir().join(format!("{id}_{}", get_ts(true)));
    fs::create_dir_all(&temp_root).await?;

    let duration = get_duration(&input).await?;

    let mut args = vec![
        "-hide_banner", "-nostats", "-loglevel", "warning",
        "-i", input.to_str().unwrap(), "-map", "0:a:0", "-vn"
    ];
    
    if config::read().convert.mp3 {
        args.extend_from_slice(&[
            "-c:a", "libmp3lame", "-q:a", "2", "-id3v2_version", "3"
        ]);
        ext = "mp3";
    } else {
        args.extend_from_slice(&["-c", "copy"]);
        if ext == "m4a" {
            args.extend_from_slice(&[
                "-bsf:a", "aac_adtstoasc", "-movflags", "+faststart", "-f", "mp4"
            ]);
        }
    }

    let output = temp_root.join(format!("{id}.{ext}"));

    args.extend_from_slice(&[
        "-map_metadata", "0", "-progress", "pipe:1",
        output.to_str().unwrap(), "-y"
    ]);

    let (mut _rx, _) = app.shell().sidecar("ffmpeg")?.args(args).spawn()?;
    monitor(duration, _rx, tx).await?;
    Ok(output)
}

async fn monitor(duration: u64, mut rx: mpsc::Receiver<CommandEvent>, tx: Arc<Sender<(u64, u64)>>) -> TauriResult<()> {
    let mut stderr: Vec<String> = vec![];
    while let Some(msg) = rx.recv().await {
        match msg {
            CommandEvent::Stdout(line) => { // log
                let line = String::from_utf8_lossy(&line);
                let (key, value) = line.trim().split_once('=')
                    .ok_or(anyhow!("Failed to parse FFmpeg stdout"))?;
                match key.trim() {
                    "out_time_us" | "out_time_ms" => {
                        let chunk = value.parse::<u64>().unwrap_or(0);
                        tx.send((duration, (chunk / 1000_000))).await?;
                    },
                    "progress" => {
                        if value.trim() == "end" {
                            break;
                        }
                    },
                    _ => ()
                }
            },
            CommandEvent::Stderr(line) => { // err
                stderr.push(String::from_utf8_lossy(&line).into());
            },
            CommandEvent::Error(line) => {
                stderr.push(line.into());
            },
            CommandEvent::Terminated(msg) => {
                let code = msg.code.unwrap_or(0);
                if code == 0 {
                    break;
                } else {
                    return Err(TauriError::new(
                        format!("FFmpeg task failed\n{}", clean_log(&stderr.join("\n").as_bytes())),
                        Some(code as isize)
                    ));
                }
            },
            _ => ()
        }
    }
    Ok(())
}