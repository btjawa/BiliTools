use anyhow::{anyhow, Context, Result};
use regex::Regex;
use std::{
    path::{Path, PathBuf},
    sync::Arc,
};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};
use time::{macros::format_description, OffsetDateTime, UtcOffset};
use tokio::sync::mpsc;

use crate::{
    shared::{get_app_handle, get_image, random_string, Sidecar},
    storage::config,
    TauriError, TauriResult,
};

use super::queue::{handlers::SubTaskReq, runtime::CtrlHandle};

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
        .sidecar(config::read().sidecar(Sidecar::FFmpeg))?
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
        .sidecar(config::read().sidecar(Sidecar::FFmpeg))?
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

    let mut best = None;
    let re = Regex::new(r"Duration:\s*(\d+):(\d+):(\d+)(?:\.(\d+))?")?;
    for caps in re.captures_iter(&clean_log(&result.stderr)) {
        let h = caps[1].parse::<u64>().unwrap_or(0);
        let m = caps[2].parse::<u64>().unwrap_or(0);
        let s = caps[3].parse::<u64>().unwrap_or(0);
        let total = ((h * 60 + m) * 60 + s).max(best.unwrap_or(0));
        best = Some(total);
    }
    best.context(format!("No duration found in {}", path.to_string()))
}

pub async fn merge(
    req: &SubTaskReq,
    ctrl: Arc<CtrlHandle>,
    video: &Path,
    audio: &Path,
    ext: &str,
) -> TauriResult<PathBuf> {
    let app = get_app_handle();
    let output = req.temp.join(format!("{}.{ext}", req.task.id));
    let duration = get_duration(video).await?;

    let mut c = app
        .shell()
        .sidecar(config::read().sidecar(Sidecar::FFmpeg))?
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

    let cmd = c.spawn()?;
    monitor(duration, cmd, ctrl, req).await?;
    Ok(output)
}

pub async fn add_meta(
    req: &SubTaskReq,
    ctrl: Arc<CtrlHandle>,
    input: &Path,
    ext: &str,
) -> TauriResult<PathBuf> {
    let app = get_app_handle();
    let duration = get_duration(input).await?;
    let item = &req.task.item;
    let seq = &req.task.seq;
    let nfo = &req.task.nfo.read().await;
    let output = req.temp.join(random_string(8)).with_extension(ext);

    let is_mp4 = ext == "mp4";
    let is_mkv = ext == "mkv";
    let is_mp3 = ext == "mp3";
    let is_m4a = ext == "m4a";
    let is_flac = ext == "flac";
    let is_video = is_mp4 || is_mkv;

    let k = |s: &str| {
        if is_mkv || is_flac {
            s.to_ascii_uppercase()
        } else {
            s.to_string()
        }
    };

    let mut c = app
        .shell()
        .sidecar(config::read().sidecar(Sidecar::FFmpeg))?
        .args(["-hide_banner", "-nostats", "-loglevel", "warning", "-i"])
        .arg(input.as_os_str());

    let ts = nfo.premiered.as_ref().and_then(|v| v.as_i64()).unwrap_or(0);
    let utc = OffsetDateTime::from_unix_timestamp(ts)?;
    let offset = UtcOffset::from_hms(8, 0, 0)?;
    let date = utc.to_offset(offset);
    let fmt = format_description!("[year]-[month]-[day]");

    if let Some(thumb) = nfo.thumbs.first() {
        let cover_url = format!("{}@.jpg", thumb.url);
        let cover = &req.temp.join(random_string(8)).with_extension("jpg");
        get_image(cover, &cover_url).await?;
        if is_mkv {
            c = c
                .arg("-attach")
                .arg(cover.as_os_str())
                .args([
                    "-metadata:s:t",
                    "mimetype=image/jpeg",
                    "-metadata:s:t",
                    "filename=cover.jpg",
                ])
                .args(["-map", "0", "-c", "copy"]);
        } else if is_mp4 {
            c = c.arg("-i").arg(cover.as_os_str()).args([
                "-map",
                "0",
                "-map",
                "1:v:0",
                "-c",
                "copy",
                "-c:v:1",
                "mjpeg",
                "-disposition:v:1",
                "attached_pic",
            ]);
        } else {
            c = c.arg("-i").arg(cover.as_os_str()).args([
                "-map",
                "0:a:0",
                "-map",
                "1:v:0",
                "-c:a",
                "copy",
                "-c:v",
                "mjpeg",
                "-disposition:v:0",
                "attached_pic",
            ]);
        }
    } else if is_video {
        c = c.args(["-map", "0", "-c", "copy"]);
    } else {
        c = c.args(["-map", "0:a:0", "-c:a", "copy"]);
    }

    c = c
        .arg("-metadata")
        .arg(format!("{}={}", k("title"), item.title))
        .arg("-metadata")
        .arg(format!("{}={}", k("comment"), item.desc))
        .arg("-metadata")
        .arg(format!("{}={}", k("date"), date.format(&fmt)?))
        .arg("-metadata")
        .arg(format!("{}={}", k("year"), date.year()));

    if is_flac {
        c = c
            .args(
                nfo.tags
                    .iter()
                    .flat_map(|tag| ["-metadata".into(), format!("GENRE={tag}")]),
            )
            .arg("-metadata")
            .arg(format!("TRACKNUMBER={}", seq + 1));
    } else if !is_video {
        c = c
            .arg("-metadata")
            .arg(format!("{}={}", k("track"), seq + 1));
    } else {
        if is_mkv {
            c = c
                .arg("-metadata")
                .arg(format!("DATE_RELEASED={}", date.format(&fmt)?));
        }
        c = c
            .arg("-metadata")
            .arg(format!("{}={}", k("genre"), nfo.tags.join("; ")));
    }

    let org_url = &item.url;

    if is_mp3 {
        c = c
            .arg("-metadata")
            .arg(format!("WOAS={org_url}"))
            .arg("-metadata")
            .arg(format!("TXXX={org_url}"));
    } else {
        c = c
            .arg("-metadata")
            .arg(format!("{}={}", k("original_url"), org_url));
    }

    if let Some(staff) = nfo.credits.as_ref().map(|v| &v.staff) {
        c = c.args(staff.iter().flat_map(|s| match (&s.role, &s.name) {
            (Some(role), Some(name)) => {
                let key = k(role);
                vec!["-metadata".into(), format!("{key}={name}")]
            }
            _ => vec![],
        }));
    }

    if is_mp3 {
        c = c.args(["-id3v2_version", "4"]);
    }

    if is_m4a || is_mp4 {
        c = c.args(["-movflags", "+faststart"]);
    }

    if is_video {
        c = c.args(["-map_chapters", "0"]);
    }

    let cmd = c
        .args(["-map_metadata", "0", "-progress", "pipe:1"])
        .arg(output.as_os_str())
        .arg("-y")
        .spawn()?;

    monitor(duration, cmd, ctrl, req).await?;
    Ok(output)
}

