use time::{macros::format_description, OffsetDateTime, UtcOffset};
use tauri_plugin_shell::{process::CommandEvent, ShellExt};
use std::{path::{Path, PathBuf}, sync::Arc};
use tokio::{fs, sync::{mpsc, oneshot}};
use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use regex::Regex;

use crate::{
    config, shared::get_app_handle, TauriError, TauriResult,
    queue::{
        runtime::Progress,
        types::Task
    }
};

#[cfg(all(target_os = "linux", not(debug_assertions)))]
const EXEC: &str = "/usr/libexec/bilitools/ffmpeg";

#[cfg(not(all(target_os = "linux", not(debug_assertions))))]
const EXEC: &str = "ffmpeg";

#[derive(Clone, Debug, Serialize, Deserialize)]
struct StreamInfo {
    duration: u64,
    video_codec: Option<String>,
    audio_codec: Option<String>,
}

fn clean_log(raw_log: &[u8]) -> String {
    String::from_utf8_lossy(raw_log)
        .lines()
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}

pub async fn test() -> Result<()> {
    let app = get_app_handle();
    let result = app.shell().sidecar(EXEC)?
        .args(["-version"])
        .output()
        .await?;
    log::info!("FFmpeg Test:\n{}", clean_log(&result.stdout));
    if !result.status.success() {
        return Err(anyhow!("FFmpeg test failed with status: {:?}", result.status.code()))
    }
    Ok(())
}

async fn get_duration(path: &Path) -> Result<u64> {
    let app = get_app_handle();
    let path = path.to_string_lossy().to_string();
    let result = app.shell().sidecar(EXEC)?
        .args([
            "-hide_banner", "-nostats",
            "-i", &path, "-c", "copy", "-f", "null", "-"
        ]).output().await?;
    
    log::info!("Stream info for {path}\n:{}", &clean_log(&result.stderr));

    Regex::new(r"Duration:\s*(\d+):(\d+):(\d+)")?
        .captures_iter(&clean_log(&result.stderr))
        .filter_map(|caps| {
            let h = caps[1].parse::<u64>().ok()?;
            let m = caps[2].parse::<u64>().ok()?;
            let s = caps[3].parse::<u64>().ok()?;
            Some((h * 60 + m) * 60 + s)
        })
        .min()
        .context("No duration found in stream info")
}

