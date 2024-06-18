use std::sync::{atomic::{AtomicBool, Ordering}, Arc};

use serde_json::Value;
use lazy_static::lazy_static;
use tauri::{http::header, WebviewWindow, Manager};
use tauri_plugin_http::reqwest;
use tokio::time::{sleep, Duration};

use crate::{cookies, get_window, handle_err, init_client, init_headers};

lazy_static! {
    static ref LOGIN_POLLING: Arc<AtomicBool> = Arc::new(AtomicBool::new(false));
}

pub fn init() {
    get_window().listen("stop_login", |_| { LOGIN_POLLING.store(false, Ordering::SeqCst) });
}

pub async fn get_buvid() -> Result<(), String> {
    let client = init_client().await.map_err(|e| handle_err(e))?;
    let buvid_resp = client
        .get("https://api.bilibili.com/x/frontend/finger/spi")
        .send().await.map_err(|e| handle_err(e))?;
    let buvid_resp_data: Value = buvid_resp.json().await.map_err(|e| handle_err(e))?;
    if buvid_resp_data["code"].as_i64() != Some(0) {
        log::error!("{}, {}", buvid_resp_data["code"], buvid_resp_data["message"]);
        return Err(format!("{}, {}", buvid_resp_data["code"], buvid_resp_data["message"]).into())
    }
    if let Some(buvid3) = buvid_resp_data["data"]["b_3"].as_str() { 
        cookies::insert(&format!("buvid3={}", buvid3)).await.map_err(|e| handle_err(e))?;
    }
    if let Some(buvid4) = buvid_resp_data["data"]["b_4"].as_str() { 
        cookies::insert(&format!("buvid4={}", buvid4)).await.map_err(|e| handle_err(e))?;
    }
    get_window().emit("headers", init_headers().await.map_err(|e| handle_err(e))?).unwrap();
    Ok(())
}

