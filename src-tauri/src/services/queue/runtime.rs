use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::{
    collections::HashMap,
    future::Future,
    pin::Pin,
    sync::{
        atomic::{AtomicBool, AtomicUsize, Ordering::SeqCst},
        Arc, LazyLock,
    },
};
use tokio::{
    sync::{broadcast::Sender, RwLock, Semaphore},
    task::JoinSet,
};
use tokio_util::sync::CancellationToken;

use crate::{storage::config, TauriResult};

use super::{
    atomics::{SchedulerState, TaskState},
    manager::MANAGER,
};

pub static RUNTIME: LazyLock<Runtime> = LazyLock::new(Runtime::new);

type CleanFn = Box<dyn FnOnce() -> CleanFnFut + Send + Sync + 'static>;

type CleanFnFut = Pin<Box<dyn Future<Output = TauriResult<()>> + Send>>;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Type)]
#[serde(rename_all = "lowercase")]
pub enum CtrlEvent {
    Pause,
    Resume,
    Cancel,
    Retry,
}

pub struct CtrlHandle {
    pub tx: Sender<CtrlEvent>,
    pub cancel: CancellationToken,
    pub paused: AtomicBool,
    pub cleaners: RwLock<Vec<CleanFn>>,
    pub epoch: AtomicUsize,
}

impl CtrlHandle {
    pub fn is_paused(&self) -> bool {
        self.paused.load(SeqCst)
    }
    pub fn is_cancelled(&self) -> bool {
        self.cancel.is_cancelled()
    }
    pub async fn reg_cleaner<Fut>(&self, fut: Fut) -> Result<()>
    where
        Fut: Future<Output = TauriResult<()>> + Send + Sync + 'static,
    {
        let cleaner = Box::new(move || Box::pin(fut) as CleanFnFut) as CleanFn;
        self.cleaners.write().await.push(cleaner);
        Ok(())
    }
    pub async fn clean_all(&self) {
        let cleaners = { self.cleaners.write().await.split_off(0) };
        let mut set = JoinSet::new();
        for c in cleaners {
            set.spawn(async move {
                let _ = c().await;
            });
        }
        set.join_all().await;
    }
}

pub struct Ctrl {
    map: RwLock<HashMap<String, Arc<CtrlHandle>>>,
}

impl Ctrl {
    fn new() -> Self {
        Self {
            map: Default::default(),
        }
    }
    pub async fn get_handle(&self, id: &str) -> Result<Arc<CtrlHandle>> {
        self.map
            .read()
            .await
            .get(id)
            .ok_or(anyhow!("Missing ctrl handle for {id}"))
            .cloned()
    }
    pub async fn reg(&self, id: String) {
        let mut map = self.map.write().await;
        map.insert(
            id,
            Arc::new(CtrlHandle {
                tx: Sender::new(8),
                cancel: CancellationToken::new(),
                paused: AtomicBool::new(false),
                cleaners: Default::default(),
                epoch: AtomicUsize::new(0),
            }),
        );
    }
    pub async fn send_task(
        &self,
        sid: &str,
        id: &str,
        event: &CtrlEvent,
        state: TaskState,
    ) -> Result<()> {
        let Some(task) = MANAGER.get_task(id).await else {
            return Ok(());
        };
        let ctrl = self.get_handle(id).await?;

        task.state(state).await?;

        match event {
            CtrlEvent::Cancel => {
                ctrl.cancel.cancel();
                task.cancel(sid).await?;
            }
            CtrlEvent::Retry => {
                ctrl.cancel.cancel();
                task.cancel(sid).await?;
                ctrl.epoch.fetch_add(1, SeqCst);
                self.reg(id.to_string()).await;
            }
            CtrlEvent::Pause => {
                ctrl.paused.store(true, SeqCst);
            }
            CtrlEvent::Resume => {
                ctrl.paused.store(false, SeqCst);
            }
        }
        let _ = ctrl.tx.send(event.clone());
        Ok(())
    }
    pub async fn send_scheduler(
        &self,
        sid: &str,
        event: &CtrlEvent,
        state: SchedulerState,
    ) -> Result<()> {
        let Some(scheduler) = MANAGER.get_scheduler(sid).await else {
            return Ok(());
        };

        scheduler.state(state).await?;

        match event {
            CtrlEvent::Cancel => {
                scheduler.cancel().await?;
            }
            CtrlEvent::Retry => {}
            CtrlEvent::Pause => {}
            CtrlEvent::Resume => {}
        }
        Ok(())
    }
}

pub struct Runtime {
    pub semaphore: RwLock<Arc<Semaphore>>,
    pub ctrl: Ctrl,
}

impl Runtime {
    fn new() -> Self {
        let conc = config::read().max_conc;
        Self {
            semaphore: RwLock::new(Arc::new(Semaphore::new(conc))),
            ctrl: Ctrl::new(),
        }
    }
}

#[tauri::command(async)]
#[specta::specta]
pub async fn ctrl_event(
    event: CtrlEvent,
    sid: &str,
    id: Option<&str>,
) -> TauriResult<()> {
    if let Some(id) = id {
        let state = match event {
            CtrlEvent::Pause => TaskState::Paused,
            CtrlEvent::Cancel => TaskState::Cancelled,
            CtrlEvent::Resume => TaskState::Active,
            CtrlEvent::Retry => TaskState::Pending,
        };
        RUNTIME.ctrl.send_task(&sid, &id, &event, state).await?;
    } else {
        let state = match event {
            CtrlEvent::Pause => SchedulerState::Paused,
            CtrlEvent::Cancel => SchedulerState::Cancelled,
            CtrlEvent::Resume => SchedulerState::Running,
            CtrlEvent::Retry => SchedulerState::Idle,
        };
        RUNTIME.ctrl.send_scheduler(&sid, &event, state).await?;
    }
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn open_folder(sid: &str, id: Option<&str>) -> TauriResult<()> {
    let path = if let Some(id) = id {
        let Some(task) = MANAGER.get_task(&id).await else {
            return Ok(());
        };
        let folder = task.folder.read().await;
        folder.clone()
    } else {
        let Some(scheduler) = MANAGER.get_scheduler(sid).await else {
            return Ok(());
        };
        scheduler.folder.clone()
    };
    tauri_plugin_opener::open_path(&*path, None::<&str>)?;
    Ok(())
}
