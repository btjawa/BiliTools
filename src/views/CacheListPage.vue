<template>
  <div class="cache-list-page">
    <h1 class="w-full mt-1.5 mb-auto">
      <i :class="[$fa.weight, 'fa-sd-card']"></i>
      <span>{{ $t('cache.list.title') }}</span>
    </h1>

    <div class="flex w-full h-full mt-[22px] flex-1 gap-3 min-h-0">
      <!-- 主要内容区域 -->
      <div class="flex-1 flex flex-col gap-4 min-w-0">
        <!-- 搜索和筛选栏 -->
        <div class="bg-(--block-color) rounded-lg p-4">
          <!-- 基础搜索 -->
          <div class="flex gap-3 items-center">
            <!-- 搜索框 -->
            <div class="flex-1 relative">
              <i
                :class="[$fa.weight, 'fa-magnifying-glass']"
                class="absolute left-3 top-1/2 transform -translate-y-1/2 text-(--desc-color)"
              ></i>
              <input
                v-model="searchKeyword"
                type="text"
                :placeholder="$t('cache.list.searchPlaceholder')"
                class="w-full pl-10 pr-4 py-2 bg-(--input-bg) border border-(--border-color) rounded-md text-sm"
                @input="onSearchInput"
              />
            </div>

            <!-- 快速排序 -->
            <Dropdown
              v-model="selectedSort"
              :drop="[
                {
                  id: 'completionTime-desc',
                  name: $t('cache.list.sort.completionTimeDesc'),
                },
                {
                  id: 'completionTime-asc',
                  name: $t('cache.list.sort.completionTimeAsc'),
                },
                { id: 'title-asc', name: $t('cache.list.sort.titleAsc') },
                { id: 'title-desc', name: $t('cache.list.sort.titleDesc') },
                {
                  id: 'fileSize-desc',
                  name: $t('cache.list.sort.fileSizeDesc'),
                },
                { id: 'fileSize-asc', name: $t('cache.list.sort.fileSizeAsc') },
              ]"
            />
          </div>

          <!-- 高级筛选（可折叠） -->
          <Transition name="slide-down">
            <div
              v-if="showAdvancedFilters"
              class="mt-3 pt-3 border-t border-(--border-color)"
            >
              <div class="flex gap-3 items-center flex-wrap">
                <!-- UP主筛选 -->
                <Dropdown
                  v-model="selectedUploader"
                  :drop="[
                    { id: '', name: $t('cache.list.allUploaders') },
                    ...cacheStore.allUploaders.map((uploader) => ({
                      id: uploader,
                      name: uploader,
                    })),
                  ]"
                />

                <!-- 清除筛选 -->
                <button
                  v-if="hasActiveFilters"
                  class="px-3 py-2 text-sm text-(--desc-color) hover:text-(--text-color) transition-colors"
                  @click="clearFilters"
                >
                  <i :class="[$fa.weight, 'fa-times']"></i>
                  <span>{{ $t('cache.list.clearFilters') }}</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <!-- 批量操作栏 -->
        <Transition name="batch-action-bar">
          <BatchActionBar
            v-if="cacheStore.hasSelectedItems"
            :visible="true"
            :show-group-details="true"
            @select-all="cacheStore.selectAllCurrentPage"
            @unselect-all="cacheStore.unselectAllCurrentPage"
            @clear-selection="cacheStore.clearSelection"
            @batch-copy="startCopyOperation"
            @batch-cut="startCutOperation"
            @batch-delete="batchDelete"
            @batch-convert="startConvertOperation"
          />
        </Transition>

        <!-- 缓存列表 -->
        <div class="flex-1 min-h-0">
          <Transition name="slide">
            <div v-if="!cacheStore.isLoading" class="h-full">
              <!-- 空状态 -->
              <Empty
                v-if="cacheStore.paginatedDisplayItems.length === 0"
                :text="
                  hasActiveFilters
                    ? $t('cache.list.noResults')
                    : $t('cache.list.empty')
                "
              >
                <template v-if="!hasActiveFilters" #action>
                  <button
                    class="mt-4 px-4 py-2 bg-(--primary-color) text-white rounded-lg hover:opacity-80 transition-opacity pointer-events-auto"
                    @click="goToImport"
                  >
                    <i :class="[$fa.weight, 'fa-download']"></i>
                    <span>{{ $t('cache.list.startImport') }}</span>
                  </button>
                </template>
              </Empty>

              <!-- 混合列表（组和单个视频） -->
              <CacheMixedList
                v-else
                :items="cacheStore.paginatedDisplayItems"
                :search-query="searchKeyword"
                :selected-items="new Set(cacheStore.selectedItems)"
                :selected-videos="new Set(cacheStore.selectedItems)"
                :selected-groups="new Set(cacheStore.selectedGroupIds)"
                :range-preview="cacheStore.rangePreview"
                :range-preview-groups="cacheStore.rangePreviewGroups"
                :partially-selected-groups="
                  cacheStore.partiallySelectedGroupIds
                "
                :has-active-filters="hasActiveFilters"
                @go-to-import="goToImport"
                @select-video="cacheStore.toggleCacheItemSelection"
                @select-video-range="handleVideoRangeSelect"
                @convert-video="handleConvertFromContextMenu"
                @open-video-folder="openFolder"
                @delete-video="deleteItem"
                @copy-video="handleCopyFromContextMenu"
                @cut-video="handleCutFromContextMenu"
                @select-group="toggleGroupSelection"
                @select-group-range="handleGroupRangeSelect"
                @toggle-expand="cacheStore.toggleGroupExpansion"
                @open-group-folder="openGroupFolder"
                @delete-group="deleteGroup"
                @copy-group="handleCopyGroupFromContextMenu"
                @cut-group="handleCutGroupFromContextMenu"
              />
            </div>
          </Transition>

          <!-- 加载状态 -->
          <div
            v-if="cacheStore.isLoading"
            class="flex items-center justify-center h-full"
          >
            <div class="text-center">
              <i
                :class="[
                  $fa.weight,
                  'fa-spinner fa-spin text-2xl text-(--primary-color)',
                ]"
              ></i>
              <div class="mt-2 text-sm text-(--desc-color)">
                {{ $t('cache.list.loading') }}
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div
          v-if="cacheStore.pagination.totalPages > 1"
          class="bg-(--block-color) rounded-lg p-4"
        >
          <div class="flex items-center justify-between">
            <div class="text-sm text-(--desc-color)">
              {{
                $t('cache.list.pagination.info', [
                  (cacheStore.pagination.currentPage - 1) *
                    cacheStore.pagination.pageSize +
                    1,
                  Math.min(
                    cacheStore.pagination.currentPage *
                      cacheStore.pagination.pageSize,
                    cacheStore.pagination.totalCount,
                  ),
                  cacheStore.pagination.totalCount,
                ])
              }}
            </div>

            <div class="flex items-center gap-2">
              <button
                class="px-3 py-1 text-sm border border-(--border-color) rounded hover:bg-(--hover-color) transition-colors disabled:opacity-50"
                :disabled="cacheStore.pagination.currentPage === 1"
                @click="changePage(cacheStore.pagination.currentPage - 1)"
              >
                <i :class="[$fa.weight, 'fa-chevron-left']"></i>
              </button>

              <span class="px-3 py-1 text-sm">
                {{ cacheStore.pagination.currentPage }} /
                {{ cacheStore.pagination.totalPages }}
              </span>

              <button
                class="px-3 py-1 text-sm border border-(--border-color) rounded hover:bg-(--hover-color) transition-colors disabled:opacity-50"
                :disabled="
                  cacheStore.pagination.currentPage ===
                  cacheStore.pagination.totalPages
                "
                @click="changePage(cacheStore.pagination.currentPage + 1)"
              >
                <i :class="[$fa.weight, 'fa-chevron-right']"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 侧边栏 -->
      <div
        class="flex flex-col w-32 gap-1.5 ml-auto pb-6 h-fit max-h-full overflow-y-auto"
      >
        <!-- 状态筛选标签 -->
        <div class="tab">
          <button
            :class="{ active: selectedStatus === '' }"
            @click="setStatusFilter('')"
          >
            <span>{{ $t('cache.status.all') }}</span>
            <label class="primary-color"></label>
          </button>
          <button
            :class="{ active: selectedStatus === 'collection' }"
            @click="setStatusFilter('collection')"
          >
            <span>{{ $t('cache.status.collection') }}</span>
            <label class="primary-color"></label>
          </button>
        </div>

        <!-- 页数输入 -->
        <span class="text-sm">{{ $t('cache.list.page') }}</span>
        <input
          v-model="pageInput"
          type="number"
          :min="1"
          :max="cacheStore.pagination.totalPages"
          @input="handlePageInput"
          @keydown.enter="jumpToPage"
        />

        <!-- 快速操作按钮 -->
        <button :disabled="cacheStore.isLoading" @click="refreshList">
          <i
            :class="[
              $fa.weight,
              cacheStore.isLoading ? 'fa-spinner fa-spin' : 'fa-rotate-right',
            ]"
          ></i>
          <span>{{ $t('cache.sidebar.refresh') }}</span>
        </button>

        <button @click="toggleAdvancedFilters">
          <i :class="[$fa.weight, 'fa-filter-list']"></i>
          <span>{{ $t('cache.sidebar.moreFilters') }}</span>
        </button>

        <button @click="goToImport">
          <i :class="[$fa.weight, 'fa-download']"></i>
          <span>{{ $t('cache.sidebar.importMore') }}</span>
        </button>

        <button @click="exportList">
          <i :class="[$fa.weight, 'fa-file-export']"></i>
          <span>{{ $t('cache.sidebar.exportList') }}</span>
        </button>

        <!-- 传输操作按钮 -->
        <button @click="openCacheRootMigration">
          <i :class="[$fa.weight, 'fa-folder-arrow-up']"></i>
          <span>{{ $t('transfer.cacheRootMigration') }}</span>
        </button>

        <!-- 统计信息 -->
        <div class="text-xs text-(--desc-color) space-y-0.5 mt-1">
          <div class="flex justify-between">
            <span>{{ $t('cache.sidebar.total') }}:</span>
            <span class="font-medium">{{ cacheStore.totalCacheCount }}</span>
          </div>
          <div class="flex justify-between">
            <span>{{ $t('cache.sidebar.totalSize') }}:</span>
            <span class="font-medium">{{
              formatBytes(cacheStore.totalFileSize)
            }}</span>
          </div>
        </div>

        <!-- 选择操作（仅在有选中项时显示） -->
        <div
          v-if="cacheStore.hasSelectedItems"
          class="mt-2 pt-2 border-t border-(--border-color)"
        >
          <div class="text-xs text-(--desc-color) mb-1">
            {{
              $t('cache.sidebar.selectedItems', [cacheStore.selectedItemsCount])
            }}
          </div>
          <button
            class="w-full text-xs text-(--primary-color) hover:underline mb-1 text-left"
            @click="cacheStore.clearSelection"
          >
            {{ $t('cache.sidebar.clearSelection') }}
          </button>
          <button
            class="w-full text-xs text-blue-500 hover:underline text-left mb-1"
            @click="startConvertOperation"
          >
            <i :class="[$fa.weight, 'fa-right-left']"></i>
            <span>{{ $t('convert.title') }}</span>
          </button>
          <button
            class="w-full text-xs text-red-500 hover:underline text-left"
            @click="batchDelete"
          >
            <i :class="[$fa.weight, 'fa-trash']"></i>
            <span>{{ $t('cache.sidebar.batchDelete') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 批量删除确认对话框 -->
    <BatchDeleteDialog
      :visible="showDeleteConfirmDialog"
      :items-to-delete="itemsToDelete"
      @confirm="handleDeleteConfirm"
      @cancel="handleDeleteCancel"
    />

    <!-- 批量删除进度对话框 -->
    <BatchDeleteProgressDialog
      :visible="showDeleteProgressDialog"
      :progress="deleteProgress"
      @cancel="handleDeleteProgressCancel"
    />

    <!-- 批量删除结果对话框 -->
    <BatchDeleteResultDialog
      :visible="showDeleteResultDialog"
      :result="deleteResult"
      @confirm="handleDeleteResultConfirm"
    />

    <!-- 传输对话框 -->
    <TransferDialog
      :visible="showTransferDialog"
      :operation="currentTransferOperation"
      :transfer-type="currentTransferType"
      @confirm="handleTransferConfirm"
      @cancel="handleTransferCancel"
    />

    <!-- 传输进度对话框 -->
    <TransferProgressDialog
      :visible="showTransferProgressDialog"
      @close="showTransferProgressDialog = false"
    />

    <!-- 缓存根目录迁移对话框 -->
    <CacheRootMigrationDialog
      :visible="showCacheRootMigrationDialog"
      @confirm="handleCacheRootMigrationConfirm"
      @cancel="handleCacheRootMigrationCancel"
    />

    <!-- 转换对话框 -->
    <ConvertDialog
      :visible="showConvertDialog"
      :cache-ids="convertCacheIds"
      @confirm="handleConvertConfirm"
      @cancel="handleConvertCancel"
    />

    <!-- 转换进度对话框 -->
    <ConvertProgressDialog
      :visible="showConvertProgressDialog"
      :task-ids="convertTaskIds"
      @close="handleConvertProgressClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import * as dialog from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useCacheStore } from '@/store/cache';
import { useTransferStore } from '@/store/transfer';
import { cacheManagementService } from '@/services/cache';
import { formatBytes } from '@/utils/format';
import { AppError } from '@/services/error';
import { AppLog } from '@/services/utils';
import { transformCacheRecord } from '@/utils/transform';
import {
  Empty,
  CacheMixedList,
  BatchDeleteDialog,
  BatchDeleteProgressDialog,
  BatchDeleteResultDialog,
  BatchActionBar,
  Dropdown,
} from '@/components';
import {
  TransferDialog,
  TransferProgressDialog,
  CacheRootMigrationDialog,
  ConvertDialog,
  ConvertProgressDialog,
} from '@/components/CachePage';
import {
  initializeCacheKeyboardShortcuts,
  cleanupCacheKeyboardShortcuts,
} from '@/services/keyboard';
import type * as Types from '@/types/cache.d';
import type * as TransferTypes from '@/types/transfer.d';
import type { ConvertConfig } from '@/services/backend';
import * as converterService from '@/services/converter';

// ============================================================================
// 路由和状态管理
// ============================================================================

const router = useRouter();
const { t: $t } = useI18n();
const cacheStore = useCacheStore();
const transferStore = useTransferStore();

// ============================================================================
// 响应式状态
// ============================================================================

// 搜索和筛选状态
const searchKeyword = ref<string>('');
const selectedStatus = ref<string>('');
const selectedUploader = ref<string>('');
const selectedSort = ref<string>('completionTime-desc');

// 监听排序和筛选变化
watch(selectedSort, () => {
  applySort();
});

watch(selectedUploader, () => {
  applyFilters();
});

// 页面输入状态
const pageInput = ref<number>(1);

// 高级筛选显示状态
const showAdvancedFilters = ref<boolean>(false);

// 防抖搜索定时器
let searchTimeout: number | null = null;

// 批量删除对话框状态
const showDeleteConfirmDialog = ref(false);
const showDeleteProgressDialog = ref(false);
const showDeleteResultDialog = ref(false);

// 批量删除相关状态
const itemsToDelete = ref<
  Array<{
    type: 'video' | 'group';
    data: Types.CacheItem | Types.CacheGroup;
  }>
>([]);

const deleteProgress = ref<{
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
}>({
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  currentItem: '',
  estimatedTimeRemaining: 0,
  spaceFreed: 0,
  totalSize: 0,
  completedItems: [],
  failedItems: [],
});

const deleteResult = ref<{
  operationId: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
  failures: Array<{
    itemId: string;
    itemTitle: string;
    error: string;
  }>;
  spaceFreed: number;
  duration: number;
}>({
  operationId: '',
  totalCount: 0,
  successCount: 0,
  failedCount: 0,
  failures: [],
  spaceFreed: 0,
  duration: 0,
});

let deleteStartTime = 0;
let deleteAbortController: AbortController | null = null;

// 传输相关状态
const showTransferDialog = ref(false);
const showTransferProgressDialog = ref(false);
const showCacheRootMigrationDialog = ref(false);
const currentTransferOperation = ref<TransferTypes.TransferOperation>('Copy');
const currentTransferType = ref<TransferTypes.TransferType>('individual');

// 转换相关状态
const showConvertDialog = ref(false);
const showConvertProgressDialog = ref(false);
const convertCacheIds = ref<string[]>([]);
const convertTaskIds = ref<string[]>([]);

// ============================================================================
// 计算属性
// ============================================================================

const hasActiveFilters = computed(() => {
  return !!(
    searchKeyword.value ||
    selectedStatus.value ||
    selectedUploader.value
  );
});

// ============================================================================
// 方法
// ============================================================================

/**
 * 搜索输入处理（防抖）
 */
function onSearchInput(): void {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  searchTimeout = setTimeout(() => {
    applyFilters();
  }, 300);
}

/**
 * 应用筛选条件
 * 需求 7.1: 搜索过滤时保持已选中项目的选择状态
 */
function applyFilters(): void {
  // 保存当前选择状态（需求 7.1）
  const previousSelection = [...cacheStore.selectedItems];

  const filter: Types.CacheFilter = {
    keyword: searchKeyword.value || undefined,
    status: selectedStatus.value
      ? [selectedStatus.value as Types.CacheStatus]
      : undefined,
    uploader: selectedUploader.value || undefined,
  };

  cacheStore.clearFilter();
  cacheStore.setFilter(filter);
  loadCacheList();

  // 在加载完成后恢复选择状态（需求 7.1）
  // 注意：这里使用 setTimeout 确保在列表加载完成后恢复
  setTimeout(() => {
    // 恢复之前的选择状态
    previousSelection.forEach((itemId) => {
      if (!cacheStore.selectedItems.includes(itemId)) {
        cacheStore.selectedItems.push(itemId);
      }
    });
  }, 0);
}

/**
 * 应用排序
 * 需求 7.1: 排序时保持已选中项目的选择状态
 */
function applySort(): void {
  // 保存当前选择状态（需求 7.1）
  const previousSelection = [...cacheStore.selectedItems];

  const [field, direction] = selectedSort.value.split('-') as [
    Types.SortField,
    Types.SortDirection,
  ];
  cacheStore.setSort({ field, direction });
  loadCacheList();

  // 在加载完成后恢复选择状态（需求 7.1）
  // 注意：这里使用 setTimeout 确保在列表加载完成后恢复
  setTimeout(() => {
    // 恢复之前的选择状态
    previousSelection.forEach((itemId) => {
      if (!cacheStore.selectedItems.includes(itemId)) {
        cacheStore.selectedItems.push(itemId);
      }
    });
  }, 0);
}

/**
 * 清除筛选条件
 * 需求 7.1: 清除筛选时保持已选中项目的选择状态
 */
function clearFilters(): void {
  // 保存当前选择状态（需求 7.1）
  const previousSelection = [...cacheStore.selectedItems];

  searchKeyword.value = '';
  selectedStatus.value = '';
  selectedUploader.value = '';
  cacheStore.clearFilter();
  loadCacheList();

  // 在加载完成后恢复选择状态（需求 7.1）
  // 注意：这里使用 setTimeout 确保在列表加载完成后恢复
  setTimeout(() => {
    // 恢复之前的选择状态
    previousSelection.forEach((itemId) => {
      if (!cacheStore.selectedItems.includes(itemId)) {
        cacheStore.selectedItems.push(itemId);
      }
    });
  }, 0);
}

/**
 * 切换页码
 */
function changePage(page: number): void {
  cacheStore.setPagination(page);
  pageInput.value = page;
  loadCacheList();
}

/**
 * 设置状态筛选
 */
function setStatusFilter(status: string): void {
  selectedStatus.value = status;
  applyFilters();
}

/**
 * 处理页面输入
 */
function handlePageInput(): void {
  // 限制输入范围
  if (pageInput.value < 1) {
    pageInput.value = 1;
  } else if (pageInput.value > cacheStore.pagination.totalPages) {
    pageInput.value = cacheStore.pagination.totalPages;
  }
}

/**
 * 跳转到指定页面
 */
function jumpToPage(): void {
  if (
    pageInput.value >= 1 &&
    pageInput.value <= cacheStore.pagination.totalPages
  ) {
    changePage(pageInput.value);
  }
}

/**
 * 切换高级筛选显示
 */
function toggleAdvancedFilters(): void {
  showAdvancedFilters.value = !showAdvancedFilters.value;
}

/**
 * 加载缓存列表
 */
async function loadCacheList(): Promise<void> {
  try {
    await cacheStore.loadDisplayItems();
  } catch (error) {
    new AppError(error).handle();
  }
}

/**
 * 刷新列表
 * 增量扫描缓存根目录，检测新增或删除的视频
 */
async function refreshList(): Promise<void> {
  try {
    // 清除选择状态
    cacheStore.clearSelection();

    // 执行增量扫描
    const result = await cacheStore.incrementalScanCacheRoot();

    // 未设置缓存根目录时显示提示
    if (!result.scannedRoot) {
      AppLog($t('cache.incrementalScan.cacheRootNotSet'), 'info');
      return;
    }

    // 显示扫描结果
    if (result.newDirectoriesCount > 0 || result.deletedDirectoriesCount > 0) {
      const message = `${$t('cache.incrementalScan.success')}: ${$t('cache.incrementalScan.importedCount')} ${result.importedCount}, ${$t('cache.incrementalScan.cleanedCount')} ${result.cleanedCount}`;
      AppLog(message, 'success');
    } else {
      AppLog($t('cache.incrementalScan.noChanges'), 'info');
    }
  } catch (error) {
    new AppError(error).handle();
  }
}

/**
 * 导出列表
 */
async function exportList(): Promise<void> {
  try {
    const filePath = await cacheManagementService.exportCacheList(
      cacheStore.currentFilter,
    );
    // 显示成功消息
    new AppError(`列表已导出到: ${filePath}`, { name: 'success' }).handle();
  } catch (error) {
    new AppError(error).handle();
  }
}

/**
 * 跳转到导入页面
 */
function goToImport(): void {
  router.push('/cache-import');
}

/**
 * 打开文件夹
 */
async function openFolder(item: Types.CacheItem): Promise<void> {
  try {
    await cacheStore.openCacheFolder(item);
  } catch (error) {
    new AppError(error).handle();
  }
}

/**
 * 删除缓存项
 */
async function deleteItem(item: Types.CacheItem): Promise<void> {
  try {
    // 确认删除
    const confirmed = await dialog.ask(`确定要删除 "${item.title}" 吗？`, {
      title: '删除确认',
      kind: 'warning',
    });

    if (!confirmed) {
      return;
    }

    await cacheStore.deleteCacheItem(item.id);
  } catch (error) {
    new AppError(error).handle();
  }
}

/**
 * 批量删除 - 显示确认对话框
 */
async function batchDelete(): Promise<void> {
  try {
    // 检查是否有选中的项目
    if (cacheStore.selectedItems.length === 0) {
      new AppError('没有选中任何项目', { name: 'warning' }).handle();
      return;
    }

    // 从后端获取所有显示项（支持跨页选择）
    const allRawItems = (await invoke(
      'get_cache_display_items',
    )) as Types.DisplayItemRaw[];

    // 提取所有视频项
    const allCacheItems: Types.CacheItem[] = allRawItems
      .filter(
        (item): item is { type: 'single_video'; video: Types.CacheRecordRaw } =>
          item.type === 'single_video' && !!item.video,
      )
      .map((item) => transformCacheRecord(item.video));

    // 创建 ID 到缓存项的映射，方便快速查找
    const cacheItemMap = new Map<string, Types.CacheItem>();
    for (const item of allCacheItems) {
      cacheItemMap.set(item.id, item);
    }

    // 构建要删除的项目列表
    const itemsToDeleteList: Array<{
      type: 'video' | 'group';
      data: Types.CacheItem | Types.CacheGroup;
    }> = [];

    // 从选中的项目中构建删除列表
    for (const selectedId of cacheStore.selectedItems) {
      const cacheItem = cacheItemMap.get(selectedId);
      if (cacheItem) {
        itemsToDeleteList.push({
          type: 'video',
          data: cacheItem,
        });
      }
    }

    if (itemsToDeleteList.length === 0) {
      new AppError('没有选中任何项目', { name: 'warning' }).handle();
      return;
    }

    // 显示确认对话框
    itemsToDelete.value = itemsToDeleteList;
    showDeleteConfirmDialog.value = true;
  } catch (error) {
    new AppError(error).handle();
  }
}

/**
 * 处理删除确认
 */
async function handleDeleteConfirm(): Promise<void> {
  try {
    showDeleteConfirmDialog.value = false;

    // 初始化进度信息
    deleteStartTime = Date.now();
    deleteAbortController = new AbortController();

    const totalItems = itemsToDelete.value.length;
    let totalSize = 0;

    // 计算总大小
    for (const item of itemsToDelete.value) {
      if (item.type === 'group') {
        totalSize += (item.data as Types.CacheGroup).totalFileSize;
      } else {
        totalSize += (item.data as Types.CacheItem).fileSize;
      }
    }

    deleteProgress.value = {
      total: totalItems,
      processed: 0,
      success: 0,
      failed: 0,
      currentItem: '',
      estimatedTimeRemaining: 0,
      spaceFreed: 0,
      totalSize,
      completedItems: [],
      failedItems: [],
    };

    // 显示进度对话框
    showDeleteProgressDialog.value = true;

    // 执行删除操作
    const failures: Array<{
      itemId: string;
      itemTitle: string;
      error: string;
    }> = [];

    for (let i = 0; i < itemsToDelete.value.length; i++) {
      if (deleteAbortController.signal.aborted) {
        break;
      }

      const item = itemsToDelete.value[i];
      const itemTitle =
        item.type === 'group'
          ? (item.data as Types.CacheGroup).title
          : (item.data as Types.CacheItem).title;

      deleteProgress.value.currentItem = itemTitle;

      try {
        if (item.type === 'group') {
          const group = item.data as Types.CacheGroup;
          const videoIds = group.videos.map((v) => v.id);
          const results = await cacheStore.batchDeleteCacheItems(videoIds);

          const successCount = results.filter((r) => r.success).length;
          deleteProgress.value.success += successCount;
          deleteProgress.value.failed += results.length - successCount;

          // 收集失败信息
          results.forEach((result, index) => {
            if (!result.success) {
              failures.push({
                itemId: videoIds[index],
                itemTitle: group.videos[index].title,
                error: result.error || '未知错误',
              });
            }
          });

          deleteProgress.value.completedItems.push(itemTitle);
        } else {
          const video = item.data as Types.CacheItem;
          const results = await cacheStore.batchDeleteCacheItems([video.id]);

          if (results[0].success) {
            deleteProgress.value.success++;
            deleteProgress.value.completedItems.push(itemTitle);
          } else {
            deleteProgress.value.failed++;
            deleteProgress.value.failedItems.push(itemTitle);
            failures.push({
              itemId: video.id,
              itemTitle,
              error: results[0].error || '未知错误',
            });
          }
        }
      } catch (error) {
        deleteProgress.value.failed++;
        deleteProgress.value.failedItems.push(itemTitle);
        failures.push({
          itemId:
            item.type === 'group'
              ? (item.data as Types.CacheGroup).groupId
              : (item.data as Types.CacheItem).id,
          itemTitle,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }

      deleteProgress.value.processed = i + 1;

      // 计算预计剩余时间
      const elapsedTime = (Date.now() - deleteStartTime) / 1000;
      const avgTimePerItem = elapsedTime / deleteProgress.value.processed;
      const remainingItems =
        deleteProgress.value.total - deleteProgress.value.processed;
      deleteProgress.value.estimatedTimeRemaining =
        avgTimePerItem * remainingItems;

      // 计算已释放空间
      const processedItems = itemsToDelete.value.slice(0, i + 1);
      deleteProgress.value.spaceFreed = processedItems.reduce((sum, item) => {
        if (item.type === 'group') {
          return sum + (item.data as Types.CacheGroup).totalFileSize;
        } else {
          return sum + (item.data as Types.CacheItem).fileSize;
        }
      }, 0);
    }

    // 隐藏进度对话框，显示结果对话框
    showDeleteProgressDialog.value = false;

    const duration = Date.now() - deleteStartTime;

    deleteResult.value = {
      operationId: `delete-${Date.now()}`,
      totalCount: itemsToDelete.value.length,
      successCount: deleteProgress.value.success,
      failedCount: deleteProgress.value.failed,
      failures,
      spaceFreed: deleteProgress.value.spaceFreed,
      duration,
    };

    showDeleteResultDialog.value = true;

    // 清除选择状态（需求 7.4: 批量删除完成后自动清除选择状态）
    cacheStore.clearSelection();

    // 刷新列表
    await loadCacheList();
  } catch (error) {
    showDeleteProgressDialog.value = false;
    new AppError(error).handle();
  }
}

/**
 * 处理删除取消
 */
function handleDeleteCancel(): void {
  showDeleteConfirmDialog.value = false;
}

/**
 * 处理删除进度取消
 */
function handleDeleteProgressCancel(): void {
  if (deleteAbortController) {
    deleteAbortController.abort();
  }
  showDeleteProgressDialog.value = false;
}

/**
 * 处理删除结果确认
 */
function handleDeleteResultConfirm(): void {
  showDeleteResultDialog.value = false;
}

/**
 * 切换组选择状态
 */
function toggleGroupSelection(groupId: string): void {
  cacheStore.toggleGroupSelection(groupId);
}

/**
 * 处理视频范围选择
 */
function handleVideoRangeSelect(videoId: string): void {
  cacheStore.selectRange(videoId, 'video');
}

/**
 * 处理组范围选择
 */
function handleGroupRangeSelect(groupId: string): void {
  cacheStore.selectRange(groupId, 'group');
}

/**
 * 打开组文件夹
 */
async function openGroupFolder(group: Types.CacheGroup): Promise<void> {
  try {
    await cacheStore.openGroupFolder(group.groupId);
  } catch (error) {
    new AppError(error).handle();
  }
}

/**
 * 删除整个组
 */
async function deleteGroup(group: Types.CacheGroup): Promise<void> {
  try {
    // 确认删除
    const confirmed = await dialog.ask(
      $t('cache.group.confirmDeleteGroup', [group.videoCount]),
      {
        title: '删除确认',
        kind: 'warning',
      },
    );

    if (!confirmed) {
      return;
    }

    const results = await cacheStore.deleteGroup(group.groupId);

    // 显示结果
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    if (failureCount > 0) {
      new AppError(
        `删除组完成：成功 ${successCount} 个，失败 ${failureCount} 个`,
        { name: 'warning' },
      ).handle();
    }
  } catch (error) {
    new AppError(error).handle();
  }
}

// ============================================================================
// 传输相关方法
// ============================================================================

/**
 * 开始复制操作
 * 需求 1.1: 在右键菜单中添加复制选项
 */
async function startCopyOperation(): Promise<void> {
  try {
    if (cacheStore.selectedItems.length === 0) {
      new AppError('请先选择要复制的缓存', { name: 'warning' }).handle();
      return;
    }

    currentTransferOperation.value = 'Copy';
    currentTransferType.value = 'individual';
    showTransferDialog.value = true;
  } catch (error) {
    new AppError(error).handle();
  }
}

/**
 * 开始剪切操作
 * 需求 2.1: 在右键菜单中添加剪切选项
 */
async function startCutOperation(): Promise<void> {
  try {
    if (cacheStore.selectedItems.length === 0) {
      new AppError('请先选择要剪切的缓存', { name: 'warning' }).handle();
      return;
    }

    currentTransferOperation.value = 'Cut';
    currentTransferType.value = 'individual';
    showTransferDialog.value = true;
  } catch (error) {
    new AppError(error).handle();
  }
}

/**
 * 打开缓存根目录迁移对话框
 * 需求 8.1: 添加缓存根目录迁移入口
 */
async function openCacheRootMigration(): Promise<void> {
  try {
    showCacheRootMigrationDialog.value = true;
  } catch (error) {
    new AppError(error).handle();
  }
}

/**
 * 处理传输对话框确认
 * 需求 1.2, 2.2: 用户选择目标位置后开始传输
 */
async function handleTransferConfirm(
  target: TransferTypes.TransferTarget,
): Promise<void> {
  try {
    showTransferDialog.value = false;

    if (cacheStore.selectedItems.length === 0) {
      new AppError('没有选中任何项目', { name: 'warning' }).handle();
      return;
    }

    // 获取所有显示项
    const allRawItems = (await invoke(
      'get_cache_display_items',
    )) as Types.DisplayItemRaw[];

    // 提取所有视频项
    const allCacheItems: Types.CacheItem[] = allRawItems
      .filter(
        (item): item is { type: 'single_video'; video: Types.CacheRecordRaw } =>
          item.type === 'single_video' && !!item.video,
      )
      .map((item) => transformCacheRecord(item.video));

    // 构建源文件列表
    const source_files: string[] = [];
    for (const selectedId of cacheStore.selectedItems) {
      const cacheItem = allCacheItems.find((item) => item.id === selectedId);
      if (cacheItem) {
        source_files.push(cacheItem.cachePath);
      }
    }

    if (source_files.length === 0) {
      new AppError('无法获取缓存文件路径', { name: 'error' }).handle();
      return;
    }

    // 选择目标
    await transferStore.selectTarget(target);

    // 创建传输请求
    const transferRequest: TransferTypes.TransferRequest = {
      operation: currentTransferOperation.value,
      source_files,
      target_path: target.path || '',
      conflict_strategy: 'Rename', // 默认使用重命名策略
    };

    // 开始传输
    const taskId = await transferStore.startTransfer(transferRequest);

    if (taskId) {
      showTransferProgressDialog.value = true;
    } else {
      const errorMsg = transferStore.lastError || $t('transfer.startFailed');
      // 检测源文件不存在的错误
      if (
        errorMsg.includes('源文件不存在') ||
        errorMsg.includes('SourceNotFound')
      ) {
        new AppError($t('transfer.sourceNotFound'), { name: 'error' }).handle();
      } else {
        new AppError(errorMsg, { name: 'error' }).handle();
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    // 检测源文件不存在的错误
    if (
      errorMsg.includes('源文件不存在') ||
      errorMsg.includes('SourceNotFound')
    ) {
      new AppError($t('transfer.sourceNotFound'), { name: 'error' }).handle();
    } else {
      new AppError(error).handle();
    }
  }
}

/**
 * 处理传输对话框取消
 */
function handleTransferCancel(): void {
  showTransferDialog.value = false;
}

/**
 * 处理缓存根目录迁移确认
 * 需求 8.2, 8.3: 用户选择新位置后开始迁移
 */
async function handleCacheRootMigrationConfirm(
  target: TransferTypes.TransferTarget,
): Promise<void> {
  try {
    showCacheRootMigrationDialog.value = false;

    // 选择目标
    await transferStore.selectTarget(target);

    // 创建迁移请求
    const migrationRequest: TransferTypes.RootMigrationRequest = {
      targetRoot: target.path || '',
      updateDatabase: true,
    };

    // 开始迁移
    const taskId = await transferStore.startRootMigration(migrationRequest);

    if (taskId) {
      showTransferProgressDialog.value = true;
      new AppError($t('transfer.rootMigration.migrationStarted'), {
        name: 'success',
      }).handle();
    } else {
      new AppError(transferStore.lastError || $t('transfer.startFailed'), {
        name: 'error',
      }).handle();
    }
  } catch (error) {
    new AppError(error).handle();
  }
}

/**
 * 处理缓存根目录迁移取消
 */
function handleCacheRootMigrationCancel(): void {
  showCacheRootMigrationDialog.value = false;
}

/**
 * 处理右键菜单复制
 * 需求 1.1: 在右键菜单中添加复制选项
 */
function handleCopyFromContextMenu(item: Types.CacheItem): void {
  // 确保项目被选中
  if (!cacheStore.selectedItems.includes(item.id)) {
    cacheStore.toggleCacheItemSelection(item.id);
  }
  startCopyOperation();
}

/**
 * 处理右键菜单剪切
 * 需求 2.1: 在右键菜单中添加剪切选项
 */
function handleCutFromContextMenu(item: Types.CacheItem): void {
  // 确保项目被选中
  if (!cacheStore.selectedItems.includes(item.id)) {
    cacheStore.toggleCacheItemSelection(item.id);
  }
  startCutOperation();
}

/**
 * 处理组右键菜单复制
 */
function handleCopyGroupFromContextMenu(group: Types.CacheGroup): void {
  // 确保组被选中
  if (!cacheStore.isGroupSelected(group.groupId)) {
    cacheStore.selectGroup(group.groupId);
  }
  startCopyOperation();
}

/**
 * 处理组右键菜单剪切
 */
function handleCutGroupFromContextMenu(group: Types.CacheGroup): void {
  // 确保组被选中
  if (!cacheStore.isGroupSelected(group.groupId)) {
    cacheStore.selectGroup(group.groupId);
  }
  startCutOperation();
}

// ============================================================================
// 转换相关方法
// ============================================================================

/**
 * 开始转换操作
 * 需求 1.1: 在工具栏添加转换按钮
 */
async function startConvertOperation(): Promise<void> {
  try {
    if (cacheStore.selectedItems.length === 0) {
      new AppError('请先选择要转换的缓存', { name: 'warning' }).handle();
      return;
    }

    convertCacheIds.value = [...cacheStore.selectedItems];
    showConvertDialog.value = true;
  } catch (error) {
    new AppError(error).handle();
  }
}

/**
 * 处理右键菜单转换
 * 需求 1.1: 在右键菜单添加"转换为MP4"选项
 */
function handleConvertFromContextMenu(item: Types.CacheItem): void {
  // 确保项目被选中
  if (!cacheStore.selectedItems.includes(item.id)) {
    cacheStore.toggleCacheItemSelection(item.id);
  }
  startConvertOperation();
}

/**
 * 处理转换对话框确认
 * 需求 1.2, 1.3: 用户选择输出目录后开始转换
 */
async function handleConvertConfirm(
  outputDir: string,
  config: ConvertConfig,
): Promise<void> {
  try {
    showConvertDialog.value = false;

    if (convertCacheIds.value.length === 0) {
      new AppError('没有选中任何项目', { name: 'warning' }).handle();
      return;
    }

    // 调用转换服务创建任务
    const taskIds = await converterService.convertCache(
      convertCacheIds.value,
      outputDir,
      config,
    );

    if (taskIds && taskIds.length > 0) {
      convertTaskIds.value = taskIds;
      showConvertProgressDialog.value = true;
    } else {
      new AppError('创建转换任务失败', { name: 'error' }).handle();
    }
  } catch (error) {
    new AppError(error).handle();
  }
}

/**
 * 处理转换对话框取消
 */
function handleConvertCancel(): void {
  showConvertDialog.value = false;
  convertCacheIds.value = [];
}

/**
 * 处理转换进度对话框关闭
 */
function handleConvertProgressClose(): void {
  showConvertProgressDialog.value = false;
  convertTaskIds.value = [];
}

// ============================================================================
// 生命周期
// ============================================================================

onMounted(async () => {
  // 加载缓存根目录状态（用于刷新按钮判断）
  await transferStore.loadCurrentCacheRoot();
  // 加载所有UP主列表（从全量数据）
  await cacheStore.loadAllUploaders();
  // 初始加载缓存列表
  await loadCacheList();
  // 初始化页面输入
  pageInput.value = cacheStore.pagination.currentPage;

  // 初始化键盘快捷键
  initializeCacheKeyboardShortcuts();

  // 监听自定义事件
  window.addEventListener('cache:batchDelete', handleBatchDeleteEvent);
  window.addEventListener('cache:navigateUp', handleNavigateUpEvent);
  window.addEventListener('cache:navigateDown', handleNavigateDownEvent);
});

onUnmounted(() => {
  // 清理键盘快捷键
  cleanupCacheKeyboardShortcuts();

  // 移除事件监听
  window.removeEventListener('cache:batchDelete', handleBatchDeleteEvent);
  window.removeEventListener('cache:navigateUp', handleNavigateUpEvent);
  window.removeEventListener('cache:navigateDown', handleNavigateDownEvent);
});

// 监听路由变化，清除选择状态（需求 7.3）
watch(
  () => router.currentRoute.value.path,
  async (newPath) => {
    if (newPath === '/cache-list') {
      // 页面返回时，清除选择状态
      cacheStore.clearSelection();
      await loadCacheList();
    } else {
      // 离开缓存列表页面时，清除选择状态
      cacheStore.clearSelection();
    }
  },
);

// 监听分页变化，同步页面输入
watch(
  () => cacheStore.pagination.currentPage,
  (newPage) => {
    pageInput.value = newPage;
  },
);

// ============================================================================
// 键盘事件处理
// ============================================================================

/**
 * 处理批量删除事件
 */
function handleBatchDeleteEvent(): void {
  batchDelete();
}

/**
 * 处理向上导航事件
 */
function handleNavigateUpEvent(): void {
  cacheStore.navigateFocusUp();
}

/**
 * 处理向下导航事件
 */
function handleNavigateDownEvent(): void {
  cacheStore.navigateFocusDown();
}
</script>

<style scoped>
@reference 'tailwindcss';

.cache-list-page {
  @apply flex flex-col h-full p-4;
}

/* 列表滚动条样式 */
.flex::-webkit-scrollbar {
  @apply w-2;
}

.flex::-webkit-scrollbar-track {
  @apply bg-gray-100 rounded;
}

.flex::-webkit-scrollbar-thumb {
  @apply bg-gray-400 rounded hover:bg-gray-500;
}

/* 过渡动画 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* 高级筛选折叠动画 */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  margin-top: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
  opacity: 1;
  max-height: 200px;
}

/* 批量操作栏动画 */
.batch-action-bar-enter-active {
  transition:
    opacity 0.2s ease-out,
    transform 0.2s ease-out;
}

.batch-action-bar-leave-active {
  transition:
    opacity 0.15s ease-in,
    transform 0.15s ease-in;
}

.batch-action-bar-enter-from,
.batch-action-bar-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 侧边栏滚动条样式 */
.cache-list-page .w-32::-webkit-scrollbar {
  @apply w-1;
}

.cache-list-page .w-32::-webkit-scrollbar-thumb {
  @apply bg-(--scroller-color) rounded;
}

/* 缓存页面 tab 样式覆盖 */
.cache-list-page .tab {
  @apply flex flex-col items-stretch gap-1;
}

.cache-list-page .tab button {
  @apply w-full! pr-2 pl-2 flex items-center justify-between gap-1 bg-transparent;
  @apply border-none hover:bg-(--solid-button-color) text-xs min-h-[28px];
  /* 覆盖全局样式的固定宽度 */
  width: 100% !important;
}

.cache-list-page .tab button span {
  @apply flex-1 text-left leading-tight;
  /* 确保文本不被截断 */
  white-space: nowrap;
  overflow: visible;
}

.cache-list-page .tab button label {
  @apply w-[2px] rounded-sm h-3 invisible shrink-0;
}

.cache-list-page .tab button.active {
  @apply bg-(--button-color) text-(--primary-color);
}

.cache-list-page .tab button.active label {
  @apply visible;
}
</style>
