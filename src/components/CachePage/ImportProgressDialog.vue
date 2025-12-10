<template>
  <Transition name="modal">
    <div v-if="visible" class="modal-overlay" @click="handleOverlayClick">
      <div class="modal-content" @click.stop>
        <!-- 标题栏 -->
        <div class="modal-header">
          <h2 class="modal-title">
            <i :class="[$fa.weight, 'fa-download']"></i>
            <span>{{ $t('cache.import.progressDialog.title') }}</span>
          </h2>
          
          <button
            v-if="!isImporting"
            class="close-btn"
            @click="close"
          >
            <i :class="[$fa.weight, 'fa-times']"></i>
          </button>
        </div>

        <!-- 进度内容 -->
        <div class="modal-body">
          <div v-if="progress" class="space-y-6">
            <!-- 总体进度 -->
            <div class="progress-section">
              <div class="flex justify-between items-center mb-2">
                <span class="text-lg font-medium">{{ $t('cache.import.overallProgress') }}</span>
                <span class="text-2xl font-bold text-(--primary-color)">{{ progressPercentage }}%</span>
              </div>
              
              <ProgressBar :progress="progressPercentage" class="h-3" />
              
              <div class="flex justify-between text-sm text-(--desc-color) mt-2">
                <span>{{ progress.processedDirectories }} / {{ progress.totalDirectories }}</span>
                <span v-if="progress.estimatedTimeRemaining">
                  {{ $t('cache.import.estimatedTime') }}: {{ formatTime(progress.estimatedTimeRemaining) }}
                </span>
              </div>
            </div>

            <!-- 当前状态 -->
            <div class="status-section">
              <h3 class="section-title">
                <i :class="[$fa.weight, 'fa-info-circle']"></i>
                <span>{{ $t('cache.import.currentStatus') }}</span>
              </h3>
              
              <div class="status-content">
                <div class="flex items-center gap-2 mb-2">
                  <i :class="[statusIcon, { 'fa-spin': isImporting }]"></i>
                  <span class="font-medium">{{ $t('cache.import.status.' + progress.status) }}</span>
                </div>
                
                <div class="current-directory">
                  <span class="text-sm text-(--desc-color)">{{ $t('cache.import.currentDirectory') }}:</span>
                  <div class="directory-path">{{ progress.currentDirectory }}</div>
                </div>
              </div>
            </div>

            <!-- 统计信息 -->
            <div class="statistics-section">
              <h3 class="section-title">
                <i :class="[$fa.weight, 'fa-chart-bar']"></i>
                <span>{{ $t('cache.import.statistics') }}</span>
              </h3>
              
              <div class="stats-grid">
                <div class="stat-item success">
                  <div class="stat-number">{{ progress.successCount }}</div>
                  <div class="stat-label">{{ $t('cache.import.success') }}</div>
                </div>
                
                <div class="stat-item failure">
                  <div class="stat-number">{{ progress.failureCount }}</div>
                  <div class="stat-label">{{ $t('cache.import.failure') }}</div>
                </div>
                
                <div class="stat-item skipped">
                  <div class="stat-number">{{ progress.skippedCount }}</div>
                  <div class="stat-label">{{ $t('cache.import.skipped') }}</div>
                </div>
              </div>
            </div>

            <!-- 错误列表 -->
            <div v-if="progress.errors.length > 0" class="errors-section">
              <h3 class="section-title">
                <i :class="[$fa.weight, 'fa-exclamation-triangle']"></i>
                <span>{{ $t('cache.import.errors') }} ({{ progress.errors.length }})</span>
              </h3>
              
              <div class="errors-list">
                <div
                  v-for="(error, index) in progress.errors.slice(0, maxErrorsToShow)"
                  :key="index"
                  class="error-item"
                >
                  <div class="error-header">
                    <i :class="[$fa.weight, 'fa-times-circle']"></i>
                    <span class="error-type">{{ $t('cache.import.errorType.' + error.errorType) }}</span>
                    <span class="error-time">{{ formatErrorTime(error.timestamp) }}</span>
                  </div>
                  
                  <div class="error-message">{{ error.message }}</div>
                  
                  <div class="error-path">{{ error.directoryPath }}</div>
                </div>
                
                <div v-if="progress.errors.length > maxErrorsToShow" class="more-errors">
                  <button
                    class="text-sm text-(--primary-color) hover:underline"
                    @click="toggleShowAllErrors"
                  >
                    {{ showAllErrors 
                      ? $t('cache.import.showLessErrors') 
                      : $t('cache.import.showMoreErrors', [progress.errors.length - maxErrorsToShow])
                    }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 完成状态 -->
          <div v-else-if="result" class="completion-section">
            <div class="completion-header">
              <i :class="[$fa.weight, completionIcon]" class="text-4xl"></i>
              <h3 class="text-xl font-bold">{{ completionTitle }}</h3>
            </div>
            
            <div class="completion-stats">
              <div class="stat-row">
                <span>{{ $t('cache.import.totalProcessed') }}:</span>
                <span class="font-medium">{{ result.totalFound }}</span>
              </div>
              <div class="stat-row success">
                <span>{{ $t('cache.import.successCount') }}:</span>
                <span class="font-medium">{{ result.successCount }}</span>
              </div>
              <div class="stat-row failure">
                <span>{{ $t('cache.import.failureCount') }}:</span>
                <span class="font-medium">{{ result.failureCount }}</span>
              </div>
              <div class="stat-row skipped">
                <span>{{ $t('cache.import.skippedCount') }}:</span>
                <span class="font-medium">{{ result.skippedCount }}</span>
              </div>
            </div>
            
            <div class="completion-time">
              <span>{{ $t('cache.import.totalTime') }}: {{ formatDuration(result.endTime.getTime() - result.startTime.getTime()) }}</span>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="modal-footer">
          <div class="flex justify-between w-full">
            <div>
              <button
                v-if="isImporting"
                class="btn btn-danger"
                @click="handleCancel"
              >
                <i :class="[$fa.weight, 'fa-stop']"></i>
                <span>{{ $t('cache.import.cancel') }}</span>
              </button>
            </div>
            
            <div class="flex gap-2">
              <button
                v-if="result"
                class="btn btn-primary"
                @click="viewResults"
              >
                <i :class="[$fa.weight, 'fa-list']"></i>
                <span>{{ $t('cache.import.viewResults') }}</span>
              </button>
              
              <button
                v-if="!isImporting"
                class="btn btn-secondary"
                @click="close"
              >
                <i :class="[$fa.weight, 'fa-times']"></i>
                <span>{{ $t('cache.import.close') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ProgressBar } from '@/components';
import type * as Types from '@/types/cache.d';

// ============================================================================
// Props 和 Emits
// ============================================================================

interface Props {
  visible: boolean;
  progress?: Types.ImportProgress | null;
  result?: Types.ImportResult | null;
}

interface Emits {
  (e: 'close'): void;
  (e: 'cancel'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// ============================================================================
// 路由
// ============================================================================

const router = useRouter();

// ============================================================================
// 响应式状态
// ============================================================================

const showAllErrors = ref(false);
const maxErrorsToShow = computed(() => showAllErrors.value ? Infinity : 5);

// ============================================================================
// 计算属性
// ============================================================================

const isImporting = computed(() => {
  return props.progress && ['Scanning', 'Parsing', 'Validating', 'Saving'].includes(props.progress.status);
});

const progressPercentage = computed(() => {
  if (!props.progress) return 0;
  if (props.progress.totalDirectories === 0) return 0;
  return Math.round((props.progress.processedDirectories / props.progress.totalDirectories) * 100);
});

const statusIcon = computed(() => {
  if (!props.progress) return 'fa-solid fa-check';
  
  switch (props.progress.status) {
    case 'Scanning':
      return 'fa-solid fa-magnifying-glass';
    case 'Parsing':
      return 'fa-solid fa-file-code';
    case 'Validating':
      return 'fa-solid fa-shield-check';
    case 'Saving':
      return 'fa-solid fa-database';
    case 'Completed':
      return 'fa-solid fa-check';
    case 'Cancelled':
      return 'fa-solid fa-stop';
    case 'Error':
      return 'fa-solid fa-exclamation-triangle';
    default:
      return 'fa-solid fa-spinner';
  }
});

const completionIcon = computed(() => {
  if (!props.result) return 'fa-check-circle text-green-500';
  
  const { failureCount, successCount } = props.result;
  if (failureCount === 0) return 'fa-check-circle text-green-500';
  if (successCount > 0) return 'fa-exclamation-triangle text-yellow-500';
  return 'fa-times-circle text-red-500';
});

const completionTitle = computed(() => {
  if (!props.result) return '';
  
  const { failureCount, successCount } = props.result;
  if (failureCount === 0) return '导入完成';
  if (successCount > 0) return '导入部分完成';
  return '导入失败';
});

// ============================================================================
// 方法
// ============================================================================

/**
 * 关闭对话框
 */
function close(): void {
  emit('close');
}

/**
 * 处理遮罩点击
 */
function handleOverlayClick(): void {
  if (!isImporting.value) {
    close();
  }
}

/**
 * 处理取消操作
 */
function handleCancel(): void {
  emit('cancel');
}

/**
 * 查看结果
 */
function viewResults(): void {
  close();
  router.push('/cache-list');
}

/**
 * 切换显示所有错误
 */
function toggleShowAllErrors(): void {
  showAllErrors.value = !showAllErrors.value;
}

/**
 * 格式化时间（秒转为可读格式）
 */
function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}分${remainingSeconds}秒`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}小时${minutes}分`;
  }
}

/**
 * 格式化持续时间（毫秒转为可读格式）
 */
function formatDuration(milliseconds: number): string {
  return formatTime(Math.floor(milliseconds / 1000));
}

/**
 * 格式化错误时间
 */
function formatErrorTime(timestamp: Date): string {
  return timestamp.toLocaleTimeString();
}

// ============================================================================
// 监听器
// ============================================================================

// 重置错误显示状态
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    showAllErrors.value = false;
  }
});
</script>

