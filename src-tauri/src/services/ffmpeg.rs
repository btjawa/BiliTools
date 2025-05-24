use tokio::{fs, io::{self, AsyncBufReadExt, AsyncSeekExt}, time::sleep};
use std::{io::SeekFrom, path::PathBuf, sync::Arc, time::Duration};
use tauri::{http::StatusCode, ipc::Channel};
use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use tauri_plugin_shell::ShellExt;
use regex::Regex;

use super::aria2c::{
    TaskType,
    QueueInfo,
    DownloadEvent,
};

use crate::{shared::{get_app_handle, get_ts, get_unique_path, init_client, process_err, CONFIG}, TauriError, TauriResult};

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

async fn get_stream_info(video: Option<&PathBuf>, audio: Option<&PathBuf>) -> Result<StreamInfo> {
    let app = get_app_handle();
    let mut args = vec![];
    if let Some(ref v) = video {
        args.push("-i");
        args.push(v.to_str().unwrap());
    }
    if let Some(ref a) = audio {
        args.push("-i");
        args.push(a.to_str().unwrap());
    }
    args.extend_from_slice(&["-c", "copy", "-f", "null", "-"]);
    let result = app.shell().sidecar("ffmpeg")?
        .args(args)
        .output()
        .await?;

    let stderr = String::from_utf8_lossy(&result.stderr);
    log::info!("STDERR:\n{}", &stderr);

    let duration = Regex::new(r"Duration:\s*(\d+):(\d+):(\d+)")?
        .captures_iter(&stderr)
        .filter_map(|caps| {
            let h: u64 = caps[1].parse().ok()?;
            let m: u64 = caps[2].parse().ok()?;
            let s: u64 = caps[3].parse().ok()?;
            Some(((h * 60 + m) * 60 + s) * 1000)
        })
        .min()
        .context("No duration found in stream info")?;
    
    let video_codec = Regex::new(r"Video:\s*([^\s,\n]+)")?
        .captures_iter(&stderr)
        .filter_map(|caps| caps.get(1))
        .map(|m| m.as_str().into())
        .next();

    if video.is_some() && video_codec.is_none() {
        return Err(anyhow!("No video codec found"));
    }

    let audio_codec = Regex::new(r"Audio:\s*([^\s,\n]+)")?
        .captures_iter(&stderr)
        .filter_map(|caps| caps.get(1))
        .map(|m| m.as_str().into())
        .next();

    if audio.is_some() && audio_codec.is_none() {
        return Err(anyhow!("No audio codec found"));
    }
    
    Ok(StreamInfo { duration, video_codec, audio_codec })
}

pub async fn merge(info: &Arc<QueueInfo>, event: &Channel<DownloadEvent>) -> TauriResult<()> {
    let video_path = info.tasks.iter()
        .find(|v| v.task_type == TaskType::Video)
        .context("No video task found")?
        .path.clone().unwrap();

    let audio_path = info.tasks.iter()
        .find(|v| v.task_type == TaskType::Audio)
        .context("No video task found")?
        .path.clone().unwrap();

    let merge_task = info.tasks.iter()
        .find(|v| v.task_type == TaskType::Merge)
        .context("No merge task found")?;

    let merge_path = get_unique_path(merge_task.path.clone().unwrap());
    let merge_gid = merge_task.gid.clone().unwrap();

    let app = get_app_handle();
    let log_path = info.temp_dir.join(format!("merge_{}_{}.log", info.id, get_ts(true)));
    let log_path_clone = log_path.clone();

    let stream_info = get_stream_info(Some(&video_path), Some(&audio_path)).await
        .context("Failed to get stream info")
        .map_err(|e| process_err(TauriError::from(e), "ffmpeg"))?;

    let task = async {
        let result = app.shell().sidecar("ffmpeg")?
            .args([
                "-i", video_path.to_str().unwrap(),
                "-i", audio_path.to_str().unwrap(),
                "-c", "copy",
                "-movflags", "+faststart",
                "-strict", "unofficial",
                "-shortest",
                &merge_path.to_str().unwrap(), "-progress",
                &log_path_clone.to_str().unwrap(), "-y"
            ]).output().await?;

        log::info!("STDERR:\n{}", String::from_utf8_lossy(&result.stderr));
        if result.status.success() {
            Ok::<(), anyhow::Error>(())
        } else {
            Err(anyhow!("FFmpeg exited with status: {:?}", result.status.code()))
        }
    };
    let monitor = async {
        monitor(info.id.clone(), merge_gid, log_path, stream_info.duration, TaskType::Merge, event).await?;
        Ok::<(), anyhow::Error>(())
    };
    let result = tokio::try_join!(task, monitor);
    result.context("Failed to merge")?;
    Ok(())
}

