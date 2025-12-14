<template>
  <div class="space-y-2">
    <!-- 任务头部 -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <!-- 状态图标 -->
        <div :class="statusIconClass">
          <i :class="[$fa.weight, statusIcon]"></i>
        </div>

        <!-- 任务信息 -->
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-(--content-color) truncate">
            {{ taskName }}
          </div>
          <div class="text-xs text-(--desc-color) truncate">
            {{ progress?.currentFile || '-' }}
          </div>
        </div>
      </div>

      <!-- 进度百分比 -->
      <div class="text-sm font-bold text-blue-500 ml-2">{{ percentage }}%</div>
    </div>

    <!-- 进度条 -->
    <div class="w-full h-2 bg-(--input-bg) rounded-full overflow-hidden border border-(--split-color)">
      <div
        class="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300"
        :style="{ width: `${percentage}%` }"
      ></div>
    </div>

    <!-- 详细信息 -->
    <div class="flex items-center justify-between text-xs text-(--desc-color)">
      <span>{{ formatFileSize(progress?.transferredSize ?? 0) }} / {{ formatFileSize(progress?.totalSize ?? 0) }}</span>
      <span>{{ formatSpeed(progress?.speed ?? 0) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type * as Types from '@/types/transfer.d';

// ============================================================================
// Props
// ============================================================================

interface Props {
  task: Types.TransferTask;
  progress: Types.TransferProgress | null;
}

const props = defineProps<Props>();

// ============================================================================
// 计算属性
// ============================================================================

/**
 * 任务名称
 */
const taskName = computed(() => {
  const operation = props.task.operation === 'copy' ? '复制' : '剪切';
  return `${operation} - ${props.task.sourceFiles.length} 项`;
});

/**
 * 进度百分比
 */
const percentage = computed(() => {
  if (!props.progress || props.progress.totalSize === 0) return 0;
  return Math.round((props.progress.transferredSize / props.progress.totalSize) * 100);
});

/**
 * 状态图标
 */
const statusIcon = computed(() => {
  if (!props.progress) return 'fa-hourglass-start';
  switch (props.progress.status) {
    case 'running':
      return 'fa-spinner fa-spin';
    case 'paused':
      return 'fa-pause';
    case 'completed':
      return 'fa-check-circle';
    case 'failed':
      return 'fa-exclamation-circle';
    case 'cancelled':
      return 'fa-times-circle';
    default:
      return 'fa-hourglass-start';
  }
});

/**
 * 状态图标样式
 */
const statusIconClass = computed(() => {
  if (!props.progress) return 'text-(--desc-color)';
  switch (props.progress.status) {
    case 'running':
      return 'text-blue-500';
    case 'paused':
      return 'text-yellow-500';
    case 'completed':
      return 'text-green-500';
    case 'failed':
      return 'text-red-500';
    case 'cancelled':
      return 'text-gray-500';
    default:
      return 'text-(--desc-color)';
  }
});

/**
 * Font Awesome 权重
 */
const $fa = computed(() => ({
  weight: 'fa-solid',
}));

// ============================================================================
// 方法
// ============================================================================

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 格式化速度
 */
function formatSpeed(bytesPerSecond: number): string {
  return formatFileSize(bytesPerSecond) + '/s';
}
</script>

<style scoped>
@reference 'tailwindcss';
</style>
