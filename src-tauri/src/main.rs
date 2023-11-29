// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use lazy_static::lazy_static;
use serde_json::Value;
use reqwest::{Client, header, header::{HeaderMap, HeaderValue}, Url, cookie::{CookieStore, Jar}};
use warp::{Filter, Reply, http::Response, path::FullPath, hyper::Method, hyper::body::Bytes};
use std::{env, fs, path::{Path, PathBuf}, sync::{Arc, RwLock}, convert::Infallible, time::Instant, process::Stdio, collections::{VecDeque, HashSet}};
use tokio::{fs::File, sync::Mutex, io::{AsyncWriteExt, AsyncBufReadExt, AsyncSeekExt, SeekFrom, BufReader}, process::Command, time::{sleep, Duration}};
use futures::stream::StreamExt;
use regex::RegexBuilder;

fn init_headers() -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.insert("User-Agent", HeaderValue::from_static("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"));
    headers.insert("Accept", HeaderValue::from_static("*/*"));
    headers.insert("Accept-Language", HeaderValue::from_static("en-US,en;q=0.5"));
    headers.insert("Range", HeaderValue::from_static("bytes=0-"));
    headers.insert("Connection", HeaderValue::from_static("keep-alive"));
    headers.insert("Referer", HeaderValue::from_static("https://www.bilibili.com"));
    headers
}

lazy_static! {
    static ref GLOBAL_COOKIE_JAR: Arc<RwLock<Jar>> = Arc::new(RwLock::new(Jar::default()));
    static ref STOP_LOGIN: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
    static ref GLOBAL_DOWNLOAD_STATUS: Mutex<DownloadStatus> = Mutex::new(DownloadStatus::new());
}

#[derive(Default)]
struct DownloadStatus {
    audio_downloaded: bool,
    video_downloaded: bool,
    audio_path: Option<String>,
    video_path: Option<String>,
}

impl DownloadStatus {
    fn new() -> Self {
        DownloadStatus {
            audio_downloaded: false,
            video_downloaded: false,
            audio_path: None,
            video_path: None,
        }
    }
    fn is_ready_for_merge(&self) -> bool {
        self.audio_downloaded
            && self.video_downloaded
            && self.audio_path.as_ref().map_or(false, |p| Path::new(p).exists())
            && self.video_path.as_ref().map_or(false, |p| Path::new(p).exists())
    }
    fn set_audio_downloaded(&mut self, path: String) {
        self.audio_downloaded = true;
        self.audio_path = Some(path);
    }
    fn set_video_downloaded(&mut self, path: String) {
        self.video_downloaded = true;
        self.video_path = Some(path);
    }
}

struct ThreadSafeCookieStore(Arc<RwLock<Jar>>);

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

fn init_client() -> Client {
    Client::builder()
        .default_headers(init_headers())
        .cookie_provider(Arc::new(ThreadSafeCookieStore(Arc::clone(&GLOBAL_COOKIE_JAR))))
        .build()
        .unwrap()
}

