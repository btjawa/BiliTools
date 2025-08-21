use std::{collections::{HashMap, VecDeque}, fmt, future::Future, path::PathBuf, pin::Pin, sync::Arc};
use tokio::sync::{broadcast::{Sender, Receiver, channel}, mpsc, oneshot, RwLock, Semaphore};
use serde::{Serialize, Deserialize, de::DeserializeOwned};
use anyhow::{Context, Result, anyhow};
use notify_rust::Notification;
use lazy_static::lazy_static;

use tauri::{async_runtime, ipc::Channel, Listener};
use tauri_specta::Event;
use specta::Type;

use crate::{
    shared::{
        get_app_handle, get_unique_path
    },
    TauriResult, archive, config,
    queue::{
        types::{
            GeneralTask,
            TaskState,
            QueueData
        },
        handlers,
    },
};

lazy_static! {
    pub static ref QUEUE_MANAGER: QueueManager = QueueManager::new();
    static ref SCHEDULER_LIST: RwLock<Vec<Arc<Scheduler>>> = Default::default();
}

// Queue

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum QueueType {
    Waiting,
    Doing,
    Complete
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

    fn get_queue(&self, queue: &QueueType) -> &RwLock<VecDeque<Arc<String>>> {
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
        _from: QueueType,
        _to: QueueType
    ) -> Option<Arc<RwLock<GeneralTask>>> {
        let mut from = self.get_queue(&_from).write().await;
        if let Some(pos) = from.iter().position(|v| v.as_str() == id.as_str()) {
            from.remove(pos);
        } else {
            log::warn!("Task {id} not found in {:?}", from);
            return None;
        }
        drop(from);

        let mut to = self.get_queue(&_to).write().await;
        to.push_back(id.clone());
        drop(to);

        self.emit().await;

        log::info!("Task {id} moved: from {_from:?} to {_to:?}");

        let map = self.tasks.read().await;
        map.get(id).cloned()
    }

    pub async fn pop_task(
        &self,
        id: &Arc<String>,
    ) {
        let list = vec![
            self.get_queue(&QueueType::Waiting),
            self.get_queue(&QueueType::Doing),
            self.get_queue(&QueueType::Complete),
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

// Scheduler

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

pub struct Scheduler {
    pub list: Vec<Arc<String>>,
    pub folder: PathBuf,

    pub event: Arc<Channel<ProcessEvent>>,
    pub sem: RwLock<Arc<Semaphore>>,
    pub max_conc: RwLock<usize>,

    pub ctrls: RwLock<HashMap<Arc<String>, Sender<CtrlEvent>>>
}

impl Scheduler {
    pub fn new(list: Vec<Arc<String>>, folder: PathBuf, event: Arc<Channel<ProcessEvent>>, max_conc: usize) -> Arc<Self> {
        let mut map = HashMap::new();
        for id in &list {
            map.entry(id.clone()).or_insert_with(|| {
                let (tx, _rx) = channel::<CtrlEvent>(8); tx
            });
        }
        Arc::new(Self {
            list, folder, event,
            sem: RwLock::new(Arc::new(Semaphore::new(max_conc))),
            max_conc: RwLock::new(max_conc),
            ctrls: RwLock::new(map)
        })
    }

    pub async fn update_max_conc(&self, new_conc: usize) {
        let mut max_conc = self.max_conc.write().await;
        let mut sem = self.sem.write().await;
        if new_conc > *max_conc {
            (**sem).add_permits(new_conc - *max_conc);
        } else if new_conc < *max_conc {
            *sem = Arc::new(Semaphore::new(new_conc));
        }
        *max_conc = new_conc;
    }

    // Try join in the party >_<
    pub async fn try_join<F>(
        &self,
        parent: &Arc<String>,
        id: &Arc<String>,
        func: F,
    ) -> Result<()>
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
            return Err(anyhow!("Task {id} cancelled"));
        } else {
            let _ = result.unwrap_or(Ok(())).map_err(|e| self.event.send(ProcessEvent::Error {
                id: id.clone(),
                message: e.message,
                code: e.code,
            }));
        }
        Ok(())
    }

    pub async fn get_ctrl(&self, id: &Arc<String>) -> Option<Sender<CtrlEvent>> {
        self.ctrls.read().await.get(id).cloned()
    }
}

// Frontend bridge

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum RequestAction {
    GetStatus,
    RefreshNfo,
    RefreshUrls,
    RefreshFolder,
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
            RequestAction::RefreshFolder => "refreshFolder",
            RequestAction::GetFilename => "getFilename",
            RequestAction::GetNfo => "getNfo",
            RequestAction::GetThumbs => "getThumbs",
            RequestAction::GetDanmaku => "getDanmaku",
            RequestAction::GetSubtitle => "getSubtitle",
            RequestAction::GetAISummary => "getAISummary",
        })
    }
}

pub async fn request_frontend<T: DeserializeOwned + Send + 'static>(
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

pub fn update_progress(event: Arc<Channel<ProcessEvent>>, parent: Arc<String>, id: Arc<String>) -> mpsc::Sender<(u64, u64)> {
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

// Commands

#[tauri::command(async)]
#[specta::specta]
pub async fn process_queue(event: Channel<ProcessEvent>, list: Vec<Arc<String>>, name: Arc<String>) -> TauriResult<()> {
    let event = Arc::new(event);
    let max_conc = config::read().max_conc;
    let folder = get_unique_path(config::read().down_dir.join(&*name));
    let scheduler = Scheduler::new(
        list.clone(), folder.clone(), event.clone(), max_conc
    );
    let mut guard = SCHEDULER_LIST.write().await;
    guard.push(scheduler.clone());
    drop(guard);

    let mut handles = Vec::with_capacity(list.len());

    for id in list {
        let sem = { scheduler.sem.read().await.clone() };
        let permit = sem.acquire_owned().await;
        let event_clone = event.clone();
        let scheduler = scheduler.clone();
        let handle = async_runtime::spawn(async move {
            let _permit = permit;
            let task = QUEUE_MANAGER.move_task(&id, QueueType::Waiting, QueueType::Doing).await.unwrap();
            if let Err(e) = handlers::handle_task(scheduler, task.clone()).await {
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
            QUEUE_MANAGER.move_task(&id, QueueType::Doing, QueueType::Complete).await;
            drop(_permit);
        });
        handles.push(handle);
    }
    for h in handles {
        h.await?;
    }
    if config::read().notify {
        let mut notify = Notification::new();
        #[cfg(target_os = "windows")]
        {
            notify.app_id("com.btjawa.bilitools");
        }
        notify
            .summary("BiliTools")
            .body(&format!("{name}\nDownload complete~"))
            .show().unwrap();
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