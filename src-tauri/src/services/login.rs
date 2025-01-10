use std::sync::{atomic::{AtomicBool, Ordering}, Arc};
use tauri::{http::{header, StatusCode}, Url};
use serde::{Serialize, Deserialize};
use tokio::time::{sleep, Duration};
use serde_json::Value;
use anyhow::{anyhow, Context, Result};
use lazy_static::lazy_static;
use ring::hmac;
use rand::Rng;

use crate::{
    shared::{
        get_ts, init_client, init_headers
    }, storage::cookies, TauriError, TauriResult
};

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
    data: Option<BiliTicketResponseData>
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
    data: Option<SmsLoginResponseData>
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
    data: Option<PwdLoginResponseData>
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
    data: Option<SwitchCookieResponseData>
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
    data: Option<ScanLoginResponseData>
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
    data: Option<RefreshCookieResponseData>
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

#[tauri::command]
#[specta::specta]
pub fn stop_login() {
    LOGIN_POLLING.store(false, Ordering::SeqCst);
}

pub async fn get_extra_cookies() -> Result<()> {
    let client = init_client().await?;
    let html_resp = client
        .get("https://www.bilibili.com")
        .send().await?;
    if html_resp.status() != StatusCode::OK {
        return Err(anyhow!("({}) Error while fetching initial Cookies", html_resp.status()));
    }
    let cookies: Vec<String> = html_resp.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();
    let mut has_buvid_3 = false;
    for cookie in cookies {
        cookies::insert(cookie.clone()).await?;
        if cookie.starts_with("buvid3") {
            has_buvid_3 = true;
        }
    }

    let buvid_resp = client
        .get("https://api.bilibili.com/x/frontend/finger/spi")
        .send().await?;
    if buvid_resp.status() != StatusCode::OK {
        return Err(anyhow!("({}) Error while fetching Buvid Cookies", buvid_resp.status()));
    }
    let buvid_body: BuvidResponse = buvid_resp.json()
        .await.context("Failed to decode Buvid response")?;
    if buvid_body.code != 0 {
        return Err(anyhow!(TauriError::new_full(buvid_body.code, buvid_body.message)))
    }
    if !has_buvid_3 {
        cookies::insert(format!("buvid3={}", buvid_body.data.b_3)).await?;
    }
    cookies::insert(format!("buvid4={}", buvid_body.data.b_4)).await?;

    let ts = get_ts(false);
    let hex_sign = hmac_sha256("XgwSnGZ1p", &format!("ts{}", ts));
    let cookies = cookies::load().await?;
    let bili_csrf = cookies.get("bili_jct").and_then(Value::as_str).unwrap_or("");
    let bili_ticket_resp = client
        .post("https://api.bilibili.com/bapis/bilibili.api.ticket.v1.Ticket/GenWebTicket")
        .query(&[
            ("key_id", "ec02"),
            ("hexsign", &hex_sign),
            ("context[ts]", &ts.to_string()),
            ("csrf", bili_csrf),
        ]).send().await?;
    if bili_ticket_resp.status() != StatusCode::OK {
        return Err(anyhow!("({}) Error while fetching BiliTicket Cookie", bili_ticket_resp.status()));
    }
    let bili_ticket_body: BiliTicketResponse = bili_ticket_resp.json()
        .await.context("Failed to decode BiliTicket response")?;
    if bili_ticket_body.code != 0 || bili_ticket_body.data.is_none() {
        return Err(anyhow!(TauriError::new_full(bili_ticket_body.code, bili_ticket_body.message)))
    }
    cookies::insert(format!("bili_ticket={}", bili_ticket_body.data.unwrap().ticket)).await?;

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
    let ts = get_ts(true);
    cookies::insert(format!(
        "_uuid={}-{}-{}-{}-{}{}infoc",
        a(8), a(4), a(4), a(4), a(12), s((ts % 100000).to_string(), 5)
    )).await?;
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn exit() -> TauriResult<isize> {
    let client = init_client().await?;
    let cookies = cookies::load().await?;
    let bili_csrf = cookies.get("bili_jct").and_then(Value::as_str).unwrap_or("");
    let response = client
        .post("https://passport.bilibili.com/login/exit/v2")
        .query(&[
            ("biliCSRF", bili_csrf),
        ]).send().await?;
    if response.status() != StatusCode::OK {
        return Err(anyhow!("({}) Error while performing Exit login", response.status()).into());
    }
    let cookies: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();
    let body: ExitLoginResponse = response.json()
        .await.context("Failed to decode Exit Login response")?;
    if body.code != 0 {
        return Err(anyhow!(TauriError::new_full(body.code, body.message)).into())
    }
    for cookie in cookies {
        cookies::delete(cookie.split_once('=').map(|(name, _)| name).unwrap_or("").into()).await?;
    }
    init_headers().await?;
    Ok(body.code)
}

#[tauri::command(async)]
#[specta::specta]
pub async fn sms_login(cid: u16, tel: String, code: String, captcha_key: String) -> TauriResult<isize> {
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
        ]).send().await?;
    if response.status() != StatusCode::OK {
        return Err(anyhow!("({}) Error while performing SMS login", response.status()).into());
    }
    let cookies: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();
    let body: SmsLoginResponse = response.json()
        .await.context("Failed to decode SMS login response")?;
    if body.code != 0 || body.data.is_none() {
        let message = match body.code {
            -400 => "请求错误",
            1006 => "请输入正确的短信验证码",
            1007 => "短信验证码已过期",
            _ => "未知错误"
        };
        return Err(anyhow!(TauriError::new_full(body.code, message)).into());
    }
    for cookie in cookies {
        cookies::insert(cookie).await?;
    }
    cookies::insert(format!("refresh_token={}", body.data.unwrap().refresh_token)).await?;
    init_headers().await?;
    Ok(body.code)
}

