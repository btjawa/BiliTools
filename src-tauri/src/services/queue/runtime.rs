use anyhow::{anyhow, Context, Result};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::{
    collections::{HashMap, VecDeque},
    future::Future,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering::SeqCst},
        Arc, LazyLock,
    },
};
use tauri_specta::Event;
use tokio::sync::{
    broadcast::{self, Receiver, Sender},
    oneshot, OnceCell, RwLock, Semaphore,
};

use specta::Type;
use tauri::{async_runtime, Listener};

use crate::{
    archive, config,
    errors::{TauriError, TauriResult},
    queue::{
        handlers,
        types::{QueueData, Task},
    },
    shared::{get_app_handle, get_ts, get_unique_path, process_err},
    storage::schedulers,
};

use super::types::{PopupSelect, QueueType, SubTaskStatus, TaskState};

pub static TASK_MANAGER: LazyLock<TaskManager> = LazyLock::new(TaskManager::new);

pub static QUEUE_READY: LazyLock<OnceCell<()>> = LazyLock::new(OnceCell::new);

// Syncing

pub struct Progress {
    parent: Arc<String>,
    id: Arc<String>,
}

impl Progress {
    pub fn new(parent: Arc<String>, id: Arc<String>) -> Self {
        Self { parent, id }
    }
    pub async fn send(&self, content: u64, chunk: u64) -> Result<()> {
        TASK_MANAGER
            .progress(&self.parent, &self.id, content, chunk)
            .await
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, Event)]
#[serde(
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    tag = "type"
)]
pub enum QueueEvent {
    Snapshot {
        init: bool,
        queue: QueueData,
        #[serde(skip_serializing_if = "Option::is_none")]
        tasks: Option<HashMap<Arc<String>, Arc<Task>>>,
        #[serde(skip_serializing_if = "Option::is_none")]
        schedulers: Option<HashMap<Arc<String>, Arc<SchedulerView>>>,
    },
    State {
        parent: Arc<String>,
        state: TaskState,
    },
    Progress {
        parent: Arc<String>,
        id: Arc<String>,
        status: SubTaskStatus,
    },
    Request {
        parent: Arc<String>,
        subtask: Option<Arc<String>>,
        action: RequestAction,
    },
    Error {
        parent: Arc<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        id: Option<Arc<String>>,
        message: String,
        code: Option<isize>,
    },
}

// Tasks

pub struct TaskManager {
    pub schedulers: RwLock<HashMap<Arc<String>, Arc<Scheduler>>>,
    pub tasks: RwLock<HashMap<Arc<String>, Arc<RwLock<Task>>>>,
    pub waiting: RwLock<VecDeque<Arc<String>>>,
    pub doing: RwLock<VecDeque<Arc<String>>>,
    pub complete: RwLock<VecDeque<Arc<String>>>,
    pub sem: RwLock<Arc<Semaphore>>,
    pub conc: RwLock<usize>,
}

impl Default for TaskManager {
    fn default() -> Self {
        Self::new()
    }
}

impl TaskManager {
    pub fn new() -> Self {
        let conc = config::read().max_conc;
        Self {
            schedulers: Default::default(),
            tasks: Default::default(),
            waiting: Default::default(),
            doing: Default::default(),
            complete: Default::default(),
            sem: RwLock::new(Arc::new(Semaphore::new(conc))),
            conc: RwLock::new(conc),
        }
    }

    pub fn get_queue(&self, queue: &QueueType) -> &RwLock<VecDeque<Arc<String>>> {
        match queue {
            QueueType::Waiting => &self.waiting,
            QueueType::Doing => &self.doing,
            QueueType::Complete => &self.complete,
        }
    }

    pub async fn get_task(&self, id: &Arc<String>) -> Option<Arc<RwLock<Task>>> {
        let tasks = TASK_MANAGER.tasks.read().await;
        tasks.get(id).cloned()
    }

    pub async fn get_scheduler(&self, sid: &Arc<String>) -> Result<Arc<Scheduler>> {
        let schedulers = self.schedulers.read().await;
        schedulers
            .get(sid)
            .cloned()
            .ok_or(anyhow!("No scheduler with sid {sid} found"))
    }

