<template>
  <Teleport to="body">
    <!-- 模态框遮罩 -->
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay">
        <!-- 对话框容器 -->
        <div class="modal-content">
          <!-- 对话框头部 -->
          <div class="modal-header">
            <h2 class="modal-title">
              <i class="fa-solid fa-file-video text-blue-500"></i>
              <span class="text-(--content-color)">{{ dialogTitle }}</span>
            </h2>
            <button v-if="canClose" class="close-btn" @click="handleClose">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>

          <!-- 对话框内容 -->
          <div class="modal-body">
            <!-- 单任务进度显示 -->
            <div v-if="tasks.length === 1" class="space-y-6">
              <SingleTaskProgress :task="tasks[0]" />
            </div>

            <!-- 多任务进度显示 -->
            <div v-else class="space-y-6">
              <!-- 总体进度 -->
              <OverallProgress
                :total-count="tasks.length"
                :completed-count="completedCount"
                :failed-count="failedCount"
                :overall-percentage="overallPercentage"
              />

              <!-- 任务列表 -->
              <TaskList :tasks="tasks" />
            </div>

            <!-- 错误信息 -->
            <div v-if="lastError" class="error-box">
              <i class="fa-solid fa-exclamation-circle"></i>
              <div class="text-sm text-(--content-color)">{{ lastError }}</div>
            </div>
          </div>

          <!-- 对话框底部 -->
          <div class="modal-footer">
            <div class="flex justify-end gap-3">
              <!-- 暂停/恢复按钮 -->
              <button
                v-if="canPause || canResume"
                class="px-4 py-2 rounded-lg border border-(--border-color) text-(--content-color) hover:bg-(--hover-color) transition-colors flex items-center gap-2"
                @click="handlePauseResume"
              >
                <i
                  :class="isPaused ? 'fa-solid fa-play' : 'fa-solid fa-pause'"
                ></i>
                {{ isPaused ? $t('transfer.resume') : $t('transfer.pause') }}
              </button>

              <!-- 取消按钮 -->
              <button
                v-if="canCancel"
                class="px-4 py-2 rounded-lg border border-red-400/50 text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                @click="handleCancel"
              >
                <i class="fa-solid fa-stop"></i>
                {{ $t('transfer.stop') }}
              </button>

              <!-- 关闭按钮 -->
              <button
                v-if="canClose"
                class="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-2"
                @click="handleClose"
              >
                <i class="fa-solid fa-check"></i>
                {{ $t('transfer.close') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { confirm } from '@tauri-apps/plugin-dialog';
import * as converterService from '@/services/converter';
import type { ConvertTaskView, ConvertProgress } from '@/services/backend';
import SingleTaskProgress from './ConvertProgressDialog/SingleTaskProgress.vue';
import OverallProgress from './ConvertProgressDialog/OverallProgress.vue';
import TaskList from './ConvertProgressDialog/TaskList.vue';

// ============================================================================
// Props 和 Emits
// ============================================================================

interface Props {
  visible: boolean;
  taskIds: string[];
}

interface Emits {
  (e: 'close'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// ============================================================================
// 依赖注入
// ============================================================================

const { t } = useI18n();

// ============================================================================
// 状态
// ============================================================================

const tasks = ref<ConvertTaskView[]>([]);
const isPaused = ref(false);
const lastError = ref<string | null>(null);
const updateInterval = ref<number | null>(null);
const unlistenProgress = ref<(() => void) | null>(null);

// ============================================================================
// 计算属性
// ============================================================================

/**
 * 对话框标题
 */
const dialogTitle = computed(() => {
  if (tasks.value.length === 0) {
    return t('convert.title');
  }

  const allCompleted = tasks.value.every(
    (task) => task.progress.stage === 'completed',
  );
  const anyFailed = tasks.value.some(
    (task) => task.progress.stage === 'failed',
  );
  const anyCancelled = tasks.value.some(
    (task) => task.progress.stage === 'cancelled',
  );

  if (anyFailed) {
    return t('convert.progress.failed');
  } else if (anyCancelled) {
    return t('convert.progress.cancelled');
  } else if (allCompleted) {
    return t('convert.progress.completed');
  } else {
    return t('convert.progress.title');
  }
});

/**
 * 已完成任务数
 */
const completedCount = computed(() => {
  return tasks.value.filter((task) => task.progress.stage === 'completed')
    .length;
});

/**
 * 失败任务数
 */
const failedCount = computed(() => {
  return tasks.value.filter((task) => task.progress.stage === 'failed').length;
});

/**
 * 总体进度百分比
 */
const overallPercentage = computed(() => {
  if (tasks.value.length === 0) return 0;
  const total = tasks.value.reduce(
    (sum, task) => sum + task.progress.percentage,
    0,
  );
  return Math.round(total / tasks.value.length);
});

/**
 * 是否有运行中的任务
 */
const hasRunningTasks = computed(() => {
  return tasks.value.some((task) => {
    const stage = task.progress.stage;
    return (
      stage === 'preparing' ||
      stage === 'processing' ||
      stage === 'merging' ||
      stage === 'exportDanmaku' ||
      stage === 'addingMeta' ||
      stage === 'finalizing'
    );
  });
});

/**
 * 是否可以暂停
 */
const canPause = computed(() => {
  return hasRunningTasks.value && !isPaused.value;
});

/**
 * 是否可以恢复
 */
const canResume = computed(() => {
  return (
    isPaused.value ||
    tasks.value.some((task) => task.progress.stage === 'paused')
  );
});

/**
 * 是否可以取消
 */
const canCancel = computed(() => {
  return tasks.value.some((task) => {
    const stage = task.progress.stage;
    return (
      stage !== 'completed' && stage !== 'failed' && stage !== 'cancelled'
    );
  });
});

/**
 * 是否可以关闭
 */
const canClose = computed(() => {
  return tasks.value.every((task) => {
    const stage = task.progress.stage;
    return stage === 'completed' || stage === 'failed' || stage === 'cancelled';
  });
});

// ============================================================================
// 监听器
// ============================================================================

watch(
  () => props.visible,
  async (visible) => {
    if (visible) {
      await loadTasks();
      startProgressListener();
      startPolling();
    } else {
      stopProgressListener();
      stopPolling();
    }
  },
);

watch(
  () => props.taskIds,
  async () => {
    if (props.visible) {
      await loadTasks();
    }
  },
);

// ============================================================================
// 生命周期
// ============================================================================

onMounted(() => {
  if (props.visible) {
    loadTasks();
    startProgressListener();
    startPolling();
  }
});

onUnmounted(() => {
  stopProgressListener();
  stopPolling();
});

// ============================================================================
// 方法
// ============================================================================

/**
 * 加载任务列表
 */
async function loadTasks() {
  try {
    const loadedTasks: ConvertTaskView[] = [];
    for (const taskId of props.taskIds) {
      const task = await converterService.getConvertTask(taskId);
      if (task) {
        loadedTasks.push(task);
      }
    }
    tasks.value = loadedTasks;
  } catch (error) {
    console.error('加载转换任务失败:', error);
    lastError.value =
      error instanceof Error ? error.message : '加载任务失败';
  }
}

/**
 * 启动进度监听
 */
function startProgressListener() {
  unlistenProgress.value = converterService.onConvertProgress(
    (taskId: string, progress: ConvertProgress) => {
      const task = tasks.value.find((t) => t.id === taskId);
      if (task) {
        task.progress = progress;
      }
    },
  );
}

/**
 * 停止进度监听
 */
function stopProgressListener() {
  if (unlistenProgress.value) {
    unlistenProgress.value();
    unlistenProgress.value = null;
  }
}

/**
 * 启动轮询
 */
function startPolling() {
  updateInterval.value = window.setInterval(async () => {
    // 只对运行中的任务进行轮询
    for (const task of tasks.value) {
      const stage = task.progress.stage;
      if (
        stage === 'preparing' ||
        stage === 'processing' ||
        stage === 'merging' ||
        stage === 'exportDanmaku' ||
        stage === 'addingMeta' ||
        stage === 'finalizing' ||
        stage === 'paused'
      ) {
        try {
          const updatedTask = await converterService.getConvertTask(task.id);
          if (updatedTask) {
            const index = tasks.value.findIndex((t) => t.id === task.id);
            if (index !== -1) {
              tasks.value[index] = updatedTask;
            }
          }
        } catch (error) {
          console.warn(`检查任务 ${task.id} 状态失败:`, error);
        }
      }
    }
  }, 2000);
}

/**
 * 停止轮询
 */
function stopPolling() {
  if (updateInterval.value) {
    clearInterval(updateInterval.value);
    updateInterval.value = null;
  }
}

/**
 * 处理暂停/恢复
 */
async function handlePauseResume() {
  try {
    if (isPaused.value || canResume.value) {
      // 恢复所有暂停的任务
      const pausedTasks = tasks.value.filter(
        (task) => task.progress.stage === 'paused',
      );
      for (const task of pausedTasks) {
        try {
          await converterService.resumeConvert(task.id);
        } catch (error) {
          console.error(`恢复任务 ${task.id} 失败:`, error);
        }
      }
      isPaused.value = false;
    } else {
      // 暂停所有运行中的任务
      const runningTasks = tasks.value.filter((task) => {
        const stage = task.progress.stage;
        return (
          stage === 'preparing' ||
          stage === 'processing' ||
          stage === 'merging' ||
          stage === 'exportDanmaku' ||
          stage === 'addingMeta' ||
          stage === 'finalizing'
        );
      });
      for (const task of runningTasks) {
        try {
          await converterService.pauseConvert(task.id);
        } catch (error) {
          console.error(`暂停任务 ${task.id} 失败:`, error);
        }
      }
      isPaused.value = true;
    }
    // 刷新任务状态
    await loadTasks();
  } catch (error) {
    console.error('暂停/恢复转换失败:', error);
    lastError.value =
      error instanceof Error ? error.message : '操作失败';
  }
}

/**
 * 处理取消
 */
async function handleCancel() {
  try {
    const shouldCancel = await confirm(t('transfer.confirmCancel'), {
      title: t('transfer.confirmTitle'),
      kind: 'warning',
    });

    if (!shouldCancel) {
      return;
    }

    // 取消所有活跃的任务
    const activeTasks = tasks.value.filter((task) => {
      const stage = task.progress.stage;
      return (
        stage !== 'completed' && stage !== 'failed' && stage !== 'cancelled'
      );
    });

    for (const task of activeTasks) {
      try {
        await converterService.cancelConvert(task.id);
      } catch (error) {
        console.error(`取消任务 ${task.id} 失败:`, error);
      }
    }
    // 刷新任务状态
    await loadTasks();
  } catch (error) {
    console.error('取消转换失败:', error);
    lastError.value =
      error instanceof Error ? error.message : '取消失败';
  }
}

/**
 * 处理关闭
 */
function handleClose() {
  emit('close');
}
</script>

<style scoped>
@reference 'tailwindcss';

/* 模态框遮罩 */
.modal-overlay {
  @apply fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4;
}

/* 模态框内容 */
.modal-content {
  @apply bg-(--solid-block-color) rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col;
}

/* 标题栏 */
.modal-header {
  @apply flex items-center justify-between p-6 border-b border-(--split-color) bg-(--solid-block-color);
}

.modal-title {
  @apply text-xl font-bold flex items-center gap-2 text-(--content-color);
}

.close-btn {
  @apply w-8 h-8 rounded-full flex items-center justify-center;
  @apply text-(--desc-color) hover:text-(--text-color) hover:bg-(--hover-color);
  @apply transition-colors duration-200;
}

/* 主体内容 */
.modal-body {
  @apply flex-1 p-6 overflow-y-auto space-y-6;
}

/* 底部按钮 */
.modal-footer {
  @apply p-6 border-t border-(--split-color) bg-(--solid-block-color);
}

/* 错误框 */
.error-box {
  @apply bg-(--solid-button-color) border border-red-400/50 rounded-lg p-4 flex gap-3;
  @apply text-red-500;
}

/* 过渡动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--desc-color);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .modal-content {
    @apply max-w-full m-2;
  }

  .modal-header {
    @apply p-4;
  }

  .modal-body {
    @apply p-4;
  }

  .modal-footer {
    @apply p-4;
  }
}
</style>
