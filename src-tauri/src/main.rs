// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use lazy_static::lazy_static;
use serde_json::Value;
use reqwest::{Client, header, header::{HeaderMap, HeaderValue}, Url, cookie::{CookieStore, Jar}};
use warp::{Filter, Reply, http::Response, path::FullPath, hyper::Method, hyper::body::Bytes};
use std::{env, fs, path::{Path, PathBuf}, sync::Arc, convert::Infallible, time::Instant, process::Command,
process::Stdio, collections::{VecDeque, HashSet, HashMap}, io::{self, Write}, os::windows::process::CommandExt};
use tokio::{fs::File, sync::{Mutex, RwLock, Notify}, io::{AsyncWriteExt, AsyncBufReadExt, AsyncSeekExt, SeekFrom, BufReader}, time::{sleep, Duration}};
use futures::stream::StreamExt;

lazy_static! {
    static ref GLOBAL_COOKIE_JAR: Arc<std::sync::RwLock<Jar>> = Arc::new(std::sync::RwLock::new(Jar::default()));
    static ref STOP_LOGIN: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
    static ref DOWNLOAD_INFO_MAP: Mutex<HashMap<String, VideoInfo>> = Mutex::new(HashMap::new());
    static ref WORKING_DIR: PathBuf = {
        PathBuf::from(env::var("APPDATA").expect("APPDATA environment variable not found"))
        .join("com.btjawa.biliget")
    };
    static ref DOWNLOAD_DIR: PathBuf = {
        PathBuf::from(env::var("USERPROFILE").expect("USERPROFILE environment variable not found"))
        .join("Desktop")
    };
    static ref TEMP_DIR: PathBuf = WORKING_DIR.join("Temp");
    static ref SESSDATA_PATH: PathBuf = WORKING_DIR.join("Cookies");
    static ref MAX_CONCURRENT_DOWNLOADS: Arc<RwLock<usize>> = Arc::new(RwLock::new(2));
    static ref WAITING_QUEUE: Mutex<VecDeque<VideoInfo>> = Mutex::new(VecDeque::new());
    static ref CURRENT_DOWNLOADS: Mutex<VecDeque<VideoInfo>> = Mutex::new(VecDeque::new());
    static ref DOWNLOAD_COMPLETED_NOTIFY: Notify = Notify::new();
}

fn init_headers() -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.insert("User-Agent", HeaderValue::from_static("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"));
    headers.insert("Accept", HeaderValue::from_static("*/*"));
    headers.insert("Accept-Language", HeaderValue::from_static("en-US,en;q=0.5"));
    headers.insert("Connection", HeaderValue::from_static("keep-alive"));
    headers.insert("Referer", HeaderValue::from_static("https://www.bilibili.com"));
    headers
}

fn init_client() -> Client {
    Client::builder()
        .default_headers(init_headers())
        .cookie_provider(Arc::new(ThreadSafeCookieStore(Arc::clone(&GLOBAL_COOKIE_JAR))))
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

struct ThreadSafeCookieStore(Arc<std::sync::RwLock<Jar>>);

#[derive(Debug, Clone)]
struct VideoInfo {
    cid: String,
    display_name: String,
    video_path: PathBuf,
    audio_path: PathBuf,
    video_downloaded: bool,
    audio_downloaded: bool,
    finished: bool,
    tasks: Vec<DownloadTask>,
    action: String,
    ss_dir: String
}

#[derive(Debug, Clone)]
struct DownloadTask {
    cid: String,
    display_name: String,
    url: String,
    path: PathBuf,
    file_type: String,
}

impl CookieStore for ThreadSafeCookieStore {
    fn set_cookies(&self, cookie_headers: &mut dyn Iterator<Item = &HeaderValue>, url: &Url) {
        let jar = self.0.write().unwrap();
        jar.set_cookies(cookie_headers, url);
    }
    fn cookies(&self, url: &Url) -> Option<HeaderValue> {
        let jar = self.0.read().unwrap();
        jar.cookies(url)
    }
}

#[tauri::command]
async fn push_back_queue(
    video_url: Option<String>, audio_url: Option<String>,
    cid: String, display_name: String, action: String, ss_dir: String
) {
    let mut tasks = vec![];
    if let Some(v_url) = video_url {
        let video_path = TEMP_DIR.join(&extract_filename(&v_url));
        tasks.push(DownloadTask { 
            cid: cid.clone(), 
            display_name: display_name.clone(), 
            url: v_url, 
            path: video_path, 
            file_type: "video".to_string() 
        });
    }
    if let Some(a_url) = audio_url {
        let audio_path = TEMP_DIR.join(&extract_filename(&a_url));
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
        video_downloaded: false,
        audio_downloaded: false,
        finished: false,
        tasks, action, ss_dir
    };
    DOWNLOAD_INFO_MAP.lock().await.insert(display_name, download_info.clone());
    WAITING_QUEUE.lock().await.push_back(download_info.clone());
}

#[tauri::command]
async fn process_queue(window: tauri::Window, initial: bool) {
    let mut init = initial;
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
        match merge_video_audio(window.clone(), &download_info.audio_path, &download_info.video_path, &download_info.display_name, &download_info.ss_dir).await {
            Ok(o) => { let _ = window.emit("download-success", o); }
            Err(e) => { let _ = window.emit("download-failed", vec![download_info.display_name, e]); }
        }
    }
    download_info.finished = true;
}

