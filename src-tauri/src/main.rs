// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use lazy_static::lazy_static;
use serde_json::{Value, json};
use serde::{Deserialize, Serialize};
use reqwest::{Client, header, header::{HeaderMap, HeaderValue}, Url};
use std::{env, fs, path::PathBuf, sync::{Arc, atomic::{AtomicBool, Ordering}}, time::Instant, net::{TcpListener, SocketAddr},
process::{Command, Stdio, Child}, collections::{VecDeque, HashSet, HashMap}, os::windows::process::CommandExt};
use tokio::{fs::File, sync::{Mutex, RwLock, Notify}, io::{AsyncBufReadExt, AsyncSeekExt, SeekFrom, BufReader}, time::{sleep, Duration}};
use rusqlite::{Connection, params};
use regex::Regex;
mod logger;

lazy_static! {
    static ref GLOBAL_WINDOW: Arc<Mutex<Option<tauri::Window>>> = Arc::new(Mutex::new(None));
    static ref LOGIN_POLLING: Arc<AtomicBool> = Arc::new(AtomicBool::new(false));
    static ref DOWNLOAD_INFO_MAP: Mutex<HashMap<String, VideoInfo>> = Mutex::new(HashMap::new());
    static ref WORKING_DIR: PathBuf = {
        PathBuf::from(env::var("LOCALAPPDATA").unwrap()).join("com.btjawa.bilitools")
    };
    static ref DOWNLOAD_DIR: Arc<RwLock<PathBuf>> = {
        Arc::new(RwLock::new(PathBuf::from(env::var("USERPROFILE").unwrap()).join("Desktop")))
    };
    static ref TEMP_DIR: Arc<RwLock<PathBuf>> = Arc::new(RwLock::new(env::current_dir().unwrap().join("Temp")));
    static ref COOKIE_PATH: PathBuf = WORKING_DIR.join("Cookies");
    static ref CONFIG_PATH: Arc<RwLock<PathBuf>> = Arc::new(RwLock::new(WORKING_DIR.join("config.json")));
    static ref MAX_CONCURRENT_DOWNLOADS: Arc<RwLock<usize>> = Arc::new(RwLock::new(2));
    static ref ARIA2C_PORT: Arc<RwLock<usize>> = Arc::new(RwLock::new(0));
    static ref ARIA2C_PROCESS: std::sync::Mutex<Option<Child>> = std::sync::Mutex::new(None);
    static ref WAITING_QUEUE: Mutex<VecDeque<VideoInfo>> = Mutex::new(VecDeque::new());
    static ref CURRENT_DOWNLOADS: Mutex<VecDeque<VideoInfo>> = Mutex::new(VecDeque::new());
    static ref DOWNLOAD_COMPLETED_NOTIFY: Notify = Notify::new();
}

fn handle_err(window: tauri::Window, e: String) {
    log::warn!("{}", e);
    window.emit("error", e).unwrap();
}

async fn init_database(window: tauri::Window) -> Result<(), String> {
    if !&COOKIE_PATH.exists() {
        fs::write(&*COOKIE_PATH, "").map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()}).unwrap();
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
                expires TEXT,
                httponly INTEGER,
                secure INTEGER
            )",
            params![],
        ).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()}).unwrap();
    }
    window.emit("headers", headers_to_json(init_headers())).unwrap();
    Ok(())
}

async fn init_aria2c(window: tauri::Window) -> Result<(), String> {
    let start_port = 6800;
    let end_port = 65535;
    for port in start_port..end_port {
        match TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], port))) {
            Ok(_listener) => {
                *ARIA2C_PORT.write().await = port as usize;
                let current_dir = env::current_dir().map_err(|e| e.to_string())?
                    .join("aria2c");
                let child = Command::new(current_dir.join("aria2c.exe").clone())
                    .current_dir(current_dir.clone())
                    .arg(format!("--conf-path={}", current_dir.join("aria2.conf").to_string_lossy()))
                    .arg(format!("--rpc-listen-port={}", port))
                    .stdout(Stdio::piped())
                    .stderr(Stdio::piped())
                    .spawn()
                    .map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
                *ARIA2C_PROCESS.lock().unwrap() = Some(child);
                return Ok(());
            },
            Err(_) => continue,
        }
    }
    Err("No free port found".to_string())
}

