// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use lazy_static::lazy_static;
use serde_json::Value;
use reqwest::{Client, header, header::{HeaderMap, HeaderValue}, Url, cookie::{CookieStore, Jar}};
use warp::{Filter, Reply, http::Response, path::FullPath, hyper::Method, hyper::body::Bytes};
use std::{env, fs, path::PathBuf, sync::{Arc, RwLock, Mutex}, convert::Infallible, time::Instant};
use tokio::{fs::File, io::AsyncWriteExt};
use futures::StreamExt;

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
    println!("SESSDATA写入成功: {}", sessdata_path.display());
    let url = Url::parse("https://www.bilibili.com").unwrap();
    let cookie_str = format!("{}; Domain=.bilibili.com; Path=/", sessdata);
    let jar = GLOBAL_COOKIE_JAR.write().unwrap();
    jar.add_cookie_str(&cookie_str, &url);
    println!("cookie_str: {}", cookie_str);
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
            println!("已创建目录: {:?}", dir_path);
        }
        fs::write(&sessdata_path, "").map_err(|e| e.to_string())?;
        println!("已创建文件: {:?}", sessdata_path);
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
fn stop_login() {
    let mut stop = STOP_LOGIN.lock().unwrap();
    *stop = true;
}

#[tauri::command]
async fn login(window: tauri::Window, qrcode_key: String) -> Result<String, String> {
    let client = init_client();
    loop {
        let stop = {
            let lock = STOP_LOGIN.lock().unwrap();
            *lock
        };
        if stop {
            *STOP_LOGIN.lock().unwrap() = false;
            eprintln!("{}: \"登录轮询被前端截断\"", qrcode_key);
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
                            println!("{}: \"二维码已扫描\"", qrcode_key);
                            return Ok("二维码已扫描".to_string());
                        } else {
                            eprintln!("Cookie响应头为空");
                            return Err("Cookie响应头为空".to_string());
                        }
                    }
                    Some(86038) => return Err("二维码已失效".to_string()),
                    Some(86101) | Some(86090) => {
                        window.emit("login-status", response_data["data"]["message"].to_string()).map_err(|e| e.to_string())?;
                        println!("{}: {}", qrcode_key, response_data["data"]["message"]);
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
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    }
}

#[tauri::command]
async fn download_file(window: tauri::Window, url: String, filename: String, cid: String) -> Result<String, String> {
    let client = init_client();
    let response = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let headers = response.headers().clone();
    println!("{:?}", headers);
    let total_size = response
        .headers().get(header::CONTENT_LENGTH)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or(0);
    // let filename = 
    //     Url::parse(&url)
    //         .ok()
    //         .and_then(|parsed_url| {
    //             parsed_url.path_segments()
    //                 .and_then(|segments| segments.last())
    //                 .map(|last_segment| last_segment.to_string())
    //         })
    //         .unwrap_or_else(|| format!("{}.m4s", filename).to_string());
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
    window.emit("download-complete", vec![format!("{}", cid), filename_clone]).map_err(|e| e.to_string())?;
    Ok(cid)
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