    pub async fn push_pending(&self, task: Task) -> Result<()> {
        archive::upsert(&task).await?;
        let task = Arc::new(RwLock::new(task));
        let (id, ts) = {
            let guard = task.read().await;
            (guard.id.clone(), guard.ts)
        };
        let mut map = self.tasks.write().await;
        map.insert(id.clone(), task);
        drop(map);

        let sch = self
            .get_scheduler(&Arc::new(schedulers::WAITING_SID.into()))
            .await?;
        let mut list = sch.list.write().await;
        list.push(id.clone());
        let snapshot = list.clone();
        drop(list);

        schedulers::update_list(schedulers::WAITING_SID, &snapshot).await?;
        log::info!("Pushed new task: {id}, time: {ts}");
        self.snapshot(false).await?;
        Ok(())
    }

    pub async fn plan_scheduler(
        &self,
        sid: &Arc<String>,
        filename: &str,
    ) -> Result<Arc<Scheduler>> {
        let sch = self
            .get_scheduler(&Arc::new(schedulers::WAITING_SID.into()))
            .await?;
        let mut guard = sch.list.write().await;
        let list = guard.clone();
        guard.clear();
        drop(guard);
        schedulers::update_list(schedulers::WAITING_SID, &[]).await?;
        if list.is_empty() {
            return Err(anyhow!("No unassigned tasks"));
        }
        let folder = if config::read().organize.top_folder {
            &get_unique_path(config::read().down_dir.join(filename))
        } else {
            &config::read().down_dir
        };
        let scheduler = Scheduler::new(sid.clone(), list.clone(), folder.clone());
        let mut guard = self.schedulers.write().await;
        guard.insert(sid.clone(), scheduler.clone());
        drop(guard);
        let mut guard = self.doing.write().await;
        guard.push_back(sid.clone());
        drop(guard);
        log::info!("Planed new scheduler: {sid}");
        schedulers::upsert(sid, QueueType::Doing, &list, folder, None).await?;
        self.snapshot(true).await?;
        Ok(scheduler)
    }

    pub async fn move_scheduler(
        &self,
        sid: &Arc<String>,
        f: QueueType,
        t: QueueType,
    ) -> Result<()> {
        let mut from = self.get_queue(&f).write().await;
        if let Some(pos) = from.iter().position(|v| v.as_str() == sid.as_str()) {
            from.remove(pos);
        } else {
            return Err(anyhow!("No scheduler with sid {sid} found"));
        }
        drop(from);

        let mut to = self.get_queue(&t).write().await;
        to.push_back(sid.clone());
        drop(to);

        log::info!("Scheduler {sid} moved: from {f:?} to {t:?}");
        schedulers::move_queue(sid, t).await?;
        self.snapshot(false).await?;
        Ok(())
    }

    pub async fn state(&self, parent: &Arc<String>, state: TaskState) -> Result<()> {
        let Some(lock) = self.get_task(parent).await else {
            return Ok(());
        };
        let mut task = lock.write().await;
        task.state = state.clone();
        let snapshot = task.clone();
        archive::upsert(&snapshot).await?;
        let app = get_app_handle();
        QueueEvent::State {
            parent: parent.clone(),
            state,
        }
        .emit(app)?;
        Ok(())
    }

    pub async fn progress(
        &self,
        parent: &Arc<String>,
        id: &Arc<String>,
        content: u64,
        chunk: u64,
    ) -> Result<()> {
        if let Some(lock) = self.get_task(parent).await {
            let mut task = lock.write().await;
            let status = task.status.get_mut(id).ok_or(anyhow!(format!(
                "Failed to get subtask: {id}, parent: {parent}"
            )))?;
            *status = Arc::new(SubTaskStatus { content, chunk });
            archive::upsert(&task).await?;
        }
        let app = get_app_handle();
        QueueEvent::Progress {
            parent: parent.clone(),
            id: id.clone(),
            status: SubTaskStatus { content, chunk },
        }
        .emit(app)?;
        Ok(())
    }

    pub async fn snapshot(&self, with_tasks: bool) -> Result<()> {
        let queue = QueueData {
            waiting: self.waiting.read().await.clone(),
            doing: self.doing.read().await.clone(),
            complete: self.complete.read().await.clone(),
        };
        let tasks = if with_tasks {
            let mut map = HashMap::new();
            let guard = self.tasks.read().await;
            for (id, lock) in guard.iter() {
                map.insert(id.clone(), Arc::new(lock.read().await.clone()));
            }
            Some(map)
        } else {
            None
        };
        let schedulers = {
            let mut map = HashMap::new();
            let guard = self.schedulers.read().await;
            for (id, sch) in guard.iter() {
                map.insert(
                    id.clone(),
                    Arc::new(SchedulerView {
                        sid: sch.sid.clone(),
                        ts: sch.ts,
                        list: sch.list.read().await.clone(),
                    }),
                );
            }
            Some(map)
        };
        let app = get_app_handle();
        let init = if QUEUE_READY.get().is_none() {
            QUEUE_READY.set(())?;
            true
        } else {
            false
        };
        QueueEvent::Snapshot {
            init,
            queue,
            tasks,
            schedulers,
        }
        .emit(app)?;
        Ok(())
    }

