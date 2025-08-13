use std::{collections::VecDeque, fmt, future::Future, path::PathBuf, pin::Pin, sync::{atomic::AtomicBool, Arc}, time::Duration};
use tokio::{fs, sync::{broadcast::{self, Receiver}, mpsc, oneshot, RwLock, Semaphore}, time::timeout};
use tauri::{async_runtime, ipc::Channel, AppHandle, Listener};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use anyhow::{anyhow, Context, Result};
use tauri_plugin_shell::ShellExt;
use lazy_static::lazy_static;
use serde_json::Value;
use specta::Type;

use crate::{
    config, errors::TauriResult, services::{aria2c, ffmpeg}, shared::{get_app_handle, get_unique_path, random_string}
};

lazy_static! {
    static ref QUEUE_MANAGER: QueueManager = QueueManager::new();
    static ref GLOBAL_PAUSED: Arc<RwLock<AtomicBool>> = Arc::new(RwLock::new(AtomicBool::new(false)));
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum StreamFormat {
    Dash,
    Mp4,
    Flv,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(untagged)]
pub enum StringOrFalse {
    String(String),
    False(bool),
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct PopupSelectMisc {
    #[serde(rename = "aiSummary")]
    ai_summary: bool,
    subtitles: StringOrFalse,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct PopupSelectNfo {
    album: bool,
    single: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct PopupSelectDanmaku {
    live: bool,
    history: StringOrFalse,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct PopupSelectMedia {
    video: bool,
    audio: bool,
    #[serde(rename = "audioVideo")]
    audio_video: bool,
}

impl PopupSelectMedia {
    pub fn any_true(&self) -> bool {
        self.video || self.audio || self.audio_video
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct PopupSelect {
    res: usize,
    abr: usize,
    enc: usize,
    fmt: StreamFormat,
    misc: PopupSelectMisc,
    nfo: PopupSelectNfo,
    danmaku: PopupSelectDanmaku,
    thumb: Vec<String>,
    media: PopupSelectMedia,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum MediaType {
    Video,
    Bangumi,
    Music,
    MusicList,
    Lesson,
    Favorite,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MediaItem {
    title: String,
    cover: String,
    desc: String,
    duration: usize,
    pubtime: usize, // sec timestamp
    #[serde(rename = "type")]
    #[specta(type = String)]
    media_type: MediaType,
    #[specta(optional)]
    aid: Option<usize>,
    #[specta(optional)]
    sid: Option<usize>,
    #[specta(optional)]
    fid: Option<usize>,
    #[specta(optional)]
    cid: Option<usize>,
    #[specta(optional)]
    bvid: Option<String>,
    #[specta(optional)]
    epid: Option<usize>,
    #[specta(optional)]
    ssid: Option<usize>,
    index: usize,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MediaNfoThumb {
    id: String,
    url: String
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MediaNfoUpper {
    name: String,
    mid: usize,
    avatar: String
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MediaNfoActor {
    role: String,
    name: String
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MediaNfo {
    tags: Vec<String>,
    thumbs: Vec<MediaNfoThumb>,
    showtitle: String,
    premiered: String,
    upper: Option<MediaNfoUpper>,
    actors: Vec<MediaNfoActor>,
    staff: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct ArchiveInfo {
    item: MediaItem,
    #[serde(rename = "type")]
    #[specta(type = String)]
    media_type: MediaType,
    nfo: MediaNfo,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Type)]
#[serde(rename_all = "camelCase")]
pub enum TaskType {
    AiSummary,
    Subtitles,
    AlbumNfo,
    SingleNfo,
    LiveDanmaku,
    HistoryDanmaku,
    Thumb,
    Video,
    Audio,
    AudioVideo,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct Progress {
    pub parent: Arc<String>,
    pub id: Arc<String>,
    #[serde(rename = "taskType")]
    pub task_type: TaskType,
    #[serde(rename = "contentLength")]
    pub content_length: u64,
    #[serde(rename = "chunkLength")]
    pub chunk_length: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Type)]
#[serde(rename_all = "camelCase")]
pub enum TaskState {
    Waiting,
    Doing,
    Complete,
    Paused,
    Failed,
    Cancelled
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct GeneralTask {
    pub id: Arc<String>,
    pub ts: u64,
    pub index: usize,
    pub state: TaskState,
    pub select: Arc<PopupSelect>,
    pub info: Arc<ArchiveInfo>,
    pub status: Vec<Arc<Progress>>
}

#[derive(Clone, Debug)]
pub enum CtrlEvent {
    Pause,
    Resume,
    Cancel,
}

struct QueueManager {
    tasks: RwLock<VecDeque<Arc<GeneralTask>>>,
    waiting: RwLock<Vec<Arc<String>>>,
    doing: RwLock<Vec<Arc<String>>>,
    complete: RwLock<Vec<Arc<String>>>,
}

impl QueueManager {
    pub fn new() -> Self {
        Self {
            tasks: RwLock::new(VecDeque::new()),
            waiting: RwLock::new(Vec::new()),
            doing: RwLock::new(Vec::new()),
            complete: RwLock::new(Vec::new()),
        }
    }
    fn get_queue(&self, queue: QueueType) -> &RwLock<Vec<Arc<String>>> {
        match queue {
            QueueType::Waiting => &self.waiting,
            QueueType::Doing => &self.doing,
            QueueType::Complete => &self.complete,
        }
    }
    pub async fn push_waiting(&self, task: Arc<GeneralTask>) {
        let mut tasks = self.tasks.write().await;
        let mut waiting = self.waiting.write().await;
        tasks.push_back(task.clone());
        waiting.push(task.id.clone());
    }
    pub async fn move_task(&self, id: Arc<String>, from: QueueType, to: QueueType) -> Option<Arc<GeneralTask>> {
        let mut src = self.get_queue(from).write().await;
        let id = if let Some(pos) = src.iter().position(|v| v.as_str() == id.as_str()) {
            src.remove(pos)
        } else {
            return None;
        };
        drop(src);
        let mut to = self.get_queue(to).write().await;
        to.push(id.clone());
        drop(to);
        let tasks = self.tasks.read().await;
        tasks.iter().find(|v| v.id.as_str() == id.as_str()).cloned()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum QueueType {
    Waiting,
    Doing,
    Complete
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum RequestType {
    GetPreInfo,
    GetFolder,
    GetFilename,
    GetNfo,
    GetThumbs,
    GetDanmaku,
    GetSubtitle,
    GetAISummary,
}

impl fmt::Display for RequestType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", match self {
            RequestType::GetPreInfo => "getPreInfo",
            RequestType::GetFolder => "getFolder",
            RequestType::GetFilename => "getFilename",
            RequestType::GetNfo => "getNfo",
            RequestType::GetThumbs => "getThumbs",
            RequestType::GetDanmaku => "getDanmaku",
            RequestType::GetSubtitle => "getSubtitle",
            RequestType::GetAISummary => "getAISummary",
        })
    }
}

#[derive(Clone, Serialize, Type)]
#[serde(rename_all = "camelCase", rename_all_fields = "camelCase", tag = "type")]
pub enum ProcessEvent {
    Request {
        id: Arc<String>,
        task: Arc<GeneralTask>,
        status: Option<Arc<Progress>>,
        namespace: RequestType,
    },
    Progress {
        id: Arc<String>,
        #[serde(rename = "contentLength")]
        content_length: u64,
        #[serde(rename = "chunkLength")]
        chunk_length: u64,
    },
    Error {
        id: Arc<String>,
        message: String,
        code: Option<isize>,
    }
}

pub struct Scheduler {
    pub run_id: String,
    pub app: Arc<AppHandle>,
    pub event: Arc<Channel<ProcessEvent>>,
    pub sem: Arc<Semaphore>,
    pub max_conc: RwLock<usize>,
}

pub type TaskFuture = Pin<Box<dyn Future<Output = TauriResult<()>> + Send>>;

impl Scheduler {
    pub fn new(run_id: String, app: Arc<AppHandle>, event: Arc<Channel<ProcessEvent>>, max_conc: usize) -> Arc<Self> {
        Arc::new(Self {
            run_id, app, event,
            sem: Arc::new(Semaphore::new(max_conc)),
            max_conc: RwLock::new(max_conc)
        })
    }

    // Try join in the party >_<
    pub async fn try_join<F>(
        &self,
        id: Arc<String>,
        func: F,
    ) -> TauriResult<()>
    where
        F: FnOnce(Receiver<CtrlEvent>) -> TaskFuture + Send + 'static,
    {
        let permit = self.sem.clone().acquire_owned().await?;
        let (tx, mut rx) = broadcast::channel::<CtrlEvent>(16);
        let rx_child = tx.subscribe();

        let (done_tx, mut done_rx) = oneshot::channel::<TauriResult<()>>();
        async_runtime::spawn(async move {
            let r = func(rx_child).await;
            let _ = done_tx.send(r);
        });

        let mut paused = false;
        let mut finished: Option<TauriResult<()>> = None;
        let mut cancelled = false;
        loop { tokio::select! {
            msg = rx.recv() => match msg {
                Ok(CtrlEvent::Pause) => {
                    paused = true
                },
                Ok(CtrlEvent::Cancel) => {
                    cancelled = true;
                    if !paused {
                        drop(permit);
                        return Err(anyhow!("task {id} cancelled").into());
                    }
                },
                Ok(CtrlEvent::Resume) => {
                    paused = false;
                    if cancelled {
                        drop(permit);
                        return Err(anyhow!("task {id} cancelled").into());
                    }
                    if let Some(res) = finished.take() {
                        drop(permit);
                        return res;
                    }
                },
                _ => {}
            },
            res = &mut done_rx, if finished.is_none() => {
                let res = res.unwrap_or(Ok(()));
                if paused {
                    finished = Some(res);
                } else {
                    drop(permit);
                    if cancelled {
                        return Err(anyhow!("task {id} cancelled").into());
                    } else {
                        return res;
                    }
                }
            }
        } }
    }
}

async fn request_frontend<T: DeserializeOwned + std::fmt::Debug>(
    id: Arc<String>,
    task: Arc<GeneralTask>,
    event: Arc<Channel<ProcessEvent>>,
    status: Option<Arc<Progress>>,
    namespace: RequestType
) -> Result<Arc<T>> {
    let (tx, rx) = oneshot::channel::<Result<Value>>();
    let app = get_app_handle();
    app.once(format!("{namespace}_{id}"), move |event| {
        let _ = tx.send(serde_json::from_str(event.payload()).context("Failed to Deserialize frontend response"));
    });
    event.send(ProcessEvent::Request { id, task, status, namespace })?;
    let data = timeout(Duration::from_secs(5), rx).await?
        .context("Frontend response timeout")?
        .context("No response from frontend")?;

    let result: T = serde_json::from_value(data).context("Failed to Deserialize frontend response to struct")?;
    Ok(Arc::new(result))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct MediaThumbsInfo {
    id: String,
    url: String,
}

async fn handle_thumb(
    ptask: ProgressTask,
    mut rx: Receiver<CtrlEvent>,
) -> TauriResult<()> {
    let status = ptask.status;
    let event = ptask.event;
    let task = ptask.task;
    let id = status.id.clone();

    let thumbs = request_frontend::<Arc<Vec<MediaThumbsInfo>>>(
        id.clone(), task, event, None, RequestType::GetThumbs
    ).await?;
    log::info!("{thumbs:?}");
    Ok(())
}

async fn handle_merge(
    ptask: ProgressTask,
    mut rx: Receiver<CtrlEvent>,
    video_path: Arc<RwLock<PathBuf>>,
    audio_path: Arc<RwLock<PathBuf>>,
) -> TauriResult<()> {
    let status = ptask.status;
    let event = ptask.event;
    let task = ptask.task;
    let id = status.id.clone();

    let video_path = video_path.read().await.clone();
    let audio_path = audio_path.read().await.clone();

    let (status_tx, mut status_rx) = mpsc::channel::<(u64, u64)>(32);
    let mut merge = Box::pin(ffmpeg::merge(id.clone(), status_tx, video_path, audio_path));
    let result = loop {
        tokio::select! {
            res = &mut merge => break res,
            Some((content, chunk)) = status_rx.recv() => {
                let _ = event.send(ProcessEvent::Progress {
                    id: id.clone(),
                    content_length: content,
                    chunk_length: chunk,
                });
            },
            Ok(CtrlEvent::Cancel) = rx.recv() => {

            }
        }
    };

    let path = result?; // TODO: CLEAN FFMPEG

    let output_file = &ptask.folder.join(format!("{}.{}", &ptask.filename, String::new() )); // TODO: select extension

    fs::copy(&path, output_file).await?;
    fs::remove_file(path).await?;

    if !task.select.media.video {
        // 删除video
    }
    if !task.select.media.audio {
        // 删除audio
    }
    Ok(())
}

async fn handle_media(
    ptask: ProgressTask,
    mut rx: Receiver<CtrlEvent>,
    video_path: Arc<RwLock<PathBuf>>,
    audio_path: Arc<RwLock<PathBuf>>,
) -> TauriResult<()> {
    let status = ptask.status;
    let event = ptask.event;
    let id = status.id.clone();
    
    let urls = if status.task_type == TaskType::Video {
        ptask.info.video_urls.clone()
    } else if status.task_type == TaskType::Audio {
        ptask.info.audio_urls.clone()
    } else {
        None
    }.ok_or(anyhow!("No urls found"))?;

    
    let (status_tx, mut status_rx) = mpsc::channel::<(u64, u64)>(16);
    let emit = async_runtime::spawn({
        let id = id.clone();
        async move { while let Some((content, chunk)) = status_rx.recv().await {
            let _ = event.send(ProcessEvent::Progress {
                id: id.clone(),
                content_length: content,
                chunk_length: chunk
            });
        } }
    });
    
    let mut download = Box::pin(aria2c::download(id.clone(), status_tx, urls));
    let result = loop { tokio::select! {
        res = &mut download => break res,
        msg = rx.recv() => match msg {
            Ok(CtrlEvent::Cancel) => {
                let _ = aria2c::cancel(id.clone()).await;
            },
            Ok(CtrlEvent::Pause) => {
                let _ = aria2c::pause(id.clone()).await;
            },
            Ok(CtrlEvent::Resume) => {
                let _ = aria2c::resume(id.clone()).await;
            },
            _ => ()
        }
    } };
    emit.await?;
    let path = result.map_err(|e| {
        async_runtime:: spawn(async move {
            let _ = aria2c::cancel(id).await;
        }); e
    })?;

    let output_file = &ptask.folder.join(format!("{}.{}", &ptask.filename, String::new() )); // TODO: select extension

    fs::copy(&path, output_file).await?;
    fs::remove_file(path).await?;

    if status.task_type == TaskType::Video {
        let mut guard = video_path.write().await;
        *guard = output_file.clone();
    } else if status.task_type == TaskType::Audio {
        let mut guard = audio_path.write().await;
        *guard = output_file.clone();
    };

    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct MediaPreInfo {
    #[serde(rename = "videoUrls")]
    video_urls: Option<Vec<String>>,
    #[serde(rename = "audioUrls")]
    audio_urls: Option<Vec<String>>,
    select: PopupSelect,
    nfo: MediaNfo,
}

struct ProgressTask {
    event: Arc<Channel<ProcessEvent>>,
    task: Arc<GeneralTask>,
    info: Arc<MediaPreInfo>,
    status: Arc<Progress>,
    folder: Arc<PathBuf>,
    filename: Arc<String>,
}

pub async fn handle_task(scheduler: Arc<Scheduler>, mut task: Arc<GeneralTask>) -> TauriResult<()> {
    let event = scheduler.event.clone();
    let id = task.id.clone();

    let info = request_frontend::<MediaPreInfo>(
        id.clone(), task.clone(), event.clone(), None, RequestType::GetPreInfo
    ).await?;
    { Arc::make_mut(&mut task).select = Arc::new(info.select.clone()); }

    let name = request_frontend::<String>(
        id.clone(), task.clone(), event.clone(), None, RequestType::GetFolder
    ).await?;
    let folder = Arc::new(get_unique_path(config::read().down_dir.join(&*name)));
    fs::create_dir_all(&*folder).await.context("Failed to create output folder")?;

    let video_path = Arc::new(RwLock::new(PathBuf::new()));
    let audio_path = Arc::new(RwLock::new(PathBuf::new()));

    for status in task.status.iter() {
        let filename = request_frontend::<String>(
            id.clone(),
            task.clone(),
            event.clone(),
            Some(status.clone()),
            RequestType::GetFilename
        ).await?;
        let ptask = ProgressTask {
            task: task.clone(),
            info: info.clone(),
            status: status.clone(),
            event: event.clone(),
            folder: folder.clone(),
            filename
        };
        let video_clone = video_path.clone();
        let audio_clone = audio_path.clone();
        match status.task_type {
            TaskType::Video | TaskType::Audio => {
                scheduler.try_join(id.clone(), |rx| {
                    Box::pin(async { handle_media(ptask, rx, video_clone, audio_clone).await })
                }).await?;
            },
            TaskType::AudioVideo => {
                scheduler.try_join(id.clone(), |rx| {
                    Box::pin(async { handle_merge(ptask, rx, video_clone, audio_clone).await })
                }).await?;
            },
            TaskType::Thumb => {
                scheduler.try_join(id.clone(), |rx| {
                    Box::pin(async { handle_thumb(ptask, rx).await })
                }).await?;
            },
            TaskType::LiveDanmaku => {

            },
            TaskType::HistoryDanmaku => {

            },
            TaskType::AlbumNfo => {

            },
            TaskType::SingleNfo => {

            },
            TaskType::AiSummary => {

            },
            TaskType::Subtitles => {

            }
        }
    }

    QUEUE_MANAGER.move_task(id, QueueType::Doing, QueueType::Complete).await;
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn process_queue(app: AppHandle, event: Channel<ProcessEvent>, list: Vec<Arc<String>>) -> TauriResult<()> {
    let event = Arc::new(event);
    let app = Arc::new(app);
    let run_id = random_string(8);
    let max_conc = config::read().max_conc;
    let scheduler = Scheduler::new(run_id, app, event.clone(), max_conc);

    let mut handles = Vec::new();
    for id in list {
        let event_clone = event.clone();
        if let Some(task) = QUEUE_MANAGER.move_task(id, QueueType::Waiting, QueueType::Doing).await {
            let scheduler = scheduler.clone();
            handles.push(async_runtime::spawn(async move {
                // TODO: Handle error
                match handle_task(scheduler, task.clone()).await {
                    Ok(_) => {},
                    Err(e) => {
                        log::error!("task {} failed: {e:#}", task.id.clone());
                        let _ = event_clone.send(ProcessEvent::Error {
                            id: task.id.clone(),
                            message: e.message,
                            code: e.code,
                        });
                    }
                }
            }));
        }
    }
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn submit_task(task: Arc<GeneralTask>) -> TauriResult<()> {
    QUEUE_MANAGER.push_waiting(task.clone()).await;
    log::info!("Pushed new task: {}, time: {}", task.id, task.ts);
    Ok(())
}