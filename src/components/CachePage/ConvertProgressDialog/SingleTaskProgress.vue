<template>
  <div class="space-y-4">
    <!-- 任务标题 -->
    <div class="flex items-center gap-3">
      <i class="fa-solid fa-file-video text-2xl text-blue-500"></i>
      <div class="flex-1 min-w-0">
        <h3 class="text-lg font-medium text-(--content-color) truncate">
          {{ task.title }}
        </h3>
        <p class="text-sm text-(--desc-color)">
          {{ getStageDisplayName(task.progress.stage) }}
        </p>
      </div>
      <!-- 状态图标 -->
      <div class="flex-shrink-0">
        <i
          v-if="task.progress.stage === 'completed'"
          class="fa-solid fa-check-circle text-2xl text-green-500"
        ></i>
        <i
          v-else-if="task.progress.stage === 'failed'"
          class="fa-solid fa-times-circle text-2xl text-red-500"
        ></i>
        <i
          v-else-if="task.progress.stage === 'cancelled'"
          class="fa-solid fa-ban text-2xl text-gray-500"
        ></i>
        <i
          v-else-if="task.progress.stage === 'paused'"
          class="fa-solid fa-pause-circle text-2xl text-yellow-500"
        ></i>
        <i
          v-else
          class="fa-solid fa-spinner fa-spin text-2xl text-blue-500"
        ></i>
      </div>
    </div>

    <!-- 进度条 -->
    <div class="space-y-2">
      <div class="flex justify-between text-sm">
        <span class="text-(--desc-color)">{{ $t('transfer.progress') }}</span>
        <span class="text-(--content-color) font-medium"
          >{{ task.progress.percentage }}%</span
        >
      </div>
      <div class="progress-bar">
        <div
          class="progress-fill"
          :class="progressColorClass"
          :style="{ width: task.progress.percentage + '%' }"
        ></div>
      </div>
    </div>

    <!-- 详细信息 -->
    <div class="bg-(--solid-button-color) rounded-lg p-4 space-y-3">
      <!-- 当前文件 -->
      <div
        v-if="task.progress.currentFile"
        class="flex justify-between items-center"
      >
        <span class="text-sm text-(--desc-color)">{{
          $t('transfer.currentFile')
        }}</span>
        <span class="text-sm text-(--content-color) truncate max-w-[60%]">{{
          task.progress.currentFile
        }}</span>
      </div>

      <!-- 处理速度 -->
      <div v-if="task.progress.speed" class="flex justify-between items-center">
        <span class="text-sm text-(--desc-color)">{{
          $t('transfer.speed')
        }}</span>
        <span class="text-sm text-(--content-color)">{{
          task.progress.speed
        }}</span>
      </div>

      <!-- 已处理/总大小 -->
      <div
        v-if="task.progress.totalBytes > 0"
        class="flex justify-between items-center"
      >
        <span class="text-sm text-(--desc-color)">{{
          $t('transfer.size')
        }}</span>
        <span class="text-sm text-(--content-color)">
          {{ formatFileSize(task.progress.processedBytes) }} /
          {{ formatFileSize(task.progress.totalBytes) }}
        </span>
      </div>

      <!-- 输出路径 -->
      <div
        v-if="task.outputPath && task.progress.stage === 'completed'"
        class="flex justify-between items-center"
      >
        <span class="text-sm text-(--desc-color)">{{
          $t('transfer.destination')
        }}</span>
        <span
          class="text-sm text-blue-500 truncate max-w-[60%] cursor-pointer hover:underline"
          @click="openOutputFolder"
          >{{ task.outputPath }}</span
        >
      </div>
    </div>

    <!-- 错误信息 -->
    <div
      v-if="task.errorMessage && task.progress.stage === 'failed'"
      class="bg-red-500/10 border border-red-400/50 rounded-lg p-4"
    >
      <div class="flex items-start gap-2">
        <i class="fa-solid fa-exclamation-triangle text-red-500 mt-0.5"></i>
        <div class="flex-1">
          <p class="text-sm font-medium text-red-500">
            {{ $t('transfer.error') }}
          </p>
          <p class="text-sm text-red-400 mt-1">{{ task.errorMessage }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { invoke } from '@tauri-apps/api/core';
import { formatFileSize } from '@/utils/format';
import type { ConvertTaskView, ConvertStage } from '@/services/backend';

// ============================================================================
// Props
// ============================================================================

interface Props {
  task: ConvertTaskView;
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
 * 进度条颜色类
 */
const progressColorClass = computed(() => {
  const stage = props.task.progress.stage;
  if (stage === 'completed') return 'bg-green-500';
  if (stage === 'failed') return 'bg-red-500';
  if (stage === 'cancelled') return 'bg-gray-500';
  if (stage === 'paused') return 'bg-yellow-500';
  return 'bg-blue-500';
});

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
 * 打开输出文件夹
 */
async function openOutputFolder() {
  if (props.task.outputPath) {
    try {
      // 获取文件所在目录
      const dir = props.task.outputPath.replace(/[/\\][^/\\]*$/, '');
      await invoke('open_path', { path: dir });
    } catch (error) {
      console.error('打开文件夹失败:', error);
    }
  }
}
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