fn load_cookies() -> rusqlite::Result<HashMap<String, CookieInfo>> {
    let conn = Connection::open(&*COOKIE_PATH)?;
    let mut stmt = conn.prepare("SELECT name, value, path, domain, expires, httponly, secure FROM cookies")?;
    let cookie_map: Result<HashMap<String, CookieInfo>, rusqlite::Error> = stmt.query_map([], |row| {
        let cookie_info = CookieInfo {
            name: row.get(0)?,
            value: row.get(1)?,
            path: row.get(2)?,
            domain: row.get(3)?,
            expires: row.get(4)?,
            httponly: row.get(5)?,
            secure: row.get(6)?,
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

#[derive(Debug, Clone)]
struct CookieInfo {
    name: String,
    value: String,
    path: String,
    domain: String,
    expires: String,
    httponly: bool,
    secure: bool,
}

#[derive(Debug, Clone)]
struct VideoInfo {
    index: i64,
    display_name: String,
    video_path: PathBuf,
    audio_path: PathBuf,
    output_path: PathBuf,
    video_downloaded: bool,
    audio_downloaded: bool,
    finished: bool,
    tasks: Vec<DownloadTask>,
    action: String,
}

#[derive(Debug, Clone)]
struct DownloadTask {
    index: i64,
    display_name: String,
    url: Vec<String>,
    path: PathBuf,
    file_type: String,
}

#[derive(Serialize, Deserialize)]
struct Settings {
    max_conc: i64,
    default_dms: i64,
    default_ads: i64,
    temp_dir: String,
    down_dir: String
}

async fn get_buvid(window: tauri::Window) -> Result<String, String> {
    let client = init_client();
    let buvid3_resp = client
        .get("https://www.bilibili.com")
        .send().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    let cookie_headers: Vec<String> = buvid3_resp.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();
    for cookie in cookie_headers.clone() {
        insert_cookie(window.clone(), &cookie).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    }
    let buvid4_resp = client
        .get("https://api.bilibili.com/x/frontend/finger/spi")
        .send().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    let buvid4_resp_data: Value = buvid4_resp.json().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    if buvid4_resp_data["code"].as_i64() == Some(0) {
        if let Some(buvid4) = buvid4_resp_data["data"]["b_4"].as_str() { 
            let buvid4 = format!(
                "buvid4={}; Path=/; Domain=bilibili.com", buvid4
            );
            insert_cookie(window.clone(), &buvid4).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
        }
        return Ok("成功获取buvid".to_string());
    } else {
        log::warn!("{}, {}", buvid4_resp_data["code"], buvid4_resp_data["message"]);
        return Err(format!("{}, {}", buvid4_resp_data["code"], buvid4_resp_data["message"]).to_string())
    }
}

#[tauri::command]
async fn push_back_queue(
    window: tauri::Window, video_url: Option<Vec<String>>, audio_url: Option<Vec<String>>,
    index: i64, display_name: String, action: String, ss_dir: String
) {
    let mut tasks = vec![];
    if let Some(v_url) = video_url {
        let video_path = if action == "multi" {
            TEMP_DIR.read().await.join(&extract_filename(&v_url[0]))
        } else { DOWNLOAD_DIR.read().await.join(ss_dir.clone()).join(&display_name) };
        tasks.push(DownloadTask { 
            index: index.clone(),
            display_name: display_name.clone(), 
            url: v_url, 
            path: video_path, 
            file_type: "video".to_string() 
        });
    }
    if let Some(a_url) = audio_url {
        let audio_path = if action == "multi" {
            TEMP_DIR.read().await.join(&extract_filename(&a_url[0]))
        } else { DOWNLOAD_DIR.read().await.join(ss_dir.clone()).join(&display_name) };
        tasks.push(DownloadTask {
            index: index.clone(), 
            display_name: display_name.clone(), 
            url: a_url, 
            path: audio_path, 
            file_type: "audio".to_string() 
        });
    }
    let download_info = VideoInfo {
        index,
        display_name: display_name.clone(),
        video_path: tasks.get(0).map_or(PathBuf::new(), |task| task.path.clone()),
        audio_path: tasks.get(1).map_or(PathBuf::new(), |task| task.path.clone()),
        output_path: DOWNLOAD_DIR.read().await.join(ss_dir.clone()).join(display_name.clone()),
        video_downloaded: false,
        audio_downloaded: false,
        finished: false,
        tasks, action
    };
    fs::create_dir_all(DOWNLOAD_DIR.read().await.join(ss_dir)).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()}).unwrap();
    DOWNLOAD_INFO_MAP.lock().await.insert(display_name, download_info.clone());
    WAITING_QUEUE.lock().await.push_back(download_info.clone());
}

#[tauri::command]
async fn process_queue(window: tauri::Window, initial: bool) {
    let mut init = initial;
    log::info!("");
    loop {
        // 等待下载完成的通知
        if !init { DOWNLOAD_COMPLETED_NOTIFY.notified().await; }
        else { init = false; }
        let mut current_downloads = CURRENT_DOWNLOADS.lock().await;
        let mut waiting_queue = WAITING_QUEUE.lock().await;
        let max_concurrent_downloads = MAX_CONCURRENT_DOWNLOADS.read().await;
        while current_downloads.len() < *max_concurrent_downloads && !waiting_queue.is_empty() {
            if let Some(video_info) = waiting_queue.pop_front() {
                if !current_downloads.iter().any(|existing_info| existing_info.display_name == video_info.display_name && !existing_info.finished) {
                    current_downloads.push_back(video_info.clone());
                    let window_clone = window.clone();
                    tokio::spawn(async move {
                        process_download(window_clone, video_info).await;
                    });
                }
            }
        }
    }
}

async fn process_download(window: tauri::Window, mut download_info: VideoInfo) {
    let action = download_info.action.clone();
    for task in &download_info.tasks {
        if download_info.index != task.index {
            continue;
        }
        match download_file(window.clone(), task.clone(), action.clone()).await {
            Ok(o) => {
                if action.clone() == "only" {
                    fs::rename(task.path.clone(), download_info.output_path.clone()).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()}).unwrap();
                    window.emit("download-success", o).unwrap();
                }
            }
            Err(e) => { window.emit("download-failed", vec![task.display_name.clone(), e]).unwrap(); }
        };
        match task.file_type.as_str() {
            "video" => download_info.video_downloaded = true,
            "audio" => download_info.audio_downloaded = true,
            _ => {}
        }
    }
    let mut current_downloads = CURRENT_DOWNLOADS.lock().await;
    current_downloads.retain(|info| info.index != download_info.index);
    DOWNLOAD_COMPLETED_NOTIFY.notify_one();
    let index = download_info.index.to_string();
    if action == "multi"  {
        match merge_video_audio(window.clone(), &download_info.audio_path, &download_info.video_path, &download_info.output_path, &index).await {
            Ok(o) => { window.emit("download-success", o).unwrap(); }
            Err(e) => { window.emit("download-failed", vec![download_info.display_name, e]).unwrap(); }
        }
    }
    download_info.finished = true;
}

