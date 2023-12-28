// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use lazy_static::lazy_static;
use serde_json::{Value, json};
use serde::{Deserialize, Serialize};
use reqwest::{Client, header, header::{HeaderMap, HeaderValue}, Url};
use warp::{Filter, Reply, http::Response, path::FullPath, hyper::Method, hyper::body::Bytes};
use std::{env, fs, path::PathBuf, sync::Arc, convert::Infallible, time::Instant, process::Command,
process::Stdio, collections::{VecDeque, HashSet, HashMap}, io::{self, Write}, os::windows::process::CommandExt};
use tokio::{fs::File, sync::{Mutex, RwLock, Notify}, io::{AsyncWriteExt, AsyncBufReadExt, AsyncSeekExt, SeekFrom, BufReader}, time::{sleep, Duration}};
use futures::stream::StreamExt;
use rusqlite::{Connection, params};
use regex::Regex;
use tauri::Manager;
mod logger;

lazy_static! {
    static ref GLOBAL_WINDOW: Arc<Mutex<Option<tauri::Window>>> = Arc::new(Mutex::new(None));
    static ref STOP_LOGIN: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
    static ref DOWNLOAD_INFO_MAP: Mutex<HashMap<String, VideoInfo>> = Mutex::new(HashMap::new());
    static ref WORKING_DIR: PathBuf = {
        PathBuf::from(env::var("APPDATA").expect("APPDATA environment variable not found"))
        .join("com.btjawa.bilitools")
    };
    static ref DOWNLOAD_DIR: Arc<RwLock<PathBuf>> = {
        Arc::new(RwLock::new(PathBuf::from(env::var("USERPROFILE").expect("USERPROFILE environment variable not found"))
        .join("Desktop")))
    };
    static ref TEMP_DIR: Arc<RwLock<PathBuf>> = Arc::new(RwLock::new(WORKING_DIR.join("Temp")));
    static ref COOKIE_PATH: PathBuf = WORKING_DIR.join("Cookies");
    static ref CONFIG_PATH: Arc<RwLock<PathBuf>> = Arc::new(RwLock::new(WORKING_DIR.join("config.json")));
    static ref MAX_CONCURRENT_DOWNLOADS: Arc<RwLock<usize>> = Arc::new(RwLock::new(2));
    static ref WAITING_QUEUE: Mutex<VecDeque<VideoInfo>> = Mutex::new(VecDeque::new());
    static ref CURRENT_DOWNLOADS: Mutex<VecDeque<VideoInfo>> = Mutex::new(VecDeque::new());
    static ref DOWNLOAD_COMPLETED_NOTIFY: Notify = Notify::new();
}

fn handle_err(window: tauri::Window, e: String) {
    log::warn!("{}", e);
    window.emit("error", e).unwrap();
}

async fn init_database(window: tauri::Window) -> Connection {
    if !&COOKIE_PATH.exists() {
        let _ = fs::write(&*COOKIE_PATH, "").map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()});
    }
    let metadata = fs::metadata(&*COOKIE_PATH).unwrap();
    let conn = Connection::open(&*COOKIE_PATH).unwrap();
    if metadata.len() == 0 {
        let _ = conn.execute(
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
        ).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()});
    }
    conn
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
    let cookies_header = format!("{};", load_cookies()
        .unwrap_or_else(|err| { log::warn!("Error loading cookies: {:?}", err);
        HashMap::new() })
        .values()
        .map(|cookie_info| format!("{}={}", cookie_info.name, cookie_info.value))
        .collect::<Vec<_>>()
        .join("; "));
    headers.insert("Cookie", HeaderValue::from_str(&cookies_header).unwrap());
    headers.insert("Connection", HeaderValue::from_static("keep-alive"));
    headers.insert("Referer", HeaderValue::from_static("https://www.bilibili.com"));
    headers
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
    cid: String,
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
    cid: String,
    display_name: String,
    url: String,
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

#[derive(Debug, Clone, Serialize)]
struct DownloadProgress {
    cid: String,
    progress: String,
    remaining: String,
    downloaded: String,
    speed: String,
    elapsed_time: String,
    display_name: String,
    file_type: String,
    action: String
}

impl DownloadProgress {
    fn print(&self) -> String {
        format!(
            "{} | {} | {} | {} | {} | {} | {} | {} | {}",
            self.cid, self.progress, self.remaining, self.downloaded, self.speed, self.elapsed_time, self.display_name, self.file_type, self.action
        )
    }
}

