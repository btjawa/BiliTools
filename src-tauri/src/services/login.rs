use std::{sync::{atomic::{AtomicBool, Ordering}, Arc}, time::{SystemTime, UNIX_EPOCH}};
use serde::{Serialize, Deserialize};
use serde_json::{json, Value};
use rand::Rng;
use tauri::{http::{header, StatusCode}, Listener, Url};
use lazy_static::lazy_static;
use tokio::time::{sleep, Duration};
use ring::hmac;
use crate::{cookies, init_client, init_headers};

use super::get_window;

lazy_static! {
    static ref LOGIN_POLLING: Arc<AtomicBool> = Arc::new(AtomicBool::new(false));
}

#[derive(Serialize, Deserialize, Debug)]
struct ExitLoginResponse {
    code: isize,
    message: String,
    ts: isize,
    data: Value
}

#[derive(Serialize, Deserialize, Debug)]
struct BuvidResponse {
    code: isize,
    message: String,
    data: BuvidResponseData
}

#[derive(Serialize, Deserialize, Debug)]
struct BuvidResponseData {
    b_3: String,
    b_4: String
}

#[derive(Serialize, Deserialize, Debug)]
struct BiliTicketResponse {
    code: isize,
    message: String,
    ttl: isize,
    data: BiliTicketResponseData
}

#[derive(Serialize, Deserialize, Debug)]
struct BiliTicketResponseData {
    ticket: String,
    created_at: isize,
    ttl: isize,
    context: Value,
    nav: Value,
}

#[derive(Serialize, Deserialize, Debug)]
struct SmsLoginResponse {
    code: isize,
    data: SmsLoginResponseData
}

#[derive(Serialize, Deserialize, Debug)]
struct SmsLoginResponseData {
    status: isize,
    message: String,
    url: String,
    refresh_token: String,
    timestamp: isize,
    hint: Option<String>,
    in_reg_audit: Option<isize>,
    is_new: bool,
}

#[derive(Serialize, Deserialize, Debug)]
struct PwdLoginResponse {
    code: isize,
    message: String,
    data: PwdLoginResponseData
}

#[derive(Serialize, Deserialize, Debug)]
struct PwdLoginResponseData {
    status: isize,
    message: String,
    url: String,
    refresh_token: String,
    timestamp: isize,
    hint: Option<String>,
    in_reg_audit: Option<isize>,
}

#[derive(Serialize, Deserialize, Debug)]
struct SwitchCookieResponse {
    code: isize,
    message: String,
    ttl: isize,
    data: SwitchCookieResponseData
}

