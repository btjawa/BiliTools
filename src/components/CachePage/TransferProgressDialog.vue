<template>
  <Teleport to="body">
    <!-- 模态框遮罩 -->
    <Transition name="modal">
      <div
        v-if="visible"
        class="modal-overlay"
      >
        <!-- 对话框容器 -->
        <div class="modal-content">
          <!-- 对话框头部 -->
          <div class="modal-header">
            <h2 class="modal-title">
              <i :class="[$fa.weight, 'fa-exchange']"></i>
              <span class="text-(--content-color)">{{ transferTitle }}</span>
            </h2>
            <button
              v-if="canClose"
              class="close-btn"
              @click="handleClose"
            >
              <i :class="[$fa.weight, 'fa-times']"></i>
            </button>
          </div>

          <!-- 对话框内容 -->
          <div class="modal-body">
            <!-- 单任务进度显示 -->
            <div
              v-if="allTasks.length === 1"
              class="space-y-6"
            >
              <SingleTaskProgress
                :task="allTasks[0]"
                :progress="getTaskProgress(allTasks[0].id)"
              />
            </div>

            <!-- 多任务进度显示 -->
            <div
              v-else
              class="space-y-6"
            >
              <!-- 总体进度 -->
              <OverallProgress
                :total-files="totalFiles"
                :completed-files="completedFiles"
                :total-size="totalSize"
                :transferred-size="transferredSize"
                :average-speed="averageSpeed"
                :overall-percentage="overallPercentage"
              />

              <!-- 任务列表 -->
              <div class="space-y-3">
                <h3 class="text-sm font-medium text-(--content-color)">
                  {{ $t('transfer.taskList') }} ({{ allTasks.length }})
                </h3>
                <div class="task-list space-y-2">
                  <div
                    v-for="task in allTasks"
                    :key="task.id"
                    class="task-item"
                  >
                    <TaskProgressItem
                      :task="task"
                      :progress="getTaskProgress(task.id)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- 错误信息 -->
            <div
              v-if="lastError"
              class="error-box"
            >
              <i :class="[$fa.weight, 'fa-exclamation-circle']"></i>
              <div class="text-sm text-(--content-color)">{{ lastError }}</div>
            </div>
          </div>

          <!-- 对话框底部 -->
          <div class="modal-footer flex justify-end gap-3">
            <!-- 暂停/继续按钮 -->
            <button
              v-if="hasRunningTasks"
              class="px-4 py-2 rounded-lg border border-(--border-color) text-(--content-color) hover:bg-(--hover-color) transition-colors flex items-center gap-2"
              :disabled="!canPause"
              @click="handlePauseResume"
            >
              <i :class="[$fa.weight, isPaused ? 'fa-play' : 'fa-pause']"></i>
              {{ isPaused ? $t('transfer.resume') : $t('transfer.pause') }}
            </button>

            <!-- 取消按钮 -->
            <button
              class="px-4 py-2 rounded-lg border border-(--border-color) text-(--content-color) hover:bg-(--hover-color) transition-colors flex items-center gap-2"
              :disabled="!canCancel"
              @click="handleCancel"
            >
              <i :class="[$fa.weight, 'fa-stop']"></i>
              {{ $t('transfer.stop') }}
            </button>

            <!-- 关闭按钮 -->
            <button
              v-if="canClose"
              class="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors font-medium flex items-center gap-2"
              @click="handleClose"
            >
              <i :class="[$fa.weight, 'fa-check']"></i>
              {{ $t('transfer.close') }}
            </button>
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
import OverallProgress from './TransferProgressDialog/OverallProgress.vue';
import TaskProgressItem from './TransferProgressDialog/TaskProgressItem.vue';

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
  return allTasks.value.some((task) => task.status === 'running');
});

/**
 * 传输状态标题
 */
const transferTitle = computed(() => {
  if (allTasks.value.length === 0) {
    return t('transfer.transferring');
  }
  
  const allCompleted = allTasks.value.every(task => task.status === 'completed');
  const anyFailed = allTasks.value.some(task => task.status === 'failed');
  const anyCancelled = allTasks.value.some(task => task.status === 'cancelled');
  
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
 * 是否有暂停的任务
 */
const hasRunningOrPausedTasks = computed(() => {
  return allTasks.value.some((task) => task.status === 'running' || task.status === 'paused');
});

/**
 * 是否可以暂停
 */
const canPause = computed(() => hasRunningOrPausedTasks.value);

/**
 * 是否可以取消
 */
const canCancel = computed(() => hasRunningOrPausedTasks.value);

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
  return allTasks.value.reduce((sum, task) => sum + task.progress.totalFiles, 0);
});

/**
 * 已完成文件数
 */
const completedFiles = computed(() => {
  return allTasks.value.reduce((sum, task) => sum + task.progress.completedFiles, 0);
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
const overallPercentage = computed(() => transferStore.overallProgressPercentage);

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
  // 启动定期更新
  updateInterval.value = window.setInterval(() => {
    // 更新进度信息
    // 这里会在后续的 Tauri 事件监听中实现
  }, 500);
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
      for (const task of allTasks.value) {
        if (task.status === 'paused') {
          await transferStore.resumeTransfer(task.id);
        }
      }
      isPaused.value = false;
    } else {
      // 暂停所有运行中的任务
      for (const task of allTasks.value) {
        if (task.status === 'running') {
          await transferStore.pauseTransfer(task.id);
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
  if (!confirm(t('transfer.confirmCancel'))) {
    return;
  }

  try {
    for (const task of allTasks.value) {
      if (task.status === 'running' || task.status === 'paused') {
        await transferStore.cancelTransfer(task.id);
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

/* 任务列表 */
.task-list {
  @apply bg-(--solid-button-color) rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto;
}

.task-item {
  @apply bg-(--input-bg) rounded-lg p-3 border border-(--split-color);
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
    @apply p-4 flex-col gap-2;
  }

  .task-list {
    @apply max-h-48;
  }
}
</style>