<style scoped>
@reference 'tailwindcss';

/* 模态框遮罩 */
.modal-overlay {
  @apply fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4;
}

/* 模态框内容 */
.modal-content {
  @apply bg-(--bg-color) rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col;
}

/* 标题栏 */
.modal-header {
  @apply flex items-center justify-between p-6 border-b border-(--border-color);
}

.modal-title {
  @apply text-xl font-bold flex items-center gap-2;
}

.close-btn {
  @apply w-8 h-8 rounded-full flex items-center justify-center;
  @apply text-(--desc-color) hover:text-(--text-color) hover:bg-(--hover-color);
  @apply transition-colors duration-200;
}

/* 主体内容 */
.modal-body {
  @apply flex-1 p-6 overflow-y-auto;
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
  @apply text-lg font-medium flex items-center gap-2;
}

.status-content {
  @apply bg-(--block-color) rounded-lg p-4;
}

.current-directory {
  @apply space-y-1;
}

.directory-path {
  @apply text-sm font-mono bg-(--input-bg) p-2 rounded border;
  @apply break-all;
}

/* 统计信息 */
.statistics-section {
  @apply space-y-3;
}

.stats-grid {
  @apply grid grid-cols-3 gap-4;
}

.stat-item {
  @apply text-center p-4 rounded-lg;
}

