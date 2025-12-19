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
            <h2 class="text-lg font-semibold flex items-center gap-2">
              <i class="fa-solid fa-check-circle text-green-500"></i>
              <span class="text-(--content-color)">{{
                $t('cache.batchDelete.resultTitle')
              }}</span>
            </h2>
          </div>

          <!-- 对话框内容 -->
          <div class="p-6 space-y-6">
            <!-- 完成提示 -->
            <div class="completion-section">
              <div class="completion-box">
                <i class="fa-solid fa-check-circle text-green-500 text-2xl"></i>
                <div>
                  <div class="completion-title">
                    {{ $t('cache.batchDelete.completionTitle') }}
                  </div>
                  <div class="completion-desc">
                    {{ $t('cache.batchDelete.completionDesc') }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 操作统计 -->
            <div class="statistics-section">
              <h3 class="section-title">
                <i class="fa-solid fa-chart-bar"></i>
                <span>{{ $t('cache.batchDelete.statistics') }}</span>
              </h3>

              <div class="stats-grid">
                <div class="stat-item success">
                  <div class="stat-icon">
                    <i class="fa-solid fa-check text-green-500"></i>
                  </div>
                  <div class="stat-content">
                    <div class="stat-label">
                      {{ $t('cache.batchDelete.successCount') }}
                    </div>
                    <div class="stat-value text-green-600">
                      {{ result.successCount }}
                    </div>
                  </div>
                </div>

                <div class="stat-item failure">
                  <div class="stat-icon">
                    <i class="fa-solid fa-times text-red-500"></i>
                  </div>
                  <div class="stat-content">
                    <div class="stat-label">
                      {{ $t('cache.batchDelete.failureCount') }}
                    </div>
                    <div class="stat-value text-red-600">
                      {{ result.failedCount }}
                    </div>
                  </div>
                </div>

                <div class="stat-item">
                  <div class="stat-icon">
                    <i class="fa-solid fa-database text-(--desc-color)"></i>
                  </div>
                  <div class="stat-content">
                    <div class="stat-label">
                      {{ $t('cache.batchDelete.spaceFreed') }}
                    </div>
                    <div class="stat-value">
                      {{ formatFileSize(result.spaceFreed) }}
                    </div>
                  </div>
                </div>

                <div class="stat-item">
                  <div class="stat-icon">
                    <i
                      class="fa-solid fa-hourglass-end text-(--desc-color)"
                    ></i>
                  </div>
                  <div class="stat-content">
                    <div class="stat-label">
                      {{ $t('cache.batchDelete.duration') }}
                    </div>
                    <div class="stat-value">
                      {{ formatDuration(result.duration) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 失败详情 -->
            <div
              v-if="result.failures && result.failures.length > 0"
              class="failures-section"
            >
              <h3 class="section-title">
                <i class="fa-solid fa-exclamation-triangle text-red-500"></i>
                <span
                  >{{ $t('cache.batchDelete.failureDetails') }} ({{
                    result.failures.length
                  }})</span
                >
              </h3>

              <div class="failures-list">
                <div
                  v-for="(failure, index) in result.failures"
                  :key="`failure-${index}`"
                  class="failure-item"
                >
                  <div class="failure-header">
                    <i class="fa-solid fa-times-circle text-red-500"></i>
                    <span class="failure-title">{{ failure.itemTitle }}</span>
                  </div>
                  <div class="failure-error">
                    <span class="error-label"
                      >{{ $t('cache.batchDelete.errorMessage') }}:</span
                    >
                    <span class="error-text">{{ failure.error }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 建议信息 -->
            <div
              v-if="result.failures && result.failures.length > 0"
              class="suggestion-section"
            >
              <div class="suggestion-box">
                <i class="fa-solid fa-lightbulb text-blue-500 text-lg mt-1"></i>
                <div>
                  <div class="suggestion-title">
                    {{ $t('cache.batchDelete.suggestion') }}
                  </div>
                  <div class="suggestion-desc">
                    {{ $t('cache.batchDelete.suggestionDesc') }}
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
              v-if="result.failures && result.failures.length > 0"
              class="px-4 py-2 rounded-lg bg-(--solid-button-color) text-(--content-color) hover:bg-(--button-color) transition-colors font-medium"
              @click="handleCopyErrorLog"
            >
              <i class="fa-solid fa-copy mr-2"></i>
              {{ $t('cache.batchDelete.copyErrorLog') }}
            </button>

            <button
              class="px-4 py-2 rounded-lg bg-(--primary-color) text-white hover:opacity-90 transition-opacity font-medium"
              @click="handleConfirm"
            >
              <i class="fa-solid fa-check mr-2"></i>
              {{ $t('cache.batchDelete.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { formatFileSize } from '@/utils/format';

const { t: $t } = useI18n();

// ============================================================================
// Props 和 Emits
// ============================================================================

interface BatchDeleteFailure {
  itemId: string;
  itemTitle: string;
  error: string;
}

interface BatchDeleteResult {
  operationId: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
  failures: BatchDeleteFailure[];
  spaceFreed: number;
  duration: number;
}

interface Props {
  visible: boolean;
  result: BatchDeleteResult;
}

interface Emits {
  (e: 'confirm'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// ============================================================================
// 方法
// ============================================================================

/**
 * 格式化持续时间（毫秒转为可读格式）
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);

  if (seconds < 60) {
    return $t('cache.time.seconds', [seconds]);
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return $t('cache.time.minutesSeconds', [minutes, remainingSeconds]);
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return $t('cache.time.hoursMinutes', [hours, minutes]);
  }
}

/**
 * 生成错误日志文本
 */
function generateErrorLog(): string {
  const { t: $t } = useI18n();

  if (!props.result.failures || props.result.failures.length === 0) {
    return '';
  }

  const lines = [
    $t('cache.batchDelete.errorLogTitle'),
    `${$t('cache.batchDelete.operationId')}: ${props.result.operationId}`,
    `${$t('cache.batchDelete.time')}: ${new Date().toLocaleString()}`,
    ``,
    `${$t('cache.batchDelete.failedItems')} (${props.result.failures.length}):`,
    ``,
  ];

  props.result.failures.forEach((failure, index) => {
    lines.push(`${index + 1}. ${failure.itemTitle}`);
    lines.push(`   ${$t('cache.batchDelete.errorMessage')}: ${failure.error}`);
    lines.push(`   ID: ${failure.itemId}`);
    lines.push(``);
  });

  return lines.join('\n');
}

/**
 * 处理复制错误日志
 */
async function handleCopyErrorLog() {
  const errorLog = generateErrorLog();

  try {
    await navigator.clipboard.writeText(errorLog);
    // 复制成功，可以考虑添加视觉反馈
  } catch {
    // 复制失败，可以考虑添加错误提示
    console.error('复制错误日志失败');
  }
}

/**
 * 处理确认
 */
function handleConfirm() {
  emit('confirm');
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

/* 完成区域 */
.completion-section {
  @apply space-y-3;
}

.completion-box {
  @apply flex items-center gap-3 p-4 rounded-lg;
}

:root.dark .completion-box {
  @apply bg-green-900/30 border border-green-700;
}

:root:not(.dark) .completion-box {
  @apply bg-green-50 border border-green-200;
}

:root.dark .completion-title {
  @apply font-semibold text-green-300;
}

:root:not(.dark) .completion-title {
  @apply font-semibold text-green-900;
}

:root.dark .completion-desc {
  @apply text-sm text-green-400;
}

:root:not(.dark) .completion-desc {
  @apply text-sm text-green-700;
}

/* 统计信息 */
.statistics-section {
  @apply space-y-3;
}

.section-title {
  @apply text-lg font-medium flex items-center gap-2 text-(--content-color);
}

.stats-grid {
  @apply grid grid-cols-2 gap-4;
}

.stat-item {
  @apply bg-(--solid-button-color) rounded-lg p-4 flex items-center gap-3 border border-(--split-color);
}

/* 暗色模式下使用不透明背景 */
:root.dark .stat-item.success {
  @apply bg-green-900/30 border-green-700;
}

:root.dark .stat-item.failure {
  @apply bg-red-900/30 border-red-700;
}

/* 亮色模式保持原样 */
:root:not(.dark) .stat-item.success {
  @apply bg-green-50 border-green-200;
}

:root:not(.dark) .stat-item.failure {
  @apply bg-red-50 border-red-200;
}

.stat-icon {
  @apply text-2xl flex-shrink-0;
}

.stat-content {
  @apply flex-1;
}

.stat-label {
  @apply text-sm text-(--desc-color) mb-1;
}

.stat-value {
  @apply text-xl font-bold text-(--content-color);
}

/* 失败详情 */
.failures-section {
  @apply space-y-3;
}

.failures-list {
  @apply space-y-3 max-h-48 overflow-y-auto;
}

/* 暗色模式下使用不透明背景 */
:root.dark .failure-item {
  @apply bg-red-900/30 border border-red-700 rounded-lg p-4 space-y-2;
}

/* 亮色模式保持原样 */
:root:not(.dark) .failure-item {
  @apply bg-red-50 border border-red-200 rounded-lg p-4 space-y-2;
}

.failure-header {
  @apply flex items-center gap-2;
}

:root.dark .failure-title {
  @apply font-medium text-red-300 truncate;
}

:root:not(.dark) .failure-title {
  @apply font-medium text-red-900 truncate;
}

.failure-error {
  @apply flex flex-col gap-1 text-sm;
}

:root.dark .error-label {
  @apply text-red-400 font-medium;
}

:root:not(.dark) .error-label {
  @apply text-red-700 font-medium;
}

:root.dark .error-text {
  @apply text-red-300 font-mono bg-(--solid-button-color) p-2 rounded border border-red-700 break-all;
}

:root:not(.dark) .error-text {
  @apply text-red-600 font-mono bg-white p-2 rounded border border-red-200 break-all;
}

/* 建议区域 */
.suggestion-section {
  @apply space-y-3;
}

.suggestion-box {
  @apply flex items-start gap-3 p-4 rounded-lg;
}

:root.dark .suggestion-box {
  @apply bg-blue-900/30 border border-blue-700;
}

:root:not(.dark) .suggestion-box {
  @apply bg-blue-50 border border-blue-200;
}

:root.dark .suggestion-title {
  @apply font-semibold text-blue-300;
}

:root:not(.dark) .suggestion-title {
  @apply font-semibold text-blue-900;
}

:root.dark .suggestion-desc {
  @apply text-sm text-blue-400 mt-1;
}

:root:not(.dark) .suggestion-desc {
  @apply text-sm text-blue-700 mt-1;
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