async fn download_file(window: tauri::Window, task: DownloadTask, action: String) -> Result<String, String> {
    println!("\nStarting download for: {}", &task.display_name);
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
    println!();
    while let Some(chunk_result) = stream.next().await {
        match chunk_result {
            Ok(chunk) => {
                downloaded += chunk.len() as u64;
                let elapsed_time = start_time.elapsed().as_millis();
                let speed = if elapsed_time > 0 {
                    (downloaded as f64 / elapsed_time as f64) * 1000.0 / 1048576.0
                } else { 0.0 };
                let remaining_time = if speed > 0.0 {
                    (total_size - downloaded) as f64 / (speed * 1048576.0)
                } else { 0.0 };
                if let Err(e) = file.write_all(&chunk).await {
                    eprintln!("{}", e);
                    return Err(e.to_string());
                }
                let progress = downloaded as f64 / total_size as f64 * 100.0;
                let downloaded_mb = downloaded as f64 / 1048576.0;
                let formatted_values = vec![
                    format!("{}", task.cid),
                    format!("{:.2}%", progress),
                    format!("{:.2} s", remaining_time),
                    format!("{:.2} MB", downloaded_mb),
                    format!("{:.2} MB/s", speed),
                    format!("{:.2} ms", elapsed_time),
                    format!("{}", task.display_name),
                    format!("{}", task.file_type),
                    format!("{}", action)
                    ];
                    print!("\r{:?}", formatted_values.join("  "));
                io::stdout().flush().unwrap();
                window.emit("download-progress", formatted_values).map_err(|e| e.to_string())?;
            },
            Err(e) => return Err(e.to_string()),
        }
    }
    Ok(task.display_name.to_string())
}

async fn merge_video_audio(window: tauri::Window, audio_path: &PathBuf, video_path: &PathBuf, output: &String, ss_dir: &String) -> Result<String, String> {
    println!("\nStarting merge process for audio");
    let current_dir = env::current_dir().map_err(|e| e.to_string())?;
    let ffmpeg_path = current_dir.join("ffmpeg").join("ffmpeg.exe");
    let ss_dir_path = DOWNLOAD_DIR.join(&ss_dir);
    let output_path = ss_dir_path.join(&output);
    if !&ss_dir_path.exists() {
        fs::create_dir_all(&ss_dir_path).map_err(|e| e.to_string())?;
        println!("成功创建{}", ss_dir);
    }
    let output_clone = output.clone();
    let video_filename = Path::new(&output_path)
        .file_name()
        .and_then(|f| f.to_str())
        .ok_or_else(|| "无法提取视频文件名".to_string())?;

    let progress_path = current_dir.join("ffmpeg")
        .join(format!("{}.progress", video_filename));

    // println!("{:?} -i {:?} -i {:?} -c:v copy -c:a aac {:?} -progress {:?} -y", ffmpeg_path, video_path, audio_path, &output_path, &progress_path);
    let mut child = Command::new(ffmpeg_path)
        .creation_flags(0x08000000)
        .arg("-i").arg(video_path)
        .arg("-i").arg(audio_path)
        .arg("-c:v").arg("copy")
        .arg("-c:a").arg("aac")
        .arg(&output_path).arg("-progress")
        .arg(&progress_path).arg("-y")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let audio_path_clone = audio_path.clone();
    let video_path_clone = video_path.clone();
    let window_clone = window.clone();
    let progress_path_clone = &progress_path.clone();
    while !progress_path.exists() {
        sleep(Duration::from_millis(100)).await;
    }
    let mut progress_lines = VecDeque::new();
    let mut last_size: u64 = 0;
    println!();
    loop {
        let mut printed_keys = HashSet::new();
        let metadata = tokio::fs::metadata(&progress_path).await.unwrap();
        if metadata.len() > last_size {
            let mut file = File::open(&progress_path).await.unwrap();
            file.seek(SeekFrom::Start(last_size)).await.unwrap();
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
        print!("\r{:?}", messages.join(" "));
        io::stdout().flush().unwrap();
        window_clone.emit("merge-progress", &messages).map_err(|e| e.to_string())?;
        if progress_lines.iter().any(|l| l.starts_with("progress=end")) {
            break;
        }
        sleep(Duration::from_secs(1)).await;
    }
    let status = child.wait().unwrap();
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
        println!("\nFFmpeg process completed.");
        window.emit("merge-success", output).map_err(|e| e.to_string())?;
        Ok(output.to_string())
    } else {
        if let Err(e) = tokio::fs::remove_file(output_path.clone()).await {
            return Err(format!("无法删除合并失败视频文件: {}", e));
        }
        window.emit("merge-failed", output).map_err(|e| e.to_string())?;
        Err("FFmpeg command failed".to_string())
    }
}

