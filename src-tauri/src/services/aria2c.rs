use std::{collections::VecDeque, net::{SocketAddr, TcpListener}, path::PathBuf, sync::{Arc, RwLock as StdRwLock}, time::Duration};
use tauri::{async_runtime::{self, Receiver}, http::StatusCode, ipc::Channel, Manager};
use tauri_plugin_shell::{process::{CommandChild, CommandEvent}, ShellExt};
use tokio::{sync::{mpsc, RwLock}, time::sleep, fs};
use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use sea_orm::FromJsonQueryResult;
use tauri_plugin_http::reqwest;
use serde_json::{json, Value};
use lazy_static::lazy_static;
use tauri_specta::Event;
use specta::Type;

use crate::{
    downloads, errors::TauriResult, ffmpeg, shared::{
        get_app_handle, init_client_no_proxy, process_err, random_string, SidecarError, CONFIG, READY, SECRET, USER_AGENT, WORKING_PATH
    }, TauriError
};

lazy_static! {
    pub static ref QUEUE_MANAGER: QueueManager = QueueManager::new();
    static ref ARIA2C_PORT: Arc<StdRwLock<u16>> = Arc::new(StdRwLock::new(0));
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult, Type)]
pub struct QueueInfo {
    pub id: String,
    pub tasks: Vec<Task>,
    pub output: PathBuf,
    pub temp_dir: PathBuf,
    pub info: Arc<ArchiveInfo>,
    pub select: CurrentSelect,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
pub struct Timestamp {
    pub millis: u64,
    pub string: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
pub struct Task {
    pub urls: Option<Vec<String>>,
    pub gid: Option<String>,
    #[serde(rename = "taskType")]
    pub task_type: TaskType,
    pub path: Option<PathBuf>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
pub struct ArchiveInfo {
    pub title: String,
    pub desc: String,
    pub tags: Vec<String>,
    pub artist: String,
    pub pubtime: String,
    pub cover: String,
    pub ts: Timestamp,
    pub output_dir: String,
    pub filename: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
pub struct CurrentSelect {
    pub dms: Option<String>,
    pub ads: Option<String>,
    pub cdc: Option<String>,
    pub fmt: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum QueueType {
    Waiting,
    Doing,
    Complete,
}

#[derive(Clone, Serialize, Type, Event)]
#[serde(tag = "type")]
pub enum QueueEvent {
    Waiting {
        data: VecDeque<Arc<QueueInfo>>
    },
    Doing {
        data: VecDeque<Arc<QueueInfo>>
    },
    Complete {
        data: VecDeque<Arc<QueueInfo>>
    },
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(tag = "status")]
pub enum DownloadEvent {
    Started {
        id: Arc<String>,
        gid: Arc<String>,
        #[serde(rename = "taskType")]
        task_type: TaskType,
    },
    Progress {
        id: Arc<String>,
        gid: Arc<String>,
        #[serde(rename = "contentLength")]
        content_length: u64,
        #[serde(rename = "chunkLength")]
        chunk_length: u64,
    },
    Finished {
        id: Arc<String>,
        gid: Arc<String>,
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum TaskType {
    Video,
    Audio,
    Merge,
    Metadata,
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

#[derive(Debug, Serialize, Deserialize)]
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

pub struct QueueManager {
    waiting_queue: RwLock<VecDeque<Arc<QueueInfo>>>,
    doing_queue: RwLock<VecDeque<Arc<QueueInfo>>>,
    complete_queue: RwLock<VecDeque<Arc<QueueInfo>>>,
}

impl QueueManager {
    pub fn new() -> Self {
        Self {
            waiting_queue: RwLock::new(VecDeque::new()),
            doing_queue: RwLock::new(VecDeque::new()),
            complete_queue: RwLock::new(VecDeque::new()),
        }
    }
    pub async fn get_len(&self, queue_type: QueueType) -> usize {
        match queue_type {
            QueueType::Waiting => self.waiting_queue.read().await.len(),
            QueueType::Doing => self.doing_queue.read().await.len(),
            QueueType::Complete => self.complete_queue.read().await.len(),
        }
    }
    pub async fn update(&self, queue_type: QueueType) {
        match queue_type {
            QueueType::Waiting => QueueEvent::Waiting {
                data: self.waiting_queue.read().await.clone(),
            },
            QueueType::Doing => QueueEvent::Doing {
                data: self.doing_queue.read().await.clone(),
            },
            QueueType::Complete => QueueEvent::Complete {
                data: self.complete_queue.read().await.clone(),
            },
        }.emit(&get_app_handle()).unwrap()
    }
    pub async fn push_back(&self, info: Arc<QueueInfo>, queue_type: QueueType) -> Result<()> {
        let mut guard = match queue_type {
            QueueType::Waiting => self.waiting_queue.write().await,
            QueueType::Doing => self.doing_queue.write().await,
            QueueType::Complete => self.complete_queue.write().await,
        };
        guard.push_back(info);
        drop(guard);
        Ok(())
    }
    pub async fn retain(&self, queue_type: QueueType, id: String) -> Result<()> {
        let mut guard = match queue_type {
            QueueType::Waiting => self.waiting_queue.write().await,
            QueueType::Doing => self.doing_queue.write().await,
            QueueType::Complete => self.complete_queue.write().await,
        };
        guard.retain(|task| *task.id != id);
        drop(guard);
        self.update(queue_type).await;
        Ok(())
    }
    async fn waiting_to_doing(&self) -> Result<Option<Arc<QueueInfo>>> {
        let mut waiting_queue = self.waiting_queue.write().await;
        if let Some(info) = waiting_queue.pop_front() {
            drop(waiting_queue);
            self.push_back(info.clone(), QueueType::Doing).await?;
            self.update(QueueType::Waiting).await;
            self.update(QueueType::Doing).await;
            return Ok(Some(info));
        }
        Ok(None)
    }
    async fn doing_to_complete(&self, info: Arc<QueueInfo>) -> Result<()> {
        self.retain(QueueType::Doing, info.id.clone()).await?;
        self.push_back(info, QueueType::Complete).await?;
        self.update(QueueType::Doing).await;
        self.update(QueueType::Complete).await;
    Ok(())
    }
}

struct DownloadManager {
    event: Channel<DownloadEvent>,
}

impl DownloadManager {
    pub fn new(event: Channel<DownloadEvent>) -> Self {
        Self { event }
    }
    pub async fn process_tasks(
        self: Arc<Self>, 
        tx: Arc<mpsc::Sender<Result<Arc<QueueInfo>, TauriError>>>, 
    ) -> Result<()> {
        let max_conc = CONFIG.read().unwrap().max_conc;
        let doing_len = QUEUE_MANAGER.get_len(QueueType::Doing).await;
        for _ in 0..(max_conc - doing_len) {
            let self_cloned = self.clone();
            let tx_cloned = tx.clone();
            if let Some(info) = QUEUE_MANAGER.waiting_to_doing().await? {
                let task = async move {
                    self_cloned.process(&info).await?;
                    downloads::insert(info.clone()).await?;
                    QUEUE_MANAGER.doing_to_complete(info.clone()).await?;
                    fs::remove_dir_all(&info.temp_dir).await?;
                    Ok::<Arc<QueueInfo>, TauriError>(info)
                };
                async_runtime::spawn(async move {
                    tx_cloned.send(task.await).await.context("Failed to send task result")?;
                    Ok::<(), TauriError>(())
                });
            } else {
                break;
            }
        }
        Ok(())
    }
    async fn process(&self, info: &Arc<QueueInfo>) -> TauriResult<()> {
        let mut path = PathBuf::new();
        if &info.tasks[0].task_type == &TaskType::Metadata {
            return Err(anyhow!("Metadata task cannot appear as the first task").into());
        }
        for task in info.tasks.iter() {
            match task.task_type {
                TaskType::Merge => ffmpeg::merge(info, &self.event).await?,
                TaskType::Metadata => ffmpeg::add_metadata(info, path, &self.event).await?,
                _ => self.download(info, task).await?
            };
            path = task.path.clone().unwrap();
        }
        Ok(())
    }
    async fn download(&self, info: &Arc<QueueInfo>, task: &Task) -> TauriResult<()> {
        let id = Arc::new(info.id.clone());
        let gid = Arc::new(task.gid.as_ref().unwrap().clone());
        let body: Aria2General = serde_json::from_value(
            post_aria2c("unpause", vec![json!(gid)]).await?
        ).context("Failed to decode aria2c unpause response")?;
        if let Some(err) = body.error {
            QUEUE_MANAGER.retain(QueueType::Doing, (*id).clone()).await?;
            return Err(TauriError::new(err.message, Some(err.code)));
        }
        self.event.send(DownloadEvent::Started {
            id: id.clone(), gid: gid.clone(), task_type: task.task_type.clone()
        })?;
        loop {
            let body: Aria2TellStatus = serde_json::from_value(
                post_aria2c("tellStatus", vec![json!(gid)]).await?
            ).context("Failed to decode aria2c tellStatus response")?;
            if let Some(error) = body.error {
                if error.code == 1 {
                    break;
                }
                return Err(TauriError::new(error.message, Some(error.code)));
            }
            if let Some(data) = body.result {
                if let Some(code) = data.error_code {
                    let code = code.parse::<isize>()?;
                    if code != 0 && code != 31 {
                        QUEUE_MANAGER.retain(QueueType::Doing, (*id).clone()).await?;
                        return Err(TauriError::new(
                            data.error_message.unwrap_or(String::new()), Some(code)
                        ));
                    }
                }
                match data.status.as_str() {
                    "active" => {
                        self.event.send(DownloadEvent::Progress {
                            id: id.clone(), gid: gid.clone(),
                            content_length: data.total_length.parse::<u64>()?,
                            chunk_length: data.completed_length.parse::<u64>()?,
                        })?;
                    },
                    "complete" => {
                        self.event.send(DownloadEvent::Finished { id: id.clone(), gid: gid.clone() })?;
                        break;
                    },
                    "paused" => (),
                    _ => break,
                }
            }
            sleep(Duration::from_millis(100)).await;
        }
        Ok(())
    }
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
                }.emit(&app).unwrap();
                lock.clear();
            }
            let pid = Pid::from(pid);
            if process_alive::state(pid) != State::Alive {
                break SidecarError {
                    name: name.clone(), error: format!("Process {name} ({pid}) is dead")
                }.emit(&app).unwrap();
            }
            if let Err(e) = post_aria2c("getGlobalStat", vec![]).await {
                SidecarError {
                    name: name.clone(), error: e.message
                }.emit(&app).unwrap();
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

pub async fn post_aria2c(action: &str, params: Vec<Value>) -> TauriResult<Value> {
    let client = init_client_no_proxy().await?;
    let mut params_vec = vec![Value::String(format!("token:{}", *SECRET.read().unwrap()))];
    for param in params {
        let value = match param {
            Value::String(s) => Ok(Value::String(s)),
            Value::Number(n) => Ok(Value::Number(n)),
            Value::Bool(b) => Ok(Value::Bool(b)),
            Value::Array(arr) => Ok(Value::Array(arr)),
            Value::Object(obj) => Ok(Value::Object(obj)),
            _ => Err(anyhow!("Unsupported type")),
        }?;
        params_vec.push(value);
    }
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

    Ok(body)
}

fn check_breakpoint(
    input: &PathBuf,
    start: &String
) -> Result<Option<PathBuf>> {
    let dirs = std::fs::read_dir(input)?;
    for dir in dirs {
        let dir = dir?;
        let path = dir.path();
        let name = path.file_name().and_then(|v| v.to_str()).unwrap_or("");
        if !dir.file_type()?.is_dir() || !name.starts_with(start) {
            continue;
        }
        let has_aria2 = std::fs::read_dir(&path)?
            .filter_map(|v| v.ok())
            .any(|file| file.path().extension() == Some("aria2".as_ref()));
        if has_aria2 {
            return Ok(Some(path));
        }
    }
    Ok(None)
}

#[tauri::command(async)]
#[specta::specta]
pub async fn push_back_queue(
    info: Arc<ArchiveInfo>,
    select: CurrentSelect,
    tasks: Vec<Task>,
    output_dir: Option<String>,
) -> TauriResult<PathBuf> {
    let temp_dir = { CONFIG.read().unwrap().temp_dir.join("com.btjawa.bilitools") };
    fs::create_dir_all(&temp_dir).await.context("Failed to create app temp dir")?;
    let mut parent = if let Some(dir) = &output_dir {
        PathBuf::from(dir)
    } else {
        CONFIG.read().unwrap().down_dir.join(
            format!("{}_{}", info.output_dir, info.ts.string)
        )
    };
    if parent.exists() && output_dir.is_none() {
        let mut count = 1;
        let original = parent.clone();
        while parent.exists() {
            parent = original.with_file_name(format!(
                "{}_{count}",
                original.file_name().unwrap().to_string_lossy(),
            ));
            count += 1;
        }
    }
    let id = random_string(16);
    let dir_name = format!("{}_{}", &id, info.ts.millis);
    let temp_dir = check_breakpoint(&temp_dir, &dir_name)?
        .unwrap_or(temp_dir.join(dir_name));

    let dir = temp_dir.clone();
    let mut queue_info = QueueInfo {
        id,
        tasks,
        output: parent.join(&info.filename),
        temp_dir,
        info: info.clone(),
        select,
    };
    for task in &mut queue_info.tasks {
        if task.urls.is_none() { // Non-download task
            task.gid = Some(random_string(16));
            task.path = Some(dir.join(&info.filename));
            continue;
        }
        let urls = task.urls.clone().unwrap();
        let parsed_url = reqwest::Url::parse(&urls[0])?;
        let name = parsed_url.path_segments().unwrap().last().unwrap();
        let params = vec![json!(urls), json!({ "dir": dir, "out": name, "pause": "true" })];
        let body: Aria2General = serde_json::from_value(
            post_aria2c("addUri", params).await?
        ).context("Failed to decode aria2c addUri response")?;
        if let Some(error) = body.error {
            return Err(TauriError::new(error.message, Some(error.code)));
        }
        let gid = body.result.unwrap_or(String::new());
        task.gid = Some(gid);
        task.path = Some(dir.join(name));
    }
    QUEUE_MANAGER.push_back(Arc::new(queue_info), QueueType::Waiting).await?;
    QUEUE_MANAGER.update(QueueType::Waiting).await;
    fs::create_dir_all(&parent).await.context("Failed to create output folder")?;
    Ok(parent)
}

#[tauri::command(async)]
#[specta::specta]
pub async fn process_queue(event: Channel<DownloadEvent>) -> TauriResult<()> {
    let manager = Arc::new(DownloadManager::new(event));
    let (result_tx, mut result_rx) = mpsc::channel::<Result<Arc<QueueInfo>, TauriError>>(100);
    let tx_arc = Arc::new(result_tx);
    loop {
        if QUEUE_MANAGER.get_len(QueueType::Waiting).await > 0 {
            manager.clone().process_tasks(tx_arc.clone()).await?;
        }
        tokio::select! {
            Some(result) = result_rx.recv() => {
                match result {
                    Err(e) => { process_err(e, "aria2c"); },
                    Ok(r) => if QUEUE_MANAGER.get_len(QueueType::Doing).await == 0 {
                        let parent = r.output.parent().unwrap().to_string_lossy();
                        break notifica::notify("BiliTools", &format!("{parent}\nDownload Complete."))?;
                    }
                }
            }
            else => ()
        }
    }
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn remove_task(id: String, queue_type: QueueType, gid: Option<String>) -> TauriResult<()> {
    match queue_type {
        QueueType::Complete => {
            downloads::delete(id.clone()).await?;
        },
        _ => {
            if let Some(gid) = gid {
                let body: Aria2General = serde_json::from_value(
                    post_aria2c("remove", vec![json!(gid)]).await?
                ).context("Failed to decode aria2c remove response")?;
                if let Some(error) = body.error {
                    return Err(TauriError::new(error.message, Some(error.code)));
                }
            }
        }
    }
    QUEUE_MANAGER.retain(queue_type, id).await?;
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn toggle_pause(pause: bool, gid: String) -> TauriResult<()> {
    let action = if pause { "pause" } else { "unpause" };
    let body: Aria2General = serde_json::from_value(
        post_aria2c(action, vec![json!(gid)]).await?
    )?;
    if let Some(error) = body.error {
        return Err(TauriError::new(error.message, Some(error.code)));
    }
    Ok(())
}