    pub async fn update_max_conc(&self, new_conc: usize) {
        use std::cmp::Ordering;
        let mut conc = self.conc.write().await;
        let mut sem = self.sem.write().await;
        match new_conc.cmp(&*conc) {
            Ordering::Greater => (**sem).add_permits(new_conc - *conc),
            Ordering::Less => *sem = Arc::new(Semaphore::new(new_conc)),
            Ordering::Equal => (),
        }
        *conc = new_conc;
    }

    pub async fn housekeeping(&self, id: &Arc<String>) -> Result<()> {
        let Some(lock) = self.get_task(id).await else {
            return Ok(());
        };
        let mut task = lock.write().await;
        let subtasks = task
            .subtasks
            .iter()
            .map(|t| t.id.clone())
            .collect::<Vec<_>>();
        let temp_root = config::read().temp_dir();
        for id in subtasks {
            let dir = temp_root.join(&*id);
            let _ = tokio::fs::remove_dir_all(dir).await;
            let _ = crate::services::aria2c::cancel(id.clone()).await;
            task.status.insert(
                id,
                Arc::new(SubTaskStatus {
                    chunk: 0,
                    content: 0,
                }),
            );
        }
        Ok(())
    }

    pub async fn pop_task(&self, sid: &Arc<String>, id: &Arc<String>) -> Result<()> {
        archive::delete(id).await?;

        let sch = self.get_scheduler(sid).await?;
        sch.ctrls.write().await.remove(id);

        let mut list = sch.list.write().await;
        list.retain(|v| v.as_str() != id.as_str());
        let snapshot = list.clone();
        drop(list);
        drop(sch);

        self.tasks.write().await.remove(id);
        schedulers::update_list(sid, &snapshot).await?;
        if snapshot.is_empty() && sid.as_str() != schedulers::WAITING_SID {
            self.schedulers.write().await.remove(sid);
            schedulers::delete(sid).await?;
            for q in [&self.doing, &self.complete, &self.waiting] {
                let mut guard = q.write().await;
                if let Some(pos) = guard.iter().position(|v| v.as_str() == sid.as_str()) {
                    guard.remove(pos);
                }
            }
        }
        self.snapshot(true).await?;
        Ok(())
    }
}

// Scheduler

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Type)]
#[serde(rename_all = "lowercase")]
pub enum CtrlEvent {
    Pause,
    Resume,
    Cancel,
    Retry,
}

#[derive(Debug)]
struct CtrlEntry {
    tx: Sender<CtrlEvent>,
    cancelled: AtomicBool,
    paused: AtomicBool,
}

impl CtrlEntry {
    fn new() -> Self {
        let (tx, _) = broadcast::channel::<CtrlEvent>(8);
        Self {
            tx,
            cancelled: AtomicBool::new(false),
            paused: AtomicBool::new(false),
        }
    }
    fn send(&self, event: CtrlEvent, id: &Arc<String>) {
        log::info!("Event #{id} {event:?} received");
        match event {
            CtrlEvent::Retry => {
                let _ = self.tx.send(CtrlEvent::Cancel);
                let _ = self.tx.send(CtrlEvent::Retry);
            }
            CtrlEvent::Cancel => {
                if !self.cancelled.swap(true, SeqCst) {
                    let _ = self.tx.send(CtrlEvent::Cancel);
                }
            }
            CtrlEvent::Pause => {
                if !self.cancelled.load(SeqCst) && !self.paused.swap(true, SeqCst) {
                    let _ = self.tx.send(CtrlEvent::Pause);
                }
            }
            CtrlEvent::Resume => {
                if !self.cancelled.load(SeqCst) && self.paused.swap(false, SeqCst) {
                    let _ = self.tx.send(CtrlEvent::Resume);
                }
            }
        }
    }
    fn is_paused(&self) -> bool {
        self.paused.load(SeqCst)
    }
    fn is_cancelled(&self) -> bool {
        self.cancelled.load(SeqCst)
    }
}