async fn download_file(window: tauri::Window, task: DownloadTask, action: String) -> Result<String, String> {
    log::info!("Starting download for: {}", &task.display_name);
    let client = init_client();
    let init_payload = json!({
        "jsonrpc": "2.0",
        "method": "aria2.addUri",
        "id": "1",
        "params": [
            task.url,
            {"dir": task.path.parent().unwrap().to_str().unwrap(),
            "out": task.path.file_name().unwrap().to_str().unwrap()}
        ]
    });
    let init_resp = client
        .post(format!("http://localhost:{}/jsonrpc", ARIA2C_PORT.read().await))
        .json(&init_payload)
        .send().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;

    let init_resp_data: Value = init_resp.json().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    let gid = &init_resp_data["result"];
    let mut last_log_time = Instant::now();
    let log_interval = Duration::from_secs(1);
    loop {
        let status_payload = json!({
            "jsonrpc": "2.0",
            "method": "aria2.tellStatus",
            "id": "1",
            "params": [gid]
        });
        let status_resp = client
            .post(format!("http://localhost:{}/jsonrpc", ARIA2C_PORT.read().await))
            .json(&status_payload)
            .send().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;

        let status_resp_data: Value = status_resp.json().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
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
        let formatted_values = json!({
            "index": task.index,
            "remaining": format!("{:.2} s", remaining),
            "downloaded": format!("{:.2} MB", downloaded),
            "speed": format!("{:.2} MB/s", speed),
            "progress": format!("{:.2}%", progress),
            "display_name": task.display_name,
            "gid": gid,
            "file_type": task.file_type,
            "action": action
        });
        let formatted_array: Vec<String> = formatted_values.as_object().unwrap()
        .iter().map(|(_key, value)| {
            match value { serde_json::Value::String(s) => format!("{}", s),
            _ => format!("{}", value) }
        }).collect();
        if last_log_time.elapsed() >= log_interval {
            log::info!("{:?}", formatted_array.join(" | "));
            last_log_time = Instant::now();
        }
        window.emit("download-progress", &formatted_values).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
        if status_resp_data["result"]["status"].as_str() == Some("complete") {
            break;
        }
        sleep(Duration::from_micros(250)).await;
    }
    Ok(task.display_name.to_string())
}