#[tauri::command(async)]
#[specta::specta]
pub async fn pwd_login(username: String, encoded_pwd: String, token: String, challenge: String, validate: String, seccode: String) -> TauriResult<isize> {
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
        ]).send().await?;
    if response.status() != StatusCode::OK {
        return Err(anyhow!("({}) Error while performing SMS login", response.status()).into());
    }
    let cookies: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();
    let body: PwdLoginResponse = response.json()
        .await.context("Failed to decode password login response")?;
    if body.code != 0 || body.data.is_none() {
        return Err(anyhow!(TauriError::new_full(body.code, body.message)).into());
    }
    let data = body.data.unwrap();
    if data.refresh_token.is_empty() || data.status != 0 {
        let _tmp_code = Url::parse(&data.url).ok().and_then(|url| {
            url.clone().query_pairs()
            .find(|(key, _)| key == "tmp_token")
            .map(|(_, value)| value.to_string())
        }).unwrap_or_default();
        let _request_id = Url::parse(&data.url).ok().and_then(|url| {
            url.clone().query_pairs()
            .find(|(key, _)| key == "request_id")
            .map(|(_, value)| value.to_string())
        }).unwrap_or_default();
        return Err(anyhow!(TauriError::new_full(data.status, data.message)).into());
    }
    for cookie in cookies {
        cookies::insert(cookie).await?;
    }
    cookies::insert(format!("refresh_token={}", data.refresh_token)).await?;
    init_headers().await?;
    Ok(data.status)
}

#[tauri::command(async)]
#[specta::specta]
pub async fn switch_cookie(switch_code: String) -> TauriResult<isize> {
    let client = init_client().await?;
    let response = client
        .post("https://passport.bilibili.com/x/passport-login/web/login")
        .query(&[
            ("code", switch_code),
            ("source", "risk".into()),
        ]).send().await?;
    if response.status() != StatusCode::OK {
        return Err(anyhow!("({}) Error while switching cookie", response.status()).into());
    }
    let cookies: Vec<String> = response.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();
    let body: SwitchCookieResponse = response.json()
        .await.context("Failed to decode switch cookie response")?;
    if body.code != 0 || body.data.is_none() {
        return Err(anyhow!(TauriError::new_full(body.code, body.message)).into());
    }
    for cookie in cookies {
        cookies::insert(cookie).await?;
    }
    cookies::insert(format!("refresh_token={}", body.data.unwrap().refresh_token)).await?;
    init_headers().await?;
    Ok(body.code)
}

