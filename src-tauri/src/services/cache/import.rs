use anyhow::Result;
use rand::{distr::Alphanumeric, Rng};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::path::PathBuf;
use std::sync::{Arc, LazyLock};
use std::collections::HashMap;
use tokio::sync::{Semaphore, RwLock};

use crate::shared::get_millis;
use crate::storage::cache_records::{self, CacheRecord};

use super::{ParserService, ValidatorService};

// 全局导入状态管理
static IMPORT_STATES: LazyLock<Arc<RwLock<HashMap<String, Arc<RwLock<ImportProgress>>>>>> = 
    LazyLock::new(|| Arc::new(RwLock::new(HashMap::new())));

/// 重复处理策略
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub enum DuplicateHandlingStrategy {
    /// 跳过重复项
    Skip,
    /// 覆盖现有记录
    Overwrite,
    /// 询问用户（暂不实现，预留）
    Ask,
}

/// 导入选项
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ImportOptions {
    /// 重复处理策略
    pub duplicate_handling: DuplicateHandlingStrategy,
    /// 是否验证文件完整性
    pub verify_integrity: bool,
    /// 是否在导入后删除原文件
    pub delete_after_import: bool,
    /// 是否自动创建播放列表
    pub create_playlist: bool,
}

impl Default for ImportOptions {
    fn default() -> Self {
        Self {
            duplicate_handling: DuplicateHandlingStrategy::Skip,
            verify_integrity: true,
            delete_after_import: false,
            create_playlist: true,
        }
    }
}

/// 导入结果
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ImportResult {
    pub import_id: String,
    pub total_found: i32,
    pub success_count: i32,
    pub failure_count: i32,
    pub skipped_count: i32,
    pub details: Vec<ImportDetail>,
}

/// 导入详情
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ImportDetail {
    pub directory_path: String,
    pub status: ImportStatus,
    pub reason: Option<String>,
    pub cache_item: Option<CacheRecord>,
}

/// 导入状态
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub enum ImportStatus {
    Success,
    Failure,
    Skipped,
}

/// 导入进度
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ImportProgress {
    pub import_id: String,
    pub total_directories: i32,
    pub processed_directories: i32,
    pub current_directory: String,
    pub status: ImportProgressStatus,
    pub errors: Vec<ImportError>,
}

/// 导入进度状态
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub enum ImportProgressStatus {
    Scanning,
    Parsing,
    Validating,
    Saving,
    Completed,
    Cancelled,
    Error,
}

/// 缓存导入任务类型（用于队列系统）
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub enum CacheImportTaskType {
    ScanDirectories,
    ParseMetadata,
    ValidateFiles,
    SaveToDatabase,
}

/// 导入错误
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ImportError {
    pub directory_path: String,
    pub error_message: String,
    pub error_type: String,
}

/// 缓存导入服务
pub struct ImportService {
    parser: ParserService,
    validator: ValidatorService,
    // 并发控制：最多4个并发处理
    semaphore: Arc<Semaphore>,
}

impl ImportService {
    /// 创建新的导入服务实例
    pub fn new() -> Self {
        Self {
            parser: ParserService::new(),
            validator: ValidatorService::new(),
            semaphore: Arc::new(Semaphore::new(4)), // 最多4个并发
        }
    }

