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
              <i class="fa-solid fa-right-left text-blue-500"></i>
              <span class="text-(--content-color)">{{
                $t('convert.title')
              }}</span>
            </h2>
            <button class="close-btn" @click="handleCancel">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>

          <!-- 对话框内容 -->
          <div class="modal-body space-y-6">
            <!-- 输出目录选择 -->
            <div class="space-y-3">
              <h3
                class="text-sm font-medium text-(--content-color) flex items-center gap-2"
              >
                <i class="fa-solid fa-folder"></i>
                {{ $t('convert.outputDir') }}
              </h3>

              <div class="bg-(--solid-button-color) rounded-lg p-4 space-y-3">
                <!-- 当前选择的路径 -->
                <div
                  v-if="outputDir"
                  class="p-3 rounded-lg bg-(--input-bg) border border-(--split-color)"
                >
                  <div class="text-sm text-(--desc-color) mb-1">
                    {{ $t('convert.selectedDir') }}
                  </div>
                  <div class="text-(--content-color) font-medium truncate">
                    {{ outputDir }}
                  </div>
                </div>

                <!-- 浏览按钮 -->
                <button
                  class="w-full px-4 py-2 rounded-lg border border-(--border-color) text-(--content-color) hover:bg-(--hover-color) transition-colors flex items-center justify-center gap-2"
                  @click="handleBrowseFolder"
                >
                  <i class="fa-solid fa-folder-open"></i>
                  {{ $t('convert.selectDir') }}
                </button>
              </div>
            </div>

            <!-- 磁盘空间检查 -->
            <div v-if="outputDir" class="space-y-3">
              <h3
                class="text-sm font-medium text-(--content-color) flex items-center gap-2"
              >
                <i class="fa-solid fa-hard-drive"></i>
                {{ $t('convert.diskSpace') }}
              </h3>

              <div class="bg-(--solid-button-color) rounded-lg p-4">
                <div v-if="isCheckingSpace" class="flex items-center gap-2">
                  <i class="fa-solid fa-spinner fa-spin text-blue-500"></i>
                  <span class="text-(--desc-color)">{{
                    $t('convert.checkingSpace')
                  }}</span>
                </div>

                <div v-else-if="diskSpaceCheck" class="space-y-2">
                  <div class="flex justify-between items-center">
                    <span class="text-(--desc-color)">{{
                      $t('convert.requiredSpace')
                    }}</span>
                    <span class="font-medium text-(--content-color)">{{
                      formatFileSize(diskSpaceCheck.requiredSpace)
                    }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-(--desc-color)">{{
                      $t('convert.availableSpace')
                    }}</span>
                    <span
                      class="font-medium"
                      :class="
                        diskSpaceCheck.isSufficient
                          ? 'text-green-500'
                          : 'text-red-500'
                      "
                      >{{ formatFileSize(diskSpaceCheck.availableSpace) }}</span
                    >
                  </div>

                  <!-- 空间不足警告 -->
                  <div
                    v-if="!diskSpaceCheck.isSufficient"
                    class="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2"
                  >
                    <i
                      class="fa-solid fa-exclamation-triangle text-red-500 mt-0.5"
                    ></i>
                    <span class="text-sm text-red-500">{{
                      $t('convert.insufficientSpace')
                    }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 转换配置选项 -->
            <div class="space-y-3">
              <h3
                class="text-sm font-medium text-(--content-color) flex items-center gap-2"
              >
                <i class="fa-solid fa-sliders"></i>
                {{ $t('convert.options') }}
              </h3>

              <div class="bg-(--solid-button-color) rounded-lg p-4 space-y-4">
                <!-- 视频质量 -->
                <div class="space-y-2">
                  <label class="text-sm text-(--desc-color)">{{
                    $t('convert.videoQuality')
                  }}</label>
                  <div class="flex gap-2 flex-wrap">
                    <button
                      v-for="option in videoQualityOptions"
                      :key="option.value"
                      class="px-3 py-1.5 rounded-lg text-sm transition-colors"
                      :class="
                        config.videoQuality === option.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-(--input-bg) text-(--content-color) hover:bg-(--hover-color)'
                      "
                      @click="config.videoQuality = option.value"
                    >
                      {{ option.label }}
                    </button>
                  </div>
                </div>

                <!-- 音频码率 -->
                <div class="space-y-2">
                  <label class="text-sm text-(--desc-color)">{{
                    $t('convert.audioBitrate')
                  }}</label>
                  <div class="flex gap-2 flex-wrap">
                    <button
                      v-for="option in audioBitrateOptions"
                      :key="option.value"
                      class="px-3 py-1.5 rounded-lg text-sm transition-colors"
                      :class="
                        config.audioBitrate === option.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-(--input-bg) text-(--content-color) hover:bg-(--hover-color)'
                      "
                      @click="config.audioBitrate = option.value"
                    >
                      {{ option.label }}
                    </button>
                  </div>
                </div>

                <!-- 弹幕格式 -->
                <div class="space-y-2">
                  <label class="text-sm text-(--desc-color)">{{
                    $t('convert.danmakuFormat')
                  }}</label>
                  <div class="flex gap-2 flex-wrap">
                    <button
                      v-for="option in danmakuFormatOptions"
                      :key="option.value"
                      class="px-3 py-1.5 rounded-lg text-sm transition-colors"
                      :class="
                        config.danmakuFormat === option.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-(--input-bg) text-(--content-color) hover:bg-(--hover-color)'
                      "
                      @click="config.danmakuFormat = option.value"
                    >
                      {{ option.label }}
                    </button>
                  </div>
                </div>

                <!-- 其他选项 -->
                <div class="space-y-3 pt-2 border-t border-(--split-color)">
                  <!-- 嵌入封面 -->
                  <label
                    class="flex items-center gap-3 cursor-pointer select-none"
                  >
                    <input
                      v-model="config.embedCover"
                      type="checkbox"
                      class="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                    />
                    <span class="text-sm text-(--content-color)">{{
                      $t('convert.embedCover')
                    }}</span>
                  </label>

                  <!-- 写入元数据 -->
                  <label
                    class="flex items-center gap-3 cursor-pointer select-none"
                  >
                    <input
                      v-model="config.writeMetadata"
                      type="checkbox"
                      class="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                    />
                    <span class="text-sm text-(--content-color)">{{
                      $t('convert.writeMetadata')
                    }}</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- 错误信息 -->
            <div v-if="lastError" class="error-box">
              <i class="fa-solid fa-exclamation-circle"></i>
              <div class="text-sm text-(--content-color)">{{ lastError }}</div>
            </div>
          </div>

          <!-- 对话框底部 -->
          <div class="modal-footer flex justify-end gap-3">
            <button
              class="px-4 py-2 rounded-lg border border-(--border-color) text-(--content-color) hover:bg-(--hover-color) transition-colors"
              @click="handleCancel"
            >
              <i class="fa-solid fa-times mr-2"></i>
              {{ $t('convert.cancel') }}
            </button>
            <button
              class="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!canConfirm"
              @click="handleConfirm"
            >
              <i class="fa-solid fa-check mr-2"></i>
              {{ $t('convert.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatFileSize } from '@/utils/format';
import { handleComponentError } from '@/utils/error-handler';
import * as converterService from '@/services/converter';
import * as transferService from '@/services/transfer';
import type {
  ConvertConfig,
  DiskSpaceCheck,
  VideoQuality,
  AudioBitrate,
  DanmakuFormat,
} from '@/services/backend';

// ============================================================================
// Props 和 Emits
// ============================================================================

interface Props {
  visible: boolean;
  cacheIds: string[];
}

interface Emits {
  (e: 'confirm', outputDir: string, config: ConvertConfig): void;
  (e: 'cancel'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// ============================================================================
// 依赖注入
// ============================================================================

const { t } = useI18n();

// ============================================================================
// 状态
// ============================================================================

const outputDir = ref<string>('');
const diskSpaceCheck = ref<DiskSpaceCheck | null>(null);
const isCheckingSpace = ref(false);
const lastError = ref<string | null>(null);

// 转换配置
const config = reactive<ConvertConfig>({
  videoQuality: 'original',
  audioBitrate: 'original',
  embedCover: true,
  danmakuFormat: 'none',
  writeMetadata: true,
});

// ============================================================================
// 选项配置
// ============================================================================

const videoQualityOptions = computed<
  Array<{ value: VideoQuality; label: string }>
>(() => [
  { value: 'original', label: t('convert.quality.original') },
  { value: 'high', label: t('convert.quality.high') },
  { value: 'standard', label: t('convert.quality.standard') },
]);

const audioBitrateOptions = computed<
  Array<{ value: AudioBitrate; label: string }>
>(() => [
  { value: 'original', label: t('convert.bitrate.original') },
  { value: 'kbps192', label: '192kbps' },
  { value: 'kbps128', label: '128kbps' },
]);

const danmakuFormatOptions = computed<
  Array<{ value: DanmakuFormat; label: string }>
>(() => [
  { value: 'none', label: t('convert.danmaku.none') },
  { value: 'xml', label: 'XML' },
  { value: 'ass', label: 'ASS' },
  { value: 'both', label: t('convert.danmaku.both') },
]);

// ============================================================================
// 计算属性
// ============================================================================

/**
 * 是否可以确认
 */
const canConfirm = computed(() => {
  return (
    outputDir.value &&
    !isCheckingSpace.value &&
    (!diskSpaceCheck.value || diskSpaceCheck.value.isSufficient)
  );
});

// ============================================================================
// 监听器
// ============================================================================

// 监听对话框显示状态，加载默认配置
watch(
  () => props.visible,
  async (visible) => {
    if (visible) {
      await loadDefaultConfig();
    } else {
      resetState();
    }
  },
);

// 监听输出目录变化，检查磁盘空间
watch(outputDir, async (newDir) => {
  if (newDir && props.cacheIds.length > 0) {
    await checkDiskSpace();
  } else {
    diskSpaceCheck.value = null;
  }
});

// ============================================================================
// 方法
// ============================================================================

/**
 * 加载默认配置
 */
async function loadDefaultConfig() {
  try {
    const defaultConfig = await converterService.getDefaultConvertConfig();
    Object.assign(config, defaultConfig);
  } catch (error) {
    handleComponentError(error, '加载默认配置', (msg) => {
      lastError.value = msg;
    });
  }
}

/**
 * 重置状态
 */
function resetState() {
  outputDir.value = '';
  diskSpaceCheck.value = null;
  isCheckingSpace.value = false;
  lastError.value = null;
}

/**
 * 浏览文件夹
 */
async function handleBrowseFolder() {
  try {
    lastError.value = null;
    const folderPath = await transferService.selectFolder();
    if (folderPath) {
      outputDir.value = folderPath;
    }
  } catch (error) {
    handleComponentError(error, '选择文件夹', (msg) => {
      lastError.value = msg;
    });
  }
}

/**
 * 检查磁盘空间
 */
async function checkDiskSpace() {
  if (!outputDir.value || props.cacheIds.length === 0) return;

  isCheckingSpace.value = true;
  lastError.value = null;

  try {
    diskSpaceCheck.value = await converterService.checkConvertSpace(
      props.cacheIds,
      outputDir.value,
    );
  } catch (error) {
    handleComponentError(error, '检查磁盘空间', (msg) => {
      lastError.value = msg;
    });
    diskSpaceCheck.value = null;
  } finally {
    isCheckingSpace.value = false;
  }
}

/**
 * 处理确认按钮
 */
function handleConfirm() {
  if (canConfirm.value) {
    emit('confirm', outputDir.value, { ...config });
  }
}

/**
 * 处理取消按钮
 */
function handleCancel() {
  resetState();
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