#[tauri::command(async)]
#[specta::specta]
pub async fn scan_login(qrcode_key: String, event: tauri::ipc::Channel<isize>) -> TauriResult<isize> {
    let client = init_client().await?;
    let masked_key: String = qrcode_key.chars().take(7).collect();
    LOGIN_POLLING.store(true, Ordering::SeqCst);
    while LOGIN_POLLING.load(Ordering::SeqCst) {
        let response = client
            .get(format!(
                "https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key={}",
                qrcode_key
            )).send().await?;
        if response.status() != StatusCode::OK {
            return Err(anyhow!("({}) Error while polling QR code login", response.status()).into());
        }
        let cookies: Vec<String> = response.headers().get_all(header::SET_COOKIE)
            .iter().flat_map(|h| h.to_str().ok())
            .map(|s| s.to_string())
            .collect();
        let body: ScanLoginResponse = response.json()
            .await.context("Failed to decode QR code polling response")?;
        if body.code != 0 || body.data.is_none() {
            return Err(anyhow!(TauriError::new_full(body.code, body.message)).into());
        }
        let data = body.data.unwrap();
        event.send(data.code).unwrap();
        match data.code {
            0 => {
                for cookie in cookies {
                    cookies::insert(cookie).await?;
                }
                cookies::insert(format!("refresh_token={}", data.refresh_token)).await?;
                log::info!("{}: {}", masked_key, "扫码登录成功");
                init_headers().await?;
                return Ok(data.code);
            }
            86101 | 86090 => log::info!("{masked_key}: {}", data.message),
            _ => {
                log::error!("{masked_key}: {}, {}", data.code, data.message);
                return Err(anyhow!(TauriError::new_full(data.code, data.message)).into());
            },
        }
        sleep(Duration::from_secs(1)).await;
    }
    log::warn!("{masked_key}: 登录轮询被前端截断");
    Ok(86114)
}

#[tauri::command(async)]
#[specta::specta]
pub async fn refresh_cookie(refresh_csrf: String) -> TauriResult<isize> {
    let client = init_client().await?;
    let cookies = cookies::load().await?;
    let bili_csrf = cookies.get("bili_jct").and_then(Value::as_str).unwrap_or("");
    let refresh_token = cookies.get("refresh_token").and_then(Value::as_str).unwrap_or("");
    let refresh_token_resp = client
        .post("https://passport.bilibili.com/x/passport-login/web/cookie/refresh")
        .query(&[
            ("csrf", &*bili_csrf),
            ("refresh_csrf", &refresh_csrf),
            ("refresh_token", refresh_token),
            ("source", "main_web".into()),
        ]).send().await?;
    if refresh_token_resp.status() != StatusCode::OK {
        return Err(anyhow!("({}) Error while refreshing cookie", refresh_token_resp.status()).into());
    }
    let cookies: Vec<String> = refresh_token_resp.headers().get_all(header::SET_COOKIE)
        .iter().flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();
    let refresh_token_body: RefreshCookieResponse = refresh_token_resp.json().await?;
    if refresh_token_body.code != 0 || refresh_token_body.data.is_none() {
        return Err(TauriError::new_full(refresh_token_body.code, refresh_token_body.message))
    }
    for cookie in cookies {
        cookies::insert(cookie).await?;
    }
    cookies::insert(format!("refresh_token={}", refresh_token_body.data.unwrap().refresh_token)).await?;
    init_headers().await?;
    let confirm_refresh_resp = client
        .post("https://passport.bilibili.com/x/passport-login/web/confirm/refresh")
        .query(&[
            ("csrf", bili_csrf),
            ("refresh_token", refresh_token.into()),
        ]).send().await?;
    if confirm_refresh_resp.status() != StatusCode::OK {
        return Err(anyhow!("({}) Error while confirming refresh", confirm_refresh_resp.status()).into());
    }
    let confirm_refresh_body: ConfirmRefreshResponse = confirm_refresh_resp.json().await?;
    if confirm_refresh_body.code != 0 {
        return Err(TauriError::new_full(confirm_refresh_body.code, confirm_refresh_body.message))
    }
    Ok(confirm_refresh_body.code)
}