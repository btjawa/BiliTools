use tokio::{fs, sync::{broadcast::Receiver, OnceCell, RwLock, oneshot}};
use std::{sync::Arc, path::PathBuf};
use anyhow::{Context, anyhow};

use tauri_plugin_shell::{process::CommandEvent, ShellExt};
use tauri::{http::StatusCode, ipc::Channel};

use crate::{
    TauriResult, TauriError,
    shared::{
        get_app_handle, get_unique_path, init_client
    },
    aria2c, ffmpeg, archive, config,
    queue::{
        types::{
            MediaNfoThumb,
            MediaUrls,
            MediaNfo,
            GeneralTask,
            TaskState,
            TaskType,
            SubTask,
        },
        runtime::{
            CtrlEvent,
            ProcessEvent,
            RequestAction,
            Scheduler,
            update_progress,
            request_frontend
        }
    }
};

struct ProgressTask {
    event: Arc<Channel<ProcessEvent>>,
    task: Arc<GeneralTask>,
    subtask: Arc<SubTask>,
    urls: Option<Arc<MediaUrls>>,
    folder: Arc<PathBuf>,
    filename: Arc<String>,
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

    let output_file = if subtask.task_type == TaskType::AlbumNfo {
        folder.join("tvshow.nfo")
    } else {
        ptask.folder.join(format!("{}.nfo", &ptask.filename ))
    };
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
    video_path: Arc<OnceCell<PathBuf>>,
    audio_path: Arc<OnceCell<PathBuf>>,
) -> TauriResult<()> {
    let subtask = ptask.subtask;
    let event = ptask.event;
    let parent = ptask.task.id.clone();
    let id = subtask.id.clone();

    let video = video_path.get().ok_or(anyhow!("No path for video found"))?;
    let audio = audio_path.get().ok_or(anyhow!("No path for audio found"))?;

    let status_tx = Arc::new(update_progress(event, parent, id.clone()));
    let (cancel_tx, cancel_rx) = oneshot::channel();

    let abr = ptask.task.select.abr.unwrap_or(0);
    let ext = get_ext(subtask.task_type.clone(), abr);
    
    let mut merge = Box::pin(ffmpeg::merge(id.clone(), ext, status_tx, cancel_rx, video, audio));
    let path = loop { tokio::select! {
        res = &mut merge => break res,
        Ok(CtrlEvent::Cancel) = rx.recv() => {
            let _ = cancel_tx.send(());
            return Ok(());
        }
    } }?;

    let output_file = get_unique_path(ptask.folder.join(format!("{}.{}", &ptask.filename, ext)));

    fs::copy(&path, output_file).await?;
    fs::remove_file(path).await?;

    fs::remove_file(video).await?;
    fs::remove_file(audio).await?;
    Ok(())
}

async fn handle_media(
    ptask: ProgressTask,
    mut rx: Receiver<CtrlEvent>,
    video_path: Arc<OnceCell<PathBuf>>,
    audio_path: Arc<OnceCell<PathBuf>>,
) -> TauriResult<()> {
    let subtask = ptask.subtask;
    let event = ptask.event;
    let select = ptask.task.select.clone();
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

    let status_tx = Arc::new(update_progress(event, parent, id.clone()));
    
    let mut download = Box::pin(aria2c::download(id.clone(), status_tx.clone(), urls));
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

    let output = ptask.folder.join(&*ptask.filename);
    let mut ext = ext.to_string();

    let target = if subtask.task_type == TaskType::Video {
        video_path
    } else if subtask.task_type == TaskType::Audio {
        let converted = ffmpeg::convert_audio(id, &ext, status_tx.clone(), &path).await?;
        ext = converted.extension().ok_or(anyhow!("No audio extension found"))?.to_string_lossy().into();
        audio_path
    } else {
        return Err(anyhow!("No path for type {:?} found", &subtask.task_type).into());
    };
    
    if select.media.video || select.media.audio {
        fs::copy(&path, &output.with_extension(ext)).await?;
    }
    if !select.media.audio_video {
        fs::remove_file(&path).await?;
    }
    target.set(path)?;
    Ok(())
}

pub async fn handle_task(scheduler: Arc<Scheduler>, task: Arc<RwLock<GeneralTask>>) -> TauriResult<()> {    
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
        guard.subtasks = urls.subtasks.clone();
        Some(urls)
    } else {
        None
    };

    let sub_folder = request_frontend::<String>(
        event.clone(), id.clone(), None, RequestAction::RefreshFolder
    ).await?;

    let task_folder = config::read().task_folder;
    let folder = Arc::new(if task_folder {
        scheduler.folder.join(&*sub_folder)
    } else {
        scheduler.folder.clone()
    });
    guard.folder = folder.clone();

    drop(task_snapshot);
    drop(guard);

    let task = Arc::new(task.read().await.clone());
    fs::create_dir_all(&*folder).await.context("Failed to create output folder")?;

    let video_path = Arc::new(OnceCell::new());
    let audio_path = Arc::new(OnceCell::new());

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
        let folder = scheduler.folder.clone();
        let video_clone = video_path.clone();
        let audio_clone = audio_path.clone();
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
            },
        }
    }

    event.send(ProcessEvent::TaskState {
        id: id.clone(),
        state: TaskState::Completed
    })?;

    let status = request_frontend::<serde_json::Value>(event.clone(), id.clone(), None, RequestAction::GetStatus).await?;
    archive::insert(task, status).await?;
    Ok(())
}