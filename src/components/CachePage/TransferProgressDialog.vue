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
              <i :class="[$fa.weight, 'fa-exchange']"></i>
              <span class="text-(--content-color)">{{ transferTitle }}</span>
            </h2>
            <button v-if="canClose" class="close-btn" @click="handleClose">
              <i :class="[$fa.weight, 'fa-times']"></i>
            </button>
          </div>

          <!-- 对话框内容 -->
          <div class="modal-body">
            <!-- 单任务进度显示 -->
            <div v-if="allTasks.length === 1" class="space-y-6">
              <SingleTaskProgress
                :task="allTasks[0]"
                :progress="getTaskProgress(allTasks[0].id)"
              />
            </div>

            <!-- 多任务进度显示 -->
            <div v-else class="space-y-6">
              <!-- 总体进度 -->
              <TransferSummary
                :total-files="totalFiles"
                :completed-files="completedFiles"
                :total-size="totalSize"
                :transferred-size="transferredSize"
                :average-speed="averageSpeed"
                :overall-percentage="overallPercentage"
              />

              <!-- 任务列表 -->
              <TransferTaskList
                :tasks="allTasks"
                :get-task-progress="getTaskProgress"
                @task-select="handleTaskSelect"
              />
            </div>

            <!-- 错误信息 -->
            <div v-if="lastError" class="error-box">
              <i :class="[$fa.weight, 'fa-exclamation-circle']"></i>
              <div class="text-sm text-(--content-color)">{{ lastError }}</div>
            </div>
          </div>

          <!-- 对话框底部 -->
          <div class="modal-footer">
            <TransferControls
              :can-pause="canPause"
              :can-cancel="canCancel"
              :can-close="canClose"
              :is-paused="isPaused"
              :has-running-tasks="hasRunningTasks"
              @pause="handlePauseResume"
              @cancel="handleCancel"
              @close="handleClose"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTransferStore } from '@/store/transfer';
import type * as Types from '@/types/transfer.d';
import SingleTaskProgress from './TransferProgressDialog/SingleTaskProgress.vue';
import TransferSummary from './TransferProgressDialog/TransferSummary.vue';
import TransferTaskList from './TransferProgressDialog/TransferTaskList.vue';
import TransferControls from './TransferProgressDialog/TransferControls.vue';

// ============================================================================
// Props 和 Emits
// ============================================================================

interface Props {
  visible: boolean;
}

