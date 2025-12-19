<template>
  <Teleport to="body">
    <!-- 模态框遮罩 -->
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click="handleCancel">
        <!-- 对话框容器 -->
        <div class="modal-content" @click.stop>
          <!-- 对话框头部 -->
          <div class="modal-header">
            <h2 class="modal-title">
              <i :class="[$fa.weight, operationIcon]"></i>
              <span class="text-(--content-color)">{{ operationTitle }}</span>
            </h2>
            <button class="close-btn" @click="handleCancel">
              <i :class="[$fa.weight, 'fa-times']"></i>
            </button>
          </div>

          <!-- 对话框内容 -->
          <div class="modal-body space-y-6">
            <!-- 文件夹选择 -->
            <!-- 本地文件夹部分 -->
            <div class="space-y-3">
              <h3
                class="text-sm font-medium text-(--content-color) flex items-center gap-2"
              >
                <i :class="[$fa.weight, 'fa-folder']"></i>
                {{ $t('transfer.localFolder') }}
              </h3>

              <!-- 本地文件夹选择 -->
              <div class="bg-(--solid-button-color) rounded-lg p-4 space-y-3">
                <!-- 当前选择的路径 -->
                <div
                  v-if="selectedTarget"
                  class="p-3 rounded-lg bg-(--input-bg) border border-(--split-color)"
                >
                  <div class="text-sm text-(--desc-color) mb-1">
                    {{ $t('transfer.selectedTarget') }}
                  </div>
                  <div class="text-(--content-color) font-medium truncate">
                    {{ selectedTarget.path }}
                  </div>
                </div>

                <!-- 浏览按钮 -->
                <button
                  class="w-full px-4 py-2 rounded-lg border border-(--border-color) text-(--content-color) hover:bg-(--hover-color) transition-colors flex items-center justify-center gap-2"
                  @click="handleBrowseFolder"
                >
                  <i :class="[$fa.weight, 'fa-folder-open']"></i>
                  {{ $t('transfer.selectTargetFolder') }}
                </button>
              </div>
            </div>

            <!-- 错误信息 -->
            <div v-if="lastError" class="error-box">
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
              :disabled="!selectedTarget"
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
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTransferStore } from '@/store/transfer';
import { handleComponentError } from '@/utils/error-handler';
import type * as Types from '@/types/transfer.d';

// ============================================================================
// Props 和 Emits
// ============================================================================

interface Props {
  visible: boolean;
  operation: Types.TransferOperation;
  transferType?: Types.TransferType;
}

interface Emits {
  (e: 'confirm', target: Types.TransferTarget): void;
  (e: 'cancel'): void;
}

const props = withDefaults(defineProps<Props>(), {
  transferType: 'individual',
});
const emit = defineEmits<Emits>();

// ============================================================================
// 依赖注入
// ============================================================================

const { t } = useI18n();
const transferStore = useTransferStore();

// ============================================================================
// 状态
// ============================================================================

const selectedTarget = ref<Types.TransferTarget | null>(null);
const lastError = ref<string | null>(null);

// ============================================================================
// 计算属性
// ============================================================================

/**
 * 操作标题
 */
const operationTitle = computed(() => {
  if (props.transferType === 'root_migration') {
    return t('transfer.cacheRootMigration');
  }
  return props.operation === 'Copy' ? t('transfer.copy') : t('transfer.cut');
});

/**
 * 操作图标
 */
const operationIcon = computed(() => {
  if (props.transferType === 'root_migration') {
    return 'fa-folder-arrow-up';
  }
  return props.operation === 'Copy' ? 'fa-copy' : 'fa-scissors';
});

/**
 * Font Awesome 权重
 */
const $fa = computed(() => ({
  weight: 'fa-solid',
}));

// ============================================================================
// 生命周期
// ============================================================================

// ============================================================================
// 方法
// ============================================================================

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
    }
  } catch (error) {
    handleComponentError(error, '选择文件夹', (msg) => {
      lastError.value = msg;
    });
  }
}

/**
 * 处理确认按钮
 */
function handleConfirm() {
  if (selectedTarget.value) {
    emit('confirm', selectedTarget.value);
  }
}

/**
 * 处理取消按钮
 */
function handleCancel() {
  selectedTarget.value = null;
  lastError.value = null;
  emit('cancel');
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