async fn merge_video_audio(window: tauri::Window, audio_path: &PathBuf, video_path: &PathBuf, output: &PathBuf, index: &String) -> Result<String, String> {
    log::info!("");
    log::info!("Starting merge process for audio");
    let current_dir = env::current_dir().unwrap();
    let ffmpeg_path = current_dir.join("ffmpeg").join("ffmpeg.exe");
    let output_path = output.to_string_lossy();
    if let Some(ss_dir_path) = output.parent() {
        if !ss_dir_path.exists() {
            fs::create_dir_all(&ss_dir_path).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
            log::info!("成功创建{}", ss_dir_path.to_string_lossy());
        }
    }
    let video_filename = &output.file_name()
        .and_then(|f| f.to_str())
        .ok_or_else(|| "无法提取视频文件名".to_string())?;

    let progress_path = current_dir.join("ffmpeg")
        .join(format!("{}.log", video_filename));

    let mut child = Command::new(ffmpeg_path)
        .creation_flags(0x08000000)
        .arg("-i").arg(video_path)
        .arg("-i").arg(audio_path)
        .arg("-stats_period").arg("0.1")
        .arg("-c:v").arg("copy")
        .arg("-c:a").arg("aac")
        .arg(&*output_path).arg("-progress")
        .arg(&progress_path).arg("-y")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;

    let audio_path_clone = audio_path.clone();
    let video_path_clone = video_path.clone();
    let window_clone = window.clone();
    let progress_path_clone = &progress_path.clone();
    while !progress_path.exists() {
        sleep(Duration::from_millis(250)).await;
    }
    let mut progress_lines = VecDeque::new();
    let mut last_size: u64 = 0;
    let mut last_log_time = Instant::now();
    let log_interval = Duration::from_secs(1);
    loop {
        let mut printed_keys = HashSet::new();
        let metadata = tokio::fs::metadata(&progress_path).await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
        if metadata.len() > last_size {
            let mut file = File::open(&progress_path).await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
            file.seek(SeekFrom::Start(last_size)).await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
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
            "index": index,
            "display_name": video_filename,
            "frame": messages.get(0).unwrap_or(&"").to_string(),
            "fps": messages.get(1).unwrap_or(&"").to_string(),
            "out_time": messages.get(2).unwrap_or(&"").to_string(),
            "speed": messages.get(3).unwrap_or(&"").to_string()
        });
        let formatted_array: Vec<String> = formatted_values.as_object().unwrap()
        .iter().map(|(_key, value)| {
            match value { serde_json::Value::String(s) => format!("{}", s),
             _ => format!("{}", value) }
        }).collect();
        if last_log_time.elapsed() >= log_interval {
            log::info!("{:?}", formatted_array.join(" | "));
            last_log_time = Instant::now();
        }
        window_clone.emit("merge-progress", &formatted_values).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
        if progress_lines.iter().any(|l| l.starts_with("progress=end")) {
            break;
        }
        sleep(Duration::from_micros(250)).await;
    }
    let status = child.wait().map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    if let Err(e) = tokio::fs::remove_file(audio_path_clone.clone()).await {
        return Err(format!("无法删除原始音频文件: {}", e));
    }
    if let Err(e) = tokio::fs::remove_file(video_path_clone.clone()).await {
        return Err(format!("无法删除原始视频文件: {}", e));
    }
    if let Err(e) = tokio::fs::remove_file(progress_path_clone).await {
        return Err(format!("无法删除进度文件: {}", e));
    }
    let formatted_values = json!({
        "index": index,
        "display_name": video_filename,
    });
    if status.success() {
        log::info!("");
        log::info!("FFmpeg process completed.");
        window.emit("merge-success", formatted_values).unwrap();
        Ok(video_filename.to_string())
    } else {
        if let Err(e) = tokio::fs::remove_file(&*output_path.clone()).await {
            return Err(format!("无法删除合并失败视频文件: {}", e));
        }
        window.emit("merge-failed", formatted_values).unwrap();
        Err("FFmpeg command failed".to_string())
    }
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
    let mut httponly = false;
    let mut secure = false;
    for part in cookie_str.split(';').skip(1) {
        let mut iter = part.splitn(2, '=').map(str::trim);
        if let Some(key) = iter.next() {
            if let Some(value) = iter.next() {
                match key.to_lowercase().as_str() {
                    "path" => path = value,
                    "domain" => domain = value,
                    "expires" => expires = value,
                    "httponly" => httponly = iter.peekable().peek().is_some(),
                    "secure" => secure = iter.peekable().peek().is_some(),
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
        httponly,
        secure,
    })
}

#[tauri::command]
fn insert_cookie(window: tauri::Window, cookie_str: &str) -> Result<(), String> {
    let parsed_cookie = parse_cookie_header(cookie_str).unwrap();
    let conn = Connection::open(&*COOKIE_PATH).unwrap();
    conn.execute(
        "INSERT OR REPLACE INTO cookies (name, value, path, domain, expires, httponly, secure) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            parsed_cookie.name,
            parsed_cookie.value,
            parsed_cookie.path,
            parsed_cookie.domain,
            parsed_cookie.expires,
            parsed_cookie.httponly,
            parsed_cookie.secure,
        ],
    ).unwrap();
    window.emit("headers", headers_to_json(init_headers())).unwrap();
    Ok(())
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
async fn init(window: tauri::Window) -> Result<i64, String> {
    init_database(window.clone()).await.unwrap();
    init_aria2c(window.clone()).await.unwrap();
    rw_config(window.clone(), "read".to_string(), None).await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    stop_login();
    get_buvid(window.clone()).await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    let cookies = load_cookies().unwrap_or_else(|err| { log::warn!("Error loading cookies: {:?}", err);
    HashMap::new() });
    let mid_value = if let Some(mid_cookie) = cookies.values().find(|cookie| cookie.name.eq("DedeUserID")) {
        mid_cookie.value.parse::<i64>().unwrap_or(0)
    } else { 0 };
    window.emit("user-mid", mid_value.to_string()).unwrap();
    return Ok(mid_value);
}

#[tauri::command]
async fn rw_config(window: tauri::Window, action: String, sets: Option<Settings>) -> Result<i64, String> {
    let config_path = CONFIG_PATH.read().await.clone();
    let (temp_dir, down_dir, max_conc) = if let Some(settings) = sets {
        (settings.temp_dir, settings.down_dir, settings.max_conc)
    } else {
        let current_temp_dir = TEMP_DIR.read().await.to_string_lossy().into_owned();
        let current_down_dir = DOWNLOAD_DIR.read().await.to_string_lossy().into_owned();
        let current_max_conc = *MAX_CONCURRENT_DOWNLOADS.read().await as i64;
        (current_temp_dir, current_down_dir, current_max_conc)
    };
    let new_config = json!({
        "max_conc": max_conc,
        "default_dms": 0,
        "default_ads": 0,
        "temp_dir": temp_dir,
        "down_dir": down_dir,
    });
    let new_config_str = serde_json::to_string(&new_config).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    if !WORKING_DIR.clone().exists() {
        fs::create_dir_all(WORKING_DIR.clone()).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    }
    if action == "save" || (action == "read" && (!config_path.exists() || fs::read_to_string(&config_path).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?.trim().is_empty())) {
        fs::write(&config_path, &new_config_str).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    }
    let config_str = fs::read_to_string(&config_path).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    let config: serde_json::Value = serde_json::from_str(&config_str).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    if let Some(max_conc) = config["max_conc"].as_u64() {
        *MAX_CONCURRENT_DOWNLOADS.write().await = max_conc as usize;
        log::info!("成功更新MAX_CONCURRENT_DOWNLOADS: {}", *MAX_CONCURRENT_DOWNLOADS.read().await);
    }
    if let Some(temp_dir_str) = config["temp_dir"].as_str() {
        *TEMP_DIR.write().await = PathBuf::from(temp_dir_str);
        log::info!("成功更新TEMP_DIR: {:?}", *TEMP_DIR.read().await);
    }
    if let Some(down_dir_str) = config["down_dir"].as_str() {
        *DOWNLOAD_DIR.write().await = PathBuf::from(down_dir_str);
        log::info!("成功更新DOWNLOAD_DIR: {:?}", *DOWNLOAD_DIR.read().await);
    }
    let dirs_to_check = vec![TEMP_DIR.read().await.clone(), DOWNLOAD_DIR.read().await.clone()];
    for dir in &dirs_to_check {
        if !dir.exists() {
            fs::create_dir_all(dir).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
        }
    }
    window.emit("settings", serde_json::json!({
        "down_dir": *DOWNLOAD_DIR.read().await,
        "temp_dir": *TEMP_DIR.read().await,
        "max_conc": *MAX_CONCURRENT_DOWNLOADS.read().await
    })).unwrap();
    Ok(0)
}

#[tauri::command]
async fn save_file(window: tauri::Window, content: String, path: String) -> Result<String, String> {
    if let Err(e) = fs::write(path.clone(), content) {
        handle_err(window.clone(),  e.to_string());
        Err(e.to_string())
    } else {
        Ok(path)
    }
}

#[tauri::command]
async fn open_select(window: tauri::Window, display_name: String, index: i64) -> Result<String, String>{
    let download_info_map = DOWNLOAD_INFO_MAP.lock().await;
    if let Some(video_info) = download_info_map.get(&display_name) {
        if video_info.index == index {
            if let Err(e) = fs::metadata(&video_info.output_path) {
                handle_err(window.clone(), format!("{}<br>\n文件可能已被移动或删除。", e.to_string()));
                Err(format!("{}<br>\n文件可能已被移动或删除。", e.to_string()))
            } else {
                Command::new("C:\\Windows\\explorer.exe")
                    .arg("/select,").arg(video_info.output_path.to_string_lossy().to_string())
                    .stdout(Stdio::piped())
                    .stderr(Stdio::piped())
                    .spawn()
                    .map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()}).unwrap();
                Ok(video_info.output_path.to_string_lossy().to_string())
            }
        } else { Err("".to_string()) }
    } else { Err("".to_string()) }
}

