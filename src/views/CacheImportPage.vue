<template>
  <div class="cache-import-page">
    <h1 class="w-full mt-1.5 mb-auto">
      <i :class="[$fa.weight, 'fa-download']"></i>
      <span>{{ $t('cache.import.title') }}</span>
    </h1>

    <div class="flex w-full h-full mt-[22px] flex-1 gap-6 min-h-0">
      <!-- 主要内容区域 -->
      <div class="flex-1 flex flex-col gap-4">
        <!-- 目录选择区域 -->
        <div class="bg-(--block-color) rounded-lg p-6">
          <h2 class="text-lg font-medium mb-4">
            <i :class="[$fa.weight, 'fa-folder']"></i>
            <span>{{ $t('cache.import.selectDirectory') }}</span>
          </h2>

          <div class="flex flex-col gap-4">
            <!-- 目录路径显示 -->
            <div class="flex gap-3 items-center">
              <input
                v-model="selectedPath"
                type="text"
                :placeholder="$t('cache.import.directoryPlaceholder')"
                class="flex-1 px-3 py-2 bg-(--input-bg) border border-(--border-color) rounded-md text-sm"
                readonly
              />
              <button
                class="px-4 py-2 bg-(--primary-color) text-white rounded-md hover:opacity-80 transition-opacity"
                :disabled="isScanning || isImporting"
                @click="selectDirectory"
              >
                <i :class="[$fa.weight, 'fa-folder-open']"></i>
                <span>{{ $t('cache.import.browse') }}</span>
              </button>
            </div>

            <!-- 路径验证提示 -->
            <div
              v-if="selectedPath && !isValidPath"
              class="text-yellow-500 text-sm flex items-center gap-2"
            >
              <i :class="[$fa.weight, 'fa-triangle-exclamation']"></i>
              <span>{{ $t('cache.import.pathWarning') }}</span>
            </div>
          </div>
        </div>

        <!-- 导入选项配置 -->
        <div class="bg-(--block-color) rounded-lg p-6">
          <h2 class="text-lg font-medium mb-4">
            <i :class="[$fa.weight, 'fa-gear']"></i>
            <span>{{ $t('cache.import.options') }}</span>
          </h2>

          <div class="grid grid-cols-2 gap-4">
            <!-- 重复处理策略 -->
            <div class="flex flex-col gap-2">
              <span class="text-sm font-medium">{{
                $t('cache.import.duplicateHandling')
              }}</span>
              <Dropdown
                v-model="importOptions.duplicateHandling"
                :drop="[
                  { id: 'skip', name: $t('cache.import.duplicateSkip') },
                  {
                    id: 'overwrite',
                    name: $t('cache.import.duplicateOverwrite'),
                  },
                ]"
              />
            </div>

            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="importOptions.verifyIntegrity"
                type="checkbox"
                class="w-4 h-4"
              />
              <span class="text-sm">{{
                $t('cache.import.verifyIntegrity')
              }}</span>
            </label>

            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="importOptions.createPlaylist"
                type="checkbox"
                class="w-4 h-4"
              />
              <span class="text-sm">{{
                $t('cache.import.createPlaylist')
              }}</span>
            </label>

            <div class="flex items-center gap-2">
              <span class="text-sm"
                >{{ $t('cache.import.maxConcurrency') }}:</span
              >
              <input
                v-model.number="importOptions.maxConcurrency"
                type="number"
                min="1"
                max="8"
                class="w-16 px-2 py-1 bg-(--input-bg) border border-(--border-color) rounded text-sm"
              />
            </div>
          </div>
        </div>

        <!-- 扫描预览区域 -->
        <div v-if="scanResult" class="bg-(--block-color) rounded-lg p-6">
          <h2 class="text-lg font-medium mb-4">
            <i :class="[$fa.weight, 'fa-magnifying-glass']"></i>
            <span>{{ $t('cache.import.scanResult') }}</span>
          </h2>

          <div class="grid grid-cols-4 gap-4 mb-4">
            <div class="text-center">
              <div class="text-2xl font-bold text-(--primary-color)">
                {{ scanResult.totalDirectories }}
              </div>
              <div class="text-sm text-(--desc-color)">
                {{ $t('cache.import.totalFound') }}
              </div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-green-500">
                {{ scanResult.validDirectories }}
              </div>
              <div class="text-sm text-(--desc-color)">
                {{ $t('cache.import.validFound') }}
              </div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-red-500">
                {{ scanResult.invalidDirectories }}
              </div>
              <div class="text-sm text-(--desc-color)">
                {{ $t('cache.import.invalidFound') }}
              </div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-(--text-color)">
                {{ formatBytes(scanResult.estimatedTotalSize) }}
              </div>
              <div class="text-sm text-(--desc-color)">
                {{ $t('cache.import.totalSize') }}
              </div>
            </div>
          </div>

          <!-- 预览列表 -->
          <div
            v-if="scanResult.directories.length > 0"
            class="max-h-64 overflow-y-auto"
          >
            <div
              v-for="(dir, index) in scanResult.directories.slice(0, 10)"
              :key="index"
              class="flex items-center gap-3 p-3 border-b border-(--border-color) last:border-b-0"
            >
              <i
                :class="[
                  $fa.weight,
                  dir.isValid
                    ? 'fa-check-circle text-green-500'
                    : 'fa-times-circle text-red-500',
                ]"
              ></i>
              <div class="flex-1 min-w-0">
                <div v-if="dir.preview" class="font-medium truncate">
                  {{ dir.preview.title }}
                </div>
                <div class="text-sm text-(--desc-color) truncate">
                  {{ dir.path }}
                </div>
                <div
                  v-if="!dir.isValid && dir.invalidReason"
                  class="text-sm text-red-500"
                >
                  {{ dir.invalidReason }}
                </div>
              </div>
              <div v-if="dir.preview" class="text-sm text-(--desc-color)">
                {{ formatBytes(dir.preview.fileSize) }}
              </div>
            </div>

            <div
              v-if="scanResult.directories.length > 10"
              class="text-center py-2 text-sm text-(--desc-color)"
            >
              {{
                $t('cache.import.andMore', [scanResult.directories.length - 10])
              }}
            </div>
          </div>
        </div>

      </div>

      <!-- 侧边栏操作区域 -->
      <div
        class="flex flex-col w-32 gap-1.5 ml-auto pb-6 h-fit max-h-full overflow-y-auto"
      >
        <!-- 主要操作按钮 -->
        <button
          :disabled="!selectedPath || isScanning || isImporting"
          @click="scanDirectory"
        >
          <i
            :class="[
              $fa.weight,
              isScanning ? 'fa-spinner fa-spin' : 'fa-magnifying-glass',
            ]"
          ></i>
          <span>{{
            isScanning
              ? $t('cache.import.sidebar.scanning')
              : $t('cache.import.sidebar.scan')
          }}</span>
        </button>

        <button
          :disabled="
            !scanResult || scanResult.validDirectories === 0 || isImporting
          "
          class="bg-green-500 text-white hover:bg-green-600"
          @click="startImport"
        >
          <i
            :class="[
              $fa.weight,
              isImporting ? 'fa-spinner fa-spin' : 'fa-download',
            ]"
          ></i>
          <span>{{
            isImporting
              ? $t('cache.import.sidebar.importing')
              : $t('cache.import.sidebar.startImport')
          }}</span>
        </button>

        <button
          v-if="isImporting"
          class="bg-red-500 text-white hover:bg-red-600"
          @click="cancelImport"
        >
          <i :class="[$fa.weight, 'fa-stop']"></i>
          <span>{{ $t('cache.import.sidebar.cancel') }}</span>
        </button>

        <button :disabled="isScanning || isImporting" @click="resetForm">
          <i :class="[$fa.weight, 'fa-refresh']"></i>
          <span>{{ $t('cache.import.sidebar.reset') }}</span>
        </button>

        <!-- 扫描结果统计 -->
        <div
          v-if="scanResult"
          class="text-xs text-(--desc-color) space-y-0.5 mt-2"
        >
          <div class="flex justify-between">
            <span>{{ $t('cache.import.sidebar.found') }}:</span>
            <span class="font-medium">{{ scanResult.totalDirectories }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-green-500"
              >{{ $t('cache.import.sidebar.valid') }}:</span
            >
            <span class="font-medium text-green-500">{{
              scanResult.validDirectories
            }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-red-500"
              >{{ $t('cache.import.sidebar.invalid') }}:</span
            >
            <span class="font-medium text-red-500">{{
              scanResult.invalidDirectories
            }}</span>
          </div>
          <div
            class="flex justify-between pt-1 border-t border-(--border-color)"
          >
            <span>{{ $t('cache.import.sidebar.size') }}:</span>
            <span class="font-medium">{{
              formatBytes(scanResult.estimatedTotalSize)
            }}</span>
          </div>
        </div>

        <!-- 导入进度统计 -->
        <div
          v-if="importProgress"
          class="text-xs text-(--desc-color) space-y-0.5 mt-2 pt-2 border-t border-(--border-color)"
        >
          <div class="flex justify-between">
            <span>{{ $t('cache.import.sidebar.progress') }}:</span>
            <span class="font-medium">{{ importProgressPercentage }}%</span>
          </div>
          <div class="flex justify-between">
            <span class="text-green-500"
              >{{ $t('cache.import.sidebar.success') }}:</span
            >
            <span class="font-medium text-green-500">{{
              importProgress.successCount ?? 0
            }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-red-500"
              >{{ $t('cache.import.sidebar.failure') }}:</span
            >
            <span class="font-medium text-red-500">{{
              importProgress.failureCount ?? 0
            }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-yellow-500"
              >{{ $t('cache.import.sidebar.skipped') }}:</span
            >
            <span class="font-medium text-yellow-500">{{
              importProgress.skippedCount ?? 0
            }}</span>
          </div>
        </div>

        <!-- 简化的帮助信息 -->
        <div
          class="text-xs text-(--desc-color) mt-3 pt-2 border-t border-(--border-color)"
        >
          <div class="font-medium mb-1 text-(--text-color)">
            {{ $t('cache.import.sidebar.help') }}:
          </div>
          <div class="space-y-1">
            <div>{{ $t('cache.import.sidebar.step1') }}</div>
            <div>{{ $t('cache.import.sidebar.step2') }}</div>
            <div>{{ $t('cache.import.sidebar.step3') }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useCacheStore } from '@/store/cache';
import { cacheImportService, validateCachePath } from '@/services/cache';
import { formatBytes } from '@/utils/format';
import { AppError } from '@/services/error';
import { Dropdown } from '@/components';
import type * as Types from '@/types/cache.d';

const { t: $t } = useI18n();

// ============================================================================
// 状态管理
// ============================================================================

const cacheStore = useCacheStore();

// 表单状态
const selectedPath = ref<string>('');
const scanResult = ref<Types.ScanResult | null>(null);
const isScanning = ref(false);

// 导入选项
const importOptions = ref<Types.ImportOptions>({
  duplicateHandling: 'skip',
  verifyIntegrity: true,
  deleteAfterImport: false,
  createPlaylist: false,
  maxConcurrency: 4,
});

// ============================================================================
// 计算属性
// ============================================================================

const isValidPath = computed(() => {
  return selectedPath.value ? validateCachePath(selectedPath.value) : true;
});

const isImporting = computed(() => cacheStore.isImporting);
const importProgress = computed(() => cacheStore.importProgress);
const importProgressPercentage = computed(
  () => cacheStore.importProgressPercentage,
);

// ============================================================================
// 方法
// ============================================================================

/**
 * 选择缓存目录
 */
async function selectDirectory(): Promise<void> {
  try {
    const path = await cacheImportService.selectCacheDirectory();
    if (path) {
      selectedPath.value = path;
      // 清除之前的扫描结果
      scanResult.value = null;
    }
  } catch (error) {
    new AppError(error).handle();
  }
}

/**
 * 扫描缓存目录
 */
async function scanDirectory(): Promise<void> {
  if (!selectedPath.value) return;

  try {
    isScanning.value = true;
    scanResult.value = await cacheImportService.scanCacheDirectory(
      selectedPath.value,
    );
  } catch (error) {
    new AppError(error).handle();
    scanResult.value = null;
  } finally {
    isScanning.value = false;
  }
}

/**
 * 开始导入
 */
async function startImport(): Promise<void> {
  if (!selectedPath.value || !scanResult.value) return;

  try {
    await cacheStore.startImport(selectedPath.value, importOptions.value);
  } catch (error) {
    new AppError(error).handle();
  }
}

/**
 * 取消导入
 */
async function cancelImport(): Promise<void> {
  try {
    await cacheStore.cancelImport();
  } catch (error) {
    new AppError(error).handle();
  }
}

/**
 * 重置表单
 */
function resetForm(): void {
  selectedPath.value = '';
  scanResult.value = null;
  Object.assign(importOptions.value, {
    duplicateHandling: 'skip',
    verifyIntegrity: true,
    deleteAfterImport: false,
    createPlaylist: false,
    maxConcurrency: 4,
  });
}

// ============================================================================
// 生命周期
// ============================================================================

onMounted(() => {
  // 清除之前的错误状态
  cacheStore.clearError();
});

onUnmounted(() => {
  // 组件卸载时清理状态
  if (isImporting.value) {
    cacheStore.cancelImport().catch(console.error);
  }
});
</script>

<style scoped>
@reference 'tailwindcss';

.cache-import-page {
  @apply flex flex-col h-full p-4;
}

/* 自定义滚动条样式 */
.max-h-64::-webkit-scrollbar,
.max-h-32::-webkit-scrollbar {
  @apply w-2;
}

.max-h-64::-webkit-scrollbar-track,
.max-h-32::-webkit-scrollbar-track {
  @apply bg-gray-100 rounded;
}

.max-h-64::-webkit-scrollbar-thumb,
.max-h-32::-webkit-scrollbar-thumb {
  @apply bg-gray-400 rounded hover:bg-gray-500;
}

/* 侧边栏滚动条样式 */
.cache-import-page .w-32::-webkit-scrollbar {
  @apply w-1;
}

.cache-import-page .w-32::-webkit-scrollbar-thumb {
  @apply bg-(--scroller-color) rounded;
}

/* 缓存导入页面侧边栏按钮样式 */
.cache-import-page .w-32 button {
  @apply w-full px-2 py-2 text-sm rounded-lg transition-colors;
  @apply bg-(--button-color) text-(--text-color) hover:bg-(--hover-color);
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
  @apply flex items-center gap-2;
}

.cache-import-page .w-32 button i {
  @apply w-4 text-center;
}

.cache-import-page .w-32 button span {
  @apply flex-1 text-left;
}
</style>
