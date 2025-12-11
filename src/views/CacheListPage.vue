<template>
  <div class="cache-list-page">
    <h1 class="w-full mt-1.5 mb-auto">
      <i :class="[$fa.weight, 'fa-database']"></i>
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
            <select
              v-model="selectedSort"
              class="px-3 py-2 bg-(--input-bg) border border-(--border-color) rounded-md text-sm"
              @change="applySort"
            >
              <option value="completionTime-desc">
                {{ $t('cache.list.sort.completionTimeDesc') }}
              </option>
              <option value="completionTime-asc">
                {{ $t('cache.list.sort.completionTimeAsc') }}
              </option>
              <option value="title-asc">
                {{ $t('cache.list.sort.titleAsc') }}
              </option>
              <option value="title-desc">
                {{ $t('cache.list.sort.titleDesc') }}
              </option>
              <option value="fileSize-desc">
                {{ $t('cache.list.sort.fileSizeDesc') }}
              </option>
              <option value="fileSize-asc">
                {{ $t('cache.list.sort.fileSizeAsc') }}
              </option>
            </select>
          </div>

          <!-- 高级筛选（可折叠） -->
          <Transition name="slide-down">
            <div
              v-if="showAdvancedFilters"
              class="mt-3 pt-3 border-t border-(--border-color)"
            >
              <div class="flex gap-3 items-center">
                <!-- UP主筛选 -->
                <select
                  v-if="cacheStore.allUploaders.length > 0"
                  v-model="selectedUploader"
                  class="px-3 py-2 bg-(--input-bg) border border-(--border-color) rounded-md text-sm flex-1"
                  @change="applyFilters"
                >
                  <option value="">{{ $t('cache.list.allUploaders') }}</option>
                  <option
                    v-for="uploader in cacheStore.allUploaders"
                    :key="uploader"
                    :value="uploader"
                  >
                    {{ uploader }}
                  </option>
                </select>

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
        <div
          v-if="cacheStore.hasSelectedItems"
          class="bg-(--block-color) rounded-lg p-4"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-sm">
                {{
                  $t('cache.list.selectedCount', [
                    cacheStore.selectedItemsCount,
                  ])
                }}
              </span>
              <button
                class="text-sm text-(--primary-color) hover:underline"
                @click="cacheStore.clearSelection"
              >
                {{ $t('cache.list.clearSelection') }}
              </button>
            </div>

            <div class="flex gap-2">
              <button
                class="px-3 py-1 text-sm bg-red-500 text-white rounded hover:opacity-80 transition-opacity"
                @click="batchDelete"
              >
                <i :class="[$fa.weight, 'fa-trash']"></i>
                <span>{{ $t('cache.list.batchDelete') }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 缓存列表 -->
        <div class="flex-1 min-h-0">
          <Transition name="slide">
            <div v-if="!cacheStore.isLoading" class="h-full">
              <!-- 空状态 -->
              <Empty
                v-if="cacheStore.paginatedCacheItems.length === 0"
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

              <!-- 缓存列表 -->
              <div v-else class="flex flex-col gap-1 h-full overflow-y-auto">
                <CacheItemCard
                  v-for="item in cacheStore.paginatedCacheItems"
                  :key="item.id"
                  :item="item"
                  :selected="cacheStore.selectedItems.includes(item.id)"
                  @select="cacheStore.toggleCacheItemSelection(item.id)"
                  @play="playItem"
                  @open-folder="openFolder"
                  @delete="deleteItem"
                />
              </div>
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
            <span>全部</span>
            <label class="primary-color"></label>
          </button>
          <button
            :class="{ active: selectedStatus === 'available' }"
            @click="setStatusFilter('available')"
          >
            <span>正常</span>
            <label class="primary-color"></label>
          </button>
          <button
            :class="{ active: selectedStatus === 'unavailable' }"
            @click="setStatusFilter('unavailable')"
          >
            <span>失效</span>
            <label class="primary-color"></label>
          </button>
          <button
            :class="{ active: selectedStatus === 'incomplete' }"
            @click="setStatusFilter('incomplete')"
          >
            <span>残缺</span>
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
          <span>刷新</span>
        </button>

        <button @click="toggleAdvancedFilters">
          <i :class="[$fa.weight, 'fa-filter-list']"></i>
          <span>更多筛选</span>
        </button>

        <button @click="goToImport">
          <i :class="[$fa.weight, 'fa-download']"></i>
          <span>导入更多</span>
        </button>

        <button @click="exportList">
          <i :class="[$fa.weight, 'fa-file-export']"></i>
          <span>导出列表</span>
        </button>

        <!-- 统计信息（紧凑显示） -->
        <div class="text-xs text-(--desc-color) space-y-0.5 mt-1">
          <div class="flex justify-between">
            <span>总数:</span>
            <span class="font-medium">{{ cacheStore.totalCacheCount }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-green-500">可用:</span>
            <span class="font-medium text-green-500">{{
              cacheStore.availableCacheCount
            }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-red-500">不可用:</span>
            <span class="font-medium text-red-500">{{
              cacheStore.unavailableCacheCount
            }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-yellow-500">不完整:</span>
            <span class="font-medium text-yellow-500">{{
              cacheStore.incompleteCacheCount
            }}</span>
          </div>
          <div
            class="flex justify-between pt-1 border-t border-(--border-color)"
          >
            <span>总大小:</span>
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
            已选择 {{ cacheStore.selectedItemsCount }} 项
          </div>
          <button
            class="w-full text-xs text-(--primary-color) hover:underline mb-1 text-left"
            @click="cacheStore.clearSelection"
          >
            清除选择
          </button>
          <button
            class="w-full text-xs text-red-500 hover:underline text-left"
            @click="batchDelete"
          >
            <i :class="[$fa.weight, 'fa-trash']"></i>
            <span>批量删除</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useCacheStore } from '@/store/cache';
import { cacheManagementService } from '@/services/cache';
import { formatBytes } from '@/services/utils';
import { AppError } from '@/services/error';
import { Empty, CacheItemCard } from '@/components';
import type * as Types from '@/types/cache.d';

// ============================================================================
// 路由和状态管理
// ============================================================================

const router = useRouter();
const cacheStore = useCacheStore();

// ============================================================================
// 响应式状态
// ============================================================================

// 搜索和筛选状态
const searchKeyword = ref<string>('');
const selectedStatus = ref<string>('');
const selectedUploader = ref<string>('');
const selectedSort = ref<string>('completionTime-desc');

// 页面输入状态
const pageInput = ref<number>(1);

// 高级筛选显示状态
const showAdvancedFilters = ref<boolean>(false);

// 防抖搜索定时器
let searchTimeout: number | null = null;

// ============================================================================
// 计算属性
// ============================================================================

const hasActiveFilters = computed(() => {
  return searchKeyword.value || selectedStatus.value || selectedUploader.value;
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
 */
function applyFilters(): void {
  const filter: Types.CacheFilter = {
    ...(searchKeyword.value && { keyword: searchKeyword.value }),
    ...(selectedStatus.value && {
      status: [selectedStatus.value as Types.CacheStatus],
    }),
    ...(selectedUploader.value && { uploader: selectedUploader.value }),
  };

  cacheStore.setFilter(filter);
  loadCacheList();
}

/**
 * 应用排序
 */
function applySort(): void {
  const [field, direction] = selectedSort.value.split('-') as [
    Types.SortField,
    Types.SortDirection,
  ];
  cacheStore.setSort({ field, direction });
  loadCacheList();
}

/**
 * 清除筛选条件
 */
function clearFilters(): void {
  searchKeyword.value = '';
  selectedStatus.value = '';
  selectedUploader.value = '';
  cacheStore.clearFilter();
  loadCacheList();
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
    await cacheStore.loadCacheList();
  } catch (error) {
    new AppError(error).handle();
  }
}

/**
 * 刷新列表
 */
async function refreshList(): Promise<void> {
  try {
    await cacheStore.refreshCacheList();
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
 * 播放缓存项
 */
async function playItem(item: Types.CacheItem): Promise<void> {
  try {
    await cacheStore.playCacheItem(item);
  } catch (error) {
    new AppError(error).handle();
  }
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
    if (!confirm(`确定要删除 "${item.title}" 吗？`)) {
      return;
    }

    await cacheStore.deleteCacheItem(item.id);
  } catch (error) {
    new AppError(error).handle();
  }
}

/**
 * 批量删除
 */
async function batchDelete(): Promise<void> {
  try {
    const count = cacheStore.selectedItemsCount;
    if (!confirm(`确定要删除选中的 ${count} 个缓存项吗？`)) {
      return;
    }

    const results = await cacheStore.batchDeleteCacheItems([
      ...cacheStore.selectedItems,
    ]);

    // 显示结果
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    if (failureCount === 0) {
      new AppError(`成功删除 ${successCount} 个缓存项`, {
        name: 'success',
      }).handle();
    } else {
      new AppError(
        `删除完成：成功 ${successCount} 个，失败 ${failureCount} 个`,
        { name: 'warning' },
      ).handle();
    }
  } catch (error) {
    new AppError(error).handle();
  }
}

// ============================================================================
// 生命周期
// ============================================================================

onMounted(async () => {
  // 初始加载缓存列表
  await loadCacheList();
  // 初始化页面输入
  pageInput.value = cacheStore.pagination.currentPage;
});

// 监听路由变化，刷新数据
watch(
  () => router.currentRoute.value.path,
  (newPath) => {
    if (newPath === '/cache-list') {
      loadCacheList();
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