    /// 导入缓存目录（集成队列系统）
    /// 
    /// # 参数
    /// * `root_path` - 缓存根目录路径
    /// * `options` - 导入选项
    /// 
    /// # 返回
    /// * `Result<ImportResult>` - 导入结果
    pub async fn import_cache_directory(&self, root_path: PathBuf, options: ImportOptions) -> Result<ImportResult> {
        let import_id: String = rand::rng()
            .sample_iter(&Alphanumeric)
            .take(16)
            .map(char::from)
            .collect();
        
        // 初始化进度状态
        let progress = Arc::new(tokio::sync::RwLock::new(ImportProgress {
            import_id: import_id.clone(),
            total_directories: 0,
            processed_directories: 0,
            current_directory: "正在扫描目录...".to_string(),
            status: ImportProgressStatus::Scanning,
            errors: Vec::new(),
        }));
        
        // 注册进度状态到全局管理器
        {
            let mut states = IMPORT_STATES.write().await;
            states.insert(import_id.clone(), progress.clone());
        }
        

        
        // 扫描缓存目录
        let cache_dirs = self.scan_cache_directories(&root_path).await?;
        let total_found = cache_dirs.len() as i32;
        
        // 更新进度状态
        {
            let mut prog = progress.write().await;
            prog.total_directories = total_found;
            prog.status = ImportProgressStatus::Parsing;
        }
        

        
        let mut details = Vec::new();
        let mut success_count = 0;
        let mut failure_count = 0;
        let mut skipped_count = 0;

        // 并发处理缓存目录
        let mut handles = Vec::new();
        
        for (index, cache_dir) in cache_dirs.into_iter().enumerate() {
            let permit = self.semaphore.clone().acquire_owned().await?;
            let parser = self.parser.clone();
            let validator = self.validator.clone();
            let cache_dir_clone = cache_dir.clone();
            let progress_clone = progress.clone();
            let current_index = index as i32;
            let options_clone = options.clone();

            
            let handle = tokio::spawn(async move {
                let _permit = permit; // 持有许可证直到任务完成
                
                // 更新当前处理的目录
                {
                    let mut prog = progress_clone.write().await;
                    prog.current_directory = cache_dir_clone.to_string_lossy().to_string();
                    prog.processed_directories = current_index;
                    prog.status = ImportProgressStatus::Validating;
                }
                

                
                let result = Self::process_single_directory(parser, validator, cache_dir_clone, options_clone).await;
                
                // 更新进度
                {
                    let mut prog = progress_clone.write().await;
                    prog.processed_directories = current_index + 1;
                    if let Err(ref e) = result {
                        prog.errors.push(ImportError {
                            directory_path: "unknown".to_string(),
                            error_message: e.to_string(),
                            error_type: "processing_error".to_string(),
                        });
                    }
                }
                

                
                result
            });
            
            handles.push(handle);
        }

        // 等待所有任务完成
        for handle in handles {
            match handle.await? {
                Ok(detail) => {
                    match detail.status {
                        ImportStatus::Success => success_count += 1,
                        ImportStatus::Failure => failure_count += 1,
                        ImportStatus::Skipped => skipped_count += 1,
                    }
                    details.push(detail);
                }
                Err(e) => {
                    failure_count += 1;
                    details.push(ImportDetail {
                        directory_path: "unknown".to_string(),
                        status: ImportStatus::Failure,
                        reason: Some(format!("处理失败: {}", e)),
                        cache_item: None,
                    });
                }
            }
        }

        // 完成导入
        {
            let mut prog = progress.write().await;
            prog.status = ImportProgressStatus::Completed;
            prog.current_directory = "导入完成".to_string();
        }
        


        Ok(ImportResult {
            import_id,
            total_found,
            success_count,
            failure_count,
            skipped_count,
            details,
        })
    }

    /// 扫描缓存目录，识别包含videoInfo.json的目录
    /// 
    /// # 参数
    /// * `root_path` - 缓存根目录路径
    /// 
    /// # 返回
    /// * `Result<Vec<PathBuf>>` - 有效缓存目录列表
    pub async fn scan_cache_directories(&self, root_path: &PathBuf) -> Result<Vec<PathBuf>> {
        let mut cache_dirs = Vec::new();
        
        if !root_path.exists() || !root_path.is_dir() {
            return Err(anyhow::anyhow!("目录不存在或不是有效目录: {:?}", root_path));
        }

        self.scan_recursive(root_path, &mut cache_dirs).await?;
        
        Ok(cache_dirs)
    }

