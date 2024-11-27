use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{async_runtime, ipc::Channel};
use tauri_plugin_http::reqwest;
use std::{collections::VecDeque, fs, net::{SocketAddr, TcpListener}, path::PathBuf, sync::{RwLock as StdRwLock, Arc}, time::Duration};
use tokio::{sync::{RwLock, Notify, OnceCell}, time::sleep};
use tauri_plugin_shell::{process::CommandChild, ShellExt};

use crate::shared::{filename, get_app_handle, init_client, BINARY_PATH, CONFIG, SECRET};

lazy_static! {
    pub static ref WAITING_QUEUE: RwLock<VecDeque<QueueInfo>> = RwLock::new(VecDeque::new());
    pub static ref DOING_QUEUE: RwLock<VecDeque<QueueInfo>> = RwLock::new(VecDeque::new());
    pub static ref COMPLETE_QUEUE: RwLock<VecDeque<QueueInfo>> = RwLock::new(VecDeque::new());
    static ref ARIA2C_PORT: Arc<StdRwLock<usize>> = Arc::new(StdRwLock::new(0));
    static ref ARIA2C_CHILD: Arc<StdRwLock<Option<CommandChild>>> = Arc::new(StdRwLock::new(None));
    static ref DOWNLOAD_NOTIFY: Notify = Notify::new();
    static ref DOWNLOAD_EVENT: Arc<OnceCell<Channel<DownloadEvent>>> = Arc::new(OnceCell::new());
    static ref QUEUE_EVENT: Arc<OnceCell<Channel<QueueEvent>>> = Arc::new(OnceCell::new());
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct QueueInfo {
    pub tasks: Vec<Task>,
    pub output: PathBuf,
    pub info: MediaInfo
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Task {
    urls: Vec<String>,
    gid: Option<String>,
    media_type: String,
    path: Option<PathBuf>,
}

#[derive(Clone, Serialize)]
#[serde(tag = "status")]
pub enum DownloadEvent {
    Started {
        gid: String,
        media_type: String,
    },
    Progress {
        gid: String,
        content_length: u64,
        chunk_length: u64,
    },
    Finished {
        gid: String,
    },
}

#[derive(Clone, Serialize)]
#[serde(tag = "type")]
pub enum QueueEvent {
    Waiting {
        data: VecDeque<QueueInfo>
    },
    Doing {
        data: VecDeque<QueueInfo>
    },
    Complete {
        data: VecDeque<QueueInfo>
    },
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct MediaInfo {
    title: String,
    cover: String,
    desc: String,
    id: u32,
    cid: u32,
    eid: u32,
    ss_title: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Timestamp {
    millis: isize,
    string: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct Aria2Error {
    code: isize,
    message: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct Aria2AddUri {
    id: String,
    jsonrpc: String,
    result: Option<String>,
    error: Option<Aria2Error>
}

#[derive(Serialize, Deserialize, Debug)]
struct Aria2TellStatus {
    id: String,
    jsonrpc: String,
    result: Option<Aria2TellStatusResult>,
    error: Option<Aria2Error>
}

#[derive(Serialize, Deserialize, Debug)]
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
}

pub fn init() -> Result<(), String> {
    let start_port = 6800;
    let end_port = 65535;
    let port = (start_port..end_port)
        .find_map(|port| TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], port))).ok())
        .ok_or("No free port found".to_string())?.local_addr().unwrap().port();
    *ARIA2C_PORT.write().unwrap() = port as usize;
    let app = get_app_handle();
    let (_, child) = app.shell().sidecar("./bin/aria2c").unwrap()
        .current_dir(&*BINARY_PATH)
        .args([
            format!("--conf-path={}", BINARY_PATH.join("aria2.conf").to_string_lossy()),
            format!("--rpc-listen-port={}", port),
            format!("--rpc-secret={}", &SECRET.read().unwrap()),
            format!("--max-concurrent-downloads={}", CONFIG.read().unwrap().max_conc)
        ]).spawn().map_err(|e| e.to_string())?;

        
    #[cfg(target_os = "macos")]
    app.shell().sidecar("/bin/bash").unwrap()
    .args([
        "-c",
        &format!(
            "while kill -0 {} 2>/dev/null; do sleep 0.5; done; kill {}",
            std::process::id(),
            child.pid()
        )
        ]).spawn().map_err(|e| e.to_string())?;
    
    *ARIA2C_CHILD.write().unwrap() = Some(child);
    Ok(())
}

pub fn _kill() -> Result<(), String> {
    if let Some(sc) = ARIA2C_CHILD.write().unwrap().take() {
        sc.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn param_to_value(value: &Value) -> Result<Value, String> {
    match value {
        Value::String(s) => Ok(Value::String(s.clone())),
        Value::Number(n) => Ok(Value::Number(n.clone())),
        Value::Bool(b) => Ok(Value::Bool(*b)),
        Value::Array(arr) => Ok(Value::Array(arr.clone())),
        Value::Object(obj) => Ok(Value::Object(obj.clone())),
        _ => Err("Unsupported type".to_string()),
    }
}

#[tauri::command]
pub async fn post_aria2c(action: &str, params: Vec<Value>) -> Result<Value, Value> {
    let client = init_client().await?;
    let mut params_vec = vec![Value::String(format!("token:{}", *SECRET.read().unwrap()))];
    for param in params {
        let param_str = param_to_value(&param)?;
        params_vec.push(param_str);
    }
    let payload = json!({
        "jsonrpc": "2.0",
        "method": format!("aria2.{action}"),
        "id": "1",
        "params": params_vec
    });
    let response = client
        .post(format!("http://localhost:{}/jsonrpc", ARIA2C_PORT.read().unwrap()))
        .json(&payload).send().await.map_err(|e| e.to_string())?;

    let body = response.json::<serde_json::Value>().await.map_err(|e| e.to_string())?;
    if let Some(error) = body.get("error") {
        let error: Aria2Error = serde_json::from_value(error.clone()).unwrap();
        return Err(json!({ "code": error.code, "message": error.message }));
    }
    Ok(body)
}

#[tauri::command]
pub async fn push_back_queue(info: MediaInfo, tasks: Vec<Task>, ts: Timestamp) -> Result<QueueInfo, Value> {
    let config = CONFIG.read().unwrap().clone();
    let info_id = info.id.clone();
    let mut video_info = QueueInfo {
        tasks,
        output: config.down_dir.join(format!("{}_{}", filename(info.ss_title.clone()), ts.string)),
        info
    };
    for task in &mut video_info.tasks {
        let parsed_url = reqwest::Url::parse(&task.urls[0]).map_err(|e| e.to_string())?;
        let name = parsed_url.path_segments().unwrap().last().unwrap();
        let dir = config.temp_dir.join("com.btjawa.bilitools").join(format!("{}_{}", info_id, ts.millis));
        let params = vec![
            task.urls.clone().into(),
            json!({ "dir": dir, "out": name })
        ];
        let body_value: Value = post_aria2c("addUri", params).await.map_err(|e| e.to_string())?;
        let body: Aria2AddUri = serde_json::from_value(body_value).map_err(|e| e.to_string())?;
        log::info!("{:?}", body);
        if let Some(error) = body.error {
            return Err(json!({ "code": error.code, "message": error.message }));
        }
        let gid = body.result.unwrap_or(String::new());
        task.gid = Some(gid);
        task.path = Some(dir.join(name));
    }
    let mut waiting_queue = WAITING_QUEUE.write().await;
    waiting_queue.push_back(video_info.clone());
    // log::info!("{:?}", waiting_queue.iter());
    Ok(video_info)
}

async fn update_queue_event(queue_types: Vec<&str>) {
    let event = QUEUE_EVENT.get().unwrap();
    for queue_type in queue_types {
        match queue_type {
            "waiting" => {
                let waiting_data = WAITING_QUEUE.read().await.clone();
                event.send(QueueEvent::Waiting { data: waiting_data }).unwrap();
            },
            "doing" => {
                let doing_data = DOING_QUEUE.read().await.clone();
                event.send(QueueEvent::Doing { data: doing_data }).unwrap();
            },
            "complete" => {
                let complete_data = COMPLETE_QUEUE.read().await.clone();
                event.send(QueueEvent::Complete { data: complete_data }).unwrap();
            },
            _ => {}
        }
    }
}

#[tauri::command]
pub async fn process_queue(download_event: Channel<DownloadEvent>, queue_event: Channel<QueueEvent>) -> Result<(), String> {
    let _ = DOWNLOAD_EVENT.set(download_event);
    let _ = QUEUE_EVENT.set(queue_event);
    loop {
        let max_conc = CONFIG.read().unwrap().max_conc;
        let doing_len = DOING_QUEUE.read().await.len();
        for _ in 0..(max_conc - doing_len) {
            if let Some(info) = { WAITING_QUEUE.write().await.pop_front() } {
                { DOING_QUEUE.write().await.push_back(info.clone()); }
                async_runtime::spawn(async move {
                    update_queue_event(vec!["waiting", "doing"]).await;
                    // let _ = process_download(info.clone()).await.map_err(|e| e.to_string());
                    let task = info.clone().tasks[0].clone();
                    let event = DOWNLOAD_EVENT.get().unwrap();
                    event.send(DownloadEvent::Started { gid: task.gid.clone().unwrap(), media_type: "video".into() }).unwrap();
                    for i in 1..50 {
                        event.send(DownloadEvent::Progress { gid: task.gid.clone().unwrap(), content_length: 5017600, chunk_length: 1024 * 100 * i }).unwrap();
                        tokio::time::sleep(Duration::from_millis(100)).await;
                    }
                    {
                        DOING_QUEUE.write().await.retain(|task| *task != info);
                        COMPLETE_QUEUE.write().await.push_back(info);
                    }
                    update_queue_event(vec!["doing", "complete"]).await;
                    tokio::time::sleep(Duration::from_millis(1000)).await;
                    DOWNLOAD_NOTIFY.notify_one();
                });
            }
        }
        update_queue_event(vec!["waiting", "doing"]).await;
        if WAITING_QUEUE.read().await.is_empty() {
            break;
        }
        DOWNLOAD_NOTIFY.notified().await;
    }
    Ok(())
}

async fn process_download(info: QueueInfo) -> Result<(), Value> {
    fs::create_dir_all(info.output).map_err(|e| e.to_string())?;
    for task in info.tasks {
        let task_clone = task.clone();
        let gid = task_clone.gid.unwrap_or(String::new());
        let body: Aria2AddUri = serde_json::from_value(
            post_aria2c("unpause", vec![gid.clone().into()]).await.map_err(|e| e.to_string())?
        ).map_err(|e| e.to_string())?;
        log::info!("{:?}", body);
        if let Some(error) = body.error {
            return Err(json!({ "code": error.code, "message": error.message }));
        }
        let event = DOWNLOAD_EVENT.get().unwrap();
        event.send(DownloadEvent::Started { gid, media_type: task_clone.media_type }).unwrap();
        loop {
            let gid = task.clone().gid.unwrap_or(String::new());
            let body_value: Value = post_aria2c("tellStatus", vec![gid.clone().into()]).await.map_err(|e| e.to_string())?;
            let body: Aria2TellStatus = serde_json::from_value(body_value).map_err(|e| e.to_string())?;
            log::info!("{:?}", body);
            if let Some(error) = body.error {
                return Err(json!({ "code": error.code, "message": error.message }));
            }
            if let Some(result) = body.result { match result.status.as_str() {
                "active" => {
                    event.send(DownloadEvent::Progress {
                        gid,
                        content_length: result.total_length.parse().unwrap(),
                        chunk_length: result.completed_length.parse::<u64>().unwrap_or(0),
                    }).unwrap();
                },
                "complete" => {
                    event.send(DownloadEvent::Finished { gid }).unwrap();
                    break;
                },
                _ => {},
            }}
            sleep(Duration::from_millis(500)).await;
        }
    }
    Ok(())
}