#[tauri::command]
async fn exit(window: tauri::Window) -> Result<String, String> {
    let client = init_client();
    let cookies = load_cookies().unwrap_or_else(|err| { log::warn!("Error loading cookies: {:?}", err);
    HashMap::new() });
    let bili_jct = if let Some(bili_jct) = cookies.get("bili_jct") {
        &bili_jct.value } else { "" };
    let response = client
        .post("https://passport.bilibili.com/login/exit/v2")
        .query(&[("biliCSRF", bili_jct.to_string())])
        .send().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;

    if response.status() != reqwest::StatusCode::OK {
        handle_err(window.clone(), response.status().to_string());
        return Err(response.status().to_string());
    }
    let cookie_headers: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();

    let conn = Connection::open(&*COOKIE_PATH).unwrap();
    let response_data: Value = response.json().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    if response_data["code"].as_i64() == Some(0) {
        for cookie in cookie_headers.clone() {
            let parsed_cookie = parse_cookie_header(&cookie).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
            conn.execute("DELETE FROM cookies WHERE name = ?",
            &[&parsed_cookie.name]).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
        }
        get_buvid(window.clone()).await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
        window.emit("headers", headers_to_json(init_headers())).unwrap();
        window.emit("exit-success", 0).unwrap();
        return Ok("成功退出登录".to_string());
    } else {
        log::warn!("{}, {}", response_data["code"], response_data["message"]);
        return Err(format!("{}, {}", response_data["code"], response_data["message"]).to_string())
    }
}