async fn get_buvid(window: tauri::Window) -> Result<String, String> {
    let client = init_client();
    let buvid3_resp = client
        .get("http://127.0.0.1:50808/www")
        .send().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    let cookie_headers: Vec<String> = buvid3_resp.headers().get_all(header::SET_COOKIE)
        .iter()
        .flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();

    for cookie in cookie_headers.clone() {
        let _ = insert_cookie(&cookie);
    }
    let buvid4_resp = client
        .get("http://127.0.0.1:50808/api/x/frontend/finger/spi")
        .send().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    let buvid4_resp_data: Value = buvid4_resp.json().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    if buvid4_resp_data["code"].as_i64() == Some(0) {
        if let Some(buvid4) = buvid4_resp_data["data"]["b_4"].as_str() { 
            let buvid4 = format!(
                "buvid4={}; Path=/; Domain=bilibili.com", buvid4
            );
            let _ = insert_cookie(&buvid4);
        }
        return Ok("成功获取buvid".to_string());
    } else {
        log::warn!("{}, {}", buvid4_resp_data["code"], buvid4_resp_data["message"]);
        return Err(format!("{}, {}", buvid4_resp_data["code"], buvid4_resp_data["message"]).to_string())
    }
}

#[tauri::command]
async fn push_back_queue(
    video_url: Option<String>, audio_url: Option<String>,
    cid: String, display_name: String, action: String, ss_dir: String
) {
    let mut tasks = vec![];
    if let Some(v_url) = video_url {
        let video_path = TEMP_DIR.read().await.join(&extract_filename(&v_url));
        tasks.push(DownloadTask { 
            cid: cid.clone(),
            display_name: display_name.clone(), 
            url: v_url, 
            path: video_path, 
            file_type: "video".to_string() 
        });
    }
    if let Some(a_url) = audio_url {
        let audio_path = TEMP_DIR.read().await.join(&extract_filename(&a_url));
        tasks.push(DownloadTask {
            cid: cid.clone(), 
            display_name: display_name.clone(), 
            url: a_url, 
            path: audio_path, 
            file_type: "audio".to_string() 
        });
    }
    let download_info = VideoInfo {
        cid,
        display_name: display_name.clone(),
        video_path: tasks.get(0).map_or(PathBuf::new(), |task| task.path.clone()),
        audio_path: tasks.get(1).map_or(PathBuf::new(), |task| task.path.clone()),
        output_path: DOWNLOAD_DIR.read().await.join(ss_dir).join(display_name.clone()),
        video_downloaded: false,
        audio_downloaded: false,
        finished: false,
        tasks, action
    };
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
                current_downloads.push_back(video_info.clone());
                let window_clone = window.clone();
                tokio::spawn(async move {
                    process_download(window_clone, video_info).await;
                });
            }
        }
    }
}

async fn process_download(window: tauri::Window, mut download_info: VideoInfo) {
    let action = download_info.action.clone();
    for task in download_info.tasks.into_iter() {
        if download_info.cid != task.cid {
            continue; 
        }
        match download_file(window.clone(), task.clone(), action.clone()).await {
            Ok(o) => {
                if action.clone() == "only" {
                    let _ = window.emit("download-success", o);
                }
            }
            Err(e) => { let _ = window.emit("download-failed", vec![task.display_name.clone(), e]); }
        };
        match task.file_type.as_str() {
            "video" => download_info.video_downloaded = true,
            "audio" => download_info.audio_downloaded = true,
            _ => {}
        }
    }
    let mut current_downloads = CURRENT_DOWNLOADS.lock().await;
    current_downloads.retain(|info| info.cid != download_info.cid);
    DOWNLOAD_COMPLETED_NOTIFY.notify_one();
    if action == "multi"  {
        match merge_video_audio(window.clone(), &download_info.audio_path, &download_info.video_path, &download_info.output_path).await {
            Ok(o) => { let _ = window.emit("download-success", o); }
            Err(e) => { let _ = window.emit("download-failed", vec![download_info.display_name, e]); }
        }
    }
    download_info.finished = true;
}

