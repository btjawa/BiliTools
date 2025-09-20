use anyhow::{anyhow, Context};
use std::{path::PathBuf, sync::Arc};
use tokio::{
    fs,
    sync::{broadcast::Receiver, oneshot, OnceCell, RwLock},
};

use tauri::http::StatusCode;
use tauri_plugin_shell::{process::CommandEvent, ShellExt};

use crate::{
    aria2c, config, ffmpeg,
    queue::{
        runtime::{request_frontend, CtrlEvent, Progress, RequestAction, Scheduler},
        types::{MediaNfo, MediaNfoThumb, MediaUrls, SubTask, Task, TaskType},
    },
    shared::{get_app_handle, get_unique_path, init_client, WORKING_PATH},
    TauriError, TauriResult,
};

struct ProgressTask {
    task: Arc<Task>,
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
        }
        TaskType::AudioVideo => {
            if abr == 30251 || abr == 30252 {
                "mkv"
            } else {
                "mp4"
            }
        }
        _ => "mp4",
    }
}

async fn handle_subtitle(ptask: &ProgressTask, _rx: Receiver<CtrlEvent>) -> TauriResult<()> {
    let subtask = &ptask.subtask;
    let parent = ptask.task.id.clone();
    let id = subtask.id.clone();

    let prog = Progress::new(parent.clone(), id.clone());

    prog.send(1, 0).await?;

    let result = request_frontend::<Vec<u8>>(parent, Some(id), RequestAction::GetSubtitle).await?;

    let lang = &ptask
        .task
        .select
        .misc
        .subtitles
        .as_str()
        .ok_or(anyhow!("No subtitle lang found"))?;
    let output_file = get_unique_path(ptask.folder.join(format!("{}.{lang}.srt", &ptask.filename)));
    fs::write(&output_file, &*result).await?;

    prog.send(1, 1).await?;
    Ok(())
}

async fn handle_ai_summary(ptask: &ProgressTask, _rx: Receiver<CtrlEvent>) -> TauriResult<()> {
    let subtask = &ptask.subtask;
    let parent = ptask.task.id.clone();
    let id = subtask.id.clone();

    let prog = Progress::new(parent.clone(), id.clone());
    prog.send(1, 0).await?;

    let result = request_frontend::<Vec<u8>>(parent, Some(id), RequestAction::GetAISummary).await?;

    let output_file = get_unique_path(ptask.folder.join(format!("{}.md", &ptask.filename)));
    fs::write(&output_file, &*result).await?;

    prog.send(1, 1).await?;
    Ok(())
}

async fn handle_nfo(
    ptask: &ProgressTask,
    _rx: Receiver<CtrlEvent>,
    folder: &PathBuf,
    nfo: &Arc<MediaNfo>,
) -> TauriResult<()> {
    let subtask = &ptask.subtask;
    let parent = ptask.task.id.clone();
    let id = subtask.id.clone();

    let prog = Progress::new(parent.clone(), id.clone());
    prog.send(1, 0).await?;

    let data = request_frontend::<Vec<u8>>(parent, Some(id), RequestAction::GetNfo).await?;

    let output_file = if subtask.task_type == TaskType::AlbumNfo {
        folder.join("tvshow.nfo")
    } else {
        ptask.folder.join(format!("{}.nfo", &ptask.filename))
    };
    fs::write(&output_file, &*data).await?;

    if subtask.task_type == TaskType::AlbumNfo {
        let client = init_client().await?;
        let url = format!("{}@.jpg", nfo.thumbs[0].url);
        let response = client.get(&url).send().await?;
        if response.status() != StatusCode::OK {
            return Err(TauriError::new(
                format!("Error while fetching thumb {url}"),
                Some(response.status()),
            ));
        }
        let bytes = response.bytes().await?;
        fs::write(folder.join("poster.jpg"), &bytes).await?;
    }

    prog.send(1, 1).await?;
    Ok(())
}