#[tauri::command]
fn stop_login() {
    LOGIN_POLLING.store(false, Ordering::SeqCst);
}

#[tauri::command]
async fn refresh_cookie(window: tauri::Window, refresh_csrf: String) -> Result<String, String> {
    let client = init_client();
    let cookies = load_cookies().unwrap_or_else(|err| { log::warn!("Error loading cookies: {:?}", err);
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
        .send().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
        let cookie_headers: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();

    if response.status() != reqwest::StatusCode::OK {
        handle_err(window.clone(), response.status().to_string());
        return Err(response.status().to_string());
    }
    let response_data: Value = response.json().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    if response_data["code"].as_i64() == Some(0) {
        for cookie in cookie_headers.clone() {
            insert_cookie(window.clone(), &cookie).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
            let parsed_cookie = parse_cookie_header(&cookie).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
            if parsed_cookie.name == "DedeUserID" {
                window.emit("user-mid", parsed_cookie.value.to_string()).unwrap();
            } else if parsed_cookie.name == "bili_jct" {
                if let Some(refresh_token) = response_data["data"]["refresh_token"].as_str() { 
                    let refresh_token = format!(
                        "refresh_token={}; Path=/; Domain=bilibili.com; Expires={}",
                        refresh_token, parsed_cookie.expires
                    );
                    insert_cookie(window.clone(), &refresh_token).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
                }
                let conf_refresh_resp = client
                .post("https://passport.bilibili.com/x/passport-login/web/confirm/refresh")
                .query(&[
                    ("csrf", parsed_cookie.value.to_string()),
                    ("refresh_token", refresh_token.to_string())
                ])
                .send().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
                if conf_refresh_resp.status() != reqwest::StatusCode::OK {
                    if conf_refresh_resp.status().to_string() != "412 Precondition Failed" {
                        log::warn!("刷新Cookie失败");
                        return Err("刷新Cookie失败".to_string());
                    }
                }
                let conf_refresh_resp_data: Value = conf_refresh_resp.json().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
                match conf_refresh_resp_data["code"].as_i64() {
                    Some(0) => {
                        log::info!("刷新Cookie成功");
                        return Ok("刷新Cookie成功".to_string());
                    }
                    _ => {
                        log::warn!("{}", response_data["data"]["message"]);
                        return Err(format!("{}", response_data["data"]["message"]).to_string())
                    },
                }
            }
        }
        log::warn!("{}, {}", response_data["data"]["code"], response_data["data"]["message"]);
        return Err(format!("{}, {}", response_data["data"]["code"], response_data["data"]["message"]).to_string())
    } else {
        log::warn!("{}, {}", response_data["code"], response_data["message"]);
        return Err(format!("{}, {}", response_data["code"], response_data["message"]).to_string())
    }
}

#[tauri::command]
async fn scan_login(window: tauri::Window, qrcode_key: String) -> Result<String, String> {
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
            )).send().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;

        if response.status() != reqwest::StatusCode::OK {
            handle_err(window.clone(), response.status().to_string());
            return Err(response.status().to_string());
        }
        let cookie_headers: Vec<String> = response.headers().get_all(header::SET_COOKIE)
            .iter().flat_map(|h| h.to_str().ok())
            .map(|s| s.to_string())
            .collect();

        let response_data: Value = response.json().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
        if response_data["code"].as_i64() == Some(0) {
            window.emit("login-status", response_data["data"]["code"].to_string()).unwrap();
            match response_data["data"]["code"].as_i64() {
                Some(0) => {
                    for cookie in cookie_headers.clone() {
                        insert_cookie(window.clone(), &cookie).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
                        let parsed_cookie = parse_cookie_header(&cookie).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
                        if parsed_cookie.name == "DedeUserID" {
                            window.emit("user-mid", parsed_cookie.value.to_string()).unwrap();
                        } else if parsed_cookie.name == "bili_jct" {
                            if let Some(refresh_token) = response_data["data"]["refresh_token"].as_str() { 
                                let refresh_token = format!(
                                    "refresh_token={}; Path=/; Domain=bilibili.com; Expires={}",
                                    refresh_token, parsed_cookie.expires
                                );
                                insert_cookie(window.clone(), &refresh_token).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
                            }
                        }
                    }
                    log::info!("{}: \"扫码登录成功\"", cloned_key);
                    return Ok("扫码登录成功".to_string());
                }
                Some(86101) | Some(86090) => log::info!("{}: {}", cloned_key, response_data["data"]["message"]),
                _ => {
                    log::warn!("{}: {}, {}", cloned_key, response_data["data"]["code"], response_data["data"]["message"]);
                    return Err(format!("{}, {}", response_data["data"]["code"], response_data["data"]["message"]).to_string())
                },
            }
        } else {
            log::warn!("{}: {}, {}", cloned_key, response_data["data"]["code"], response_data["data"]["message"]);
            return Err(format!("{}, {}", response_data["data"]["code"], response_data["data"]["message"]).to_string())
        }
        sleep(Duration::from_secs(1)).await;
    }
    log::warn!("{}: \"登录轮询被前端截断\"", cloned_key);
    return Ok("登录过程被终止".to_string());
}

