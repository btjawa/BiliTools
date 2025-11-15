use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{Arc, Weak},
};

use anyhow::{Context, Result};
use specta::Type;
use tokio::{
    fs,
    sync::{OnceCell, RwLock},
};

use super::{
    atomics::{Atomic, TaskState},
    frontend::{self, TaskPrepareResp},
    handlers,
    manager::MANAGER,
    runtime::RUNTIME,
    types::{MediaItem, MediaNfo, PopupSelect},
};

use crate::{
    shared::process_err,
    storage::{config, tasks},
    TauriError, TauriResult,
};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Type)]
#[serde(rename_all = "camelCase")]
pub enum TaskType {
    OpusContent,
    OpusImages,
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
    pub id: String,
    #[serde(rename = "type")]
    pub task_type: TaskType,
    #[serde(skip_serializing, skip_deserializing, default)]
    task_weak: OnceCell<Weak<Task>>,
}

impl SubTask {
    pub fn reg_task(&self, task: &Arc<Task>) {
        let _ = self.task_weak.set(Arc::downgrade(task));
    }
    pub async fn send(&self, content: u64, chunk: u64) -> Result<()> {
        let Some(task_weak) = self.task_weak.get() else {
            return Ok(());
        };
        let Some(task) = task_weak.upgrade() else {
            return Ok(());
        };

        /* FRONTEND */
        frontend::progress(&task.id, &self.id, &content, &chunk)?;

        /* BACKEND */
        let mut status = task.status.write().await;
        status.insert(self.id.to_string(), SubTaskStatus { chunk, content });

        /* DATABASE */
        tasks::update_status(&task.id, &status).await?;
        Ok(())
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct SubTaskStatus {
    pub chunk: u64,
    pub content: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct TaskMeta {
    pub id: String,
    pub ts: u64,
    pub seq: usize,
    pub item: MediaItem,
    #[serde(rename = "type")]
    pub media_type: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct TaskPrepare {
    pub select: PopupSelect,
    pub subtasks: Vec<SubTask>,
    pub nfo: MediaNfo,
    pub folder: PathBuf,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct TaskHotData {
    pub status: HashMap<String, SubTaskStatus>,
    pub state: TaskState,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct TaskView {
    pub meta: TaskMeta,
    pub prepare: TaskPrepare,
    pub hot: TaskHotData,
}

#[derive(Debug)]
pub struct Task {
    pub id: String,
    pub ts: u64,
    pub seq: usize,
    pub item: MediaItem,
    pub media_type: String,

    /* NEED TO PREPARE */
    pub select: RwLock<PopupSelect>,
    pub subtasks: RwLock<Vec<SubTask>>,
    pub nfo: RwLock<MediaNfo>,
    pub folder: RwLock<PathBuf>,

    /* HOT DATA */
    pub status: RwLock<HashMap<String, SubTaskStatus>>,
    pub state: Atomic<TaskState>,
}

impl Task {
    pub fn new(value: TaskView) -> Arc<Self> {
        let m = value.meta;
        let p = value.prepare;
        let h = value.hot;
        Arc::new(Self {
            id: m.id,
            ts: m.ts,
            seq: m.seq,
            item: m.item,
            media_type: m.media_type,

            select: RwLock::new(p.select),
            subtasks: RwLock::new(p.subtasks),
            nfo: RwLock::new(p.nfo),
            folder: RwLock::new(p.folder),

            status: RwLock::new(h.status),
            state: Atomic::new(h.state),
        })
    }

    pub async fn init(&self) -> Result<()> {
        RUNTIME.ctrl.reg(self.id.clone()).await;
        Ok(())
    }

    pub async fn process(self: &Arc<Self>, sid: &str) -> TauriResult<()> {
        let id = &self.id;
        log::info!("Handling Task#{id}");

        let temp = config::read().temp_dir().join(&**id);
        fs::create_dir_all(&*temp)
            .await
            .context(format!("Failed to create temp folder for {id}"))?;

        let scheduler = MANAGER.get_scheduler(sid).await?;

        let res = handlers::handle_task(scheduler, &temp, self.clone()).await;

        fs::remove_dir_all(&*temp)
            .await
            .context(format!("Failed to cleanup temp folder for {id}"))?;

        res
    }

    pub async fn prepare(&self, prepare: &TaskPrepareResp, folder: PathBuf) -> Result<()> {
        let prepare = TaskPrepare {
            select: prepare.select.to_owned(),
            subtasks: prepare.subtasks.to_owned(),
            nfo: prepare.nfo.to_owned(),
            folder: folder.clone(),
        };

        /* BACKEND */
        *self.nfo.write().await = prepare.nfo.to_owned();
        *self.subtasks.write().await = prepare.subtasks.to_owned();
        *self.folder.write().await = folder;

        /* FRONTEND */
        frontend::task_updated(&self.id, None, Some(&prepare), None)?;

        /* DATABASE */
        tasks::update_prepare(&self.id, &prepare).await?;
        Ok(())
    }

    pub async fn state(&self, state: TaskState) -> Result<()> {
        /* BACKEND */
        self.state.set(state);

        /* FRONTEND */
        frontend::task_updated(&self.id, Some(&state), None, None)?;

        /* DATABASE */
        tasks::update_state(&self.id, state as u8).await?;
        Ok(())
    }

    pub async fn cancel_backlog(&self) -> Result<()> {
        /* BACKEND */
        self.state.set(TaskState::Cancelled);
        MANAGER.remove_backlog(&self.id).await?;

        /* FRONTEND */
        frontend::task_updated(&self.id, None, None, Some(true))?;

        /* DATABASE */
        tasks::delete(&self.id).await?;
        Ok(())
    }

    pub async fn cancel(&self, sid: &str) -> Result<()> {
        /* BACKEND */
        self.state.set(TaskState::Cancelled);
        MANAGER.remove(sid, Some(&self.id)).await?;
        RUNTIME.ctrl.get_handle(&self.id).await?.clean_all().await;

        /* FRONTEND */
        frontend::task_updated(&self.id, None, None, Some(true))?;

        /* DATABASE */
        tasks::delete(&self.id).await?;
        Ok(())
    }

    pub async fn restore(self: Arc<Self>, sid: &str) -> Result<()> {
        let scheduler = MANAGER.get_scheduler(sid).await?;
        if !scheduler.interrupted() {
            return Ok(());
        }

        self.retry(sid).await?;
        Ok(())
    }

    pub async fn retry(self: Arc<Self>, sid: &str) -> Result<()> {
        RUNTIME.ctrl.get_handle(&self.id).await?.clean_all().await;
        RUNTIME.ctrl.reg(self.id.clone()).await;
        self.state(TaskState::Pending).await?;

        let id = self.id.clone();
        log::info!("Task#{id} respawned via retry");

        let name = format!("Task#{id} (Retry)");
        let sid = sid.to_string();
        let fut = async move {
            self.state(TaskState::Active).await?;
            self.process(&sid).await?;
            self.state(TaskState::Completed).await?;
            Ok::<(), TauriError>(())
        };
        tauri::async_runtime::spawn(async move {
            let _ = fut.await.map_err(|e| process_err(e, &name));
        });

        Ok(())
    }
}