async fn handle_danmaku(ptask: &ProgressTask, mut rx: Receiver<CtrlEvent>) -> TauriResult<()> {
    let subtask = &ptask.subtask;
    let parent = ptask.task.id.clone();
    let id = subtask.id.clone();

    let prog = Progress::new(parent.clone(), id.clone());
    prog.send(1, 0).await?;

    let danmaku =
        request_frontend::<Vec<u8>>(parent, Some(id.clone()), RequestAction::GetDanmaku).await?;

    let temp_root = config::read().temp_dir();
    let temp_dir = temp_root.join(&*id);
    fs::create_dir_all(&temp_dir).await?;

    let xml = temp_dir.join("raw.xml");
    let ass = temp_dir.join("out.ass");

    fs::write(&xml, &*danmaku).await?;
    let output_file = ptask.folder.join(&*ptask.filename);
    let output_file = output_file.to_string_lossy();

    if !config::read().convert.danmaku {
        fs::copy(
            &xml,
            get_unique_path(PathBuf::from(format!("{output_file}.xml"))),
        )
        .await?;
        return Ok(());
    }
    const NAME: &str = "DanmakuFactory";
    #[cfg(all(target_os = "linux", not(debug_assertions)))]
    const EXEC: &str = "/usr/libexec/bilitools/DanmakuFactory";

    #[cfg(not(all(target_os = "linux", not(debug_assertions))))]
    const EXEC: &str = "DanmakuFactory";

    let cfg = WORKING_PATH.join("DanmakuFactory.json");
    if !cfg.exists() {
        fs::write(&cfg, &[]).await?;
    }

    let (mut _rx, child) = get_app_handle()
        .shell()
        .sidecar(EXEC)?
        .args([
            "-c",
            cfg.to_string_lossy().as_ref(),
            "-i",
            xml.to_string_lossy().as_ref(),
            "-o",
            ass.to_string_lossy().as_ref(),
            "--ignore-warnings",
        ])
        .spawn()?;

    let mut child = Some(child);
    let mut stderr: Vec<String> = vec![];

    loop {
        tokio::select! {
            Some(msg) = _rx.recv() => match msg {
                CommandEvent::Stdout(line) => {
                    log::info!("{NAME} STDOUT: {}", String::from_utf8_lossy(&line));
                },
                CommandEvent::Stderr(line) => {
                    let line = String::from_utf8_lossy(&line);
                    log::warn!("{NAME} STDERR: {line}");
                    stderr.push(line.into());
                },
                CommandEvent::Error(line) => {
                    log::error!("{NAME} ERROR: {line}");
                },
                CommandEvent::Terminated(msg) => {
                    let code = msg.code.unwrap_or(0);
                    if code == 0 {
                        break;
                    } else {
                        return Err(TauriError::new(
                            format!("{NAME} task failed\n{}", stderr.join("\n")),
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
        }
    }

    if !ass.exists() {
        // no elems
        fs::write(&ass, &[]).await?;
    }

    fs::copy(
        &ass,
        get_unique_path(PathBuf::from(format!("{output_file}.ass"))),
    )
    .await?;
    fs::remove_file(&xml).await?;
    prog.send(1, 1).await?;
    Ok(())
}

async fn handle_thumbs(ptask: &ProgressTask, mut rx: Receiver<CtrlEvent>) -> TauriResult<()> {
    let subtask = &ptask.subtask;
    let parent = ptask.task.id.clone();
    let id = subtask.id.clone();

    let prog = Progress::new(parent.clone(), id.clone());
    prog.send(0, 0).await?;

    let thumbs =
        request_frontend::<Vec<MediaNfoThumb>>(parent, Some(id), RequestAction::GetThumbs).await?;

    let client = init_client().await?;
    let content = thumbs.len() as u64;

    for (index, thumb) in thumbs.iter().enumerate() {
        if let Ok(CtrlEvent::Cancel) = rx.try_recv() {
            return Ok(());
        }
        let output_file = get_unique_path(ptask.folder.join(format!("{}.{}.jpg", &ptask.filename, thumb.id )));
        let response = client
            .get(format!("{}@.jpg", thumb.url))
            .send().await?;
        if response.status() != StatusCode::OK {
            return Err(TauriError::new(
                format!("Error while fetching thumb {}", thumb.url),
                Some(response.status())
            ));
        }
        let bytes = response.bytes().await?;
        fs::write(&output_file, &bytes).await?;
        prog.send(content, index as u64).await?;
    }

    prog.send(content, content).await?;

    Ok(())
}

async fn handle_merge(
    ptask: &ProgressTask,
    mut rx: Receiver<CtrlEvent>,
    video_path: &Arc<OnceCell<PathBuf>>,
    audio_path: &Arc<OnceCell<PathBuf>>,
) -> TauriResult<()> {
    let subtask = &ptask.subtask;
    let parent = ptask.task.id.clone();
    let id = subtask.id.clone();

    let video = video_path.get().ok_or(anyhow!("No path for video found"))?;
    let audio = audio_path.get().ok_or(anyhow!("No path for audio found"))?;

    let prog = Progress::new(parent.clone(), id.clone());
    let (cancel_tx, cancel_rx) = oneshot::channel();

    let abr = ptask.task.select.abr.unwrap_or(0);
    let ext = get_ext(subtask.task_type.clone(), abr);

    let mut merge = Box::pin(ffmpeg::merge(
        id.clone(),
        ext,
        &prog,
        cancel_rx,
        video,
        audio,
    ));
    let path = tokio::select! {
        res = &mut merge => res,
        Ok(CtrlEvent::Cancel) = rx.recv() => {
            let _ = cancel_tx.send(());
            return Ok(());
        }
    }?;

    let output_file = get_unique_path(ptask.folder.join(format!("{}.{}", &ptask.filename, ext)));
    log::info!("{output_file:?}");

    fs::copy(&path, output_file).await?;
    fs::remove_file(path).await?;

    fs::remove_file(video).await?;
    fs::remove_file(audio).await?;
    Ok(())
}

async fn handle_media(
    ptask: &ProgressTask,
    mut rx: Receiver<CtrlEvent>,
    video_path: &Arc<OnceCell<PathBuf>>,
    audio_path: &Arc<OnceCell<PathBuf>>,
) -> TauriResult<()> {
    let subtask = &ptask.subtask;
    let select = ptask.task.select.clone();
    let parent = ptask.task.id.clone();
    let id = subtask.id.clone();

    let urls = if let Some(urls) = ptask.urls.clone() {
        if subtask.task_type == TaskType::Video {
            urls.video_urls.clone()
        } else if subtask.task_type == TaskType::Audio {
            urls.audio_urls.clone()
        } else {
            None
        }
        .ok_or(anyhow!("No urls for type {:?} found", &subtask.task_type))?
    } else {
        return Err(anyhow!("No urls found").into());
    };

    let prog = Progress::new(parent.clone(), id.clone());

    let mut download = Box::pin(aria2c::download(id.clone(), &prog, urls));
    let mut path = loop {
        tokio::select! {
            res = &mut download => break res,
            Ok(msg) = rx.recv() => match msg {
                CtrlEvent::Cancel => {
                    aria2c::cancel(id.clone()).await?;
                    return Ok(());
                },
                CtrlEvent::Pause => {
                    aria2c::pause(id.clone()).await?;
                },
                CtrlEvent::Resume => {
                    aria2c::resume(id.clone()).await?;
                },
                _ => (),
            }
        }
    }?;

    let abr = ptask.task.select.abr.unwrap_or(0);
    let mut ext = get_ext(subtask.task_type.clone(), abr).to_string();

    if subtask.task_type == TaskType::Video {
        video_path
    } else if subtask.task_type == TaskType::Audio {
        audio_path
    } else {
        return Err(anyhow!("No path for type {:?} found", &subtask.task_type).into());
    }
    .set(path.clone())?;

    if subtask.task_type == TaskType::Audio {
        let (file, suffix) =
            ffmpeg::convert_audio(id, &ext, &prog, &path, ptask.task.clone()).await?;
        path = file.with_extension(&suffix);
        ext = suffix;
    }

    if select.media.video || select.media.audio {
        fs::copy(
            &path,
            &ptask.folder.join(&*ptask.filename).with_extension(ext),
        )
        .await?;
    }
    if !select.media.audio_video {
        fs::remove_file(&path).await?;
    }
    Ok(())
}

pub async fn handle_task(scheduler: Arc<Scheduler>, task: Arc<RwLock<Task>>) -> TauriResult<()> {
    let temp_root = config::read().temp_dir();
    fs::create_dir_all(&temp_root)
        .await
        .context("Failed to create temp folder")?;

    let task_snapshot = Arc::new(task.read().await.clone());
    let id = task_snapshot.id.clone();
    let select = task_snapshot.select.clone();

    let nfo =
        request_frontend::<Option<MediaNfo>>(id.clone(), None, RequestAction::RefreshNfo).await?;
    let mut guard = task.write().await;
    guard.nfo = Arc::try_unwrap(nfo).ok().and_then(|r| r.map(Arc::new));

    let urls = if select.media.any_true() {
        let urls =
            request_frontend::<MediaUrls>(id.clone(), None, RequestAction::RefreshUrls).await?;
        guard.subtasks = urls.subtasks.clone();
        Some(urls)
    } else {
        None
    };

    let sub_folder =
        request_frontend::<String>(id.clone(), None, RequestAction::RefreshFolder).await?;

    let folder = Arc::new(if config::read().organize.sub_folder {
        scheduler.folder.join(&*sub_folder)
    } else {
        scheduler.folder.clone()
    });
    guard.folder = folder.clone();

    drop(task_snapshot);
    drop(guard);

    let task = Arc::new(task.read().await.clone());
    fs::create_dir_all(&*folder)
        .await
        .context("Failed to create output folder")?;

    let video_path = Arc::new(OnceCell::new());
    let audio_path = Arc::new(OnceCell::new());

    for subtask in task.subtasks.iter() {
        let sub_id = subtask.id.clone();
        log::info!(
            "Handling subtask: {sub_id}\n    task_type: {:?}\n    parent: {id}",
            subtask.task_type
        );

        let filename = request_frontend::<String>(
            id.clone(),
            Some(sub_id.clone()),
            RequestAction::GetFilename,
        )
        .await?;
        let ptask = ProgressTask {
            task: task.clone(),
            subtask: subtask.clone(),
            urls: urls.clone(),
            folder: folder.clone(),
            filename,
        };
        let folder = scheduler.folder.clone();
        let video = video_path.clone();
        let audio = audio_path.clone();
        match subtask.task_type {
            TaskType::Video | TaskType::Audio => {
                scheduler
                    .try_join(&id, &sub_id, |rx| {
                        handle_media(&ptask, rx, &video, &audio)
                    })
                    .await;
            }
            TaskType::AudioVideo => {
                scheduler
                    .try_join(&id, &sub_id, |rx| {
                        handle_merge(&ptask, rx, &video, &audio)
                    })
                    .await;
            },
            TaskType::Thumb => {
                scheduler
                    .try_join(&id, &sub_id, |rx| handle_thumbs(&ptask, rx))
                    .await;
            }
            TaskType::LiveDanmaku | TaskType::HistoryDanmaku => {
                scheduler
                    .try_join(&id, &sub_id, |rx| handle_danmaku(&ptask, rx))
                    .await;
            }
            TaskType::AlbumNfo | TaskType::SingleNfo => {
                if let Some(nfo) = task.nfo.clone() {
                    scheduler
                        .try_join(&id, &sub_id, |rx| handle_nfo(&ptask, rx, &folder, &nfo))
                        .await;
                }
            }
            TaskType::AiSummary => {
                scheduler
                    .try_join(&id, &sub_id, |rx| handle_ai_summary(&ptask, rx))
                    .await;
            }
            TaskType::Subtitles => {
                scheduler
                    .try_join(&id, &sub_id, |rx| handle_subtitle(&ptask, rx))
                    .await;
            }
        }
    }
    Ok(())
}
