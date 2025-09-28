use anyhow::{anyhow, Context, Result};
use regex::Regex;
use std::{
    path::{Path, PathBuf},
    pin::pin,
    sync::Arc,
};
use tauri_plugin_shell::{process::CommandEvent, ShellExt};
use time::{macros::format_description, OffsetDateTime, UtcOffset};
use tokio::{
    fs,
    sync::{mpsc, oneshot},
};

use crate::{
    config,
    queue::{runtime::Progress, types::Task},
    shared::{get_app_handle, get_image},
    TauriError, TauriResult,
};

#[cfg(not(target_os = "linux"))]
const EXEC: &str = "ffmpeg";

#[cfg(target_os = "linux")]
const EXEC: &str = "bilitools-ffmpeg";

fn clean_log(raw_log: &[u8]) -> String {
    String::from_utf8_lossy(raw_log)
        .lines()
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}

pub async fn test() -> Result<()> {
    let app = get_app_handle();
    let result = app
        .shell()
        .sidecar(EXEC)?
        .args(["-version"])
        .output()
        .await?;
    log::info!("FFmpeg Test:\n{}", clean_log(&result.stdout));
    if !result.status.success() {
        return Err(anyhow!(
            "FFmpeg test failed with status: {:?}",
            result.status.code()
        ));
    }
    Ok(())
}

