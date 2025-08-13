use std::{net::{SocketAddr, TcpListener}, path::PathBuf, sync::{Arc, RwLock}, time::Duration};
use tauri_plugin_shell::{process::{CommandChild, CommandEvent}, ShellExt};
use tauri::{async_runtime::{self, Receiver}, http::StatusCode, Manager};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use tokio::{fs, sync::mpsc::Sender, time::sleep};
use anyhow::{anyhow, Context, Result};
use tauri_plugin_http::reqwest;
use serde_json::{json, Value};
use lazy_static::lazy_static;
use tauri_specta::Event;

use crate::{
    config, errors::TauriError, shared::{
        get_app_handle, get_ts, init_client_no_proxy, process_err, SidecarError, READY, SECRET, USER_AGENT, WORKING_PATH
    }, TauriResult
};

lazy_static! {
    static ref ARIA2C_PORT: Arc<RwLock<u16>> = Arc::new(RwLock::new(0));
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Aria2Error {
    code: isize,
    message: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Aria2General {
    id: String,
    jsonrpc: String,
    result: Option<String>,
    error: Option<Aria2Error>
}

#[derive(Debug, Serialize, Deserialize)]
struct Aria2TellStatus {
    id: String,
    jsonrpc: String,
    result: Option<Aria2TellStatusResult>,
    error: Option<Aria2Error>
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct Aria2TellStatusResult {
    gid: String,
    status: String,
    #[serde(rename = "totalLength")]
    total_length: String,
    #[serde(rename = "completedLength")]
    completed_length: String,
    #[serde(rename = "uploadLength")]
    upload_length: String,
    bitfield: Option<String>,
    #[serde(rename = "downloadSpeed")]
    download_speed: String,
    #[serde(rename = "uploadSpeed")]
    upload_speed: String,
    #[serde(rename = "infoHash")]
    info_hash: Option<String>,
    #[serde(rename = "numSeeders")]
    num_seeders: Option<String>,
    seeder: Option<String>,
    #[serde(rename = "pieceLength")]
    piece_length: Option<String>,
    #[serde(rename = "numPieces")]
    num_pieces: Option<String>,
    connections: String,
    #[serde(rename = "errorCode")]
    error_code: Option<String>,
    #[serde(rename = "errorMessage")]
    error_message: Option<String>
}

async fn daemon(name: String, child: &CommandChild, rx: &mut Receiver<CommandEvent>) {
    use process_alive::{State, Pid};
    let app = get_app_handle();
    let pid = child.pid();
    #[cfg(target_os = "windows")]
    let cmd = ("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", [
        "-Command",
        &format!(
            "while ((Get-Process -Id {} -ErrorAction SilentlyContinue) -ne $null) \
            {{ Start-Sleep -Milliseconds 500 }}; Stop-Process -Id {} -Force",
            std::process::id(), pid
        )
    ]);
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    let cmd = ("/bin/bash", [
        "-c",
        &format!(
            "while kill -0 {} 2>/dev/null; do sleep 0.5; done; kill {}",
            std::process::id(), pid
        )
    ]);
    let _ = app.shell().command(cmd.0).args(cmd.1).spawn();
    let stderr = Arc::new(tokio::sync::RwLock::new(String::new()));
    let stderr_clone = stderr.clone();
    async_runtime::spawn(async move {
        loop {
            if *READY.read().unwrap() {
                sleep(Duration::from_secs(3)).await;
            } else {
                while !*READY.read().unwrap() {
                    sleep(Duration::from_millis(250)).await;
                }
            }
            let mut lock = stderr_clone.write().await;
            if lock.len() > 0 {
                SidecarError {
                    name: name.clone(), error: lock.to_string()
                }.emit(app).unwrap();
                lock.clear();
            }
            let pid = Pid::from(pid);
            if process_alive::state(pid) != State::Alive {
                break SidecarError {
                    name: name.clone(), error: format!("Process {name} ({pid}) is dead")
                }.emit(app).unwrap();
            }
            if let Err(e) = post_aria2c::<Value>("getGlobalStat", vec![]).await {
                SidecarError {
                    name: name.clone(), error: e.message
                }.emit(app).unwrap();
            }
        }
    });
    while let Some(event) = rx.recv().await {
        if let CommandEvent::Stderr(line) = event {
            let line = String::from_utf8_lossy(&line);
            if !line.trim().is_empty() {
                let mut lock = stderr.write().await;
                lock.push_str(&line.to_string());
            }
        }
    }
}

pub fn init() -> Result<()> {
    let port = (6800..65535)
        .find_map(|p| TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], p))).ok())
        .ok_or(anyhow!("No free port found"))?.local_addr()?.port();
    *ARIA2C_PORT.write().unwrap() = port;
    let app = get_app_handle();
    let session_file = WORKING_PATH.join("aria2.session");
    if !session_file.exists() {
        std::fs::write(&session_file, [])
            .context("Failed to write session_file")?;
    }
    let session_file = session_file.to_string_lossy();
    let log_file = app.path().app_log_dir()?.join("aria2.log");
    let log_file = log_file.to_string_lossy();
    let (mut rx, child) = app.shell().sidecar("aria2c").map_err(|e| process_err(e, "aria2c"))?
    .args([
        "--enable-rpc".into(),
        "--log-level=warn".into(),
        "--referer=https://www.bilibili.com/".into(),
        "--header=Origin: https://www.bilibili.com".into(),
        format!("--input-file={session_file}"),
        format!("--save-session={session_file}"),
        format!("--user-agent={USER_AGENT}"),
        format!("--rpc-listen-port={port}"),
        format!("--rpc-secret={}", &SECRET.read().unwrap()),
        format!("--log={log_file}"),
    ]).spawn().map_err(|e| process_err(e, "aria2c"))?;
    async_runtime::spawn(async move {
        daemon("aria2c".into(), &child, &mut rx).await;
    });
    Ok(())
}

