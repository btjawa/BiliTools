<template>
  <div class="space-y-6">
    <!-- 总体进度条 -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-(--content-color)">{{ $t('transfer.overallProgress') }}</span>
        <span class="text-sm font-bold text-blue-500">{{ overallPercentage }}%</span>
      </div>
      <div class="w-full h-4 bg-(--input-bg) rounded-full overflow-hidden border border-(--split-color)">
        <div
          class="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300"
          :style="{ width: `${overallPercentage}%` }"
        ></div>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
      <!-- 文件进度 -->
      <div class="bg-(--solid-button-color) rounded-lg p-4">
        <div class="text-xs text-(--desc-color) mb-1">{{ $t('transfer.fileCount') }}</div>
        <div class="text-lg font-bold text-(--content-color)">
          {{ completedFiles }} / {{ totalFiles }}
        </div>
        <div class="text-xs text-(--desc-color) mt-1">
          {{ Math.round((completedFiles / Math.max(totalFiles, 1)) * 100) }}%
        </div>
      </div>

      <!-- 大小进度 -->
      <div class="bg-(--solid-button-color) rounded-lg p-4">
        <div class="text-xs text-(--desc-color) mb-1">{{ $t('transfer.size') }}</div>
        <div class="text-lg font-bold text-(--content-color)">
          {{ formatFileSize(transferredSize) }}
        </div>
        <div class="text-xs text-(--desc-color) mt-1">
          / {{ formatFileSize(totalSize) }}
        </div>
      </div>

      <!-- 平均速度 -->
      <div class="bg-(--solid-button-color) rounded-lg p-4">
        <div class="text-xs text-(--desc-color) mb-1">{{ $t('transfer.speed') }}</div>
        <div class="text-lg font-bold text-green-500">{{ formatSpeed(averageSpeed) }}</div>
        <div class="text-xs text-(--desc-color) mt-1">/s</div>
      </div>

      <!-- 预计剩余时间 -->
      <div class="bg-(--solid-button-color) rounded-lg p-4">
        <div class="text-xs text-(--desc-color) mb-1">{{ $t('transfer.estimatedTime') }}</div>
        <div class="text-lg font-bold text-(--content-color)">{{ estimatedRemainingTime }}</div>
        <div class="text-xs text-(--desc-color) mt-1">{{ $t('transfer.remaining') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatFileSize, formatSpeed, formatTimeSimple } from '@/utils/format';

// ============================================================================
// Props
// ============================================================================

interface Props {
  totalFiles: number;
  completedFiles: number;
  totalSize: number;
  transferredSize: number;
  averageSpeed: number;
  overallPercentage: number;
}

const props = defineProps<Props>();

// ============================================================================
// 依赖注入
// ============================================================================

useI18n();

// ============================================================================
// 计算属性
// ============================================================================

/**
 * 预计剩余时间
 */
const estimatedRemainingTime = computed(() => {
  if (props.averageSpeed === 0) return '-';

  const remainingSize = props.totalSize - props.transferredSize;
  const remainingSeconds = remainingSize / props.averageSpeed;

  return formatTimeSimple(remainingSeconds);
});
</script>

<style scoped>
@reference 'tailwindcss';
</style>