    /// 递归扫描目录
    fn scan_recursive<'a>(&'a self, dir_path: &'a PathBuf, cache_dirs: &'a mut Vec<PathBuf>) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<()>> + Send + 'a>> {
        Box::pin(async move {
            let mut entries = tokio::fs::read_dir(dir_path).await?;
            
            while let Some(entry) = entries.next_entry().await? {
                let path = entry.path();
                
                if path.is_dir() {
                    // 检查是否包含videoInfo.json
                    let video_info_path = path.join("videoInfo.json");
                    if video_info_path.exists() && video_info_path.is_file() {
                        cache_dirs.push(path.clone());
                    } else {
                        // 递归扫描子目录
                        self.scan_recursive(&path, cache_dirs).await?;
                    }
                }
            }
            
            Ok(())
        })
    }

    /// 处理单个缓存目录
    async fn process_single_directory(
        parser: ParserService,
        validator: ValidatorService,
        cache_dir: PathBuf,
        options: ImportOptions,
    ) -> Result<ImportDetail> {
        let directory_path = cache_dir.to_string_lossy().to_string();
        
        // 验证文件完整性
        let validation_result = match validator.validate_cache_directory(&cache_dir).await {
            Ok(result) => result,
            Err(e) => {
                return Ok(ImportDetail {
                    directory_path,
                    status: ImportStatus::Failure,
                    reason: Some(format!("验证失败: {}", e)),
                    cache_item: None,
                });
            }
        };

        if !validation_result.is_valid {
            return Ok(ImportDetail {
                directory_path,
                status: ImportStatus::Skipped,
                reason: Some(format!("文件不完整: {:?}", validation_result.errors)),
                cache_item: None,
            });
        }

        // 解析videoInfo.json
        let video_info_path = cache_dir.join("videoInfo.json");
        let video_info = match parser.parse_video_info(&video_info_path).await {
            Ok(info) => info,
            Err(e) => {
                return Ok(ImportDetail {
                    directory_path,
                    status: ImportStatus::Failure,
                    reason: Some(format!("解析失败: {}", e)),
                    cache_item: None,
                });
            }
        };

        // 检查是否已存在并根据策略处理
        if let Ok(Some(existing)) = cache_records::get_by_bvid_cid(&video_info.bvid, video_info.cid).await {
            match options.duplicate_handling {
                DuplicateHandlingStrategy::Skip => {
                    return Ok(ImportDetail {
                        directory_path,
                        status: ImportStatus::Skipped,
                        reason: Some("记录已存在，已跳过".to_string()),
                        cache_item: Some(existing),
                    });
                }
                DuplicateHandlingStrategy::Overwrite => {
                    // 继续处理，将覆盖现有记录
                }
                DuplicateHandlingStrategy::Ask => {
                    // 暂时按跳过处理，未来可以实现用户交互
                    return Ok(ImportDetail {
                        directory_path,
                        status: ImportStatus::Skipped,
                        reason: Some("记录已存在，需要用户确认".to_string()),
                        cache_item: Some(existing),
                    });
                }
            }
        }

        // 创建缓存记录
        let cache_record = CacheRecord {
            id: rand::rng()
                .sample_iter(&Alphanumeric)
                .take(16)
                .map(char::from)
                .collect(),
            bvid: video_info.bvid.clone(),
            aid: video_info.aid,
            cid: video_info.cid,
            title: video_info.title.clone(),
            uname: video_info.uname.clone(),
            cover_url: video_info.cover.clone(),
            duration: video_info.duration,
            file_size: video_info.total_size as i64,
            cache_path: directory_path.clone(),
            download_time: video_info.download_time.unwrap_or(0),
            import_time: get_millis(),
            status: "available".to_string(),
            source: "local_cache_import".to_string(),
        };

        // 保存到数据库（使用事务确保一致性）
        let save_result = match options.duplicate_handling {
            DuplicateHandlingStrategy::Overwrite => {
                // 使用 upsert 进行覆盖
                cache_records::upsert(&cache_record).await
            }
            _ => {
                // 使用 insert 进行插入
                cache_records::insert(&cache_record).await
            }
        };

        match save_result {
            Ok(_) => {
                let reason = match options.duplicate_handling {
                    DuplicateHandlingStrategy::Overwrite => Some("已覆盖现有记录".to_string()),
                    _ => None,
                };
                Ok(ImportDetail {
                    directory_path,
                    status: ImportStatus::Success,
                    reason,
                    cache_item: Some(cache_record),
                })
            }
            Err(e) => Ok(ImportDetail {
                directory_path,
                status: ImportStatus::Failure,
                reason: Some(format!("数据库保存失败: {}", e)),
                cache_item: None,
            }),
        }
    }

    /// 获取导入进度
    pub async fn get_import_progress(import_id: &str) -> Option<ImportProgress> {
        let states = IMPORT_STATES.read().await;
        if let Some(progress_state) = states.get(import_id) {
            Some(progress_state.read().await.clone())
        } else {
            None
        }
    }
    
    /// 取消导入操作
    pub async fn cancel_import(import_id: &str) -> Result<()> {
        let mut states = IMPORT_STATES.write().await;
        if let Some(progress_state) = states.get(import_id) {
            {
                let mut progress = progress_state.write().await;
                progress.status = ImportProgressStatus::Cancelled;
            }
            
            // 移除已取消的导入任务
            states.remove(import_id);
            Ok(())
        } else {
            Err(anyhow::anyhow!("导入任务不存在: {}", import_id))
        }
    }
}

impl Default for ImportService {
    fn default() -> Self {
        Self::new()
    }
}