async fn fetch_cover(url: &String, temp_dir: &PathBuf) -> Result<PathBuf> {
    let client = init_client().await?;
    let response = client.get(url).send().await?;
    if response.status() != StatusCode::OK {
        return Err(anyhow!("Error while fetching cover ({})", response.status()).into());
    }
    let bytes = response.bytes().await.context("Failed to read image body")?;
    let input = temp_dir.join("cover.png");
    let output = temp_dir.join("cover.jpg");
    fs::write(&input, bytes).await?;
    if url.ends_with("jpg") {
        fs::rename(&input, &output).await?;
        return Ok(output);
    }
    let app = get_app_handle();
    let result = app.shell().sidecar("ffmpeg")?
        .args([
            "-i", input.to_str().unwrap(),
            "-pix_fmt", "yuvj420p",
            "-q:v", "2", "-vframes", "1",
            output.to_str().unwrap(), "-y"
        ]).output().await?;

    log::info!("STDERR:\n{}", String::from_utf8_lossy(&result.stderr));
    if !result.status.success() {
        return Err(anyhow!("FFmpeg exited with status: {:?}", result.status.code()))
    }
    fs::remove_file(input).await?;
    Ok(output)
}

async fn get_metadata_args(info: &Arc<QueueInfo>, input: &PathBuf, stream_info: &StreamInfo) -> Result<Vec<String>> {
    let output = info.output.clone();
    let meta = &info.info;
    let add_metadata = { CONFIG.read().unwrap().advanced.add_metadata };
    let ext = output.extension().and_then(|v| v.to_str()).unwrap_or("");
    let mut args = svec!["-i", input.to_str().unwrap()];
    let mut output_args = svec![];
    let has_video = stream_info.video_codec.is_some();
    let has_audio = stream_info.audio_codec.is_some();
    if add_metadata {
        let image = fetch_cover(&meta.cover, &info.temp_dir).await?;
        args.extend(match ext {
            "mp4" | "m4a" => svec!["-i", image.to_str().unwrap()],
            "mkv" => svec!["-attach", image.to_str().unwrap()],
            _ => svec![]
        });
    }
    if has_video {
        output_args.extend(svec!["-map", "0:v:0", "-c:v:0", "copy"]);
    }
    if has_audio {
        output_args.extend(svec!["-map", "0:a:0", "-c:a", "copy"]);
    }
    if add_metadata {
        if ext == "mp4" || ext == "m4a" {
            output_args.extend(svec!["-map", "1:v:0"]);
            output_args.extend(match has_video {
                true => svec!["-c:v:1", "mjpeg", "-disposition:v:1", "attached_pic"],
                false => svec!["-c:v", "mjpeg", "-disposition:v", "attached_pic"]
            });
        } else if ext == "mkv" {
            output_args.extend(svec![
                "-metadata:s:t", "mimetype=image/jpeg",
                "-metadata:s:t", "filename=cover.jpg"
            ]);
        }
        output_args.extend(svec![
            "-metadata", &format!("title={}", meta.title),
            "-metadata", &format!("artist={}", meta.artist),
            "-metadata", &format!("description={}", meta.desc),
            "-metadata", &format!("genre={}", meta.tags.join(", ")),
            "-metadata", &format!("creation_time={}", meta.pubtime)
        ]);
    }
    if ext == "m4a" {
        output_args.extend(svec!["-f", "mp4"]);
    }
    args.extend(svec![
        "-movflags", "+faststart",
        "-strict", "unofficial"
    ]);
    args.extend(output_args);
    Ok(args)
}

