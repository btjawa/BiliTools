<template>
  <Teleport to="body">
    <!-- 半透明背景遮罩 -->
    <Transition name="fade">
      <div
        v-if="visible"
        class="fixed inset-0 bg-black/50 z-40 flex items-center justify-center"
      >
        <!-- 对话框容器 -->
        <div
          class="bg-(--solid-block-color) rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto z-50"
        >
          <!-- 对话框头部 -->
          <div
            class="sticky top-0 bg-(--solid-block-color) border-b border-(--split-color) p-6 flex items-center justify-between"
          >
            <h2
              class="text-lg font-semibold flex items-center gap-2 text-(--content-color)"
            >
              <i class="fa-solid fa-trash text-red-500"></i>
              <span>{{ $t('cache.batchDelete.progressTitle') }}</span>
            </h2>
          </div>

          <!-- 对话框内容 -->
          <div class="p-6 space-y-6">
            <!-- 总体进度 -->
            <div class="progress-section">
              <div class="flex justify-between items-center mb-2">
                <span class="text-lg font-medium text-(--content-color)">{{
                  $t('cache.batchDelete.overallProgress')
                }}</span>
                <span class="text-2xl font-bold text-(--primary-color)"
                  >{{ progressPercentage }}%</span
                >
              </div>

              <ProgressBar :progress="progressPercentage" class="h-3" />

              <div
                class="flex justify-between text-sm text-(--desc-color) mt-2"
              >
                <span>{{ progress.processed }} / {{ progress.total }}</span>
                <span v-if="progress.estimatedTimeRemaining > 0">
                  {{ $t('cache.batchDelete.estimatedTime') }}:
                  {{ formatTimeSimple(progress.estimatedTimeRemaining) }}
                </span>
              </div>
            </div>

            <!-- 当前操作 -->
            <div class="status-section">
              <h3 class="section-title">
                <i class="fa-solid fa-info-circle"></i>
                <span>{{ $t('cache.batchDelete.currentOperation') }}</span>
              </h3>

              <div class="status-content">
                <div class="flex items-center gap-2 mb-2">
                  <i
                    class="fa-solid fa-spinner fa-spin text-(--primary-color)"
                  ></i>
                  <span class="font-medium text-(--content-color)">{{
                    $t('cache.batchDelete.deleting')
                  }}</span>
                </div>

                <div class="current-item">
                  <span class="text-sm text-(--desc-color)"
                    >{{ $t('cache.batchDelete.currentItem') }}:</span
                  >
                  <div class="item-name">{{ progress.currentItem }}</div>
                </div>
              </div>
            </div>

            <!-- 已完成项目列表 -->
            <div v-if="completedItems.length > 0" class="completed-section">
              <h3 class="section-title">
                <i class="fa-solid fa-check-circle text-green-500"></i>
                <span
                  >{{ $t('cache.batchDelete.completed') }} ({{
                    completedItems.length
                  }})</span
                >
              </h3>

              <div class="items-list">
                <div
                  v-for="(item, index) in completedItems"
                  :key="`completed-${index}`"
                  class="item-row success"
                >
                  <i class="fa-solid fa-check text-green-500"></i>
                  <span class="item-title">{{ item }}</span>
                </div>
              </div>
            </div>

            <!-- 进行中项目 -->
            <div class="current-section">
              <h3 class="section-title">
                <i
                  class="fa-solid fa-hourglass-half text-(--primary-color)"
                ></i>
                <span>{{ $t('cache.batchDelete.inProgress') }}</span>
              </h3>

              <div class="item-row processing">
                <i
                  class="fa-solid fa-spinner fa-spin text-(--primary-color)"
                ></i>
                <span class="item-title">{{ progress.currentItem }}</span>
              </div>
            </div>

            <!-- 失败项目列表 -->
            <div v-if="failedItems.length > 0" class="failed-section">
              <h3 class="section-title">
                <i class="fa-solid fa-times-circle text-red-500"></i>
                <span
                  >{{ $t('cache.batchDelete.failed') }} ({{
                    failedItems.length
                  }})</span
                >
              </h3>

              <div class="items-list">
                <div
                  v-for="(item, index) in failedItems"
                  :key="`failed-${index}`"
                  class="item-row failure"
                >
                  <i class="fa-solid fa-times text-red-500"></i>
                  <span class="item-title">{{ item }}</span>
                </div>
              </div>
            </div>

            <!-- 统计信息 -->
            <div class="statistics-section">
              <h3 class="section-title">
                <i class="fa-solid fa-chart-bar"></i>
                <span>{{ $t('cache.batchDelete.statistics') }}</span>
              </h3>

              <div class="stats-grid">
                <div class="stat-item">
                  <div class="stat-label">
                    {{ $t('cache.batchDelete.spaceFreed') }}
                  </div>
                  <div class="stat-value text-(--content-color)">
                    {{ formatFileSize(progress.spaceFreed) }}
                  </div>
                </div>

                <div class="stat-item">
                  <div class="stat-label">
                    {{ $t('cache.batchDelete.totalSize') }}
                  </div>
                  <div class="stat-value text-(--content-color)">
                    {{ formatFileSize(progress.totalSize) }}
                  </div>
                </div>

                <div class="stat-item">
                  <div class="stat-label">
                    {{ $t('cache.batchDelete.successCount') }}
                  </div>
                  <div class="stat-value text-green-500">
                    {{ progress.success }}
                  </div>
                </div>

                <div class="stat-item">
                  <div class="stat-label">
                    {{ $t('cache.batchDelete.failureCount') }}
                  </div>
                  <div class="stat-value text-red-500">
                    {{ progress.failed }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 对话框底部 -->
          <div
            class="sticky bottom-0 bg-(--solid-block-color) border-t border-(--split-color) p-6 flex justify-end gap-3"
          >
            <button
              class="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors font-medium"
              @click="handleCancel"
            >
              <i class="fa-solid fa-stop mr-2"></i>
              {{ $t('cache.batchDelete.cancelOperation') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ProgressBar } from '@/components';
import { formatFileSize, formatTimeSimple } from '@/utils/format';

const { t: $t } = useI18n();

// ============================================================================
// Props 和 Emits
// ============================================================================

interface BatchProgress {
  total: number;
  processed: number;
  success: number;
  failed: number;
  currentItem: string;
  estimatedTimeRemaining: number;
  spaceFreed: number;
  totalSize: number;
  completedItems: string[];
  failedItems: string[];
}

interface Props {
  visible: boolean;
  progress: BatchProgress;
}

interface Emits {
  (e: 'cancel'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// ============================================================================
// 计算属性
// ============================================================================

/**
 * 计算进度百分比
 */
const progressPercentage = computed(() => {
  if (props.progress.total === 0) return 0;
  return Math.round((props.progress.processed / props.progress.total) * 100);
});

/**
 * 获取已完成项目列表
 */
const completedItems = computed(() => {
  return props.progress.completedItems || [];
});

/**
 * 获取失败项目列表
 */
const failedItems = computed(() => {
  return props.progress.failedItems || [];
});

// ============================================================================
// 方法
// ============================================================================

/**
 * 处理取消操作
 */
function handleCancel() {
  emit('cancel');
}
</script>

<style scoped>
@reference 'tailwindcss';

/* 淡入淡出过渡 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 进度区域 */
.progress-section {
  @apply space-y-2;
}

/* 状态区域 */
.status-section {
  @apply space-y-3;
}

.section-title {
  @apply text-lg font-medium flex items-center gap-2 text-(--content-color);
}

.status-content {
  @apply bg-(--solid-button-color) rounded-lg p-4 border border-(--split-color);
}

.current-item {
  @apply space-y-1;
}

.item-name {
  @apply text-sm font-mono bg-(--solid-button-color) p-2 rounded border border-(--split-color) text-(--content-color);
  @apply break-all;
}

/* 项目列表 */
.items-list {
  @apply space-y-2 max-h-48 overflow-y-auto;
}

.item-row {
  @apply flex items-center gap-3 p-3 rounded-lg;
}

:root.dark .item-row.success {
  @apply bg-green-900/30 border border-green-700;
}

:root:not(.dark) .item-row.success {
  @apply bg-green-50 border border-green-200;
}

.item-row.processing {
  @apply bg-(--solid-button-color) border border-(--split-color);
}

:root.dark .item-row.failure {
  @apply bg-red-900/30 border border-red-700;
}

:root:not(.dark) .item-row.failure {
  @apply bg-red-50 border border-red-200;
}

.item-title {
  @apply flex-1 text-sm truncate text-(--content-color);
}

/* 已完成区域 */
.completed-section {
  @apply space-y-3;
}

/* 进行中区域 */
.current-section {
  @apply space-y-3;
}

/* 失败区域 */
.failed-section {
  @apply space-y-3;
}

/* 统计信息 */
.statistics-section {
  @apply space-y-3;
}

.stats-grid {
  @apply grid grid-cols-2 gap-4;
}

.stat-item {
  @apply bg-(--solid-button-color) rounded-lg p-4 text-center border border-(--split-color);
}

.stat-label {
  @apply text-sm text-(--desc-color) mb-2;
}

.stat-value {
  @apply text-2xl font-bold;
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
  .stats-grid {
    @apply grid-cols-1;
  }
}
</style>
