use std::{net::TcpListener, path::PathBuf, sync::{Arc, LazyLock}, time::Duration};
use tauri_plugin_shell::{process::{CommandChild, CommandEvent}, ShellExt};
use tauri::{async_runtime::{self, Receiver}, http::StatusCode, Manager};
use tokio::{fs, sync::{mpsc::Sender, RwLock}, time::sleep};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use tauri_plugin_http::reqwest::{self, Client};
use anyhow::{anyhow, Context, Result};
use serde_json::{json, Value};
use tauri_specta::Event;

use crate::{
    config, errors::TauriError, shared::{
        get_app_handle, get_ts, SidecarError, SECRET, USER_AGENT, WORKING_PATH
    }, TauriResult
};

static ARIA2_RPC: LazyLock<Arc<Aria2Rpc>> = LazyLock::new(||
    Arc::new(Aria2Rpc::new())
);

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Aria2Error {
    code: isize,
    message: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Aria2Resp<T> {
    id: Value,
    jsonrpc: String,
    result: Option<T>,
    error: Option<Aria2Error>
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct Aria2TellStatus {
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

#[derive(Clone)]
struct Aria2Inner {
    client: Client,
    endpoint: String,
    secret: String,
}

struct Aria2Rpc {
    inner: RwLock<Option<Aria2Inner>>
}

impl Aria2Rpc {
    pub fn new() -> Self {
        Self { inner: RwLock::new(None) }
    }
    pub async fn update(&self, port: u16, secret: String) -> Result<()> {
        let client = Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(5))
            .connect_timeout(Duration::from_secs(1))
            .pool_max_idle_per_host(2)
            .pool_idle_timeout(Duration::from_secs(10))
            .tcp_keepalive(Duration::from_secs(30))
            .http1_only()
            .build()?;
        let endpoint = format!("http://127.0.0.1:{port}/jsonrpc");
        *self.inner.write().await = Some(Aria2Inner {
            client, endpoint, secret
        });
        Ok(())
    }
    pub async fn request<T: DeserializeOwned + std::fmt::Debug>(
        &self,
        action: &str,
        mut params: Vec<Value>
    ) -> TauriResult<T> {
        let inner = self.inner.read().await.clone().ok_or_else(|| anyhow!("Aria2 RPC not ready"))?;
        params.insert(0, Value::String(format!("token:{}", inner.secret)));
        let payload = json!({
            "jsonrpc": "2.0",
            "id": "1",
            "method": format!("aria2.{action}"),
            "params": params,
        });
        let response = inner.client
            .post(&inner.endpoint)
            .json(&payload).send().await?;

        if response.status() != StatusCode::OK {
            return Err(TauriError::new(
                "Error while fetching Aria2 RPC Response",
                Some(response.status())
            ));
        }

        let body: Aria2Resp<T> = response.json().await
            .context("Failed to decode aria2c JsonRPC response")?;

        if let Some(e) = body.error {
            return Err(TauriError::new(e.message, Some(e.code)));
        }

        body.result.ok_or(anyhow!("Failed to get result in Aria2 RPC Response").into())
    }
}

async fn daemon(name: String, child: &CommandChild, rx: &mut Receiver<CommandEvent>) {
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
    let mut stderr: Vec<String> = vec![];

    let mut daemon = Box::pin(async {
        let name_clone = &name;
        loop {
            if let Err(e) = ARIA2_RPC.request::<Value>("getGlobalStat", vec![]).await {
                let _ = SidecarError {
                    name: name_clone.clone(), error: e.message
                }.emit(app);
            }
            sleep(Duration::from_secs(5)).await;
        }
    });
    loop { tokio::select! {
        _ = &mut daemon => break,
        Some(msg) = rx.recv() => match msg {
            CommandEvent::Stdout(line) => {
                let line = String::from_utf8_lossy(&line);
                if !line.trim().is_empty() {
                    log::info!("{name} STDOUT: {line}");
                }
            },
            CommandEvent::Stderr(line) => {
                let line = String::from_utf8_lossy(&line);
                log::warn!("{name} STDERR: {line}");
                stderr.push(line.into());
            },
            CommandEvent::Error(line) => {
                log::error!("{name} ERROR: {line}");
            },
            CommandEvent::Terminated(msg) => {
                let code = msg.code.unwrap_or(0);
                let _ = SidecarError {
                    name: name.clone(), error: format!("Process {name} ({pid}) exited ({code})\nSee logs for more infos.")
                }.emit(app);
                log::error!("{name} exited with following STDERR:\n {}", stderr.join("\n"));
                break;
            },
            _ => ()
        }
    } }
}

pub async fn init() -> Result<()> {
    let l = TcpListener::bind(("127.0.0.1", 0))?;
    let port = l.local_addr()?.port();
    log::info!("Found a free port for aria2c: {port}");
    drop(l);

    ARIA2_RPC.update(port, SECRET.clone()).await?;

    let app = get_app_handle();
    let session_file = WORKING_PATH.join("aria2.session");
    if !session_file.exists() {
        fs::write(&session_file, []).await.context("Failed to write session_file")?;
    }
    let session_file = session_file.to_string_lossy();

    let log_file = app.path().app_log_dir()?.join("aria2.log");
    let log_file = log_file.to_string_lossy();
    let (mut rx, child) = app.shell().sidecar("aria2c")?
    .args([
        "--enable-rpc".into(),
        "--rpc-listen-all=false".into(),
        "--disable-ipv6=true".into(),
        "--log-level=warn".into(),
        "--referer=https://www.bilibili.com/".into(),
        "--header=Origin: https://www.bilibili.com".into(),
        format!("--input-file={session_file}"),
        format!("--save-session-interval={}", 5),
        format!("--save-session={session_file}"),
        format!("--user-agent={USER_AGENT}"),
        format!("--rpc-listen-port={port}"),
        format!("--rpc-secret={}", &*SECRET),
        format!("--log={log_file}"),
    ]).spawn()?;
    async_runtime::spawn(async move {
        daemon("aria2c".into(), &child, &mut rx).await;
    });
    Ok(())
}

pub async fn cancel(gid: Arc<String>) -> TauriResult<()> {
    ARIA2_RPC.request::<Value>("forceRemove", vec![json!(gid)]).await?;
    Ok(())
}

pub async fn pause(gid: Arc<String>) -> TauriResult<()> {
    ARIA2_RPC.request::<Value>("pause", vec![json!(gid)]).await?;
    Ok(())
}

pub async fn resume(gid: Arc<String>) -> TauriResult<()> {
    ARIA2_RPC.request::<Value>("unpause", vec![json!(gid)]).await?;
    Ok(())
}

async fn check_breakpoint(
    root: &PathBuf,
    folder: &String
) -> Result<Option<PathBuf>> {
    let mut dirs = fs::read_dir(root).await?;
    while let Some(dir) = dirs.next_entry().await? {
        let path = dir.path();
        let name = path.file_name()
            .and_then(|v| v.to_str())
            .ok_or(anyhow!("Failed to get file name: {path:?}"))?;
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

pub async fn download(gid: Arc<String>, tx: Arc<Sender<(u64, u64)>>, urls: Vec<String>) -> TauriResult<PathBuf> {
    let temp_root = config::read().temp_dir();
    let temp_dir = format!("{gid}_{}", get_ts(true));
    let dir = check_breakpoint(&temp_root, &temp_dir).await?
        .unwrap_or(temp_root.join(temp_dir));
    fs::create_dir_all(&dir).await.context("Failed to create temp dir")?;

    let url = reqwest::Url::parse(&urls[0])?;
    let name = url.path_segments()
        .ok_or(anyhow!("Failed to get path segments: {url:?}"))?
        .last().ok_or(anyhow!("Failed to get file name: {url:?}"))?;

    let params = vec![
        json!(urls),
        json!({
            "dir": dir,
            "out": name,
            "gid": gid,
        })
    ];
    ARIA2_RPC.request::<Value>("addUri", params).await?;
    loop {
        let data = ARIA2_RPC.request::<Aria2TellStatus>("tellStatus", vec![json!(gid)]).await?;
        if let Some(code) = data.error_code {
            let code = code.parse::<isize>()?;
            if code != 0 {
                return Err(TauriError::new(
                    data.error_message.unwrap_or(String::new()),
                    Some(code)
                ));
            }
        }
        tx.try_send((
            data.total_length.parse::<u64>()?,
            data.completed_length.parse::<u64>()?
        ))?;
        if data.status.as_str() == "complete" {
            tx.try_send((
                data.total_length.parse::<u64>()?,
                data.total_length.parse::<u64>()?,
            ))?;
            break;
        }
        sleep(Duration::from_millis(500)).await;
    }
    Ok(dir.join(name))
}