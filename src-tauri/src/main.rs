// Prevents additional console window on Windows in release, DO NOT REMOVE!!
// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod logger;
mod services;

use lazy_static::lazy_static;
use serde_json::{Value, json};
use serde::{Deserialize, Serialize};
use std::{collections::{HashMap, HashSet, VecDeque}, env, fs, panic, path::PathBuf, process::{Command, Stdio},
sync::{atomic::{AtomicBool, Ordering}, mpsc, Arc, RwLock as StdRwlock}, time::Instant};
use tokio::{fs::File, sync::{Mutex, Notify}, io::{AsyncBufReadExt, AsyncSeekExt, SeekFrom, BufReader}, time::{sleep, Duration}};
use tauri::{async_runtime, Manager, WebviewWindow};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_http::reqwest::{self, Client, header, header::{HeaderMap, HeaderName, HeaderValue}, Url};
use rand::{distributions::Alphanumeric, Rng};
use walkdir::WalkDir;
use services::{aria2c, cookies, dh};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "macos")]
use nix::{sys::signal::{self, Signal}, unistd::{setpgid, Pid}};

lazy_static! {
    static ref LOGIN_POLLING: Arc<AtomicBool> = Arc::new(AtomicBool::new(false));
    static ref WORKING_DIR: PathBuf = dirs_next::data_local_dir().unwrap().join("com.btjawa.bilitools");
    static ref DOWNLOAD_DIR: Arc<StdRwlock<PathBuf>> = Arc::new(StdRwlock::new(dirs_next::desktop_dir().unwrap()));
    static ref TEMP_DIR: Arc<StdRwlock<PathBuf>> = Arc::new(StdRwlock::new(PathBuf::from(env::temp_dir())));
    static ref CURRENT_BIN: PathBuf = {
        let root = env::current_exe().unwrap().parent().unwrap().to_path_buf();
        root.join(if root.join("bin").exists() { "bin" } else { "../Resources/bin" })
    };
    static ref SECRET: Arc<StdRwlock<String>> = Arc::new(StdRwlock::new(String::new()));
    static ref WAITING_QUEUE: Mutex<VecDeque<VideoInfo>> = Mutex::new(VecDeque::new());
    static ref DOING_QUEUE: Mutex<VecDeque<VideoInfo>> = Mutex::new(VecDeque::new());
    static ref COMPLETE_QUEUE: Mutex<VecDeque<VideoInfo>> = Mutex::new(VecDeque::new());
    static ref READY: Arc<StdRwlock<bool>> = Arc::new(StdRwlock::new(false));
    static ref DOWNLOAD_COMPLETED_NOTIFY: Notify = Notify::new();
}

fn handle_err<E: std::fmt::Display>(e: E) -> String {
    let err_msg = e.to_string();
    log::error!("{}", err_msg);
    async_runtime::spawn(async move {
        services::get_app_handle().unwrap().get_webview_window("main").unwrap().emit("error", &err_msg).unwrap();
    });
    e.to_string()
}

fn init_headers() -> HashMap<String, String> {
    let mut headers = HashMap::new();
    headers.insert("User-Agent".into(), "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36".into());
    let cookies = cookies::load().map_err(|e| e.to_string()).unwrap();
    headers.insert("Cookie".into(), cookies.iter()
        .map(|(key, value)| format!("{}={}", key, value).replace("\"", ""))
        .collect::<Vec<_>>().join("; ") + ";");
    headers.insert("Referer".into(), "https://www.bilibili.com".into());
    return headers
}

