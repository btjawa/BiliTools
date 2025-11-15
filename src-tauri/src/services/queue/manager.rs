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
    pub schedulers: RwLock<HashMap<String, Arc<Scheduler>>>,
    pub tasks: RwLock<HashMap<String, Arc<Task>>>,
    pub backlog: RwLock<VecDeque<String>>, // Task#id
    pub pending: RwLock<VecDeque<String>>, // Scheduler#sid
    pub doing: RwLock<VecDeque<String>>,
    pub complete: RwLock<VecDeque<String>>,
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

    pub async fn get_task(&self, id: &str) -> Result<Arc<Task>> {
        self.tasks
            .read()
            .await
            .get(id)
            .ok_or(anyhow!(format!("Task#{id} not found")))
            .cloned()
    }

    pub async fn get_scheduler(&self, sid: &str) -> Result<Arc<Scheduler>> {
        self.schedulers
            .read()
            .await
            .get(sid)
            .ok_or(anyhow!(format!("Scheduler#{sid} not found")))
            .cloned()
    }

    pub fn get_queue(&self, queue: &QueueType) -> &RwLock<VecDeque<String>> {
        match queue {
            QueueType::Backlog => &self.backlog,
            QueueType::Pending => &self.pending,
            QueueType::Doing => &self.doing,
            QueueType::Complete => &self.complete,
        }
    }

    async fn submit_backlog(&self, id: String, value: TaskView) -> Result<()> {
        let to = QueueType::Backlog;

        tasks::upsert(&id, &value).await?;

        let task = Task::new(value);
        task.init().await?;

        let mut tasks = self.tasks.write().await;
        tasks.insert(id.clone(), task);
        drop(tasks);

        let mut queue = self.get_queue(&to).write().await;
        queue.push_back(id.clone());
        frontend::queue(&to, &queue)?;
        queue::upsert(to, &queue).await?;
        drop(queue);

        log::info!("Queue {to:?} pushed new Task#{id}");
        Ok(())
    }

    async fn plan_scheduler(&self, sid: String, top_folder: PathBuf) -> Result<Arc<Scheduler>> {
        let f = QueueType::Backlog;
        let t = QueueType::Pending;

        let mut from = self.get_queue(&f).write().await;
        let list = from.clone();
        from.clear();
        frontend::queue(&f, &from)?;
        queue::upsert(f, &from).await?;
        drop(from);

        let scheduler = Scheduler::new(sid.clone(), list.into(), top_folder);
        schedulers::upsert(&sid, &scheduler).await?;

        let mut schedulers = self.schedulers.write().await;
        schedulers.insert(sid.clone(), scheduler.clone());
        drop(schedulers);

        let mut to = self.get_queue(&t).write().await;
        to.push_back(sid.clone());
        frontend::queue(&t, &to)?;
        queue::upsert(t, &to).await?;
        drop(to);

        log::info!("Planed new Scheduler#{sid}");
        Ok(scheduler)
    }

    pub async fn move_scheduler(&self, sid: &str, t: QueueType) -> Result<()> {
        let Ok(scheduler) = self.get_scheduler(sid).await else {
            return Ok(());
        };
        let f = scheduler.queue.get();

        if f == t || t == QueueType::Backlog {
            return Ok(());
        }

        let mut from = self.get_queue(&f).write().await;
        if let Some(pos) = from.iter().position(|v| v == sid) {
            from.remove(pos);
        }
        frontend::queue(&f, &from)?;
        queue::upsert(f, &from).await?;
        drop(from);

        let mut to = self.get_queue(&t).write().await;
        to.push_back(sid.to_string());
        frontend::queue(&t, &to)?;
        queue::upsert(t, &to).await?;
        drop(to);

        scheduler.queue(t).await?;

        log::info!("Scheduler#{sid} moved: from {f:?} to {t:?}");
        Ok(())
    }

    pub async fn remove_backlog(&self, id: &str) -> Result<()> {
        let mut tasks = self.tasks.write().await;
        tasks.remove(id);
        drop(tasks);

        let q = QueueType::Backlog;
        let mut list = self.backlog.write().await;
        list.retain(|v| v != id);

        frontend::queue(&q, &list)?;
        queue::upsert(q, &list).await?;
        Ok(())
    }

    pub async fn remove(&self, sid: &str, id: Option<&str>) -> Result<()> {
        let scheduler = self.get_scheduler(sid).await?;

        if let Some(id) = id {
            let mut tasks = self.tasks.write().await;
            tasks.remove(id);
            drop(tasks);

            let mut list = scheduler.list.write().await;
            list.retain(|v| v != id);

            frontend::scheduler_updated(sid, None, None, Some(&list), None)?;

            schedulers::update_list(id, &list).await?;
        } else {
            let mut schedulers = self.schedulers.write().await;
            schedulers.remove(sid);
            drop(schedulers);

            let q = scheduler.queue.get();

            let mut queue = self.get_queue(&q).write().await;
            if let Some(pos) = queue.iter().position(|v| v == sid) {
                queue.remove(pos);
            }

            frontend::queue(&q, &queue)?;
            queue::upsert(q, &queue).await?;
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
pub async fn process_scheduler(sid: String) -> TauriResult<()> {
    let scheduler = MANAGER.get_scheduler(&sid).await?;
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
                use crate::shared::get_app_handle;
                use tauri_plugin_notification::NotificationExt;
                let app = get_app_handle();
                app.notification()
                    .builder()
                    .title("BiliTools")
                    .body(format!("(#{sid}) {folder}\nDownload complete~"))
                    .show()?;
            }
        }
    };
    Ok(())
}