#[tauri::command]
async fn pwd_login(window: tauri::Window,
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
        .send().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;

    if response.status() != reqwest::StatusCode::OK {
        handle_err(window.clone(), response.status().to_string());
        return Err(response.status().to_string());
    }
    let cookie_headers: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();

    let response_data: Value = response.json().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    if response_data["code"].as_i64() == Some(0) {
        for cookie in cookie_headers.clone() {
            insert_cookie(window.clone(), &cookie).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
            let parsed_cookie = parse_cookie_header(&cookie).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
            if parsed_cookie.name == "DedeUserID" {
                log::info!("密码登录成功: {}", parsed_cookie.value);
                window.emit("user-mid", parsed_cookie.value.to_string()).unwrap();
            } else if parsed_cookie.name == "bili_jct" {
                if let Some(refresh_token) = response_data["data"]["refresh_token"].as_str() { 
                    let refresh_token = format!(
                        "refresh_token={}; Path=/; Domain=bilibili.com; Expires={}",
                        refresh_token, parsed_cookie.expires
                    );
                    insert_cookie(window.clone(), &refresh_token).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
                }
            }
        }
        return Ok("密码登录成功".to_string());
    } else {
        log::warn!("{}, {}", response_data["code"], response_data["message"]);
        return Err(format!("{}, {}", response_data["code"], response_data["message"]).to_string())
    }
}

