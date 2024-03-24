// Prevents additional console window on Windows in release, DO NOT REMOVE!!
// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use lazy_static::lazy_static;
use serde_json::{Value, json};
use serde::{Deserialize, Serialize};
use reqwest::{Client, header, header::{HeaderMap, HeaderValue}, Url};
use std::{env, fs, path::PathBuf, sync::{Arc, atomic::{AtomicBool, Ordering}, mpsc}, time::Instant, net::{TcpListener, SocketAddr},
process::{Command, Stdio, Child}, collections::{VecDeque, HashSet, HashMap}, os::windows::process::CommandExt, panic, io::Read};
use tokio::{fs::File, sync::{Mutex, RwLock, Notify}, io::{AsyncBufReadExt, AsyncSeekExt, SeekFrom, BufReader}, time::{sleep, Duration}};
use rusqlite::{Connection, params};
use regex::Regex;
use flate2::read::DeflateDecoder;
use tauri::{Manager, Window as tWindow, WindowEvent, async_runtime, api::dialog::FileDialogBuilder};
use rand::{distributions::Alphanumeric, Rng};
use walkdir::WalkDir;
mod logger;

lazy_static! {
    static ref GLOBAL_WINDOW: Arc<Mutex<Option<tWindow>>> = Arc::new(Mutex::new(None));
    static ref LOGIN_POLLING: Arc<AtomicBool> = Arc::new(AtomicBool::new(false));
    static ref WORKING_DIR: PathBuf = {
        PathBuf::from(env::var("LOCALAPPDATA").unwrap()).join("com.btjawa.bilitools")
    };
    static ref DOWNLOAD_DIR: Arc<RwLock<PathBuf>> = {
        Arc::new(RwLock::new(PathBuf::from(env::var("USERPROFILE").unwrap()).join("Desktop")))
    };
    static ref TEMP_DIR: Arc<RwLock<PathBuf>> = Arc::new(RwLock::new(PathBuf::from(env::var("TEMP").unwrap())));
    static ref COOKIE_PATH: PathBuf = WORKING_DIR.join("Cookies");
    static ref CONFIG_PATH: Arc<RwLock<PathBuf>> = Arc::new(RwLock::new(WORKING_DIR.join("config.json")));
    static ref MAX_CONCURRENT_DOWNLOADS: Arc<RwLock<i64>> = Arc::new(RwLock::new(3));
    static ref ARIA2C_PORT: Arc<RwLock<usize>> = Arc::new(RwLock::new(0));
    static ref ARIA2C_MANAGER: Arc<Mutex<Aria2cManager>> = Arc::new(Mutex::new(Aria2cManager::new()));
    static ref SECRET: Arc<RwLock<String>> = Arc::new(RwLock::new(String::new()));
    static ref WAITING_QUEUE: Mutex<VecDeque<VideoInfo>> = Mutex::new(VecDeque::new());
    static ref DOING_QUEUE: Mutex<VecDeque<VideoInfo>> = Mutex::new(VecDeque::new());
    static ref COMPLETE_QUEUE: Mutex<VecDeque<VideoInfo>> = Mutex::new(VecDeque::new());
    static ref READY: Arc<RwLock<bool>> = Arc::new(RwLock::new(false));
    static ref DOWNLOAD_COMPLETED_NOTIFY: Notify = Notify::new();
}

fn handle_err<E: std::fmt::Display>(window: tWindow, e: E) -> String {
    log::error!("{}", e);
    window.emit("error", e.to_string()).unwrap(); e.to_string()
}

async fn init_database(window: tWindow) -> Result<(), String> {
    if !&COOKIE_PATH.exists() {
        fs::write(&*COOKIE_PATH, "").map_err(|e| handle_err(window.clone(), e))?;
    }
    let metadata = fs::metadata(&*COOKIE_PATH).unwrap();
    let conn = Connection::open(&*COOKIE_PATH).unwrap();
    if metadata.len() == 0 {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS cookies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                value TEXT NOT NULL,
                domain TEXT NOT NULL,
                path TEXT,
                expires TEXT
            )",
            params![],
        ).map_err(|e| handle_err(window.clone(), e))?;
    }
    window.emit("headers", headers_to_json(init_headers())).unwrap();
    Ok(())
}

fn load_cookies() -> rusqlite::Result<HashMap<String, CookieInfo>> {
    let conn = Connection::open(&*COOKIE_PATH)?;
    let mut stmt = conn.prepare("SELECT name, value, path, domain, expires FROM cookies")?;
    let cookie_map: Result<HashMap<String, CookieInfo>, rusqlite::Error> = stmt.query_map([], |row| {
        let cookie_info = CookieInfo {
            name: row.get(0)?,
            value: row.get(1)?,
            path: row.get(2)?,
            domain: row.get(3)?,
            expires: row.get(4)?
        };
        Ok((cookie_info.name.clone(), cookie_info))
    })?.collect();
    cookie_map
}