#[derive(Debug)]
pub struct Scheduler {
    pub sid: Arc<String>,
    pub ts: i64,
    pub list: RwLock<Vec<Arc<String>>>,
    pub folder: PathBuf,
    ctrls: RwLock<HashMap<Arc<String>, Arc<CtrlEntry>>>,
    inited: OnceCell<()>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SchedulerView {
    pub sid: Arc<String>,
    pub ts: i64,
    pub list: Vec<Arc<String>>,
}

impl Scheduler {
    pub fn new(sid: Arc<String>, list: Vec<Arc<String>>, folder: PathBuf) -> Arc<Self> {
        let mut map = HashMap::new();
        for id in &list {
            map.insert(id.clone(), Arc::new(CtrlEntry::new()));
        }
        Arc::new(Self {
            sid,
            ts: get_ts(false),
            folder,
            list: RwLock::new(list),
            ctrls: RwLock::new(map),
            inited: OnceCell::new(),
        })
    }

    async fn get_ctrl(&self, id: &Arc<String>) -> Option<Arc<CtrlEntry>> {
        let ctrls = self.ctrls.read().await;
        ctrls.get(id).cloned()
    }

    pub fn dispatch_spawned(self: Arc<Self>) {
        let name = format!("Scheduler #{}", self.sid);
        log::info!("{name} restored via database");
        async_runtime::spawn(async move {
            let _ = self.dispatch().await.map_err(|e| process_err(e, &name));
        });
    }

    async fn dispatch(self: Arc<Self>) -> TauriResult<()> {
        let list = { self.list.read().await.clone() };
        let mut handles = Vec::with_capacity(list.len());
        for id in list {
            let scheduler = self.clone();
            handles.push(async_runtime::spawn(async move {
                scheduler.handle_task(&id).await?;
                Ok::<(), TauriError>(())
            }));
        }
        for h in handles {
            h.await??;
        }
        TASK_MANAGER
            .move_scheduler(&self.sid, QueueType::Doing, QueueType::Complete)
            .await?;
        Ok(())
    }

    pub fn handle_task_spawned(self: Arc<Self>, id: &Arc<String>) {
        let name = format!("Task #{id}");
        log::info!("{name} respawned via retry");
        let id = id.clone();
        async_runtime::spawn(async move {
            let _ = self
                .handle_task(&id)
                .await
                .map_err(|e| process_err(e, &name));
        });
    }

    async fn handle_task(self: Arc<Self>, id: &Arc<String>) -> TauriResult<()> {
        let Some(task) = TASK_MANAGER.get_task(id).await else {
            return Ok(());
        };
        let sem = { TASK_MANAGER.sem.read().await.clone() };
        let permit = sem.acquire_owned().await;
        let _permit = permit;

        TASK_MANAGER.state(id, TaskState::Active).await?;
        match handlers::handle_task(self, task).await {
            Ok(_) => {
                log::info!("task {} successfully completed", id.clone());
                TASK_MANAGER.state(id, TaskState::Completed).await?;
            }
            Err(e) => {
                log::error!("task {} failed: {e:#}", id.clone());
                let app = get_app_handle();
                QueueEvent::Error {
                    parent: id.clone(),
                    id: None,
                    message: format!("Task {id} failed: \n{}", e.message),
                    code: e.code.map(|v| v.saturating_isize()),
                }
                .emit(app)?;
                TASK_MANAGER.state(id, TaskState::Failed).await?;
            }
        }
        Ok(())
    }

