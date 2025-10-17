use std::{future::Future, path::PathBuf, pin::pin, sync::Arc};

use anyhow::Result;
use serde::Serialize;
use tokio::{sync::RwLock, task::JoinSet};

use specta::Type;

use super::{
    atomics::{Atomic, QueueType, SchedulerState, TaskState},
    frontend,
    manager::MANAGER,
    runtime::{CtrlEvent, RUNTIME},
};

use crate::{
    shared::{get_ts, get_unique_path, process_err},
    storage::{config, schedulers},
    TauriResult,
};

pub struct Scheduler {
    pub sid: String,
    pub ts: i64,
    pub list: RwLock<Vec<String>>,
    pub queue: Atomic<QueueType>,
    pub state: Atomic<SchedulerState>,
    pub folder: PathBuf,
}

#[derive(Debug, Clone, Serialize, Type)]
pub struct SchedulerView {
    pub sid: String,
    pub ts: i64,
    pub list: Vec<String>,
    pub queue: QueueType,
    pub state: SchedulerState,
}

impl SchedulerView {
    pub async fn from(value: &Scheduler) -> Self {
        Self {
            sid: value.sid.clone(),
            ts: value.ts,
            list: value.list.read().await.clone(),
            queue: value.queue.get(),
            state: value.state.get(),
        }
    }
}

impl Scheduler {
    pub fn new(sid: String, list: Vec<String>, top_folder: PathBuf) -> Arc<Self> {
        let folder = if config::read().organize.top_folder {
            get_unique_path(config::read().down_dir.join(top_folder))
        } else {
            config::read().down_dir.clone()
        };

        Arc::new(Self {
            sid,
            ts: get_ts(false),
            list: RwLock::new(list),
            queue: Atomic::new(QueueType::Pending),
            state: Atomic::new(SchedulerState::Idle),
            folder: folder,
        })
    }

    pub async fn dispatch(self: Arc<Self>) -> TauriResult<()> {
        let sem = { RUNTIME.semaphore.read().await.clone() };
        let mut set = JoinSet::new();
        let list = { self.list.read().await.clone() };
        for id in list {
            let this = self.clone();
            let sem = sem.clone();
            let Some(task) = MANAGER.get_task(&id).await else {
                continue;
            };
            if !matches!(
                task.state.get(),
                TaskState::Pending | TaskState::Paused | TaskState::Active
            ) {
                continue;
            }
            set.spawn(async move {
                task.state(TaskState::Pending).await?;
                let _permit = sem.acquire_owned().await;
                task.state(TaskState::Active).await?;
                MANAGER.move_scheduler(&this.sid, QueueType::Doing).await?;

                let res = task.process(&this.sid).await;
                match &res {
                    Ok(_) => task.state(TaskState::Completed).await,
                    _ => task.state(TaskState::Failed).await,
                }?;
                res
            });
        }

        let mut ok = true;

        while let Some(res) = set.join_next().await {
            match res {
                Ok(Ok(_)) => (),
                Ok(Err(_)) => ok = false,
                Err(e) => {
                    log::error!("Join error: {e:?}");
                    process_err(e, "Dispatch");
                    ok = false;
                }
            }
        }

        if ok {
            MANAGER
                .move_scheduler(&self.sid, QueueType::Complete)
                .await?;
            self.state(SchedulerState::Completed).await?;
        } else {
            log::error!(
                "Scheduler#{} not fully completed, stuck in {:?}, state {:?}",
                self.sid,
                self.queue.get(),
                self.state.get(),
            );
            self.state(SchedulerState::Failed).await?;
        }
        Ok(())
    }

    pub async fn try_join(
        &self,
        id: &str,
        sub_id: &str,
        fut: impl Future<Output = TauriResult<()>>,
    ) -> TauriResult<()> {
        let ctrl = RUNTIME.ctrl.get_handle(id).await?;
        if ctrl.is_cancelled() {
            return Ok(());
        }
        let mut rx = ctrl.tx.subscribe();

        let res = tokio::select! {
            r = &mut pin!(fut) => r,
            _ = ctrl.cancel.cancelled() => return Ok(()),
        };

        if let Err(e) = &res {
            log::error!("Task#{id} failed: {e:#}");
            frontend::error(id, Some(sub_id), e)?;
            return res;
        }

        if !ctrl.is_paused() {
            return Ok(());
        }
        log::info!("Subtask#{sub_id}, Task#{id} is paused, waiting for resume...");
        tokio::select! {
            Ok(CtrlEvent::Resume) = rx.recv() => {
                log::info!(
                    "Subtask#{sub_id}, Task#{id} resumed"
                );
            }
            _ = ctrl.cancel.cancelled() => {
                log::info!(
                    "Subtask#{sub_id}, Task#{id} cancelled while paused"
                );
            }
        }

        Ok(())
    }

    pub async fn queue(&self, queue: QueueType) -> Result<()> {
        /* BACKEND */
        self.queue.set(queue);

        /* FRONTEND */
        frontend::scheduler_queue(&self.sid, &queue)?;

        /* DATABASE */
        schedulers::update_queue(&self.sid, queue as u8).await?;
        Ok(())
    }

    pub async fn state(&self, state: SchedulerState) -> Result<()> {
        /* BACKEND */
        self.state.set(state);

        /* FRONTEND */
        frontend::scheduler_state(&self.sid, &state)?;

        /* DATABASE */
        schedulers::update_state(&self.sid, state as u8).await?;
        Ok(())
    }

    pub async fn cancel(self: Arc<Self>) -> Result<()> {
        if self.state.get() == SchedulerState::Cancelled {
            return Ok(());
        }
        self.state(SchedulerState::Cancelled).await?;

        /* FRONTEND */

        for id in self.list.read().await.iter() {
            let Some(task) = MANAGER.get_task(id).await else {
                continue;
            };
            task.cancel(&self.sid).await?;
        }
        MANAGER.remove(&self.sid, None).await?;
        Ok(())
    }
}