fn init_headers() -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.insert("User-Agent", HeaderValue::from_static("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"));
    headers.insert("Accept", HeaderValue::from_static("*/*"));
    headers.insert("Accept-Language", HeaderValue::from_static("zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6"));
    if let Ok(cookies) = load_cookies() {
        let cookies_header = cookies.values()
            .map(|cookie_info| format!("{}={}", cookie_info.name, cookie_info.value))
            .collect::<Vec<_>>()
            .join("; ") + ";";
        headers.insert("Cookie", HeaderValue::from_str(&cookies_header).unwrap());
    }
    headers.insert("Upgrade-Insecure-Requests", HeaderValue::from_static("1"));
    headers.insert("Sec-Ch-Ua", HeaderValue::from_static("\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\", \"Google Chrome\";v=\"120\""));
    headers.insert("Sec-Ch-Ua-Mobile", HeaderValue::from_static("?0"));
    headers.insert("Connection", HeaderValue::from_static("keep-alive"));
    headers.insert("Referer", HeaderValue::from_static("https://www.bilibili.com"));
    headers
}

fn headers_to_json(headers: HeaderMap) -> HashMap<String, String> {
    headers.iter().filter_map(|(k, v)| {
        if let Ok(v_str) = v.to_str() {
            Some((k.to_string(), v_str.to_string()))
        } else {
            None
        }
    }).collect()
}

fn init_client() -> Client {
    Client::builder()
        .default_headers(init_headers())
        .build()
        .unwrap()
}

fn extract_filename(url: &str) -> String {
    Url::parse(url)
        .ok()
        .and_then(|parsed_url| {
            parsed_url.path_segments()
                .and_then(|segments| segments.last())
                .map(|last_segment| last_segment.to_string())
        })
        .unwrap_or_else(|| "default_filename".to_string())
}

struct Aria2cManager {
    child: Option<Child>,
}