#[tauri::command]
pub async fn exit() -> Result<(), String> {
    let client = init_client().await.map_err(|e| handle_err(e))?;
    let cookies = cookies::load().await.map_err(|e| handle_err(e))?;
    let bili_csrf = cookies.get("bili_jct")
        .and_then(|attr| attr.get("value"))
        .and_then(Value::as_str).unwrap_or("");
    
    let response = client
        .post("https://passport.bilibili.com/login/exit/v2")
        .query(&[("biliCSRF", bili_csrf)])
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
    if response_data["code"].as_i64() != Some(0) {
        log::error!("{}, {}", response_data["code"], response_data["message"]);
        return Err(format!("{}, {}", response_data["code"], response_data["message"]).into());
    }
    for cookie in cookie_headers.clone() {
        cookies::delete(&cookie).await.map_err(|e| handle_err(e))?;
    }
    get_buvid().await.map_err(|e| handle_err(e))?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn refresh_cookie(refresh_csrf: &str) -> Result<String, String> {
    let client = init_client().await.map_err(|e| handle_err(e))?;
    let cookies = cookies::load().await.map_err(|e| handle_err(e))?;
    let bili_jct = cookies.get("bili_jct")
        .and_then(|attr| attr.get("value"))
        .and_then(Value::as_str).unwrap_or("");

    let refresh_token = cookies.get("refresh_token")
        .and_then(|attr| attr.get("value"))
        .and_then(Value::as_str).unwrap_or("");

    let response = client
        .post("https://passport.bilibili.com/x/passport-login/web/cookie/refresh")
        .query(&[
            ("csrf", bili_jct),
            ("refresh_csrf", refresh_csrf),
            ("refresh_token", refresh_token),
            ("source", "main-fe-header".into())
        ]).send().await.map_err(|e| handle_err(e))?;

    if response.status() != reqwest::StatusCode::OK {
        handle_err(response.status().to_string());
        return Err(response.status().to_string());
    }
    let cookie_headers: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();
    let response_data: Value = response.json().await.map_err(|e| handle_err(e))?;
    if response_data["code"].as_i64() != Some(0) {
        log::error!("{}, {}", response_data["code"], response_data["message"]);
        return Err(format!("{}, {}", response_data["code"], response_data["message"]).to_string());
    }
    for cookie in cookie_headers {
        cookies::insert(&cookie).await.map_err(|e| handle_err(e))?;
    }
    if let Some(refresh_token) = response_data["data"]["refresh_token"].as_str() { 
        let refresh_token = format!("refresh_token={};", refresh_token);
        cookies::insert(&refresh_token).await.map_err(|e| handle_err(e))?;
        let refresh_resp = client
            .post("https://passport.bilibili.com/x/passport-login/web/confirm/refresh")
            .query(&[
                ("csrf", refresh_csrf),
                ("refresh_token", &refresh_token)
            ]).send().await.map_err(|e| handle_err(e))?;

        if refresh_resp.status() != reqwest::StatusCode::OK {
            handle_err(refresh_resp.status().to_string());
            return Err(refresh_resp.status().to_string());
        }
        let refresh_resp: Value = refresh_resp.json().await.map_err(|e| handle_err(e))?;
        match refresh_resp["code"].as_i64() {
            Some(0) => {
                log::info!("Successfully refreshed Cookie");
                return Ok("Successfully refreshed Cookie".into());
            }
            _ => {
                log::error!("{}", response_data["data"]["message"]);
                return Err(format!("{}", response_data["data"]["message"]).into());
            },
        }
    }        
    log::error!("{}, {}", response_data["data"]["code"], response_data["data"]["message"]);
    Err(format!("{}, {}", response_data["data"]["code"], response_data["data"]["message"]).into())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn scan_login(window: WebviewWindow, qrcode_key: String) -> Result<(), String> {
    let client = init_client().await.map_err(|e| handle_err(e))?;
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
        if response_data["code"].as_i64() != Some(0) {
            log::error!("{}: {}, {}", cloned_key, response_data["data"]["code"], response_data["data"]["message"]);
            return Err(format!("{}, {}", response_data["data"]["code"], response_data["data"]["message"]).into());
        }
        window.emit("login-status", response_data["data"]["code"].to_string()).unwrap();
        match response_data["data"]["code"].as_i64() {
            Some(0) => {
                for cookie in cookie_headers {
                    cookies::insert(&cookie).await.map_err(|e| handle_err(e))?;
                }
                if let Some(refresh_token) = response_data["data"]["refresh_token"].as_str() { 
                    let refresh_token = format!("refresh_token={};", refresh_token);
                    cookies::insert(&refresh_token).await.map_err(|e| handle_err(e))?;
                }
                window.emit("headers", init_headers().await?).unwrap();
                log::info!("{}: Successfully login via scan", cloned_key);
                return Ok(());
            }
            Some(86101) | Some(86090) => log::info!("{}: {}", cloned_key, response_data["data"]["message"]),
            _ => {
                log::error!("{}: {}, {}", cloned_key, response_data["data"]["code"], response_data["data"]["message"]);
                return Err(format!("{}, {}", response_data["data"]["code"], response_data["data"]["message"]).into());
            },
        }
        sleep(Duration::from_secs(1)).await;
    }
    log::warn!("{}: \"登录轮询被前端截断\"", cloned_key);
    Err("86114".into())
}

#[tauri::command]
pub async fn pwd_login(
    window: WebviewWindow,
    username: String, password: String,
    token: String, challenge: String,
    validate: String, seccode: String
) -> Result<(), String> {
    let client = init_client().await.map_err(|e| handle_err(e))?;
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
        ]).send().await.map_err(|e| handle_err(e))?;

    if response.status() != reqwest::StatusCode::OK {
        handle_err(response.status().to_string());
        return Err(response.status().to_string());
    }
    let cookie_headers: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();

    let response_data: Value = response.json().await.map_err(|e| handle_err(e))?;
    if response_data["code"].as_i64() != Some(0) {
        log::error!("{}, {}", response_data["code"], response_data["message"]);
        return Err(format!("{}, {}", response_data["code"], response_data["message"]).into());
    }
    for cookie in cookie_headers {
        log::info!("{:?}", cookie);
        cookies::insert(&cookie).await.map_err(|e| handle_err(e))?;
    }
    if let Some(refresh_token) = response_data["data"]["refresh_token"].as_str() { 
        let refresh_token = format!("refresh_token={};", refresh_token);
        cookies::insert(&refresh_token).await.map_err(|e| handle_err(e))?;
    }
    window.emit("headers", init_headers().await?).unwrap();
    log::info!("Successfully login via pwd");
    Ok(())
}

#[tauri::command]
pub async fn sms_login(
    window: WebviewWindow,
    cid: String, tel: String,
    code: String, key: String,
) -> Result<(), String> {
    let client = init_client().await?;
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
        ]).send().await.map_err(|e| handle_err(e))?;

    if response.status() != reqwest::StatusCode::OK {
        handle_err(response.status().to_string());
        return Err(response.status().to_string());
    }
    let cookie_headers: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();

    let response_data: Value = response.json().await.map_err(|e| handle_err(e))?;
    if response_data["code"].as_i64() != Some(0) {
        log::error!("{}, {}", response_data["code"], response_data["message"]);
        return Err(format!("{}, {}", response_data["code"], response_data["message"]).into())
    }
    for cookie in cookie_headers.clone() {
        cookies::insert(&cookie).await.map_err(|e| handle_err(e))?;
    }
    if let Some(refresh_token) = response_data["data"]["refresh_token"].as_str() { 
        let refresh_token = format!("refresh_token={};", refresh_token);
        cookies::insert(&refresh_token).await.map_err(|e| handle_err(e))?;
    }
    window.emit("headers", init_headers().await?).unwrap();
    log::info!("Successfully logined via sms");
    Ok(())
}