pub async fn post_aria2c<T: DeserializeOwned + std::fmt::Debug>(
    action: &str,
    params: Vec<Value>
) -> TauriResult<T> {
    let client = init_client_no_proxy().await?;
    let mut params_vec = vec![Value::String(format!("token:{}", *SECRET.read().unwrap()))];
    params_vec.extend(params);
    let payload = json!({
        "jsonrpc": "2.0",
        "method": format!("aria2.{action}"),
        "id": "1",
        "params": params_vec
    });
    let response = client
        .post(format!("http://127.0.0.1:{}/jsonrpc", ARIA2C_PORT.read().unwrap()))
        .timeout(Duration::from_millis(3000))
        .json(&payload).send().await?;
    if response.status() != StatusCode::OK {
        return Err(anyhow!("Error while fetching aria2c JsonRPC Response ({})", response.status()).into());
    }
    let body: Value = response.json().await
        .context("Failed to decode aria2c JsonRPC response")?;

    let result: T = serde_json::from_value(body)
        .context("Failed to deserialize response to struct")?;

    Ok(result)
}

pub async fn cancel(gid: Arc<String>) -> TauriResult<()> {
    let body = post_aria2c::<Aria2General>("forceRemove", vec![json!(gid)]).await?;
    if let Some(e) = body.error {
        return Err(TauriError::new(e.message, Some(e.code)));
    }
    Ok(())
}

pub async fn pause(gid: Arc<String>) -> TauriResult<()> {
    let body = post_aria2c::<Aria2General>("pause", vec![json!(gid)]).await?;
    if let Some(e) = body.error {
        return Err(TauriError::new(e.message, Some(e.code)));
    }
    Ok(())
}

pub async fn resume(gid: Arc<String>) -> TauriResult<()> {
    let body = post_aria2c::<Aria2General>("unpause", vec![json!(gid)]).await?;
    if let Some(e) = body.error {
        return Err(TauriError::new(e.message, Some(e.code)));
    }
    Ok(())
}

async fn check_breakpoint(
    root: &PathBuf,
    folder: &String
) -> Result<Option<PathBuf>> {
    let mut dirs = fs::read_dir(root).await?;
    while let Some(dir) = dirs.next_entry().await? {
        let path = dir.path();
        let name = path.file_name().and_then(|v| v.to_str()).unwrap();
        if !name.starts_with(folder) {
            continue;
        }
        let mut aria2 = false;
        let mut inner = fs::read_dir(&path).await?;
        while let Some(file) = inner.next_entry().await? {
            if file.path().extension().and_then(|v| v.to_str()) == Some("aria2") {
                aria2 = true;
                break;
            }
        }
        if aria2 {
            return Ok(Some(path));
        }
    }
    Ok(None)
}

pub async fn download(gid: Arc<String>, tx: Sender<(u64, u64)>, urls: Vec<String>) -> TauriResult<PathBuf> {
    let temp_root = config::read().temp_dir();
    let temp_dir = format!("{gid}_{}", get_ts(true));
    let dir = check_breakpoint(&temp_root, &temp_dir).await?
        .unwrap_or(temp_root.join(temp_dir));
    fs::create_dir_all(&dir).await.context("Failed to create temp dir")?;

    let url = reqwest::Url::parse(&urls[0])?;
    let name = url.path_segments().unwrap().last().unwrap();

    let params = vec![
        json!(urls),
        json!({
            "dir": dir,
            "out": name,
            "gid": gid,
        })
    ];

    let body = post_aria2c::<Aria2General>("addUri", params).await?;
    if let Some(e) = body.error {
        return Err(TauriError::new(e.message, Some(e.code)));
    }
    loop {
        let body = post_aria2c::<Aria2TellStatus>("tellStatus", vec![json!(gid)]).await?;
        if let Some(e) = body.error {
            return Err(TauriError::new(e.message, Some(e.code)));
        }
        if let Some(data) = body.result {
            if let Some(code) = data.error_code {
                let code = code.parse::<isize>()?;
                if code != 0 {
                    return Err(TauriError::new(
                        data.error_message.unwrap_or(String::new()),
                        Some(code)
                    ));
                }
            }
            tx.send((
                data.total_length.parse::<u64>()?,
                data.completed_length.parse::<u64>()?
            )).await?;
            if data.status.as_str() == "complete" {
                break;
            }
        }
        sleep(Duration::from_millis(100)).await;
    }
    Ok(dir.join(name))
}