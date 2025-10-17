use anyhow::{anyhow, Context};
use std::{
    path::{Path, PathBuf},
    pin::pin,
    sync::Arc,
};
use tauri_plugin_http::reqwest;
use tokio::{fs, sync::OnceCell};

use tauri_plugin_shell::{process::CommandEvent, ShellExt};

use crate::{
    aria2c, config, ffmpeg,
    shared::{get_app_handle, get_image, get_unique_path, WORKING_PATH},
    TauriError, TauriResult,
};

use super::{
    frontend::{self, TaskPrepareResp, RequestAction},
    runtime::{CtrlEvent, CtrlHandle, RUNTIME},
    scheduler::Scheduler,
    task::{SubTask, Task, TaskType},
    types::MediaNfoThumb,
};

#[derive(Clone, Debug)]
pub struct SubTaskReq {
    pub task: Arc<Task>,
    pub subtask: SubTask,
    pub temp: PathBuf,
    pub folder: PathBuf,
    pub filename: String,
}

fn get_ext(task_type: &TaskType, abr: usize) -> &'static str {
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

async fn handle_opus_images(req: &SubTaskReq, _ctrl: Arc<CtrlHandle>) -> TauriResult<()> {
    let subtask = &req.subtask;
    let id = &req.task.id;
    let sub_id = &subtask.id;

    subtask.send(0, 0).await?;

    let thumbs =
        frontend::request::<Vec<String>>(id, Some(sub_id), &RequestAction::GetOpusImages).await?;

    let content = thumbs.len() as u64;

    for (index, thumb) in thumbs.iter().enumerate() {
        let url = reqwest::Url::parse(thumb)?;

        let segs = url
            .path_segments()
            .ok_or(anyhow!("Failed to get path segments: {url:?}"))?;
        let segs_path = segs.collect::<PathBuf>();
        let ext = segs_path
            .extension()
            .and_then(|s| s.to_str())
            .ok_or(anyhow!("Failed to get extension from {segs_path:?}"))?;

        let path = get_unique_path(
            req.folder
                .join(format!("{}.{}.{}", &req.filename, index, ext)),
        );
        get_image(&path, thumb).await?;
        subtask.send(content, index as u64).await?;
    }

    subtask.send(content, content).await?;
    Ok(())
}

async fn handle_opus_content(req: &SubTaskReq, _ctrl: Arc<CtrlHandle>) -> TauriResult<()> {
    let subtask = &req.subtask;
    let id = &req.task.id;
    let sub_id = &subtask.id;

    subtask.send(1, 0).await?;

    let result =
        frontend::request::<Vec<u8>>(id, Some(sub_id), &RequestAction::GetOpusContent).await?;

    let output_file = get_unique_path(req.folder.join(format!("{}.md", &req.filename)));
    fs::write(&output_file, &*result).await?;

    subtask.send(1, 1).await?;
    Ok(())
}

async fn handle_subtitle(req: &SubTaskReq, _ctrl: Arc<CtrlHandle>) -> TauriResult<()> {
    let subtask = &req.subtask;
    let id = &req.task.id;
    let sub_id = &subtask.id;

    subtask.send(1, 0).await?;

    let result =
        frontend::request::<Vec<u8>>(id, Some(sub_id), &RequestAction::GetSubtitle).await?;

    let select = &req.task.select.read().await;
    let lang = select
        .misc
        .subtitles
        .as_str()
        .ok_or(anyhow!("No subtitle lang found"))?;
    let output_file = get_unique_path(req.folder.join(format!("{}.{lang}.srt", &req.filename)));
    fs::write(&output_file, &*result).await?;

    subtask.send(1, 1).await?;
    Ok(())
}

async fn handle_ai_summary(req: &SubTaskReq, _ctrl: Arc<CtrlHandle>) -> TauriResult<()> {
    let subtask = &req.subtask;
    let id = &req.task.id;
    let sub_id = &subtask.id;

    subtask.send(1, 0).await?;

    let result =
        frontend::request::<Vec<u8>>(id, Some(sub_id), &RequestAction::GetAISummary).await?;

    let output_file = get_unique_path(req.folder.join(format!("{}.md", &req.filename)));
    fs::write(&output_file, &*result).await?;

    subtask.send(1, 1).await?;
    Ok(())
}

async fn handle_nfo(req: &SubTaskReq, _ctrl: Arc<CtrlHandle>, folder: &Path) -> TauriResult<()> {
    let subtask = &req.subtask;
    let id = &req.task.id;
    let sub_id = &subtask.id;
    let nfo = &req.task.nfo.read().await;

    subtask.send(1, 0).await?;

    let data = frontend::request::<Vec<u8>>(id, Some(sub_id), &RequestAction::GetNfo).await?;

    let output_file = if subtask.task_type == TaskType::AlbumNfo {
        folder.join("tvshow.nfo")
    } else {
        req.folder.join(format!("{}.nfo", &req.filename))
    };
    fs::write(&output_file, &*data).await?;

    if subtask.task_type == TaskType::AlbumNfo {
        let path = folder.join("poster.jpg");
        let url = format!("{}@.jpg", nfo.thumbs[0].url);
        get_image(&path, &url).await?;
    }

    subtask.send(1, 1).await?;
    Ok(())
}

