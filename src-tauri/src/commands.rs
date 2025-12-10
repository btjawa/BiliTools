// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use serde::Serialize;
use specta::Type;
use std::{collections::HashMap, env, path::PathBuf, sync::Arc};
use tauri::async_runtime;
use tokio::fs;

// Re-export for lib.rs to register commands
pub use crate::{
    errors::{TauriError, TauriResult},
    services::{
        self, aria2c, ffmpeg,
        login::{
            self, exit, pwd_login, refresh_cookie, scan_login, sms_login, stop_login, switch_cookie,
        },
        queue::{
            self,
            atomics::QueueType,
            ctrl_event,
            open_folder,
            plan_scheduler,
            process_scheduler,
            scheduler::SchedulerView,
            // update_max_conc,
            submit_task,
            task::TaskView,
        },
    },
    shared::{self, get_app_handle, set_window, HEADERS, READY},
    storage::{
        self,
        config::{self, CacheKey},
        cookies, db, queue as queues, schedulers, tasks,
    },
};

#[derive(Serialize, Type)]
pub struct InitData {
    version: String,
    hash: String,
    config: Arc<config::Settings>,
    tasks: HashMap<String, TaskView>,
    schedulers: HashMap<String, SchedulerView>,
    queue: HashMap<QueueType, Vec<String>>,
}

#[tauri::command(async)]
#[specta::specta]
pub async fn get_size(key: CacheKey, event: tauri::ipc::Channel<u64>) -> TauriResult<()> {
    let path = config::read().get_cache(&key)?;
    let mut bytes = 0u64;
    let mut count = 0;
    for entry in walkdir::WalkDir::new(&path)
        .into_iter()
        .filter_map(Result::ok)
    {
        let path = entry.path();
        if path.is_file() {
            match fs::metadata(path).await {
                Ok(meta) => {
                    bytes += meta.len();
                    count += 1;
                    if count > 200 {
                        event.send(bytes)?;
                        count = 0;
                    }
                }
                Err(_) => continue,
            }
        }
    }
    event.send(bytes)?;
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn clean_cache(key: CacheKey) -> TauriResult<()> {
    let path = config::read().get_cache(&key)?;
    if key == CacheKey::Database {
        db::close_db().await?;
        fs::remove_file(&path).await?;
        let app = get_app_handle();
        app.restart();
    }
    let mut entries = fs::read_dir(&path).await?;
    while let Some(entry) = entries.next_entry().await? {
        let path = entry.path();
        async_runtime::spawn(async move {
            let _ = if path.is_dir() {
                fs::remove_dir_all(&path).await
            } else {
                fs::remove_file(&path).await
            };
        });
    }
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn open_cache(key: CacheKey) -> TauriResult<()> {
    let path = config::read().get_cache(&key)?;
    tauri_plugin_opener::open_path(path, None::<&str>)?;
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn config_write(settings: serde_json::Map<String, serde_json::Value>) -> TauriResult<()> {
    config::write(settings).await?;
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn db_export(output: PathBuf) -> TauriResult<()> {
    db::export(output).await?;
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn db_import(app: tauri::AppHandle, input: PathBuf) -> TauriResult<()> {
    db::import(input).await?;
    app.restart();
}

#[tauri::command(async)]
#[specta::specta]
pub async fn export_data(output: PathBuf, data: serde_json::Value) -> TauriResult<()> {
    let json = serde_json::to_string_pretty(&data)?;
    fs::write(output, json.as_bytes()).await?;
    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn meta(app: tauri::AppHandle) -> TauriResult<InitData> {
    let version = app.package_info().version.to_string();
    let hash = env!("GIT_HASH").to_string();
    let config = config::read();

    let tasks = tasks::load().await?;
    let schedulers = schedulers::load().await?;
    let queue = queues::load().await?;

    Ok(InitData {
        version,
        hash,
        config,
        tasks,
        schedulers,
        queue,
    })
}

#[tauri::command(async)]
#[specta::specta]
pub async fn init() -> TauriResult<()> {
    if READY.set(()).is_err() {
        #[cfg(not(debug_assertions))]
        return Err(anyhow::anyhow!("403 Forbidden").into());
    }
    login::stop_login();
    login::get_buvid().await?;
    login::get_bili_ticket().await?;
    login::get_uuid().await?;
    HEADERS.refresh().await?;
    Ok(())
}
// 缓存导入相关命令

use crate::services::cache::{ImportService, import::{ImportResult, ImportProgress, ImportOptions}};
use crate::storage::cache_records::{self, CacheRecord};

/// 导入缓存目录
#[tauri::command(async)]
#[specta::specta]
pub async fn import_cache_directory(path: String, options: ImportOptions) -> TauriResult<ImportResult> {
    let import_service = ImportService::new();
    let root_path = PathBuf::from(path);
    let result = import_service.import_cache_directory(root_path, options).await?;
    Ok(result)
}

/// 获取导入进度（使用 Channel 事件流）
#[tauri::command(async)]
#[specta::specta]
pub async fn get_import_progress(import_id: String, event: tauri::ipc::Channel<ImportProgress>) -> TauriResult<()> {
    if let Some(progress) = ImportService::get_import_progress(&import_id).await {
        event.send(progress)?;
        Ok(())
    } else {
        Err(anyhow::anyhow!("导入任务不存在: {}", import_id).into())
    }
}

/// 取消导入操作
#[tauri::command(async)]
#[specta::specta]
pub async fn cancel_import(import_id: String) -> TauriResult<()> {
    ImportService::cancel_import(&import_id).await?;
    Ok(())
}

/// 获取缓存列表
#[tauri::command(async)]
#[specta::specta]
pub async fn get_cache_list() -> TauriResult<Vec<CacheRecord>> {
    let records = cache_records::get_all().await?;
    Ok(records)
}

/// 根据状态获取缓存列表
#[tauri::command(async)]
#[specta::specta]
pub async fn get_cache_list_by_status(status: String) -> TauriResult<Vec<CacheRecord>> {
    let records = cache_records::get_by_status(&status).await?;
    Ok(records)
}

/// 删除缓存项
#[tauri::command(async)]
#[specta::specta]
pub async fn delete_cache_item(id: String) -> TauriResult<()> {
    cache_records::delete(&id).await?;
    Ok(())
}

/// 打开缓存文件夹
#[tauri::command(async)]
#[specta::specta]
pub async fn open_cache_folder(cache_path: String) -> TauriResult<()> {
    let path = PathBuf::from(&cache_path);
    if path.exists() {
        tauri_plugin_opener::open_path(path, None::<&str>)?;
    } else {
        return Err(anyhow::anyhow!("缓存目录不存在: {}", cache_path).into());
    }
    Ok(())
}

/// 获取缓存统计信息
#[tauri::command(async)]
#[specta::specta]
pub async fn get_cache_stats() -> TauriResult<CacheStats> {
    let total_count = cache_records::count().await?;
    let total_size = cache_records::total_size().await?;
    let available_count = cache_records::get_by_status("available").await?.len() as i64;
    
    Ok(CacheStats {
        total_count,
        total_size,
        available_count,
    })
}

/// 缓存统计信息
#[derive(Serialize, Type)]
pub struct CacheStats {
    pub total_count: i64,
    pub total_size: i64,
    pub available_count: i64,
}