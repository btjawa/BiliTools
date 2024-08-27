use lazy_static::lazy_static;
use sea_orm::FromJsonQueryResult;
use serde_json::{Value, json};
use serde::{Deserialize, Serialize};
use std::{collections::VecDeque, fs, net::{SocketAddr, TcpListener}, path::PathBuf, process, sync::{Arc, RwLock}, time::Instant};
use tokio::{sync::{Mutex, Notify}, time::{sleep, Duration}};
use tauri::{async_runtime, Manager, WebviewWindow};
use tauri_plugin_http::reqwest;
use tauri_plugin_shell::{process::CommandChild, ShellExt};

use crate::{downloads, ffmpeg, get_app_handle, handle_err, init_client, CURRENT_BIN, DOWNLOAD_DIR, SECRET, TEMP_DIR};

lazy_static! {
    pub static ref MAX_CONC_DOWNS: Arc<RwLock<i64>> = Arc::new(RwLock::new(3));
    pub static ref WAITING_QUEUE: Mutex<VecDeque<VideoInfo>> = Mutex::new(VecDeque::new());
    pub static ref DOING_QUEUE: Mutex<VecDeque<VideoInfo>> = Mutex::new(VecDeque::new());
    pub static ref COMPLETE_QUEUE: Mutex<VecDeque<VideoInfo>> = Mutex::new(VecDeque::new());
    static ref ARIA2C_PORT: Arc<RwLock<usize>> = Arc::new(RwLock::new(0));
    static ref ARIA2C_CHILD: Arc<RwLock<Option<CommandChild>>> = Arc::new(RwLock::new(None));
    static ref DOWNLOAD_COMPLETED_NOTIFY: Notify = Notify::new();
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult)]
pub struct VideoInfo {
    pub gid: Value,
    pub display_name: String,
    pub video_path: PathBuf,
    pub audio_path: PathBuf,
    pub output_path: PathBuf,
    pub tasks: Vec<DownloadTask>,
    pub action: String,
    pub queue_info: QueueInfo
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult)]
pub struct DownloadTask {
    pub gid: String,
    pub display_name: String,
    pub url: Vec<String>,
    pub path: PathBuf,
    pub file_type: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult)]
pub struct QueueInfo {
    pub title: String,
    pub display_name: String,
    pub cover: String,
    pub desc: String,
    pub duration: i32,
    pub id: i32,
    pub cid: i32,
    pub eid: i32,
    pub ss_title: String,
    pub urls: QueueInfoURLs,
    pub time: String,
    pub gids: Option<QueueInfoGIDs>
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult)]
pub struct QueueInfoURLs {
    video: Vec<String>,
    audio: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult)]
pub struct QueueInfoGIDs {
    vgid: Option<String>,
    agid: Option<String>,
}

pub fn init() -> Result<(), String> {
    let start_port = 6800;
    let end_port = 65535;
    let port = (start_port..end_port)
        .find_map(|port| TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], port))).ok())
        .ok_or("No free port found".to_string())?.local_addr().unwrap().port();
    *ARIA2C_PORT.write().unwrap() = port as usize;
    let app = get_app_handle();
    let (_, child) = app.shell().sidecar("./bin/aria2c").unwrap()
        .current_dir(&*CURRENT_BIN)
        .args([
            format!("--conf-path={}", CURRENT_BIN.join("aria2.conf").to_string_lossy()),
            format!("--rpc-listen-port={}", port),
            format!("--rpc-secret={}", &SECRET.read().unwrap()),
            format!("--max-concurrent-downloads={}", MAX_CONC_DOWNS.read().unwrap())
        ]).spawn().map_err(|e| handle_err(e))?;

    let pid = child.pid();
    *ARIA2C_CHILD.write().unwrap() = Some(child);
    #[cfg(target_os = "windows")]
    app.shell().sidecar("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe").unwrap()
        .args([
            "-Command",
            &format!(
                "while ((Get-Process -Id {} -ErrorAction SilentlyContinue) -ne $null) \
                {{ Start-Sleep -Milliseconds 500 }}; Stop-Process -Id {} -Force",
                process::id(),
                pid
            )
        ]).spawn().map_err(|e| handle_err(e))?;

    #[cfg(target_os = "macos")]
    app.shell().sidecar("/bin/bash").unwrap()
        .args([
            "-c",
            &format!(
                "while kill -0 {} 2>/dev/null; do sleep 0.5; done; kill {}",
                process::id(),
                pid
            )
        ]).spawn().map_err(|e| e.to_string())?;

    Ok(())
}

