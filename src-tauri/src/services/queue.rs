use std::{collections::{HashMap, VecDeque}, fmt, future::Future, path::PathBuf, pin::Pin, sync::{atomic::AtomicBool, Arc}};
use tokio::{fs, sync::{broadcast::{self, Receiver}, mpsc, oneshot, RwLock, Semaphore}};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use tauri::{async_runtime, http::StatusCode, ipc::Channel, Listener};
use tauri_plugin_shell::{process::CommandEvent, ShellExt};
use anyhow::{anyhow, Context, Result};
use lazy_static::lazy_static;
use tauri_specta::Event;
use specta::Type;

use crate::{
    config,
    errors::{TauriError, TauriResult},
    services::{aria2c, ffmpeg},
    shared::{get_app_handle, get_unique_path, init_client}, storage::archive
};

lazy_static! {
    pub static ref QUEUE_MANAGER: QueueManager = QueueManager::new();
    static ref GLOBAL_PAUSED: Arc<RwLock<AtomicBool>> = Arc::new(RwLock::new(AtomicBool::new(false)));
    static ref SCHEDULER_LIST: RwLock<Vec<Arc<Scheduler>>> = Default::default();
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

impl StringOrFalse {
    pub fn as_str(&self) -> Option<&str> {
        match self {
            StringOrFalse::String(s) => Some(s.as_str()),
            StringOrFalse::False(_) => None,
        }
    }
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
    #[specta(optional)]
    res: Option<usize>,
    #[specta(optional)]
    abr: Option<usize>,
    #[specta(optional)]
    enc: Option<usize>,
    fmt: StreamFormat,
    misc: PopupSelectMisc,
    nfo: PopupSelectNfo,
    danmaku: PopupSelectDanmaku,
    thumb: Vec<String>,
    media: PopupSelectMedia,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MediaItem {
    title: String,
    cover: String,
    desc: String,
    duration: usize,
    pubtime: usize, // sec timestamp
    #[serde(rename = "type")]
    media_type: String,
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

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Type)]
#[serde(rename_all = "camelCase")]
pub enum TaskState {
    Pending,
    Active,
    Completed,
    Paused,
    Failed,
    Cancelled
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
pub struct SubTask {
    pub id: Arc<String>,
    pub index: usize,
    #[serde(rename = "type")]
    pub task_type: TaskType,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct GeneralTask {
    pub id: Arc<String>,
    pub ts: u64,
    pub index: usize,
    pub folder: Arc<PathBuf>,
    pub select: Arc<PopupSelect>,
    pub item: Arc<MediaItem>,
    #[serde(rename = "type")]
    pub media_type: String,
    pub nfo: Arc<MediaNfo>,
    pub subtasks: Vec<Arc<SubTask>>
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum QueueType {
    Waiting,
    Doing,
    Complete
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, Event)]
pub struct QueueData {
    waiting:  VecDeque<Arc<String>>,
    doing:    VecDeque<Arc<String>>,
    complete: VecDeque<Arc<String>>,
}

pub struct QueueManager {
    pub tasks: RwLock<HashMap<Arc<String>, Arc<RwLock<GeneralTask>>>>,
    pub waiting:  RwLock<VecDeque<Arc<String>>>,
    pub doing:    RwLock<VecDeque<Arc<String>>>,
    pub complete: RwLock<VecDeque<Arc<String>>>,
}

impl QueueManager {
    pub fn new() -> Self {
        Self {
            tasks: Default::default(),
            waiting: Default::default(),
            doing: Default::default(),
            complete: Default::default(),
        }
    }

    fn get_queue(&self, queue: QueueType) -> &RwLock<VecDeque<Arc<String>>> {
        match queue {
            QueueType::Waiting => &self.waiting,
            QueueType::Doing => &self.doing,
            QueueType::Complete => &self.complete,
        }
    }

    async fn emit(&self) {
        let queue = QueueData {
            waiting:  self.waiting.read().await.clone(),
            doing:    self.doing.read().await.clone(),
            complete: self.complete.read().await.clone(),
        };
        let app = get_app_handle();
        let _ = queue.emit(app);
    }

    pub async fn push_pending(&self, task: GeneralTask) {
        let task = Arc::new(RwLock::new(task));

        let (id, ts) = {
            let guard = task.read().await;
            (guard.id.clone(), guard.ts.clone())
        };
        let mut map = self.tasks.write().await;
        map.insert(id.clone(), task);
        drop(map);

        let mut queue = self.waiting.write().await;
        queue.push_back(id.clone());
        drop(queue);

        log::info!("Pushed new task: {id}, time: {ts}");
    }

    pub async fn move_task(
        &self,
        id: &Arc<String>,
        from: QueueType,
        to: QueueType
    ) -> Option<Arc<RwLock<GeneralTask>>> {
        let mut from = self.get_queue(from).write().await;
        if let Some(pos) = from.iter().position(|v| v.as_str() == id.as_str()) {
            from.remove(pos);
        } else {
            log::warn!("Task {id} not found in {:?}", from);
            return None;
        }
        drop(from);

        let mut to = self.get_queue(to).write().await;
        to.push_back(id.clone());
        drop(to);

        self.emit().await;

        let map = self.tasks.read().await;
        map.get(id).cloned()
    }

    pub async fn pop_task(
        &self,
        id: &Arc<String>,
    ) {
        let list = vec![
            self.get_queue(QueueType::Waiting),
            self.get_queue(QueueType::Doing),
            self.get_queue(QueueType::Complete),
        ];
        for queue in list {
            let mut guard = queue.write().await;
            if let Some(pos) = guard.iter().position(|v| v.as_str() == id.as_str()) {
                guard.remove(pos);
            }
        }
        self.emit().await;
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase", rename_all_fields = "camelCase", tag = "type")]
pub enum ProcessEvent {
    Request {
        parent: Arc<String>,
        subtask: Option<Arc<String>>,
        action: RequestAction,
    },
    Progress {
        parent: Arc<String>,
        id: Arc<String>,
        #[serde(rename = "content")]
        content: u64,
        #[serde(rename = "chunk")]
        chunk: u64,
    },
    TaskState {
        id: Arc<String>,
        state: TaskState,
    },
    Error {
        id: Arc<String>,
        message: String,
        code: Option<isize>,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Type)]
#[serde(rename_all = "lowercase")]
pub enum CtrlEvent {
    Pause,
    Resume,
    Cancel,
    OpenFolder,
}

struct Scheduler {
    list: Vec<Arc<String>>,
    folder: PathBuf,

    event: Arc<Channel<ProcessEvent>>,
    sem: RwLock<Semaphore>,
    max_conc: RwLock<usize>,

    ctrls: RwLock<HashMap<Arc<String>, broadcast::Sender<CtrlEvent>>>
}

impl Scheduler {
    pub fn new(list: Vec<Arc<String>>, folder: PathBuf, event: Arc<Channel<ProcessEvent>>, max_conc: usize) -> Arc<Self> {
        let mut map = HashMap::new();
        for id in &list {
            map.entry(id.clone()).or_insert_with(|| {
                let (tx, _rx) = broadcast::channel::<CtrlEvent>(8); tx
            });
        }
        Arc::new(Self {
            list, folder, event,
            sem: RwLock::new(Semaphore::new(max_conc)),
            max_conc: RwLock::new(max_conc),
            ctrls: RwLock::new(map)
        })
    }

    pub async fn update_max_conc(&self, new_conc: usize) {
        let mut max_conc = self.max_conc.write().await;
        let mut sem = self.sem.write().await;
        if new_conc > *max_conc {
            sem.add_permits(new_conc - *max_conc);
        } else if new_conc < *max_conc {
            *sem = Semaphore::new(new_conc);
        }
        *max_conc = new_conc;
    }

    // Try join in the party >_<
    pub async fn try_join<F>(
        &self,
        parent: &Arc<String>,
        id: &Arc<String>,
        func: F,
    ) -> TauriResult<()>
    where
        F: FnOnce(Receiver<CtrlEvent>) -> Pin<Box<dyn Future<Output = TauriResult<()>> + Send>> + Send + 'static,
    {
        let tx = { self.ctrls.read().await.get(parent).cloned().ok_or(anyhow!("No tx for {} found", &id))? };
        let rx = tx.subscribe();
        let mut _rx = tx.subscribe();
        let mut cancelled = false;
        let mut paused = false;
        let mut result: Option<TauriResult<()>> = None;

        let (done_tx, mut done_rx) = oneshot::channel();
        let id_clone = id.clone();
        async_runtime::spawn(async move {
            let result = func(rx).await.map_err(|e| {
                anyhow!(e).context(format!("Task {id_clone} failed"))
            });
            let _ = done_tx.send(result);
        });

        loop { tokio::select! {
            Ok(msg) = _rx.recv() => match msg {
                CtrlEvent::Cancel => {
                    cancelled = true;
                    break;
                },
                CtrlEvent::Pause => {
                    paused = true;
                },
                CtrlEvent::Resume => {
                    paused = false;
                    if result.is_some() || cancelled {
                        break;
                    }
                },
                _ => ()
            },
            res = &mut done_rx => {
                result = Some(res?.map_err(|e| e.into()));
                if !paused {
                    break;
                }
            }
        } };

        if cancelled {
            Err(anyhow!("Task {id} cancelled").into())
        } else {
            result.unwrap_or(Ok(()))
        }
    }

    pub async fn get_ctrl(&self, id: &Arc<String>) -> Option<broadcast::Sender<CtrlEvent>> {
        self.ctrls.read().await.get(id).cloned()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum RequestAction {
    GetStatus,
    RefreshNfo,
    RefreshUrls,
    GetFilename,
    GetNfo,
    GetThumbs,
    GetDanmaku,
    GetSubtitle,
    GetAISummary,
}

impl fmt::Display for RequestAction {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", match self {
            RequestAction::GetStatus => "getStatus",
            RequestAction::RefreshNfo => "refreshNfo",
            RequestAction::RefreshUrls => "refreshUrls",
            RequestAction::GetFilename => "getFilename",
            RequestAction::GetNfo => "getNfo",
            RequestAction::GetThumbs => "getThumbs",
            RequestAction::GetDanmaku => "getDanmaku",
            RequestAction::GetSubtitle => "getSubtitle",
            RequestAction::GetAISummary => "getAISummary",
        })
    }
}

async fn request_frontend<T: DeserializeOwned + Send + 'static>(
    event: Arc<Channel<ProcessEvent>>,
    parent: Arc<String>,
    subtask: Option<Arc<String>>,
    action: RequestAction
) -> Result<Arc<T>> {
    let (tx, rx) = oneshot::channel::<Result<Option<T>>>();
    let app = get_app_handle();
    let id = if let Some(id) = &subtask {
        id
    } else {
        &parent
    };
    app.once(format!("{action}_{id}"), move |event| {
        let _ = tx.send(
            serde_json::from_str::<Option<T>>(event.payload())
            .context("Failed to deserialize frontend response")
        );
    });
    event.send(ProcessEvent::Request { parent, subtask, action })?;
    let result = rx.await.context("No response from frontend")??;

    Ok(Arc::new(
        result.ok_or(anyhow!("Error occurred from frontend"))?
    ))
}

fn update_progress(event: Arc<Channel<ProcessEvent>>, parent: Arc<String>, id: Arc<String>) -> mpsc::Sender<(u64, u64)> {
    let (status_tx, mut status_rx) = mpsc::channel::<(u64, u64)>(16);
    async_runtime::spawn({
        async move { while let Some((content, chunk)) = status_rx.recv().await {
            let _ = event.send(ProcessEvent::Progress {
                parent: parent.clone(),
                id: id.clone(),
                content,
                chunk
            });
        } }
    });
    status_tx
}

fn get_ext(task_type: TaskType, abr: usize) -> &'static str {
    match task_type {
        TaskType::Audio => {
            if abr == 30250 {
                "eac3"
            } else if abr == 30251 || abr == 30252 {
                "flac"
            } else {
                "m4a"
            }
        },
        TaskType::AudioVideo => {
            if abr == 30251 || abr == 30252 {
                "mkv"
            } else {
                "mp4"
            }
        },
        _ => "mp4"
    }
}

async fn handle_subtitle(
    ptask: ProgressTask,
    _rx: Receiver<CtrlEvent>,
) -> TauriResult<()> {
    let subtask = ptask.subtask;
    let event = ptask.event;
    let parent = ptask.task.id.clone();
    let id = subtask.id.clone();
    
    let status_tx = update_progress(event.clone(), parent.clone(), id.clone());
    status_tx.send((1, 0)).await?;

    let result = request_frontend::<Vec<u8>>(
        event, parent, Some(id), RequestAction::GetSubtitle
    ).await?;

    let lang = &ptask.task.select.misc.subtitles.as_str().ok_or(anyhow!("No subtitle lang found"))?;
    let output_file = get_unique_path(ptask.folder.join(format!("{}.{lang}.srt", &ptask.filename )));
    fs::write(&output_file, &*result).await?;

    status_tx.send((1, 1)).await?;
    Ok(())
}

async fn handle_ai_summary(
    ptask: ProgressTask,
    _rx: Receiver<CtrlEvent>,
) -> TauriResult<()> {
    let subtask = ptask.subtask;
    let event = ptask.event;
    let parent = ptask.task.id.clone();
    let id = subtask.id.clone();
    
    let status_tx = update_progress(event.clone(), parent.clone(), id.clone());
    status_tx.send((1, 0)).await?;

    let result = request_frontend::<Vec<u8>>(
        event, parent, Some(id), RequestAction::GetAISummary
    ).await?;

    let output_file = get_unique_path(ptask.folder.join(format!("{}.md", &ptask.filename)));
    fs::write(&output_file, &*result).await?;

    status_tx.send((1, 1)).await?;
    Ok(())
}

async fn handle_nfo(
    ptask: ProgressTask,
    _rx: Receiver<CtrlEvent>,
    folder: PathBuf,
) -> TauriResult<()> {
    let subtask = ptask.subtask;
    let event = ptask.event;
    let parent = ptask.task.id.clone();
    let id = subtask.id.clone();
    
    let status_tx = update_progress(event.clone(), parent.clone(), id.clone());
    status_tx.send((1, 0)).await?;

    let nfo = request_frontend::<Vec<u8>>(
        event, parent, Some(id), RequestAction::GetNfo
    ).await?;

    let output_file = get_unique_path(if subtask.task_type == TaskType::AlbumNfo {
        folder.join("tvshow.nfo")
    } else {
        ptask.folder.join(format!("{}.nfo", &ptask.filename ))
    });
    fs::write(&output_file, &*nfo).await?;

    if subtask.task_type == TaskType::AlbumNfo {
        let client = init_client().await?;
        let url = format!("{}@.jpg", ptask.task.nfo.thumbs[0].url);
        let response = client
            .get(&url)
            .send().await?;
        if response.status() != StatusCode::OK {
            return Err(TauriError::new(format!("Error while fetching thumb {url}"), Some(response.status().as_u16() as isize)));
        }
        let bytes = response.bytes().await?;
        fs::write(folder.join("poster.jpg"), &bytes).await?;
    }

    status_tx.send((1, 1)).await?;
    Ok(())
}

async fn handle_danmaku(
    ptask: ProgressTask,
    mut rx: Receiver<CtrlEvent>,
) -> TauriResult<()> {
    let subtask = ptask.subtask;
    let event = ptask.event;
    let parent = ptask.task.id.clone();
    let id = subtask.id.clone();
    
    let status_tx = update_progress(event.clone(), parent.clone(), id.clone());
    status_tx.send((2, 1)).await?;

    let danmaku = request_frontend::<Vec<u8>>(
        event, parent, Some(id.clone()), RequestAction::GetDanmaku
    ).await?;

    let temp_root = config::read().temp_dir();
    let temp_dir = temp_root.join(&*id);
    fs::create_dir_all(&temp_dir).await?;

    let xml = temp_dir.join("raw.xml");
    let ass = temp_dir.join("out.ass");

    fs::write(&xml, &*danmaku).await?;
    let output_file = ptask.folder.join(&*ptask.filename);
    let output_file = output_file.to_string_lossy();

    if !config::read().convert.danmaku {
        fs::copy(&xml, get_unique_path(PathBuf::from(format!("{output_file}.xml")))).await?;
        status_tx.send((2, 2)).await?;
        return Ok(()); 
    }

    let (mut _rx, child) = get_app_handle().shell().sidecar("DanmakuFactory")?
        .args([
            "-i", &xml.to_str().unwrap(),
            "-o", &ass.to_str().unwrap(),
        ]).spawn()?;

    let mut child = Some(child);
    let mut stderr: Vec<String> = vec![];

    loop { tokio::select! {
        msg = _rx.recv() => match msg {
            Some(CommandEvent::Stdout(line)) => {
                log::info!("STDOUT: {}", String::from_utf8_lossy(&line));
            },
            Some(CommandEvent::Stderr(line)) => {
                let line = String::from_utf8_lossy(&line);
                log::info!("{}", line);
                stderr.push(line.into());
            },
            Some(CommandEvent::Error(line)) => {
                log::info!("ERROR: {line}");
            },
            Some(CommandEvent::Terminated(msg)) => {
                let code = msg.code.unwrap_or(0);
                if code == 0 {
                    break;
                } else {
                    return Err(TauriError::new(
                        format!("DanmakuFactory task failed\n{}", stderr.join("\n")),
                        Some(code as isize)
                    ));
                }
            },
            _ => ()
        },
        Ok(CtrlEvent::Cancel) = rx.recv() => {
            if let Some(c) = child.take() {
                c.kill()?;
            }
            break;
        }
    } };

    fs::copy(&xml, get_unique_path(PathBuf::from(format!("{output_file}.ass")))).await?;
    fs::remove_file(&xml).await?;
    status_tx.send((2, 2)).await?;
    Ok(())
}

async fn handle_thumbs(
    ptask: ProgressTask,
    mut rx: Receiver<CtrlEvent>,  
) -> TauriResult<()> {
    let subtask = ptask.subtask;
    let event = ptask.event;
    let parent = ptask.task.id.clone();
    let id = subtask.id.clone();
    
    let status_tx = update_progress(event.clone(), parent.clone(), id.clone());
    status_tx.send((0, 0)).await?;

    let thumbs = request_frontend::<Vec<MediaNfoThumb>>(
        event, parent, Some(id), RequestAction::GetThumbs
    ).await?;

    let client = init_client().await?;
    let content = thumbs.len();

    for (index, thumb) in thumbs.iter().enumerate() {
        tokio::select! {
            Ok(CtrlEvent::Cancel) = rx.recv() => {
                break;
            },
            res = async {
                let output_file = get_unique_path(ptask.folder.join(format!("{}.{}.jpg", &ptask.filename, thumb.id )));
                let response = client
                    .get(format!("{}@.jpg", thumb.url))
                    .send().await?;
                if response.status() != StatusCode::OK {
                    return Err(anyhow!("Error while fetching thumb {} ({})", thumb.url, response.status()));
                }
                let bytes = response.bytes().await?;
                fs::write(&output_file, &bytes).await?;
                status_tx.send((content as u64, index as u64)).await?;
                Ok::<(), anyhow::Error>(())
            } => res?
        }
    }

    status_tx.send((content as u64, content as u64)).await?;

    Ok(())
}

async fn handle_merge(
    ptask: ProgressTask,
    mut rx: Receiver<CtrlEvent>,
    video_path: Arc<RwLock<Option<PathBuf>>>,
    audio_path: Arc<RwLock<Option<PathBuf>>>,
) -> TauriResult<()> {
    let subtask = ptask.subtask;
    let event = ptask.event;
    let parent = ptask.task.id.clone();
    let id = subtask.id.clone();

    let video = video_path.read().await.clone().ok_or(anyhow!("No path for video found"))?;
    let audio = audio_path.read().await.clone().ok_or(anyhow!("No path for audio found"))?;

    let status_tx = update_progress(event, parent, id.clone());
    let (cancel_tx, cancel_rx) = oneshot::channel();

    let abr = ptask.task.select.abr.unwrap_or(0);
    let ext = get_ext(subtask.task_type.clone(), abr);
    
    let mut merge = Box::pin(ffmpeg::merge(id.clone(), ext, status_tx, cancel_rx, video.clone(), audio.clone()));
    let path = loop { tokio::select! {
        res = &mut merge => break res,
        Ok(CtrlEvent::Cancel) = rx.recv() => {
            // TODO: Clean
            let _ = cancel_tx.send(());
            return Ok(());
        }
    } }?;

    let output_file = get_unique_path(ptask.folder.join(format!("{}.{}", &ptask.filename, ext)));

    fs::copy(&path, output_file).await?;
    fs::remove_file(path).await?;

    if !ptask.task.select.media.video {
        fs::remove_file(video).await?;
    }
    if !ptask.task.select.media.audio {
        fs::remove_file(audio).await?;
    }
    Ok(())
}

async fn handle_media(
    ptask: ProgressTask,
    mut rx: Receiver<CtrlEvent>,
    video_path: Arc<RwLock<Option<PathBuf>>>,
    audio_path: Arc<RwLock<Option<PathBuf>>>,
) -> TauriResult<()> {
    let subtask = ptask.subtask;
    let event = ptask.event;
    let parent = ptask.task.id.clone();
    let id = subtask.id.clone();

    let urls = if let Some(urls) = ptask.urls {
        if subtask.task_type == TaskType::Video {
            urls.video_urls.clone()
        } else if subtask.task_type == TaskType::Audio {
            urls.audio_urls.clone()
        } else {
            None
        }.ok_or(anyhow!("No urls for type {:?} found", &subtask.task_type))?
    } else {
        return Err(anyhow!("No urls found").into());
    };

    let status_tx = update_progress(event, parent, id.clone());
    
    let mut download = Box::pin(aria2c::download(id.clone(), status_tx, urls));
    let path = loop { tokio::select! {
        res = &mut download => break res,
        msg = rx.recv() => match msg {
            Ok(CtrlEvent::Cancel) => {
                let _ = aria2c::cancel(id.clone()).await;
                return Ok(());
            },
            Ok(CtrlEvent::Pause) => {
                let _ = aria2c::pause(id.clone()).await;
            },
            Ok(CtrlEvent::Resume) => {
                let _ = aria2c::resume(id.clone()).await;
            },
            _ => ()
        }
    } }?;

    let abr = ptask.task.select.abr.unwrap_or(0);
    let ext = get_ext(subtask.task_type.clone(), abr);
    let output_file = get_unique_path(ptask.folder.join(format!("{}.{}", &ptask.filename, ext )));

    fs::copy(&path, &output_file).await?;
    fs::remove_file(path).await?;

    let mut guard = if subtask.task_type == TaskType::Video {
        video_path.write().await
    } else if subtask.task_type == TaskType::Audio {
        audio_path.write().await
    } else {
        return Err(anyhow!("No path for type {:?} found", &subtask.task_type).into());
    };
    
    *guard = Some(output_file);
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct MediaUrls {
    #[serde(rename = "videoUrls")]
    video_urls: Option<Vec<String>>,
    #[serde(rename = "audioUrls")]
    audio_urls: Option<Vec<String>>,
    select: Arc<PopupSelect>,
    folder: Arc<PathBuf>,
}

struct ProgressTask {
    event: Arc<Channel<ProcessEvent>>,
    task: Arc<GeneralTask>,
    subtask: Arc<SubTask>,
    urls: Option<Arc<MediaUrls>>,
    folder: Arc<PathBuf>,
    filename: Arc<String>,
}

async fn handle_task(scheduler: Arc<Scheduler>, task: Arc<RwLock<GeneralTask>>) -> TauriResult<()> {    
    let temp_root = config::read().temp_dir();
    fs::create_dir_all(&temp_root).await.context("Failed to create temp folder")?;

    let event = scheduler.event.clone();
    let task_snapshot = Arc::new(task.read().await.clone());
    let id = task_snapshot.id.clone();
    let select = task_snapshot.select.clone();

    event.send(ProcessEvent::TaskState { id: id.clone(), state: TaskState::Active })?;

    let nfo = request_frontend::<MediaNfo>(
        event.clone(), id.clone(), None, RequestAction::RefreshNfo
    ).await?;
    let mut guard = task.write().await;
    guard.nfo = nfo;

    let urls = if select.media.any_true() {
        let urls = request_frontend::<MediaUrls>(
            event.clone(), id.clone(), None, RequestAction::RefreshUrls
        ).await?;
        guard.select = urls.select.clone();
        guard.folder = urls.folder.clone();
        Some(urls)
    } else {
        None
    };
    let task_folder = config::read().task_folder;
    let folder = Arc::new(if task_folder {
        scheduler.folder.join(&*guard.folder)
    } else {
        scheduler.folder.clone()
    });
    guard.folder = folder.clone();

    drop(task_snapshot);
    drop(guard);

    let task = Arc::new(task.read().await.clone());
    fs::create_dir_all(&*folder).await.context("Failed to create output folder")?;

    let video_path: Arc<RwLock<Option<PathBuf>>> = Arc::new(RwLock::new(None));
    let audio_path: Arc<RwLock<Option<PathBuf>>> = Arc::new(RwLock::new(None));

    for subtask in task.subtasks.iter() {
        let sub_id = subtask.id.clone();
        log::info!("Handling subtask: {sub_id}\n    task_type: {:?}\n    parent: {id}", subtask.task_type);

        let filename = request_frontend::<String>(
            event.clone(),
            id.clone(),
            Some(sub_id.clone()),
            RequestAction::GetFilename
        ).await?;
        let ptask = ProgressTask {
            event: event.clone(),
            task: task.clone(),
            subtask: subtask.clone(),
            urls: urls.clone(),
            folder: folder.clone(),
            filename,
        };
        let video_clone = video_path.clone();
        let audio_clone = audio_path.clone();
        let folder = scheduler.folder.clone();
        match subtask.task_type {
            TaskType::Video | TaskType::Audio => {
                scheduler.try_join(&id, &sub_id, |rx| {
                    Box::pin(async { handle_media(ptask, rx, video_clone, audio_clone).await })
                }).await?;
            },
            TaskType::AudioVideo => {
                scheduler.try_join(&id, &sub_id, |rx| {
                    Box::pin(async { handle_merge(ptask, rx, video_clone, audio_clone).await })
                }).await?;
            },
            TaskType::Thumb => {
                scheduler.try_join(&id, &sub_id, |rx| {
                    Box::pin(async { handle_thumbs(ptask, rx).await })
                }).await?;
            },
            TaskType::LiveDanmaku | TaskType::HistoryDanmaku => {
                scheduler.try_join(&id, &sub_id, |rx| {
                    Box::pin(async { handle_danmaku(ptask, rx).await })
                }).await?;
            },
            TaskType::AlbumNfo | TaskType::SingleNfo => {
                scheduler.try_join(&id, &sub_id, |rx| {
                    Box::pin(async { handle_nfo(ptask, rx, folder).await })
                }).await?;
            },
            TaskType::AiSummary => {
                scheduler.try_join(&id, &sub_id, |rx| {
                    Box::pin(async { handle_ai_summary(ptask, rx).await })
                }).await?;
            },
            TaskType::Subtitles => {
                scheduler.try_join(&id, &sub_id, |rx| {
                    Box::pin(async { handle_subtitle(ptask, rx).await })
                }).await?;
            }
        }
    }

    QUEUE_MANAGER.move_task(&id, QueueType::Doing, QueueType::Complete).await;
    event.send(ProcessEvent::TaskState {
        id: id.clone(),
        state: TaskState::Completed
    })?;

    let status = request_frontend::<serde_json::Value>(event.clone(), id.clone(), None, RequestAction::GetStatus).await?;
    archive::insert(task, status).await?;
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn process_queue(event: Channel<ProcessEvent>, list: Vec<Arc<String>>, showtitle: Arc<String>) -> TauriResult<()> {
    let event = Arc::new(event);
    let max_conc = config::read().max_conc;
    let folder = get_unique_path(config::read().down_dir.join(&*showtitle));
    let scheduler = Scheduler::new(
        list.clone(), folder, event.clone(), max_conc
    );
    let mut guard = SCHEDULER_LIST.write().await;
    guard.push(scheduler.clone());
    drop(guard);

    for id in list {
        let event_clone = event.clone();
        let scheduler = scheduler.clone();
        async_runtime::spawn(async move {
            let scheduler_clone = scheduler.clone();
            let sem = scheduler_clone.sem.read().await;
            let permit = sem.acquire().await;
            let task = QUEUE_MANAGER.move_task(&id, QueueType::Waiting, QueueType::Doing).await.unwrap();
            match handle_task(scheduler, task.clone()).await {
                Ok(_) => if config::read().notify {
                    // TODO: Notification
                },
                Err(e) => {
                    log::error!("task {} failed: {e:#}", id.clone());
                    let _ = event_clone.send(ProcessEvent::Error {
                        id: id.clone(),
                        message: e.message,
                        code: e.code,
                    });
                    let _ = event_clone.send(ProcessEvent::TaskState {
                        id: id.clone(),
                        state: TaskState::Failed
                    });
                }
            }
            drop(permit);
        });
    }
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn submit_task(task: GeneralTask) -> TauriResult<()> {
    QUEUE_MANAGER.push_pending(task).await;
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn task_event(event: CtrlEvent, id: Arc<String>) -> TauriResult<()> {
    match event {
        CtrlEvent::OpenFolder => {
            let map = QUEUE_MANAGER.tasks.read().await;
            if let Some(task) = map.get(&id) {
                let path = task.read().await.folder.clone();
                tauri_plugin_opener::open_path(&*path, None::<&str>)?;
            }
        },
        CtrlEvent::Cancel => {
            QUEUE_MANAGER.pop_task(&id).await;
            archive::delete((&*id).clone()).await?;
        },
        _ => {
            let guard = SCHEDULER_LIST.read().await;
            let scheduler = guard.iter().find(|v| {
                v.list.iter().any(|v| v.as_str() == id.as_str())
            }).ok_or(anyhow!("No scheduler for task {id} found"))?;
            scheduler.get_ctrl(&id).await.unwrap().send(event.clone())?;
            scheduler.event.send(ProcessEvent::TaskState {
                id: id.clone(),
                state: match event {
                    CtrlEvent::Pause => TaskState::Paused,
                    CtrlEvent::Resume => TaskState::Active,
                    _ => TaskState::Cancelled,
                },
            })?;
        }
    }
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn update_max_conc(max_conc: usize) -> TauriResult<()> {
    let guard = SCHEDULER_LIST.read().await;
    for sch in guard.iter() {
        sch.update_max_conc(max_conc).await;
    }
    Ok(())
}