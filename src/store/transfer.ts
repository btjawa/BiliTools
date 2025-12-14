/**
 * 传输状态管理 Store
 *
 * 使用 Pinia 管理文件传输功能的状态
 * 包括传输任务、进度、历史记录等
 */

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import * as transferService from '@/services/transfer';
import type * as Types from '@/types/transfer.d';

/**
 * 传输 Store
 */
export const useTransferStore = defineStore('transfer', () => {
  // ============================================================================
  // 状态定义
  // ============================================================================

  // 传输任务相关状态
  const activeTasks = ref<Map<string, Types.TransferTask>>(new Map());
  const taskQueue = ref<string[]>([]);
  const maxConcurrentTasks = ref(3);

  // 传输进度相关状态
  const progressMap = ref<Map<string, Types.TransferProgress>>(new Map());

  // 传输目标相关状态
  const availableTargets = ref<Types.TransferTarget[]>([]);
  const selectedTarget = ref<Types.TransferTarget | null>(null);



  // UI状态
  const isLoading = ref(false);
  const isDiscoveringTargets = ref(false);
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
   * 所有任务（活跃 + 队列中）
   */
  const allTasks = computed(() => {
    const tasks: Types.TransferTask[] = [];
    activeTasks.value.forEach((task) => {
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
    return Math.round((totalTransferredSize.value / totalTransferSize.value) * 100);
  });

  /**
   * 平均传输速度（所有活跃任务）
   */
  const averageTransferSpeed = computed(() => {
    if (progressMap.value.size === 0) return 0;
    let totalSpeed = 0;
    progressMap.value.forEach((progress) => {
      totalSpeed += progress.speed;
    });
    return totalSpeed / progressMap.value.size;
  });

  // ============================================================================
  // Actions - 传输目标管理
  // ============================================================================

  /**
   * 发现可用的传输目标
   */
  async function discoverTargets(): Promise<void> {
    if (isDiscoveringTargets.value) return;

    try {
      isDiscoveringTargets.value = true;
      lastError.value = null;

      const targets = await transferService.discoverTransferTargets();
      availableTargets.value = targets;
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '发现传输目标失败';
      console.error('发现传输目标失败:', error);
    } finally {
      isDiscoveringTargets.value = false;
    }
  }

  /**
   * 选择传输目标
   */
  async function selectTarget(target: Types.TransferTarget): Promise<boolean> {
    try {
      lastError.value = null;

      const isValid = await transferService.validateTransferTarget(target);
      if (!isValid) {
        lastError.value = '选择的目标位置无效';
        return false;
      }

      selectedTarget.value = target;
      return true;
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '验证传输目标失败';
      console.error('验证传输目标失败:', error);
      return false;
    }
  }

  /**
   * 清除选择的目标
   */
  function clearSelectedTarget(): void {
    selectedTarget.value = null;
  }

  // ============================================================================
  // Actions - 传输任务管理
  // ============================================================================

  /**
   * 开始文件传输
   */
  async function startTransfer(request: Types.TransferRequest): Promise<string | null> {
    try {
      lastError.value = null;

      if (!selectedTarget.value) {
        lastError.value = '请先选择传输目标';
        return null;
      }

      // 检查可用空间
      const hasSpace = await transferService.checkAvailableSpace(
        selectedTarget.value.path || '',
        request.sourceFiles.length * 1024 * 1024, // 估算大小
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
        sourceFiles: request.sourceFiles,
        targetPath: request.targetPath,
        status: 'pending',
        progress: {
          taskId,
          totalFiles: request.sourceFiles.length,
          completedFiles: 0,
          totalSize: 0,
          transferredSize: 0,
          speed: 0,
          remainingTime: 0,
          currentFile: '',
          status: 'pending',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 添加到活跃任务或队列
      if (canStartNewTask.value) {
        activeTasks.value.set(taskId, task);
      } else {
        taskQueue.value.push(taskId);
      }

      return taskId;
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '开始传输失败';
      console.error('开始传输失败:', error);
      return null;
    }
  }

  /**
   * 开始缓存根目录迁移
   */
  async function startRootMigration(request: Types.RootMigrationRequest): Promise<string | null> {
    try {
      lastError.value = null;

      if (!selectedTarget.value) {
        lastError.value = '请先选择迁移目标';
        return null;
      }

      const taskId = await transferService.startRootMigration(request);

      // 创建任务对象
      const task: Types.TransferTask = {
        id: taskId,
        operation: 'copy',
        sourceFiles: [],
        targetPath: request.targetRoot,
        status: 'pending',
        progress: {
          taskId,
          totalFiles: 0,
          completedFiles: 0,
          totalSize: 0,
          transferredSize: 0,
          speed: 0,
          remainingTime: 0,
          currentFile: '正在扫描文件...',
          status: 'pending',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 添加到活跃任务或队列
      if (canStartNewTask.value) {
        activeTasks.value.set(taskId, task);
      } else {
        taskQueue.value.push(taskId);
      }

      return taskId;
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '开始缓存根目录迁移失败';
      console.error('开始缓存根目录迁移失败:', error);
      return null;
    }
  }

  /**
   * 暂停传输任务
   */
  async function pauseTransfer(taskId: string): Promise<void> {
    try {
      lastError.value = null;

      await transferService.pauseTransfer(taskId);

      const task = activeTasks.value.get(taskId);
      if (task) {
        task.status = 'paused';
        task.updatedAt = Date.now();
      }

      const progress = progressMap.value.get(taskId);
      if (progress) {
        progress.status = 'paused';
      }
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '暂停传输失败';
      console.error('暂停传输失败:', error);
    }
  }

  /**
   * 取消传输任务
   */
  async function cancelTransfer(taskId: string): Promise<void> {
    try {
      lastError.value = null;

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
          const task = activeTasks.value.get(nextTaskId);
          if (task) {
            task.status = 'running';
            task.updatedAt = Date.now();
          }
        }
      }
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '取消传输失败';
      console.error('取消传输失败:', error);
    }
  }

  /**
   * 恢复传输任务
   */
  async function resumeTransfer(taskId: string): Promise<void> {
    try {
      lastError.value = null;

      await transferService.resumeTransfer(taskId);

      const task = activeTasks.value.get(taskId);
      if (task) {
        task.status = 'running';
        task.updatedAt = Date.now();
      }

      const progress = progressMap.value.get(taskId);
      if (progress) {
        progress.status = 'running';
      }
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '恢复传输失败';
      console.error('恢复传输失败:', error);
    }
  }

  /**
   * 更新传输进度
   */
  function updateTransferProgress(progress: Types.TransferProgress): void {
    progressMap.value.set(progress.taskId, progress);

    const task = activeTasks.value.get(progress.taskId);
    if (task) {
      task.progress = progress;
      task.status = progress.status;
      task.updatedAt = Date.now();

      // 如果任务完成，从活跃任务中移除
      if (progress.status === 'completed' || progress.status === 'failed' || progress.status === 'cancelled') {
        activeTasks.value.delete(progress.taskId);

        // 尝试启动队列中的下一个任务
        if (canStartNewTask.value && taskQueue.value.length > 0) {
          const nextTaskId = taskQueue.value.shift();
          if (nextTaskId) {
            const nextTask = activeTasks.value.get(nextTaskId);
            if (nextTask) {
              nextTask.status = 'running';
              nextTask.updatedAt = Date.now();
            }
          }
        }
      }
    }
  }



  // ============================================================================
  // Actions - 缓存根目录管理
  // ============================================================================

  /**
   * 加载当前缓存根目录
   */
  async function loadCurrentCacheRoot(): Promise<void> {
    if (cacheRootLoaded.value) return;

    try {
      lastError.value = null;

      const root = await transferService.getCurrentCacheRoot();
      currentCacheRoot.value = root;
      cacheRootLoaded.value = true;
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '加载缓存根目录失败';
      console.error('加载缓存根目录失败:', error);
    }
  }

  /**
   * 刷新缓存根目录
   */
  async function refreshCacheRoot(): Promise<void> {
    try {
      lastError.value = null;

      const root = await transferService.getCurrentCacheRoot();
      currentCacheRoot.value = root;
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '刷新缓存根目录失败';
      console.error('刷新缓存根目录失败:', error);
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
   * 重置状态
   */
  function reset(): void {
    activeTasks.value.clear();
    taskQueue.value = [];
    progressMap.value.clear();
    availableTargets.value = [];
    selectedTarget.value = null;
    isLoading.value = false;
    isDiscoveringTargets.value = false;
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
    availableTargets,
    selectedTarget,
    isLoading,
    isDiscoveringTargets,
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

    // 方法
    getTaskProgress,
    getTask,
    discoverTargets,
    selectTarget,
    clearSelectedTarget,
    startTransfer,
    startRootMigration,
    pauseTransfer,
    cancelTransfer,
    resumeTransfer,
    updateTransferProgress,
    loadCurrentCacheRoot,
    refreshCacheRoot,
    clearError,
    reset,
  };
});
