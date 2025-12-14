<template>
  <Teleport to="body">
    <!-- 模态框遮罩 -->
    <Transition name="modal">
      <div
        v-if="visible"
        class="modal-overlay"
        @click="handleCancel"
      >
        <!-- 对话框容器 -->
        <div
          class="modal-content"
          @click.stop
        >
          <!-- 对话框头部 -->
          <div class="modal-header">
            <h2 class="modal-title">
              <i :class="[$fa.weight, 'fa-folder-arrow-right']"></i>
              <span class="text-(--content-color)">{{ $t('transfer.cacheRootMigration') }}</span>
            </h2>
            <button
              class="close-btn"
              @click="handleCancel"
            >
              <i :class="[$fa.weight, 'fa-times']"></i>
            </button>
          </div>

          <!-- 对话框内容 -->
          <div class="modal-body space-y-6">
            <!-- 当前缓存根目录 -->
            <div class="space-y-3">
              <h3 class="text-sm font-medium text-(--content-color) flex items-center gap-2">
                <i :class="[$fa.weight, 'fa-folder']"></i>
                {{ $t('transfer.currentCacheRoot') }}
              </h3>
              <div class="bg-(--solid-button-color) rounded-lg p-4">
                <div class="p-3 rounded-lg bg-(--input-bg) border border-(--split-color)">
                  <div class="text-(--content-color) font-medium break-all">
                    {{ currentCacheRoot || $t('transfer.loading') }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 空间信息 -->
            <div
              v-if="cacheRootInfo"
              class="space-y-3"
            >
              <h3 class="text-sm font-medium text-(--content-color) flex items-center gap-2">
                <i :class="[$fa.weight, 'fa-chart-pie']"></i>
                {{ $t('transfer.spaceInfo') }}
              </h3>
              <div class="bg-(--solid-button-color) rounded-lg p-4 space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-(--desc-color)">{{ $t('transfer.totalSize') }}</span>
                  <span class="text-(--content-color) font-medium">{{ formatFileSize(cacheRootInfo.totalSize) }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-(--desc-color)">{{ $t('transfer.fileCount') }}</span>
                  <span class="text-(--content-color) font-medium">{{ cacheRootInfo.fileCount }}</span>
                </div>
              </div>
            </div>



            <!-- 新位置选择 -->
            <div class="space-y-3">
              <h3 class="text-sm font-medium text-(--content-color) flex items-center gap-2">
                <i :class="[$fa.weight, 'fa-arrow-right']"></i>
                {{ $t('transfer.selectNewLocation') }}
              </h3>

              <!-- 本地文件夹选择 -->
              <div class="bg-(--solid-button-color) rounded-lg p-4 space-y-3">
                <!-- 当前选择的路径 -->
                <div
                  v-if="selectedTarget"
                  class="p-3 rounded-lg bg-(--input-bg) border border-(--split-color)"
                >
                  <div class="text-sm text-(--desc-color) mb-1">{{ $t('transfer.selectedTarget') }}</div>
                  <div class="text-(--content-color) font-medium truncate">{{ selectedTarget.path }}</div>
                  <div
                    v-if="selectedTarget.available_space"
                    class="text-xs text-(--desc-color) mt-2"
                  >
                    {{ $t('transfer.availableSpace') }}: {{ formatFileSize(selectedTarget.available_space) }}
                  </div>
                </div>

                <!-- 浏览按钮 -->
                <button
                  class="w-full px-4 py-2 rounded-lg border border-(--border-color) text-(--content-color) hover:bg-(--hover-color) transition-colors flex items-center justify-center gap-2"
                  @click="handleBrowseFolder"
                >
                  <i :class="[$fa.weight, 'fa-folder-open']"></i>
                  {{ $t('transfer.selectFolder') }}
                </button>
              </div>
            </div>

            <!-- 空间检查警告 -->
            <div
              v-if="spaceWarning"
              class="warning-box"
            >
              <i :class="[$fa.weight, 'fa-exclamation-triangle']"></i>
              <div class="text-sm text-(--content-color)">{{ spaceWarning }}</div>
            </div>

            <!-- 错误信息 -->
            <div
              v-if="lastError"
              class="error-box"
            >
              <i :class="[$fa.weight, 'fa-exclamation-circle']"></i>
              <div class="text-sm text-(--content-color)">{{ lastError }}</div>
            </div>
          </div>

          <!-- 对话框底部 -->
          <div class="modal-footer flex justify-end gap-3">
            <button
              class="px-4 py-2 rounded-lg border border-(--border-color) text-(--content-color) hover:bg-(--hover-color) transition-colors"
              @click="handleCancel"
            >
              <i :class="[$fa.weight, 'fa-times']"></i>
              {{ $t('transfer.cancel') }}
            </button>
            <button
              class="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!selectedTarget || isValidating"
              @click="handleConfirm"
            >
              <i :class="[$fa.weight, 'fa-check']"></i>
              {{ $t('transfer.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTransferStore } from '@/store/transfer';
import type * as Types from '@/types/transfer.d';

// ============================================================================
// Props 和 Emits
// ============================================================================

interface Props {
  visible: boolean;
}

interface Emits {
  (e: 'confirm', target: Types.TransferTarget): void;
  (e: 'cancel'): void;
}

interface CacheRootInfo {
  totalSize: number;
  fileCount: number;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// ============================================================================
// 依赖注入
// ============================================================================

const { t } = useI18n();
const transferStore = useTransferStore();

// ============================================================================
// 状态
// ============================================================================


const isValidating = ref(false);
const selectedTarget = ref<Types.TransferTarget | null>(null);
const lastError = ref<string | null>(null);
const spaceWarning = ref<string | null>(null);
const cacheRootInfo = ref<CacheRootInfo | null>(null);

// ============================================================================
// 计算属性
// ============================================================================

/**
 * 当前缓存根目录
 */
const currentCacheRoot = computed(() => {
  return transferStore.currentCacheRoot;
});

/**
 * 可移动设备列表
 */


/**
 * Font Awesome 权重
 */
const $fa = computed(() => ({
  weight: 'fa-solid',
}));

// ============================================================================
// 生命周期
// ============================================================================

onMounted(async () => {
  if (props.visible) {
    await initialize();
  }
});

watch(
  () => props.visible,
  async (newVal) => {
    if (newVal) {
      await initialize();
    } else {
      reset();
    }
  },
);

// ============================================================================
// 方法
// ============================================================================

/**
 * 初始化对话框
 */
async function initialize() {
  try {
    lastError.value = null;
    spaceWarning.value = null;

    // 加载当前缓存根目录
    await transferStore.loadCurrentCacheRoot();



    // 计算缓存根目录信息（这里暂时使用占位符）
    // 实际实现需要后端支持
    cacheRootInfo.value = {
      totalSize: 0,
      fileCount: 0,
    };
  } catch (error) {
    lastError.value = error instanceof Error ? error.message : t('transfer.error');
    console.error('初始化对话框失败:', error);
  }
}





/**
 * 检查目标空间
 */
function checkSpace() {
  if (!selectedTarget.value || !cacheRootInfo.value) return;

  const availableSpace = selectedTarget.value.available_space || 0;
  const requiredSpace = cacheRootInfo.value.totalSize;

  if (availableSpace < requiredSpace) {
    spaceWarning.value = t('transfer.insufficientSpace', {
      required: formatFileSize(requiredSpace),
      available: formatFileSize(availableSpace),
    });
  } else {
    spaceWarning.value = null;
  }
}

/**
 * 浏览本地文件夹
 */
async function handleBrowseFolder() {
  try {
    lastError.value = null;
    
    // 调用文件夹选择对话框
    const folderPath = await transferStore.selectFolder();
    
    if (folderPath) {
      // 创建本地文件夹目标
      const localTarget: Types.TransferTarget = {
        id: `local_${Date.now()}`,
        name: folderPath.split(/[/\\]/).pop() || folderPath,
        device_type: 'LocalDrive',
        path: folderPath,
        available_space: undefined,
        connection_status: 'Connected',
      };
      
      selectedTarget.value = localTarget;
      
      // 检查空间
      checkSpace();
    }
  } catch (error) {
    lastError.value = error instanceof Error ? error.message : t('transfer.error');
    console.error('选择文件夹失败:', error);
  }
}

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
 * 处理确认按钮
 */
async function handleConfirm() {
  if (!selectedTarget.value) return;

  try {
    isValidating.value = true;
    lastError.value = null;

    // 验证目标
    const isValid = await transferStore.selectTarget(selectedTarget.value);
    if (!isValid) {
      lastError.value = t('transfer.invalidTarget');
      return;
    }

    emit('confirm', selectedTarget.value);
  } catch (error) {
    lastError.value = error instanceof Error ? error.message : t('transfer.error');
    console.error('确认失败:', error);
  } finally {
    isValidating.value = false;
  }
}

/**
 * 处理取消按钮
 */
function handleCancel() {
  reset();
  emit('cancel');
}

/**
 * 重置状态
 */
function reset() {
  selectedTarget.value = null;
  lastError.value = null;
  spaceWarning.value = null;

  isValidating.value = false;
}
</script>

<style scoped>
@reference 'tailwindcss';

/* 模态框遮罩 */
.modal-overlay {
  @apply fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4;
}

/* 模态框内容 */
.modal-content {
  @apply bg-(--solid-block-color) rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col;
}

/* 标题栏 */
.modal-header {
  @apply flex items-center justify-between p-6 border-b border-(--split-color) bg-(--solid-block-color);
}

.modal-title {
  @apply text-xl font-bold flex items-center gap-2 text-(--content-color);
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

/* 底部按钮 */
.modal-footer {
  @apply p-6 border-t border-(--split-color) bg-(--solid-block-color);
}

/* 设备项目 */
.device-item {
  @apply transition-all duration-200;
}

.device-item.selected {
  @apply bg-(--hover-color) rounded-lg;
}

/* 警告框 */
.warning-box {
  @apply bg-(--solid-button-color) border border-yellow-400/50 rounded-lg p-4 flex gap-3;
  @apply text-yellow-600;
}

/* 错误框 */
.error-box {
  @apply bg-(--solid-button-color) border border-red-400/50 rounded-lg p-4 flex gap-3;
  @apply text-red-500;
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
  .modal-content {
    @apply max-w-full m-2;
  }

  .modal-header {
    @apply p-4;
  }

  .modal-body {
    @apply p-4;
  }

  .modal-footer {
    @apply p-4;
  }

  .modal-footer .flex {
    @apply flex-col gap-2;
  }
}
</style>