async fn update_cookies(sessdata: &str) -> Result<String, String> {
    let appdata_path = match env::var("APPDATA") {
        Ok(path) => path,
        Err(_) => {
            eprintln!("无法获取APPDATA路径");
            return Err("无法获取APPDATA路径".to_string());
        }
    };
    let working_dir = PathBuf::from(appdata_path).join("BiliDown");
    let sessdata_path = working_dir.join("Store");
    if let Some(dir_path) = sessdata_path.parent() {
        if let Err(_) = fs::create_dir_all(dir_path) {
            eprintln!("无法创建目录");
            return Err("无法创建目录".to_string());
        }
    }
    if let Err(_) = fs::write(&sessdata_path, sessdata) {
        eprintln!("无法写入SESSDATA文件");
        return Err("无法写入SESSDATA文件".to_string());
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
async fn init_sessdata(window: tauri::Window) -> Result<i64, String> {
    let appdata_path = env::var("APPDATA").map_err(|e| e.to_string())?;
    let working_dir = PathBuf::from(appdata_path).join("BiliDown");
    let sessdata_path = working_dir.join("Store");
    if !sessdata_path.exists() {
        if let Some(dir_path) = sessdata_path.parent() {
            fs::create_dir_all(dir_path).map_err(|e| e.to_string())?;
            println!("成功创建BiliDown");
        }
        fs::write(&sessdata_path, "").map_err(|e| e.to_string())?;
        println!("成功创建Store");
        window.emit("user-mid", vec![0.to_string(), "init".to_string()]).unwrap();
        return Ok(0);
    }
    let sessdata = fs::read_to_string(&sessdata_path).map_err(|e| e.to_string())?;
    if sessdata.trim().is_empty() {
        window.emit("user-mid", vec![0.to_string(), "init".to_string()]).unwrap();
        return Ok(0);
    }
    update_cookies(&sessdata).await.map_err(|e| e.to_string())?;
    let mid = init_mid().await.map_err(|e| e.to_string())?;
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
            eprint!("找不到Mid");
            return Err("找不到Mid".to_string());
        }    
    } else {
        eprintln!("请求失败");
        return Err("请求失败".into());
    }    
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
        let stop = {
            let lock = STOP_LOGIN.lock().await;
            *lock
        };
        if stop {
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

async fn merge_video_audio(window: tauri::Window, audio_path: &String, video_path: &String, output_path: &PathBuf) -> Result<(), String> {
    println!("Starting merge process for audio");
    let current_dir = env::current_dir().map_err(|e| e.to_string())?;
    let ffmpeg_path = current_dir.join("ffmpeg").join("ffmpeg.exe");
    let video_filename = Path::new(output_path)
    .file_name()
    .and_then(|f| f.to_str())
    .ok_or_else(|| "无法提取视频文件名".to_string())?;
    let progress_path = current_dir.join("ffmpeg")
    .join(format!("{}.progress", video_filename));
    let output_path_str = output_path.to_string_lossy().to_string();
    let output_path_str_clone = output_path_str.clone();
    let _ = window.emit("merge-start", output_path_str.clone());
    println!("{:?} -i {:?} -i {:?} -c:v copy -c:a aac {:?} -progress {:?} -y", ffmpeg_path, video_path, audio_path, &output_path, &progress_path);
    let mut child = Command::new(ffmpeg_path)
        .arg("-i")
        .arg(video_path)
        .arg("-i")
        .arg(audio_path)
        .arg("-c:v")
        .arg("copy")
        .arg("-c:a")
        .arg("aac")
        .arg(&output_path)
        .arg("-progress")
        .arg(&progress_path)
        .arg("-y")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let audio_path_clone = audio_path.clone();
    let video_path_clone = video_path.clone();
    let window_clone = window.clone();
    let progress_path_clone = &progress_path.clone();
    let progress_handle = tokio::spawn(async move {
        while !progress_path.exists() {
            sleep(Duration::from_millis(100)).await;
        }
        let mut progress_lines = VecDeque::new();
        let mut last_size: u64 = 0;
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
            messages.push(&output_path_str_clone);
            println!("{:?}", messages);
            let _ = window_clone.emit("merge-progress", &messages).map_err(|e| e.to_string());
            if progress_lines.iter().any(|l| l.starts_with("progress=end")) {
                println!("FFmpeg process completed.");
                break;
            }
            sleep(Duration::from_secs(1)).await;
        }
    });    
    let status = child.wait().await.map_err(|e| e.to_string())?;
    let _ = progress_handle.await.map_err(|e| e.to_string())?;
    if status.success() {
        if let Err(e) = tokio::fs::remove_file(audio_path_clone.clone()).await {
            eprintln!("无法删除原始音频文件: {}", e);
        }
        if let Err(e) = tokio::fs::remove_file(video_path_clone.clone()).await {
            eprintln!("无法删除原始视频文件: {}", e);
        }
        if let Err(e) = tokio::fs::remove_file(progress_path_clone).await {
            eprintln!("无法删除进度文件: {}", e);
        }
        let _ = window.emit("merge-success", output_path_str);
        Ok(())
    } else {
        let _ = window.emit("merge-failed", output_path_str);
        Err("FFmpeg command failed".to_string())
    }
}

#[tauri::command]
async fn download_file(
    window: tauri::Window, 
    url: String, filename_param: String, 
    cid: String, action: String, 
    file_type: String
) -> Result<(), String> {
    let mut status = GLOBAL_DOWNLOAD_STATUS.lock().await;
    if file_type == "audio" {
        status.audio_downloaded = false;
    } else if file_type == "video" {
        status.video_downloaded = false;
    }
    let client = init_client();
    let response = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let total_size = response
        .headers().get(header::CONTENT_LENGTH)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or(0);
    // let filename = if action == "multi" {
    //     Url::parse(&url)
    //         .ok()
    //         .and_then(|parsed_url| {
    //             parsed_url.path_segments()
    //                 .and_then(|segments| segments.last())
    //                 .map(|last_segment| last_segment.to_string())
    //         })
    //         .unwrap_or_else(|| filename_param.clone())
    // } else {
    //     filename_param.clone()
    // };
    let filename = filename_param.clone();
    let filename_clone = filename.clone();
    let filedir = PathBuf::from(env::var("USERPROFILE").map_err(|e| e.to_string())?)
        .join("Desktop")
        .join(filename);
    let mut file = File::create(&filedir).await.map_err(|e| e.to_string())?;
    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;
    let start_time = Instant::now();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;
        let elapsed_time = start_time.elapsed().as_millis();
        let speed = if elapsed_time > 0 {
            (downloaded as f64 / elapsed_time as f64) * 1000.0 / 1048576.0
        } else { 0.0 };
        let remaining_time = if speed > 0.0 {
            (total_size - downloaded) as f64 / (speed * 1048576.0)
        } else { 0.0 };
        file.write_all(&chunk).await.map_err(|e| e.to_string())?;
        let progress = downloaded as f64 / total_size as f64 * 100.0;
        let downloaded_mb = downloaded as f64 / 1048576.0;
        let formatted_values = vec![
            format!("{}", cid),
            format!("{:.2}%", progress),
            format!("{:.2} s", remaining_time),
            format!("{:.2} MB", downloaded_mb),
            format!("{:.2} MB/s", speed),
            format!("{:.2} ms", elapsed_time),
            format!("{}", filename_clone),
        ];
        println!("{:?}", formatted_values);
        window.emit("download-progress", formatted_values).map_err(|e| e.to_string())?;
    }
    if file_type == "audio" {
        status.set_audio_downloaded(filedir.to_string_lossy().into_owned());
    } else if file_type == "video" {
        status.set_video_downloaded(filedir.to_string_lossy().into_owned());
    }
    if action == "multi" && status.is_ready_for_merge() {
        let audio_path_clone = status.audio_path.clone().ok_or_else(|| "找不到音频路径".to_string())?;
        let video_path_clone = status.video_path.clone().ok_or_else(|| "找不到视频路径".to_string())?;
        let window_clone = window.clone();
        tokio::spawn(async move {
            let re_raw = RegexBuilder::new(r"([0-9]+(?:P\+?|K))")
                .case_insensitive(true)
                .build()
                .unwrap();
            let video_quality = re_raw.captures(&video_path_clone)
                .and_then(|caps| caps.get(1))
                .map_or("", |m| m.as_str());
            let audio_quality = re_raw.captures(&audio_path_clone)
                .and_then(|caps| caps.get(1))
                .map_or("", |m| m.as_str());
            let output_filename = video_path_clone.replace(video_quality, &format!("{}_{}", video_quality, audio_quality));
            let output_path = PathBuf::from(env::var("USERPROFILE").unwrap())
                .join("Desktop")
                .join(output_filename);
        
            match merge_video_audio(window_clone, &audio_path_clone, &video_path_clone, &output_path).await {
                Ok(_) => println!("Merge operation completed successfully."),
                Err(e) => eprintln!("Error during merge operation: {}", e),
            }
        });
    } else if action == "only" {
        window.emit("download-complete", vec![format!("{}", cid), filename_clone]).map_err(|e| e.to_string())?;
    } else {
        println!("Not ready for merge. Audio or video is still downloading.");
    }
    Ok(())
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

    let passport_route = warp::path("passport")
        .and(warp::method())
        .and(warp::path::full())
        .and(warp::query::raw().or_else(|_| async { Ok::<_, warp::Rejection>(("".to_string(),)) }))
        .and(warp::body::bytes())
        .map(|method, path, query, body| (method, path, query, body, "https://passport.bilibili.com".to_string()))
        .and_then(proxy_request);
    
    let routes = api_route.or(passport_route);
    tokio::task::spawn(async move {
        warp::serve(routes).run(([127, 0, 0, 1], 50808)).await;
    });
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![init_sessdata, login, stop_login, download_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn proxy_request(args: (Method, FullPath, String, Bytes, String)) -> Result<impl Reply, Infallible> {
    let (method, path, raw_query, body, base_url) = args;
    let path_str = path.as_str();
    let trimmed_path = path_str
        .strip_prefix("/api")
        .or_else(|| path_str.strip_prefix("/passport"))
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

        let body = response.text().await.unwrap_or_default();
        Ok(response_builder.body(body).unwrap())
    } else {
        Ok(response_builder
            .status(warp::http::StatusCode::BAD_GATEWAY)
            .body("Error processing the request".into())
            .unwrap())
    }
}