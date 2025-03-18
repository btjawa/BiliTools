use std::{collections::VecDeque, fs, net::{SocketAddr, TcpListener}, path::PathBuf, sync::{Arc, RwLock as StdRwLock}, time::Duration};
use tauri_plugin_shell::{process::{CommandChild, CommandEvent}, ShellExt};
use tauri::{async_runtime::{self, Receiver}, ipc::Channel, Manager};
use tokio::{sync::{mpsc, RwLock}, time::sleep};
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
        filename,
        get_app_handle,
        init_client,
        random_string,
        process_err,
        RESOURCES_PATH,
        CONFIG,
        SECRET,
        READY,
        SidecarError,
    }, TauriError
};

lazy_static! {
    pub static ref QUEUE_MANAGER: QueueManager = QueueManager::new();
    static ref ARIA2C_PORT: Arc<StdRwLock<u16>> = Arc::new(StdRwLock::new(0));
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult, Type)]
pub struct QueueInfo {
    pub id: String,
    pub ts: Arc<Timestamp>,
    pub tasks: Vec<Task>,
    pub output: PathBuf,
    pub info: Arc<MediaInfoListItem>,
    #[serde(rename = "currentSelect")]
    pub current_select: CurrentSelect,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type, Event)]
pub struct Notification {
    pub id: String,
    pub info: Arc<MediaInfoListItem>
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
pub struct Timestamp {
    pub millis: u64,
    pub string: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
pub struct Task {
    pub urls: Vec<String>,
    pub gid: Option<String>,
    pub media_type: MediaType,
    pub path: Option<PathBuf>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
pub struct MediaInfoListItem {
    title: String,
    cover: String,
    desc: String,
    id: usize,
    cid: usize,
    eid: usize,
    #[serde(default)]
    duration: usize,
    ss_title: String,
    index: usize
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
pub struct CurrentSelect {
    pub dms: i32,
    pub ads: i32,
    pub cdc: i32,
    pub fmt: i32,
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
        media_type: MediaType,
    },
    Progress {
        id: Arc<String>,
        gid: Arc<String>,
        content_length: u64,
        chunk_length: u64,
    },
    Finished {
        id: Arc<String>,
        gid: Arc<String>,
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum MediaType {
    Video,
    Audio,
    Merge,
    Flac,
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
            if let Some(info) = QUEUE_MANAGER.waiting_to_doing().await? {
                let self_cloned = self.clone();
                let tx_cloned = tx.clone();
                async_runtime::spawn(async move {
                    let result = async {
                        let success = self_cloned.process(info.clone()).await?;
                        let path = info.tasks[0].clone().path.unwrap();
                        if success {
                            downloads::insert(info.clone()).await?;
                            QUEUE_MANAGER.doing_to_complete(info.clone()).await?;                    
                            if info.tasks.len() < 2 {
                                fs::rename(&path, &info.output)?;
                            }
                        }
                        fs::remove_dir_all(&path.parent().unwrap())?;
                        Ok::<Arc<QueueInfo>, TauriError>(info)
                    }.await;
                    tx_cloned.send(result).await.context("Failed to send task result")?;
                    Ok::<(), TauriError>(())
                });
            } else {
                break;
            }
        }
        Ok(())
    }
    async fn process(&self, info: Arc<QueueInfo>) -> TauriResult<bool> {
        fs::create_dir_all(info.output.parent().unwrap())?;
        let id = Arc::new(info.id.clone());
        for task in info.tasks.iter() {
            if task.media_type == MediaType::Merge {
                ffmpeg::merge(info.clone(), &self.event).await?;
                continue;
            }
            if task.media_type == MediaType::Flac {
                ffmpeg::raw_flac(info.clone()).await?;
                continue;
            }
            let gid = Arc::new(task.gid.as_ref().unwrap().clone());
            let body: Aria2General = serde_json::from_value(
                post_aria2c("unpause", vec![json!(gid)]).await?
            ).context("Failed to decode aria2c unpause response")?;
            if let Some(err) = body.error {
                QUEUE_MANAGER.retain(QueueType::Doing, (*id).clone()).await?;
                return Err(TauriError::new(err.message, Some(err.code)));
            }
            self.event.send(DownloadEvent::Started {
                id: id.clone(), gid: gid.clone(), media_type: task.media_type.clone()
            })?;
            let mut success = false;
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
                            success = true;
                            break;
                        },
                        "paused" => (),
                        _ => break,
                    }
                }
                sleep(Duration::from_millis(100)).await;
            }
            if !success {
                return Ok(false);
            }
        }
        Ok(true)
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
    let (mut rx, child) = app.shell().sidecar("aria2c").map_err(|e| process_err(e, "aria2c"))?
    .current_dir(&*RESOURCES_PATH).args([
        format!("--conf-path={}", RESOURCES_PATH.join("aria2.conf").to_string_lossy()),
        format!("--log={}", app.path().app_log_dir()?.join("aria2.log").to_string_lossy()),
        format!("--rpc-listen-port={}", port),
        format!("--rpc-secret={}", &SECRET.read().unwrap()),
        "--log-level=info".into(),
    ]).spawn().map_err(|e| process_err(e, "aria2c"))?;
    async_runtime::spawn(async move {
        daemon("aria2c".into(), &child, &mut rx).await;
    });
    Ok(())
}

