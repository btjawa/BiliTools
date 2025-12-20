<template>
  <div class="bg-(--solid-button-color) rounded-lg p-4 space-y-4">
    <!-- 标题 -->
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-medium text-(--content-color) flex items-center gap-2">
        <i class="fa-solid fa-tasks"></i>
        {{ $t('transfer.overallProgress') }}
      </h3>
      <span class="text-sm text-(--desc-color)">
        {{ completedCount + failedCount }} / {{ totalCount }}
      </span>
    </div>

    <!-- 进度条 -->
    <div class="space-y-2">
      <div class="progress-bar">
        <div
          class="progress-fill bg-blue-500"
          :style="{ width: overallPercentage + '%' }"
        ></div>
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-(--desc-color)">{{ overallPercentage }}%</span>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="grid grid-cols-3 gap-4 pt-2 border-t border-(--split-color)">
      <!-- 已完成 -->
      <div class="text-center">
        <div class="text-lg font-bold text-green-500">{{ completedCount }}</div>
        <div class="text-xs text-(--desc-color)">{{ $t('transfer.completed') }}</div>
      </div>

      <!-- 进行中 -->
      <div class="text-center">
        <div class="text-lg font-bold text-blue-500">{{ inProgressCount }}</div>
        <div class="text-xs text-(--desc-color)">{{ $t('transfer.running') }}</div>
      </div>

      <!-- 失败 -->
      <div class="text-center">
        <div class="text-lg font-bold text-red-500">{{ failedCount }}</div>
        <div class="text-xs text-(--desc-color)">{{ $t('transfer.failed') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// ============================================================================
// Props
// ============================================================================

interface Props {
  totalCount: number;
  completedCount: number;
  failedCount: number;
  overallPercentage: number;
}

const props = defineProps<Props>();

// ============================================================================
// 计算属性
// ============================================================================

/**
 * 进行中的任务数
 */
const inProgressCount = computed(() => {
  return props.totalCount - props.completedCount - props.failedCount;
});
</script>

<style scoped>
@reference 'tailwindcss';

.progress-bar {
  @apply h-2 rounded-full bg-(--button-color) overflow-hidden;
}

.progress-fill {
  @apply h-full rounded-full transition-all duration-300;
}
</style>