pub async fn add_metadata(info: &Arc<QueueInfo>, input: PathBuf, event: &Channel<DownloadEvent>) -> Result<()> {
    let app = get_app_handle();
    let output = get_unique_path(info.output.clone());
    let log_path = info.temp_dir.join(format!("metadata_{}_{}.log", info.id, get_ts(true)));
    let log_path_clone = log_path.clone();
    let video_path = info.tasks.iter().find(|t| t.task_type == TaskType::Video).and_then(|f| f.path.as_ref());
    let audio_path = info.tasks.iter().find(|t| t.task_type == TaskType::Audio).and_then(|f| f.path.as_ref());
    let stream_info = get_stream_info(video_path, audio_path).await?;
    let task = info.tasks.iter()
        .find(|v| v.task_type == TaskType::Metadata)
        .context("No metadata task found")?;
    let task_gid = task.gid.clone().unwrap();
    let task = async {
        let mut args = get_metadata_args(info, &input, &stream_info)
            .await.context("Failed to get metadata args")?;
        args.extend(svec![
            output.to_str().unwrap(), "-progress",
            log_path_clone.to_str().unwrap(), "-y"
        ]);
        let result = app.shell().sidecar("ffmpeg")?
            .args(args).output().await?;

        log::info!("STDERR:\n{}", String::from_utf8_lossy(&result.stderr));
        if result.status.success() {
            Ok::<(), anyhow::Error>(())
        } else {
            Err(anyhow!("FFmpeg exited with status: {:?}", result.status.code()))
        }
    };
    let monitor = async {
        monitor(info.id.clone(), task_gid, log_path, stream_info.duration, TaskType::Metadata, event).await?;
        Ok::<(), anyhow::Error>(())
    };
    let result = tokio::try_join!(task, monitor);
    result.context("Failed to add metadata")?;
    Ok(())
}

async fn monitor(
    id: String,
    gid: String,
    log_path: PathBuf,
    duration: u64,
    task_type: TaskType,
    event: &Channel<DownloadEvent>
) -> Result<()> {
    while !log_path.exists() {
        sleep(Duration::from_millis(250)).await;
    }
    let gid = Arc::new(gid);
    let id = Arc::new(id);
    event.send(DownloadEvent::Started { id: id.clone(), gid: gid.clone(), task_type })?;
    let mut last_size = 0u64;
    let mut progress = String::new();
    let mut out_time_us = 0u64;
    loop {
        let metadata = fs::metadata(&log_path)
            .await.with_context(||
                format!("Failed to get FFmpeg log metadata: {}", &log_path.to_string_lossy())
            )?;
        let mut file = fs::File::open(&log_path)
            .await.with_context(||
                format!("Failed to open FFmpeg log: {}", &log_path.to_string_lossy())
            )?;
        file.seek(SeekFrom::Start(last_size)).await?;
        let mut reader = io::BufReader::new(file);
        let mut line = String::new();
        while reader.read_line(&mut line).await.unwrap_or(0) > 0 {
            let (key, value) = line.trim().split_once('=').ok_or(anyhow!("Failed to parse FFmpeg Log"))?;
            let value = value.trim();
            match key.trim() {
                "progress" => progress = value.to_string(),
                "out_time_us" => out_time_us = value.parse().unwrap_or(0),
                _ => ()
            }
            line.clear();
        }
        last_size = metadata.len();
        match progress.as_str() {
            "continue" => {
                event.send(DownloadEvent::Progress {
                    id: id.clone(),
                    gid: gid.clone(),
                    content_length: duration,
                    chunk_length: (out_time_us / 1000),
                })?;
            },
            "end" => {
                event.send(DownloadEvent::Finished {
                    id: id.clone(),
                    gid: gid.clone(),
                })?;
                return Ok(());
            }
            _ => {},
        }
        sleep(Duration::from_millis(200)).await;
    }
}