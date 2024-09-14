use lazy_static::lazy_static;
use tauri_plugin_shell::{process::CommandChild, ShellExt};
use std::{collections::{HashSet, VecDeque}, fs, path::PathBuf, sync::{Arc, RwLock}, time::Instant};
use serde_json::{json, Value};
use tauri::{async_runtime, Emitter, WebviewWindow};
use tokio::{fs::File, io::{AsyncBufReadExt, AsyncSeekExt, BufReader, SeekFrom}, select, time::{sleep, Duration}};

use crate::{aria2c::*, get_app_handle, handle_err, CURRENT_BIN};

lazy_static! {
    static ref FFMPEG_CHILD: Arc<RwLock<Option<CommandChild>>> = Arc::new(RwLock::new(None));
}

pub async fn init_merge(window: &WebviewWindow, info: &VideoInfo) -> Result<(), String> {
    log::info!("Starting merge process for audio");

    let output_path = info.output_path.to_string_lossy().into_owned();
    let video_filename = info.output_path.file_name()
        .ok_or("Failed to extract video filename")?
        .to_string_lossy().into_owned();
    let app = get_app_handle();

    let video_path = info.video_path.clone();
    let audio_path = info.audio_path.clone();
    let progress_path = Arc::new(CURRENT_BIN.join("ffmpeg")
        .join(format!("{}.log", video_filename)));

    let ffmpeg_task = async_runtime::spawn({
        let progress_path = Arc::clone(&progress_path);
        async move {
        let status = app.shell().sidecar("./bin/ffmpeg").unwrap()
            .args([
                "-i", video_path.to_str().unwrap(),
                "-i", audio_path.to_str().unwrap(),
                "-stats_period", "0.1",
                "-c:v", "copy",
                "-c:a", "aac",
                &output_path, "-progress",
                progress_path.to_str().unwrap(), "-y"
            ])
            .status().await
            .map_err(|e| handle_err(e.to_string()))?;

        if status.success() {
            Ok(())
        } else {
            Err(format!("FFmpeg exited with status: {}", status.code().unwrap_or(-1)))
        }
    }});
    monitor_progress(window, info, &Arc::clone(&progress_path)).await?;
    select! { _ = ffmpeg_task => Ok(()) }
}

async fn monitor_progress(window: &WebviewWindow, info: &VideoInfo, progress_path: &PathBuf) -> Result<(), String> {
    while !progress_path.exists() {
        sleep(Duration::from_millis(250)).await;
    }
    let mut progress_lines = VecDeque::new();
    let mut last_size: u64 = 0;
    let mut last_log_time = Instant::now();
    loop {
        let mut printed_keys = HashSet::new();
        let metadata = fs::metadata(&progress_path).unwrap();
        if metadata.len() > last_size {
            let mut file = File::open(&progress_path).await.map_err(|e| handle_err(e))?;
            file.seek(SeekFrom::Start(last_size)).await.map_err(|e| handle_err(e))?;
            let mut reader = BufReader::new(file);
            let mut line = String::new();
            while reader.read_line(&mut line).await.unwrap() != 0 {
                if progress_lines.len() >= 12 {
                    progress_lines.pop_front();
                }
                progress_lines.push_back(line.clone());
                line.clear();
            }
            last_size = metadata.len();
        }
        let mut messages = Vec::new();
        for l in &progress_lines {
            let parts: Vec<&str> = l.split('=').collect();
            if parts.len() == 2 {
                let key = parts[0].trim();
                let value = parts[1].trim();
                if !printed_keys.contains(key) {
                    match key {
                        "frame" | "fps" | "out_time" | "speed" => {
                            messages.push(value);
                        },
                        _ => continue,
                    };
                    printed_keys.insert(key.to_string());
                }
            }
        }
        let formatted_values = json!({
            "gid": info.gid,
            "display_name": info.output_path,
            "frame": messages.get(0).unwrap_or(&"").to_string(),
            "fps": messages.get(1).unwrap_or(&"").to_string(),
            "progress": "100%".to_string(),
            "out_time": messages.get(2).unwrap_or(&"").to_string(),
            "speed": messages.get(3).unwrap_or(&"").to_string(),
            "type": "merge".to_string()
        });
        let formatted_array: Vec<String> = formatted_values.as_object().unwrap()
        .iter().map(|(_key, value)| {
            match value { Value::String(s) => format!("{}", s),
             _ => format!("{}", value) }
        }).collect();
        if last_log_time.elapsed() >= Duration::from_secs(1) {
            log::info!("{:?}", formatted_array.join(" | "));
            last_log_time = Instant::now();
        }
        window.emit("progress", &formatted_values).map_err(|e| handle_err(e))?;
        if progress_lines.iter().any(|l| l.starts_with("progress=end")) {
            return Ok(());
        }
        sleep(Duration::from_millis(500)).await;
    }
}

pub fn kill() -> Result<(), String> {
    if let Some(sc) = FFMPEG_CHILD.write().unwrap().take() {
        sc.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}