async fn handle_danmaku(req: &SubTaskReq, ctrl: Arc<CtrlHandle>) -> TauriResult<()> {
    let subtask = &req.subtask;
    let id = &req.task.id;
    let sub_id = &subtask.id;

    subtask.send(1, 0).await?;

    let danmaku =
        frontend::request::<Vec<u8>>(id, Some(sub_id), &RequestAction::GetDanmaku).await?;

    let xml = req.temp.join("raw.xml");
    let ass = req.temp.join("out.ass");

    fs::write(&xml, &*danmaku).await?;
    let output_file = req.folder.join(&*req.filename);
    let output_file = output_file.to_string_lossy();
    let config = config::read();

    if !config.convert.danmaku {
        fs::copy(
            &xml,
            get_unique_path(PathBuf::from(format!("{output_file}.xml"))),
        )
        .await?;
        return Ok(());
    }

    const NAME: &str = "DanmakuFactory";

    let cfg = WORKING_PATH.join("DanmakuFactory.json");
    if !cfg.exists() {
        fs::write(&cfg, &[]).await?;
    }

    let (mut child_rx, child) = get_app_handle()
        .shell()
        .sidecar(&*config.sidecar.danmakufactory)?
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

    ctrl.reg_cleaner(async move {
        child.kill()?;
        Ok(())
    })
    .await?;

    let mut stderr: Vec<String> = vec![];

    while let Some(msg) = child_rx.recv().await {
        match msg {
            CommandEvent::Stdout(line) => {
                log::info!("{NAME} STDOUT: {}", String::from_utf8_lossy(&line));
            }
            CommandEvent::Stderr(line) => {
                let line = String::from_utf8_lossy(&line);
                log::warn!("{NAME} STDERR: {line}");
                stderr.push(line.into());
            }
            CommandEvent::Error(line) => {
                log::error!("{NAME} ERROR: {line}");
            }
            CommandEvent::Terminated(msg) => {
                let code = msg.code.unwrap_or(0);
                if code == 0 {
                    break;
                } else {
                    return Err(TauriError::new(
                        format!("{NAME} task failed\n{}", stderr.join("\n")),
                        Some(code as isize),
                    ));
                }
            }
            _ => (),
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
    subtask.send(1, 1).await?;
    Ok(())
}

async fn handle_thumbs(req: &SubTaskReq, _ctrl: Arc<CtrlHandle>) -> TauriResult<()> {
    let subtask = &req.subtask;
    let id = &req.task.id;
    let sub_id = &subtask.id;

    subtask.send(0, 0).await?;

    let thumbs =
        frontend::request::<Vec<MediaNfoThumb>>(id, Some(sub_id), &RequestAction::GetThumbs)
            .await?;

    let content = thumbs.len() as u64;

    for (index, thumb) in thumbs.iter().enumerate() {
        let url = format!("{}@.jpg", thumb.url);
        let path = get_unique_path(
            req.folder
                .join(format!("{}.{}.jpg", &req.filename, thumb.id)),
        );
        get_image(&path, &url).await?;
        subtask.send(content, index as u64).await?;
    }

    subtask.send(content, content).await?;

    Ok(())
}

async fn post_media(req: &SubTaskReq, ctrl: Arc<CtrlHandle>, input: PathBuf) -> TauriResult<()> {
    let subtask = &req.subtask;
    let select = &req.task.select.read().await;
    let config = config::read();

    let abr = select.abr.unwrap_or(0);
    let mut ext = get_ext(&subtask.task_type, abr).to_string();
    let mut path = input;

    if subtask.task_type == TaskType::Audio {
        if config.convert.mp3 {
            ext = "mp3".into();
            path = ffmpeg::convert_mp3(req, ctrl.clone(), &path).await?;
        }
    } else if config.convert.mp4 {
        ext = "mp4".into();
        path = ffmpeg::convert_mp4(req, ctrl.clone(), &path).await?;
    }

    if config.add_metadata && ext != "eac3" {
        path = ffmpeg::add_meta(req, ctrl.clone(), &path, &ext).await?;
    }

    // Issue#198
    let output = req
        .folder
        .join(&*req.filename)
        .with_file_name(format!("{}.{}", req.filename, ext));
    if select.media.video || select.media.audio || subtask.task_type == TaskType::AudioVideo {
        fs::copy(&path, &output).await?;
    }

    Ok(())
}

async fn handle_merge(
    req: &SubTaskReq,
    ctrl: Arc<CtrlHandle>,
    video_path: &OnceCell<PathBuf>,
    audio_path: &OnceCell<PathBuf>,
) -> TauriResult<()> {
    let subtask = &req.subtask;
    let select = &req.task.select.read().await;

    let video = video_path.get().ok_or(anyhow!("No path for video found"))?;
    let audio = audio_path.get().ok_or(anyhow!("No path for audio found"))?;

    let abr = select.abr.unwrap_or(0);
    let ext = get_ext(&subtask.task_type, abr);

    let path = ffmpeg::merge(req, ctrl.clone(), video, audio, ext).await?;
    post_media(req, ctrl, path).await?;
    Ok(())
}

async fn handle_media(
    req: &SubTaskReq,
    ctrl: Arc<CtrlHandle>,
    video_urls: &Option<Vec<String>>,
    audio_urls: &Option<Vec<String>>,
    video_path: &OnceCell<PathBuf>,
    audio_path: &OnceCell<PathBuf>,
) -> TauriResult<()> {
    let subtask = &req.subtask;
    let id = &req.task.id;

    let urls = if subtask.task_type == TaskType::Video {
        video_urls.as_ref()
    } else if subtask.task_type == TaskType::Audio {
        audio_urls.as_ref()
    } else {
        None
    }
    .ok_or(anyhow!("No urls for type {:?} found", &subtask.task_type))?;

    let cleaner = RUNTIME.ctrl.get_handle(id).await?;
    let id_clenaer = id.to_string();
    cleaner
        .reg_cleaner(async move {
            aria2c::cancel(&id_clenaer).await?;
            Ok(())
        })
        .await?;

    let mut process = pin!(async {
        let path = aria2c::download(req, urls).await?;
        post_media(req, ctrl.clone(), path.clone()).await?;
        if subtask.task_type == TaskType::Video {
            video_path
        } else if subtask.task_type == TaskType::Audio {
            audio_path
        } else {
            return Err(anyhow!("No path for type {:?} found", &subtask.task_type).into());
        }
        .set(path)?;
        Ok::<_, TauriError>(())
    });

    let mut rx = ctrl.tx.subscribe();
    loop {
        tokio::select! {
            res = &mut process => break res,
            Ok(msg) = rx.recv() => match msg {
                CtrlEvent::Pause => {
                    aria2c::pause(id).await?;
                },
                CtrlEvent::Resume => {
                    aria2c::resume(id).await?;
                },
                _ => (),
            }
        }
    }?;

    Ok(())
}

pub async fn handle_task(
    scheduler: Arc<Scheduler>,
    temp_root: &PathBuf,
    task: Arc<Task>,
) -> TauriResult<()> {
    let id = &task.id;

    let prepare = frontend::request::<TaskPrepareResp>(id, None, &RequestAction::PrepareTask).await?;

    let folder = if config::read().organize.sub_folder {
        scheduler.folder.join(&*prepare.sub_folder)
    } else {
        scheduler.folder.clone()
    };
    
    task.prepare(&prepare, folder.clone()).await?;

    let folder_str = folder.to_string_lossy().into_owned();
    fs::create_dir_all(&folder_str)
        .await
        .context(format!("Failed to create output folder {folder_str}"))?;

    let video_path = OnceCell::new();
    let audio_path = OnceCell::new();

    let ctrl = RUNTIME.ctrl.get_handle(id).await?;
    let temp_str = temp_root.to_string_lossy().into_owned();
    ctrl.reg_cleaner(async move {
        fs::remove_dir_all(&temp_str)
            .await
            .context(format!("Failed to remove temp folder {temp_str}"))?;
        Ok(())
    })
    .await?;

    for subtask in prepare.subtasks.iter().cloned() {
        let sub_id = subtask.id.clone();
        let task_type = subtask.task_type.clone();

        log::info!(
            "Handling subtask#{sub_id}\n    type: {task_type:?}\n    task#{id}",
        );

        let temp = temp_root.join(&sub_id);
        let temp_str = temp.to_string_lossy().into_owned();
        fs::create_dir_all(&*temp)
            .await
            .context(format!("Failed to create temp folder {temp_str}"))?;

        let filename =
            frontend::request::<String>(id, Some(&sub_id), &RequestAction::GetFilename).await?;

        subtask.reg_task(&task);

        let ctrl = ctrl.clone();

        let req = SubTaskReq {
            task: task.clone(),
            subtask,
            temp,
            folder: folder.clone(),
            filename,
        };
        scheduler
            .try_join(id, &sub_id, async {
                match task_type {
                    TaskType::Video | TaskType::Audio => {
                        handle_media(
                            &req,
                            ctrl,
                            &prepare.video_urls,
                            &prepare.audio_urls,
                            &video_path,
                            &audio_path
                        ).await
                    }
                    TaskType::AudioVideo => handle_merge(
                        &req,
                        ctrl,
                        &video_path,
                        &audio_path
                    ).await,
                    TaskType::Thumb => handle_thumbs(&req, ctrl).await,
                    TaskType::LiveDanmaku | TaskType::HistoryDanmaku => {
                        handle_danmaku(&req, ctrl).await
                    }
                    TaskType::AlbumNfo | TaskType::SingleNfo => {
                        handle_nfo(&req, ctrl, &folder).await
                    }
                    TaskType::AiSummary => handle_ai_summary(&req, ctrl).await,
                    TaskType::Subtitles => handle_subtitle(&req, ctrl).await,
                    TaskType::OpusContent => handle_opus_content(&req, ctrl).await,
                    TaskType::OpusImages => handle_opus_images(&req, ctrl).await,
                }
            })
            .await?;
    }

    Ok(())
}
