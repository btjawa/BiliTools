use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use tauri::{async_runtime, ipc::Channel, Manager};
use std::{io::SeekFrom, path::PathBuf, sync::{Arc, RwLock}, time::Duration};
use tokio::{fs, io::{self, AsyncBufReadExt, AsyncSeekExt}, time::sleep};
use tauri_plugin_shell::{process::CommandChild, ShellExt};
use regex::Regex;
use crate::{aria2c::{QueueInfo, DownloadEvent, Task}, shared::get_app_handle};

lazy_static! {
    static ref FFMPEG_CHILD: Arc<RwLock<Option<CommandChild>>> = Arc::new(RwLock::new(None));
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct FFmpegLog {
    frame: u64,
    fps: f64,
    stream_0_0_q: f64,
    bitrate: String,
    total_size: u64,
    out_time_us: u64,
    out_time_ms: u64,
    out_time: String,
    dup_frames: u32,
    drop_frames: u32,
    speed: String,
    progress: String,
}

async fn get_frames(input: PathBuf) -> Result<u64, String> {
    let app = get_app_handle();
    let meta_output = app.shell().sidecar("./bin/ffmpeg").unwrap()
        .args([
            "-i", input.to_str().unwrap(),
            "-map", "0:v:0",
            "-c", "copy",
            "-f", "null", "-"
        ])
        .output().await
        .map_err(|e| e.to_string())?;

    let stderr = String::from_utf8_lossy(&meta_output.stderr);
    log::info!("{:?}", &stderr);
    return Regex::new(r"frame=\s*(\d+)").unwrap().captures_iter(&stderr)
        .filter_map(|caps| caps.get(1)?.as_str().trim().parse::<u64>().ok())
        .find(|&num| num > 1).ok_or("Failed to parse frame count".to_string());
}

pub async fn merge(info: QueueInfo, event: &Channel<DownloadEvent>) -> Result<(), String> {
    if info.tasks.len() < 2 {
        return Err(format!("Insufficient number of input paths, {}", info.tasks.len()));
    }
    let paths: Vec<_> = info.tasks.iter().map(|task| task.path.clone()).collect();
    let output = info.output;
    let output_filename = output.file_name()
        .ok_or("Failed to extract video filename")?
        .to_string_lossy().into_owned();

    let video_path = info.tasks.iter()
        .find(|task| task.media_type == "video")
        .map(|task| task.path.clone()).unwrap();

    let progress_path = get_app_handle().path().app_log_dir().unwrap()
        .join("ffmpeg").join(format!("{}.log", output_filename));

    fs::create_dir_all(progress_path.parent().unwrap()).await.map_err(|e| e.to_string())?;
    fs::write(&progress_path, &[]).await.map_err(|e| e.to_string())?;
    let frames = get_frames(video_path.unwrap()).await.map_err(|e| {
        event.send(DownloadEvent::Error { code: -1, message: e.to_string() }).unwrap();
        e.to_string()
    }).unwrap_or(0);
    let app = get_app_handle();
    async_runtime::spawn(async move {
        let progress_path = get_app_handle().path().app_log_dir().unwrap()
            .join("ffmpeg").join(format!("{}.log", output_filename));
        let status = app.shell().sidecar("./bin/ffmpeg").unwrap()
            .args([
                "-i", paths[0].clone().unwrap().to_str().unwrap(),
                "-i", paths[1].clone().unwrap().to_str().unwrap(),
                "-stats_period", "0.1",
                "-c:v", "copy",
                "-c:a", "aac",
                output.to_str().unwrap(), "-progress",
                progress_path.to_str().unwrap(), "-y"
            ])
            .status().await
            .map_err(|e| e.to_string())?;
    
        if status.success() {
            Ok(())
        } else {
            Err(format!("FFmpeg exited with status: {}", status.code().unwrap_or(-1)))
        }
    });
    let ffmpeg_task = info.tasks.iter().find(|task| task.media_type == "video").unwrap();
    monitor(ffmpeg_task, progress_path, frames, event).await.map_err(|e| {
        event.send(DownloadEvent::Error { code: -1, message: e.to_string() }).unwrap();
        e.to_string()
    })?;
    Ok(())
}

async fn monitor(task: &Task, progress_path: PathBuf, frames: u64, event: &Channel<DownloadEvent>) -> Result<(), String> {
    while !progress_path.exists() {
        sleep(Duration::from_millis(250)).await;
    }
    let gid = task.clone().gid.unwrap_or(String::new());
    event.send(DownloadEvent::Started { gid, media_type: "merge".into() }).unwrap();
    let mut last_size: u64 = 0;
    let mut map = Map::new();
    let mut keys = Vec::new();
    loop {
        let gid = task.clone().gid.unwrap_or(String::new());
        let metadata = fs::metadata(&progress_path).await.map_err(|e| e.to_string())?;
        let mut file = fs::File::open(&progress_path).await.map_err(|e| e.to_string())?;
        let _ = file.seek(SeekFrom::Start(last_size)).await;
        let mut reader = io::BufReader::new(file);
        let mut line = String::new();
        while reader.read_line(&mut line).await.unwrap_or(0) > 0 {
            if let Some((key, value)) = line.trim().split_once('=') {
                let key = key.trim().to_string();
                let value = value.trim();
                if keys.len() >= 12 {
                    if let Some(oldest_key) = keys.remove(0) {
                        map.remove(&oldest_key);
                    }
                }
                let value = if let Ok(number) = value.parse::<u64>() {
                    json!(number)
                } else if let Ok(number) = value.parse::<f64>() {
                    json!(number)
                } else {
                    json!(value)
                };
                map.insert(key.clone(), value);
                keys.push(Some(key));
            }
            line.clear();
        }
        last_size = metadata.len();
        if map.is_empty() { continue; }
        let log_data: FFmpegLog = serde_json::from_value(Value::Object(map.clone())).map_err(|e| {log::info!("{}", e.to_string()); e.to_string()})?;
        match log_data.progress.as_str() {
            "continue" => {
                event.send(DownloadEvent::Progress {
                    gid: gid.clone(),
                    content_length: frames,
                    chunk_length: log_data.frame,
                }).unwrap();
            },
            "end" => {
                event.send(DownloadEvent::Progress {
                    gid: gid.clone(),
                    content_length: frames,
                    chunk_length: frames,
                }).unwrap();
                event.send(DownloadEvent::Finished {
                    gid: gid.clone(),
                }).unwrap();
                return Ok(());
            }
            _ => {},
        }
        sleep(Duration::from_millis(200)).await;
    }
}

pub fn kill() -> Result<(), String> {
    if let Some(sc) = FFMPEG_CHILD.write().unwrap().take() {
        sc.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}