async fn download_file(window: tauri::Window, task: DownloadTask, action: String) -> Result<String, String> {
    log::info!("Starting download for: {}", &task.display_name);
    let client = init_client();
    let response = match client.get(&task.url).send().await {
        Ok(res) => res,
        Err(e) => return Err(e.to_string()),
    };
    let total_size = response.headers()
        .get(header::CONTENT_LENGTH)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or(0);
    let mut file = match File::create(&task.path).await {
        Ok(f) => f,
        Err(e) => return Err(e.to_string()),
    };
    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;
    let start_time = Instant::now();
    let mut last_log_time = Instant::now();
    let log_interval = Duration::from_millis(250);
    while let Some(chunk_result) = stream.next().await {
        match chunk_result {
            Ok(chunk) => {
                downloaded += chunk.len() as u64;
                let elapsed_time = start_time.elapsed().as_millis();
                let speed = if elapsed_time > 0 {
                    (downloaded as f64 / elapsed_time as f64) * 1000.0 / 1048576.0
                } else { 0.0 };
                let remaining = if speed > 0.0 {
                    (total_size - downloaded) as f64 / (speed * 1048576.0)
                } else { 0.0 };
                if let Err(e) = file.write_all(&chunk).await {
                    log::warn!("{}", e);
                    return Err(e.to_string());
                }
                let progress = downloaded as f64 / total_size as f64 * 100.0;
                let downloaded = downloaded as f64 / 1048576.0;
                let formatted_values = DownloadProgress {
                    cid: task.cid.clone(),
                    remaining: format!("{:.2} s", remaining),
                    downloaded: format!("{:.2} MB", downloaded),
                    speed: format!("{:.2} MB/s", speed),
                    progress: format!("{:.2}%", progress),
                    elapsed_time: format!("{:.2} ms", elapsed_time),
                    display_name: task.display_name.clone(),
                    file_type: task.file_type.clone(),
                    action: action.clone()
                };
                if last_log_time.elapsed() >= log_interval {
                    log::info!("{}", formatted_values.print());
                    last_log_time = Instant::now();
                }
                window.emit("download-progress", formatted_values).unwrap();
            },
            Err(e) => return Err(e.to_string()),
        }
    }
    Ok(task.display_name.to_string())
}

async fn merge_video_audio(window: tauri::Window, audio_path: &PathBuf, video_path: &PathBuf, output: &PathBuf) -> Result<String, String> {
    log::info!("");
    log::info!("Starting merge process for audio");
    let current_dir = env::current_dir().map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    let ffmpeg_path = current_dir.join("ffmpeg").join("ffmpeg.exe");
    let output_path = output.to_string_lossy();
    if let Some(ss_dir_path) = output.parent() {
        if !ss_dir_path.exists() {
            fs::create_dir_all(&ss_dir_path).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
            log::info!("成功创建{}", ss_dir_path.to_string_lossy());
        }
    }
    let output_clone = output_path.clone();
    let video_filename = &output.file_name()
        .and_then(|f| f.to_str())
        .ok_or_else(|| "无法提取视频文件名".to_string())?;

    let progress_path = current_dir.join("ffmpeg")
        .join(format!("{}.log", video_filename));

    // log::info!("{:?} -i {:?} -i {:?} -c:v copy -c:a aac {:?} -progress {:?} -y", ffmpeg_path, video_path, audio_path, &output_path, &progress_path);
    let mut child = Command::new(ffmpeg_path)
        .creation_flags(0x08000000)
        .arg("-i").arg(video_path)
        .arg("-i").arg(audio_path)
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
        sleep(Duration::from_millis(100)).await;
    }
    let mut progress_lines = VecDeque::new();
    let mut last_size: u64 = 0;
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
        messages.push(&output_clone);
        log::info!("{:?}", messages.join(" | "));
        io::stdout().flush().map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
        window_clone.emit("merge-progress", &messages).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
        if progress_lines.iter().any(|l| l.starts_with("progress=end")) {
            break;
        }
        sleep(Duration::from_secs(1)).await;
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
    if status.success() {
        log::info!("");
        log::info!("FFmpeg process completed.");
        window.emit("merge-success", output).unwrap();
        Ok(output_path.to_string())
    } else {
        if let Err(e) = tokio::fs::remove_file(&*output_path.clone()).await {
            return Err(format!("无法删除合并失败视频文件: {}", e));
        }
        window.emit("merge-failed", output).unwrap();
        Err("FFmpeg command failed".to_string())
    }
}

