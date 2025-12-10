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
          <div class="flex gap-3 items-center">
            <!-- 搜索框 -->
            <div class="flex-1 relative">
              <i :class="[$fa.weight, 'fa-magnifying-glass']" class="absolute left-3 top-1/2 transform -translate-y-1/2 text-(--desc-color)"></i>
              <input
                v-model="searchKeyword"
                type="text"
                :placeholder="$t('cache.list.searchPlaceholder')"
                class="w-full pl-10 pr-4 py-2 bg-(--input-bg) border border-(--border-color) rounded-md text-sm"
                @input="onSearchInput"
              />
            </div>
            
            <!-- 状态筛选 -->
            <select
              v-model="selectedStatus"
              class="px-3 py-2 bg-(--input-bg) border border-(--border-color) rounded-md text-sm"
              @change="applyFilters"
            >
              <option value="">{{ $t('cache.list.allStatus') }}</option>
              <option value="available">{{ $t('cache.status.available') }}</option>
              <option value="unavailable">{{ $t('cache.status.unavailable') }}</option>
              <option value="incomplete">{{ $t('cache.status.incomplete') }}</option>
            </select>
            
            <!-- UP主筛选 -->
            <select
              v-if="cacheStore.allUploaders.length > 0"
              v-model="selectedUploader"
              class="px-3 py-2 bg-(--input-bg) border border-(--border-color) rounded-md text-sm max-w-40"
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
            
            <!-- 排序选择 -->
            <select
              v-model="selectedSort"
              class="px-3 py-2 bg-(--input-bg) border border-(--border-color) rounded-md text-sm"
              @change="applySort"
            >
              <option value="importTime-desc">{{ $t('cache.list.sort.importTimeDesc') }}</option>
              <option value="importTime-asc">{{ $t('cache.list.sort.importTimeAsc') }}</option>
              <option value="title-asc">{{ $t('cache.list.sort.titleAsc') }}</option>
              <option value="title-desc">{{ $t('cache.list.sort.titleDesc') }}</option>
              <option value="fileSize-desc">{{ $t('cache.list.sort.fileSizeDesc') }}</option>
              <option value="fileSize-asc">{{ $t('cache.list.sort.fileSizeAsc') }}</option>
              <option value="duration-desc">{{ $t('cache.list.sort.durationDesc') }}</option>
              <option value="duration-asc">{{ $t('cache.list.sort.durationAsc') }}</option>
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

        <!-- 批量操作栏 -->
        <div v-if="cacheStore.hasSelectedItems" class="bg-(--block-color) rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-sm">
                {{ $t('cache.list.selectedCount', [cacheStore.selectedItemsCount]) }}
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
                :text="hasActiveFilters ? $t('cache.list.noResults') : $t('cache.list.empty')"
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
              
              <!-- 缓存网格 -->
              <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full overflow-y-auto">
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
          <div v-if="cacheStore.isLoading" class="flex items-center justify-center h-full">
            <div class="text-center">
              <i :class="[$fa.weight, 'fa-spinner fa-spin text-2xl text-(--primary-color)']"></i>
              <div class="mt-2 text-sm text-(--desc-color)">{{ $t('cache.list.loading') }}</div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="cacheStore.pagination.totalPages > 1" class="bg-(--block-color) rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div class="text-sm text-(--desc-color)">
              {{ $t('cache.list.pagination.info', [
                (cacheStore.pagination.currentPage - 1) * cacheStore.pagination.pageSize + 1,
                Math.min(cacheStore.pagination.currentPage * cacheStore.pagination.pageSize, cacheStore.pagination.totalCount),
                cacheStore.pagination.totalCount
              ]) }}
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
                {{ cacheStore.pagination.currentPage }} / {{ cacheStore.pagination.totalPages }}
              </span>
              
              <button
                class="px-3 py-1 text-sm border border-(--border-color) rounded hover:bg-(--hover-color) transition-colors disabled:opacity-50"
                :disabled="cacheStore.pagination.currentPage === cacheStore.pagination.totalPages"
                @click="changePage(cacheStore.pagination.currentPage + 1)"
              >
                <i :class="[$fa.weight, 'fa-chevron-right']"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 侧边栏 -->
      <div class="flex flex-col w-48 gap-4">
        <!-- 统计信息 -->
        <div class="bg-(--block-color) rounded-lg p-4">
          <h3 class="font-medium mb-3">
            <i :class="[$fa.weight, 'fa-chart-bar']"></i>
            <span>{{ $t('cache.list.statistics') }}</span>
          </h3>
          
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span>{{ $t('cache.list.total') }}:</span>
              <span class="font-medium">{{ cacheStore.totalCacheCount }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ $t('cache.status.available') }}:</span>
              <span class="font-medium text-green-500">{{ cacheStore.availableCacheCount }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ $t('cache.status.unavailable') }}:</span>
              <span class="font-medium text-red-500">{{ cacheStore.unavailableCacheCount }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ $t('cache.status.incomplete') }}:</span>
              <span class="font-medium text-yellow-500">{{ cacheStore.incompleteCacheCount }}</span>
            </div>
            <hr class="border-(--border-color)" />
            <div class="flex justify-between">
              <span>{{ $t('cache.list.totalSize') }}:</span>
              <span class="font-medium">{{ formatBytes(cacheStore.totalFileSize) }}</span>
            </div>
          </div>
        </div>

        <!-- 快速操作 -->
        <div class="space-y-2">
          <button
            class="w-full px-4 py-2 bg-(--primary-color) text-white rounded-lg hover:opacity-80 transition-opacity"
            @click="goToImport"
          >
            <i :class="[$fa.weight, 'fa-download']"></i>
            <span>{{ $t('cache.list.importMore') }}</span>
          </button>
          
          <button
            class="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:opacity-80 transition-opacity"
            @click="refreshList"
            :disabled="cacheStore.isLoading"
          >
            <i :class="[$fa.weight, cacheStore.isLoading ? 'fa-spinner fa-spin' : 'fa-refresh']"></i>
            <span>{{ $t('cache.list.refresh') }}</span>
          </button>
          
          <button
            class="w-full px-4 py-2 bg-(--desc-color) text-white rounded-lg hover:opacity-80 transition-opacity"
            @click="exportList"
          >
            <i :class="[$fa.weight, 'fa-download']"></i>
            <span>{{ $t('cache.list.export') }}</span>
          </button>
        </div>

        <!-- 全选控制 -->
        <div class="bg-(--block-color) rounded-lg p-4">
          <h3 class="font-medium mb-3">
            <i :class="[$fa.weight, 'fa-check-square']"></i>
            <span>{{ $t('cache.list.selection') }}</span>
          </h3>
          
          <div class="space-y-2">
            <button
              class="w-full px-3 py-2 text-sm border border-(--border-color) rounded hover:bg-(--hover-color) transition-colors"
              @click="cacheStore.toggleSelectAll"
            >
              {{ cacheStore.isAllSelected ? $t('cache.list.unselectAll') : $t('cache.list.selectAll') }}
            </button>
            
            <button
              v-if="cacheStore.hasSelectedItems"
              class="w-full px-3 py-2 text-sm text-(--desc-color) hover:text-(--text-color) transition-colors"
              @click="cacheStore.clearSelection"
            >
              {{ $t('cache.list.clearSelection') }}
            </button>
          </div>
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
const selectedSort = ref<string>('importTime-desc');

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
    ...(selectedStatus.value && { status: [selectedStatus.value as Types.CacheStatus] }),
    ...(selectedUploader.value && { uploader: selectedUploader.value }),
  };
  
  cacheStore.setFilter(filter);
  loadCacheList();
}

/**
 * 应用排序
 */
function applySort(): void {
  const [field, direction] = selectedSort.value.split('-') as [Types.SortField, Types.SortDirection];
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
  loadCacheList();
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
    const filePath = await cacheManagementService.exportCacheList(cacheStore.currentFilter);
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
    
    const results = await cacheStore.batchDeleteCacheItems([...cacheStore.selectedItems]);
    
    // 显示结果
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    if (failureCount === 0) {
      new AppError(`成功删除 ${successCount} 个缓存项`, { name: 'success' }).handle();
    } else {
      new AppError(`删除完成：成功 ${successCount} 个，失败 ${failureCount} 个`, { name: 'warning' }).handle();
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
});

// 监听路由变化，刷新数据
watch(() => router.currentRoute.value.path, (newPath) => {
  if (newPath === '/cache-list') {
    loadCacheList();
  }
});
</script>

<style scoped>
@reference 'tailwindcss';

.cache-list-page {
  @apply flex flex-col h-full p-4;
}

/* 网格滚动条样式 */
.grid::-webkit-scrollbar {
  @apply w-2;
}

.grid::-webkit-scrollbar-track {
  @apply bg-gray-100 rounded;
}

.grid::-webkit-scrollbar-thumb {
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
</style>