use std::{ffi::OsStr, fs, path::PathBuf, sync::{Arc, RwLock}, thread, mem, time::Duration};
use headless_chrome::{
    browser::{
        tab::RequestPausedDecision,
        transport::{SessionId, Transport}
    },
    protocol::cdp::{
        Fetch::{events::RequestPausedEvent, ContinueRequest, HeaderEntry}, Input, Network::{CookieParam, Headers}
    },
    Browser, LaunchOptions, Tab
};
use base64::{prelude::BASE64_STANDARD, Engine};
use serde::{Deserialize, Serialize};
use anyhow::{Context, anyhow};
use regex::Regex;
use rand::Rng;

use crate::{errors::TauriResult, storage::cookies, shared::{CONFIG, SECRET}};

#[derive(Serialize, Deserialize, Debug)]
struct Index {
    id: String,
    buffer_length: usize,
    index: usize,
    mark: bool
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ImageTokenPostBody {
    pub m1: String,
    pub urls: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ImageIndexResponse {
    pub code: i32,
    #[serde(default)]
    pub data: ImageData,
    pub msg: String,
}

#[derive(Serialize, Deserialize, Default, Debug)]
pub struct ImageData {
    #[serde(default)]
    pub images: Vec<Image>,
}

#[derive(Serialize, Deserialize, Default, Debug)]
pub struct Image {
    #[serde(default)]
    pub path: String,
}

trait FromWith {
    fn from_with(model: &cookies::Model, domain: Option<&str>) -> Self;
}

impl FromWith for CookieParam {
    fn from_with(model: &cookies::Model, domain: Option<&str>) -> Self {
        Self {
            name: model.name.clone(),
            value: model.value.to_string(),
            url: None,
            domain: Some(domain.unwrap_or(&model.value).to_string()),
            path: model.path.clone(),
            secure: Some(model.secure),
            http_only: Some(model.httponly),
            expires: model.expires.map(|e| e as f64),
            priority: None, same_site: None,
            same_party: None, source_scheme: None,
            source_port: None, partition_key: None,
        }
    }
}

fn get_url_id(url: &str) -> Option<String> {
    let re = Regex::new(r"\/([^\/]+)\.jpg").unwrap();
    re.captures(&url).and_then(|caps| caps.get(1).map(|m| m.as_str().into()))
}

fn modify_headers(headers: Headers, length: usize) -> Vec<HeaderEntry> {
    let mut original = headers.0.as_ref()
        .and_then(|val| val.as_object().cloned())
        .map(|map| map.into_iter()
            .filter_map(|(k, v)| v.as_str().map(|v| HeaderEntry { name: k, value: v.into() }))
            .collect::<Vec<HeaderEntry>>()
        ).unwrap_or_default();
    if let Some(entry) = original.iter_mut().find(|h| h.name.eq_ignore_ascii_case("Content-Length")) {
        entry.value = length.to_string();
    } else {
        original.push(HeaderEntry { name: "Content-Length".to_string(), value: length.to_string() });
    }
    original
}

fn get_length(index_list: &Arc<RwLock<Vec<Index>>>) -> usize {
    let list = index_list.read().unwrap();
    list.iter().filter(|v| v.mark).count()
}

async fn auto_refresh(tab: &Arc<Tab>, index_list: &Arc<RwLock<Vec<Index>>>) -> TauriResult<()> {
    use tokio::time::sleep;
    let mut max_len = 0;
    while max_len == 0 {
        max_len = { let lock = index_list.read().unwrap(); lock.len() };
        sleep(Duration::from_millis(100)).await;
    }
    let mut scroll_count = 0;
    let x = rand::rng().random_range(800..1000);
    let y = rand::rng().random_range(400..600);
    loop {
        let count = get_length(index_list);
        log::info!("Progress: {count} / {max_len}");
        if count >= max_len { break; }
        tab.call_method(Input::DispatchMouseEvent {
            Type: Input::DispatchMouseEventTypeOption::MouseWheel,
            x: x as f64, y: y as f64,
            delta_x: Some(0.0), delta_y: Some(100.0),
            modifiers: None, timestamp: None,
            button: None, buttons: None,
            click_count: None, force: None,
            tangential_pressure: None,
            tilt_x: None, tilt_y: None,
            twist: None, pointer_Type: None,
        })?;
        scroll_count += 1;
        loop {
            let count = get_length(index_list);
            if count > (2 * scroll_count) { break; }
            sleep(Duration::from_millis(100)).await;
        }
    }
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn crawler(secret: String, down_dir: String, id: usize, ep: usize) -> TauriResult<()> {
    if secret != *SECRET.read().unwrap() {
        return Err(anyhow!("403 Forbidden").into())
    }
    let down_dir = PathBuf::from(down_dir);
    let temp_dir = { CONFIG.read().unwrap().temp_dir.join("com.btjawa.bilitools") };
    let inspect_manga = { CONFIG.read().unwrap().advanced.inspect_manga };
    fs::create_dir_all(&temp_dir).context("Failed to create app temp dir")?;
    fs::create_dir_all(&down_dir).context("Failed to create crawler output dir")?;
    let browser = Browser::new(
        LaunchOptions::default_builder()
            .args(vec![
                OsStr::new("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"),
                OsStr::new("--disable-blink-features=AutomationControlled")
            ])
            .headless(true)
            .window_size(Some((1920, 1080)))
            // .devtools(true)
            .build()?
    )?;
    let index_list = Arc::new(RwLock::new(Vec::<Index>::new()));
    let tab = browser.new_tab()?;
    tab.enable_fetch(None, None)?;
    tab.enable_request_interception(Arc::new(
        move |_transport: Arc<Transport>, _session_id: SessionId, event: RequestPausedEvent| {
            let url = &event.params.request.url;
            if url.contains("ImageToken") && event.params.request.method == "POST" && inspect_manga {
                let request = &event.params.request;
                // println!("ImageToken: {url}");
                let post_data = &request.post_data.as_deref().unwrap_or("");
                let mut json_data = serde_json::from_str::<ImageTokenPostBody>(post_data).unwrap();
                json_data.urls = json_data.urls.replace("@1100w.avif", "");
                let post_data = serde_json::to_string(&json_data).unwrap();
                let post_len = post_data.len();
                RequestPausedDecision::Continue(Some(
                    ContinueRequest {
                        request_id: event.params.request_id,
                        headers: Some(modify_headers(request.headers.clone(), post_len)),
                        post_data: Some(BASE64_STANDARD.encode(post_data)),
                        intercept_response: None,
                        method: None,
                        url: None,
                    }
                ))
            } else {
                RequestPausedDecision::Continue(None)
            }
        },
    ))?;
    let index_list_clone = index_list.clone();
    tab.register_response_handling("GetImageIndex", Box::new(move |event, fetch_body| {
        let url = event.response.url;
        if url.contains("GetImageIndex") {
            // println!("GetImageIndex: {url}");
            let body_raw = loop {
                match fetch_body() {
                    Ok(v) => break v.body,
                    Err(_) => { thread::sleep(Duration::from_millis(50)) }
                }
            };
            let body: ImageIndexResponse = serde_json::from_str(&body_raw).unwrap();
            if body.code != 0 { log::error!("GetImageIndex is not ok: {}", body.msg); return; }
            let mut index_list = Vec::<Index>::new();
            for (index, item) in body.data.images.iter().enumerate() {
                let id = get_url_id(&item.path);
                if let Some(id) = id {
                    index_list.push(Index {
                        id,
                        buffer_length: 0,
                        index: index + 1,
                        mark: false
                    });
                } else { log::error!("Failed to parse id from GetImageIndex Path: {}", item.path) }
            }
            let mut lock = index_list_clone.write().unwrap();
            mem::swap(&mut *lock, &mut index_list);
        }
    }))?;
    let index_list_clone = index_list.clone();
    tab.register_response_handling("mangaup.hdslb.com", Box::new(move |event, _| {
        let url = event.response.url;
        let headers = event.response.headers.0.unwrap();
        if url.contains("mangaup.hdslb.com") {
            // println!("mangaup.hdslb.com: {url}");
            let id = get_url_id(&url);
            if let Some(id) = id {
                let mut lock = index_list_clone.write().unwrap();
                let index = lock.iter_mut().find(|v| v.id == id);
                if let Some(index) = index {
                    let length = headers.get("Content-Length").and_then(|v| v.as_str());
                    index.buffer_length = length.unwrap_or("0").parse().unwrap_or(0);
                } else { log::error!("No index for {id} found") }
            } else { log::error!("Failed to parse id from mangaup.hdslb.com URL: {url}") }
        }
    }))?;
    let index_list_clone = index_list.clone();
    tab.register_response_handling("blob", Box::new(move |event, fetch_body| {
        let url = event.response.url;
        if url.starts_with("blob:") {
            // println!("blob: {url}");
            let body_raw = loop {
                match fetch_body() {
                    Ok(v) => break v.body,
                    Err(_) => { thread::sleep(Duration::from_millis(50)) }
                }
            };
            let buffer = match BASE64_STANDARD.decode(&body_raw) {
                Ok(bytes) => Arc::new(bytes),
                Err(err) => { log::error!("Base64 decode failed: {}", err); return; }
            };
            let mut lock = index_list_clone.write().unwrap();
            let index = lock.iter_mut().find(|v|
                v.buffer_length.saturating_sub(buffer.len()) == 70
                || v.buffer_length == buffer.len()
            );
            if let Some(index) = index {
                let output = down_dir.join(format!("{}_{}.jpg", index.index, index.id));
                index.mark = true;
                let buffer_clone = buffer.clone();
                fs::write(&output, &*buffer_clone).unwrap();
            } else { log::error!("No index for {url} found") }
        }
    }))?;
    let raw_cookies = cookies::load_raw().await?;
    let cookies = raw_cookies.into_iter().map(
        |model| CookieParam::from_with(&model, Some(".bilibili.com"))
    ).collect::<Vec<CookieParam>>();
    tab.set_cookies(cookies)?;
    tab.navigate_to(&format!("https://manga.bilibili.com/mc{id}/{ep}"))?;
    auto_refresh(&tab, &index_list).await?;
    Ok(())
}