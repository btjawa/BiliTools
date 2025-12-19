/**
 * 传输状态管理 Store
 *
 * 使用 Pinia 管理文件传输功能的状态
 * 包括传输任务、进度、历史记录等
 */

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import * as transferService from '@/services/transfer';
import { PROGRESS } from '@/constants';
import * as backend from '@/services/backend';
import { Channel } from '@tauri-apps/api/core';
import { useCacheStore } from '@/store/cache';
import { handleStoreError, UnifiedErrorHandler } from '@/utils/error-handler';
import type * as Types from '@/types/transfer.d';
import type * as CacheTypes from '@/types/cache.d';
import { migrateTransferProgress } from '@/types/transfer.d';


/**
 * 传输 Store
 */
export const useTransferStore = defineStore('transfer', () => {
  // ============================================================================
  // 状态定义
  // ============================================================================

  // 传输任务相关状态
  const activeTasks = ref<Map<string, Types.TransferTask>>(new Map());
  const completedTasks = ref<Map<string, Types.TransferTask>>(new Map());
  const taskQueue = ref<string[]>([]);
  const maxConcurrentTasks = ref(3);

  // 传输进度相关状态
  const progressMap = ref<Map<string, Types.TransferProgress>>(new Map());

  // 传输目标相关状态
  const selectedTarget = ref<Types.TransferTarget | null>(null);



  // UI状态
  const isLoading = ref(false);
  const lastError = ref<string | null>(null);

  // 缓存根目录相关状态
  const currentCacheRoot = ref<string>('');
  const cacheRootLoaded = ref(false);

  // ============================================================================
  // 计算属性
  // ============================================================================

  /**
   * 活跃任务数量
   */
  const activeTaskCount = computed(() => activeTasks.value.size);

  /**
   * 是否有活跃任务
   */
  const hasActiveTasks = computed(() => activeTasks.value.size > 0);

  /**
   * 是否可以开始新任务
   */
  const canStartNewTask = computed(() => activeTasks.value.size < maxConcurrentTasks.value);

  /**
   * 队列中的任务数量
   */
  const queuedTaskCount = computed(() => taskQueue.value.length);

  /**
   * 所有任务（活跃 + 已完成）
   */
  const allTasks = computed(() => {
    const tasks: Types.TransferTask[] = [];
    activeTasks.value.forEach((task) => {
      tasks.push(task);
    });
    completedTasks.value.forEach((task) => {
      tasks.push(task);
    });
    return tasks;
  });

  /**
   * 获取指定任务的进度
   */
  function getTaskProgress(taskId: string): Types.TransferProgress | null {
    return progressMap.value.get(taskId) ?? null;
  }

  /**
   * 获取指定任务
   */
  function getTask(taskId: string): Types.TransferTask | null {
    return activeTasks.value.get(taskId) ?? null;
  }

  /**
   * 总传输大小（所有活跃任务）
   */
  const totalTransferSize = computed(() => {
    let total = 0;
    progressMap.value.forEach((progress) => {
      total += progress.totalSize;
    });
    return total;
  });

  /**
   * 已传输大小（所有活跃任务）
   */
  const totalTransferredSize = computed(() => {
    let total = 0;
    progressMap.value.forEach((progress) => {
      total += progress.transferredSize;
    });
    return total;
  });

  /**
   * 总体传输进度百分比
   */
  const overallProgressPercentage = computed(() => {
    if (totalTransferSize.value === 0) return 0;
    return Math.round((totalTransferredSize.value / totalTransferSize.value) * PROGRESS.MAX_PERCENTAGE);
  });

  /**
   * 平均传输速度（所有活跃任务）
   */
  const averageTransferSpeed = computed(() => {
    if (progressMap.value.size === 0) return 0;
    let totalSpeed = 0;
    let activeTaskCount = 0;
    
    progressMap.value.forEach((progress) => {
      // 只计算正在运行的任务的速度
      if (progress.status === 'running' && progress.speed > 0) {
        totalSpeed += progress.speed;
        activeTaskCount++;
      }
    });
    
    return activeTaskCount > 0 ? totalSpeed / activeTaskCount : 0;
  });

  /**
   * 总体剩余时间（基于总体进度计算）
   */
  const overallRemainingTime = computed(() => {
    const remainingSize = totalTransferSize.value - totalTransferredSize.value;
    const currentSpeed = averageTransferSpeed.value;
    
    if (remainingSize <= 0 || currentSpeed <= 0) return 0;
    
    return remainingSize / currentSpeed;
  });

  /**
   * 总体文件进度
   */
  const overallFileProgress = computed(() => {
    let totalFiles = 0;
    let completedFiles = 0;
    
    progressMap.value.forEach((progress) => {
      totalFiles += progress.totalFiles;
      completedFiles += progress.completedFiles;
    });
    
    return {
      completed: completedFiles,
      total: totalFiles,
      percentage: totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0,
    };
  });

  /**
   * 活跃任务的状态统计
   */
  const taskStatusStats = computed(() => {
    const stats = {
      running: 0,
      paused: 0,
      pending: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };
    
    activeTasks.value.forEach((task) => {
      if (task.status in stats) {
        stats[task.status as keyof typeof stats]++;
      }
    });
    
    completedTasks.value.forEach((task) => {
      if (task.status in stats) {
        stats[task.status as keyof typeof stats]++;
      }
    });
    
    return stats;
  });

  // ============================================================================
  // Actions - 传输目标管理
  // ============================================================================



  /**
   * 选择传输目标
   */
  async function selectTarget(target: Types.TransferTarget): Promise<boolean> {
    const result = await UnifiedErrorHandler.withErrorBoundary(
      async () => {
        lastError.value = null;

        const isValid = await transferService.validateTransferTarget(target);
        if (!isValid) {
          lastError.value = '选择的目标位置无效';
          return false;
        }

        selectedTarget.value = target;
        return true;
      },
      {
        operation: '验证传输目标',
        onError: (msg) => { lastError.value = msg; },
        logLevel: 'error',
      }
    );

    return result ?? false;
  }

  /**
   * 清除选择的目标
   */
  function clearSelectedTarget(): void {
    selectedTarget.value = null;
  }

  /**
   * 打开文件夹选择对话框
   */
  async function selectFolder(): Promise<string | null> {
    return await UnifiedErrorHandler.withErrorBoundary(
      async () => {
        lastError.value = null;
        return await transferService.selectFolder();
      },
      {
        operation: '选择文件夹',
        onError: (msg) => { lastError.value = msg; },
        logLevel: 'error',
      }
    );
  }

  // ============================================================================
  // Actions - 传输任务管理
  // ============================================================================

  /**
   * 开始文件传输
   */
  async function startTransfer(request: Types.TransferRequest): Promise<string | null> {
    return await UnifiedErrorHandler.withErrorBoundary(
      async () => {
        lastError.value = null;
        
        // 清理已完成的任务
        completedTasks.value.clear();

        if (!selectedTarget.value) {
          lastError.value = '请先选择传输目标';
          return null;
        }

        // 检查可用空间
        const hasSpace = await transferService.checkAvailableSpace(
          selectedTarget.value.path || '',
          request.source_files.length * 1024 * 1024, // 估算大小
        );

        if (!hasSpace) {
          lastError.value = '目标位置空间不足';
          return null;
        }

        const taskId = await transferService.startTransfer(request);

        // 创建任务对象
        const task: Types.TransferTask = {
          id: taskId,
          operation: request.operation,
          source_files: request.source_files,
          target_path: request.target_path,
          status: 'pending',
          progress: migrateTransferProgress({
            taskId,
            totalFiles: request.source_files.length,
            completedFiles: 0,
            totalSize: 0,
            transferredSize: 0,
            speed: 0,
            remainingTime: 0,
            currentVideoName: '',
            currentFile: '',
            status: 'pending',
          }),
          created_at: Date.now(),
          updated_at: Date.now(),
        };

        // 添加到活跃任务或队列
        if (canStartNewTask.value) {
          activeTasks.value.set(taskId, task);
          
          // 开始监听进度
          startProgressListener(taskId);
        } else {
          taskQueue.value.push(taskId);
        }

        return taskId;
      },
      {
        operation: '开始传输',
        onError: (msg) => { lastError.value = msg; },
        logLevel: 'error',
      }
    );
  }

  /**
   * 开始缓存根目录迁移
   */
  async function startRootMigration(request: Types.RootMigrationRequest): Promise<string | null> {
    return await UnifiedErrorHandler.withErrorBoundary(
      async () => {
        lastError.value = null;

        if (!selectedTarget.value) {
          lastError.value = 'Please select a migration target first';
          return null;
        }

        const taskId = await transferService.startRootMigration(request);

        // 创建任务对象
        const task: Types.TransferTask = {
          id: taskId,
          operation: 'Copy',
          source_files: [],
          target_path: request.targetRoot,
          status: 'pending',
          progress: migrateTransferProgress({
            taskId,
            totalFiles: 0,
            completedFiles: 0,
            totalSize: 0,
            transferredSize: 0,
            speed: 0,
            remainingTime: 0,
            currentVideoName: '',
            currentFile: '正在扫描文件...',
            status: 'pending',
          }),
          created_at: Date.now(),
          updated_at: Date.now(),
        };

        // 添加到活跃任务或队列
        if (canStartNewTask.value) {
          activeTasks.value.set(taskId, task);
          
          // 开始监听进度
          startProgressListener(taskId);
        } else {
          taskQueue.value.push(taskId);
        }

        return taskId;
      },
      {
        operation: '开始缓存根目录迁移',
        onError: (msg) => { lastError.value = msg; },
        logLevel: 'error',
      }
    );
  }

  /**
   * 暂停传输任务
   */
  async function pauseTransfer(taskId: string): Promise<void> {
    try {
      lastError.value = null;

      // 检查任务是否仍然存在
      const task = activeTasks.value.get(taskId);
      if (!task) {
        // 任务可能已经完成，不需要暂停
        return;
      }

      // 检查任务状态
      if (task.status !== 'running') {
        // 任务不在运行状态，不需要暂停
        return;
      }

      await transferService.pauseTransfer(taskId);

      task.status = 'paused';
      task.updated_at = Date.now();

      const progress = progressMap.value.get(taskId);
      if (progress) {
        progress.status = 'paused';
      }
    } catch (error) {
      // 如果是任务不存在错误，静默处理
      if (error instanceof Error && error.message.includes('传输任务不存在')) {
        return;
      }
      
      handleStoreError(error, '暂停传输', (msg) => { lastError.value = msg; });
      throw error;
    }
  }

  /**
   * 取消传输任务
   */
  async function cancelTransfer(taskId: string): Promise<void> {
    try {
      lastError.value = null;

      // 检查任务是否仍然存在
      const task = activeTasks.value.get(taskId);
      if (!task) {
        // 任务可能已经完成，从队列中移除（如果存在）
        const queueIndex = taskQueue.value.indexOf(taskId);
        if (queueIndex !== -1) {
          taskQueue.value.splice(queueIndex, 1);
        }
        return;
      }

      await transferService.cancelTransfer(taskId);

      activeTasks.value.delete(taskId);
      progressMap.value.delete(taskId);

      // 从队列中移除
      const queueIndex = taskQueue.value.indexOf(taskId);
      if (queueIndex !== -1) {
        taskQueue.value.splice(queueIndex, 1);
      }

      // 尝试启动队列中的下一个任务
      if (canStartNewTask.value && taskQueue.value.length > 0) {
        const nextTaskId = taskQueue.value.shift();
        if (nextTaskId) {
          const nextTask = activeTasks.value.get(nextTaskId);
          if (nextTask) {
            nextTask.status = 'running';
            nextTask.updated_at = Date.now();
          }
        }
      }
    } catch (error) {
      // 如果是任务不存在错误，静默处理
      if (error instanceof Error && error.message.includes('传输任务不存在')) {
        // 清理本地状态
        activeTasks.value.delete(taskId);
        progressMap.value.delete(taskId);
        const queueIndex = taskQueue.value.indexOf(taskId);
        if (queueIndex !== -1) {
          taskQueue.value.splice(queueIndex, 1);
        }
        return;
      }
      
      handleStoreError(error, '取消传输', (msg) => { lastError.value = msg; });
      throw error;
    }
  }

  /**
   * 恢复传输任务
   */
  async function resumeTransfer(taskId: string): Promise<void> {
    try {
      lastError.value = null;

      // 检查任务是否仍然存在
      const task = activeTasks.value.get(taskId);
      if (!task) {
        // 任务可能已经完成，不需要恢复
        return;
      }

      // 检查任务状态
      if (task.status !== 'paused') {
        // 任务不在暂停状态，不需要恢复
        return;
      }

      await transferService.resumeTransfer(taskId);

      task.status = 'running';
      task.updated_at = Date.now();

      const progress = progressMap.value.get(taskId);
      if (progress) {
        progress.status = 'running';
      }
    } catch (error) {
      // 如果是任务不存在错误，静默处理
      if (error instanceof Error && error.message.includes('传输任务不存在')) {
        return;
      }
      
      handleStoreError(error, '恢复传输', (msg) => { lastError.value = msg; });
      throw error;
    }
  }

  /**
   * 更新传输进度
   * 优化多文件传输时的状态同步
   */
  function updateTransferProgress(progress: Types.TransferProgress): void {
    // 验证进度数据的有效性
    if (!progress.taskId) {
      console.warn('收到无效的进度更新：缺少 taskId');
      return;
    }

    // 更新进度映射
    const previousProgress = progressMap.value.get(progress.taskId);
    progressMap.value.set(progress.taskId, progress);

    // 先检查活跃任务
    let task = activeTasks.value.get(progress.taskId);
    let isActiveTask = true;
    
    // 如果不在活跃任务中，检查已完成任务
    if (!task) {
      task = completedTasks.value.get(progress.taskId);
      isActiveTask = false;
    }

    if (task) {
      // 确保进度数据的一致性
      const updatedProgress = validateProgressData(progress, previousProgress);
      task.progress = updatedProgress;
      task.status = updatedProgress.status;
      task.updated_at = Date.now();

      // 如果是活跃任务且已完成，需要移动到已完成任务
      if (isActiveTask && (updatedProgress.status === 'completed' || updatedProgress.status === 'failed' || updatedProgress.status === 'cancelled')) {
        // 如果是剪切操作且成功完成，更新缓存列表
        if (updatedProgress.status === 'completed' && task.operation === 'Cut') {
          handleCutOperationCompleted(task);
        }
        
        // 移动到已完成任务
        completedTasks.value.set(progress.taskId, task);
        activeTasks.value.delete(progress.taskId);

        // 尝试启动队列中的下一个任务
        if (canStartNewTask.value && taskQueue.value.length > 0) {
          const nextTaskId = taskQueue.value.shift();
          if (nextTaskId) {
            const nextTask = activeTasks.value.get(nextTaskId);
            if (nextTask) {
              nextTask.status = 'running';
              nextTask.updated_at = Date.now();
              
              // 开始监听新任务的进度
              startProgressListener(nextTaskId);
            }
          }
        }
      } else if (!isActiveTask) {
        // 如果是已完成任务，直接更新已完成任务集合
        completedTasks.value.set(progress.taskId, task);
      }
    } else {
      // 如果找不到对应的任务，可能是状态不同步，记录警告
      console.warn(`收到未知任务的进度更新: ${progress.taskId}`);
    }
  }

  /**
   * 验证和修正进度数据
   * 确保进度数据的逻辑一致性
   */
  function validateProgressData(
    current: Types.TransferProgress, 
    previous?: Types.TransferProgress
  ): Types.TransferProgress {
    const validated = { ...current };

    // 边界情况处理：空文件列表的错误处理
    if (validated.totalFiles === 0) {
      console.warn('检测到空文件列表，设置默认值');
      validated.totalFiles = 1;
      validated.completedFiles = 0;
    }

    // 边界情况处理：单文件传输的兼容性处理
    if (validated.totalFiles === 1 && validated.completedFiles > 1) {
      console.warn('单文件传输中检测到异常的完成文件数，修正为1');
      validated.completedFiles = 1;
    }

    // 确保文件计数不会倒退
    if (previous && current.completedFiles < previous.completedFiles) {
      console.warn(`文件计数倒退: ${previous.completedFiles} -> ${current.completedFiles}`);
      validated.completedFiles = previous.completedFiles;
    }

    // 确保已传输大小不会倒退（除非是重新开始）
    if (previous && current.transferredSize < previous.transferredSize && current.status !== 'pending') {
      console.warn(`传输大小倒退: ${previous.transferredSize} -> ${current.transferredSize}`);
      validated.transferredSize = previous.transferredSize;
    }

    // 进度计算溢出保护：确保已完成文件数不超过总文件数
    if (validated.completedFiles > validated.totalFiles) {
      console.warn(`已完成文件数超过总数: ${validated.completedFiles} > ${validated.totalFiles}`);
      validated.completedFiles = validated.totalFiles;
    }

    // 进度计算溢出保护：确保已传输大小不超过总大小
    if (validated.transferredSize > validated.totalSize) {
      console.warn(`已传输大小超过总大小: ${validated.transferredSize} > ${validated.totalSize}`);
      validated.transferredSize = validated.totalSize;
    }

    // 确保百分比在合理范围内
    if (validated.totalSize > 0) {
      const calculatedPercentage = (validated.transferredSize / validated.totalSize) * 100;
      if (Math.abs(validated.percentage - calculatedPercentage) > 1) {
        validated.percentage = Math.min(100, Math.max(0, calculatedPercentage));
      }
    } else {
      // 处理总大小为0的边界情况
      validated.percentage = validated.completedFiles >= validated.totalFiles ? 100 : 0;
    }

    // 确保速度和剩余时间的合理性
    if (validated.speed < 0 || !isFinite(validated.speed)) {
      validated.speed = 0;
    }
    
    if (validated.remainingTime < 0 || !isFinite(validated.remainingTime)) {
      validated.remainingTime = 0;
    }

    // 处理当前文件信息缺失的情况
    if (!validated.currentVideoName || validated.currentVideoName.trim() === '') {
      validated.currentVideoName = '未知视频';
    }
    
    if (!validated.currentFile || validated.currentFile.trim() === '') {
      validated.currentFile = '未知路径';
    }

    return validated;
  }



  // ============================================================================
  // Actions - 缓存根目录管理
  // ============================================================================

  /**
   * 加载当前缓存根目录
   */
  async function loadCurrentCacheRoot(): Promise<void> {
    if (cacheRootLoaded.value) return;

    await UnifiedErrorHandler.withErrorBoundary(
      async () => {
        lastError.value = null;

        const root = await transferService.getCurrentCacheRoot();
        currentCacheRoot.value = root;
        cacheRootLoaded.value = true;
        return root;
      },
      {
        operation: '加载缓存根目录',
        onError: (msg) => { lastError.value = msg; },
        logLevel: 'error',
      }
    );
  }

  /**
   * 刷新缓存根目录
   */
  async function refreshCacheRoot(): Promise<void> {
    await UnifiedErrorHandler.withErrorBoundary(
      async () => {
        lastError.value = null;

        const root = await transferService.getCurrentCacheRoot();
        currentCacheRoot.value = root;
        return root;
      },
      {
        operation: '刷新缓存根目录',
        onError: (msg) => { lastError.value = msg; },
        logLevel: 'error',
      }
    );
  }

  /**
   * 设置缓存根目录
   */
  async function setCacheRoot(path: string): Promise<void> {
    const result = await UnifiedErrorHandler.withErrorBoundary(
      async () => {
        lastError.value = null;

        await transferService.setCacheRoot(path);
        currentCacheRoot.value = path;
        cacheRootLoaded.value = true;
        return true;
      },
      {
        operation: '设置缓存根目录',
        onError: (msg) => { lastError.value = msg; },
        logLevel: 'error',
      }
    );

    if (!result) {
      throw new Error('设置缓存根目录失败');
    }
  }

  // ============================================================================
  // Actions - 其他
  // ============================================================================

  /**
   * 清除错误信息
   */
  function clearError(): void {
    lastError.value = null;
  }

  /**
   * 处理剪切操作完成
   */
  function handleCutOperationCompleted(task: Types.TransferTask): void {
    try {
      const cacheStore = useCacheStore();
      
      // 从缓存列表中移除已剪切的项目
      // source_files 包含的是缓存路径，我们需要根据路径找到对应的缓存项ID
      for (const sourcePath of task.source_files) {
        // 从缓存项中找到匹配的项目并移除
        const itemToRemove = cacheStore.cacheItems.find((item: CacheTypes.CacheItem) => item.cachePath === sourcePath);
        
        if (itemToRemove) {
          // 从选中项目中移除
          const selectedIndex = cacheStore.selectedItems.indexOf(itemToRemove.id);
          if (selectedIndex !== -1) {
            cacheStore.selectedItems.splice(selectedIndex, 1);
          }
          
          // 从缓存项列表中移除
          const itemIndex = cacheStore.cacheItems.indexOf(itemToRemove);
          if (itemIndex !== -1) {
            cacheStore.cacheItems.splice(itemIndex, 1);
          }
          
          // 从显示项列表中移除
          cacheStore.displayItems = cacheStore.displayItems.filter((displayItem: CacheTypes.DisplayItem) => {
            if (displayItem.type === 'video') {
              return displayItem.data.id !== itemToRemove.id;
            }
            return true;
          });
        }
      }

      // 重新加载缓存列表以确保数据一致性
      cacheStore.loadDisplayItems();
    } catch (error) {
      console.error('处理剪切操作完成失败:', error);
    }
  }

  /**
   * 开始监听传输进度
   */
  async function startProgressListener(taskId: string): Promise<void> {
    try {
      const channel = new Channel<backend.TransferProgress>();
      
      // 监听进度更新
      channel.onmessage = (backendProgress) => {
        // 后端已经通过serde重命名为camelCase，直接使用
        const progress: Types.TransferProgress = migrateTransferProgress({
          taskId: backendProgress.taskId,
          totalFiles: backendProgress.totalFiles,
          completedFiles: backendProgress.completedFiles,
          totalSize: backendProgress.totalSize,
          transferredSize: backendProgress.transferredSize,
          speed: backendProgress.speed,
          remainingTime: backendProgress.remainingTime,
          currentVideoName: backendProgress.currentVideoName || '',
          currentFile: backendProgress.currentFile,
          status: backendProgress.status.toLowerCase() as Types.TransferTaskStatus,
        });
        
        // 立即更新进度，包括完成状态
        updateTransferProgress(progress);
      };
      
      // 开始监听
      await backend.commands.listenTransferProgress(taskId, channel);
    } catch (error) {
      console.error('开始监听传输进度失败:', error);
    }
  }

  /**
   * 刷新任务进度（从后端获取最新状态）
   */
  async function refreshTaskProgress(taskId: string): Promise<Types.TransferProgress | null> {
    try {
      const backendProgress = await backend.commands.getTransferProgress(taskId);
      if (backendProgress.status === 'ok' && backendProgress.data) {
        // 后端已经通过serde重命名为camelCase，直接使用
        const progress: Types.TransferProgress = migrateTransferProgress({
          taskId: backendProgress.data.taskId,
          totalFiles: backendProgress.data.totalFiles,
          completedFiles: backendProgress.data.completedFiles,
          totalSize: backendProgress.data.totalSize,
          transferredSize: backendProgress.data.transferredSize,
          speed: backendProgress.data.speed,
          remainingTime: backendProgress.data.remainingTime,
          currentVideoName: backendProgress.data.currentVideoName || '',
          currentFile: backendProgress.data.currentFile,
          status: backendProgress.data.status.toLowerCase() as Types.TransferTaskStatus,
        });
        
        return progress;
      }
      return null;
    } catch (error) {
      console.error('刷新任务进度失败:', error);
      return null;
    }
  }

  /**
   * 清理已完成的任务
   */
  function clearCompletedTasks(): void {
    completedTasks.value.clear();
  }

  /**
   * 批量更新多个任务的进度
   * 用于处理多文件传输时的批量状态更新
   */
  function batchUpdateProgress(progressList: Types.TransferProgress[]): void {
    progressList.forEach((progress) => {
      updateTransferProgress(progress);
    });
  }

  /**
   * 获取任务的详细状态信息
   * 包含进度、状态和性能指标
   */
  function getTaskDetailedStatus(taskId: string): {
    task: Types.TransferTask | null;
    progress: Types.TransferProgress | null;
    isActive: boolean;
    isCompleted: boolean;
  } {
    const activeTask = activeTasks.value.get(taskId);
    const completedTask = completedTasks.value.get(taskId);
    const progress = progressMap.value.get(taskId);
    
    return {
      task: activeTask || completedTask || null,
      progress: progress || null,
      isActive: !!activeTask,
      isCompleted: !!completedTask,
    };
  }

  /**
   * 同步任务状态
   * 确保任务状态与后端保持一致
   */
  async function syncTaskStatus(taskId: string): Promise<void> {
    try {
      const latestProgress = await refreshTaskProgress(taskId);
      if (latestProgress) {
        updateTransferProgress(latestProgress);
      }
    } catch (error) {
      console.error(`同步任务状态失败 (${taskId}):`, error);
    }
  }

  /**
   * 同步所有活跃任务的状态
   */
  async function syncAllTaskStatus(): Promise<void> {
    const syncPromises = Array.from(activeTasks.value.keys()).map(taskId => 
      syncTaskStatus(taskId)
    );
    
    await Promise.allSettled(syncPromises);
  }

  /**
   * 重置状态
   */
  function reset(): void {
    activeTasks.value.clear();
    completedTasks.value.clear();
    taskQueue.value = [];
    progressMap.value.clear();
    selectedTarget.value = null;
    isLoading.value = false;
    lastError.value = null;
    currentCacheRoot.value = '';
    cacheRootLoaded.value = false;
  }

  return {
    // 状态
    activeTasks,
    taskQueue,
    maxConcurrentTasks,
    progressMap,
    selectedTarget,
    isLoading,
    lastError,
    currentCacheRoot,
    cacheRootLoaded,

    // 计算属性
    activeTaskCount,
    hasActiveTasks,
    canStartNewTask,
    queuedTaskCount,
    allTasks,
    totalTransferSize,
    totalTransferredSize,
    overallProgressPercentage,
    averageTransferSpeed,
    overallRemainingTime,
    overallFileProgress,
    taskStatusStats,

    // 方法
    getTaskProgress,
    getTask,
    getTaskDetailedStatus,
    selectTarget,
    clearSelectedTarget,
    selectFolder,
    startTransfer,
    startRootMigration,
    pauseTransfer,
    cancelTransfer,
    resumeTransfer,
    updateTransferProgress,
    batchUpdateProgress,
    refreshTaskProgress,
    syncTaskStatus,
    syncAllTaskStatus,
    loadCurrentCacheRoot,
    refreshCacheRoot,
    setCacheRoot,
    clearError,
    clearCompletedTasks,
    reset,
  };
});
