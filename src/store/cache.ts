/**
 * 缓存状态管理 Store
 * 
 * 使用 Pinia 管理B站缓存导入和管理功能的状态
 * 包括缓存列表、导入状态、进度信息等
 */

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { cacheImportService, cacheManagementService } from '@/services/cache';
import type * as Types from '@/types/cache.d';



/**
 * 缓存 Store
 */
export const useCacheStore = defineStore('cache', () => {
  // ============================================================================
  // 状态定义
  // ============================================================================
  
  // 缓存列表相关状态
  const cacheItems = ref<Types.CacheItem[]>([]);
  const cacheStatistics = ref<Types.CacheStatistics | null>(null);
  const pagination = ref<Types.CachePagination>({
    currentPage: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
  });
  
  // 筛选和排序状态
  const currentFilter = ref<Types.CacheFilter>({});
  const currentSort = ref<Types.SortOption>({
    field: 'importTime',
    direction: 'desc',
  });
  
  // 导入相关状态
  const importProgress = ref<Types.ImportProgress | null>(null);
  const importHistory = ref<Types.ImportResult[]>([]);
  const activeImportId = ref<string | null>(null);
  
  // UI状态
  const isLoading = ref(false);
  const isImporting = ref(false);
  const selectedItems = ref<string[]>([]);
  
  // 错误状态
  const lastError = ref<string | null>(null);
  
  // ============================================================================
  // 计算属性
  // ============================================================================
  
  /**
   * 筛选后的缓存列表
   */
  const filteredCacheItems = computed(() => {
    let items = [...cacheItems.value];
    const filter = currentFilter.value;
    
    // 关键词筛选
    if (filter.keyword) {
      const keyword = filter.keyword.toLowerCase();
      items = items.filter(item => 
        item.title.toLowerCase().includes(keyword) ||
        item.uname.toLowerCase().includes(keyword)
      );
    }
    
    // 状态筛选
    if (filter.status && filter.status.length > 0) {
      items = items.filter(item => filter.status!.includes(item.status));
    }
    
    // UP主筛选
    if (filter.uploader) {
      items = items.filter(item => item.uname === filter.uploader);
    }
    
    // 文件大小范围筛选
    if (filter.sizeRange) {
      if (filter.sizeRange.min !== undefined) {
        items = items.filter(item => item.fileSize >= filter.sizeRange!.min!);
      }
      if (filter.sizeRange.max !== undefined) {
        items = items.filter(item => item.fileSize <= filter.sizeRange!.max!);
      }
    }
    
    // 时长范围筛选
    if (filter.durationRange) {
      if (filter.durationRange.min !== undefined) {
        items = items.filter(item => item.duration >= filter.durationRange!.min!);
      }
      if (filter.durationRange.max !== undefined) {
        items = items.filter(item => item.duration <= filter.durationRange!.max!);
      }
    }
    
    // 导入时间范围筛选
    if (filter.importTimeRange) {
      if (filter.importTimeRange.start) {
        items = items.filter(item => item.importTime >= filter.importTimeRange!.start!);
      }
      if (filter.importTimeRange.end) {
        items = items.filter(item => item.importTime <= filter.importTimeRange!.end!);
      }
    }
    
    return items;
  });
  
  /**
   * 排序后的缓存列表
   */
  const sortedCacheItems = computed(() => {
    const items = [...filteredCacheItems.value];
    const sort = currentSort.value;
    
    items.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      switch (sort.field) {
        case 'title':
          aValue = a.title;
          bValue = b.title;
          break;
        case 'uname':
          aValue = a.uname;
          bValue = b.uname;
          break;
        case 'duration':
          aValue = a.duration;
          bValue = b.duration;
          break;
        case 'fileSize':
          aValue = a.fileSize;
          bValue = b.fileSize;
          break;
        case 'downloadTime':
          aValue = a.downloadTime.getTime();
          bValue = b.downloadTime.getTime();
          break;
        case 'importTime':
          aValue = a.importTime.getTime();
          bValue = b.importTime.getTime();
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      let result = 0;
      if (aValue < bValue) result = -1;
      else if (aValue > bValue) result = 1;
      
      return sort.direction === 'desc' ? -result : result;
    });
    
    return items;
  });
  
  /**
   * 分页后的缓存列表
   */
  const paginatedCacheItems = computed(() => {
    const items = sortedCacheItems.value;
    const startIndex = (pagination.value.currentPage - 1) * pagination.value.pageSize;
    const endIndex = startIndex + pagination.value.pageSize;
    
    return items.slice(startIndex, endIndex);
  });
  
  /**
   * 总缓存数量
   */
  const totalCacheCount = computed(() => cacheItems.value.length);
  
  /**
   * 可用缓存数量
   */
  const availableCacheCount = computed(() => 
    cacheItems.value.filter(item => item.status === 'available').length
  );
  
  /**
   * 不可用缓存数量
   */
  const unavailableCacheCount = computed(() => 
    cacheItems.value.filter(item => item.status === 'unavailable').length
  );
  
  /**
   * 不完整缓存数量
   */
  const incompleteCacheCount = computed(() => 
    cacheItems.value.filter(item => item.status === 'incomplete').length
  );
  
  /**
   * 总文件大小
   */
  const totalFileSize = computed(() => 
    cacheItems.value.reduce((sum, item) => sum + item.fileSize, 0)
  );
  
  /**
   * 平均文件大小
   */
  const averageFileSize = computed(() => 
    totalCacheCount.value > 0 ? totalFileSize.value / totalCacheCount.value : 0
  );
  
  /**
   * 总时长
   */
  const totalDuration = computed(() => 
    cacheItems.value.reduce((sum, item) => sum + item.duration, 0)
  );
  
  /**
   * 所有UP主列表（用于筛选）
   */
  const allUploaders = computed(() => {
    const uploaders = new Set(cacheItems.value.map(item => item.uname));
    return Array.from(uploaders).sort();
  });
  
  /**
   * 是否有选中的项目
   */
  const hasSelectedItems = computed(() => selectedItems.value.length > 0);
  
  /**
   * 选中项目数量
   */
  const selectedItemsCount = computed(() => selectedItems.value.length);
  
  /**
   * 是否全选
   */
  const isAllSelected = computed(() => 
    paginatedCacheItems.value.length > 0 && 
    paginatedCacheItems.value.every(item => selectedItems.value.includes(item.id))
  );
  
  /**
   * 导入进度百分比
   */
  const importProgressPercentage = computed(() => {
    if (!importProgress.value) return 0;
    const progress = importProgress.value;
    if (progress.totalDirectories === 0) return 0;
    return Math.round((progress.processedDirectories / progress.totalDirectories) * 100);
  });
  
  // ============================================================================
  // Actions - 缓存列表管理
  // ============================================================================
  
  /**
   * 加载缓存列表
   */
  async function loadCacheList(): Promise<void> {
    if (isLoading.value) return;
    
    try {
      isLoading.value = true;
      lastError.value = null;
      
      const result = await cacheManagementService.getCacheList(
        currentFilter.value,
        currentSort.value,
        pagination.value
      );
      
      cacheItems.value = result.items;
      cacheStatistics.value = result.statistics;
      
      // 更新分页信息
      pagination.value = {
        ...pagination.value,
        totalCount: result.statistics.totalCount,
        totalPages: Math.ceil(result.statistics.totalCount / pagination.value.pageSize),
      };
      
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '加载缓存列表失败';
      console.error('加载缓存列表失败:', error);
    } finally {
      isLoading.value = false;
    }
  }
  
  /**
   * 刷新缓存列表
   */
  async function refreshCacheList(): Promise<void> {
    await loadCacheList();
  }
  
  /**
   * 设置筛选条件
   */
  function setFilter(filter: Partial<Types.CacheFilter>): void {
    currentFilter.value = { ...currentFilter.value, ...filter };
    pagination.value.currentPage = 1; // 重置到第一页
  }
  
  /**
   * 清除筛选条件
   */
  function clearFilter(): void {
    currentFilter.value = {};
    pagination.value.currentPage = 1;
  }
  
  /**
   * 设置排序选项
   */
  function setSort(sort: Types.SortOption): void {
    currentSort.value = sort;
    pagination.value.currentPage = 1; // 重置到第一页
  }
  
  /**
   * 设置分页
   */
  function setPagination(page: number, pageSize?: number): void {
    pagination.value.currentPage = page;
    if (pageSize) {
      pagination.value.pageSize = pageSize;
      pagination.value.totalPages = Math.ceil(pagination.value.totalCount / pageSize);
    }
  }
  
  // ============================================================================
  // Actions - 缓存项操作
  // ============================================================================
  
  /**
   * 删除缓存项
   */
  async function deleteCacheItem(id: string, deleteFiles: boolean = false): Promise<void> {
    try {
      await cacheManagementService.deleteCacheItem(id, deleteFiles);
      
      // 从本地状态中移除
      const index = cacheItems.value.findIndex(item => item.id === id);
      if (index !== -1) {
        cacheItems.value.splice(index, 1);
      }
      
      // 从选中列表中移除
      const selectedIndex = selectedItems.value.indexOf(id);
      if (selectedIndex !== -1) {
        selectedItems.value.splice(selectedIndex, 1);
      }
      
      // 更新统计信息
      await updateStatistics();
      
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '删除缓存项失败';
      throw error;
    }
  }
  
  /**
   * 批量删除缓存项
   */
  async function batchDeleteCacheItems(ids: string[], deleteFiles: boolean = false): Promise<Types.BatchOperationResult[]> {
    try {
      const results = await cacheManagementService.batchDeleteCacheItems(ids, deleteFiles);
      
      // 移除成功删除的项目
      const successIds = results.filter(r => r.success).map(r => r.cacheId);
      cacheItems.value = cacheItems.value.filter(item => !successIds.includes(item.id));
      
      // 清除选中状态
      selectedItems.value = selectedItems.value.filter(id => !successIds.includes(id));
      
      // 更新统计信息
      await updateStatistics();
      
      return results;
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '批量删除失败';
      throw error;
    }
  }
  
  /**
   * 播放缓存项
   */
  async function playCacheItem(item: Types.CacheItem): Promise<void> {
    try {
      await cacheManagementService.playCacheItem(item);
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '播放失败';
      throw error;
    }
  }
  
  /**
   * 打开缓存文件夹
   */
  async function openCacheFolder(item: Types.CacheItem): Promise<void> {
    try {
      await cacheManagementService.openCacheFolder(item);
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '打开文件夹失败';
      throw error;
    }
  }
  
  /**
   * 刷新缓存项状态
   */
  async function refreshCacheItemStatus(id: string): Promise<void> {
    try {
      const updatedItem = await cacheManagementService.refreshCacheItemStatus(id);
      
      // 更新本地状态
      const index = cacheItems.value.findIndex(item => item.id === id);
      if (index !== -1) {
        cacheItems.value[index] = updatedItem;
      }
      
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '刷新状态失败';
      throw error;
    }
  }
  
  // ============================================================================
  // Actions - 选择管理
  // ============================================================================
  
  /**
   * 选择缓存项
   */
  function selectCacheItem(id: string): void {
    if (!selectedItems.value.includes(id)) {
      selectedItems.value.push(id);
    }
  }
  
  /**
   * 取消选择缓存项
   */
  function unselectCacheItem(id: string): void {
    const index = selectedItems.value.indexOf(id);
    if (index !== -1) {
      selectedItems.value.splice(index, 1);
    }
  }
  
  /**
   * 切换缓存项选择状态
   */
  function toggleCacheItemSelection(id: string): void {
    if (selectedItems.value.includes(id)) {
      unselectCacheItem(id);
    } else {
      selectCacheItem(id);
    }
  }
  
  /**
   * 全选当前页
   */
  function selectAllCurrentPage(): void {
    paginatedCacheItems.value.forEach(item => {
      if (!selectedItems.value.includes(item.id)) {
        selectedItems.value.push(item.id);
      }
    });
  }
  
  /**
   * 取消全选当前页
   */
  function unselectAllCurrentPage(): void {
    const currentPageIds = paginatedCacheItems.value.map(item => item.id);
    selectedItems.value = selectedItems.value.filter(id => !currentPageIds.includes(id));
  }
  
  /**
   * 切换全选状态
   */
  function toggleSelectAll(): void {
    if (isAllSelected.value) {
      unselectAllCurrentPage();
    } else {
      selectAllCurrentPage();
    }
  }
  
  /**
   * 清除所有选择
   */
  function clearSelection(): void {
    selectedItems.value = [];
  }
  
  // ============================================================================
  // Actions - 导入管理
  // ============================================================================
  
  /**
   * 开始导入
   */
  async function startImport(path: string, options: Types.ImportOptions): Promise<string> {
    try {
      isImporting.value = true;
      lastError.value = null;
      
      const importId = await cacheImportService.startImport(path, options);
      activeImportId.value = importId;
      
      // 开始监听进度
      await cacheImportService.listenImportProgress(importId, (progress) => {
        importProgress.value = progress;
      });
      
      return importId;
    } catch (error) {
      isImporting.value = false;
      lastError.value = error instanceof Error ? error.message : '开始导入失败';
      throw error;
    }
  }
  
  /**
   * 取消导入
   */
  async function cancelImport(): Promise<void> {
    if (!activeImportId.value) return;
    
    try {
      await cacheImportService.cancelImport(activeImportId.value);
      
      // 清理状态
      isImporting.value = false;
      importProgress.value = null;
      activeImportId.value = null;
      
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '取消导入失败';
      throw error;
    }
  }
  
  /**
   * 完成导入
   */
  function completeImport(result: Types.ImportResult): void {
    isImporting.value = false;
    importProgress.value = null;
    activeImportId.value = null;
    
    // 添加到导入历史
    importHistory.value.unshift(result);
    
    // 刷新缓存列表
    loadCacheList();
  }
  
  // ============================================================================
  // Actions - 工具函数
  // ============================================================================
  
  /**
   * 更新统计信息
   */
  async function updateStatistics(): Promise<void> {
    try {
      cacheStatistics.value = await cacheManagementService.getCacheStatistics();
    } catch (error) {
      console.error('更新统计信息失败:', error);
    }
  }
  
  /**
   * 清除错误状态
   */
  function clearError(): void {
    lastError.value = null;
  }
  
  /**
   * 重置状态
   */
  function resetState(): void {
    cacheItems.value = [];
    cacheStatistics.value = null;
    currentFilter.value = {};
    currentSort.value = { field: 'importTime', direction: 'desc' };
    importProgress.value = null;
    activeImportId.value = null;
    isLoading.value = false;
    isImporting.value = false;
    selectedItems.value = [];
    lastError.value = null;
    pagination.value = {
      currentPage: 1,
      pageSize: 20,
      totalCount: 0,
      totalPages: 0,
    };
  }
  
  // ============================================================================
  // 返回状态和方法
  // ============================================================================
  
  return {
    // 状态
    cacheItems,
    cacheStatistics,
    pagination,
    currentFilter,
    currentSort,
    importProgress,
    importHistory,
    activeImportId,
    isLoading,
    isImporting,
    selectedItems,
    lastError,
    
    // 计算属性
    filteredCacheItems,
    sortedCacheItems,
    paginatedCacheItems,
    totalCacheCount,
    availableCacheCount,
    unavailableCacheCount,
    incompleteCacheCount,
    totalFileSize,
    averageFileSize,
    totalDuration,
    allUploaders,
    hasSelectedItems,
    selectedItemsCount,
    isAllSelected,
    importProgressPercentage,
    
    // 缓存列表管理
    loadCacheList,
    refreshCacheList,
    setFilter,
    clearFilter,
    setSort,
    setPagination,
    
    // 缓存项操作
    deleteCacheItem,
    batchDeleteCacheItems,
    playCacheItem,
    openCacheFolder,
    refreshCacheItemStatus,
    
    // 选择管理
    selectCacheItem,
    unselectCacheItem,
    toggleCacheItemSelection,
    selectAllCurrentPage,
    unselectAllCurrentPage,
    toggleSelectAll,
    clearSelection,
    
    // 导入管理
    startImport,
    cancelImport,
    completeImport,
    
    // 工具函数
    updateStatistics,
    clearError,
    resetState,
  };
});