#[tauri::command]
async fn sms_login(window: tauri::Window,
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
        .send().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;

    if response.status() != reqwest::StatusCode::OK {
        handle_err(window.clone(), response.status().to_string());
        return Err(response.status().to_string());
    }
    let cookie_headers: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();

    let response_data: Value = response.json().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    if response_data["code"].as_i64() == Some(0) {
        for cookie in cookie_headers.clone() {
            insert_cookie(window.clone(), &cookie).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
            let parsed_cookie = parse_cookie_header(&cookie).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
            if parsed_cookie.name == "DedeUserID" {
                window.emit("user-mid", parsed_cookie.value.to_string()).unwrap();
            } else if parsed_cookie.name == "bili_jct" {
                if let Some(refresh_token) = response_data["data"]["refresh_token"].as_str() { 
                    let refresh_token = format!(
                        "refresh_token={}; Path=/; Domain=bilibili.com; Expires={}",
                        refresh_token, parsed_cookie.expires
                    );
                    insert_cookie(window.clone(), &refresh_token).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
                }
            }
        }
        log::info!("短信登录成功");
        return Ok("短信登录成功".to_string());
    } else {
        log::warn!("{}, {}", response_data["code"], response_data["message"]);
        return Err(format!("{}, {}", response_data["code"], response_data["message"]).to_string())
    }
}

#[tokio::main]
async fn main() {
    logger::init_logger().map_err(|e| e.to_string()).unwrap();
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![init,
            scan_login, pwd_login, sms_login, stop_login, insert_cookie,
            open_select, rw_config, refresh_cookie, save_file,
            push_back_queue, process_queue, exit])
        .on_window_event(move |event| match event.event() {
            tauri::WindowEvent::Destroyed => {
                log::info!("Killing aria2c...");
                let mut child = ARIA2C_PROCESS.lock().unwrap();
                if let Some(ref mut process) = *child {
                    let _ = process.kill();
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}