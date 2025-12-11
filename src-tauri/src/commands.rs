// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use base64::prelude::*;
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

use crate::services::cache::{
    import::{ImportOptions, ImportProgress, ImportProgressStatus},
    ImportService,
};
use crate::storage::cache_records::{self, CacheRecord};

/// 扫描缓存目录（仅扫描，不导入）
#[tauri::command(async)]
#[specta::specta]
pub async fn scan_cache_directory(path: String) -> TauriResult<ScanResult> {
    let import_service = ImportService::new();
    let root_path = PathBuf::from(&path);
    let cache_dirs = import_service.scan_cache_directories(&root_path).await?;

    Ok(ScanResult {
        root_path: path,
        total_directories: cache_dirs.len() as i32,
        valid_directories: cache_dirs.len() as i32, // 扫描到的都是有效的
        invalid_directories: 0,
        estimated_total_size: 0, // 暂时不计算大小，避免扫描过慢
        scan_duration: 0,
        directories: cache_dirs
            .into_iter()
            .map(|dir| ScanDirectoryInfo {
                path: dir.to_string_lossy().to_string(),
                is_valid: true,
                invalid_reason: None,
                preview: None, // 暂时不提供预览信息
            })
            .collect(),
    })
}

/// 导入缓存目录
#[tauri::command(async)]
#[specta::specta]
pub async fn import_cache_directory(path: String, options: ImportOptions) -> TauriResult<String> {
    let import_service = ImportService::new();
    let root_path = PathBuf::from(path);

    // 启动异步导入并返回导入ID
    let result = import_service
        .import_cache_directory(root_path, options)
        .await?;
    let import_id = result.import_id;
    Ok(import_id)
}