impl Aria2cManager {
    pub fn new() -> Self { Aria2cManager { child: None } }
    pub async fn init(&mut self) -> Result<(), String> {
        let start_port = 6800;
        let end_port = 65535;
        let port = (start_port..end_port)
            .find_map(|port| TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], port))).ok())
            .ok_or("No free port found".to_string())?.local_addr().unwrap().port();
        *ARIA2C_PORT.write().await = port as usize;
        let current_dir = env::current_dir().map_err(|e| e.to_string())?
            .join("aria2c");
        let child = Command::new(current_dir.join("aria2c.exe").clone())
            .creation_flags(0x08000000)
            .current_dir(current_dir.clone())
            .arg(format!("--conf-path={}", current_dir.join("aria2.conf").to_string_lossy()))
            .arg(format!("--rpc-listen-port={}", port))
            .arg(format!("--rpc-secret={}", SECRET.read().await.clone()))
            .arg(format!("--max-concurrent-downloads={}", MAX_CONCURRENT_DOWNLOADS.read().await))
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn().map_err(|e| e.to_string())?;
        self.child = Some(child);
        Ok(())
    }
    pub fn kill(&mut self) -> Result<(), String> {
        if let Some(ref mut sc) = self.child {
            sc.kill().map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}

#[derive(Debug, Clone)]
struct CookieInfo {
    name: String,
    value: String,
    path: String,
    domain: String,
    expires: String,
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

async fn get_buvid(window: tWindow) -> Result<String, String> {
    let client = init_client();
    let buvid3_resp = client
        .get("https://www.bilibili.com")
        .send().await.map_err(|e| handle_err(window.clone(), e))?;
    let cookie_headers: Vec<String> = buvid3_resp.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();
    for cookie in cookie_headers.clone() {
        insert_cookie(window.clone(), &cookie).map_err(|e| handle_err(window.clone(), e))?;
    }
    let buvid4_resp = client
        .get("https://api.bilibili.com/x/frontend/finger/spi")
        .send().await.map_err(|e| handle_err(window.clone(), e))?;
    let buvid4_resp_data: Value = buvid4_resp.json().await.map_err(|e| handle_err(window.clone(), e))?;
    if buvid4_resp_data["code"].as_i64() == Some(0) {
        if let Some(buvid4) = buvid4_resp_data["data"]["b_4"].as_str() { 
            let buvid4 = format!(
                "buvid4={}; Path=/; Domain=bilibili.com", buvid4
            );
            insert_cookie(window.clone(), &buvid4).map_err(|e| handle_err(window.clone(), e))?;
        }
        return Ok("成功获取buvid".to_string());
    } else {
        log::error!("{}, {}", buvid4_resp_data["code"], buvid4_resp_data["message"]);
        return Err(format!("{}, {}", buvid4_resp_data["code"], buvid4_resp_data["message"]).to_string())
    }
}

#[tauri::command]
async fn push_back_queue(
    window: tWindow, video_url: Option<Vec<String>>, audio_url: Option<Vec<String>>,
    action: String, media_data: Value, date: String
) -> Result<Value, String> {
    let mut tasks = vec![];
    let client = init_client();
    let ss_dir = &media_data.get("ss_title").unwrap().as_str().unwrap().to_string();
    let display_name = media_data.get("display_name").unwrap().as_str().unwrap().to_string();
    for (url, file_type) in vec![(video_url, "video"), (audio_url, "audio")].into_iter().filter_map(|(url, t)| url.map(|u| (u, t))) {
        let filename = &extract_filename(&url[0]);
        let path = TEMP_DIR.read().await.join(format!("{}_{}.bilitools.downloading", date, filename)).join(filename);
        let init_payload = json!({
            "jsonrpc": "2.0",
            "method": "aria2.addUri",
            "id": "1",
            "params": [
                format!("token:{}", *SECRET.read().await),
                url,
                {"dir": path.parent().unwrap().to_str().unwrap(), "out": path.file_name().unwrap().to_str().unwrap()}
            ]
        });
        let init_resp = client
            .post(format!("http://localhost:{}/jsonrpc", ARIA2C_PORT.read().await))
            .json(&init_payload)
            .send().await.map_err(|e| handle_err(window.clone(), e))?;

        let init_resp_data: Value = init_resp.json().await.map_err(|e| handle_err(window.clone(), e))?;
        let gid = init_resp_data["result"].as_str().unwrap().to_string();
        handle_download(window.clone(), gid.clone(), "pause".to_string()).await.map_err(|e| handle_err(window.clone(), e))?;
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
        output_path:  DOWNLOAD_DIR.read().await.join(ss_dir.clone()),
        tasks, action, media_data
    };
    update_queue(&window, "push", Some(info.clone()), None).await;
    Ok(gid)
}

#[tauri::command]
async fn process_queue(window: tauri::Window, date: String) -> Result<(), String> {
    log::info!("Processing queue...");
    loop {
        let max_conc = *MAX_CONCURRENT_DOWNLOADS.read().await;
        let doing_len = { DOING_QUEUE.lock().await.len() as i64 };
        for _ in 0..max_conc.saturating_sub(doing_len) {
            if let Some(video_info) = update_queue(&window, "waiting", None, Some(date.clone())).await {
                let window_clone = window.clone();
                async_runtime::spawn(async move {
                    process_download(window_clone, video_info).await.unwrap();
                });
            }
        }
        let waiting_empty = { WAITING_QUEUE.lock().await.is_empty() };
        if waiting_empty && DOING_QUEUE.lock().await.is_empty() {
            break;
        }
        DOWNLOAD_COMPLETED_NOTIFY.notified().await;
    }
    Ok(())
}

async fn process_download(window: tWindow, download_info: VideoInfo) -> Result<(), String> {
    fs::create_dir_all(&download_info.output_path.parent().unwrap()).map_err(|e| handle_err(window.clone(), e))?;
    let action = &download_info.action;
    for task in &download_info.tasks {
        if let Ok(_) = download_file(window.clone(), task.clone(), download_info.gid.clone()).await {
            if *action == "only" {
                fs::rename(task.path.clone(), download_info.output_path.clone())
                .map_err(|e| handle_err(window.clone(), e))?;
            }
        }
    }
    if *action == "multi" {
        merge_video_audio(window.clone(), download_info.clone()).await
        .map_err(|e| handle_err(window.clone(), e))?;
    }
    update_queue(&window, "doing", None, None).await;
    Ok(())
}

fn add_timestamp(mut info: VideoInfo, date: String) -> VideoInfo {
    let mut output_path_str = info.output_path.to_string_lossy().to_string();
    output_path_str += &format!("_{}", date);
    info.output_path = PathBuf::from(output_path_str).join(&info.display_name);
    info
}

async fn update_queue(window: &tWindow, action: &str, info: Option<VideoInfo>, date: Option<String>) -> Option<VideoInfo> {
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
    window.emit("download-queue", queue).unwrap();
    result_info
}

async fn download_file(window: tWindow, task: DownloadTask, gid: Value) -> Result<String, String> {
    log::info!("Starting download for: {}", &task.display_name);
    let client = init_client();
    handle_download(window.clone(), task.gid.clone(), "unpause".to_string()).await.map_err(|e| handle_err(window.clone(), e))?;
    let mut last_log_time = Instant::now();
    loop {
        let status_payload = json!({
            "jsonrpc": "2.0",
            "method": "aria2.tellStatus",
            "id": "1",
            "params": [format!("token:{}", *SECRET.read().await), task.gid]
        });
        let status_resp = client
            .post(format!("http://localhost:{}/jsonrpc", ARIA2C_PORT.read().await))
            .json(&status_payload)
            .send().await.map_err(|e| handle_err(window.clone(), e))?;

        let status_resp_data: Value = status_resp.json().await.map_err(|e| handle_err(window.clone(), e))?;
        if let Some(e) = status_resp_data["error"].as_object() {
            let error_code = e.get("code").and_then(|c| c.as_i64()).unwrap();
            let error_message = e.get("message").and_then(|m| m.as_str()).unwrap();
            let err = format!("Error code {}: {}", error_code, error_message);
            handle_err(window.clone(), err.clone());
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

async fn merge_video_audio(window: tWindow, info: VideoInfo) -> Result<VideoInfo, String> {
    log::info!("Starting merge process for audio");
    let current_dir = env::current_dir().unwrap();
    let ffmpeg_path = current_dir.join("ffmpeg").join("ffmpeg.exe");
    let output_path = info.output_path.to_string_lossy();
    let video_filename = &info.output_path.file_name().unwrap().to_string_lossy();
    let video_path = info.video_path.clone();
    let audio_path = info.audio_path.clone();
    let progress_path = current_dir.join("ffmpeg")
        .join(format!("{}.log", video_filename));

    let mut child = Command::new(ffmpeg_path)
        .creation_flags(0x08000000)
        .arg("-i").arg(video_path.clone())
        .arg("-i").arg(audio_path.clone())
        .arg("-stats_period").arg("0.1")
        .arg("-c:v").arg("copy")
        .arg("-c:a").arg("aac")
        .arg(&*output_path).arg("-progress")
        .arg(&progress_path).arg("-y")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| handle_err(window.clone(), e))?;

    while !progress_path.exists() {
        sleep(Duration::from_millis(250)).await;
    }
    let mut progress_lines = VecDeque::new();
    let mut last_size: u64 = 0;
    let mut last_log_time = Instant::now();
    loop {
        let mut printed_keys = HashSet::new();
        let metadata = tokio::fs::metadata(&progress_path.clone()).await.map_err(|e| handle_err(window.clone(), e))?;
        if metadata.len() > last_size {
            let mut file = File::open(&progress_path.clone()).await.map_err(|e| handle_err(window.clone(), e))?;
            file.seek(SeekFrom::Start(last_size)).await.map_err(|e| handle_err(window.clone(), e))?;
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
        window.clone().emit("progress", &formatted_values).map_err(|e| handle_err(window.clone(), e))?;
        if progress_lines.iter().any(|l| l.starts_with("progress=end")) {
            break;
        }
        sleep(Duration::from_millis(100)).await;
    }
    let status = child.wait().map_err(|e| handle_err(window.clone(), e))?;
    fs::remove_dir_all(video_path.parent().unwrap()).map_err(|e| handle_err(window.clone(), e))?;
    fs::remove_dir_all(audio_path.parent().unwrap()).map_err(|e| handle_err(window.clone(), e))?;
    fs::remove_file(progress_path).map_err(|e| handle_err(window.clone(), e))?;
    if status.success() {
        log::info!("FFmpeg process completed.");
        Ok(info)
    } else {
        fs::remove_file(&*output_path).map_err(|e| handle_err(window.clone(), e))?;
        Err("FFmpeg command failed".to_string())
    }
}

#[tauri::command]
async fn handle_download(window: tWindow, gid: String, action: String) -> Result<Value, String> {
    let client = init_client();
    let payload = json!({
        "jsonrpc": "2.0",
        "method": format!("aria2.{}", action),
        "id": "1",
        "params": [format!("token:{}", *SECRET.read().await), gid]
    });
    let resp = client
        .post(format!("http://localhost:{}/jsonrpc", ARIA2C_PORT.read().await))
        .json(&payload)
        .send().await.map_err(|e| handle_err(window.clone(), e))?;

    let resp_data: Value = resp.json().await.map_err(|e| handle_err(window, e))?;
    Ok(json!(resp_data))
}

#[tauri::command]
async fn handle_temp(window: tWindow, action: String) -> Result<String, String> {
    let mut bytes = 0;
    let walker = WalkDir::new(&TEMP_DIR.read().await.clone()).into_iter().filter_map(|e| e.ok())
    .filter(|e| e.file_name().to_str().map_or(false, |s| s.ends_with(".bilitools.downloading")));
    for entry in walker {
        for entry in WalkDir::new(entry.path().to_str().unwrap()) {
            let entry = entry.unwrap();
            let path = entry.path();
            if action == "calc" { bytes += fs::metadata(path).unwrap().len(); }
            else if action == "clear" {
                if path.is_file() && !path.file_name().unwrap()
                .to_str().map_or(false, |s| s.ends_with(".aria2")) {
                    fs::remove_file(&path).map_err(|e| handle_err(window.clone(), e))?;
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
fn parse_cookie_header(cookie_str: &str) -> Result<CookieInfo, &'static str> {
    let re = Regex::new(r"(?i)(?P<name>\w+)=(?P<value>[^;]+)").unwrap();
    let captures = re.captures(cookie_str).ok_or("Invalid cookie header")?;
    let name = captures.name("name").unwrap().as_str();
    let value = captures.name("value").unwrap().as_str();
    let mut path = "";
    let mut domain = "";
    let mut expires = "";
    for part in cookie_str.split(';').skip(1) {
        let mut iter = part.splitn(2, '=').map(str::trim);
        if let Some(key) = iter.next() {
            if let Some(value) = iter.next() {
                match key.to_lowercase().as_str() {
                    "path" => path = value,
                    "domain" => domain = value,
                    "expires" => expires = value,
                    _ => {}
                }
            }
        }
    }
    Ok(CookieInfo {
        name: name.to_string(),
        value: value.to_string(),
        path: path.to_string(),
        domain: domain.to_string(),
        expires: expires.to_string(),
    })
}

#[tauri::command]
fn insert_cookie(window: tWindow, cookie_str: &str) -> Result<(), String> {
    let parsed_cookie = parse_cookie_header(cookie_str).unwrap();
    let conn = Connection::open(&*COOKIE_PATH).unwrap();
    conn.execute(
        "INSERT OR REPLACE INTO cookies (name, value, path, domain, expires) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            parsed_cookie.name,
            parsed_cookie.value,
            parsed_cookie.path,
            parsed_cookie.domain,
            parsed_cookie.expires,
        ],
    ).unwrap();
    window.emit("headers", headers_to_json(init_headers())).unwrap();
    Ok(())
}

#[tauri::command]
async fn rw_config(window: tWindow, action: String, sets: Option<Settings>, secret: String) -> Result<String, String> {
    if secret != *SECRET.read().await {
        window.emit("error", "403 Forbidden<br>\n请重启应用").unwrap();
        return Err("403 Forbidden".to_string())
    }
    let config_path = CONFIG_PATH.read().await.clone();
    let work_dir = WORKING_DIR.clone();
    let config = Arc::new(RwLock::new(Settings {
        temp_dir: TEMP_DIR.read().await.to_string_lossy().into_owned(),
        down_dir: DOWNLOAD_DIR.read().await.to_string_lossy().into_owned(),
        max_conc: *MAX_CONCURRENT_DOWNLOADS.read().await
    }));

    if !work_dir.exists() {
        log::info!("Initializing Work Dir...");
        fs::create_dir_all(&work_dir).map_err(|e| handle_err(window.clone(), e))?;
    }

    if action == "init" {
        if let Ok(s) = fs::read_to_string(config_path.clone()) {
            if let Ok(local_config) = serde_json::from_str::<HashMap<String, Value>>(&s) {
                let mut d_config = config.write().await;
                for (key, value) in local_config { match key.as_str() {
                    "temp_dir" => d_config.temp_dir = value.as_str().unwrap_or_default().to_string(),
                    "down_dir" => d_config.down_dir = value.as_str().unwrap_or_default().to_string(),
                    "max_conc" => d_config.max_conc = value.as_i64().unwrap_or_default(),
                    _ => {}
                } }
            }
        }
    } else if action == "write" {
        if let Some(settings) = sets {
            *config.write().await = settings;
        }
    }

    if action != "read" {
        let config = config.read().await;
        fs::write(config_path.clone(), serde_json::to_string(&*config).unwrap()).map_err(|e| handle_err(window.clone(), e))?;
        *MAX_CONCURRENT_DOWNLOADS.write().await = config.max_conc;
        log::info!("成功更新MAX_CONCURRENT_DOWNLOADS: {}", *MAX_CONCURRENT_DOWNLOADS.read().await);
        *TEMP_DIR.write().await = PathBuf::from(config.temp_dir.clone());
        log::info!("成功更新TEMP_DIR: {:?}", *TEMP_DIR.read().await);
        *DOWNLOAD_DIR.write().await = PathBuf::from(config.down_dir.clone());
        log::info!("成功更新DOWNLOAD_DIR: {:?}", *DOWNLOAD_DIR.read().await);
    }
    window.emit("settings", serde_json::json!({
        "down_dir": *DOWNLOAD_DIR.read().await,
        "temp_dir": *TEMP_DIR.read().await,
        "max_conc": *MAX_CONCURRENT_DOWNLOADS.read().await
    })).unwrap();
    Ok(action)
}

#[tauri::command]
async fn save_file(window: tWindow, content: Vec<u8>, path: String, secret: String) -> Result<String, String> {
    if secret != *SECRET.read().await {
        window.emit("error", "403 Forbidden<br>\n请重启应用").unwrap();
        return Err("403 Forbidden".to_string())
    }
    if let Err(e) = fs::write(path.clone(), content) {
        handle_err(window,  e.to_string());
        Err(e.to_string())
    } else { Ok(path) }
}

#[tauri::command]
async fn open_select(window: tWindow, path: String) -> Result<String, String>{
    if let Err(e) = fs::metadata(&path) {
        handle_err(window.clone(), format!("{}<br>\n文件可能已被移动或删除。", e.to_string()));
        Err(format!("{}<br>\n文件可能已被移动或删除。", e.to_string()))
    } else {
        Command::new("C:\\Windows\\explorer.exe")
            .arg("/select,").arg(path.clone())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn().map_err(|e| handle_err(window, e))?;
        Ok(path)
    }
}

#[tauri::command]
async fn exit(window: tWindow) -> Result<String, String> {
    let client = init_client();
    let cookies = load_cookies().unwrap_or_else(|err| { log::error!("Error loading cookies: {:?}", err);
    HashMap::new() });
    let bili_jct = if let Some(bili_jct) = cookies.get("bili_jct") {
        &bili_jct.value } else { "" };
    let response = client
        .post("https://passport.bilibili.com/login/exit/v2")
        .query(&[("biliCSRF", bili_jct.to_string())])
        .send().await.map_err(|e| handle_err(window.clone(), e))?;

    if response.status() != reqwest::StatusCode::OK {
        handle_err(window.clone(), response.status().to_string());
        return Err(response.status().to_string());
    }
    let cookie_headers: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();

    let conn = Connection::open(&*COOKIE_PATH).unwrap();
    let response_data: Value = response.json().await.map_err(|e| handle_err(window.clone(), e))?;
    if response_data["code"].as_i64() == Some(0) {
        for cookie in cookie_headers.clone() {
            let parsed_cookie = parse_cookie_header(&cookie).map_err(|e| handle_err(window.clone(), e))?;
            conn.execute("DELETE FROM cookies WHERE name = ?",
            &[&parsed_cookie.name]).map_err(|e| handle_err(window.clone(), e))?;
        }
        get_buvid(window.clone()).await.map_err(|e| handle_err(window.clone(), e))?;
        window.emit("headers", headers_to_json(init_headers())).unwrap();
        window.emit("user-mid", 0.to_string()).unwrap();
        return Ok("成功退出登录".to_string());
    } else {
        log::error!("{}, {}", response_data["code"], response_data["message"]);
        return Err(format!("{}, {}", response_data["code"], response_data["message"]).to_string())
    }
}

#[tauri::command]
async fn refresh_cookie(window: tWindow, refresh_csrf: String) -> Result<String, String> {
    let client = init_client();
    let cookies = load_cookies().unwrap_or_else(|err| { log::error!("Error loading cookies: {:?}", err);
    HashMap::new() });
    let bili_jct = if let Some(bili_jct) = cookies.get("bili_jct") {
        &bili_jct.value } else { "" };
    let refresh_token = if let Some(refresh_token) = cookies.get("refresh_token") {
        &refresh_token.value } else { "" };
    let response = client
        .post("https://passport.bilibili.com/x/passport-login/web/cookie/refresh")
        .query(&[
            ("csrf", bili_jct.to_string()),
            ("refresh_csrf", refresh_csrf.to_string()),
            ("source", "main-fe-header".to_string()),
            ("refresh_token", refresh_token.to_string())
        ])
        .send().await.map_err(|e| handle_err(window.clone(), e))?;
        let cookie_headers: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();

    if response.status() != reqwest::StatusCode::OK {
        handle_err(window.clone(), response.status().to_string());
        return Err(response.status().to_string());
    }
    let response_data: Value = response.json().await.map_err(|e| handle_err(window.clone(), e))?;
    if response_data["code"].as_i64() == Some(0) {
        for cookie in cookie_headers.clone() {
            insert_cookie(window.clone(), &cookie).map_err(|e| handle_err(window.clone(), e))?;
            let parsed_cookie = parse_cookie_header(&cookie).map_err(|e| handle_err(window.clone(), e))?;
            if parsed_cookie.name == "DedeUserID" {
                window.emit("user-mid", parsed_cookie.value.to_string()).unwrap();
            } else if parsed_cookie.name == "bili_jct" {
                if let Some(refresh_token) = response_data["data"]["refresh_token"].as_str() { 
                    let refresh_token = format!(
                        "refresh_token={}; Path=/; Domain=bilibili.com; Expires={}",
                        refresh_token, parsed_cookie.expires
                    );
                    insert_cookie(window.clone(), &refresh_token).map_err(|e| handle_err(window.clone(), e))?;
                }
                let conf_refresh_resp = client
                .post("https://passport.bilibili.com/x/passport-login/web/confirm/refresh")
                .query(&[
                    ("csrf", parsed_cookie.value.to_string()),
                    ("refresh_token", refresh_token.to_string())
                ])
                .send().await.map_err(|e| handle_err(window.clone(), e))?;
                if conf_refresh_resp.status() != reqwest::StatusCode::OK {
                    if conf_refresh_resp.status().to_string() != "412 Precondition Failed" {
                        log::error!("刷新Cookie失败");
                        return Err("刷新Cookie失败".to_string());
                    }
                }
                let conf_refresh_resp_data: Value = conf_refresh_resp.json().await.map_err(|e| handle_err(window, e))?;
                match conf_refresh_resp_data["code"].as_i64() {
                    Some(0) => {
                        log::info!("刷新Cookie成功");
                        return Ok("刷新Cookie成功".to_string());
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
async fn scan_login(window: tWindow, qrcode_key: String) -> Result<String, String> {
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
            )).send().await.map_err(|e| handle_err(window.clone(), e))?;

        if response.status() != reqwest::StatusCode::OK {
            handle_err(window.clone(), response.status().to_string());
            return Err(response.status().to_string());
        }
        let cookie_headers: Vec<String> = response.headers().get_all(header::SET_COOKIE)
            .iter().flat_map(|h| h.to_str().ok())
            .map(|s| s.to_string())
            .collect();

        let response_data: Value = response.json().await.map_err(|e| handle_err(window.clone(), e))?;
        if response_data["code"].as_i64() == Some(0) {
            window.emit("login-status", response_data["data"]["code"].to_string()).unwrap();
            match response_data["data"]["code"].as_i64() {
                Some(0) => {
                    for cookie in cookie_headers.clone() {
                        insert_cookie(window.clone(), &cookie).map_err(|e| handle_err(window.clone(), e))?;
                        let parsed_cookie = parse_cookie_header(&cookie).map_err(|e| handle_err(window.clone(), e))?;
                        if parsed_cookie.name == "DedeUserID" {
                            window.emit("user-mid", parsed_cookie.value.to_string()).unwrap();
                        } else if parsed_cookie.name == "bili_jct" {
                            if let Some(refresh_token) = response_data["data"]["refresh_token"].as_str() { 
                                let refresh_token = format!(
                                    "refresh_token={}; Path=/; Domain=bilibili.com; Expires={}",
                                    refresh_token, parsed_cookie.expires
                                );
                                insert_cookie(window.clone(), &refresh_token).map_err(|e| handle_err(window.clone(), e))?;
                            }
                        }
                    }
                    log::info!("{}: \"扫码登录成功\"", cloned_key);
                    return Ok("扫码登录成功".to_string());
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
    return Ok("登录过程被终止".to_string());
}

#[tauri::command]
async fn pwd_login(window: tWindow,
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
        .send().await.map_err(|e| handle_err(window.clone(), e))?;

    if response.status() != reqwest::StatusCode::OK {
        handle_err(window.clone(), response.status().to_string());
        return Err(response.status().to_string());
    }
    let cookie_headers: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();

    let response_data: Value = response.json().await.map_err(|e| handle_err(window.clone(), e))?;
    if response_data["code"].as_i64() == Some(0) {
        for cookie in cookie_headers.clone() {
            insert_cookie(window.clone(), &cookie).map_err(|e| handle_err(window.clone(), e))?;
            let parsed_cookie = parse_cookie_header(&cookie).map_err(|e| handle_err(window.clone(), e))?;
            if parsed_cookie.name == "DedeUserID" {
                log::info!("密码登录成功: {}", parsed_cookie.value);
                window.emit("user-mid", parsed_cookie.value.to_string()).unwrap();
            } else if parsed_cookie.name == "bili_jct" {
                if let Some(refresh_token) = response_data["data"]["refresh_token"].as_str() { 
                    let refresh_token = format!(
                        "refresh_token={}; Path=/; Domain=bilibili.com; Expires={}",
                        refresh_token, parsed_cookie.expires
                    );
                    insert_cookie(window.clone(), &refresh_token).map_err(|e| handle_err(window.clone(), e))?;
                }
            }
        }
        return Ok("密码登录成功".to_string());
    } else {
        log::error!("{}, {}", response_data["code"], response_data["message"]);
        return Err(format!("{}, {}", response_data["code"], response_data["message"]).to_string())
    }
}

#[tauri::command]
async fn sms_login(window: tWindow,
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
        .send().await.map_err(|e| handle_err(window.clone(), e))?;

    if response.status() != reqwest::StatusCode::OK {
        handle_err(window.clone(), response.status().to_string());
        return Err(response.status().to_string());
    }
    let cookie_headers: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();

    let response_data: Value = response.json().await.map_err(|e| handle_err(window.clone(), e))?;
    if response_data["code"].as_i64() == Some(0) {
        for cookie in cookie_headers.clone() {
            insert_cookie(window.clone(), &cookie).map_err(|e| handle_err(window.clone(), e))?;
            let parsed_cookie = parse_cookie_header(&cookie).map_err(|e| handle_err(window.clone(), e))?;
            if parsed_cookie.name == "DedeUserID" {
                window.emit("user-mid", parsed_cookie.value.to_string()).unwrap();
            } else if parsed_cookie.name == "bili_jct" {
                if let Some(refresh_token) = response_data["data"]["refresh_token"].as_str() { 
                    let refresh_token = format!(
                        "refresh_token={}; Path=/; Domain=bilibili.com; Expires={}",
                        refresh_token, parsed_cookie.expires
                    );
                    insert_cookie(window.clone(), &refresh_token).map_err(|e| handle_err(window.clone(), e))?;
                }
            }
        }
        log::info!("短信登录成功");
        return Ok("短信登录成功".to_string());
    } else {
        log::error!("{}, {}", response_data["code"], response_data["message"]);
        return Err(format!("{}, {}", response_data["code"], response_data["message"]).to_string())
    }
}

#[tauri::command]
async fn handle_aria2c(window: tWindow, secret: String, action: String) -> Result<(), String> {
    if secret != *SECRET.read().await {
        window.emit("error", "403 Forbidden<br>\n请重启应用").unwrap();
        return Err("403 Forbidden".to_string())
    }
    log::info!("Killing aria2c...");
    let mut manager = ARIA2C_MANAGER.lock().await;
    manager.kill().map_err(|e| handle_err(window.clone(), e))?;
    if action == "restart" {
        log::info!("Initializing aria2c...");
        manager.init().await.map_err(|e| handle_err(window.clone(), e))?;
    }
    Ok(())
}

#[tauri::command]
async fn ready(_window: tWindow) -> Result<String, String> {
    #[cfg(not(debug_assertions))]
    { if *READY.read().await {
        _window.emit("error", "403 Forbidden<br>\n请重启应用").unwrap();
        return Ok("403 Forbidden".to_string());
    } }
    LOGIN_POLLING.store(false, Ordering::SeqCst);
    *READY.write().await = true;
    Ok(SECRET.read().await.to_string())
}

#[tauri::command]
async fn init(window: tWindow, secret: String) -> Result<i64, String> {
    if secret != *SECRET.read().await {
        window.emit("error", "403 Forbidden<br>\n请重启应用").unwrap();
        return Err("403 Forbidden".to_string())
    }
    rw_config(window.clone(), "read".to_string(), None, secret).await.map_err(|e| handle_err(window.clone(), e))?;
    init_database(window.clone()).await.unwrap();
    get_buvid(window.clone()).await.map_err(|e| handle_err(window.clone(), e))?;
    let cookies = load_cookies().unwrap_or_else(|err| { log::error!("Error loading cookies: {:?}", err);
    HashMap::new() });
    let mid_value = if let Some(mid_cookie) = cookies.values().find(|cookie| cookie.name.eq("DedeUserID")) {
        mid_cookie.value.parse::<i64>().unwrap_or(0)
    } else { 0 };
    window.emit("user-mid", mid_value.to_string()).unwrap();
    return Ok(mid_value);
}

#[tauri::command]
async fn get_dm(window: tWindow, secret: String, oid: i64, date: Option<String>, df_path: String, xml: bool) -> Result<(), String> {
    if secret != *SECRET.read().await {
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
        .await.map_err(|e| handle_err(window.clone(), e))?;

    if response.status() != reqwest::StatusCode::OK {
        handle_err(window.clone(), response.status().to_string());
        return Err(response.status().to_string());
    }

    let bytes = response.bytes().await.map_err(|e| handle_err(window.clone(), e))?.to_vec();
    let mut decoder = DeflateDecoder::new(&*bytes);
    let mut dec_data = String::new();
    decoder.read_to_string(&mut dec_data).map_err(|e| handle_err(window.clone(), e))?;

    let mut dialog = FileDialogBuilder::new().set_file_name(&df_path);

    if xml { dialog = dialog.add_filter("XML 文档", &["xml"]);
    } else { dialog = dialog.add_filter("Aegisub 高级字幕文件", &["ass"]); }

    let (sender, receiver) = mpsc::channel(); // 模拟 Promise
    dialog.save_file(move |path| {
        let _ = sender.send(path);
    });
    let path = receiver.recv().map_err(|e| handle_err(window.clone(), e))?;
    if let Some(output) = path {
        let input = if xml { output.clone() } else {
            TEMP_DIR.read().await.join(format!(
            "{}.bilitools.downloading", output.file_name()
            .unwrap().to_string_lossy())).join("input.xml")
        };
        fs::create_dir_all(&input.parent().unwrap()).map_err(|e| handle_err(window.clone(), e))?;
        fs::write(input.clone(), dec_data).map_err(|e| handle_err(window.clone(), e))?;
        if !xml {
            let current_dir = env::current_dir().unwrap();
            let df_path = current_dir.join("DanmakuFactory").join("DanmakuFactory.exe");
            let _ = Command::new(df_path)
                .creation_flags(0x08000000)
                .arg("-i").arg(input)
                .arg("-o").arg(output)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
                .map_err(|e| handle_err(window.clone(), e))?;
        }
    };
    Ok(())
}

#[tokio::main]
async fn main() {
    logger::init_logger().map_err(|e| e.to_string()).unwrap();
    let secret: String = rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(10).map(char::from)
        .collect();
    *SECRET.write().await = secret.clone();
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            println!("{}, {argv:?}, {cwd}", app.package_info().name);
            app.emit_all("single-instance", (argv, cwd)).unwrap();
        }))
        .setup(|app| {
            let window = app.get_window("main").unwrap();
            let window_for_panic = std::sync::Arc::new(std::sync::Mutex::new(window.clone()));
            panic::set_hook(Box::new(move |e| {
                handle_err(window_for_panic.lock().unwrap().clone(), e);
            }));
            async_runtime::spawn(async move {
                rw_config(window.clone(), "init".to_string(), None, secret).await.map_err(|e| handle_err(window.clone(), e))?;
                ARIA2C_MANAGER.lock().await.init().await.map_err(|e| handle_err(window.clone(), e))?;
                window.clone().listen("stop_login", |_| { LOGIN_POLLING.store(false, Ordering::SeqCst) });
                Ok::<(), String>(())
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![ready, init, exit, 
            scan_login, pwd_login, sms_login, insert_cookie, open_select,
            rw_config, refresh_cookie, save_file, handle_download, get_dm,
            push_back_queue, process_queue, handle_temp, handle_aria2c])
        .on_window_event(move |event| match event.event() {
            WindowEvent::Destroyed => {
                log::info!("Killing aria2c...");
                async_runtime::spawn(async move { ARIA2C_MANAGER.lock().await.kill()
                .map_err(|e| handle_err(event.window().clone(), e)) });
            }
            _ => {}
         })
        .run(tauri::generate_context!())
        .expect("error while running BiliTools");
}