interface Emits {
  (e: 'close'): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

// ============================================================================
// 依赖注入
// ============================================================================

const { t } = useI18n();
const transferStore = useTransferStore();

// ============================================================================
// 状态
// ============================================================================

const isPaused = ref(false);
const updateInterval = ref<number | null>(null);

// ============================================================================
// 计算属性
// ============================================================================

/**
 * 所有任务
 */
const allTasks = computed(() => transferStore.allTasks);

/**
 * 是否有运行中的任务
 */
const hasRunningTasks = computed(() => {
  return allTasks.value.some(
    (task) => task.status === 'running' || task.status === 'pending',
  );
});

/**
 * 传输状态标题
 */
const transferTitle = computed(() => {
  if (allTasks.value.length === 0) {
    return t('transfer.transferring');
  }

  const allCompleted = allTasks.value.every(
    (task) => task.status === 'completed',
  );
  const anyFailed = allTasks.value.some((task) => task.status === 'failed');
  const anyCancelled = allTasks.value.some(
    (task) => task.status === 'cancelled',
  );

  if (anyFailed) {
    return t('transfer.transferFailed');
  } else if (anyCancelled) {
    return t('transfer.transferCancelled');
  } else if (allCompleted) {
    return t('transfer.transferCompleted');
  } else {
    return t('transfer.transferring');
  }
});

/**
 * 是否可以暂停
 */
const canPause = computed(() => {
  const activeTasksCount = allTasks.value.filter(
    (task) => task.status === 'running' || task.status === 'paused',
  ).length;
  return activeTasksCount > 0;
});

/**
 * 是否可以取消
 */
const canCancel = computed(() => {
  const activeTasksCount = allTasks.value.filter(
    (task) =>
      task.status === 'running' ||
      task.status === 'paused' ||
      task.status === 'pending',
  ).length;
  return activeTasksCount > 0;
});

/**
 * 是否可以关闭
 */
const canClose = computed(() => {
  return allTasks.value.every(
    (task) =>
      task.status === 'completed' ||
      task.status === 'failed' ||
      task.status === 'cancelled',
  );
});

/**
 * 总文件数
 */
const totalFiles = computed(() => {
  return allTasks.value.reduce(
    (sum, task) => sum + task.progress.totalFiles,
    0,
  );
});

/**
 * 已完成文件数
 */
const completedFiles = computed(() => {
  return allTasks.value.reduce(
    (sum, task) => sum + task.progress.completedFiles,
    0,
  );
});

/**
 * 总大小
 */
const totalSize = computed(() => transferStore.totalTransferSize);

/**
 * 已传输大小
 */
const transferredSize = computed(() => transferStore.totalTransferredSize);

/**
 * 平均速度
 */
const averageSpeed = computed(() => transferStore.averageTransferSpeed);

/**
 * 总体进度百分比
 */
const overallPercentage = computed(
  () => transferStore.overallProgressPercentage,
);

/**
 * 最后的错误信息
 */
const lastError = computed(() => transferStore.lastError);

/**
 * Font Awesome 权重
 */
const $fa = computed(() => ({
  weight: 'fa-solid',
}));

// ============================================================================
// 生命周期
// ============================================================================

onMounted(() => {
  // 启动轻量级状态检查（作为推送机制的备份）
  updateInterval.value = window.setInterval(async () => {
    // 只对可能存在状态不一致的任务进行轻量级检查
    for (const task of allTasks.value) {
      // 只检查运行中的任务，已完成的任务通过推送机制处理
      if (task.status === 'running' || task.status === 'paused') {
        try {
          const progress = await transferStore.refreshTaskProgress(task.id);
          if (progress && progress.status !== task.status) {
            // 只有状态发生变化时才更新
            transferStore.updateTransferProgress(progress);
          }
        } catch (error) {
          console.warn(`检查任务 ${task.id} 状态失败:`, error);
        }
      }
    }
  }, 2000); // 降低轮询频率，主要依赖推送机制
});

onUnmounted(() => {
  if (updateInterval.value) {
    clearInterval(updateInterval.value);
  }
});

// ============================================================================
// 方法
// ============================================================================

/**
 * 获取任务进度
 */
function getTaskProgress(taskId: string): Types.TransferProgress | null {
  return transferStore.getTaskProgress(taskId);
}

/**
 * 处理暂停/继续
 */
async function handlePauseResume() {
  try {
    if (isPaused.value) {
      // 继续所有暂停的任务
      const pausedTasks = allTasks.value.filter(
        (task) => task.status === 'paused',
      );

      for (const task of pausedTasks) {
        try {
          await transferStore.resumeTransfer(task.id);
        } catch (error) {
          // 忽略任务不存在的错误（可能已经完成）
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (!errorMessage.includes('传输任务不存在')) {
            console.error(`恢复任务 ${task.id} 失败:`, error);
          }
        }
      }
      isPaused.value = false;
    } else {
      // 暂停所有运行中的任务
      const runningTasks = allTasks.value.filter(
        (task) => task.status === 'running',
      );

      if (runningTasks.length === 0) {
        // 没有运行中的任务，可能都已经完成了
        return;
      }

      for (const task of runningTasks) {
        try {
          await transferStore.pauseTransfer(task.id);
        } catch (error) {
          // 忽略任务不存在的错误（可能已经完成）
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (!errorMessage.includes('传输任务不存在')) {
            console.error(`暂停任务 ${task.id} 失败:`, error);
          }
        }
      }
      isPaused.value = true;
    }
  } catch (error) {
    console.error('暂停/继续传输失败:', error);
  }
}

/**
 * 处理取消
 */
async function handleCancel() {
  try {
    // 使用 Tauri 的 dialog API
    const { confirm } = await import('@tauri-apps/plugin-dialog');
    const shouldCancel = await confirm(t('transfer.confirmCancel'), {
      title: t('transfer.confirmTitle'),
      kind: 'warning',
    });

    if (!shouldCancel) {
      return;
    }

    // 只取消仍然活跃的任务
    const activeTasks = allTasks.value.filter(
      (task) =>
        task.status === 'running' ||
        task.status === 'paused' ||
        task.status === 'pending',
    );

    if (activeTasks.length === 0) {
      // 没有活跃任务，可能都已经完成了
      return;
    }

    for (const task of activeTasks) {
      try {
        await transferStore.cancelTransfer(task.id);
      } catch (error) {
        // 忽略任务不存在的错误（可能已经完成）
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('传输任务不存在')) {
          console.error(`取消任务 ${task.id} 失败:`, error);
        }
      }
    }
  } catch (error) {
    console.error('取消传输失败:', error);
  }
}

/**
 * 处理关闭
 */
function handleClose() {
  emit('close');
}

/**
 * 处理任务选择
 */
function handleTaskSelect(taskId: string) {
  // 可以在这里添加任务选择逻辑，比如显示任务详情
  console.log('选择任务:', taskId);
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