/// 获取导入进度（使用 Channel 事件流）
#[tauri::command(async)]
#[specta::specta]
pub async fn get_import_progress(
    import_id: String,
    event: tauri::ipc::Channel<ImportProgress>,
) -> TauriResult<()> {
    // 启动一个后台任务持续发送进度更新
    tokio::spawn(async move {
        while let Some(progress) = ImportService::get_import_progress(&import_id).await {
            // 发送进度更新
            if event.send(progress.clone()).is_err() {
                // Channel 已关闭，停止发送
                break;
            }

            // 如果导入已完成或取消，停止监听
            match progress.status {
                ImportProgressStatus::Completed
                | ImportProgressStatus::Cancelled
                | ImportProgressStatus::Error => {
                    break;
                }
                _ => {
                    // 等待一段时间后再次检查
                    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                }
            }
        }
    });

    Ok(())
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

/// 检查本地封面文件
#[tauri::command(async)]
#[specta::specta]
pub async fn check_local_cover(cache_path: String) -> TauriResult<Option<String>> {
    let cache_dir = PathBuf::from(&cache_path);
    if !cache_dir.exists() {
        return Ok(None);
    }

    // B站缓存的封面文件名（按优先级排序）
    let cover_files = ["image.jpg", "image.png"];

    for file_name in &cover_files {
        let cover_path = cache_dir.join(file_name);
        if cover_path.exists() && cover_path.is_file() {
            // 读取文件并转换为 base64 data URL
            match tokio::fs::read(&cover_path).await {
                Ok(file_data) => {
                    let base64_data = base64::prelude::BASE64_STANDARD.encode(&file_data);
                    let mime_type = match cover_path.extension().and_then(|ext| ext.to_str()) {
                        Some("jpg") | Some("jpeg") => "image/jpeg",
                        Some("png") => "image/png",
                        Some("webp") => "image/webp",
                        _ => "image/jpeg", // 默认
                    };
                    return Ok(Some(format!("data:{};base64,{}", mime_type, base64_data)));
                }
                Err(e) => {
                    eprintln!("读取封面文件失败 {:?}: {}", cover_path, e);
                    continue;
                }
            }
        }
    }

    Ok(None)
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

// 组功能相关命令

use crate::services::cache::{DisplayItem, GroupService, GroupStatistics};

/// 获取缓存显示项列表（组和单个视频的混合）
#[tauri::command(async)]
#[specta::specta]
pub async fn get_cache_display_items() -> TauriResult<Vec<DisplayItem>> {
    let group_service = GroupService::new();
    let records = cache_records::get_all().await?;
    let display_items = group_service
        .build_display_items_with_states(records)
        .await?;
    Ok(display_items)
}

/// 获取缓存显示项列表（带分页支持）
#[tauri::command(async)]
#[specta::specta]
pub async fn get_cache_display_items_paginated(
    page: i32,
    page_size: i32,
    sort_by: Option<String>,
    sort_order: Option<String>,
    search_query: Option<String>,
    filter_status: Option<String>,
) -> TauriResult<PaginatedDisplayItems> {
    let group_service = GroupService::new();

    // 获取所有记录
    let mut records = if let Some(status) = filter_status {
        cache_records::get_by_status(&status).await?
    } else {
        cache_records::get_all().await?
    };

    // 应用搜索过滤
    if let Some(query) = search_query {
        if !query.is_empty() {
            let query_lower = query.to_lowercase();
            records.retain(|record| {
                record.title.to_lowercase().contains(&query_lower)
                    || record.uname.to_lowercase().contains(&query_lower)
            });
        }
    }

    // 构建显示项
    let mut display_items = group_service
        .build_display_items_with_states(records)
        .await?;

    // 应用排序
    let sort_field = sort_by.as_deref().unwrap_or("time");
    let sort_desc = sort_order.as_deref().unwrap_or("desc") == "desc";

    display_items.sort_by(|a, b| {
        let cmp = match sort_field {
            "time" => {
                let time_a = match a {
                    DisplayItem::SingleVideo { video } => video.download_time,
                    DisplayItem::VideoGroup { group } => group.latest_download_time,
                };
                let time_b = match b {
                    DisplayItem::SingleVideo { video } => video.download_time,
                    DisplayItem::VideoGroup { group } => group.latest_download_time,
                };
                time_a.cmp(&time_b)
            }
            "size" => {
                let size_a = match a {
                    DisplayItem::SingleVideo { video } => video.file_size,
                    DisplayItem::VideoGroup { group } => group.total_file_size,
                };
                let size_b = match b {
                    DisplayItem::SingleVideo { video } => video.file_size,
                    DisplayItem::VideoGroup { group } => group.total_file_size,
                };
                size_a.cmp(&size_b)
            }
            "title" => {
                let title_a = match a {
                    DisplayItem::SingleVideo { video } => &video.title,
                    DisplayItem::VideoGroup { group } => &group.title,
                };
                let title_b = match b {
                    DisplayItem::SingleVideo { video } => &video.title,
                    DisplayItem::VideoGroup { group } => &group.title,
                };
                title_a.cmp(title_b)
            }
            _ => std::cmp::Ordering::Equal,
        };

        if sort_desc {
            cmp.reverse()
        } else {
            cmp
        }
    });

    // 计算分页
    let total_count = display_items.len() as i32;
    let total_pages = (total_count + page_size - 1) / page_size;
    let start_index = ((page - 1) * page_size) as usize;
    let end_index = (start_index + page_size as usize).min(display_items.len());

    let items = if start_index < display_items.len() {
        display_items[start_index..end_index].to_vec()
    } else {
        Vec::new()
    };

    Ok(PaginatedDisplayItems {
        items,
        total_count,
        total_pages,
        current_page: page,
        page_size,
        has_next: page < total_pages,
        has_prev: page > 1,
    })
}

/// 切换组的展开状态
#[tauri::command(async)]
#[specta::specta]
pub async fn toggle_group_expansion(group_id: String) -> TauriResult<bool> {
    let group_service = GroupService::new();
    let new_state = group_service.toggle_group_expansion(&group_id).await?;
    Ok(new_state)
}

/// 设置组的展开状态
#[tauri::command(async)]
#[specta::specta]
pub async fn set_group_expansion(group_id: String, is_expanded: bool) -> TauriResult<()> {
    let group_service = GroupService::new();
    group_service
        .set_group_expansion(&group_id, is_expanded)
        .await?;
    Ok(())
}

/// 获取组统计信息
#[tauri::command(async)]
#[specta::specta]
pub async fn get_group_statistics() -> TauriResult<GroupStatistics> {
    let group_service = GroupService::new();
    let records = cache_records::get_all().await?;
    let display_items = group_service
        .build_display_items_from_records(records)
        .await?;
    let statistics = group_service.calculate_group_statistics(&display_items);
    Ok(statistics)
}

/// 根据组ID获取组内视频
#[tauri::command(async)]
#[specta::specta]
pub async fn get_videos_by_group_id(group_id: String) -> TauriResult<Vec<CacheRecord>> {
    let group_service = GroupService::new();
    let videos = group_service.get_videos_by_group_id(&group_id).await?;
    Ok(videos)
}

/// 删除整个组
#[tauri::command(async)]
#[specta::specta]
pub async fn delete_group(group_id: String) -> TauriResult<i32> {
    let group_service = GroupService::new();
    let deleted_count = group_service.delete_group(&group_id).await?;
    Ok(deleted_count)
}

/// 清理孤立的组状态
#[tauri::command(async)]
#[specta::specta]
pub async fn cleanup_orphaned_group_states() -> TauriResult<()> {
    let group_service = GroupService::new();
    group_service.cleanup_orphaned_group_states().await?;
    Ok(())
}

/// 批量删除缓存项（支持组和单个视频）
#[tauri::command(async)]
#[specta::specta]
pub async fn batch_delete_cache_items(
    item_ids: Vec<String>,
    item_types: Vec<String>,
) -> TauriResult<BatchOperationResult> {
    let group_service = GroupService::new();
    let mut deleted_videos = 0;
    let mut deleted_groups = 0;
    let mut errors = Vec::new();

    for (item_id, item_type) in item_ids.iter().zip(item_types.iter()) {
        match item_type.as_str() {
            "group" => match group_service.delete_group(item_id).await {
                Ok(count) => {
                    deleted_groups += 1;
                    deleted_videos += count;
                }
                Err(e) => errors.push(format!("删除组 {} 失败: {}", item_id, e)),
            },
            "video" => match cache_records::delete(item_id).await {
                Ok(_) => deleted_videos += 1,
                Err(e) => errors.push(format!("删除视频 {} 失败: {}", item_id, e)),
            },
            _ => errors.push(format!("未知的项目类型: {}", item_type)),
        }
    }

    Ok(BatchOperationResult {
        success_count: deleted_videos + deleted_groups,
        deleted_videos,
        deleted_groups,
        error_count: errors.len() as i32,
        errors,
    })
}

/// 批量导出缓存项
#[tauri::command(async)]
#[specta::specta]
pub async fn batch_export_cache_items(
    item_ids: Vec<String>,
    item_types: Vec<String>,
    _export_path: String,
) -> TauriResult<BatchOperationResult> {
    let group_service = GroupService::new();
    let mut exported_videos = 0;
    let mut exported_groups = 0;
    let mut errors = Vec::new();

    // 这里只是一个框架实现，实际的导出逻辑需要根据具体需求实现
    for (item_id, item_type) in item_ids.iter().zip(item_types.iter()) {
        match item_type.as_str() {
            "group" => {
                match group_service.get_videos_by_group_id(item_id).await {
                    Ok(videos) => {
                        // TODO: 实现实际的导出逻辑
                        exported_groups += 1;
                        exported_videos += videos.len() as i32;
                    }
                    Err(e) => errors.push(format!("导出组 {} 失败: {}", item_id, e)),
                }
            }
            "video" => {
                // TODO: 实现单个视频的导出逻辑
                exported_videos += 1;
            }
            _ => errors.push(format!("未知的项目类型: {}", item_type)),
        }
    }

    Ok(BatchOperationResult {
        success_count: exported_videos + exported_groups,
        deleted_videos: 0, // 导出操作不删除
        deleted_groups: 0, // 导出操作不删除
        error_count: errors.len() as i32,
        errors,
    })
}

/// 缓存统计信息
#[derive(Serialize, Type)]
pub struct CacheStats {
    pub total_count: i64,
    pub total_size: i64,
    pub available_count: i64,
}

/// 分页显示项结果
#[derive(Serialize, Type)]
pub struct PaginatedDisplayItems {
    pub items: Vec<DisplayItem>,
    pub total_count: i32,
    pub total_pages: i32,
    pub current_page: i32,
    pub page_size: i32,
    pub has_next: bool,
    pub has_prev: bool,
}

/// 批量操作结果
#[derive(Serialize, Type)]
pub struct BatchOperationResult {
    pub success_count: i32,
    pub deleted_videos: i32,
    pub deleted_groups: i32,
    pub error_count: i32,
    pub errors: Vec<String>,
}

/// 扫描结果
#[derive(Serialize, Type)]
pub struct ScanResult {
    pub root_path: String,
    pub total_directories: i32,
    pub valid_directories: i32,
    pub invalid_directories: i32,
    pub estimated_total_size: i64,
    pub scan_duration: i64,
    pub directories: Vec<ScanDirectoryInfo>,
}

/// 扫描目录信息
#[derive(Serialize, Type)]
pub struct ScanDirectoryInfo {
    pub path: String,
    pub is_valid: bool,
    pub invalid_reason: Option<String>,
    pub preview: Option<ScanPreviewInfo>,
}

/// 扫描预览信息
#[derive(Serialize, Type)]
pub struct ScanPreviewInfo {
    pub title: String,
    pub file_size: i64,
    pub duration: i32,
}
