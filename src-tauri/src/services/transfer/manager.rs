//! 传输管理器
//!
//! 管理传输任务的生命周期，包括任务队列、并发控制、进度跟踪和状态管理。

use super::error::TransferError;
use super::protocol::{ProgressSender, TransferProtocol};
use super::types::{TaskStatus, TransferProgress, TransferRequest, TransferTarget, TransferTask};
use std::collections::{HashMap, VecDeque};
use std::path::Path;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use uuid::Uuid;

/// 传输管理器
///
/// 负责管理所有传输任务，包括：
/// - 任务队列管理
/// - 并发控制（最多3个同时传输）
/// - 任务状态管理和进度跟踪
/// - 暂停、取消和恢复功能
pub struct TransferManager {
    /// 活跃的传输任务（正在运行或已暂停）
    active_tasks: Arc<RwLock<HashMap<String, TransferTask>>>,
    /// 待处理的传输任务队列
    task_queue: Arc<RwLock<VecDeque<TransferTask>>>,
    /// 已完成的传输任务
    completed_tasks: Arc<RwLock<Vec<TransferTask>>>,
    /// 传输协议实现
    protocols: Arc<RwLock<HashMap<String, Arc<dyn TransferProtocol>>>>,
    /// 最大并发传输数
    max_concurrent: usize,
    /// 进度更新发送器（用于向前端推送进度）
    progress_senders: Arc<RwLock<HashMap<String, ProgressSender>>>,
}

