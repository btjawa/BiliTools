use anyhow::{anyhow, Context, Result};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use specta::Type;
use std::{collections::VecDeque, sync::Arc};
use tauri::Listener;
use tauri_specta::Event;
use tokio::sync::oneshot;

use crate::{
    shared::{get_app_handle, get_ts},
    TauriError, TauriResult,
};

use super::{
    atomics::{QueueType, SchedulerState, TaskState},
    task::SubTask,
    types::{MediaNfo, PopupSelect},
};

#[derive(Debug, Clone, Serialize, Type, Event)]
#[serde(
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    tag = "type"
)]
pub enum QueueEvent<'a> {
    TaskState {
        task: &'a str,
        state: &'a TaskState,
    },
    SchedulerState {
        scheduler: &'a str,
        state: &'a SchedulerState,
    },
    SchedulerQueue {
        scheduler: &'a str,
        queue: &'a QueueType,
    },
    Progress {
        task: &'a str,
        subtask: &'a str,
        content: &'a u64,
        chunk: &'a u64,
    },
    Queue {
        name: &'a QueueType,
        value: &'a VecDeque<Arc<String>>,
    },
    Request {
        task: &'a str,
        subtask: Option<&'a str>,
        action: &'a RequestAction,
        endpoint: &'a str,
    },
    Error {
        task: &'a str,
        subtask: Option<&'a str>,
        message: &'a str,
        code: Option<isize>,
    },
}

pub fn task_state<'a>(task: &'a str, state: &'a TaskState) -> Result<()> {
    let app = get_app_handle();
    QueueEvent::TaskState { task, state }.emit(app)?;
    Ok(())
}

pub fn scheduler_state<'a>(scheduler: &'a str, state: &'a SchedulerState) -> Result<()> {
    let app = get_app_handle();
    QueueEvent::SchedulerState { scheduler, state }.emit(app)?;
    Ok(())
}

pub fn scheduler_queue<'a>(scheduler: &'a str, queue: &'a QueueType) -> Result<()> {
    let app = get_app_handle();
    QueueEvent::SchedulerQueue { scheduler, queue }.emit(app)?;
    Ok(())
}

pub fn progress<'a>(
    task: &'a str,
    subtask: &'a str,
    content: &'a u64,
    chunk: &'a u64,
) -> Result<()> {
    let app = get_app_handle();
    QueueEvent::Progress {
        task,
        subtask,
        content,
        chunk,
    }
    .emit(app)?;
    Ok(())
}

pub fn queue<'a>(name: &'a QueueType, value: &'a VecDeque<Arc<String>>) -> Result<()> {
    let app = get_app_handle();
    QueueEvent::Queue { name, value }.emit(app)?;
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum RequestAction {
    PrepareTask,
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
    pub fn as_string(&self) -> String {
        serde_plain::to_string(self).unwrap_or_default()
    }
    pub fn from_str_lossy(from: &str) -> RequestAction {
        serde_plain::from_str(from).unwrap_or(RequestAction::PrepareTask)
    }
}

pub async fn request<'a, T: DeserializeOwned + Send + 'static>(
    task: &'a str,
    subtask: Option<&'a str>,
    action: &'a RequestAction,
) -> TauriResult<Arc<T>> {
    let (tx, rx) = oneshot::channel();
    let app = get_app_handle();
    let ts = get_ts(true);
    let endpoint = &format!("{}_{ts}", action.as_string());
    app.once(endpoint, move |event| {
        let _ = tx.send(
            serde_json::from_str::<Option<T>>(event.payload())
                .context("Failed to deserialize frontend response"),
        );
    });
    QueueEvent::Request {
        task,
        subtask,
        action,
        endpoint,
    }
    .emit(app)?;
    let res = rx.await.context("No response from frontend")??;
    Ok(Arc::new(
        res.ok_or(anyhow!("Error occurred from frontend"))?,
    ))
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct PrepareTask {
    #[serde(rename = "videoUrls")]
    pub video_urls: Option<Vec<String>>,
    #[serde(rename = "audioUrls")]
    pub audio_urls: Option<Vec<String>>,
    #[serde(rename = "subFolder")]
    pub select: Arc<PopupSelect>,
    pub subtasks: Arc<Vec<Arc<SubTask>>>,
    pub sub_folder: Arc<String>,
    pub nfo: Arc<MediaNfo>,
}

pub fn error<'a>(
    task: &'a str,
    subtask: Option<&'a str>,
    error: &'a TauriError,
) -> TauriResult<()> {
    let app = get_app_handle();
    QueueEvent::Error {
        task,
        subtask,
        message: &error.message,
        code: error.code.map(|c| c.as_isize()),
    }
    .emit(app)?;
    Ok(())
}