.stat-item.success {
  @apply bg-green-100 text-green-800;
}

.stat-item.failure {
  @apply bg-red-100 text-red-800;
}

.stat-item.skipped {
  @apply bg-yellow-100 text-yellow-800;
}

.stat-number {
  @apply text-2xl font-bold;
}

.stat-label {
  @apply text-sm;
}

/* 错误列表 */
.errors-section {
  @apply space-y-3;
}

.errors-list {
  @apply space-y-3 max-h-64 overflow-y-auto;
}

.error-item {
  @apply bg-red-50 border border-red-200 rounded-lg p-3;
}

.error-header {
  @apply flex items-center gap-2 text-sm text-red-600 mb-1;
}

.error-type {
  @apply font-medium;
}

.error-time {
  @apply ml-auto text-xs;
}

.error-message {
  @apply text-sm text-red-800 mb-2;
}

.error-path {
  @apply text-xs text-red-600 font-mono bg-red-100 p-1 rounded;
  @apply break-all;
}

.more-errors {
  @apply text-center py-2;
}

/* 完成状态 */
.completion-section {
  @apply text-center space-y-6;
}

.completion-header {
  @apply space-y-2;
}

.completion-stats {
  @apply space-y-2 max-w-sm mx-auto;
}

.stat-row {
  @apply flex justify-between py-1;
}

.stat-row.success {
  @apply text-green-600;
}

.stat-row.failure {
  @apply text-red-600;
}

.stat-row.skipped {
  @apply text-yellow-600;
}

.completion-time {
  @apply text-sm text-(--desc-color);
}

/* 底部按钮 */
.modal-footer {
  @apply p-6 border-t border-(--border-color);
}

.btn {
  @apply px-4 py-2 rounded-lg font-medium transition-all duration-200;
  @apply flex items-center gap-2;
}

.btn-primary {
  @apply bg-(--primary-color) text-white hover:opacity-80;
}

.btn-secondary {
  @apply bg-(--desc-color) text-white hover:opacity-80;
}

.btn-danger {
  @apply bg-red-500 text-white hover:bg-red-600;
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
.overflow-y-auto::-webkit-scrollbar {
  @apply w-2;
}

.overflow-y-auto::-webkit-scrollbar-track {
  @apply bg-gray-100 rounded;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  @apply bg-gray-400 rounded hover:bg-gray-500;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .modal-content {
    @apply max-w-full m-2;
  }
  
  .stats-grid {
    @apply grid-cols-1;
  }
  
  .modal-footer .flex {
    @apply flex-col gap-2;
  }
}
</style>