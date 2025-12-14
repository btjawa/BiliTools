// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use base64::prelude::*;
use serde::{Deserialize, Serialize};
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
        self, cache_group_states,
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

/// 删除缓存项（同时删除文件和数据库记录）
#[tauri::command(async)]
#[specta::specta]
pub async fn delete_cache_item(id: String) -> TauriResult<()> {
    use std::path::PathBuf;
    use tokio::fs;

    // 先获取缓存记录以获得文件路径
    if let Some(record) = cache_records::get_by_id(&id).await? {
        let cache_path = PathBuf::from(&record.cache_path);

        // 先删除实际文件夹
        if cache_path.exists() {
            fs::remove_dir_all(&cache_path).await.map_err(|e| {
                anyhow::anyhow!("删除缓存文件夹失败: {} - {}", cache_path.display(), e)
            })?;
        }

        // 再删除数据库记录
        cache_records::delete(&id).await?;
    } else {
        return Err(anyhow::anyhow!("缓存记录不存在: {}", id).into());
    }

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
    let path = PathBuf::from(&cache_path);

    // 如果传入的是完整文件路径（如 group.jpg），直接检查该文件
    if path.is_file() {
        match tokio::fs::read(&path).await {
            Ok(file_data) => {
                let base64_data = base64::prelude::BASE64_STANDARD.encode(&file_data);
                let mime_type = match path.extension().and_then(|ext| ext.to_str()) {
                    Some("jpg") | Some("jpeg") => "image/jpeg",
                    Some("png") => "image/png",
                    Some("webp") => "image/webp",
                    _ => "image/jpeg",
                };
                return Ok(Some(format!("data:{};base64,{}", mime_type, base64_data)));
            }
            Err(e) => {
                eprintln!("读取封面文件失败 {:?}: {}", path, e);
            }
        }
    }

    // 如果是目录，查找视频封面文件（不含 group.jpg，组封面由 get_group_cover 处理）
    if path.is_dir() {
        let cover_files = ["image.jpg", "image.png"];
        for file_name in &cover_files {
            let cover_path = path.join(file_name);
            if cover_path.exists() && cover_path.is_file() {
                match tokio::fs::read(&cover_path).await {
                    Ok(file_data) => {
                        let base64_data = base64::prelude::BASE64_STANDARD.encode(&file_data);
                        let mime_type = match cover_path.extension().and_then(|ext| ext.to_str()) {
                            Some("jpg") | Some("jpeg") => "image/jpeg",
                            Some("png") => "image/png",
                            Some("webp") => "image/webp",
                            _ => "image/jpeg",
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

/// 获取完整的缓存统计信息（包含组统计）
#[tauri::command(async)]
#[specta::specta]
pub async fn get_cache_statistics() -> TauriResult<CacheStatistics> {
    let group_service = GroupService::new();

    // 获取所有记录
    let all_records = cache_records::get_all().await?;

    // 基础统计
    let total_count = all_records.len() as i64;
    let total_size: i64 = all_records.iter().map(|r| r.file_size).sum();
    let total_duration: i64 = all_records.iter().map(|r| r.duration).sum();

    // 状态统计
    let available_count = all_records
        .iter()
        .filter(|r| r.status == "available")
        .count() as i64;
    let unavailable_count = all_records
        .iter()
        .filter(|r| r.status == "unavailable")
        .count() as i64;
    let incomplete_count = all_records
        .iter()
        .filter(|r| r.status == "incomplete")
        .count() as i64;

    // 计算平均大小
    let average_size = if total_count > 0 {
        total_size / total_count
    } else {
        0
    };

    // 构建显示项来计算组统计
    let display_items = group_service
        .build_display_items_from_records(all_records)
        .await?;

    let group_count = display_items
        .iter()
        .filter(|item| matches!(item, DisplayItem::VideoGroup { .. }))
        .count() as i32;
    let single_video_count = display_items
        .iter()
        .filter(|item| matches!(item, DisplayItem::SingleVideo { .. }))
        .count() as i32;

    // 计算平均每组视频数量
    let average_videos_per_group = if group_count > 0 {
        let total_videos_in_groups: i32 = display_items
            .iter()
            .filter_map(|item| {
                if let DisplayItem::VideoGroup { group } = item {
                    Some(group.video_count)
                } else {
                    None
                }
            })
            .sum();
        total_videos_in_groups as f64 / group_count as f64
    } else {
        0.0
    };

    Ok(CacheStatistics {
        total_count,
        available_count,
        unavailable_count,
        incomplete_count,
        total_size,
        average_size,
        total_duration,
        group_count,
        single_video_count,
        average_videos_per_group,
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
    page_size: i32, // 使用 snake_case 命名符合 Rust 约定
    sort_by: Option<String>,
    sort_order: Option<String>,
    filters: Option<CacheFilterOptions>,
) -> TauriResult<PaginatedDisplayItems> {
    let group_service = GroupService::new();

    // 获取筛选选项
    let filters = filters.unwrap_or_default();

    // 获取所有记录
    let mut records = if let Some(status) = &filters.filter_status {
        cache_records::get_by_status(status).await?
    } else {
        cache_records::get_all().await?
    };

    // 应用基础过滤（UP主）
    if let Some(uploader) = &filters.filter_uploader {
        if !uploader.is_empty() {
            records.retain(|record| record.uname == *uploader);
        }
    }

    // 应用文件大小过滤
    if let Some(min) = filters.min_size {
        records.retain(|record| record.file_size >= min);
    }
    if let Some(max) = filters.max_size {
        records.retain(|record| record.file_size <= max);
    }

    // 应用时长过滤
    if let Some(min) = filters.min_duration {
        records.retain(|record| record.duration >= min);
    }
    if let Some(max) = filters.max_duration {
        records.retain(|record| record.duration <= max);
    }

    // 应用搜索过滤
    if let Some(query) = &filters.search_query {
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

    // 应用组ID过滤
    if let Some(gid) = &filters.group_id {
        if !gid.is_empty() {
            display_items.retain(|item| {
                if let DisplayItem::VideoGroup { group } = item {
                    group.group_id == *gid
                } else if let DisplayItem::SingleVideo { video } = item {
                    video.group_id.as_ref() == Some(gid)
                } else {
                    false
                }
            });
        }
    }

    // 应用显示类型过滤（组或单个视频）
    if let Some(dtype) = &filters.display_type {
        match dtype.as_str() {
            "groups" => {
                display_items.retain(|item| matches!(item, DisplayItem::VideoGroup { .. }));
            }
            "singles" => {
                display_items.retain(|item| matches!(item, DisplayItem::SingleVideo { .. }));
            }
            _ => {} // "all" 或其他值不需要过滤
        }
    }

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

/// 获取所有组的展开/折叠状态
#[tauri::command(async)]
#[specta::specta]
pub async fn get_group_states() -> TauriResult<Vec<cache_group_states::CacheGroupState>> {
    let states = cache_group_states::get_all_states().await?;
    Ok(states)
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
            "group" => match group_service.delete_group_with_files(item_id).await {
                Ok(count) => {
                    deleted_groups += 1;
                    deleted_videos += count;
                }
                Err(e) => errors.push(format!("删除组 {} 失败: {}", item_id, e)),
            },
            "video" => {
                // 使用统一的删除逻辑（删除文件+数据库记录）
                if let Some(record) = cache_records::get_by_id(item_id).await.unwrap_or(None) {
                    let cache_path = std::path::PathBuf::from(&record.cache_path);

                    // 先删除实际文件夹
                    if cache_path.exists() {
                        match tokio::fs::remove_dir_all(&cache_path).await {
                            Ok(_) => {}
                            Err(e) => {
                                errors.push(format!("删除视频文件 {} 失败: {}", item_id, e));
                                continue;
                            }
                        }
                    }

                    // 再删除数据库记录
                    match cache_records::delete(item_id).await {
                        Ok(_) => deleted_videos += 1,
                        Err(e) => errors.push(format!("删除视频记录 {} 失败: {}", item_id, e)),
                    }
                } else {
                    errors.push(format!("视频记录不存在: {}", item_id));
                }
            }
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

/// 缓存筛选选项
#[derive(Serialize, Deserialize, Type, Default)]
pub struct CacheFilterOptions {
    pub search_query: Option<String>,
    pub filter_status: Option<String>,
    pub filter_uploader: Option<String>,
    pub min_size: Option<i64>,
    pub max_size: Option<i64>,
    pub min_duration: Option<i64>,
    pub max_duration: Option<i64>,
    pub display_type: Option<String>,
    pub group_id: Option<String>,
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

/// 完整的缓存统计信息
#[derive(Serialize, Type)]
pub struct CacheStatistics {
    pub total_count: i64,              // 总缓存数量
    pub available_count: i64,          // 可用缓存数量
    pub unavailable_count: i64,        // 不可用缓存数量
    pub incomplete_count: i64,         // 不完整缓存数量
    pub total_size: i64,               // 总文件大小
    pub average_size: i64,             // 平均文件大小
    pub total_duration: i64,           // 总时长（秒）
    pub group_count: i32,              // 组数量
    pub single_video_count: i32,       // 单个视频数量
    pub average_videos_per_group: f64, // 平均每组视频数量
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

// 传输功能相关命令

use crate::services::transfer::{
    DeviceInfo, LocalFileProtocol, RootMigrationRequest, TransferManager, TransferProgress,
    TransferProtocol, TransferRequest, TransferTarget,
};
use std::sync::OnceLock;

/// 全局传输管理器实例
static TRANSFER_MANAGER: OnceLock<TransferManager> = OnceLock::new();

/// 获取或初始化传输管理器
fn get_transfer_manager() -> &'static TransferManager {
    TRANSFER_MANAGER.get_or_init(|| TransferManager::new(3))
}

/// 初始化传输管理器（注册协议）
async fn init_transfer_manager() -> Result<(), crate::TauriError> {
    let manager = get_transfer_manager();
    let local_protocol = Arc::new(LocalFileProtocol::new());
    manager
        .register_protocol("local".to_string(), local_protocol)
        .await?;
    Ok(())
}

/// 发现可用的传输目标（本地文件夹和移动设备）
#[tauri::command(async)]
#[specta::specta]
pub async fn discover_transfer_targets() -> TauriResult<Vec<TransferTarget>> {
    let protocol = LocalFileProtocol::new();
    let targets = protocol.discover_targets().await?;
    Ok(targets)
}

/// 验证传输目标的有效性
#[tauri::command(async)]
#[specta::specta]
pub async fn validate_transfer_target(target: TransferTarget) -> TauriResult<bool> {
    let protocol = LocalFileProtocol::new();
    let is_valid = protocol.validate_target(&target).await?;
    Ok(is_valid)
}

/// 检查目标位置的可用空间
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn check_available_space(target_path: String, required_size: u64) -> TauriResult<bool> {
    let protocol = LocalFileProtocol::new();
    let target = TransferTarget {
        id: target_path.clone(),
        name: target_path.clone(),
        device_type: crate::services::transfer::DeviceType::LocalDrive,
        path: Some(target_path),
        available_space: None,
        connection_status: crate::services::transfer::ConnectionStatus::Connected,
    };
    let has_space = protocol.check_space(&target, required_size).await?;
    Ok(has_space)
}

/// 开始文件传输
#[tauri::command(async)]
#[specta::specta]
pub async fn start_transfer(request: TransferRequest) -> TauriResult<String> {
    // 确保传输管理器已初始化
    init_transfer_manager().await?;

    let manager = get_transfer_manager();
    let task_id = manager.start_transfer(request).await?;
    Ok(task_id)
}

/// 开始缓存根目录迁移
#[tauri::command(async)]
#[specta::specta]
pub async fn start_root_migration(_request: RootMigrationRequest) -> TauriResult<String> {
    // 这个命令会在后续的缓存根目录迁移功能中实现
    // 目前返回一个占位符
    Err(anyhow::anyhow!("缓存根目录迁移功能尚未实现").into())
}

/// 暂停传输任务
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn pause_transfer(task_id: String) -> TauriResult<()> {
    let manager = get_transfer_manager();
    manager.pause_transfer(&task_id).await?;
    Ok(())
}

/// 恢复传输任务
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn resume_transfer(task_id: String) -> TauriResult<()> {
    let manager = get_transfer_manager();
    manager.resume_transfer(&task_id).await?;
    Ok(())
}

/// 取消传输任务
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn cancel_transfer(task_id: String) -> TauriResult<()> {
    let manager = get_transfer_manager();
    manager.cancel_transfer(&task_id).await?;
    Ok(())
}

/// 获取传输进度
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn get_transfer_progress(task_id: String) -> TauriResult<Option<TransferProgress>> {
    let manager = get_transfer_manager();
    let progress = manager.get_progress(&task_id).await;
    Ok(progress)
}

/// 打开文件夹选择对话框
#[tauri::command(async)]
#[specta::specta]
pub async fn select_folder(app: tauri::AppHandle) -> TauriResult<Option<String>> {
    use tauri_plugin_dialog::DialogExt;
    use tokio::sync::oneshot;

    let (tx, rx) = oneshot::channel();

    app.dialog()
        .file()
        .set_title("选择文件夹")
        .pick_folder(move |folder_path| {
            let _ = tx.send(folder_path);
        });

    let folder_path = rx.await.map_err(|_| anyhow::anyhow!("文件夹选择被取消"))?;

    match folder_path {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

/// 获取所有活跃的传输任务
#[tauri::command(async)]
#[specta::specta]
pub async fn get_active_transfers() -> TauriResult<Vec<crate::services::transfer::TransferTask>> {
    let manager = get_transfer_manager();
    let tasks = manager.get_active_tasks().await;
    Ok(tasks)
}

/// 获取队列中的传输任务
#[tauri::command(async)]
#[specta::specta]
pub async fn get_queued_transfers() -> TauriResult<Vec<crate::services::transfer::TransferTask>> {
    let manager = get_transfer_manager();
    let tasks = manager.get_queued_tasks().await;
    Ok(tasks)
}

/// 获取已完成的传输任务
#[tauri::command(async)]
#[specta::specta]
pub async fn get_completed_transfers() -> TauriResult<Vec<crate::services::transfer::TransferTask>>
{
    let manager = get_transfer_manager();
    let tasks = manager.get_completed_tasks().await;
    Ok(tasks)
}

/// 清空已完成的传输任务
#[tauri::command(async)]
#[specta::specta]
pub async fn clear_completed_transfers() -> TauriResult<()> {
    let manager = get_transfer_manager();
    manager.clear_completed_tasks().await;
    Ok(())
}

/// 获取当前缓存根目录
#[tauri::command(async)]
#[specta::specta]
pub async fn get_current_cache_root() -> TauriResult<String> {
    let config = config::read();
    // 缓存根目录存储在 down_dir 中
    let cache_root = config.down_dir.to_string_lossy().to_string();
    Ok(cache_root)
}

/// 获取设备列表
#[tauri::command(async)]
#[specta::specta]
pub async fn get_device_list() -> TauriResult<Vec<DeviceInfo>> {
    let protocol = LocalFileProtocol::new();
    let devices = protocol.get_all_devices().await?;
    Ok(devices)
}

/// 监听设备变化（使用 Channel 事件流）
#[tauri::command(async)]
#[specta::specta]
pub async fn listen_device_changes(event: tauri::ipc::Channel<Vec<DeviceInfo>>) -> TauriResult<()> {
    // 启动一个后台任务持续监听设备变化
    tokio::spawn(async move {
        let protocol = LocalFileProtocol::new();
        let mut last_devices: Vec<DeviceInfo> = Vec::new();

        loop {
            // 每2秒检查一次设备变化
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

            match protocol.get_all_devices().await {
                Ok(current_devices) => {
                    // 检查设备列表是否发生变化
                    if current_devices.len() != last_devices.len()
                        || current_devices
                            .iter()
                            .zip(last_devices.iter())
                            .any(|(a, b)| {
                                a.id != b.id || a.connection_status != b.connection_status
                            })
                    {
                        last_devices = current_devices.clone();
                        if event.send(current_devices).is_err() {
                            // Channel 已关闭，停止监听
                            break;
                        }
                    }
                }
                Err(_) => {
                    // 发生错误，继续尝试
                    continue;
                }
            }
        }
    });

    Ok(())
}

/// 监听传输进度更新（使用 Channel 事件流）
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn listen_transfer_progress(
    task_id: String,
    event: tauri::ipc::Channel<TransferProgress>,
) -> TauriResult<()> {
    let manager = get_transfer_manager();

    // 启动一个后台任务持续发送进度更新
    tokio::spawn(async move {
        // 最多等待 10 秒让任务出现
        let mut retry_count = 0;
        let max_retries = 20;
        
        loop {
            match manager.get_progress(&task_id).await {
                Some(progress) => {
                    // 发送进度更新
                    if event.send(progress.clone()).is_err() {
                        // Channel 已关闭，停止监听
                        break;
                    }

                    // 如果传输已完成或失败，停止监听
                    match progress.status {
                        crate::services::transfer::TaskStatus::Completed
                        | crate::services::transfer::TaskStatus::Failed
                        | crate::services::transfer::TaskStatus::Cancelled => {
                            break;
                        }
                        _ => {}
                    }
                    
                    // 重置重试计数
                    retry_count = 0;
                }
                None => {
                    // 任务不存在，可能还没开始或已完成
                    retry_count += 1;
                    if retry_count >= max_retries {
                        // 超过最大重试次数，停止监听
                        break;
                    }
                }
            }
            
            // 每200ms检查一次进度
            tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
        }
    });

    Ok(())
}
