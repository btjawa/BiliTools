<template>
  <div class="space-y-3">
    <h3
      class="text-sm font-medium text-(--content-color) flex items-center gap-2"
    >
      <i class="fa-solid fa-list"></i>
      {{ $t('transfer.taskList') }}
    </h3>

    <div class="space-y-2 max-h-64 overflow-y-auto">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="bg-(--solid-button-color) rounded-lg p-3 space-y-2"
      >
        <!-- 任务标题行 -->
        <div class="flex items-center gap-2">
          <!-- 状态图标 -->
          <i
            v-if="task.progress.stage === 'completed'"
            class="fa-solid fa-check-circle text-green-500"
          ></i>
          <i
            v-else-if="task.progress.stage === 'failed'"
            class="fa-solid fa-times-circle text-red-500"
          ></i>
          <i
            v-else-if="task.progress.stage === 'cancelled'"
            class="fa-solid fa-ban text-gray-500"
          ></i>
          <i
            v-else-if="task.progress.stage === 'paused'"
            class="fa-solid fa-pause-circle text-yellow-500"
          ></i>
          <i v-else class="fa-solid fa-spinner fa-spin text-blue-500"></i>

          <!-- 标题 -->
          <span class="flex-1 text-sm text-(--content-color) truncate">
            {{ task.title }}
          </span>

          <!-- 进度百分比 -->
          <span class="text-sm text-(--desc-color)">
            {{ task.progress.percentage }}%
          </span>
        </div>

        <!-- 进度条 -->
        <div class="progress-bar">
          <div
            class="progress-fill"
            :class="getProgressColorClass(task.progress.stage)"
            :style="{ width: task.progress.percentage + '%' }"
          ></div>
        </div>

        <!-- 阶段和速度 -->
        <div class="flex justify-between text-xs text-(--desc-color)">
          <span>{{ getStageDisplayName(task.progress.stage) }}</span>
          <span v-if="task.progress.speed">{{ task.progress.speed }}</span>
        </div>

        <!-- 错误信息 -->
        <div
          v-if="task.errorMessage && task.progress.stage === 'failed'"
          class="text-xs text-red-400 truncate"
          :title="task.errorMessage"
        >
          <i class="fa-solid fa-exclamation-triangle mr-1"></i>
          {{ task.errorMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { ConvertTaskView, ConvertStage } from '@/services/backend';

// ============================================================================
// Props
// ============================================================================

interface Props {
  tasks: ConvertTaskView[];
}

defineProps<Props>();

// ============================================================================
// 依赖注入
// ============================================================================

const { t } = useI18n();

// ============================================================================
// 方法
// ============================================================================

/**
 * 获取阶段显示名称
 */
function getStageDisplayName(stage: ConvertStage): string {
  return t(`convert.stage.${stage}`);
}

/**
 * 获取进度条颜色类
 */
function getProgressColorClass(stage: ConvertStage): string {
  if (stage === 'completed') return 'bg-green-500';
  if (stage === 'failed') return 'bg-red-500';
  if (stage === 'cancelled') return 'bg-gray-500';
  if (stage === 'paused') return 'bg-yellow-500';
  return 'bg-blue-500';
}
</script>

<style scoped>
@reference 'tailwindcss';

.progress-bar {
  @apply h-1.5 rounded-full bg-(--button-color) overflow-hidden;
}

.progress-fill {
  @apply h-full rounded-full transition-all duration-300;
}
</style>