    pub async fn try_join<F, Fut>(
        &self,
        parent: &Arc<String>,
        id: &Arc<String>,
        func: F,
    ) -> TauriResult<()>
    where
        F: FnOnce(Receiver<CtrlEvent>) -> Fut,
        Fut: Future<Output = TauriResult<()>>,
    {
        let Some(ctrl) = self.get_ctrl(parent).await else {
            return Ok(());
        };
        let mut rx = ctrl.tx.subscribe();
        let task_rx = ctrl.tx.subscribe();
        if let Err(e) = func(task_rx).await {
            return Err(TauriError::new(
                format!("SubTask {id} failed: \n{}", e.message),
                e.code,
            ));
        }
        loop {
            if !ctrl.is_paused() || ctrl.is_cancelled() {
                break;
            }
            if let Ok(CtrlEvent::Resume) = rx.recv().await {
                break;
            }
        }
        Ok(())
    }
}

// Frontend bridge

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum RequestAction {
    RefreshNfo,
    RefreshUrls,
    RefreshFolder,
    GetFilename,
    GetNfo,
    GetThumbs,
    GetDanmaku,
    GetSubtitle,
    GetAISummary,
    GetOpusContent,
    GetOpusImages,
}

impl RequestAction {
    fn as_str(&self) -> &str {
        match self {
            RequestAction::RefreshNfo => "refreshNfo",
            RequestAction::RefreshUrls => "refreshUrls",
            RequestAction::RefreshFolder => "refreshFolder",
            RequestAction::GetFilename => "getFilename",
            RequestAction::GetNfo => "getNfo",
            RequestAction::GetThumbs => "getThumbs",
            RequestAction::GetDanmaku => "getDanmaku",
            RequestAction::GetSubtitle => "getSubtitle",
            RequestAction::GetAISummary => "getAISummary",
            RequestAction::GetOpusContent => "getOpusContent",
            RequestAction::GetOpusImages => "getOpusImages",
        }
    }
}

pub async fn request_frontend<T: DeserializeOwned + Send + 'static>(
    parent: Arc<String>,
    subtask: Option<Arc<String>>,
    action: RequestAction,
) -> Result<Arc<T>> {
    let (tx, rx) = oneshot::channel::<Result<Option<T>>>();
    let app = get_app_handle();
    let id = if let Some(id) = &subtask { id } else { &parent };
    let endpoint = format!("{}_{}", action.as_str(), id);
    app.once(endpoint, move |event| {
        let _ = tx.send(
            serde_json::from_str::<Option<T>>(event.payload())
                .context("Failed to deserialize frontend response"),
        );
    });
    QueueEvent::Request {
        parent,
        subtask,
        action,
    }
    .emit(app)?;
    let result = rx.await.context("No response from frontend")??;

    Ok(Arc::new(
        result.ok_or(anyhow!("Error occurred from frontend"))?,
    ))
}

// Commands

#[tauri::command(async)]
#[specta::specta]
pub async fn process_queue(sid: Arc<String>, folder: String) -> TauriResult<()> {
    let scheduler = TASK_MANAGER.plan_scheduler(&sid, &folder).await?;
    scheduler.clone().dispatch().await?;
    #[cfg(target_os = "windows")]
    if config::read().notify && !scheduler.list.read().await.is_empty() {
        notify_rust::Notification::new()
            .app_id("com.btjawa.bilitools")
            .summary("BiliTools")
            .body(&format!("{folder}\nDownload complete~"))
            .show()?;
    }
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn submit_task(task: Task) -> TauriResult<()> {
    TASK_MANAGER.push_pending(task).await?;
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn open_folder(sid: Arc<String>, id: Option<Arc<String>>) -> TauriResult<()> {
    let sch = TASK_MANAGER.get_scheduler(&sid).await?;
    if let Some(id) = id {
        if let Some(task) = TASK_MANAGER.get_task(&id).await {
            let path = task.read().await.folder.clone();
            tauri_plugin_opener::open_path(&*path, None::<&str>)?;
        }
    } else {
        tauri_plugin_opener::open_path(&*sch.folder, None::<&str>)?;
    }
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn ctrl_event(
    event: CtrlEvent,
    sid: Arc<String>,
    list: Vec<Arc<String>>,
) -> TauriResult<()> {
    let sch = TASK_MANAGER.get_scheduler(&sid).await?;
    if sch.inited.set(()).is_ok() && event == CtrlEvent::Resume {
        sch.clone().dispatch_spawned();
    }
    for id in list {
        if let Some(ctrl) = sch.get_ctrl(&id).await {
            ctrl.send(event.clone(), &id);
        }
        TASK_MANAGER
            .state(
                &id,
                match event {
                    CtrlEvent::Pause => TaskState::Paused,
                    CtrlEvent::Cancel => TaskState::Cancelled,
                    CtrlEvent::Resume | CtrlEvent::Retry => TaskState::Active,
                },
            )
            .await?;
        if event == CtrlEvent::Retry {
            TASK_MANAGER.housekeeping(&id).await?;
            let id = id.clone();
            sch.ctrls
                .write()
                .await
                .insert(id.clone(), Arc::new(CtrlEntry::new()));
            let sch_clone = sch.clone();
            sch_clone.handle_task_spawned(&id);
        }
        if event == CtrlEvent::Cancel {
            TASK_MANAGER.housekeeping(&id).await?;
            TASK_MANAGER.pop_task(&sid, &id).await?;
        }
    }
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn update_max_conc(new_conc: usize) -> TauriResult<()> {
    TASK_MANAGER.update_max_conc(new_conc).await;
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn update_select(id: Arc<String>, select: Arc<PopupSelect>) -> TauriResult<()> {
    if let Some(task) = TASK_MANAGER.get_task(&id).await {
        task.write().await.select = select;
    }
    Ok(())
}
