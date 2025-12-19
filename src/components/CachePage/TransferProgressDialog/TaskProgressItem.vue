<template>
  <div class="space-y-3">
    <!-- 状态图标和总体进度条 (突出显示) -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <!-- 状态图标 -->
          <div :class="statusIconClass">
            <i :class="[$fa.weight, statusIcon]"></i>
          </div>
          <span class="text-sm font-medium text-(--content-color)"
            >总体进度</span
          >
        </div>
        <!-- 总体进度百分比 -->
        <div class="text-lg font-bold text-blue-500">
          {{ overallPercentage }}%
        </div>
      </div>

      <!-- 总体进度条 (更大更突出) -->
      <div
        class="w-full h-3 bg-(--input-bg) rounded-full overflow-hidden border border-(--split-color) shadow-sm"
      >
        <div
          class="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out"
          :style="{ width: `${overallPercentage}%` }"
        ></div>
      </div>
    </div>

    <!-- 进度统计信息 (并排显示) -->
    <div class="flex items-center justify-between gap-4 px-2">
      <!-- 文件计数进度 -->
      <div class="flex-1 text-center">
        <div class="text-xs text-(--desc-color) mb-1">文件进度</div>
        <div class="text-sm font-medium text-(--content-color)">
          {{ fileCountDisplay }}
        </div>
      </div>

      <!-- 分隔线 -->
      <div class="w-px h-8 bg-(--split-color)"></div>

      <!-- 大小进度 -->
      <div class="flex-1 text-center">
        <div class="text-xs text-(--desc-color) mb-1">数据大小</div>
        <div class="text-sm font-medium text-(--content-color)">
          {{ sizeProgressDisplay }}
        </div>
      </div>
    </div>

    <!-- 当前文件信息 (独立区域) -->
    <div
      class="bg-(--block-color) rounded-lg p-3 border border-(--split-color)"
    >
      <div class="text-xs text-(--desc-color) mb-1">当前文件</div>
      <div class="space-y-1">
        <!-- 视频名称 (大字体) -->
        <div
          class="text-base font-semibold text-(--content-color) cursor-help leading-tight"
          :title="currentVideoName"
        >
          {{ truncatedVideoName }}
        </div>
        <!-- 文件路径 (小字体，辅助信息) -->
        <div
          class="text-xs text-(--desc-color) cursor-help leading-tight"
          :title="currentFilePath"
        >
          {{ truncatedFilePath }}
        </div>
      </div>
    </div>

    <!-- 性能信息 -->
    <div
      class="flex items-center justify-between bg-(--input-bg) rounded-lg px-3 py-2 border border-(--split-color)"
    >
      <div class="flex items-center gap-2">
        <i class="fa-solid fa-gauge-high text-xs text-(--desc-color)"></i>
        <span class="text-sm font-medium text-(--content-color)">{{
          formattedSpeed
        }}</span>
      </div>
      <div v-if="formattedRemainingTime" class="flex items-center gap-2">
        <i class="fa-solid fa-clock text-xs text-(--desc-color)"></i>
        <span class="text-sm text-(--desc-color)">{{
          formattedRemainingTime
        }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type * as Types from '@/types/transfer.d';
import { formatFileSize, formatSpeed, formatTime } from '@/utils/format';

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
  const operation = props.task.operation === 'Copy' ? '复制' : '剪切';
  return `${operation} - ${props.task.source_files.length} 项`;
});

/**
 * 总体进度百分比 (基于大小)
 */
const overallPercentage = computed(() => {
  if (!props.progress) return 0;

  // 边界情况处理：总大小为0时基于文件计数计算进度
  if (props.progress.totalSize === 0) {
    if (props.progress.totalFiles === 0) return 0;
    return Math.round(
      (props.progress.completedFiles / props.progress.totalFiles) * 100,
    );
  }

  // 进度计算溢出保护：确保百分比在0-100范围内
  const percentage =
    (props.progress.transferredSize / props.progress.totalSize) * 100;
  return Math.min(100, Math.max(0, Math.round(percentage)));
});

/**
 * 文件计数显示 "[已完成]/[总数]"
 */
const fileCountDisplay = computed(() => {
  if (!props.progress) return '0/0';

  // 边界情况处理：确保显示的数值合理
  const completed = Math.min(
    props.progress.completedFiles,
    props.progress.totalFiles,
  );
  const total = Math.max(props.progress.totalFiles, 1); // 避免显示0/0

  return `${completed}/${total}`;
});

/**
 * 大小进度显示 "[已传输]/[总大小]"
 */
const sizeProgressDisplay = computed(() => {
  if (!props.progress) return '0 B/0 B';

  // 进度计算溢出保护：确保已传输大小不超过总大小
  const transferredSize = Math.min(
    props.progress.transferredSize,
    props.progress.totalSize,
  );
  const transferred = formatFileSize(transferredSize);
  const total = formatFileSize(props.progress.totalSize);

  return `${transferred}/${total}`;
});

/**
 * 当前视频名称 (带截断处理)
 */
const currentVideoName = computed(() => {
  // 当前文件信息缺失处理：提供默认值
  if (
    !props.progress?.currentVideoName ||
    !props.progress.currentVideoName.trim()
  ) {
    return taskName.value;
  }
  return props.progress.currentVideoName.trim();
});

/**
 * 当前文件路径
 */
const currentFilePath = computed(() => {
  // 当前文件信息缺失处理：提供默认值
  return props.progress?.currentFile || '未知路径';
});

/**
 * 截断后的视频名称 (用于显示)
 */
const truncatedVideoName = computed(() => {
  const name = currentVideoName.value;
  const maxLength = 50; // 最大显示长度
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 3) + '...';
});

/**
 * 截断后的文件路径 (用于显示)
 */
const truncatedFilePath = computed(() => {
  const path = currentFilePath.value;
  const maxLength = 60; // 最大显示长度
  if (path.length <= maxLength) return path;
  return '...' + path.substring(path.length - maxLength + 3);
});

/**
 * 格式化的传输速度
 */
const formattedSpeed = computed(() => {
  if (!props.progress) {
    return '等待中...';
  }

  switch (props.progress.status) {
    case 'paused':
      return '已暂停';
    case 'completed':
      return '传输完成';
    case 'failed':
      return '传输失败';
    case 'cancelled':
      return '已取消';
    case 'pending':
      return '准备中...';
    case 'running': {
      const speed = props.progress.speed ?? 0;
      return speed > 0 ? formatSpeed(speed) : '计算中...';
    }
    default:
      return '未知状态';
  }
});

/**
 * 格式化的剩余时间
 */
const formattedRemainingTime = computed(() => {
  if (!props.progress || props.progress.status !== 'running') {
    return '';
  }

  const remainingTime = props.progress.remainingTime ?? 0;
  if (remainingTime <= 0) {
    return '计算中...';
  }

  return formatTime(remainingTime);
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
</script>

<style scoped>
@reference 'tailwindcss';
</style>