impl TransferManager {
    /// 创建新的传输管理器
    pub fn new(max_concurrent: usize) -> Self {
        Self {
            active_tasks: Arc::new(RwLock::new(HashMap::new())),
            task_queue: Arc::new(RwLock::new(VecDeque::new())),
            completed_tasks: Arc::new(RwLock::new(Vec::new())),
            protocols: Arc::new(RwLock::new(HashMap::new())),
            max_concurrent,
            progress_senders: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// 注册传输协议
    pub async fn register_protocol(
        &self,
        name: String,
        protocol: Arc<dyn TransferProtocol>,
    ) -> Result<(), TransferError> {
        let mut protocols = self.protocols.write().await;
        protocols.insert(name, protocol);
        Ok(())
    }

    /// 获取传输协议
    async fn get_protocol(&self, name: &str) -> Result<Arc<dyn TransferProtocol>, TransferError> {
        let protocols = self.protocols.read().await;
        protocols
            .get(name)
            .cloned()
            .ok_or_else(|| TransferError::Unknown {
                message: format!("传输协议未找到: {}", name),
            })
    }

    /// 启动传输任务
    pub async fn start_transfer(&self, request: TransferRequest) -> Result<String, TransferError> {
        // 验证源文件
        for source in &request.source_files {
            let path = Path::new(source);
            if !path.exists() {
                return Err(TransferError::SourceNotFound {
                    path: source.clone(),
                });
            }
        }

        // 获取本地文件传输协议
        let protocol = self.get_protocol("local").await?;

        // 创建传输目标
        let target = TransferTarget {
            id: request.target_path.clone(),
            name: request.target_path.clone(),
            device_type: super::types::DeviceType::LocalDrive,
            path: Some(request.target_path.clone()),
            available_space: None,
            connection_status: super::types::ConnectionStatus::Connected,
        };

        // 验证目标
        protocol.validate_target(&target).await?;

        // 计算总大小
        let mut total_size: u64 = 0;
        for source in &request.source_files {
            let path = Path::new(source);
            if path.is_file() {
                total_size += std::fs::metadata(path)
                    .map_err(|e| TransferError::from_io_error(e, Some(source)))?
                    .len();
            } else if path.is_dir() {
                let (size, _) = super::calculate_directory_size(path).await?;
                total_size += size;
            }
        }

        // 检查空间
        protocol.check_space(&target, total_size).await?;

        // 创建传输任务
        let task_id = Uuid::new_v4().to_string();
        let task = TransferTask::new(
            task_id.clone(),
            request.operation,
            request.source_files,
            target,
            total_size,
        );

        // 添加到队列
        let mut queue = self.task_queue.write().await;
        queue.push_back(task);

        // 尝试处理队列
        drop(queue); // 释放锁
        self.process_queue().await?;

        Ok(task_id)
    }

    /// 处理任务队列
    async fn process_queue(&self) -> Result<(), TransferError> {
        loop {
            // 检查是否可以启动新任务
            let active_count = self.active_tasks.read().await.len();
            if active_count >= self.max_concurrent {
                break;
            }

            // 从队列中取出任务
            let task = {
                let mut queue = self.task_queue.write().await;
                queue.pop_front()
            };

            let mut task = match task {
                Some(t) => t,
                None => break,
            };

            // 启动任务
            let task_id = task.id.clone();
            task.status = TaskStatus::Running;

            // 添加到活跃任务
            {
                let mut active = self.active_tasks.write().await;
                active.insert(task_id.clone(), task.clone());
            }

            // 在后台执行传输
            let manager = self.clone_arc();
            spawn_transfer_task(manager, task, task_id);
        }

        Ok(())
    }

    /// 更新任务进度
    async fn update_task_progress(&self, task_id: &str, progress: TransferProgress) {
        if let Some(task) = self.active_tasks.write().await.get_mut(task_id) {
            task.progress = progress;
        }
    }

    /// 暂停传输任务
    pub async fn pause_transfer(&self, task_id: &str) -> Result<(), TransferError> {
        // 更新任务状态
        if let Some(task) = self.active_tasks.write().await.get_mut(task_id) {
            task.status = TaskStatus::Paused;
        } else {
            return Err(TransferError::TaskNotFound {
                task_id: task_id.to_string(),
            });
        }

        // 通知协议暂停
        let protocol = self.get_protocol("local").await?;
        protocol.pause_transfer(task_id).await?;

        Ok(())
    }

    /// 恢复传输任务
    pub async fn resume_transfer(&self, task_id: &str) -> Result<(), TransferError> {
        // 更新任务状态
        if let Some(task) = self.active_tasks.write().await.get_mut(task_id) {
            task.status = TaskStatus::Running;
        } else {
            return Err(TransferError::TaskNotFound {
                task_id: task_id.to_string(),
            });
        }

        // 通知协议恢复
        let protocol = self.get_protocol("local").await?;
        protocol.resume_transfer(task_id).await?;

        Ok(())
    }

    /// 取消传输任务
    pub async fn cancel_transfer(&self, task_id: &str) -> Result<(), TransferError> {
        // 从活跃任务中移除
        let mut task = match self.active_tasks.write().await.remove(task_id) {
            Some(t) => t,
            None => {
                // 尝试从队列中移除
                let mut queue = self.task_queue.write().await;
                let index = queue.iter().position(|t| t.id == task_id);
                if let Some(idx) = index {
                    queue.remove(idx);
                    return Ok(());
                }
                return Err(TransferError::TaskNotFound {
                    task_id: task_id.to_string(),
                });
            }
        };

        // 通知协议取消
        let protocol = self.get_protocol("local").await?;
        protocol.cancel_transfer(task_id).await?;

        // 更新任务状态
        task.status = TaskStatus::Cancelled;

        // 添加到已完成任务
        self.completed_tasks.write().await.push(task);

        // 移除进度发送器
        self.progress_senders.write().await.remove(task_id);

        // 继续处理队列
        let _ = self.process_queue().await;

        Ok(())
    }

    /// 获取任务进度
    pub async fn get_progress(&self, task_id: &str) -> Option<TransferProgress> {
        self.active_tasks
            .read()
            .await
            .get(task_id)
            .map(|t| t.progress.clone())
    }

    /// 获取任务状态
    pub async fn get_task_status(&self, task_id: &str) -> Option<TaskStatus> {
        // 先检查活跃任务
        if let Some(task) = self.active_tasks.read().await.get(task_id) {
            return Some(task.status.clone());
        }

        // 再检查已完成任务
        if let Some(task) = self
            .completed_tasks
            .read()
            .await
            .iter()
            .find(|t| t.id == task_id)
        {
            return Some(task.status.clone());
        }

        // 最后检查队列
        if let Some(task) = self
            .task_queue
            .read()
            .await
            .iter()
            .find(|t| t.id == task_id)
        {
            return Some(task.status.clone());
        }

        None
    }

    /// 获取所有活跃任务
    pub async fn get_active_tasks(&self) -> Vec<TransferTask> {
        self.active_tasks.read().await.values().cloned().collect()
    }

    /// 获取队列中的任务
    pub async fn get_queued_tasks(&self) -> Vec<TransferTask> {
        self.task_queue.read().await.iter().cloned().collect()
    }

    /// 获取已完成的任务
    pub async fn get_completed_tasks(&self) -> Vec<TransferTask> {
        self.completed_tasks.read().await.clone()
    }

    /// 清空已完成的任务
    pub async fn clear_completed_tasks(&self) {
        self.completed_tasks.write().await.clear();
    }

    /// 获取当前活跃任务数
    pub async fn get_active_count(&self) -> usize {
        self.active_tasks.read().await.len()
    }

    /// 获取队列中的任务数
    pub async fn get_queued_count(&self) -> usize {
        self.task_queue.read().await.len()
    }

    /// 克隆为Arc（用于在异步任务中使用）
    fn clone_arc(&self) -> Arc<Self> {
        Arc::new(Self {
            active_tasks: self.active_tasks.clone(),
            task_queue: self.task_queue.clone(),
            completed_tasks: self.completed_tasks.clone(),
            protocols: self.protocols.clone(),
            max_concurrent: self.max_concurrent,
            progress_senders: self.progress_senders.clone(),
        })
    }
}

impl Clone for TransferManager {
    fn clone(&self) -> Self {
        Self {
            active_tasks: self.active_tasks.clone(),
            task_queue: self.task_queue.clone(),
            completed_tasks: self.completed_tasks.clone(),
            protocols: self.protocols.clone(),
            max_concurrent: self.max_concurrent,
            progress_senders: self.progress_senders.clone(),
        }
    }
}

/// 生成传输任务的独立函数
fn spawn_transfer_task(manager: Arc<TransferManager>, task: TransferTask, task_id: String) {
    tokio::spawn(async move {
        let result = execute_transfer_task(manager.clone(), task).await;
        handle_transfer_result(manager, task_id, result).await;
    });
}

/// 处理传输结果的独立函数
async fn handle_transfer_result(
    manager: Arc<TransferManager>,
    task_id: String,
    result: Result<(), TransferError>,
) {
    // 先更新任务状态（在移除之前）
    {
        let mut active_tasks = manager.active_tasks.write().await;
        if let Some(task) = active_tasks.get_mut(&task_id) {
            match &result {
                Ok(_) => {
                    task.status = TaskStatus::Completed;
                    task.progress.status = TaskStatus::Completed;
                }
                Err(e) => {
                    task.status = TaskStatus::Failed;
                    task.progress.status = TaskStatus::Failed;
                    task.error_message = Some(e.user_friendly_message());
                }
            }
        }
    }
    
    // 等待一小段时间让前端有机会获取最终状态
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    
    // 从活跃任务中移除
    let task = match manager.active_tasks.write().await.remove(&task_id) {
        Some(t) => t,
        None => return,
    };

    // 添加到已完成任务
    manager.completed_tasks.write().await.push(task);

    // 移除进度发送器
    manager.progress_senders.write().await.remove(&task_id);

    // 继续处理队列
    let _ = manager.process_queue().await;
}

/// 执行传输任务的独立函数（用于tokio::spawn）
async fn execute_transfer_task(
    manager: Arc<TransferManager>,
    task: TransferTask,
) -> Result<(), TransferError> {
    use super::local::LocalFileProtocol;
    use super::types::TransferOperation;

    // 克隆所需的数据
    let task_id = task.id.clone();
    let source_files = task.source_files.clone();
    let target = task.target.clone();
    let operation = task.operation.clone();

    let protocol = {
        let protocols = manager.protocols.read().await;
        protocols
            .get("local")
            .cloned()
            .ok_or_else(|| TransferError::Unknown {
                message: "传输协议未找到: local".to_string(),
            })?
    };

    // 创建进度发送器
    let (tx, mut rx) = mpsc::channel(100);

    // 保存进度发送器
    {
        let mut senders = manager.progress_senders.write().await;
        senders.insert(task_id.clone(), tx.clone());
    }

    // 在后台转发进度更新
    let manager_clone = manager.clone();
    let task_id_clone = task_id.clone();
    tokio::spawn(async move {
        while let Some(mut progress) = rx.recv().await {
            // 使用正确的任务 ID
            progress.task_id = task_id_clone.clone();
            manager_clone
                .update_task_progress(&task_id_clone, progress)
                .await;
        }
    });

    // 执行传输
    let transfer_result: Result<(), TransferError> = async {
        for (index, source) in source_files.iter().enumerate() {
            let source_path = Path::new(source);
            let filename = source_path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| format!("file_{}", index));

            if source_path.is_file() {
                protocol
                    .transfer_file(source_path, &target, &filename, &task_id, Some(tx.clone()))
                    .await?;
            } else if source_path.is_dir() {
                protocol
                    .transfer_directory(source_path, &target, &filename, &task_id, Some(tx.clone()))
                    .await?;
            }
        }
        Ok(())
    }
    .await;

    // 清理协议层的任务状态（无论成功还是失败）
    if let Some(local_protocol) = protocol.as_any().downcast_ref::<LocalFileProtocol>() {
        local_protocol.unregister_task(&task_id).await;
    }

    // 检查传输结果
    transfer_result?;

    // 如果是剪切操作，删除源文件
    if operation == TransferOperation::Cut {
        for source in &source_files {
            let source_path = Path::new(source);
            if source_path.is_file() {
                std::fs::remove_file(source_path)
                    .map_err(|e| TransferError::from_io_error(e, Some(source)))?;
            } else if source_path.is_dir() {
                std::fs::remove_dir_all(source_path)
                    .map_err(|e| TransferError::from_io_error(e, Some(source)))?;
            }
        }
    }

    Ok(())
}
