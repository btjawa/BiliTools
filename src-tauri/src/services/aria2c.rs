use anyhow::{anyhow, Context, Result};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    net::TcpListener,
    path::PathBuf,
    sync::{Arc, LazyLock},
    time::Duration,
};
use tauri::{
    async_runtime::{self, Receiver},
    Manager,
};
use tauri_plugin_http::reqwest::{self, Client};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};
use tokio::{fs, sync::RwLock, time::sleep};

use crate::{
    shared::{get_app_handle, process_err, random_string, Sidecar, USER_AGENT, WORKING_PATH},
    storage::config,
    TauriError, TauriResult,
};

use super::queue::{handlers::SubTaskReq, runtime::CtrlHandle};

static ARIA2_RPC: LazyLock<Aria2Rpc> = LazyLock::new(Aria2Rpc::new);

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
    error: Option<Aria2Error>,
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
    error_message: Option<String>,
}

struct Aria2Rpc {
    client: Client,
    child: RwLock<Option<CommandChild>>,
    endpoint: RwLock<Option<String>>,
    secret: RwLock<Option<String>>,
}

impl Aria2Rpc {
    pub fn new() -> Self {
        let client = Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(3))
            .connect_timeout(Duration::from_secs(1))
            .pool_max_idle_per_host(2)
            .pool_idle_timeout(Duration::from_secs(10))
            .tcp_keepalive(Duration::from_secs(30))
            .http1_only()
            .build()
            .expect("Failed to build aria2c client");

        Self {
            client,
            child: Default::default(),
            endpoint: Default::default(),
            secret: Default::default(),
        }
    }
    pub async fn update(&self, child: CommandChild, port: u16, secret: String) -> Result<()> {
        let endpoint = format!("http://127.0.0.1:{port}/jsonrpc");
        *self.child.write().await = Some(child);
        *self.endpoint.write().await = Some(endpoint);
        *self.secret.write().await = Some(secret);
        Ok(())
    }
    pub async fn request<T: DeserializeOwned>(
        &self,
        action: &str,
        mut params: Vec<Value>,
    ) -> TauriResult<T> {
        let Some(endpoint) = self.endpoint.read().await.clone() else {
            return Err(anyhow!("No endpoint found for requesting aria2c rpc").into());
        };
        let Some(secret) = self.secret.read().await.clone() else {
            return Err(anyhow!("No secret found for requesting aria2c rpc").into());
        };

        params.insert(0, Value::String(format!("token:{secret}")));
        let payload = json!({
            "jsonrpc": "2.0",
            "id": "1",
            "method": format!("aria2.{action}"),
            "params": params,
        });
        let response = self.client.post(endpoint).json(&payload).send().await?;

        let body: Aria2Resp<T> = response
            .json()
            .await
            .context("Failed to decode aria2c JsonRPC response")?;

        if let Some(e) = body.error {
            return Err(TauriError::new(e.message, Some(e.code)));
        }

        body.result
            .ok_or(anyhow!("Failed to get result in Aria2 RPC Response").into())
    }
}

async fn daemon(name: &'static str, pid: u32, rx: &mut Receiver<CommandEvent>) {
    let app = get_app_handle();
    #[cfg(target_os = "windows")]
    let cmd = (
        "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
        [
            "-Command",
            &format!(
                "while ((Get-Process -Id {} -ErrorAction SilentlyContinue) -ne $null) \
            {{ Start-Sleep -Milliseconds 500 }}; Stop-Process -Id {} -Force",
                std::process::id(),
                pid
            ),
        ],
    );
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    let cmd = (
        "/bin/bash",
        [
            "-c",
            &format!(
                "while kill -0 {} 2>/dev/null; do sleep 0.5; done; kill {}",
                std::process::id(),
                pid
            ),
        ],
    );
    let _ = app.shell().command(cmd.0).args(cmd.1).spawn();
    let mut stderr = Vec::<String>::with_capacity(50);

    let mut daemon = std::pin::pin!(async {
        loop {
            if let Err(e) = ARIA2_RPC.request::<Value>("getGlobalStat", vec![]).await {
                process_err(&e, name);
            }
            sleep(Duration::from_secs(3)).await;
        }
    });
    loop {
        tokio::select! {
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
                    if !line.trim().is_empty() {
                        log::warn!("{name} STDERR: {line}");
                        stderr.push(line.into());
                        if stderr.len() > 50 {
                            stderr.remove(0);
                        }
                    }
                },
                CommandEvent::Error(line) => {
                    log::error!("{name} ERROR: {line}");
                    if !line.trim().is_empty() {
                        stderr.push(line.into());
                        if stderr.len() > 50 {
                            stderr.remove(0);
                        }
                    }
                },
                CommandEvent::Terminated(msg) => {
                    let code = msg.code.unwrap_or(-1);
                    process_err(&format!("Process {name} ({pid}) exited ({code})\nSee logs for more infos."), name);
                    log::error!("{name} exited with following STDERR:\n {}", stderr.join("\n"));
                    break;
                },
                _ => ()
            }
        }
    }
}

