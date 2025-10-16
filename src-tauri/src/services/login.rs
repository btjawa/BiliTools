use anyhow::{Context, Result};
use hmac::{Hmac, Mac};
use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::Sha256;
use std::fmt::Write;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, LazyLock,
};
use tauri::http::{header, StatusCode};
use tokio::time::{sleep, Duration};

use crate::{
    shared::{get_ts, init_client, HEADERS},
    storage::cookies,
    TauriError, TauriResult,
};

static LOGIN_POLLING: LazyLock<Arc<AtomicBool>> =
    LazyLock::new(|| Arc::new(AtomicBool::new(false)));

#[derive(Serialize, Deserialize, Debug)]
struct ExitLoginResponse {
    code: isize,
    message: String,
    ts: isize,
    data: Value,
}

#[derive(Serialize, Deserialize, Debug)]
struct BuvidResponse {
    code: isize,
    message: String,
    data: BuvidResponseData,
}

#[derive(Serialize, Deserialize, Debug)]
struct BuvidResponseData {
    b_3: String,
    b_4: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct BiliTicketResponse {
    code: isize,
    message: String,
    ttl: isize,
    data: Option<BiliTicketResponseData>,
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
    data: Option<SmsLoginResponseData>,
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
    data: Option<PwdLoginResponseData>,
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
    data: Option<SwitchCookieResponseData>,
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
    data: Option<ScanLoginResponseData>,
}

#[derive(Serialize, Deserialize, Debug)]
struct ScanLoginResponseData {
    url: String,
    refresh_token: String,
    timestamp: isize,
    code: isize,
    message: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct RefreshCookieResponse {
    code: isize,
    message: String,
    ttl: isize,
    data: Option<RefreshCookieResponseData>,
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

#[tauri::command]
#[specta::specta]
pub fn stop_login() {
    LOGIN_POLLING.store(false, Ordering::SeqCst);
}

pub async fn get_bili_ticket() -> TauriResult<()> {
    let client = init_client().await?;
    let ts = get_ts(false);
    let cookies = cookies::load().await?;
    let bili_csrf = cookies.get("bili_jct").map(String::as_str).unwrap_or("");
    let mut mac = Hmac::<Sha256>::new_from_slice("XgwSnGZ1p".as_bytes())?;
    mac.update(format!("ts{ts}").as_bytes());
    let tag = mac.finalize().into_bytes();
    let mut hexsign = String::with_capacity(tag.len() * 2);
    for b in tag {
        let _ = write!(&mut hexsign, "{:02x}", b);
    }
    let response = client
        .post("https://api.bilibili.com/bapis/bilibili.api.ticket.v1.Ticket/GenWebTicket")
        .query(&[
            ("key_id", "ec02"),
            ("hexsign", &hexsign),
            ("context[ts]", &ts.to_string()),
            ("csrf", bili_csrf),
        ])
        .send()
        .await?;
    if response.status() != StatusCode::OK {
        return Err(TauriError::new(
            "Error while fetching BiliTicket Cookie",
            Some(response.status()),
        ));
    }
    let body: BiliTicketResponse = response
        .json()
        .await
        .context("Failed to decode BiliTicket response")?;
    if let Some(data) = body.data {
        Ok(cookies::insert(format!("bili_ticket={}", data.ticket)).await?)
    } else {
        Err(TauriError::new(body.message, Some(body.code)))
    }
}

pub async fn get_uuid() -> Result<()> {
    const DIGIT_MAP: [&str; 16] = [
        "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F", "10",
    ];
    let s = |length: usize| -> String {
        let mut rng = rand::rng();
        (0..length)
            .map(|_| DIGIT_MAP[rng.random_range(0..DIGIT_MAP.len())])
            .collect()
    };
    let uuid = format!(
        "{}-{}-{}-{}-{}{:05}infoc",
        s(8),
        s(4),
        s(4),
        s(4),
        s(12),
        get_ts(true)
    );
    cookies::insert(format!("_uuid={uuid}")).await?;
    Ok(())
}

pub async fn get_buvid() -> TauriResult<()> {
    let client = init_client().await?;
    let html_resp = client.get("https://www.bilibili.com").send().await?;
    if html_resp.status() != StatusCode::OK {
        return Err(TauriError::new(
            "Error while fetching initial Cookies",
            Some(html_resp.status()),
        ));
    }
    let cookies: Vec<String> = html_resp
        .headers()
        .get_all(header::SET_COOKIE)
        .iter()
        .flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();
    let mut has_buvid_3 = false;
    for cookie in cookies {
        if cookie.starts_with("buvid3") {
            has_buvid_3 = true;
        }
        cookies::insert(cookie).await?;
    }

    let buvid_resp = client
        .get("https://api.bilibili.com/x/frontend/finger/spi")
        .send()
        .await?;
    if buvid_resp.status() != StatusCode::OK {
        return Err(TauriError::new(
            "Error while fetching Buvid Cookies",
            Some(buvid_resp.status()),
        ));
    }
    let buvid_body: BuvidResponse = buvid_resp
        .json()
        .await
        .context("Failed to decode Buvid response")?;
    if buvid_body.code != 0 {
        return Err(TauriError::new(buvid_body.message, Some(buvid_body.code)));
    }
    if !has_buvid_3 {
        cookies::insert(format!("buvid3={}", buvid_body.data.b_3)).await?;
    }
    cookies::insert(format!("buvid4={}", buvid_body.data.b_4)).await?;
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn exit() -> TauriResult<isize> {
    let client = init_client().await?;
    let cookies = cookies::load().await?;
    let bili_csrf = cookies.get("bili_jct").map(String::as_str).unwrap_or("");
    let response = client
        .post("https://passport.bilibili.com/login/exit/v2")
        .query(&[("biliCSRF", bili_csrf)])
        .send()
        .await?;
    if response.status() != StatusCode::OK {
        return Err(TauriError::new(
            "Error while performing Exit login",
            Some(response.status()),
        ));
    }
    let cookies: Vec<String> = response
        .headers()
        .get_all(header::SET_COOKIE)
        .iter()
        .flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();
    let body: ExitLoginResponse = response
        .json()
        .await
        .context("Failed to decode Exit Login response")?;
    if body.code != 0 {
        return Err(TauriError::new(body.message, Some(body.code)));
    }
    for cookie in cookies {
        cookies::delete(
            cookie
                .split_once('=')
                .map(|(name, _)| name)
                .unwrap_or("")
                .into(),
        )
        .await?;
    }
    HEADERS.refresh().await?;
    Ok(body.code)
}

#[tauri::command(async)]
#[specta::specta]
pub async fn sms_login(
    cid: u16,
    tel: String,
    code: String,
    captcha_key: String,
) -> TauriResult<isize> {
    let client = init_client().await?;
    let response = client
        .post("https://passport.bilibili.com/x/passport-login/web/login/sms")
        .query(&[
            ("cid", cid.to_string()),
            ("tel", tel.to_string()),
            ("code", code.to_string()),
            ("source", "main-fe-header".into()),
            ("captcha_key", captcha_key),
            ("keep", "true".into()),
        ])
        .send()
        .await?;
    if response.status() != StatusCode::OK {
        return Err(TauriError::new(
            "Error while performing SMS login",
            Some(response.status()),
        ));
    }
    let cookies: Vec<String> = response
        .headers()
        .get_all(header::SET_COOKIE)
        .iter()
        .flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();
    let body: SmsLoginResponse = response
        .json()
        .await
        .context("Failed to decode SMS login response")?;
    if let Some(data) = body.data {
        for cookie in cookies {
            cookies::insert(cookie).await?;
        }
        cookies::insert(format!("refresh_token={}", data.refresh_token)).await?;
        HEADERS.refresh().await?;
        Ok(body.code)
    } else {
        let message = match body.code {
            -400 => "请求错误",
            1006 => "请输入正确的短信验证码",
            1007 => "短信验证码已过期",
            _ => "未知错误",
        };
        Err(TauriError::new(message, Some(body.code)))
    }
}

#[tauri::command(async)]
#[specta::specta]
pub async fn pwd_login(
    username: String,
    encoded_pwd: String,
    token: String,
    challenge: String,
    validate: String,
    seccode: String,
) -> TauriResult<isize> {
    let client = init_client().await?;
    let response = client
        .post("https://passport.bilibili.com/x/passport-login/web/login")
        .form(&[
            ("username", username),
            ("password", encoded_pwd),
            ("token", token),
            ("challenge", challenge),
            ("validate", validate),
            ("seccode", seccode),
            ("go_url", "https://www.bilibili.com/".into()),
            ("source", "main-fe-header".into()),
        ])
        .send()
        .await?;
    if response.status() != StatusCode::OK {
        return Err(TauriError::new(
            "Error while performing Password login",
            Some(response.status()),
        ));
    }
    let cookies: Vec<String> = response
        .headers()
        .get_all(header::SET_COOKIE)
        .iter()
        .flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();
    let body: PwdLoginResponse = response
        .json()
        .await
        .context("Failed to decode password login response")?;
    if let Some(data) = body.data {
        if data.refresh_token.is_empty() || data.status != 0 {
            return Err(TauriError::new(data.message, Some(data.status)));
        }
        for cookie in cookies {
            cookies::insert(cookie).await?;
        }
        cookies::insert(format!("refresh_token={}", data.refresh_token)).await?;
        HEADERS.refresh().await?;
        Ok(data.status)
    } else {
        Err(TauriError::new(body.message, Some(body.code)))
    }
}

#[tauri::command(async)]
#[specta::specta]
pub async fn switch_cookie(switch_code: String) -> TauriResult<isize> {
    let client = init_client().await?;
    let response = client
        .post("https://passport.bilibili.com/x/passport-login/web/login")
        .query(&[("code", switch_code), ("source", "risk".into())])
        .send()
        .await?;
    if response.status() != StatusCode::OK {
        return Err(TauriError::new(
            "Error while switching cookie",
            Some(response.status()),
        ));
    }
    let cookies: Vec<String> = response
        .headers()
        .get_all(header::SET_COOKIE)
        .iter()
        .flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();
    let body: SwitchCookieResponse = response
        .json()
        .await
        .context("Failed to decode switch cookie response")?;
    if let Some(data) = body.data {
        for cookie in cookies {
            cookies::insert(cookie).await?;
        }
        cookies::insert(format!("refresh_token={}", data.refresh_token)).await?;
        HEADERS.refresh().await?;
        Ok(body.code)
    } else {
        Err(TauriError::new(body.message, Some(body.code)))
    }
}

#[tauri::command(async)]
#[specta::specta]
pub async fn scan_login(
    qrcode_key: String,
    event: tauri::ipc::Channel<isize>,
) -> TauriResult<isize> {
    let client = init_client().await?;
    let masked_key: String = qrcode_key.chars().take(7).collect();
    LOGIN_POLLING.store(true, Ordering::SeqCst);
    while LOGIN_POLLING.load(Ordering::SeqCst) {
        let response = client
            .get(format!(
                "https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key={}",
                qrcode_key
            ))
            .send()
            .await?;
        if response.status() != StatusCode::OK {
            return Err(TauriError::new(
                "Error while polling QR code login",
                Some(response.status()),
            ));
        }
        let cookies: Vec<String> = response
            .headers()
            .get_all(header::SET_COOKIE)
            .iter()
            .flat_map(|h| h.to_str().ok())
            .map(|s| s.to_string())
            .collect();
        let body: ScanLoginResponse = response
            .json()
            .await
            .context("Failed to decode QR code polling response")?;
        if let Some(data) = body.data {
            event.send(data.code)?;
            match data.code {
                0 => {
                    for cookie in cookies {
                        cookies::insert(cookie).await?;
                    }
                    cookies::insert(format!("refresh_token={}", data.refresh_token)).await?;
                    log::info!("{}: {}", masked_key, "扫码登录成功");
                    HEADERS.refresh().await?;
                    return Ok(data.code);
                }
                86101 | 86090 => log::info!("{masked_key}: {}", data.message),
                _ => {
                    log::error!("{masked_key}: {}, {}", data.code, data.message);
                    return Err(TauriError::new(data.message, Some(data.code)));
                }
            }
        } else {
            return Err(TauriError::new(body.message, Some(body.code)));
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
    let bili_csrf = cookies.get("bili_jct").map(String::as_str).unwrap_or("");
    let refresh_token = cookies
        .get("refresh_token")
        .map(String::as_str)
        .unwrap_or("");
    let refresh_token_resp = client
        .post("https://passport.bilibili.com/x/passport-login/web/cookie/refresh")
        .query(&[
            ("csrf", bili_csrf),
            ("refresh_csrf", &refresh_csrf),
            ("refresh_token", refresh_token),
            ("source", "main_web"),
        ])
        .send()
        .await?;
    if refresh_token_resp.status() != StatusCode::OK {
        return Err(TauriError::new(
            "Error while refreshing cookie",
            Some(refresh_token_resp.status()),
        ));
    }
    let cookies: Vec<String> = refresh_token_resp
        .headers()
        .get_all(header::SET_COOKIE)
        .iter()
        .flat_map(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .collect();
    let refresh_token_body: RefreshCookieResponse = refresh_token_resp.json().await?;
    if let Some(data) = refresh_token_body.data {
        for cookie in cookies {
            cookies::insert(cookie).await?;
        }
        cookies::insert(format!("refresh_token={}", data.refresh_token)).await?;
        HEADERS.refresh().await?;
    } else {
        return Err(TauriError::new(
            refresh_token_body.message,
            Some(refresh_token_body.code),
        ));
    }
    let confirm_refresh_resp = client
        .post("https://passport.bilibili.com/x/passport-login/web/confirm/refresh")
        .query(&[("csrf", bili_csrf), ("refresh_token", refresh_token)])
        .send()
        .await?;
    if confirm_refresh_resp.status() != StatusCode::OK {
        return Err(TauriError::new(
            "Error while confirming refresh",
            Some(confirm_refresh_resp.status()),
        ));
    }
    let confirm_refresh_body: ConfirmRefreshResponse = confirm_refresh_resp.json().await?;
    if confirm_refresh_body.code != 0 {
        return Err(TauriError::new(
            confirm_refresh_body.message,
            Some(confirm_refresh_body.code),
        ));
    }
    Ok(confirm_refresh_body.code)
}
