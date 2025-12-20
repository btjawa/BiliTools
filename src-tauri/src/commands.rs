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
    let root_path = PathBuf::from(&path);

    // 在导入前，自动设置缓存根目录（如果尚未设置）
    let config = config::read();
    if config.cache_root.is_none() {
        let mut settings = serde_json::Map::new();
        settings.insert(
            "cache_root".to_string(),
            serde_json::Value::String(path.clone()),
        );
        config::write(settings).await?;
    }

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

/// 清理无效的缓存记录（文件不存在的记录）
#[tauri::command(async)]
#[specta::specta]
pub async fn cleanup_invalid_cache_records() -> TauriResult<i32> {
    let records = cache_records::get_all().await?;
    let mut invalid_count = 0;

    for record in records {
        let cache_path = PathBuf::from(&record.cache_path);
        let should_remove = if cache_path.exists() && cache_path.is_dir() {
            // 进一步验证是否包含必要的文件（如 videoInfo.json）
            let video_info_path = cache_path.join("videoInfo.json");
            !video_info_path.exists()
        } else {
            true
        };

        if should_remove {
            if let Err(e) = cache_records::delete(&record.id).await {
                eprintln!("删除无效缓存记录失败 {}: {}", record.id, e);
            } else {
                invalid_count += 1;
            }
        }
    }

    Ok(invalid_count)
}

