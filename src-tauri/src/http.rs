use regex::Regex;
use reqwest::{header, redirect, ClientBuilder};
use serde::{Deserialize, Serialize};
use tokio::time::Duration;

#[derive(Deserialize)]
pub struct RequestOptions {
    method: String,
    url: String,
    headers: Option<Vec<(String, String)>>,
    data: Option<Vec<u8>>,
    max_redirections: Option<usize>,
    connect_timeout: Option<u64>,
}

#[derive(Serialize)]
pub struct ResponseData {
    status: u16,
    status_text: String,
    url: String,
    headers: Vec<(String, String)>,
    body: Vec<u8>,
}

#[tauri::command]
pub async fn fetch(client_config: RequestOptions) -> Result<ResponseData, String> {
    let mut builder = ClientBuilder::new();
    let patterns = [
        r"^https://.*\.bilibili\.com/.*$",
        r"^https://.*\.hdslb\.com/.*$",
    ];
    let is_match = patterns.iter().any(|pattern| {
        Regex::new(pattern)
            .map_err(|_| "Failed to compile regex pattern".to_string())
            .map(|re| re.is_match(client_config.url.as_str()))
            .unwrap_or(false)
    });
    if !is_match {
        return Err(format!("{} is not allowed.", client_config.url));
    }
    if let Some(timeout) = client_config.connect_timeout {
        builder = builder.connect_timeout(Duration::from_millis(timeout));
    }
    if let Some(max_redirections) = client_config.max_redirections {
        builder = builder.redirect(if max_redirections == 0 {
            redirect::Policy::none()
        } else {
            redirect::Policy::limited(max_redirections)
        });
    }
    let mut request = builder
        .build()
        .map_err(|e| e.to_string())?
        .request(client_config.method.parse().unwrap(), &client_config.url);
    if let Some(headers) = client_config.headers {
        let mut req_headers = header::HeaderMap::new();
        for (key, value) in headers {
            req_headers.insert(
                header::HeaderName::from_bytes(key.as_bytes()).unwrap(),
                header::HeaderValue::from_str(&value).unwrap(),
            );
        }
        request = request.headers(req_headers)
    };
    if let Some(data) = client_config.data {
        request = request.body(data);
    }
    let response = request.send().await.map_err(|e| e.to_string())?;
    let status = response.status().as_u16();
    let status_text = response
        .status()
        .canonical_reason()
        .unwrap_or_default()
        .to_string();
    let url = response.url().to_string();
    let headers = response
        .headers()
        .iter()
        .fold(Vec::new(), |mut acc, (k, v)| {
            acc.push((
                k.as_str().into(),
                String::from_utf8(v.as_bytes().to_vec())
                    .map_err(|e| e.to_string())
                    .unwrap(),
            ));
            acc
        });
    let body = response.bytes().await.map_err(|e| e.to_string())?.to_vec();
    Ok(ResponseData {
        status,
        status_text,
        url,
        headers,
        body,
    })
}
