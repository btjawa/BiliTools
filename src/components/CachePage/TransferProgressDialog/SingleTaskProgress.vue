<template>
  <div class="space-y-6">
    <!-- 进度条 -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-(--content-color)">{{
          $t('transfer.progress')
        }}</span>
        <span class="text-sm font-bold text-blue-500">{{ percentage }}%</span>
      </div>
      <div
        class="w-full h-3 bg-(--input-bg) rounded-full overflow-hidden border border-(--split-color)"
      >
        <div
          class="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300"
          :style="{ width: `${percentage}%` }"
        ></div>
      </div>
    </div>

    <!-- 文件进度 -->
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-(--solid-button-color) rounded-lg p-4">
        <div class="text-xs text-(--desc-color) mb-1">
          {{ $t('transfer.fileCount') }}
        </div>
        <div class="text-lg font-bold text-(--content-color)">
          {{ progress?.completedFiles ?? 0 }} / {{ progress?.totalFiles ?? 0 }}
        </div>
      </div>
      <div class="bg-(--solid-button-color) rounded-lg p-4">
        <div class="text-xs text-(--desc-color) mb-1">
          {{ $t('transfer.size') }}
        </div>
        <div class="text-lg font-bold text-(--content-color)">
          {{ formatFileSize(progress?.transferredSize ?? 0) }} /
          {{ formatFileSize(progress?.totalSize ?? 0) }}
        </div>
      </div>
    </div>

    <!-- 传输信息 -->
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-(--solid-button-color) rounded-lg p-4">
        <div class="text-xs text-(--desc-color) mb-1">
          {{ $t('transfer.speed') }}
        </div>
        <div class="text-lg font-bold text-green-500">
          {{ formatSpeed(progress?.speed ?? 0) }}
        </div>
      </div>
      <div class="bg-(--solid-button-color) rounded-lg p-4">
        <div class="text-xs text-(--desc-color) mb-1">
          {{ $t('transfer.remainingTime') }}
        </div>
        <div class="text-lg font-bold text-(--content-color)">
          {{ formatTimeSimple(progress?.remainingTime ?? 0) }}
        </div>
      </div>
      <div class="bg-(--solid-button-color) rounded-lg p-4">
        <div class="text-xs text-(--desc-color) mb-1">
          {{ $t('transfer.status') }}
        </div>
        <div class="text-lg font-bold" :class="statusColor">
          {{ statusText }}
        </div>
      </div>
    </div>

    <!-- 当前文件 -->
    <div class="bg-(--solid-button-color) rounded-lg p-4">
      <div class="text-xs text-(--desc-color) mb-2">
        {{ $t('transfer.currentFile') }}
      </div>
      <div class="space-y-1">
        <div class="text-(--content-color) truncate font-medium">
          {{
            (progress?.currentVideoName && progress.currentVideoName.trim()) ||
            '未知视频'
          }}
        </div>
        <div class="text-xs text-(--desc-color) truncate">
          {{ progress?.currentFile || '-' }}
        </div>
      </div>
    </div>

    <!-- 错误信息 -->
    <div v-if="progress?.errorMessage" class="error-box">
      <i class="fa-solid fa-exclamation-circle"></i>
      <div class="text-sm text-(--content-color)">
        {{ progress.errorMessage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type * as Types from '@/types/transfer.d';
import { formatFileSize, formatSpeed, formatTimeSimple } from '@/utils/format';

// ============================================================================
// Props
// ============================================================================

interface Props {
  task: Types.TransferTask;
  progress: Types.TransferProgress | null;
}

const props = defineProps<Props>();

// ============================================================================
// 依赖注入
// ============================================================================

const { t } = useI18n();

// ============================================================================
// 计算属性
// ============================================================================

/**
 * 进度百分比
 */
const percentage = computed(() => {
  if (!props.progress || props.progress.totalSize === 0) return 0;
  return Math.round(
    (props.progress.transferredSize / props.progress.totalSize) * 100,
  );
});

/**
 * 状态文本
 */
const statusText = computed(() => {
  if (!props.progress) return t('transfer.pending');
  return t(`transfer.${props.progress.status}`);
});

/**
 * 状态颜色
 */
const statusColor = computed(() => {
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

// ============================================================================
// 方法
// ============================================================================
</script>

<style scoped>
@reference 'tailwindcss';

.error-box {
  @apply bg-(--solid-button-color) border border-red-400/50 rounded-lg p-4 flex gap-3;
  @apply text-red-500;
}
</style>