pub async fn post_aria2c(action: &str, params: Vec<Value>) -> TauriResult<Value> {
    let client = init_client().await?;
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

    let body: Value = response.json().await
        .context("Failed to decode aria2c JsonRPC response")?;

    Ok(body)
}

fn check_breakpoint(
    input: &PathBuf,
    start_with: String
) -> Result<Option<PathBuf>> {
    let entries = fs::read_dir(&input)?;
    for entry in entries {
        let entry = entry?;
        let folder_path = entry.path();
        let folder = folder_path.file_name().and_then(|n| n.to_str()).unwrap_or("");
        if entry.file_type()?.is_dir() && folder.starts_with(&start_with) {
            let folder_entries = fs::read_dir(&folder_path)?;
            for sub_entry in folder_entries {
                let sub_path = sub_entry?.path();
                let file_name = sub_path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                if file_name.ends_with("aria2") {
                    return Ok(Some(folder_path))
                }
            }
        }
    }
    Ok(None)
}

#[tauri::command(async)]
#[specta::specta]
pub async fn push_back_queue(
    info: Arc<MediaInfoListItem>,
    current_select: CurrentSelect,
    tasks: Vec<Task>,
    ts: Arc<Timestamp>,
    ext: String,
    output: Option<String>,
    ss_title: String
) -> TauriResult<Arc<QueueInfo>> {
    let mut parent = if let Some(output) = &output {
        PathBuf::from(output)
    } else {
        CONFIG.read().unwrap().down_dir.join(ss_title)
    };
    if parent.exists() {
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
    let mut video_info = QueueInfo {
        id: random_string(16),
        ts: ts.clone(),
        tasks,
        output: parent.join(format!("{}.{}", filename(info.title.clone()), ext)),
        info: info.clone(),
        current_select,
    };
    for task in &mut video_info.tasks {
        if task.media_type == MediaType::Merge || task.media_type == MediaType::Flac { // FFmpeg task
            task.gid = Some(random_string(16));
            continue;
        }
        let parsed_url = reqwest::Url::parse(&task.urls[0])?;
        let name = parsed_url.path_segments().unwrap().last().unwrap();
        let temp_dir = { CONFIG.read().unwrap().temp_dir.join("com.btjawa.bilitools") };
        fs::create_dir_all(&temp_dir).context("Failed to create app temp dir")?;
        let dir = check_breakpoint(
            &temp_dir, format!("{}_{}", info.id, info.cid)
        )?.unwrap_or(temp_dir.join(format!("{}_{}_{}", info.id, info.cid, ts.millis)));
        let params = vec![
            json!(task.urls),
            json!({ "dir": dir, "out": name, "pause": "true" })
        ];
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
    let info = Arc::new(video_info);
    QUEUE_MANAGER.push_back(info.clone(), QueueType::Waiting).await?;
    QUEUE_MANAGER.update(QueueType::Waiting).await;
Ok(info)
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
                    Err(e) => { process_err(e, "ffmpeg"); },
                    Ok(r) => if QUEUE_MANAGER.get_len(QueueType::Doing).await == 0 {
                        Notification {
                            id: r.id.clone(),
                            info: r.info.clone(),
                        }.emit(&get_app_handle()).unwrap();
                        break;
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