fn parse_cookie_header(cookie_header: &str) -> Result<CookieInfo, &'static str> {
    let re = Regex::new(r"(?i)(?P<name>\w+)=(?P<value>[^;]+)").unwrap();
    let captures = re.captures(cookie_header).ok_or("Invalid cookie header")?;
    let name = captures.name("name").unwrap().as_str();
    let value = captures.name("value").unwrap().as_str();
    let mut path = "";
    let mut domain = "";
    let mut expires = "";
    let mut httponly = false;
    let mut secure = false;
    for part in cookie_header.split(';').skip(1) {
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

fn insert_cookie(cookie_str: &str) -> rusqlite::Result<()> {
    let parsed_cookie = parse_cookie_header(cookie_str).unwrap();
    let conn = Connection::open(&*COOKIE_PATH)?;
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
    )?;
    Ok(())
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
async fn init(window: tauri::Window) -> Result<i64, String> {
    rw_config(window.clone(), "read".to_string(), None).await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    let cookies = load_cookies().unwrap_or_else(|err| { log::warn!("Error loading cookies: {:?}", err);
    HashMap::new() });
    if let Some(mid_cookie) = cookies.values().find(|cookie| cookie.name.eq("DedeUserID")) {
        let mid = mid_cookie.value.trim_start_matches("DedeUserID").trim();
        window.emit("user-mid", mid.to_string()).unwrap();
        return Ok(mid.parse().unwrap());
    } else {
        window.emit("user-mid", 0.to_string()).unwrap();
        return Ok(0);
    }
}

#[tauri::command]
async fn rw_config(window: tauri::Window, action: String, sets: Option<Settings>) -> Result<i64, String> {
    let config_path = CONFIG_PATH.read().await.clone();
    let (temp_dir, down_dir) = if let Some(settings) = sets {
        (settings.temp_dir, settings.down_dir)
    } else {
        let current_temp_dir = TEMP_DIR.read().await.to_string_lossy().into_owned();
        let current_down_dir = DOWNLOAD_DIR.read().await.to_string_lossy().into_owned();
        (current_temp_dir, current_down_dir)
    };
    let new_config = json!({
        "max_conc": 2,
        "default_dms": 0,
        "default_ads": 0,
        "temp_dir": temp_dir,
        "down_dir": down_dir,
    });
    let new_config_str = serde_json::to_string(&new_config).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    if !WORKING_DIR.clone().exists() {
        fs::create_dir_all(WORKING_DIR.clone()).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    }
    if action == "save" {
        fs::write(&config_path, &new_config_str).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    } else if action == "read" && (!config_path.exists() || fs::read_to_string(&config_path).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?.trim().is_empty()) {
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
        "temp_dir": *TEMP_DIR.read().await
    })).unwrap();
    Ok(0)
}

#[tauri::command]
async fn open_select(_window: tauri::Window, display_name: String, cid: String) {
    let download_info_map = DOWNLOAD_INFO_MAP.lock().await;
    if let Some(video_info) = download_info_map.get(&display_name) {
        if video_info.cid == cid {
            let _ = Command::new("C:\\Windows\\explorer.exe")
                .arg(format!("/select,{}", video_info.output_path.to_string_lossy()))
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
                .expect("Failed to open Windows Explorer");
        }
    }
}

#[tauri::command]
async fn exit(window: tauri::Window) -> Result<i64, String> {
    let conn = Connection::open(&*COOKIE_PATH).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    conn.execute("DELETE FROM cookies", []).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    window.emit("exit-success", 0).unwrap();
    let _ = get_buvid(window).await;
    return Ok(0)
}

