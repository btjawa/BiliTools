use lazy_static::lazy_static;
use sea_orm::FromJsonQueryResult;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{async_runtime, ipc::Channel};
use tauri_plugin_http::reqwest;
use std::{collections::VecDeque, fs, net::{SocketAddr, TcpListener}, path::PathBuf, sync::{RwLock as StdRwLock, Arc}, time::Duration};
use tokio::{sync::{RwLock, Notify, OnceCell}, time::sleep};
use tauri_plugin_shell::{process::CommandChild, ShellExt};
use crate::{downloads, ffmpeg, shared::{filename, get_app_handle, init_client, BINARY_PATH, BINARY_RELATIVE, CONFIG, SECRET, random_string}};

lazy_static! {
    pub static ref WAITING_QUEUE: RwLock<VecDeque<Arc<QueueInfo>>> = RwLock::new(VecDeque::new());
    pub static ref DOING_QUEUE: RwLock<VecDeque<Arc<QueueInfo>>> = RwLock::new(VecDeque::new());
    pub static ref COMPLETE_QUEUE: RwLock<VecDeque<Arc<QueueInfo>>> = RwLock::new(VecDeque::new());
    static ref ARIA2C_PORT: Arc<StdRwLock<usize>> = Arc::new(StdRwLock::new(0));
    static ref ARIA2C_CHILD: Arc<StdRwLock<Option<CommandChild>>> = Arc::new(StdRwLock::new(None));
    static ref DOWNLOAD_NOTIFY: Notify = Notify::new();
    pub static ref DOWNLOAD_EVENT: Arc<OnceCell<Channel<DownloadEvent>>> = Arc::new(OnceCell::new());
    pub static ref QUEUE_EVENT: Arc<OnceCell<Channel<QueueEvent>>> = Arc::new(OnceCell::new());
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult)]
pub struct QueueInfo {
    pub id: String,
    pub ts: Arc<Timestamp>,
    pub tasks: Vec<Task>,
    pub output: PathBuf,
    pub info: Arc<MediaInfo>,
    #[serde(rename = "currentSelect")]
    pub current_select: Value,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Task {
    pub urls: Vec<String>,
    pub gid: Option<String>,
    pub media_type: String,
    pub path: Option<PathBuf>,
}

#[derive(Clone, Serialize)]
#[serde(tag = "status")]
pub enum DownloadEvent {
    Started {
        id: Arc<String>,
        gid: Arc<String>,
        media_type: String,
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
    },
    Error {
        code: isize,
        message: String
    }
}

#[derive(Clone, Serialize)]
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

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct MediaInfo {
    title: String,
    cover: String,
    desc: String,
    id: u64,
    cid: u64,
    eid: u64,
    ss_title: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Timestamp {
    pub millis: isize,
    pub string: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
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
struct Aria2Remove {
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
    #[serde(rename = "errorMessage")]
    error_message: Option<String>
}

pub fn init() -> Result<(), String> {
    let start_port = 6800;
    let end_port = 65535;
    let port = (start_port..end_port)
        .find_map(|port| TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], port))).ok())
        .ok_or("No free port found".to_string())?.local_addr().unwrap().port();
    *ARIA2C_PORT.write().unwrap() = port as usize;
    let app = get_app_handle();
    let (_, child) = app.shell().sidecar(format!("{}/aria2c", &*BINARY_RELATIVE)).unwrap()
        .current_dir(&*BINARY_PATH)
        .args([
            format!("--conf-path={}", BINARY_PATH.join("aria2.conf").to_string_lossy()),
            format!("--rpc-listen-port={}", port),
            format!("--rpc-secret={}", &SECRET.read().unwrap()),
            // format!("--max-concurrent-downloads={}", CONFIG.read().unwrap().max_conc)
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

fn param_to_value(value: Value) -> Result<Value, String> {
    match value {
        Value::String(s) => Ok(Value::String(s)),
        Value::Number(n) => Ok(Value::Number(n)),
        Value::Bool(b) => Ok(Value::Bool(b)),
        Value::Array(arr) => Ok(Value::Array(arr)),
        Value::Object(obj) => Ok(Value::Object(obj)),
        _ => Err("Unsupported type".to_string()),
    }
}

#[tauri::command]
pub async fn post_aria2c(action: &str, params: Vec<Value>) -> Result<Value, Value> {
    let client = init_client().await?;
    let mut params_vec = vec![Value::String(format!("token:{}", *SECRET.read().unwrap()))];
    for param in params {
        let param_str = param_to_value(param)?;
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
    Ok(body)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn remove_aria2c_task(queue_id: &str, id: Arc<String>, gid: Option<Arc<String>>) -> Result<(), Value> {
    match queue_id {
        "waiting" | "doing" => {
            let mut queue = if queue_id == "waiting" {
                WAITING_QUEUE.write().await
            } else {
                DOING_QUEUE.write().await
            };
            queue.retain(|task| *task.id != *id);
            let body_value: Value = post_aria2c("remove", vec![json!(gid)]).await.map_err(|e| e.to_string())?;
            let body: Aria2Remove = serde_json::from_value(body_value).map_err(|e| e.to_string())?;
            if let Some(error) = body.error {
                return Err(json!({ "code": error.code, "message": error.message }));
            }    
        },
        "complete" => {
            downloads::delete(id).await.map_err(|e| e.to_string())?;
            downloads::load().await.map_err(|e| e.to_string())?;
        },
        _ => {},
    }
    match QUEUE_EVENT.get() {
        Some(_) => update_queue_event(vec![queue_id]).await,
        None => {}
    }
    Ok(())
}

#[tauri::command]
pub async fn push_back_queue(info: Arc<MediaInfo>, current_select: Value, tasks: Vec<Task>, ts: Arc<Timestamp>, ext: String, output: Option<String>) -> Result<Arc<QueueInfo>, Value> {
    let parent = if let Some(output) = output {
        PathBuf::from(output)
    } else {
        let config = CONFIG.read().unwrap();
        config.down_dir.join(format!("{}_{}", filename(info.ss_title.clone()), ts.string))
    };
    let mut video_info = QueueInfo {
        id: random_string(16),
        ts: ts.clone(),
        tasks,
        output: parent.join(format!("{}.{}", filename(info.title.clone()), ext)),
        info: info.clone(),
        current_select,
    };
    for task in &mut video_info.tasks {
        if task.media_type.as_str() == "merge" || task.media_type.as_str() == "flac" { // FFmpeg task
            task.gid = Some(random_string(16));
            continue;
        }
        let parsed_url = reqwest::Url::parse(&task.urls[0]).map_err(|e| e.to_string())?;
        let name = parsed_url.path_segments().unwrap().last().unwrap();
        let dir = {
            let config = CONFIG.read().unwrap();
            config.temp_dir.join("com.btjawa.bilitools").join(format!("{}_{}", info.clone().id, ts.millis))
        };
        let params = vec![
            json!(task.urls),
            json!({ "dir": dir, "out": name, "pause": "true" })
        ];
        let body_value: Value = post_aria2c("addUri", params).await.map_err(|e| e.to_string())?;
        let body: Aria2AddUri = serde_json::from_value(body_value).map_err(|e| e.to_string())?;
        if let Some(error) = body.error {
            return Err(json!({ "code": error.code, "message": error.message }));
        }
        let gid = body.result.unwrap_or(String::new());
        task.gid = Some(gid);
        task.path = Some(dir.join(name));
    }
    let mut waiting_queue = WAITING_QUEUE.write().await;
    let video_info_arc = Arc::new(video_info);
    waiting_queue.push_back(video_info_arc.clone());
    Ok(video_info_arc.clone())
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
                    process_download(info.clone()).await.map_err(|e| e.to_string())?;
                    if info.tasks.iter().any(|task| task.media_type == "merge") {
                        let event = DOWNLOAD_EVENT.get().unwrap();
                        ffmpeg::merge(info.clone(), event).await.map_err(|e| e.to_string())?;
                    } else if info.tasks.iter().any(|task| task.media_type == "flac") { 
                        ffmpeg::raw_flac(info.clone()).await.map_err(|e| e.to_string())?;
                    } else {                        
                        fs::rename(info.tasks[0].clone().path.unwrap(), &info.output).map_err(|e| e.to_string())?;
                    }
                    fs::remove_dir_all(info.tasks[0].clone().path.unwrap().parent().unwrap()).map_err(|e| e.to_string())?;
                    {
                        DOING_QUEUE.write().await.retain(|task| *task != info);
                        COMPLETE_QUEUE.write().await.push_back(info.clone());
                    }
                    downloads::insert(info.clone()).await.map_err(|e| e.to_string())?;
                    update_queue_event(vec!["doing", "complete"]).await;
                    sleep(Duration::from_millis(100)).await;
                    DOWNLOAD_NOTIFY.notify_one();
                    Ok::<(), String>(())
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

async fn process_download(info: Arc<QueueInfo>) -> Result<(), Value> {
    fs::create_dir_all(info.output.parent().unwrap()).map_err(|e| e.to_string())?;
    for task in &info.tasks {
        if task.media_type.as_str() == "merge" || task.media_type.as_str() == "flac" { continue }
        let gid = Arc::new(task.gid.as_ref().unwrap_or(&String::new()).clone());
        let id = Arc::new(info.id.clone());
        let body: Aria2AddUri = serde_json::from_value(
            post_aria2c("unpause", vec![json!(gid)]).await.map_err(|e| e.to_string())?
        ).map_err(|e| e.to_string())?;
        let event = DOWNLOAD_EVENT.get().unwrap();
        if let Some(error) = body.error {
            event.send(DownloadEvent::Error { code: error.clone().code, message: error.clone().message }).unwrap();
            remove_aria2c_task("doing", id.clone(), Some(gid)).await?;
            return Err(json!({ "code": error.code, "message": error.message }));
        }
        event.send(DownloadEvent::Started { id: id.clone(), gid, media_type: task.media_type.clone() }).unwrap();
        loop {
            let gid = Arc::new(task.gid.as_ref().unwrap_or(&String::new()).clone());
            let body_value: Value = post_aria2c("tellStatus", vec![json!(gid)]).await.map_err(|e| e.to_string())?;
            let body: Aria2TellStatus = serde_json::from_value(body_value).map_err(|e| e.to_string())?;
            if let Some(result) = body.result {
                if let Some(error) = result.error_code {
                    let code = error.parse::<isize>().unwrap();
                    if code != 0 {
                        let message = result.error_message.unwrap();
                        event.send(DownloadEvent::Error { code: code.clone(), message: message.clone() }).unwrap();
                        return Err(json!({ "code": code.clone(), "message": message.clone() }));
                    }
                }    
                match result.status.as_str() {
                    "active" => {
                        event.send(DownloadEvent::Progress {
                            id: id.clone(),
                            gid,
                            content_length: result.total_length.parse().unwrap(),
                            chunk_length: result.completed_length.parse::<u64>().unwrap_or(0),
                        }).unwrap();
                    },
                    "complete" => {
                        event.send(DownloadEvent::Progress {
                            id: id.clone(),
                            gid: gid.clone(),
                            content_length: result.total_length.parse().unwrap(),
                            chunk_length: result.total_length.parse().unwrap(),
                        }).unwrap();
                        event.send(DownloadEvent::Finished { id: id.clone(), gid }).unwrap();
                        break;
                    },
                    _ => {},
                }
            }
            sleep(Duration::from_millis(100)).await;
        }
    }
    Ok(())
}