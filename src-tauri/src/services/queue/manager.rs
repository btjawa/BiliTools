use anyhow::{anyhow, Result};
use std::{
    collections::{HashMap, VecDeque},
    path::PathBuf,
    sync::{Arc, LazyLock},
};
use tokio::sync::RwLock;

use super::{
    atomics::QueueType,
    frontend,
    scheduler::{Scheduler, SchedulerView},
    task::{Task, TaskView},
};

use crate::{
    storage::{config, queue, schedulers, tasks},
    TauriResult,
};

pub static MANAGER: LazyLock<Manager> = LazyLock::new(Manager::new);

pub struct Manager {
    pub schedulers: RwLock<HashMap<Arc<String>, Arc<Scheduler>>>,
    pub tasks: RwLock<HashMap<Arc<String>, Arc<Task>>>,
    pub backlog: RwLock<VecDeque<Arc<String>>>, // Task#id
    pub pending: RwLock<VecDeque<Arc<String>>>, // Scheduler#sid
    pub doing: RwLock<VecDeque<Arc<String>>>,
    pub complete: RwLock<VecDeque<Arc<String>>>,
}

impl Manager {
    fn new() -> Self {
        Self {
            schedulers: Default::default(),
            tasks: Default::default(),
            backlog: Default::default(),
            pending: Default::default(),
            doing: Default::default(),
            complete: Default::default(),
        }
    }

    pub async fn get_task(&self, id: &Arc<String>) -> Option<Arc<Task>> {
        self.tasks.read().await.get(id).cloned()
    }

    pub async fn get_scheduler(&self, sid: &Arc<String>) -> Option<Arc<Scheduler>> {
        self.schedulers.read().await.get(sid).cloned()
    }

    pub fn get_queue(&self, queue: &QueueType) -> &RwLock<VecDeque<Arc<String>>> {
        match queue {
            QueueType::Backlog => &self.backlog,
            QueueType::Pending => &self.pending,
            QueueType::Doing => &self.doing,
            QueueType::Complete => &self.complete,
        }
    }

    async fn submit_backlog(&self, id: String, value: TaskView) -> Result<()> {
        let id = Arc::new(id);
        tasks::upsert(&id, &value).await?;

        let task = Task::new(value);
        task.init().await?;

        let mut tasks = self.tasks.write().await;
        tasks.insert(id.clone(), task);
        drop(tasks);

        let mut backlog = self.backlog.write().await;
        backlog.push_back(id.clone());
        drop(backlog);

        log::info!("Pushed new task: {id}");
        Ok(())
    }

    async fn plan_scheduler(&self, sid: String, top_folder: PathBuf) -> Result<Arc<Scheduler>> {
        let sid = Arc::new(sid);

        let mut backlog = self.backlog.write().await;
        let list = backlog.clone();
        backlog.clear();
        drop(backlog);

        let scheduler = Scheduler::new(sid.clone(), list.into(), top_folder);
        schedulers::upsert(&sid, &scheduler).await?;

        let mut schedulers = self.schedulers.write().await;
        schedulers.insert(sid.clone(), scheduler.clone());
        drop(schedulers);

        let mut pending = self.pending.write().await;
        pending.push_back(sid.clone());
        drop(pending);

        log::info!("Planed new scheduler: {sid}");
        Ok(scheduler)
    }

    pub async fn move_scheduler(&self, sid: &Arc<String>, t: QueueType) -> Result<()> {
        let Some(scheduler) = self.get_scheduler(sid).await else {
            return Ok(());
        };

        let f = scheduler.queue.get();

        if f == t || t == QueueType::Backlog {
            return Ok(());
        }

        let mut from = self.get_queue(&f).write().await;
        if let Some(pos) = from.iter().position(|v| v.as_str() == sid.as_str()) {
            from.remove(pos);
        }
        frontend::queue(&f, &from)?;
        queue::upsert(f, &from).await?;
        drop(from);

        let mut to = self.get_queue(&t).write().await;
        to.push_back(sid.clone());
        frontend::queue(&t, &to)?;
        queue::upsert(t, &to).await?;
        drop(to);

        scheduler.queue(t).await?;

        log::info!("Scheduler {sid} moved: from {f:?} to {t:?}");
        Ok(())
    }

    pub async fn remove(&self, sid: &Arc<String>, id: Option<&Arc<String>>) -> Result<()> {
        let Some(scheduler) = self.get_scheduler(sid).await else {
            return Ok(());
        };

        if let Some(id) = id {
            let mut tasks = self.tasks.write().await;
            tasks.remove(id);
            drop(tasks);

            let mut list = scheduler.list.write().await;
            list.retain(|v| v.as_str() != id.as_str());
            drop(list);
        } else {
            let mut schedulers = self.schedulers.write().await;
            schedulers.remove(sid);
            drop(schedulers);

            let mut queue = self.get_queue(&scheduler.queue.get()).write().await;

            if let Some(pos) = queue.iter().position(|v| v.as_str() == sid.as_str()) {
                queue.remove(pos);
            }
        }
        Ok(())
    }
}

#[tauri::command(async)]
#[specta::specta]
pub async fn submit_task(id: String, value: TaskView) -> TauriResult<()> {
    MANAGER.submit_backlog(id, value).await?;
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn plan_scheduler(sid: String, folder: String) -> TauriResult<SchedulerView> {
    let scheduler = MANAGER.plan_scheduler(sid, PathBuf::from(&folder)).await?;
    let view = SchedulerView::from(&scheduler).await;
    Ok(view)
}

#[tauri::command(async)]
#[specta::specta]
pub async fn process_scheduler(sid: Arc<String>) -> TauriResult<()> {
    let Some(scheduler) = MANAGER.get_scheduler(&sid).await else {
        return Err(anyhow!(format!("Scheduler#{sid} not found")).into());
    };
    let folder = scheduler.folder.clone().to_string_lossy().into_owned();
    if scheduler.dispatch().await.is_ok() {
        MANAGER.move_scheduler(&sid, QueueType::Complete).await?;
        if config::read().notify {
            #[cfg(target_os = "windows")]
            notify_rust::Notification::new()
                .app_id("com.btjawa.bilitools")
                .summary("BiliTools")
                .body(&format!("(#{sid}) {folder}\nDownload complete~"))
                .show()?;
            #[cfg(not(target_os = "windows"))]
            {
                // TODO
            }
        }
    };
    Ok(())
}