#[tauri::command]
async fn stop_login() {
    let mut stop = STOP_LOGIN.lock().await;
    *stop = true;
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
        .post("http://127.0.0.1:50808/passport/x/passport-login/web/cookie/refresh")
        .query(&[
            ("csrf", bili_jct.to_string()),
            ("refresh_csrf", refresh_csrf.to_string()),
            ("source", "main-fe-header".to_string()),
            ("refresh_token", refresh_token.to_string())
        ])
        .send().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
        let cookie_headers: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter()
        .flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();

    let response_data: Value = response.json().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    if response_data["code"].as_i64() == Some(0) {
        for cookie in cookie_headers.clone() {
            let _ = insert_cookie(&cookie);
            let parsed_cookie = parse_cookie_header(&cookie).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
            if parsed_cookie.name == "DedeUserID" {
                window.emit("user-mid", parsed_cookie.value.to_string()).unwrap();
            } else if parsed_cookie.name == "bili_jct" {
                if let Some(refresh_token) = response_data["data"]["refresh_token"].as_str() { 
                    let refresh_token = format!(
                        "refresh_token={}; Path=/; Domain=bilibili.com; Expires={}",
                        refresh_token, parsed_cookie.expires
                    );
                    let _ = insert_cookie(&refresh_token);
                }
                let conf_refresh_resp = client
                .post("http://127.0.0.1:50808/passport/x/passport-login/web/confirm/refresh")
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
    loop {
        let stop = STOP_LOGIN.lock().await;
        if *stop {
            let mut lock = STOP_LOGIN.lock().await;
            *lock = false;
            log::warn!("{}: \"登录轮询被前端截断\"", cloned_key);
            return Ok("登录过程被终止".to_string());
        }
        let response = client
            .get(format!(
                "http://127.0.0.1:50808/passport/x/passport-login/web/qrcode/poll?qrcode_key={}",
                qrcode_key
            )).send().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;

        if response.status() != reqwest::StatusCode::OK {
            if response.status().to_string() != "412 Precondition Failed" {
                log::warn!("检查登录状态失败");
                window.emit("login-status", "检查登录状态失败".to_string()).unwrap();
                return Err("检查登录状态失败".to_string());
            }
        }
        let cookie_headers: Vec<String> = response.headers().get_all(header::SET_COOKIE)
            .iter()
            .flat_map(|h| h.to_str().ok())
            .map(|s| s.to_string())
            .collect();

        let response_data: Value = response.json().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
        if response_data["code"].as_i64() == Some(0) {
            match response_data["data"]["code"].as_i64() {
                Some(0) => {
                    for cookie in cookie_headers.clone() {
                        let _ = insert_cookie(&cookie);
                        let parsed_cookie = parse_cookie_header(&cookie).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
                        if parsed_cookie.name == "DedeUserID" {
                            window.emit("user-mid", parsed_cookie.value.to_string()).unwrap();
                        } else if parsed_cookie.name == "bili_jct" {
                            if let Some(refresh_token) = response_data["data"]["refresh_token"].as_str() { 
                                let refresh_token = format!(
                                    "refresh_token={}; Path=/; Domain=bilibili.com; Expires={}",
                                    refresh_token, parsed_cookie.expires
                                );
                                let _ = insert_cookie(&refresh_token);
                            }
                        }
                    }
                    log::info!("{}: \"二维码已扫描\"", cloned_key);
                    return Ok("二维码已扫描".to_string());
                }
                Some(86038) => return Err("二维码已失效".to_string()),
                Some(86101) | Some(86090) => {
                    window.emit("login-status", response_data["data"]["message"].to_string()).unwrap();
                    log::info!("{}: {}", cloned_key, response_data["data"]["message"]);
                }
                _ => {
                    log::warn!("{}, {}", response_data["data"]["code"], response_data["data"]["message"]);
                    return Err(format!("{}, {}", response_data["data"]["code"], response_data["data"]["message"]).to_string())
                },
            }
        } else {
            log::warn!("{}, {}", response_data["code"], response_data["message"]);
            return Err(format!("{}, {}", response_data["code"], response_data["message"]).to_string())
        }
        sleep(Duration::from_secs(1)).await;
    }
}

#[tauri::command]
async fn pwd_login(window: tauri::Window,
    account: String, password: String,
    token: String, challenge: String,
    validate: String, seccode: String
) -> Result<String, String> {
    let client = init_client();
    let response = client
        .post("http://127.0.0.1:50808/passport/x/passport-login/web/login")
        .query(&[
            ("username", account),
            ("password", password),
            ("token", token),
            ("challenge", challenge),
            ("validate", validate),
            ("seccode", seccode),
            ("go_url", "https://www.bilibili.com".to_string()),
            ("source", "main-fe-header".to_string()),
        ])
        .send().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    let cookie_headers: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter()
        .flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();

    let response_data: Value = response.json().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    if response_data["code"].as_i64() == Some(0) {
        for cookie in cookie_headers.clone() {
            let _ = insert_cookie(&cookie);
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
                    let _ = insert_cookie(&refresh_token);
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
        .post("http://127.0.0.1:50808/passport/x/passport-login/web/login/sms")
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
    let cookie_headers: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter()
        .flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();

    let response_data: Value = response.json().await.map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
    if response_data["code"].as_i64() == Some(0) {
        for cookie in cookie_headers.clone() {
            let _ = insert_cookie(&cookie);
            let parsed_cookie = parse_cookie_header(&cookie).map_err(|e| {handle_err(window.clone(), e.to_string()); e.to_string()})?;
            if parsed_cookie.name == "DedeUserID" {
                window.emit("user-mid", parsed_cookie.value.to_string()).unwrap();
            } else if parsed_cookie.name == "bili_jct" {
                if let Some(refresh_token) = response_data["data"]["refresh_token"].as_str() { 
                    let refresh_token = format!(
                        "refresh_token={}; Path=/; Domain=bilibili.com; Expires={}",
                        refresh_token, parsed_cookie.expires
                    );
                    let _ = insert_cookie(&refresh_token);
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
    let _ = logger::init_logger().map_err(|e| e.to_string());
    let api_route = warp::path("api")
    .and(warp::method())
    .and(warp::path::full())
    .and(warp::query::raw().or_else(|_| async { Ok::<_, warp::Rejection>(("".to_string(),)) }))
    .and(warp::body::bytes())
    .map(|method, path, query, body| (method, path, query, body, "https://api.bilibili.com".to_string()))
    .and_then(proxy_request);

    let i0_route = warp::path("i0")
    .and(warp::method())
    .and(warp::path::full())
    .and(warp::query::raw().or_else(|_| async { Ok::<_, warp::Rejection>(("".to_string(),)) }))
    .and(warp::body::bytes())
    .map(|method, path, query, body| (method, path, query, body, "https://i0.hdslb.com".to_string()))
    .and_then(proxy_request);

    let passport_route = warp::path("passport")
    .and(warp::method())
    .and(warp::path::full())
    .and(warp::query::raw().or_else(|_| async { Ok::<_, warp::Rejection>(("".to_string(),)) }))
    .and(warp::body::bytes())
    .map(|method, path, query, body| (method, path, query, body, "https://passport.bilibili.com".to_string()))
    .and_then(proxy_request);

    let www_route = warp::path("www")
    .and(warp::method())
    .and(warp::path::full())
    .and(warp::query::raw().or_else(|_| async { Ok::<_, warp::Rejection>(("".to_string(),)) }))
    .and(warp::body::bytes())
    .map(|method, path, query, body| (method, path, query, body, "https://www.bilibili.com".to_string()))
    .and_then(proxy_request);


    let routes = i0_route.or(api_route.or(passport_route.or(www_route)));
    tokio::spawn(async move {
        warp::serve(routes).run(([127, 0, 0, 1], 50808)).await;
    });
    tauri::Builder::default()
    .setup(|app| {
        let window = app.get_window("main").unwrap();
        tokio::spawn(async move {
            init_database(window.clone()).await;
            let _ = get_buvid(window.clone()).await;
        });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![init,
            scan_login, pwd_login, sms_login, stop_login,
            open_select, rw_config, refresh_cookie,
            push_back_queue, process_queue, exit])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn proxy_request(args: (Method, FullPath, String, Bytes, String)) -> Result<impl Reply, Infallible> {
    let (method, path, raw_query, body, base_url) = args;
    let path_str = path.as_str();
    let trimmed_path = path_str
        .strip_prefix("/api")
        .or_else(|| path_str.strip_prefix("/passport"))
        .or_else(|| path_str.strip_prefix("/i0"))
        .or_else(|| path_str.strip_prefix("/www"))
        .unwrap_or(path_str);
    let full_path = if !raw_query.is_empty() {
        format!("{}?{}", trimmed_path, raw_query)
    } else {
        trimmed_path.to_string()
    };
    let target_url = format!("{}{}", base_url, full_path);
    log::info!("Request: {}", target_url);
    let client = init_client();
    let res = client.request(method, &target_url).body(body).send().await;
    let mut response_builder = Response::builder();
    if let Ok(response) = res {
        for (key, value) in response.headers().iter() {
            response_builder = response_builder.header(key, value);
        }
        response_builder = response_builder.header("Access-Control-Allow-Origin", "*");
        let body_bytes = response.bytes().await.unwrap_or_default();
        Ok(response_builder.body(body_bytes).unwrap())
    } else {
        Ok(response_builder
            .status(warp::http::StatusCode::BAD_GATEWAY)
            .body("Error processing the request".into())
            .unwrap())
    }
}