fn init_client() -> Client {
    let mut headers = HeaderMap::new();
    for (key, value) in init_headers() {
    headers.insert(
        HeaderName::from_bytes(key.as_bytes()).unwrap(),
        HeaderValue::from_str(&value).unwrap()
    );}
    Client::builder()
        .default_headers(headers)
        .build()
        .unwrap()
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct VideoInfo {
    gid: Value,
    display_name: String,
    video_path: PathBuf,
    audio_path: PathBuf,
    output_path: PathBuf,
    tasks: Vec<DownloadTask>,
    action: String,
    media_data: Value
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct DownloadTask {
    gid: String,
    display_name: String,
    url: Vec<String>,
    path: PathBuf,
    file_type: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct Settings {
    max_conc: i64,
    temp_dir: String,
    down_dir: String
}

async fn get_buvid() -> Result<String, String> {
    let client = init_client();
    let buvid3_resp = client
        .get("https://www.bilibili.com")
        .send().await.map_err(|e| handle_err(e))?;
    let cookie_headers: Vec<String> = buvid3_resp.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();
    { for cookie in cookie_headers.clone() {
        cookies::insert(&cookie).map_err(|e| handle_err(e))?;
    } }
    let buvid4_resp = client
        .get("https://api.bilibili.com/x/frontend/finger/spi")
        .send().await.map_err(|e| handle_err(e))?;
    let buvid4_resp_data: Value = buvid4_resp.json().await.map_err(|e| handle_err(e))?;
    if buvid4_resp_data["code"].as_i64() == Some(0) {
        if let Some(buvid4) = buvid4_resp_data["data"]["b_4"].as_str() { 
            let buvid4 = format!(
                "buvid4={}; Path=/; Domain=bilibili.com", buvid4
            );
            { cookies::insert(&buvid4).map_err(|e| handle_err(e))?; }
        }
        return Ok("Successfully got buvid".to_string());
    } else {
        log::error!("{}, {}", buvid4_resp_data["code"], buvid4_resp_data["message"]);
        return Err(format!("{}, {}", buvid4_resp_data["code"], buvid4_resp_data["message"]).to_string())
    }
}

#[tauri::command]
async fn push_back_queue(
    video_url: Option<Vec<String>>, audio_url: Option<Vec<String>>,
    action: String, media_data: Value, date: String
) -> Result<Value, String> {
    let mut tasks = vec![];
    let client = init_client();
    let ss_dir = &media_data.get("ss_title").unwrap().as_str().unwrap().to_string();
    let display_name = media_data.get("display_name").unwrap().as_str().unwrap().to_string();
    for (url, file_type) in vec![(video_url, "video"), (audio_url, "audio")].into_iter().filter_map(|(url, t)| url.map(|u| (u, t))) {
        let purl = Url::parse(&url[0]).map_err(|e| handle_err(e))?;
        let filename = purl.path_segments().unwrap().last().unwrap();
        let path = TEMP_DIR.read().unwrap().join(format!("{}_{}.bilitools.downloading", date, filename)).join(filename);
        let init_payload = json!({
            "jsonrpc": "2.0",
            "method": "aria2.addUri",
            "id": "1",
            "params": [
                format!("token:{}", *SECRET.read().unwrap()),
                url,
                {"dir": path.parent().unwrap().to_str().unwrap(), "out": path.file_name().unwrap().to_str().unwrap()}
            ]
        });
        let init_resp = client
            .post(format!("http://localhost:{}/jsonrpc", aria2c::ARIA2C_PORT.read().unwrap()))
            .json(&init_payload)
            .send().await.map_err(|e| handle_err(e))?;

        let init_resp_data: Value = init_resp.json().await.map_err(|e| handle_err(e))?;
        let gid = init_resp_data["result"].as_str().unwrap().to_string();
        handle_download(gid.clone(), "pause".to_string()).await.map_err(|e| handle_err(e))?;
        tasks.push(DownloadTask {
            gid, url, path,
            display_name: display_name.clone(), 
            file_type: file_type.to_string()
        });
    }
    let vgid = tasks.iter().find(|t| t.file_type == "video").map(|t| t.gid.clone()).unwrap_or_default();
    let agid = tasks.iter().find(|t| t.file_type == "audio").map(|t| t.gid.clone()).unwrap_or_default();
    let gid: Value = json!({"vgid": vgid, "agid": agid});
    let info = VideoInfo {
        gid: gid.clone(),
        display_name: display_name.clone(),
        video_path: tasks.iter().find(|t| t.file_type == "video").map(|t| t.path.clone()).unwrap_or_default(),
        audio_path: tasks.iter().find(|t| t.file_type == "audio").map(|t| t.path.clone()).unwrap_or_default(),
        output_path:  DOWNLOAD_DIR.read().unwrap().join(ss_dir.clone()),
        tasks, action, media_data
    };
    update_queue("push", Some(info.clone()), None).await;
    Ok(gid)
}

#[tauri::command]
async fn process_queue(window: WebviewWindow, date: String) -> Result<(), String> {
    log::info!("Processing queue...");
    let mut waiting_len = { WAITING_QUEUE.lock().await.len() as i64 };
    loop {
        if waiting_len == 0 { break; }
        let max_conc = *aria2c::MAX_CONC_DOWNS.read().unwrap();
        let doing_len = { DOING_QUEUE.lock().await.len() as i64 };
        for _ in 0..max_conc.saturating_sub(doing_len) {
            if let Some(video_info) = update_queue("waiting", None, Some(date.clone())).await {
                let window_clone = window.clone();
                async_runtime::spawn(async move {
                    process_download(window_clone, video_info).await.unwrap();
                });
            }
        }
        waiting_len -= 1;
        DOWNLOAD_COMPLETED_NOTIFY.notified().await;
    }
    Ok(())
}

async fn process_download(window: WebviewWindow, download_info: VideoInfo) -> Result<(), String> {
    fs::create_dir_all(&download_info.output_path.parent().unwrap()).map_err(|e| handle_err(e))?;
    let action = &download_info.action;
    for task in &download_info.tasks {
        if let Ok(_) = download_file(window.clone(), task.clone(), download_info.gid.clone()).await {
            if *action == "only" {
                fs::rename(task.path.clone(), download_info.output_path.clone())
                .map_err(|e| handle_err(e))?;
            }
        }
    }
    if *action == "multi" {
        merge_video_audio(window.clone(), download_info.clone()).await
        .map_err(|e| handle_err(e))?;
    }
    update_queue("doing", None, None).await;
    Ok(())
}

fn add_timestamp(mut info: VideoInfo, date: String) -> VideoInfo {
    let mut output_path_str = info.output_path.to_string_lossy().to_string();
    output_path_str += &format!("_{}", date);
    info.output_path = PathBuf::from(output_path_str).join(&info.display_name);
    info
}

async fn update_queue(action: &str, info: Option<VideoInfo>, date: Option<String>) -> Option<VideoInfo> {
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
                dh::insert(info.clone()).await.map_err(|e| handle_err(e)).unwrap();
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
    services::get_app_handle().unwrap().get_webview_window("main").unwrap().emit("download-queue", queue).unwrap();
    result_info
}

async fn download_file(window: WebviewWindow, task: DownloadTask, gid: Value) -> Result<String, String> {
    log::info!("Starting download for: {}", &task.display_name);
    let client = init_client();
    handle_download(task.gid.clone(), "unpause".to_string()).await.map_err(|e| handle_err(e))?;
    let mut last_log_time = Instant::now();
    loop {
        let status_payload = json!({
            "jsonrpc": "2.0",
            "method": "aria2.tellStatus",
            "id": "1",
            "params": [format!("token:{}", *SECRET.read().unwrap()), task.gid]
        });
        let status_resp = client
            .post(format!("http://localhost:{}/jsonrpc", aria2c::ARIA2C_PORT.read().unwrap()))
            .json(&status_payload)
            .send().await.map_err(|e| handle_err(e))?;

        let status_resp_data: Value = status_resp.json().await.map_err(|e| handle_err(e))?;
        if let Some(e) = status_resp_data["error"].as_object() {
            let error_code = e.get("code").and_then(|c| c.as_i64()).unwrap();
            let error_message = e.get("message").and_then(|m| m.as_str()).unwrap();
            let err = format!("Error code {}: {}", error_code, error_message);
            handle_err(err.clone());
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
        sleep(Duration::from_secs(1)).await;
    }
    Ok(task.display_name.to_string())
}

async fn merge_video_audio(window: WebviewWindow, info: VideoInfo) -> Result<VideoInfo, String> {
    log::info!("Starting merge process for audio");
    let ffmpeg_path = CURRENT_BIN.join(
        if cfg!(target_os = "windows") { "ffmpeg.exe" } else { "ffmpeg" }
    );
    let output_path = info.output_path.to_string_lossy();
    let video_filename = &info.output_path.file_name().unwrap().to_string_lossy();
    let video_path = info.video_path.clone();
    let audio_path = info.audio_path.clone();
    let progress_path = CURRENT_BIN.join("ffmpeg")
        .join(format!("{}.log", video_filename));

    let mut command = Command::new(ffmpeg_path);
    #[cfg(target_os = "windows")]
    command.creation_flags(0x08000000);
    command.arg("-i").arg(video_path.clone())
        .arg("-i").arg(audio_path.clone())
        .arg("-stats_period").arg("0.1")
        .arg("-c:v").arg("copy")
        .arg("-c:a").arg("aac")
        .arg(&*output_path).arg("-progress")
        .arg(&progress_path).arg("-y")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = command.spawn().map_err(|e| handle_err(e))?;

    while !progress_path.exists() {
        sleep(Duration::from_millis(250)).await;
    }
    let mut progress_lines = VecDeque::new();
    let mut last_size: u64 = 0;
    let mut last_log_time = Instant::now();
    loop {
        let mut printed_keys = HashSet::new();
        let metadata = fs::metadata(&progress_path.clone()).unwrap();
        if metadata.len() > last_size {
            let mut file = File::open(&progress_path.clone()).await.map_err(|e| handle_err(e))?;
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
            "display_name": video_filename,
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
            break;
        }
        sleep(Duration::from_millis(100)).await;
    }
    let status = child.wait().map_err(|e| handle_err(e))?;
    fs::remove_dir_all(video_path.parent().unwrap()).map_err(|e| handle_err(e))?;
    fs::remove_dir_all(audio_path.parent().unwrap()).map_err(|e| handle_err(e))?;
    fs::remove_file(progress_path).map_err(|e| handle_err(e))?;
    if status.success() {
        log::info!("FFmpeg process completed.");
        Ok(info)
    } else {
        fs::remove_file(&*output_path).map_err(|e| handle_err(e))?;
        Err("FFmpeg command failed".to_string())
    }
}

#[tauri::command]
async fn handle_download(gid: String, action: String) -> Result<Value, String> {
    let client = init_client();
    let payload = json!({
        "jsonrpc": "2.0",
        "method": format!("aria2.{}", action),
        "id": "1",
        "params": [format!("token:{}", *SECRET.read().unwrap()), gid]
    });
    let resp = client
        .post(format!("http://localhost:{}/jsonrpc", aria2c::ARIA2C_PORT.read().unwrap()))
        .json(&payload)
        .send().await.map_err(|e| handle_err(e))?;

    let resp_data: Value = resp.json().await.map_err(|e| handle_err(e))?;
    Ok(json!(resp_data))
}

#[tauri::command]
async fn handle_temp(action: String) -> Result<String, String> {
    let mut bytes = 0;
    let walker = WalkDir::new(&TEMP_DIR.read().unwrap().clone()).into_iter().filter_map(|e| e.ok())
    .filter(|e| e.file_name().to_str().map_or(false, |s| s.ends_with(".bilitools.downloading")));
    for entry in walker {
        for entry in WalkDir::new(entry.path().to_str().unwrap()) {
            let entry = entry.unwrap();
            let path = entry.path();
            if action == "calc" { bytes += fs::metadata(path).unwrap().len(); }
            else if action == "clear" {
                if path.is_file() && !path.file_name().unwrap()
                .to_str().map_or(false, |s| s.ends_with(".aria2")) {
                    fs::remove_file(&path).map_err(|e| handle_err(e))?;
                }
            }
        }
        let _ = fs::remove_dir(&entry.path());
    }
    const KIB: u64 = 1024;
    const MIB: u64 = KIB * 1024;
    const GIB: u64 = MIB * 1024;
    let r = if bytes >= GIB { format!("{:.2} GB", bytes as f64 / GIB as f64) }
    else if bytes >= MIB { format!("{:.2} MB", bytes as f64 / MIB as f64) }
    else { format!("{:.2} KB", bytes as f64 / KIB as f64) };
    Ok(r)
}

#[tauri::command]
fn rw_config(action: &str, settings: Option<Settings>, secret: String) -> Result<&str, String> {
    let window = services::get_window();
    if secret != *SECRET.read().unwrap() {
        window.emit("error", "403 Forbidden<br>\n请重启应用").unwrap();
        return Err("403 Forbidden".to_string())
    }
    let work_dir = WORKING_DIR.clone();
    let config = Arc::new(StdRwlock::new(Settings {
        temp_dir: TEMP_DIR.read().unwrap().to_string_lossy().into_owned(),
        down_dir: DOWNLOAD_DIR.read().unwrap().to_string_lossy().into_owned(),
        max_conc: *aria2c::MAX_CONC_DOWNS.read().unwrap()
    }));

    if action == "init" {
        if let Ok(s) = fs::read_to_string(work_dir.join("config.json")) {
            if let Ok(local_config) = serde_json::from_str::<HashMap<String, Value>>(&s) {
                let mut d_config = config.write().unwrap();
                for (key, value) in local_config { match key.as_str() {
                    "temp_dir" => d_config.temp_dir = value.as_str().unwrap_or_default().to_string(),
                    "down_dir" => d_config.down_dir = value.as_str().unwrap_or_default().to_string(),
                    "max_conc" => d_config.max_conc = value.as_i64().unwrap_or_default(),
                    _ => {}
                } }
            }
        }
    } else if action == "write" {
        if let Some(s) = settings { *config.write().unwrap() = s }
    }

    let config = config.read().unwrap();
    if action != "read" {
        fs::write(work_dir.join("config.json"), serde_json::to_string_pretty(&*config).unwrap()).map_err(|e| handle_err(e))?;
        *aria2c::MAX_CONC_DOWNS.write().unwrap() = config.max_conc;
        *TEMP_DIR.write().unwrap() = PathBuf::from(&config.temp_dir);
        *DOWNLOAD_DIR.write().unwrap() = PathBuf::from(&config.down_dir);
        log::info!("Updated MAX_CONC_DOWNS: {}", config.max_conc);
        log::info!("Updated TEMP_DIR: {}", config.temp_dir);
        log::info!("Updated DOWNLOAD_DIR: {}", config.down_dir);
    }
    window.emit("settings", serde_json::json!({
        "down_dir": config.down_dir,
        "temp_dir": config.temp_dir,
        "max_conc": config.max_conc
    })).unwrap();
    Ok(action)
}

#[tauri::command]
async fn save_file(window: WebviewWindow, content: Vec<u8>, path: String, secret: String) -> Result<String, String> {
    if secret != *SECRET.read().unwrap() {
        window.emit("error", "403 Forbidden<br>\n请重启应用").unwrap();
        return Err("403 Forbidden".into())
    }
    if let Err(e) = fs::write(path.clone(), content) {
        handle_err(e.to_string());
        Err(e.to_string())
    } else { Ok(path) }
}

#[tauri::command]
async fn open_select(path: String) -> Result<String, String>{
    if let Err(e) = fs::metadata(&path) {
        handle_err(format!("{}<br>\n文件可能已被移动或删除。", e.to_string()));
        Err(format!("{}<br>\n文件可能已被移动或删除。", e.to_string()))
    } else {
        if cfg!(target_os = "windows") {
            Command::new("explorer.exe")
                .arg("/select,").arg(path.clone())
                .spawn().map_err(|e| handle_err(e))?;
        } else if cfg!(target_os = "macos") {
            Command::new("open")
                .arg("-R").arg(path.clone())
                .spawn().map_err(|e| handle_err(e))?;
        }
        Ok(path)
    }
}

#[tauri::command]
async fn exit() -> Result<String, String> {
    let client = init_client();
    let cookies = { cookies::load().map_err(|e| handle_err(e))? };
    let response = client
        .post("https://passport.bilibili.com/login/exit/v2")
        .query(&[("biliCSRF", cookies.get("bili_jct").unwrap_or(&json!("")).as_str().unwrap())])
        .send().await.map_err(|e| handle_err(e))?;

    if response.status() != reqwest::StatusCode::OK {
        handle_err(response.status().to_string());
        return Err(response.status().to_string());
    }
    let cookie_headers: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();
    let response_data: Value = response.json().await.map_err(|e| handle_err(e))?;
    if response_data["code"].as_i64() == Some(0) {
        for cookie in cookie_headers.clone() {
            let parsed_cookie = cookies::parse_cookie_header(&cookie).map_err(|e| handle_err(e))?;
            { cookies::delete(parsed_cookie.name).map_err(|e| handle_err(e))?; }
        }
        get_buvid().await.map_err(|e| handle_err(e))?;
        return Ok(0.to_string());
    } else {
        log::error!("{}, {}", response_data["code"], response_data["message"]);
        return Err(format!("{}, {}", response_data["code"], response_data["message"]).to_string())
    }
}

#[tauri::command]
async fn refresh_cookie(refresh_csrf: String) -> Result<String, String> {
    let client = init_client();
    let cookies = cookies::load().map_err(|e| handle_err(e))?;
    let refresh_token = cookies.get("refresh_token").unwrap_or(&json!("")).to_string();
    let response = client
        .post("https://passport.bilibili.com/x/passport-login/web/cookie/refresh")
        .query(&[
            ("csrf", cookies.get("bili_jct").unwrap_or(&json!("")).to_string()),
            ("refresh_csrf", refresh_csrf),
            ("source", "main-fe-header".to_string()),
            ("refresh_token", refresh_token.clone())
        ])
        .send().await.map_err(|e| handle_err(e))?;
        let cookie_headers: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();

    if response.status() != reqwest::StatusCode::OK {
        handle_err(response.status().to_string());
        return Err(response.status().to_string());
    }
    let response_data: Value = response.json().await.map_err(|e| handle_err(e))?;
    if response_data["code"].as_i64() == Some(0) {
        for cookie in cookie_headers.clone() {
            cookies::insert(&cookie).map_err(|e| handle_err(e))?;
            let parsed_cookie = cookies::parse_cookie_header(&cookie).map_err(|e| handle_err(e))?;
            if parsed_cookie.name == "bili_jct" {
                if let Some(refresh_token) = response_data["data"]["refresh_token"].as_str() { 
                    let refresh_token = format!(
                        "refresh_token={}; Path=/; Domain=bilibili.com; Expires={}",
                        refresh_token, parsed_cookie.expires
                    );
                    cookies::insert(&refresh_token).map_err(|e| handle_err(e))?;
                }
                let conf_refresh_resp = client
                .post("https://passport.bilibili.com/x/passport-login/web/confirm/refresh")
                .query(&[
                    ("csrf", parsed_cookie.value.to_string()),
                    ("refresh_token", refresh_token.to_string())
                ])
                .send().await.map_err(|e| handle_err(e))?;
                if conf_refresh_resp.status() != reqwest::StatusCode::OK {
                    if conf_refresh_resp.status().to_string() != "412 Precondition Failed" {
                        log::error!("Error while refreshing Cookie");
                        return Err("Error while refreshing Cookie".to_string());
                    }
                }
                let conf_refresh_resp_data: Value = conf_refresh_resp.json().await.map_err(|e| handle_err(e))?;
                match conf_refresh_resp_data["code"].as_i64() {
                    Some(0) => {
                        log::info!("Successfully refreshed Cookie");
                        return Ok("Successfully refreshed Cookie".to_string());
                    }
                    _ => {
                        log::error!("{}", response_data["data"]["message"]);
                        return Err(format!("{}", response_data["data"]["message"]).to_string())
                    },
                }
            }
        }
        log::error!("{}, {}", response_data["data"]["code"], response_data["data"]["message"]);
        return Err(format!("{}, {}", response_data["data"]["code"], response_data["data"]["message"]).to_string())
    } else {
        log::error!("{}, {}", response_data["code"], response_data["message"]);
        return Err(format!("{}, {}", response_data["code"], response_data["message"]).to_string())
    }
}

#[tauri::command]
async fn scan_login(window: WebviewWindow, qrcode_key: String) -> Result<String, String> {
    let client = init_client();
    let mut cloned_key = qrcode_key.clone();
    let mask_range = 8..cloned_key.len()-8;
    let mask = "*".repeat(mask_range.end - mask_range.start);
    cloned_key.replace_range(mask_range, &mask);
    LOGIN_POLLING.store(true, Ordering::SeqCst);
    while LOGIN_POLLING.load(Ordering::SeqCst) {
        let response = client
            .get(format!(
                "https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key={}",
                qrcode_key
            )).send().await.map_err(|e| handle_err(e))?;

        if response.status() != reqwest::StatusCode::OK {
            handle_err(response.status().to_string());
            return Err(response.status().to_string());
        }
        let cookie_headers: Vec<String> = response.headers().get_all(header::SET_COOKIE)
            .iter().flat_map(|h| h.to_str().ok())
            .map(|s| s.to_string())
            .collect();

        let response_data: Value = response.json().await.map_err(|e| handle_err(e))?;
        if response_data["code"].as_i64() == Some(0) {
            window.emit("login-status", response_data["data"]["code"].to_string()).unwrap();
            match response_data["data"]["code"].as_i64() {
                Some(0) => {
                    let mut mid = "0".to_string();
                    for cookie in cookie_headers.clone() {
                        { cookies::insert(&cookie).map_err(|e| handle_err(e))?; }
                        let parsed_cookie = cookies::parse_cookie_header(&cookie).map_err(|e| handle_err(e))?;
                        if parsed_cookie.name == "DedeUserID" {
                            mid = parsed_cookie.value;
                        } else if parsed_cookie.name == "bili_jct" {
                            if let Some(refresh_token) = response_data["data"]["refresh_token"].as_str() { 
                                let refresh_token = format!(
                                    "refresh_token={}; Path=/; Domain=bilibili.com; Expires={}",
                                    refresh_token, parsed_cookie.expires
                                );
                                { cookies::insert(&refresh_token).map_err(|e| handle_err(e))?; }
                            }
                        }
                    }
                    log::info!("{}: \"扫码登录成功\"", cloned_key);
                    return Ok(mid.to_string());
                }
                Some(86101) | Some(86090) => log::info!("{}: {}", cloned_key, response_data["data"]["message"]),
                _ => {
                    log::error!("{}: {}, {}", cloned_key, response_data["data"]["code"], response_data["data"]["message"]);
                    return Err(format!("{}, {}", response_data["data"]["code"], response_data["data"]["message"]).to_string())
                },
            }
        } else {
            log::error!("{}: {}, {}", cloned_key, response_data["data"]["code"], response_data["data"]["message"]);
            return Err(format!("{}, {}", response_data["data"]["code"], response_data["data"]["message"]).to_string())
        }
        sleep(Duration::from_secs(1)).await;
    }
    log::error!("{}: \"登录轮询被前端截断\"", cloned_key);
    return Ok(0.to_string());
}

#[tauri::command]
async fn pwd_login(
    username: String, password: String,
    token: String, challenge: String,
    validate: String, seccode: String
) -> Result<String, String> {
    let client = init_client();
    let response = client
        .post("https://passport.bilibili.com/x/passport-login/web/login")
        .query(&[
            ("username", username),
            ("password", password),
            ("token", token),
            ("challenge", challenge),
            ("validate", validate),
            ("seccode", seccode),
            ("go_url", "https://www.bilibili.com".to_string()),
            ("source", "main-fe-header".to_string()),
        ])
        .send().await.map_err(|e| handle_err(e))?;

    if response.status() != reqwest::StatusCode::OK {
        handle_err(response.status().to_string());
        return Err(response.status().to_string());
    }
    let cookie_headers: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();

    let response_data: Value = response.json().await.map_err(|e| handle_err(e))?;
    if response_data["code"].as_i64() == Some(0) {
        let mut mid = "0".to_string();
        for cookie in cookie_headers.clone() {
            cookies::insert(&cookie).map_err(|e| handle_err(e))?;
            let parsed_cookie = cookies::parse_cookie_header(&cookie).map_err(|e| handle_err(e))?;
            if parsed_cookie.name == "DedeUserID" {
                mid = parsed_cookie.value.to_string();
            } else if parsed_cookie.name == "bili_jct" {
                if let Some(refresh_token) = response_data["data"]["refresh_token"].as_str() { 
                    let refresh_token = format!(
                        "refresh_token={}; Path=/; Domain=bilibili.com; Expires={}",
                        refresh_token, parsed_cookie.expires
                    );
                    cookies::insert(&refresh_token).map_err(|e| handle_err(e))?;
                }
            }
        }
        log::info!("Successfully logined using pwd: {}", mid);
        return Ok(mid.to_string());
    } else {
        log::error!("{}, {}", response_data["code"], response_data["message"]);
        return Err(format!("{}, {}", response_data["code"], response_data["message"]).to_string())
    }
}

#[tauri::command]
async fn sms_login(
    cid: String, tel: String,
    code: String, key: String,
) -> Result<String, String> {
    let client = init_client();
    let response = client
        .post("https://passport.bilibili.com/x/passport-login/web/login/sms")
        .query(&[
            ("cid", cid),
            ("tel", tel),
            ("code", code), 
            ("source", "main-fe-header".to_string()),
            ("captcha_key", key),
            ("go_url", "https://www.bilibili.com".to_string()),
            ("keep", "true".to_string())
        ])
        .send().await.map_err(|e| handle_err(e))?;

    if response.status() != reqwest::StatusCode::OK {
        handle_err(response.status().to_string());
        return Err(response.status().to_string());
    }
    let cookie_headers: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();

    let response_data: Value = response.json().await.map_err(|e| handle_err(e))?;
    if response_data["code"].as_i64() == Some(0) {
        let mut mid = "0".to_string();
        for cookie in cookie_headers.clone() {
            cookies::insert(&cookie).map_err(|e| handle_err(e))?;
            let parsed_cookie = cookies::parse_cookie_header(&cookie).map_err(|e| handle_err(e))?;
            if parsed_cookie.name == "DedeUserID" {
                mid = parsed_cookie.value.to_string();
            } else if parsed_cookie.name == "bili_jct" {
                if let Some(refresh_token) = response_data["data"]["refresh_token"].as_str() { 
                    let refresh_token = format!(
                        "refresh_token={}; Path=/; Domain=bilibili.com; Expires={}",
                        refresh_token, parsed_cookie.expires
                    );
                    cookies::insert(&refresh_token).map_err(|e| handle_err(e))?;
                }
            }
        }
        log::info!("Successfully logined using SMS: {}", mid);
        return Ok(mid.to_string());
    } else {
        log::error!("{}, {}", response_data["code"], response_data["message"]);
        return Err(format!("{}, {}", response_data["code"], response_data["message"]).to_string())
    }
}

#[tauri::command]
async fn handle_aria2c(window: WebviewWindow, secret: String, action: String) -> Result<(), String> {
    if secret != *SECRET.read().unwrap() {
        window.emit("error", "403 Forbidden<br>\n请重启应用").unwrap();
        return Err("403 Forbidden".to_string())
    }
    log::info!("Killing aria2c...");
    aria2c::kill().map_err(|e| handle_err(e))?;
    if action == "restart" {
        log::info!("Initializing aria2c...");
        aria2c::init().map_err(|e| handle_err(e))?;
    }
    Ok(())
}

#[tauri::command]
async fn ready(_window: WebviewWindow) -> Result<String, String> {
    #[cfg(not(debug_assertions))]
    { if *READY.read().unwrap() {
        _window.emit("error", "403 Forbidden<br>\n请重启应用").unwrap();
        return Ok("403 Forbidden".to_string());
    } }
    LOGIN_POLLING.store(false, Ordering::SeqCst);
    *READY.write().unwrap() = true;
    Ok(SECRET.read().unwrap().to_string())
}

#[tauri::command]
fn init(window: WebviewWindow, secret: String) -> Result<i64, String> {
    if secret != *SECRET.read().unwrap() {
        window.emit("error", "403 Forbidden<br>\n请重启应用").unwrap();
        return Err("403 Forbidden".to_string())
    }
    rw_config("read", None, secret).map_err(|e| handle_err(e))?;
    let cookies = cookies::load().map_err(|e| handle_err(e))?;
    window.emit("headers", init_headers()).unwrap();
    return Ok(cookies.get("DedeUserID").and_then(|v| v.as_str()).unwrap_or("0").parse::<i64>().unwrap_or(0));
}

#[tauri::command]
async fn get_dm(window: WebviewWindow, secret: String, oid: i64, date: Option<String>, df_path: String, xml: bool) -> Result<(), String> {
    let app_handle = services::get_app_handle().unwrap();
    if secret != *SECRET.read().unwrap() {
        window.emit("error", "403 Forbidden<br>\n请重启应用").unwrap();
        return Err("403 Forbidden".to_string())
    }
    let client = init_client();
    let mut url = "https://api.bilibili.com/x/v1/dm/list.so";
    let mut query = vec![("oid", oid.to_string())];
    if let Some(date) = date {
        url = "https://api.bilibili.com/x/v2/dm/history";
        query.push(("date", date));
        query.push(("type", "1".to_string()));
    };
    let response = client.get(url).query(&query).send()
        .await.map_err(|e| handle_err(e))?;

    if response.status() != reqwest::StatusCode::OK {
        handle_err(response.status().to_string());
        return Err(response.status().to_string());
    }

    let dec_data = response.text().await.map_err(|e| handle_err(e))?;

    let mut dialog = app_handle.dialog().file().set_file_name(&df_path);

    if xml { dialog = dialog.add_filter("XML 文档", &["xml"]);
    } else { dialog = dialog.add_filter("Aegisub 高级字幕文件", &["ass"]); }

    let (sender, receiver) = mpsc::channel(); // 模拟 Promise
    dialog.save_file(move |path| {
        let _ = sender.send(path);
    });
    let path = receiver.recv().map_err(|e| handle_err(e))?;
    if let Some(output) = path {
        let input = if xml { output.clone() } else {
            TEMP_DIR.read().unwrap().join(format!(
            "{}.bilitools.downloading", output.file_name()
            .unwrap().to_string_lossy())).join("input.xml")
        };
        fs::create_dir_all(&input.parent().unwrap()).map_err(|e| handle_err(e))?;
        fs::write(input.clone(), dec_data).map_err(|e| handle_err(e))?;
        if !xml {
            let df_path = env::current_exe().unwrap().join("bin").join(
                if cfg!(target_os = "windows") { "DanmakuFactory.exe" } else { "DanmakuFactory" }
            );
            let mut command = Command::new(df_path);
            #[cfg(target_os = "windows")]
            command.creation_flags(0x08000000);
            command.arg("-i").arg(input)
                .arg("-o").arg(output)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());
            
            command.spawn().map_err(|e| handle_err(e))?;
        }
    };
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    logger::init_logger().map_err(|e| e.to_string())?;
    #[cfg(target_os = "windows")]
    let _job: win32job::Job = {
        let job = win32job::Job::create()?;
        let mut info = job.query_extended_limit_info()?;
        info.limit_kill_on_job_close();
        job.set_extended_limit_info(&mut info)?;
        job.assign_current_process()?;
        job
    };
    #[cfg(target_os = "macos")]
    setpgid(Pid::from_raw(0), Pid::from_raw(0)).unwrap();
    *SECRET.write().unwrap() = rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(10).map(char::from)
        .collect();
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            println!("{}, {argv:?}, {cwd}", app.package_info().name);
            app.emit("single-instance", (argv, cwd)).unwrap();
            let window = app.get_webview_window("main").unwrap();
            window.unminimize().unwrap();
            window.set_focus().unwrap();
        }))
        .setup(|app| {
            services::init(app.app_handle().clone()).map_err(|e| handle_err(e))?;
            panic::set_hook(Box::new(move |e| { handle_err(e); }));
            let window = app.get_webview_window("main").unwrap();
            #[cfg(target_os = "windows")]
            match tauri_plugin_os::version() {
                tauri_plugin_os::Version::Semantic(major, minor, build) => {
                    use window_vibrancy::{apply_acrylic, apply_blur};
                    if build > 22000 || (major == 10 && build <= 18362) { // Windows 10 & 11 Early Version
                        apply_acrylic(&window, Some((18, 18, 18, 160))).map_err(|e| handle_err(e))?;
                    } else if (build > 18362 && build <= 22000) || (major == 6 && minor == 1) { // Windows 7 & Windows 10 v1903+ to Windows 11 22000
                        apply_blur(&window, Some((18, 18, 18, 160))).map_err(|e| handle_err(e))?;
                    }
                },
                _ => log::error!("Failed to determine OS version"),
            }
            #[cfg(target_os = "macos")]
            {
                use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
                apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None).map_err(|e| handle_err(e))?;
            }
            window.listen("stop_login", |_| { LOGIN_POLLING.store(false, Ordering::SeqCst) });
            window.listen("restart", move |_| {
                #[cfg(target_os = "macos")]
                signal::kill(Pid::from_raw(0), Signal::SIGTERM).expect("Failed to send SIGTERM");
                services::get_app_handle().unwrap().restart()
            });
            Ok(())
        })
        .on_window_event(|_, event| match event {
            tauri::WindowEvent::Destroyed => {
                #[cfg(target_os = "macos")]
                signal::kill(Pid::from_raw(0), Signal::SIGTERM).expect("Failed to send SIGTERM");
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![ready, init, exit,
            scan_login, pwd_login, sms_login, open_select, refresh_cookie,
            rw_config, save_file, handle_download, get_dm, push_back_queue,
            process_queue, handle_temp, handle_aria2c])
        .run(tauri::generate_context!())
        .expect("error while running BiliTools");
    Ok(())
}