pub fn kill() -> Result<(), String> {
    if let Some(sc) = ARIA2C_CHILD.write().unwrap().take() {
        sc.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn push_back_queue(queue_info: QueueInfo) -> Result<Value, String> {
    let mut tasks = vec![];
    let client = init_client().await.map_err(|e| handle_err(e))?;
    let ss_dir = &queue_info.ss_title;
    let display_name = &queue_info.display_name;
    let urls = queue_info.urls.clone();
    let action = if !urls.video.is_empty() && !urls.audio.is_empty() { "media" }
        else if !urls.video.is_empty() { "video" } else { "audio" }.into();
    
    for (url, file_type) in vec![(urls.video, "video"), (urls.audio, "audio")].into_iter() {
        let purl = reqwest::Url::parse(&url[0]).map_err(|e| handle_err(e))?;
        let filename = purl.path_segments().unwrap().last().unwrap();
        let path = TEMP_DIR.read().unwrap().join("com.btjawa.bilitools").join(format!("{}_{}", queue_info.time, filename)).join(filename);
        let init_payload = json!({
            "jsonrpc": "2.0",
            "method": "aria2.addUri",
            "id": "1",
            "params": [
                format!("token:{}", *SECRET.read().unwrap()),
                url,
                {
                    "dir": path.parent().unwrap().to_str().unwrap(),
                    "out": path.file_name().unwrap().to_str().unwrap()
                }
            ]
        });
        let response = client
            .post(format!("http://localhost:{}/jsonrpc", ARIA2C_PORT.read().unwrap()))
            .json(&init_payload)
            .send().await.map_err(|e| handle_err(e))?;

        let body: Value = response.json().await.map_err(|e| handle_err(e))?;
        let gid = body["result"].as_str().unwrap().to_string();
        handle_download(gid.clone(), "pause").await.map_err(|e| handle_err(e))?;
        tasks.push(DownloadTask {
            gid, url, path,
            display_name: display_name.clone(), 
            file_type: file_type.to_string()
        });
    }
    let vgid = tasks.iter().find(|t| t.file_type == "video").map(|t| &*t.gid).unwrap_or_default();
    let agid = tasks.iter().find(|t| t.file_type == "audio").map(|t| &*t.gid).unwrap_or_default();
    let gids: Value = json!({"vgid": vgid, "agid": agid});
    let info = VideoInfo {
        gid: gids.clone(),
        display_name: display_name.clone(),
        video_path: tasks.iter().find(|t| t.file_type == "video").map(|t| t.path.clone()).unwrap_or_default(),
        audio_path: tasks.iter().find(|t| t.file_type == "audio").map(|t| t.path.clone()).unwrap_or_default(),
        output_path:  DOWNLOAD_DIR.read().unwrap().join(ss_dir.clone()),
        tasks, action, queue_info
    };
    update_queue("push", Some(info), None).await;
    Ok(gids)
}

#[tauri::command]
pub async fn handle_download(gid: String, action: &str) -> Result<Value, String> {
    let client = init_client().await.map_err(|e| handle_err(e))?;
    let payload = json!({
        "jsonrpc": "2.0",
        "method": format!("aria2.{}", action),
        "id": "1",
        "params": [format!("token:{}", *SECRET.read().unwrap()), gid]
    });
    let resp = client
        .post(format!("http://localhost:{}/jsonrpc", ARIA2C_PORT.read().unwrap()))
        .json(&payload)
        .send().await.map_err(|e| handle_err(e))?;

    let resp_data: Value = resp.json().await.map_err(|e| handle_err(e))?;
    Ok(json!(resp_data))
}

#[tauri::command]
pub async fn process_queue(window: WebviewWindow, date: String) -> Result<(), String> {
    log::info!("Processing queue...");
    let mut waiting_len = { WAITING_QUEUE.lock().await.len() as i64 };
    loop {
        if waiting_len == 0 { break; }
        let max_conc = *MAX_CONC_DOWNS.read().unwrap();
        let doing_len = { DOING_QUEUE.lock().await.len() as i64 };
        for _ in 0..max_conc.saturating_sub(doing_len) {
            if let Some(info) = update_queue("waiting", None, Some(&date)).await {
                let window_clone = window.clone();
                async_runtime::spawn(async move {
                    process_download(&window_clone, &info).await.unwrap();
                });
            }
        }
        waiting_len -= 1;
        DOWNLOAD_COMPLETED_NOTIFY.notified().await;
    }
    Ok(())
}

async fn process_download(window: &WebviewWindow, info: &VideoInfo) -> Result<(), String> {
    fs::create_dir_all(&info.output_path.parent().unwrap()).map_err(|e| handle_err(e))?;
    let action = &info.action;
    for task in &info.tasks {
        if let Ok(_) = download_file(&window, &task, &info.gid).await {
            if *action == "only" {
                fs::rename(&task.path, &info.output_path)
                .map_err(|e| handle_err(e))?;
            }
        }
    }
    if *action == "multi" {
        ffmpeg::init_merge(&window, &info).await
        .map_err(|e| handle_err(e))?;
    }
    update_queue("doing", None, None).await;
    Ok(())
}

fn add_timestamp(mut info: VideoInfo, date: &String) -> VideoInfo {
    let mut output_path_str = info.output_path.to_string_lossy().to_string();
    output_path_str += &format!("_{}", date);
    info.output_path = PathBuf::from(output_path_str).join(&info.display_name);
    info
}

async fn update_queue(action: &str, info: Option<VideoInfo>, date: Option<&String>) -> Option<VideoInfo> {
    let mut waiting_queue = WAITING_QUEUE.lock().await;
    let mut doing_queue = DOING_QUEUE.lock().await;
    let mut complete_queue = COMPLETE_QUEUE.lock().await;
    let mut result_info: Option<VideoInfo> = None;
    match action {
        "push" => {
            if let Some(org_info) = info {
                let info = if let Some(date) = date {
                    add_timestamp(org_info, date)
                } else { org_info };
                waiting_queue.push_back(info.clone());
                result_info = Some(info);
            }
        },
        "waiting" => {
            if let Some(org_info) = waiting_queue.pop_front() {
                let info = if let Some(date) = date {
                    add_timestamp(org_info, date)
                } else { org_info };
                doing_queue.push_back(info.clone());
                result_info = Some(info);
            }
        },
        "doing" => {
            if let Some(org_info) = doing_queue.pop_front() {
                let info = if let Some(date) = date {
                    add_timestamp(org_info, date)
                } else { org_info };
                downloads::insert(info.clone()).await.map_err(|e| handle_err(e)).unwrap();
                complete_queue.push_back(info.clone());
                log::info!("Finished. Notifying process_queue...");
                DOWNLOAD_COMPLETED_NOTIFY.notify_one();
                result_info = Some(info);
            }
        },
        _ => {}
    }
    let queue = json!({
        "waiting": waiting_queue.iter().map(|info| json!(info)).collect::<Vec<_>>(),
        "doing": doing_queue.iter().map(|info| json!(info)).collect::<Vec<_>>(),
        "complete": complete_queue.iter().map(|info| json!(info)).collect::<Vec<_>>(),
    });
    crate::get_window().emit("download-queue", queue).unwrap();
    result_info
}

async fn download_file(window: &WebviewWindow, task: &DownloadTask, gid: &Value) -> Result<String, String> {
    log::info!("Start download: {}", &task.display_name);
    let client = init_client().await.map_err(|e| handle_err(e))?;
    handle_download(task.gid.clone(), "unpause").await.map_err(|e| handle_err(e))?;
    let mut last_log_time = Instant::now();
    loop {
        let status_payload = json!({
            "jsonrpc": "2.0",
            "method": "aria2.tellStatus",
            "id": "1",
            "params": [format!("token:{}", *SECRET.read().unwrap()), task.gid]
        });
        let status_resp = client
            .post(format!("http://localhost:{}/jsonrpc", ARIA2C_PORT.read().unwrap()))
            .json(&status_payload)
            .send().await.map_err(|e| handle_err(e))?;

        let status_resp_data: Value = status_resp.json().await.map_err(|e| handle_err(e))?;
        if let Some(e) = status_resp_data["error"].as_object() {
            let error_code = e.get("code").and_then(|c| c.as_i64()).unwrap();
            let error_message = e.get("message").and_then(|m| m.as_str()).unwrap();
            let err = format!("Error code {}: {}", error_code, error_message);
            handle_err(&err);
            return Err(err);
        }
        let completed_length = status_resp_data["result"]["completedLength"].as_str().unwrap().parse::<f64>().unwrap();
        let total_length = status_resp_data["result"]["totalLength"].as_str().unwrap().parse::<f64>().unwrap();
        let download_speed = status_resp_data["result"]["downloadSpeed"].as_str().unwrap().parse::<f64>().unwrap();
        let downloaded = completed_length as f64 / 1024.0 / 1024.0;
        let speed = download_speed as f64 / 1024.0 / 1024.0;
        let progress = if total_length > 0.0 {
            (completed_length as f64 / total_length as f64) * 100.0
        } else { 0.0 };
        let remaining = if download_speed > 0.0 {
            (total_length - completed_length) as f64 / download_speed as f64
        } else { 0.0 };
        let status = status_resp_data["result"]["status"].as_str();
        let is_paused = status == Some("paused");
        let formatted_values = json!({
            "remaining": if is_paused { "已暂停".to_string() } else { format!("{:.2} s", remaining) },
            "downloaded": if is_paused { "已暂停".to_string() } else { format!("{:.2} MB", downloaded) },
            "speed": if is_paused { "已暂停".to_string() } else { format!("{:.2} MB/s", speed) },
            "progress": format!("{:.2}%", progress),
            "display_name": task.display_name,
            "gid": gid,
            "file_type": task.file_type,
            "type": "download".to_string()
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
        window.emit("progress", &formatted_values).unwrap();
        if status == Some("complete") { break; }
        sleep(Duration::from_millis(500)).await;
    }
    Ok(task.display_name.to_string())
}