async fn update_cookies(sessdata: &str) -> Result<String, String> {
    if let Some(dir_path) = SESSDATA_PATH.parent() {
        if let Err(e) = fs::create_dir_all(dir_path) {
            return Err(format!("无法创建目录：{}", e));
        }
    }
    if let Err(e) = fs::write(&*SESSDATA_PATH, sessdata) {
        return Err(format!("无法写入Cookie：{}", e));
    }
    println!("SESSDATA写入成功");
    let url = Url::parse("https://www.bilibili.com").unwrap();
    let cookie_str = format!("{}; Domain=.bilibili.com; Path=/", sessdata);
    let jar = GLOBAL_COOKIE_JAR.write().unwrap();
    jar.add_cookie_str(&cookie_str, &url);
    return Ok("Updated Cookies".to_string());
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
async fn init(window: tauri::Window) -> Result<i64, String> {
    if !&WORKING_DIR.exists() {
        fs::create_dir_all(&*WORKING_DIR).map_err(|e| e.to_string())?;
        println!("成功创建com.btjawa.biliget");
    }
    if !&TEMP_DIR.exists() {
        fs::create_dir_all(&*TEMP_DIR).map_err(|e| e.to_string())?;
        println!("成功创建TEMP_DIR");
    }
    if !SESSDATA_PATH.exists() {
        fs::write(&*SESSDATA_PATH, "").map_err(|e| e.to_string())?;
        println!("成功创建Cookies");
        window.emit("user-mid", vec![0.to_string(), "init".to_string()]).unwrap();
        return Ok(0);
    }
    let sessdata = fs::read_to_string(&*SESSDATA_PATH).map_err(|e| e.to_string())?;
    if sessdata.trim().is_empty() {
        window.emit("user-mid", vec![0.to_string(), "init".to_string()]).unwrap();
        return Ok(0);
    }
    update_cookies(&sessdata).await.map_err(|e| e.to_string())?;
    let mid = match init_mid().await {
        Ok(mid) => mid,
        Err(_) => 0
    };
    window.emit("user-mid", vec![mid.to_string(), "init".to_string()]).unwrap();
    return Ok(mid);
}

async fn init_mid() -> Result<i64, String> {
    let client = init_client();
    let mid_response = client
        .get("https://api.bilibili.com/x/member/web/account")
        .send()
        .await
        .map_err(|e| e.to_string())?;    
    if mid_response.status().is_success() {
        let json: serde_json::Value = mid_response.json().await.map_err(|e| e.to_string())?;
        if let Some(mid) = json["data"]["mid"].as_i64() {
            return Ok(mid);
        } else {
            return Err("找不到Mid".to_string());
        }    
    } else {
        return Err("请求失败".to_string());
    }    
}   

#[tauri::command]
async fn exit(window: tauri::Window) -> Result<i64, String> {
    {
        let mut cookie_jar = GLOBAL_COOKIE_JAR.write().unwrap();
        *cookie_jar = Jar::default();
    }
    if let Err(e) = fs::remove_file(&*SESSDATA_PATH) {
        return Err(format!("Failed to delete store directory: {}", e));
    }
    window.emit("exit-success", 0).unwrap();
    return Ok(0)
}

#[tauri::command]
async fn stop_login() {
    let mut stop = STOP_LOGIN.lock().await;
    *stop = true;
}

#[tauri::command]
async fn login(window: tauri::Window, qrcode_key: String) -> Result<String, String> {
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
            eprintln!("{}: \"登录轮询被前端截断\"", cloned_key);
            return Ok("登录过程被终止".to_string());
        }
        let response = client
            .get(format!(
                "https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key={}",
                qrcode_key
            )).send().await.map_err(|e| e.to_string())?;

        if response.status() != reqwest::StatusCode::OK {
            if response.status().to_string() != "412 Precondition Failed" {
                eprintln!("检查登录状态失败");
                window.emit("login-status", "检查登录状态失败".to_string()).map_err(|e| e.to_string())?;
                return Err("检查登录状态失败".to_string());
            }
        }
        let cookie_header = response.headers().clone().get(header::SET_COOKIE)
            .and_then(|h| h.to_str().ok())
            .map(|s| s.to_string());

        let response_data: Value = response.json().await.map_err(|e| {
            eprintln!("解析响应JSON失败: {}", e);
            "解析响应JSON失败".to_string()}
        )?;
        match response_data["code"].as_i64() {
            Some(-412) => {
                eprintln!("{}", response_data["message"]);
                window.emit("login-status", response_data["message"].to_string()).map_err(|e| e.to_string())?;
                return Err(response_data["message"].to_string());
            }
            Some(0) => {
                match response_data["data"]["code"].as_i64() {
                    Some(0) => {
                        if let Some(cookie) = cookie_header {
                            let sessdata = cookie.split(';').find(|part| part.trim_start().starts_with("SESSDATA"))
                            .ok_or_else(|| {
                            eprintln!("找不到SESSDATA");
                            "找不到SESSDATA".to_string()
                            })?;
                            update_cookies(sessdata).await.map_err(|e| e.to_string())?;
                            let mid = init_mid().await.map_err(|e| e.to_string())?;
                            window.emit("user-mid", [mid.to_string(), "login".to_string()]).map_err(|e| e.to_string())?;
                            println!("{}: \"二维码已扫描\"", cloned_key);
                            return Ok("二维码已扫描".to_string());
                        } else {
                            eprintln!("Cookie响应头为空");
                            return Err("Cookie响应头为空".to_string());
                        }
                    }
                    Some(86038) => return Err("二维码已失效".to_string()),
                    Some(86101) | Some(86090) => {
                        window.emit("login-status", response_data["data"]["message"].to_string()).map_err(|e| e.to_string())?;
                        println!("{}: {}", cloned_key, response_data["data"]["message"]);
                    }
                    _ => {
                        eprintln!("未知的响应代码");
                        return Err("未知的响应代码".to_string())
                    },
                }
            }
            _ => {
                eprintln!("未知的响应代码");
                return Err("未知的响应代码".to_string())
            }
        }
        sleep(Duration::from_secs(1)).await;
    }
}