pub async fn merge(id: Arc<String>, ext: &str, tx: &Progress, mut cancel: oneshot::Receiver<()>, video_path: &Path, audio_path: &Path) -> TauriResult<PathBuf> {
    let app = get_app_handle();
    let temp_root = config::read().temp_dir().join(&*id);
    fs::create_dir_all(&temp_root).await?;

    let output = temp_root.join(format!("{id}.{ext}"));
    let duration = get_duration(video_path).await?;

    let video = video_path.to_string_lossy().to_string();
    let audio = audio_path.to_string_lossy().to_string();

    let mut args = vec![
        "-hide_banner", "-nostats", "-loglevel", "warning",
        "-i", &video, "-i", &audio, "-c", "copy", "-shortest",
    ];

    if ext == "mp4" {
        args.push("-movflags");
        args.push("+faststart");
    }

    let _output = output.to_string_lossy().to_string();

    args.extend_from_slice(&[
        "-progress", "pipe:1", &_output, "-y"
    ]);

    log::info!("Merge args for {id}: \n{args:?}");

    let (mut _rx, child) = app.shell().sidecar(EXEC)?.args(args).spawn()?;
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

pub async fn convert_audio(id: Arc<String>, mut ext: &str, tx: &Progress, input: &Path, task: Arc<Task>) -> TauriResult<(PathBuf, String)> {
    let app = get_app_handle();
    let temp_root = config::read().temp_dir().join(&*id);
    fs::create_dir_all(&temp_root).await?;

    let duration = get_duration(input).await?;

    let mut args: Vec<String> = Vec::new();

    args.extend([
        "-hide_banner", "-nostats", "-loglevel", "warning",
        "-i", input.to_string_lossy().as_ref(),
        "-map", "0:a:0", "-vn"
    ].into_iter().map(Into::into));
    
    if config::read().convert.mp3 {
        args.extend([
            "-c:a", "libmp3lame", "-q:a", "2", "-id3v2_version", "3"
        ].into_iter().map(Into::into));
        ext = "mp3";
    } else {
        args.extend(["-c", "copy"].into_iter().map(Into::into));
        if ext == "m4a" {
            args.extend([
                "-bsf:a", "aac_adtstoasc", "-movflags", "+faststart", "-f", "mp4"
            ].into_iter().map(Into::into));
        }
    }

    
    if ext != "eac3" && config::read().add_metadata {
        let item = task.item.as_ref();
        let nfo = task.nfo.as_ref();
        let ts = nfo.premiered.as_i64().unwrap_or(0);

        let utc = OffsetDateTime::from_unix_timestamp(ts)
            .context(format!("Failed to parse timestamp: {ts}"))?;
        let offset = UtcOffset::from_hms(8, 0, 0)
            .context("Failed to create timezone")?;
        let date = utc.to_offset(offset);
        let fmt = format_description!("[year]-[month]-[day]");

        let artist =
            if let Some(v) = nfo.staff.first() { v }
            else if let Some(v) = &nfo.upper { &v.name }
            else { &String::new() };
        args.extend([
            "-metadata".into(), format!("title={}", item.title),
            "-metadata".into(), format!("artist={}", artist),
            "-metadata".into(), format!("date={}", nfo.premiered),
            "-metadata".into(), format!("track={}", task.seq + 1),
        ]);
        if ext == "flac" {
            args.extend([
                "-metadata".into(), format!("DATE={}", date.format(&fmt)?),
                "-metadata".into(), format!("YEAR={}", date.year()),
            ]);
            for artist in nfo.staff.iter() {
                args.extend([
                    "-metadata".into(), format!("ARTIST={}", artist),
                ]);
            }
            for tag in nfo.tags.iter() {
                args.extend([
                    "-metadata".into(), format!("GENRE={tag}"),
                ]);
            }
        } else {
            args.extend([
                "-metadata".into(), format!("artist={}", nfo.staff.join("; ")),
                "-metadata".into(), format!("genre={}", nfo.tags.join("; ")),                
                "-metadata".into(), format!("date={}", date.format(&fmt)?),
                "-metadata".into(), format!("year={}", date.year()),
            ]);
        }
        args.extend([
            "-metadata".into(), format!("comment={}", item.desc),
        ]);
    }

    let output = temp_root.join(&*id);
    let _output = output.to_string_lossy().to_string();

    args.extend([
        "-map_metadata", "0", "-progress", "pipe:1",
        &format!("{_output}.{ext}"), "-y"
    ].into_iter().map(Into::into));

    log::info!("Convert args for {id}: \n{args:?}");

    let (mut _rx, _) = app.shell().sidecar(EXEC)?.args(args).spawn()?;
    monitor(duration, _rx, tx).await?;
    Ok((output, ext.into()))
}

async fn monitor(duration: u64, mut rx: mpsc::Receiver<CommandEvent>, tx: &Progress) -> TauriResult<()> {
    let mut stderr: Vec<String> = vec![];
    while let Some(msg) = rx.recv().await {
        match msg {
            CommandEvent::Stdout(line) => {
                let line = String::from_utf8_lossy(&line);
                let (key, value) = line.trim().split_once('=')
                    .ok_or(anyhow!("Failed to parse FFmpeg stdout"))?;
                match key.trim() {
                    "out_time_us" | "out_time_ms" => {
                        let chunk = value.parse::<u64>().unwrap_or(0);
                        tx.send(duration, chunk / 1_000_000).await?;
                    },
                    "progress" => {
                        if value.trim() == "end" {
                            break;
                        }
                    },
                    _ => ()
                }
            },
            CommandEvent::Stderr(line) => {
                stderr.push(String::from_utf8_lossy(&line).into());
            },
            CommandEvent::Error(line) => {
                stderr.push(line);
            },
            CommandEvent::Terminated(msg) => {
                let code = msg.code.unwrap_or(0);
                if code == 0 {
                    tx.send(1, 1).await?;
                } else {
                    return Err(TauriError::new(
                        format!("FFmpeg task failed\n{}", clean_log(stderr.join("\n").as_bytes())),
                        Some(code)
                    ));
                }
            },
            _ => ()
        }
    }
    Ok(())
}