/// 增量扫描缓存根目录，检测新增或删除的视频
#[tauri::command(async)]
#[specta::specta]
pub async fn incremental_scan_cache_root() -> TauriResult<IncrementalScanResult> {
    use crate::services::cache::ImportService;
    use std::collections::HashSet;

    // 从配置中获取缓存根目录
    let config = config::read();
    let cache_root = config
        .cache_root
        .as_ref()
        .ok_or_else(|| anyhow::anyhow!("尚未设置缓存根目录"))?;

    if !cache_root.exists() || !cache_root.is_dir() {
        return Err(anyhow::anyhow!("缓存根目录不存在或不是目录").into());
    }

    // 获取当前数据库中的所有缓存记录
    let existing_records = cache_records::get_all().await?;
    let mut existing_paths: HashSet<String> = existing_records
        .iter()
        .map(|record| record.cache_path.clone())
        .collect();

    // 扫描文件系统中的缓存目录
    let import_service = ImportService::new();
    let discovered_dirs = import_service.scan_cache_directories(cache_root).await?;

    let mut new_dirs = Vec::new();
    let mut existing_dirs = Vec::new();

    // 检查发现的目录
    for dir in discovered_dirs {
        let dir_str = dir.to_string_lossy().to_string();
        if existing_paths.contains(&dir_str) {
            existing_dirs.push(dir_str.clone());
            existing_paths.remove(&dir_str); // 从集合中移除，剩下的就是已删除的
        } else {
            new_dirs.push(dir_str);
        }
    }

    // remaining paths in existing_paths are deleted directories
    let deleted_dirs: Vec<String> = existing_paths.into_iter().collect();

    // 自动导入新发现的目录
    let mut imported_count = 0;
    if !new_dirs.is_empty() {
        for new_dir in &new_dirs {
            let dir_path = PathBuf::from(new_dir);
            if let Ok(cache_record) = import_service
                .import_single_cache_directory(&dir_path)
                .await
            {
                if let Err(e) = cache_records::upsert(&cache_record).await {
                    eprintln!("导入新缓存目录失败 {}: {}", new_dir, e);
                } else {
                    imported_count += 1;
                }
            }
        }
    }

    // 清理已删除的目录记录
    let mut cleaned_count = 0;
    for deleted_dir in &deleted_dirs {
        // 找到对应的记录并删除
        if let Some(record) = existing_records
            .iter()
            .find(|r| r.cache_path == *deleted_dir)
        {
            if let Err(e) = cache_records::delete(&record.id).await {
                eprintln!("删除已删除目录的记录失败 {}: {}", deleted_dir, e);
            } else {
                cleaned_count += 1;
            }
        }
    }

    Ok(IncrementalScanResult {
        scanned_root: cache_root.to_string_lossy().to_string(),
        new_directories_count: new_dirs.len() as i32,
        deleted_directories_count: deleted_dirs.len() as i32,
        imported_count,
        cleaned_count,
        new_directories: new_dirs,
        deleted_directories: deleted_dirs,
    })
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

/// 获取所有UP主列表（从全量数据）
#[tauri::command(async)]
#[specta::specta]
pub async fn get_all_uploaders() -> TauriResult<Vec<String>> {
    let uploaders = cache_records::get_all_uploaders().await?;
    Ok(uploaders)
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

/// 将前端排序字段名映射到后端字段名
fn map_sort_field(frontend_field: &str) -> &str {
    match frontend_field {
        "completionTime" | "downloadTime" | "time" => "time",
        "fileSize" | "size" => "size",
        "title" => "title",
        _ => "time", // 默认按时间排序
    }
}

/// 获取字符串的排序键（中文转拼音首字母，其他字符保持原样）
fn get_title_sort_key(title: &str) -> String {
    use pinyin::ToPinyin;

    title
        .chars()
        .map(|c| {
            if let Some(pinyin) = c.to_pinyin() {
                // 中文字符，获取拼音首字母
                pinyin
                    .plain()
                    .chars()
                    .next()
                    .unwrap_or(c)
                    .to_ascii_lowercase()
            } else {
                c.to_ascii_lowercase()
            }
        })
        .collect()
}

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
        if status == "collection" {
            cache_records::get_all().await?
        } else {
            cache_records::get_by_status(status).await?
        }
    } else {
        cache_records::get_all().await?
    };

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

    // 应用集合筛选
    if let Some(status) = &filters.filter_status {
        if status == "collection" {
            let records_for_check = records.clone();
            records.retain(|record| {
                if let Some(group_id) = &record.group_id {
                    if !group_id.is_empty() {
                        let has_other_videos_with_same_group =
                            records_for_check.iter().any(|other| {
                                other.id != record.id && other.group_id.as_ref() == Some(group_id)
                            });
                        if has_other_videos_with_same_group {
                            return true;
                        }
                    }
                }
                record.p > 1
            });
        }
    }

    // 构建显示项
    let mut display_items = group_service
        .build_display_items_with_states(records)
        .await?;

    // 应用 UP 主筛选（在构建显示项后应用，以支持合集筛选）
    if let Some(uploader) = &filters.filter_uploader {
        if !uploader.is_empty() {
            display_items.retain(|item| match item {
                DisplayItem::SingleVideo { video } => video.uname == *uploader,
                DisplayItem::VideoGroup { group } => {
                    group.videos.iter().any(|v| v.uname == *uploader)
                }
            });
        }
    }

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

    // 应用排序字段映射
    let sort_field = map_sort_field(sort_by.as_deref().unwrap_or("time"));
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
                // 使用拼音排序键进行比较
                let key_a = get_title_sort_key(title_a);
                let key_b = get_title_sort_key(title_b);
                key_a.cmp(&key_b)
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

/// 增量扫描结果
#[derive(Serialize, Type)]
pub struct IncrementalScanResult {
    pub scanned_root: String,
    pub new_directories_count: i32,
    pub deleted_directories_count: i32,
    pub imported_count: i32,
    pub cleaned_count: i32,
    pub new_directories: Vec<String>,
    pub deleted_directories: Vec<String>,
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
    LocalFileProtocol, RootMigrationRequest, TransferManager, TransferProgress, TransferProtocol,
    TransferRequest, TransferTarget,
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
        path: Some(target_path),
        available_space: None,
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
pub async fn start_root_migration(request: RootMigrationRequest) -> TauriResult<String> {
    use crate::services::transfer::types::{
        ConflictStrategy, TaskStatus, TransferOperation, TransferRequest,
    };
    use std::path::Path;

    // 从配置中获取当前缓存根目录
    let config = config::read();
    let current_root_str = config
        .cache_root
        .as_ref()
        .ok_or_else(|| anyhow::anyhow!("尚未设置缓存根目录"))?
        .to_string_lossy()
        .to_string();

    // 验证当前根目录存在
    let current_root = Path::new(&current_root_str);
    if !current_root.exists() || !current_root.is_dir() {
        return Err(anyhow::anyhow!("当前缓存根目录不存在: {}", current_root_str).into());
    }

    // 验证目标根目录的父目录存在
    let target_root = Path::new(&request.target_root);
    if let Some(parent) = target_root.parent() {
        if !parent.exists() {
            return Err(anyhow::anyhow!("目标路径的父目录不存在: {}", parent.display()).into());
        }
    }

    // 如果目标目录已存在且不为空，返回错误
    if target_root.exists() {
        if target_root.is_file() {
            return Err(anyhow::anyhow!(
                "目标路径是一个文件，不能作为目录: {}",
                request.target_root
            )
            .into());
        }

        // 检查目录是否为空
        let mut entries = tokio::fs::read_dir(target_root)
            .await
            .map_err(|e| anyhow::anyhow!("无法读取目标目录: {}", e))?;
        if entries
            .next_entry()
            .await
            .map_err(|e| anyhow::anyhow!("无法检查目标目录内容: {}", e))?
            .is_some()
        {
            return Err(anyhow::anyhow!("目标目录不为空: {}", request.target_root).into());
        }
    }

    // 获取所有缓存记录，用于后续更新数据库
    let all_records = cache_records::get_all().await?;

    // 筛选出在当前根目录下的记录
    let records_to_migrate: Vec<_> = all_records
        .into_iter()
        .filter(|record| {
            let cache_path = Path::new(&record.cache_path);
            cache_path.starts_with(current_root)
        })
        .collect();

    if records_to_migrate.is_empty() {
        return Err(anyhow::anyhow!("当前根目录下没有找到任何缓存文件").into());
    }

    // 收集所有需要迁移的文件夹路径
    let source_files: Vec<String> = records_to_migrate
        .iter()
        .map(|record| record.cache_path.clone())
        .collect();

    // 初始化传输管理器
    init_transfer_manager().await?;
    let manager = get_transfer_manager();

    // 创建传输请求（使用剪切操作进行迁移）
    let transfer_request = TransferRequest {
        operation: TransferOperation::RootMigration,
        source_files,
        target_path: request.target_root.clone(),
        conflict_strategy: ConflictStrategy::Rename,
    };

    // 启动传输任务
    let task_id = manager
        .start_transfer(transfer_request)
        .await
        .map_err(|e| anyhow::anyhow!("启动根目录迁移失败: {}", e))?;

    // 如果需要更新数据库，在传输完成后异步更新
    if request.update_database {
        let task_id_clone = task_id.clone();
        let current_root_clone = current_root_str.clone();
        let target_root_clone = request.target_root.clone();
        let records_clone = records_to_migrate.clone();

        tokio::spawn(async move {
            // 等待传输完成
            let manager = get_transfer_manager();
            loop {
                match manager.get_task_status(&task_id_clone).await {
                    Some(status) => {
                        match status {
                            TaskStatus::Completed => {
                                // 传输完成，更新数据库
                                if let Err(e) = update_cache_paths_after_migration(
                                    &records_clone,
                                    &current_root_clone,
                                    &target_root_clone,
                                )
                                .await
                                {
                                    eprintln!("更新数据库路径失败: {}", e);
                                }
                                break;
                            }
                            TaskStatus::Failed | TaskStatus::Cancelled => {
                                // 传输失败或取消，不更新数据库
                                eprintln!("根目录迁移失败或被取消，不更新数据库");
                                break;
                            }
                            _ => {
                                // 继续等待
                                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                            }
                        }
                    }
                    None => {
                        eprintln!("无法获取传输任务状态: {}", task_id_clone);
                        break;
                    }
                }
            }
        });
    }

    Ok(task_id)
}

/// 更新缓存记录的路径（迁移完成后调用）
async fn update_cache_paths_after_migration(
    records: &[CacheRecord],
    old_root: &str,
    new_root: &str,
) -> TauriResult<()> {
    use std::path::Path;

    let old_root_path = Path::new(old_root);
    let new_root_path = Path::new(new_root);

    for record in records {
        let old_cache_path = Path::new(&record.cache_path);

        // 计算相对路径
        if let Ok(relative_path) = old_cache_path.strip_prefix(old_root_path) {
            let new_cache_path = new_root_path.join(relative_path);
            let new_cache_path_str = new_cache_path.to_string_lossy().to_string();

            // 更新数据库记录
            let mut updated_record = record.clone();
            updated_record.cache_path = new_cache_path_str;

            if let Err(e) = cache_records::upsert(&updated_record).await {
                eprintln!("更新缓存记录路径失败 {}: {}", record.id, e);
            }
        }
    }

    // 更新配置中的缓存根目录
    let mut settings = serde_json::Map::new();
    settings.insert(
        "cache_root".to_string(),
        serde_json::Value::String(new_root.to_string()),
    );
    if let Err(e) = config::write(settings).await {
        eprintln!("更新配置中的缓存根目录失败: {}", e);
    }

    Ok(())
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

    // 如果配置中有缓存根目录，直接返回
    if let Some(cache_root) = &config.cache_root {
        return Ok(cache_root.to_string_lossy().to_string());
    }

    // 如果没有配置，返回空字符串表示未设置
    Ok(String::new())
}

/// 设置缓存根目录
#[tauri::command(async)]
#[specta::specta]
pub async fn set_cache_root(path: String) -> TauriResult<()> {
    use serde_json::json;
    use std::path::PathBuf;

    let cache_root = PathBuf::from(path);

    // 验证路径存在且是目录
    if !cache_root.exists() || !cache_root.is_dir() {
        return Err(anyhow::anyhow!("指定的路径不存在或不是目录").into());
    }

    // 更新配置
    let mut settings = json!({
        "cache_root": cache_root.to_string_lossy().to_string()
    });

    config::write(settings.as_object_mut().unwrap().clone()).await?;

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


// 转换功能相关命令

use crate::services::converter::{
    BatchConvertResult, ConvertConfig, ConvertProgress, ConvertService, ConvertTaskView,
    DiskSpaceCheck, DiskSpaceChecker,
};

/// 创建并执行转换任务
///
/// 为每个缓存ID创建转换任务并开始执行
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn convert_cache(
    cache_ids: Vec<String>,
    output_dir: String,
    config: ConvertConfig,
) -> TauriResult<Vec<String>> {
    let output_path = PathBuf::from(&output_dir);

    // 创建转换任务
    let task_ids = ConvertService::create_task(cache_ids, output_path, config)
        .await
        .map_err(|e| anyhow::anyhow!("创建转换任务失败: {}", e))?;

    // 异步执行所有任务
    let task_ids_clone = task_ids.clone();
    tokio::spawn(async move {
        let _ = ConvertService::execute_batch(task_ids_clone).await;
    });

    Ok(task_ids)
}

/// 暂停转换任务
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn pause_convert(task_id: String) -> TauriResult<()> {
    ConvertService::pause_task(&task_id)
        .await
        .map_err(|e| anyhow::anyhow!("暂停转换任务失败: {}", e))?;
    Ok(())
}

/// 恢复转换任务
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn resume_convert(task_id: String) -> TauriResult<()> {
    ConvertService::resume_task(&task_id)
        .await
        .map_err(|e| anyhow::anyhow!("恢复转换任务失败: {}", e))?;
    Ok(())
}

/// 取消转换任务
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn cancel_convert(task_id: String) -> TauriResult<()> {
    ConvertService::cancel_task(&task_id)
        .await
        .map_err(|e| anyhow::anyhow!("取消转换任务失败: {}", e))?;
    Ok(())
}

/// 检查转换所需的磁盘空间
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn check_convert_space(
    cache_ids: Vec<String>,
    output_dir: String,
) -> TauriResult<DiskSpaceCheck> {
    let output_path = PathBuf::from(&output_dir);

    // 获取所有缓存记录的路径
    let mut source_paths = Vec::new();
    for cache_id in cache_ids {
        if let Some(record) = cache_records::get_by_id(&cache_id).await? {
            let cache_path = PathBuf::from(&record.cache_path);
            // 收集缓存目录下的所有 m4s 文件
            if cache_path.exists() && cache_path.is_dir() {
                let mut entries = tokio::fs::read_dir(&cache_path).await?;
                while let Some(entry) = entries.next_entry().await? {
                    let path = entry.path();
                    if path.extension().is_some_and(|ext| ext == "m4s") {
                        source_paths.push(path);
                    }
                }
            }
        }
    }

    // 检查磁盘空间
    let check = DiskSpaceChecker::check_disk_space(&source_paths, &output_path)
        .map_err(|e| anyhow::anyhow!("检查磁盘空间失败: {}", e))?;

    Ok(check)
}

/// 获取默认转换配置
#[tauri::command]
#[specta::specta]
pub fn get_default_convert_config() -> ConvertConfig {
    ConvertConfig::default()
}

/// 获取保存的转换配置
#[tauri::command]
#[specta::specta]
pub fn get_saved_convert_config() -> ConvertConfig {
    let settings = config::read();
    let saved = &settings.convert_config;

    ConvertConfig {
        video_quality: saved.video_quality.into(),
        audio_bitrate: saved.audio_bitrate.into(),
        embed_cover: saved.embed_cover,
        danmaku_format: saved.danmaku_format.into(),
        write_metadata: saved.write_metadata,
    }
}

/// 获取上次使用的输出目录
#[tauri::command]
#[specta::specta]
pub fn get_last_convert_output_dir() -> Option<PathBuf> {
    config::read().convert_config.last_output_dir.clone()
}

/// 保存转换配置到设置
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn save_convert_config(
    video_quality: u8,
    audio_bitrate: u8,
    embed_cover: bool,
    danmaku_format: u8,
    write_metadata: bool,
    last_output_dir: Option<String>,
) -> TauriResult<()> {
    // 将转换配置保存到应用设置中
    let mut settings = serde_json::Map::new();

    let convert_settings = serde_json::json!({
        "videoQuality": video_quality,
        "audioBitrate": audio_bitrate,
        "embedCover": embed_cover,
        "danmakuFormat": danmaku_format,
        "writeMetadata": write_metadata,
        "lastOutputDir": last_output_dir
    });

    settings.insert("convertConfig".to_string(), convert_settings);
    config::write(settings).await?;

    Ok(())
}

/// 获取转换任务状态
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn get_convert_task(task_id: String) -> TauriResult<Option<ConvertTaskView>> {
    match ConvertService::get_task(&task_id).await {
        Ok(task) => Ok(Some(task)),
        Err(_) => Ok(None),
    }
}

/// 获取所有转换任务
#[tauri::command(async)]
#[specta::specta]
pub async fn get_all_convert_tasks() -> TauriResult<Vec<ConvertTaskView>> {
    let tasks = ConvertService::get_all_tasks().await;
    Ok(tasks)
}

/// 删除已完成的转换任务
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn remove_convert_task(task_id: String) -> TauriResult<()> {
    ConvertService::remove_task(&task_id)
        .await
        .map_err(|e| anyhow::anyhow!("删除转换任务失败: {}", e))?;
    Ok(())
}

/// 监听转换进度更新（使用 Channel 事件流）
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn listen_convert_progress(
    task_id: String,
    event: tauri::ipc::Channel<ConvertProgress>,
) -> TauriResult<()> {
    // 启动一个后台任务持续发送进度更新
    tokio::spawn(async move {
        // 最多等待 10 秒让任务出现
        let mut retry_count = 0;
        let max_retries = 20;

        loop {
            match ConvertService::get_task(&task_id).await {
                Ok(task) => {
                    // 发送进度更新
                    if event.send(task.progress.clone()).is_err() {
                        // Channel 已关闭，停止监听
                        break;
                    }

                    // 如果转换已完成或失败，停止监听
                    if task.progress.stage.is_terminal() {
                        break;
                    }

                    // 重置重试计数
                    retry_count = 0;
                }
                Err(_) => {
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

// ============================================================================
// 批量转换操作
// ============================================================================

/// 批量暂停转换任务
///
/// 暂停多个转换任务，单个任务暂停失败不影响其他任务
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn batch_pause_convert(task_ids: Vec<String>) -> TauriResult<BatchOperationIds> {
    let mut success_ids = Vec::new();
    let mut failed_ids = Vec::new();

    for task_id in task_ids {
        match ConvertService::pause_task(&task_id).await {
            Ok(_) => success_ids.push(task_id),
            Err(e) => {
                log::warn!("暂停任务 {} 失败: {}", task_id, e);
                failed_ids.push(task_id);
            }
        }
    }

    Ok(BatchOperationIds {
        success_ids,
        failed_ids,
    })
}

/// 批量恢复转换任务
///
/// 恢复多个转换任务，单个任务恢复失败不影响其他任务
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn batch_resume_convert(task_ids: Vec<String>) -> TauriResult<BatchOperationIds> {
    let mut success_ids = Vec::new();
    let mut failed_ids = Vec::new();

    for task_id in task_ids {
        match ConvertService::resume_task(&task_id).await {
            Ok(_) => success_ids.push(task_id),
            Err(e) => {
                log::warn!("恢复任务 {} 失败: {}", task_id, e);
                failed_ids.push(task_id);
            }
        }
    }

    Ok(BatchOperationIds {
        success_ids,
        failed_ids,
    })
}

/// 批量取消转换任务
///
/// 取消多个转换任务，单个任务取消失败不影响其他任务
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn batch_cancel_convert(task_ids: Vec<String>) -> TauriResult<BatchOperationIds> {
    let mut success_ids = Vec::new();
    let mut failed_ids = Vec::new();

    for task_id in task_ids {
        match ConvertService::cancel_task(&task_id).await {
            Ok(_) => success_ids.push(task_id),
            Err(e) => {
                log::warn!("取消任务 {} 失败: {}", task_id, e);
                failed_ids.push(task_id);
            }
        }
    }

    Ok(BatchOperationIds {
        success_ids,
        failed_ids,
    })
}

/// 获取批量转换进度汇总
///
/// 返回多个任务的进度汇总信息
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn get_batch_convert_progress(task_ids: Vec<String>) -> TauriResult<BatchConvertProgress> {
    let mut tasks = Vec::new();
    let mut total_percentage = 0.0;

    for task_id in &task_ids {
        if let Ok(task) = ConvertService::get_task(task_id).await {
            total_percentage += task.progress.percentage;
            tasks.push(task);
        }
    }

    let total_count = tasks.len();
    let completed_count = tasks
        .iter()
        .filter(|t| t.progress.stage == crate::services::converter::ConvertStage::Completed)
        .count();
    let failed_count = tasks
        .iter()
        .filter(|t| t.progress.stage == crate::services::converter::ConvertStage::Failed)
        .count();
    let cancelled_count = tasks
        .iter()
        .filter(|t| t.progress.stage == crate::services::converter::ConvertStage::Cancelled)
        .count();
    let paused_count = tasks
        .iter()
        .filter(|t| t.progress.stage == crate::services::converter::ConvertStage::Paused)
        .count();
    let running_count = total_count - completed_count - failed_count - cancelled_count - paused_count;

    let overall_percentage = if total_count > 0 {
        (total_percentage / total_count as f64).round()
    } else {
        0.0
    };

    Ok(BatchConvertProgress {
        total_count: total_count as i32,
        completed_count: completed_count as i32,
        failed_count: failed_count as i32,
        cancelled_count: cancelled_count as i32,
        paused_count: paused_count as i32,
        running_count: running_count as i32,
        overall_percentage,
        tasks,
    })
}

/// 批量操作ID结果
#[derive(Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct BatchOperationIds {
    /// 成功的任务ID列表
    pub success_ids: Vec<String>,
    /// 失败的任务ID列表
    pub failed_ids: Vec<String>,
}

/// 批量转换进度汇总
#[derive(Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct BatchConvertProgress {
    /// 总任务数
    pub total_count: i32,
    /// 已完成数量
    pub completed_count: i32,
    /// 失败数量
    pub failed_count: i32,
    /// 已取消数量
    pub cancelled_count: i32,
    /// 已暂停数量
    pub paused_count: i32,
    /// 运行中数量
    pub running_count: i32,
    /// 总体进度百分比
    pub overall_percentage: f64,
    /// 任务列表
    pub tasks: Vec<ConvertTaskView>,
}

// ============================================================================
// 转换任务恢复功能
// ============================================================================

/// 获取未完成的转换任务
///
/// 在应用启动时调用，检测之前未完成的转换任务
#[tauri::command(async)]
#[specta::specta]
pub async fn get_incomplete_convert_tasks() -> TauriResult<Vec<ConvertTaskView>> {
    let tasks = ConvertService::get_incomplete_tasks()
        .await
        .map_err(|e| anyhow::anyhow!("获取未完成任务失败: {}", e))?;
    Ok(tasks)
}

/// 恢复未完成的转换任务
///
/// 重新执行之前中断的转换任务
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn recover_convert_task(task_id: String) -> TauriResult<PathBuf> {
    let output_path = ConvertService::recover_task(&task_id)
        .await
        .map_err(|e| anyhow::anyhow!("恢复转换任务失败: {}", e))?;
    Ok(output_path)
}

/// 批量恢复未完成的转换任务
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn batch_recover_convert(task_ids: Vec<String>) -> TauriResult<BatchConvertResult> {
    let result = ConvertService::recover_batch(task_ids).await;
    Ok(result)
}

/// 放弃未完成的转换任务
///
/// 将未完成的任务标记为取消状态
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn abandon_convert_task(task_id: String) -> TauriResult<()> {
    ConvertService::abandon_task(&task_id)
        .await
        .map_err(|e| anyhow::anyhow!("放弃转换任务失败: {}", e))?;
    Ok(())
}

/// 批量放弃未完成的转换任务
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn batch_abandon_convert(task_ids: Vec<String>) -> TauriResult<i32> {
    let abandoned_count = ConvertService::abandon_batch(task_ids).await;
    Ok(abandoned_count)
}

/// 清理已完成的转换任务记录
///
/// 从数据库中删除已完成的任务记录
#[tauri::command(async, rename_all = "camelCase")]
#[specta::specta]
pub async fn cleanup_completed_convert_tasks(days_to_keep: Option<i64>) -> TauriResult<i32> {
    let deleted_count = ConvertService::cleanup_completed_tasks(days_to_keep)
        .await
        .map_err(|e| anyhow::anyhow!("清理已完成任务失败: {}", e))?;
    Ok(deleted_count)
}

/// 清理转换临时文件
///
/// 清理所有残留的转换临时目录
#[tauri::command(async)]
#[specta::specta]
pub async fn cleanup_convert_temp_files() -> TauriResult<(i32, i32)> {
    use crate::services::converter::TempFileCleaner;
    
    let (cleaned, failed) = TempFileCleaner::cleanup_all_temp()
        .await
        .map_err(|e| anyhow::anyhow!("清理临时文件失败: {}", e))?;
    Ok((cleaned, failed))
}