#[derive(Serialize, Deserialize, Debug)]
struct SwitchCookieResponseData {
    url: String,
    refresh_token: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct ScanLoginResponse {
    code: isize,
    message: String,
    ttl: isize,
    data: ScanLoginResponseData
}

#[derive(Serialize, Deserialize, Debug)]
struct ScanLoginResponseData {
    url: String,
    refresh_token: String,
    timestamp: isize,
    code: isize,
    message: String
}

#[derive(Serialize, Deserialize, Debug)]
struct RefreshCookieResponse {
    code: isize,
    message: String,
    ttl: isize,
    data: RefreshCookieResponseData
}

#[derive(Serialize, Deserialize, Debug)]
struct RefreshCookieResponseData {
    status: isize,
    message: String,
    refresh_token: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct ConfirmRefreshResponse {
    code: isize,
    message: String,
    ttl: isize,
}

fn hmac_sha256(key: &str, message: &str) -> String {
    let key = hmac::Key::new(hmac::HMAC_SHA256, key.as_bytes());
    let signature = hmac::sign(&key, message.as_bytes());
    signature.as_ref().iter().map(|byte| format!("{:02x}", byte)).collect()
}

pub fn init() {
    get_window().listen("stop_login", |_| { stop_login() });
}

pub fn stop_login() {
    LOGIN_POLLING.store(false, Ordering::SeqCst);
}

pub async fn get_extra_cookies() -> Result<(), Value> {
    let client = init_client().await?;
    let buvid3_resp = client
        .get("https://www.bilibili.com")
        .send().await.map_err(|e| e.to_string())?;
    if buvid3_resp.status() != StatusCode::OK {
        return Err(Value::from(buvid3_resp.status().to_string()));
    }
    let buvid3_cookies: Vec<String> = buvid3_resp.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();
    for cookie in buvid3_cookies {
        cookies::insert(cookie).await.map_err(|e| e.to_string())?;
    }
    init_headers().await?;

    let buvid4_resp = client
        .get("https://api.bilibili.com/x/frontend/finger/spi")
        .send().await.map_err(|e| e.to_string())?;
    if buvid4_resp.status() != StatusCode::OK {
        return Err(Value::from(buvid4_resp.status().to_string()));
    }
    let buvid4_body: BuvidResponse = buvid4_resp.json().await.map_err(|e| e.to_string())?;
    if buvid4_body.code != 0 {
        return Err(json!({ "code": buvid4_body.code, "message": buvid4_body.message }));
    }
    cookies::insert(format!("buvid4={}", buvid4_body.data.b_4)).await.map_err(|e| e.to_string())?;
    init_headers().await?;

    let ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    let hex_sign = hmac_sha256("XgwSnGZ1p", &format!("ts{}", ts));
    let cookies = cookies::load().await.map_err(|e| e.to_string())?;
    let bili_csrf = cookies.get("bili_jct").and_then(Value::as_str).unwrap_or("");
    let bili_ticket_resp = client
        .post("https://api.bilibili.com/bapis/bilibili.api.ticket.v1.Ticket/GenWebTicket")
        .query(&[
            ("key_id", "ec02"),
            ("hexsign", &hex_sign),
            ("context[ts]", &ts.to_string()),
            ("csrf", bili_csrf),

        ]).send().await.map_err(|e| e.to_string())?;
    if bili_ticket_resp.status() != StatusCode::OK {
        return Err(Value::from(bili_ticket_resp.status().to_string()));
    }
    let bili_ticket_body: BiliTicketResponse = bili_ticket_resp.json().await.map_err(|e| e.to_string())?;
    if bili_ticket_body.code != 0 {
        return Err(json!({ "code": bili_ticket_body.code, "message": bili_ticket_body.message }));
    }
    cookies::insert(format!("bili_ticket={}", bili_ticket_body.data.ticket)).await.map_err(|e| e.to_string())?;
    init_headers().await?;

    fn a(e: usize) -> String {
        let mut rng = rand::thread_rng();
        (0..e)
            .map(|_| format!("{:X}", rng.gen_range(0..16)))
            .collect()
    }
    fn s(e: String, t: usize) -> String {
        if e.len() < t {
            "0".repeat(t - e.len()) + &e
        } else { e }
    }
    let ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis();
    cookies::insert(format!(
        "_uuid={}-{}-{}-{}-{}{}infoc",
        a(8), a(4), a(4), a(4), a(12), s((ts % 100000).to_string(), 5)
    )).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command()]
pub async fn exit() -> Result<isize, Value> {
    let client = init_client().await?;
    let cookies = cookies::load().await.map_err(|e| e.to_string())?;
    let bili_csrf = cookies.get("bili_jct").and_then(Value::as_str).unwrap_or("");
    let response = client
        .post("https://passport.bilibili.com/login/exit/v2")
        .query(&[
            ("biliCSRF", bili_csrf),
        ]).send().await.map_err(|e| e.to_string())?;
    if response.status() != StatusCode::OK {
        return Err(Value::from(response.status().to_string()));
    }
    let cookies: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();
    let body: ExitLoginResponse = response.json().await.map_err(|e| e.to_string())?;
    if body.code != 0 {
        return Err(json!({ "code": body.code, "message": body.message }));
    }
    for cookie in cookies {
        cookies::delete(cookie.split_once('=').map(|(name, _)| name).unwrap_or("").into()).await.map_err(|e| e.to_string())?;
    }
    init_headers().await?;
    Ok(body.code)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn sms_login(cid: isize, tel: String, code: String, captcha_key: String) -> Result<isize, Value> {
    let client = init_client().await?;
    let response = client
        .post("https://passport.bilibili.com/x/passport-login/web/login/sms")
        .query(&[
            ("cid", cid.to_string()),
            ("tel", tel.to_string()),
            ("code", code.to_string()),
            ("source", "main-fe-header".into()),
            ("captcha_key", captcha_key),
            ("keep", "true".into())
        ]).send().await.map_err(|e| e.to_string())?;
    if response.status() != StatusCode::OK {
        return Err(Value::from(response.status().to_string()));
    }
    let cookies: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();
    let body: SmsLoginResponse = response.json().await.map_err(|e| e.to_string())?;
    if body.code != 0 {
        let message = match body.code {
            -400 => "请求错误",
            1006 => "请输入正确的短信验证码",
            1007 => "短信验证码已过期",
            _ => "未知错误"
        };
        return Err(json!({ "code": body.code, "message": message }));
    }
    for cookie in cookies {
        cookies::insert(cookie).await.map_err(|e| e.to_string())?;
    }
    cookies::insert(format!("refresh_token={}", body.data.refresh_token)).await.map_err(|e| e.to_string())?;
    init_headers().await?;
    Ok(body.code)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn pwd_login(username: String, encoded_pwd: String, token: String, challenge: String, validate: String, seccode: String) -> Result<isize, Value> {
    let client = init_client().await?;
    let response = client
        .post("https://passport.bilibili.com/x/passport-login/web/login")
        .query(&[
            ("username", username),
            ("password", encoded_pwd),
            ("token", token),
            ("challenge", challenge),
            ("validate", validate),
            ("seccode", seccode),
            ("go_url", "https://www.bilibili.com".into()),
            ("source", "main-fe-header".into()),
        ]).send().await.map_err(|e| e.to_string())?;
    if response.status() != StatusCode::OK {
        return Err(Value::from(response.status().to_string()));
    }
    let cookies: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();
    let body: PwdLoginResponse = response.json().await.map_err(|e| e.to_string())?;
    if body.code != 0 {
        return Err(json!({ "code": body.code, "message": body.message }));
    }
    if body.data.refresh_token.is_empty() || body.data.status != 0 {
        let tmp_code = Url::parse(&body.data.url).ok().and_then(|url| {
            url.clone().query_pairs()
            .find(|(key, _)| key == "tmp_token")
            .map(|(_, value)| value.to_string())
        }).unwrap_or_default();
        let request_id = Url::parse(&body.data.url).ok().and_then(|url| {
            url.clone().query_pairs()
            .find(|(key, _)| key == "request_id")
            .map(|(_, value)| value.to_string())
        }).unwrap_or_default();
        return Err(json!({ "code": body.data.status, "message": body.data.message, "tmp_code": tmp_code, "request_id": request_id }));
    }
    for cookie in cookies {
        cookies::insert(cookie).await.map_err(|e| e.to_string())?;
    }
    cookies::insert(format!("refresh_token={}", body.data.refresh_token)).await.map_err(|e| e.to_string())?;
    init_headers().await?;
    Ok(body.data.status)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn switch_cookie(switch_code: String) -> Result<isize, Value> {
    let client = init_client().await?;
    let response = client
        .post("https://passport.bilibili.com/x/passport-login/web/login")
        .query(&[
            ("code", switch_code),
            ("source", "risk".into()),
        ]).send().await.map_err(|e| e.to_string())?;
    if response.status() != StatusCode::OK {
        return Err(Value::from(response.status().to_string()));
    }
    let cookies: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();
    let body: SwitchCookieResponse = response.json().await.map_err(|e| e.to_string())?;
    if body.code != 0 {
        return Err(json!({ "code": body.code, "message": body.message }));
    }
    for cookie in cookies {
        cookies::insert(cookie).await.map_err(|e| e.to_string())?;
    }
    cookies::insert(format!("refresh_token={}", body.data.refresh_token)).await.map_err(|e| e.to_string())?;
    init_headers().await?;
    Ok(body.code)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn scan_login(qrcode_key: String, event: tauri::ipc::Channel<isize>) -> Result<isize, Value> {
    let client = init_client().await?;
    let masked_key: String = qrcode_key.chars().take(7).collect();
    LOGIN_POLLING.store(true, Ordering::SeqCst);
    while LOGIN_POLLING.load(Ordering::SeqCst) {
        let response = client
            .get(format!(
                "https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key={}",
                qrcode_key
            )).send().await.map_err(|e| e.to_string())?;
        if response.status() != StatusCode::OK {
            return Err(Value::from(response.status().to_string()));
        }
        let cookies: Vec<String> = response.headers().get_all(header::SET_COOKIE)
            .iter().flat_map(|h| h.to_str().ok())
            .map(|s| s.to_string())
            .collect();
        let body: ScanLoginResponse = response.json().await.map_err(|e| e.to_string())?;
        if body.code != 0 {
            return Err(json!({ "code": body.code, "message": body.message }));
        }
        event.send(body.data.code).unwrap();
        match body.data.code {
            0 => {
                for cookie in cookies {
                    cookies::insert(cookie).await.map_err(|e| e.to_string())?;
                }
                cookies::insert(format!("refresh_token={}", body.data.refresh_token)).await.map_err(|e| e.to_string())?;
                log::info!("{}: {}", masked_key, "扫码登录成功");
                init_headers().await?;
                return Ok(body.data.code);
            }
            86101 | 86090 => log::info!("{masked_key}: {}", body.data.message),
            _ => {
                log::error!("{masked_key}: {}, {}", body.data.code, body.data.message);
                return Err(json!({ "code": body.data.code, "message": body.data.message }));
            },
        }
        sleep(Duration::from_secs(1)).await;
    }
    log::warn!("{masked_key}: 登录轮询被前端截断");
    Ok(86114)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn refresh_cookie(refresh_csrf: String) -> Result<isize, Value> {
    let client = init_client().await?;
    let cookies = cookies::load().await.map_err(|e| e.to_string())?;
    let bili_csrf = cookies.get("bili_jct").and_then(Value::as_str).unwrap_or("");
    let refresh_token = cookies.get("refresh_token").and_then(Value::as_str).unwrap_or("");
    let refresh_token_resp = client
        .post("https://passport.bilibili.com/x/passport-login/web/cookie/refresh")
        .query(&[
            ("csrf", &*bili_csrf),
            ("refresh_csrf", &refresh_csrf),
            ("refresh_token", refresh_token),
            ("source", "main_web".into()),
        ]).send().await.map_err(|e| e.to_string())?;
    if refresh_token_resp.status() != StatusCode::OK {
        return Err(Value::from(refresh_token_resp.status().to_string()));
    }
    let cookies: Vec<String> = refresh_token_resp.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();
    let refresh_token_body: RefreshCookieResponse = refresh_token_resp.json().await.map_err(|e| e.to_string())?;
    if refresh_token_body.code != 0 {
        return Err(json!({ "code": refresh_token_body.code, "message": refresh_token_body.message }));
    }
    for cookie in cookies {
        cookies::insert(cookie).await.map_err(|e| e.to_string())?;
    }
    cookies::insert(format!("refresh_token={}", refresh_token_body.data.refresh_token)).await.map_err(|e| e.to_string())?;
    init_headers().await?;
    let confirm_refresh_resp = client
        .post("https://passport.bilibili.com/x/passport-login/web/cookie/refresh")
        .query(&[
            ("csrf", bili_csrf),
            ("refresh_token", refresh_token.into()),
        ]).send().await.map_err(|e| e.to_string())?;
    if confirm_refresh_resp.status() != StatusCode::OK {
        return Err(Value::from(confirm_refresh_resp.status().to_string()));
    }
    let confirm_refresh_body: ConfirmRefreshResponse = confirm_refresh_resp.json().await.map_err(|e| e.to_string())?;
    if confirm_refresh_body.code != 0 {
        return Err(json!({ "code": confirm_refresh_body.code, "message": confirm_refresh_body.message }));
    }
    Ok(confirm_refresh_body.code)
}