#[tokio::main]
async fn main() {
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
    
    let routes = i0_route.or(api_route.or(passport_route));
    tokio::task::spawn(async move {
        warp::serve(routes).run(([127, 0, 0, 1], 50808)).await;
    });
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![init, login, stop_login, push_back_queue, process_queue, exit])
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
        .unwrap_or(path_str);
    let full_path = if !raw_query.is_empty() {
        format!("{}?{}", trimmed_path, raw_query)
    } else {
        trimmed_path.to_string()
    };
    let target_url = format!("{}{}", base_url, full_path);
    println!("Request: {}", target_url);
    let client = init_client();
    let res = client.request(method, &target_url).body(body).send().await;
    let mut response_builder = Response::builder();
    if let Ok(response) = res {
        for (key, value) in response.headers().iter() {
            response_builder = response_builder.header(key, value);
        }
        response_builder = response_builder.header("Access-Control-Allow-Origin", "*");
        let content_type = response.headers().get(warp::http::header::CONTENT_TYPE);
        let body = if let Some(content_type) = content_type {
            if content_type.to_str().unwrap_or_default().starts_with("text/") {
                response.text().await.unwrap_or_default().into()
            } else {
                response.bytes().await.unwrap_or_default()
            }
        } else {
            response.bytes().await.unwrap_or_default()
        };
        Ok(response_builder.body(body).unwrap())
    } else {
        Ok(response_builder
            .status(warp::http::StatusCode::BAD_GATEWAY)
            .body("Error processing the request".into())
            .unwrap())
    }
}