pub async fn init() -> Result<()> {
    let l = TcpListener::bind(("127.0.0.1", 0))?;
    let port = l.local_addr()?.port();
    log::info!("Found a free port for aria2c: {port}");
    drop(l);

    let secret_r = random_string(8);
    let secret = &secret_r;

    let session_file = WORKING_PATH.join("aria2.session");
    if !session_file.exists() {
        fs::write(&session_file, [])
            .await
            .context("Failed to write session_file")?;
    }
    let session_file = session_file.to_string_lossy();
    let cfg = config::read();

    let app = get_app_handle();
    let log_file = app.path().app_log_dir()?.join("aria2.log");
    let log_file = log_file.to_string_lossy();
    let (mut rx, child) = app
        .shell()
        .sidecar(cfg.sidecar(Sidecar::Aria2c))?
        .args([
            "--enable-rpc".into(),
            "--rpc-listen-all=false".into(),
            "--disable-ipv6=true".into(),
            "--log-level=warn".into(),
            "--pause=true".into(),
            "--referer=https://www.bilibili.com/".into(),
            "--header=Origin: https://www.bilibili.com".into(),
            format!("--max-download-limit={}K", cfg.speed_limit),
            format!("--input-file={session_file}"),
            format!("--save-session-interval={}", 5),
            format!("--save-session={session_file}"),
            format!("--user-agent={USER_AGENT}"),
            format!("--rpc-listen-port={port}"),
            format!("--rpc-secret={secret}"),
            format!("--log={log_file}"),
        ])
        .spawn()?;

    let pid = child.pid();
    ARIA2_RPC.update(child, port, secret_r).await?;
    async_runtime::spawn(async move {
        daemon("aria2c", pid, &mut rx).await;
    });
    Ok(())
}

pub async fn cancel(gid: &str) -> TauriResult<()> {
    let _ = ARIA2_RPC
        .request::<Value>("purgeDownloadResult", vec![json!(gid)])
        .await;
    let _ = ARIA2_RPC
        .request::<Value>("removeDownloadResult", vec![json!(gid)])
        .await;
    let _ = ARIA2_RPC
        .request::<Value>("forceRemove", vec![json!(gid)])
        .await;
    Ok(())
}

pub async fn pause(gid: &str) -> TauriResult<()> {
    ARIA2_RPC
        .request::<Value>("pause", vec![json!(gid)])
        .await?;
    Ok(())
}

pub async fn resume(gid: &str) -> TauriResult<()> {
    ARIA2_RPC
        .request::<Value>("unpause", vec![json!(gid)])
        .await?;
    Ok(())
}

pub async fn download(
    req: &SubTaskReq,
    ctrl: Arc<CtrlHandle>,
    urls: &Vec<String>,
) -> TauriResult<PathBuf> {
    let gid = &req.subtask.id;
    let sub = &req.subtask;

    let url = reqwest::Url::parse(&urls[0])?;
    let name = url
        .path_segments()
        .ok_or(anyhow!("Failed to get path segments: {url:?}"))?
        .next_back()
        .ok_or(anyhow!("Failed to get file name: {url:?}"))?;
    let output = req.temp.join(name);
    let result = ARIA2_RPC
        .request::<Aria2TellStatus>("tellStatus", vec![json!(gid)])
        .await;

    match result {
        Ok(v) => match v.status.as_str() {
            "complete" => {
                let total = v.total_length.parse::<u64>()?;
                log::info!("aria2c task#{gid} already completed with total {total}");
                sub.send(total, total).await?;
                return Ok(output);
            }
            "paused" => {
                log::info!("aria2c task#{gid} paused, resuming...");
                ARIA2_RPC
                    .request::<Value>("unpause", vec![json!(gid)])
                    .await?;
            }
            _ => {
                log::info!("aria2c task#{gid} state: {}", v.status);
            }
        },
        Err(_) => {
            log::info!("aria2c task#{gid} not found, adding uri...");
            ARIA2_RPC
                .request::<Value>(
                    "addUri",
                    vec![
                        json!(urls),
                        json!({"dir": req.temp, "out": name, "gid": gid}),
                    ],
                )
                .await?;
        }
    };

    let gid_str = gid.to_string();
    ctrl.reg_cleaner(async move {
        cancel(&gid_str).await?;
        Ok(())
    })
    .await;

    loop {
        let data = ARIA2_RPC
            .request::<Aria2TellStatus>("tellStatus", vec![json!(gid)])
            .await?;
        if let Some(code) = data.error_code {
            let code = code.parse::<isize>()?;
            if code != 0 && code != 31 {
                return Err(TauriError::new(
                    data.error_message.unwrap_or_default(),
                    Some(code),
                ));
            }
        }
        let content = data.total_length.parse::<u64>()?;
        let chunk = data.completed_length.parse::<u64>()?;
        match data.status.as_str() {
            "active" => {
                if chunk == 0 {
                    continue;
                }
                sub.send(content, chunk).await?;
            }
            "complete" => {
                sub.send(content, content).await?;
                break;
            }
            _ => (),
        }
        sleep(Duration::from_secs(1)).await;
    }
    Ok(output)
}