async fn get_duration(path: &Path) -> Result<u64> {
    let app = get_app_handle();
    let path = path.to_string_lossy().to_string();
    let result = app
        .shell()
        .sidecar(EXEC)?
        .args([
            "-hide_banner",
            "-nostats",
            "-i",
            &path,
            "-c",
            "copy",
            "-f",
            "null",
            "-",
        ])
        .output()
        .await?;

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

pub async fn merge(
    id: Arc<String>,
    ext: &str,
    tx: &Progress,
    mut cancel: oneshot::Receiver<()>,
    video: &Path,
    audio: &Path,
) -> TauriResult<PathBuf> {
    let app = get_app_handle();
    let temp_root = config::read().temp_dir().join(&*id);
    fs::create_dir_all(&temp_root).await?;

    let output = temp_root.join(format!("{id}.{ext}"));
    let duration = get_duration(video).await?;

    let mut c = app.shell().sidecar(EXEC)?;

    c = c
        .args(["-hide_banner", "-nostats", "-loglevel", "warning"])
        .arg("-i")
        .arg(video.as_os_str())
        .arg("-i")
        .arg(audio.as_os_str())
        .args(["-c", "copy", "-shortest"]);

    if ext == "mp4" {
        c = c.args(["-movflags", "+faststart"]);
    }

    c = c
        .args(["-progress", "pipe:1"])
        .arg(output.as_os_str())
        .arg("-y");

    let (mut _rx, child) = c.spawn()?;
    let mut child = Some(child);
    let mut monitor = pin!(monitor(duration, _rx, tx));
    tokio::select! {
        res = &mut monitor => res?,
        _ = &mut cancel => if let Some(c) = child.take() {
            c.kill()?;
        }
    };
    Ok(output)
}

pub async fn convert_audio(
    id: Arc<String>,
    mut ext: &str,
    tx: &Progress,
    input: &Path,
    task: Arc<Task>,
) -> TauriResult<(PathBuf, String)> {
    let app = get_app_handle();
    let cfg = config::read();

    if cfg.convert.mp3 {
        ext = "mp3";
    }

    let add_meta = ext != "eac3" && cfg.add_metadata;
    let temp_root = cfg.temp_dir().join(&*id);
    fs::create_dir_all(&temp_root).await?;

    let duration = get_duration(input).await?;
    let nfo = task.nfo.as_ref();

    let mut c = app.shell().sidecar(EXEC)?;

    c = c
        .args(["-hide_banner", "-nostats", "-loglevel", "warning", "-i"])
        .arg(input.as_os_str());

    if let Some(thumb) = nfo.thumbs.first().filter(|_| add_meta) {
        let cover_url = format!("{}@.jpg", thumb.url);
        let cover = &temp_root.join("cover.jpg");
        get_image(cover, &cover_url).await?;
        c = c.arg("-i").arg(cover.as_os_str()).args([
            "-map",
            "0:a:0",
            "-map",
            "1:v:0",
            "-c:v",
            "mjpeg",
            "-disposition:v:0",
            "attached_pic",
        ]);
    } else {
        c = c.args(["-map", "0:a:0"]);
    }

    if cfg.convert.mp3 {
        c = c.args(["-c:a", "libmp3lame", "-q:a", "2"]);
        ext = "mp3";
    } else {
        c = c.args(["-c:a", "copy"]);
        if ext == "m4a" {
            c = c.args([
                "-bsf:a",
                "aac_adtstoasc",
                "-movflags",
                "+faststart",
                "-f",
                "mp4",
            ]);
        }
    }

    if add_meta {
        let ts = nfo.premiered.as_ref().and_then(|v| v.as_i64()).unwrap_or(0);
        let utc = OffsetDateTime::from_unix_timestamp(ts)?;
        let offset = UtcOffset::from_hms(8, 0, 0)?;
        let date = utc.to_offset(offset);
        let fmt = format_description!("[year]-[month]-[day]");
        c = c
            .arg("-metadata")
            .arg(format!("title={}", task.item.title))
            .arg("-metadata")
            .arg(format!("comment={}", task.item.desc))
            .arg("-metadata")
            .arg(format!("track={}", task.seq + 1));
        if ext == "flac" {
            c = c
                .arg("-metadata")
                .arg(format!("DATE={}", date.format(&fmt)?))
                .arg("-metadata")
                .arg(format!("YEAR={}", date.year()))
                .args(
                    nfo.tags
                        .iter()
                        .flat_map(|tag| ["-metadata".into(), format!("GENRE={tag}")]),
                );
        } else {
            c = c
                .arg("-metadata")
                .arg(format!("genre={}", nfo.tags.join("; ")))
                .arg("-metadata")
                .arg(format!("date={}", date.format(&fmt)?))
                .arg("-metadata")
                .arg(format!("year={}", date.year()));
        }
        if let Some(staff) = nfo.credits.as_ref().map(|v| &v.staff) {
            c = c.args(staff.iter().flat_map(|s| match (&s.role, &s.name) {
                (Some(role), Some(name)) => {
                    let key = if ext == "flac" {
                        role.to_ascii_uppercase()
                    } else {
                        role.clone()
                    };
                    vec!["-metadata".into(), format!("{key}={name}")]
                }
                _ => vec![],
            }));
        }
    }

    if ext == "mp3" {
        c = c.args(["-id3v2_version", "4"])
    }

    let output = temp_root.join(&*id);

    c = c
        .args(["-map_metadata", "0", "-progress", "pipe:1"])
        .arg(output.with_extension(ext).as_os_str())
        .arg("-y");

    let (mut _rx, _) = c.spawn()?;
    monitor(duration, _rx, tx).await?;
    Ok((output, ext.into()))
}

async fn monitor(
    duration: u64,
    mut rx: mpsc::Receiver<CommandEvent>,
    tx: &Progress,
) -> TauriResult<()> {
    let mut stderr: Vec<String> = vec![];
    while let Some(msg) = rx.recv().await {
        match msg {
            CommandEvent::Stdout(line) => {
                let line = String::from_utf8_lossy(&line);
                let (key, value) = line
                    .trim()
                    .split_once('=')
                    .ok_or(anyhow!("Failed to parse FFmpeg stdout"))?;
                match key.trim() {
                    "out_time_us" | "out_time_ms" => {
                        let chunk = value.parse::<u64>().unwrap_or(0);
                        tx.send(duration, chunk / 1_000_000).await?;
                    }
                    "progress" => {
                        if value.trim() == "end" {
                            break;
                        }
                    }
                    _ => (),
                }
            }
            CommandEvent::Stderr(line) => {
                stderr.push(String::from_utf8_lossy(&line).into());
            }
            CommandEvent::Error(line) => {
                stderr.push(line);
            }
            CommandEvent::Terminated(msg) => {
                let code = msg.code.unwrap_or(0);
                if code == 0 {
                    tx.send(1, 1).await?;
                } else {
                    return Err(TauriError::new(
                        format!(
                            "FFmpeg task failed\n{}",
                            clean_log(stderr.join("\n").as_bytes())
                        ),
                        Some(code),
                    ));
                }
            }
            _ => (),
        }
    }
    Ok(())
}