pub async fn convert_mp3(
    req: &SubTaskReq,
    ctrl: Arc<CtrlHandle>,
    input: &Path,
) -> TauriResult<PathBuf> {
    let app = get_app_handle();
    let duration = get_duration(input).await?;
    let output = req.temp.join(random_string(8)).with_extension("mp3");

    let cmd = app
        .shell()
        .sidecar(config::read().sidecar(Sidecar::FFmpeg))?
        .args(["-hide_banner", "-nostats", "-loglevel", "warning", "-i"])
        .arg(input.as_os_str())
        .args(["-c:a", "libmp3lame", "-q:a", "2", "-id3v2_version", "4"])
        .args(["-map_metadata", "0", "-progress", "pipe:1"])
        .arg(output.as_os_str())
        .arg("-y")
        .spawn()?;

    monitor(duration, cmd, ctrl, req).await?;
    Ok(output)
}

pub async fn convert_mp4(
    req: &SubTaskReq,
    ctrl: Arc<CtrlHandle>,
    input: &Path,
) -> TauriResult<PathBuf> {
    let app = get_app_handle();
    let duration = get_duration(input).await?;
    let output = req.temp.join(random_string(8)).with_extension("mp4");

    let cmd = app
        .shell()
        .sidecar(config::read().sidecar(Sidecar::FFmpeg))?
        .args(["-hide_banner", "-nostats", "-loglevel", "warning", "-i"])
        .arg(input.as_os_str())
        .args([
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-movflags",
            "+faststart",
        ])
        .args([
            "-map_metadata",
            "0",
            "-map_chapters",
            "0",
            "-progress",
            "pipe:1",
        ])
        .arg(output.as_os_str())
        .arg("-y")
        .spawn()?;

    monitor(duration, cmd, ctrl, req).await?;
    Ok(output)
}

async fn monitor(
    duration: u64,
    mut cmd: (mpsc::Receiver<CommandEvent>, CommandChild),
    ctrl: Arc<CtrlHandle>,
    req: &SubTaskReq,
) -> TauriResult<()> {
    let mut stderr = Vec::<String>::with_capacity(50);
    ctrl.reg_cleaner(async move {
        cmd.1.kill()?;
        Ok(())
    })
    .await;
    while let Some(msg) = cmd.0.recv().await {
        match msg {
            CommandEvent::Stdout(line) => {
                let line = String::from_utf8_lossy(&line);
                let Some((key, value)) = line.trim().split_once('=') else {
                    continue;
                };
                match key.trim() {
                    "out_time_us" | "out_time_ms" => {
                        let chunk = value.parse::<u64>().unwrap_or(0) / 1_000_000;
                        req.subtask.send(duration, chunk).await?;
                    }
                    "progress" => {
                        if value.trim() == "end" {
                            req.subtask.send(duration, duration).await?;
                            break;
                        }
                    }
                    _ => (),
                }
            }
            CommandEvent::Stderr(line) => {
                let line = String::from_utf8_lossy(&line);
                if !line.trim().is_empty() {
                    stderr.push(line.into());
                    if stderr.len() > 50 {
                        stderr.remove(0);
                    }
                }
            }
            CommandEvent::Error(line) => {
                log::error!("FFmpeg ERROR: {line}");
                if !line.trim().is_empty() {
                    stderr.push(line.into());
                    if stderr.len() > 50 {
                        stderr.remove(0);
                    }
                }
            }
            CommandEvent::Terminated(msg) => {
                let code = msg.code.unwrap_or(-1);
                if code != 0 {
                    return Err(TauriError::new(
                        format!(
                            "FFmpeg task failed\n{}",
                            clean_log(stderr.join("\n").as_bytes())
                        ),
                        Some(code),
                    ));
                }
                req.subtask.send(duration, duration).await?;
            }
            _ => (),
        }
    }
    Ok(())
}
