/**
 * 缓存状态管理 Store
 *
 * 使用 Pinia 管理B站缓存导入和管理功能的状态
 * 包括缓存列表、导入状态、进度信息、组管理等
 */

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { cacheImportService, cacheManagementService } from '@/services/cache';
import { UnifiedErrorHandler } from '@/utils/error-handler';
import { PROGRESS, PAGINATION } from '@/constants';
import type * as Types from '@/types/cache.d';
import type { ImportProgress as BackendImportProgress } from '@/services/backend';

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
    currentPage: PAGINATION.DEFAULT_PAGE,
    pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
    totalCount: 0,
    totalPages: 0,
  });

  // 组相关状态
  const displayItems = ref<Types.DisplayItem[]>([]);
  const groupStates = ref<Map<string, boolean>>(new Map());
  const cacheGroups = ref<Types.CacheGroup[]>([]);
  const groupManagerConfig = ref<Types.GroupManagerConfig>({
    defaultExpanded: false,
    minGroupSize: 2,
    titleGenerationStrategy: 'prefix',
  });

  // 筛选和排序状态
  const currentFilter = ref<Types.CacheFilter>({});
  const currentSort = ref<Types.SortOption>({
    field: 'completionTime',
    direction: 'desc',
  });

  // 导入相关状态
  const importProgress = ref<BackendImportProgress | null>(null);
  const importHistory = ref<Types.ImportResult[]>([]);
  const activeImportId = ref<string | null>(null);

  // UI状态
  const isLoading = ref(false);
  const isImporting = ref(false);
  const selectedItems = ref<string[]>([]);

  // 范围选择相关状态
  const lastClickedItem = ref<string | null>(null);
  const lastClickedItemType = ref<'video' | 'group' | null>(null);
  const isRangeSelecting = ref(false);
  const rangePreview = ref<string[]>([]);
  const rangePreviewGroups = ref<string[]>([]);

  // 键盘导航相关状态
  const focusedItem = ref<string | null>(null);
  const focusedItemType = ref<'video' | 'group' | null>(null);

  // 错误状态
  const lastError = ref<string | null>(null);

  // UP主列表（从全量数据获取）
  const allUploaders = ref<string[]>([]);

  // ============================================================================
  // 计算属性
  // ============================================================================

  /**
   * 筛选后的显示项列表（支持组和单个视频）
   * 注意：现在由后端进行分页，前端直接使用displayItems
   */
  const filteredDisplayItems = computed(() => {
    return displayItems.value;
  });

  /**
   * 筛选后的缓存列表（向后兼容）
   */
  const filteredCacheItems = computed(() => {
    return filteredDisplayItems.value
      .filter((item) => item.type === 'video')
      .map((item) => item.data as Types.CacheItem);
  });

  /**
   * 排序后的显示项列表（支持组和单个视频）
   * 注意：现在由后端进行排序，前端直接使用displayItems
   */
  const sortedDisplayItems = computed(() => {
    return displayItems.value;
  });

  /**
   * 排序后的缓存列表（向后兼容）
   */
  const sortedCacheItems = computed(() => {
    return sortedDisplayItems.value
      .filter((item) => item.type === 'video')
      .map((item) => item.data as Types.CacheItem);
  });

  /**
   * 分页后的显示项列表
   * 注意：现在由后端进行分页，前端直接使用displayItems
   */
  const paginatedDisplayItems = computed(() => {
    return displayItems.value;
  });

  /**
   * 分页后的缓存列表（向后兼容）
   */
  const paginatedCacheItems = computed(() => {
    return paginatedDisplayItems.value
      .filter((item) => item.type === 'video')
      .map((item) => item.data as Types.CacheItem);
  });

  /**
   * 总缓存数量（使用全量统计数据）
   */
  const totalCacheCount = computed(() => {
    if (cacheStatistics.value) {
      return cacheStatistics.value.totalCount;
    }
    return cacheItems.value.length;
  });

  /**
   * 总文件大小（使用全量统计数据）
   */
  const totalFileSize = computed(() => {
    // 优先使用统计信息中的全量数据
    if (cacheStatistics.value) {
      return cacheStatistics.value.totalSize;
    }
    // 如果没有统计信息，回退到当前页计算
    return cacheItems.value.reduce((sum, item) => sum + item.fileSize, 0);
  });

  /**
   * 平均文件大小（使用全量统计数据）
   */
  const averageFileSize = computed(() => {
    // 优先使用统计信息中的全量数据
    if (cacheStatistics.value) {
      return cacheStatistics.value.averageSize;
    }
    // 如果没有统计信息，回退到当前页计算
    return totalCacheCount.value > 0
      ? totalFileSize.value / totalCacheCount.value
      : 0;
  });

  /**
   * 总时长（使用全量统计数据）
   */
  const totalDuration = computed(() => {
    // 优先使用统计信息中的全量数据
    if (cacheStatistics.value) {
      return cacheStatistics.value.totalDuration;
    }
    // 如果没有统计信息，回退到当前页计算
    return cacheItems.value.reduce((sum, item) => sum + item.duration, 0);
  });

  /**
   * 所有组ID列表（用于筛选）
   */
  const allGroupIds = computed(() => {
    const groupIds = new Set<string>();

    displayItems.value.forEach((item) => {
      if (item.type === 'group') {
        groupIds.add(item.data.groupId);
      } else if (item.data.groupId) {
        groupIds.add(item.data.groupId);
      }
    });

    return Array.from(groupIds).sort();
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
  const isAllSelected = computed(() => {
    if (paginatedDisplayItems.value.length === 0) return false;

    return paginatedDisplayItems.value.every((item) => {
      if (item.type === 'video') {
        return selectedItems.value.includes(item.data.id);
      } else {
        // 对于组，检查是否所有子视频都被选中
        return item.data.videos.every((video) =>
          selectedItems.value.includes(video.id),
        );
      }
    });
  });

  /**
   * 获取选中的组ID列表
   */
  const selectedGroupIds = computed(() => {
    const groupIds = new Set<string>();

    displayItems.value.forEach((item) => {
      if (item.type === 'group') {
        // 检查组内所有视频是否都被选中
        const allVideosSelected = item.data.videos.every((video) =>
          selectedItems.value.includes(video.id),
        );
        if (allVideosSelected && item.data.videos.length > 0) {
          groupIds.add(item.data.groupId);
        }
      }
    });

    return Array.from(groupIds);
  });

  /**
   * 获取选中的单个视频（不属于完全选中的组）
   */
  const selectedSingleVideos = computed(() => {
    const selectedGroupIdsSet = new Set(selectedGroupIds.value);

    return selectedItems.value.filter((itemId) => {
      const item = cacheItems.value.find((cache) => cache.id === itemId);
      if (!item) return false;

      // 如果视频属于完全选中的组，则不包含在单个视频列表中
      if (item.groupId && selectedGroupIdsSet.has(item.groupId)) {
        return false;
      }

      return true;
    });
  });

  /**
   * 获取部分选中的组ID集合
   */
  const partiallySelectedGroupIds = computed(() => {
    const groupIds = new Set<string>();

    displayItems.value.forEach((item) => {
      if (item.type === 'group') {
        if (isGroupPartiallySelected(item.data.groupId)) {
          groupIds.add(item.data.groupId);
        }
      }
    });

    return groupIds;
  });

  /**
   * 导入进度百分比
   */
  const importProgressPercentage = computed(() => {
    if (!importProgress.value) return 0;
    const progress = importProgress.value;
    if (progress.totalDirectories === 0) return 0;
    const percentage = Math.round(
      (progress.processedDirectories / progress.totalDirectories) *
        PROGRESS.MAX_PERCENTAGE,
    );
    return isNaN(percentage) ? 0 : percentage;
  });

  // ============================================================================
  // Actions - 组状态管理
  // ============================================================================

  /**
   * 加载显示项列表（包含组和单个视频）
   */
  async function loadDisplayItems(): Promise<void> {
    if (isLoading.value) return;

    await UnifiedErrorHandler.withErrorBoundary(
      async () => {
        isLoading.value = true;
        lastError.value = null;

        const keyword = currentFilter.value.keyword || '';

        const filters: Types.CacheFilterOptionsRaw = {
          search_query: keyword || null,
          filter_status: currentFilter.value.status?.[0] ?? null,
          filter_uploader: currentFilter.value.uploader ?? null,
          min_size: currentFilter.value.sizeRange?.min ?? null,
          max_size: currentFilter.value.sizeRange?.max ?? null,
          min_duration: currentFilter.value.durationRange?.min ?? null,
          max_duration: currentFilter.value.durationRange?.max ?? null,
          display_type: currentFilter.value.displayType ?? null,
          group_id: currentFilter.value.groupId ?? null,
        };

        const result = await invoke<Types.PaginatedDisplayItemsRaw>(
          'get_cache_display_items_paginated',
          {
            page: pagination.value.currentPage,
            pageSize: pagination.value.pageSize,
            sortBy: currentSort.value.field,
            sortOrder: currentSort.value.direction,
            filters,
          },
        );

        pagination.value = {
          ...pagination.value,
          totalCount: result.total_count,
          totalPages: result.total_pages,
          currentPage: result.current_page,
          pageSize: result.page_size,
        };

        displayItems.value = result.items
          .map((item) => {
            if (item.type === 'single_video' && item.video) {
              return {
                type: 'video' as const,
                data: convertCacheRecordFromRaw(item.video),
              };
            } else if (item.type === 'video_group' && item.group) {
              return {
                type: 'group' as const,
                data: convertCacheGroupFromRaw(item.group),
              };
            }
            return null;
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        cacheItems.value = displayItems.value
          .filter((item) => item.type === 'video')
          .map((item) => item.data as Types.CacheItem);

        await loadGroupStates();
        await updateStatistics();
        return true;
      },
      {
        operation: '加载显示项列表',
        onError: (msg) => {
          lastError.value = msg;
        },
        logLevel: 'error',
      },
    );

    isLoading.value = false;
  }

  /**
   * 加载所有UP主列表（从全量数据）
   */
  async function loadAllUploaders(): Promise<void> {
    try {
      const uploaders = await invoke<string[]>('get_all_uploaders');
      allUploaders.value = uploaders;
    } catch (error) {
      console.error('加载UP主列表失败:', error);
      allUploaders.value = [];
    }
  }

  /**
   * 加载组展开/折叠状态
   */
  async function loadGroupStates(): Promise<void> {
    try {
      const states = await invoke<Types.GroupStateRaw[]>('get_group_states');

      groupStates.value.clear();
      states.forEach((state) => {
        groupStates.value.set(state.group_id, state.is_expanded);
      });

      // 更新显示项中的展开状态
      displayItems.value.forEach((item) => {
        if (item.type === 'group') {
          item.data.isExpanded =
            groupStates.value.get(item.data.groupId) ??
            groupManagerConfig.value.defaultExpanded;
        }
      });
    } catch (error) {
      console.error('加载组状态失败:', error);
      // 如果加载失败，使用默认状态
      displayItems.value.forEach((item) => {
        if (item.type === 'group') {
          item.data.isExpanded = groupManagerConfig.value.defaultExpanded;
        }
      });
    }
  }

  /**
   * 切换组展开/折叠状态
   */
  async function toggleGroupExpansion(groupId: string): Promise<void> {
    const currentState =
      groupStates.value.get(groupId) ??
      groupManagerConfig.value.defaultExpanded;
    const newState = !currentState;

    // 更新本地状态
    groupStates.value.set(groupId, newState);

    // 更新显示项中的状态
    const groupItem = displayItems.value.find(
      (item) => item.type === 'group' && item.data.groupId === groupId,
    );
    if (groupItem && groupItem.type === 'group') {
      groupItem.data.isExpanded = newState;
    }

    const result = await UnifiedErrorHandler.withErrorBoundary(
      async () => {
        // 持久化到后端
        await invoke('set_group_expansion', {
          groupId,
          isExpanded: newState,
        });
        return true;
      },
      {
        operation: '更新组状态',
        onError: (msg) => {
          lastError.value = msg;
        },
        logLevel: 'error',
      },
    );

    // 如果后端操作失败，回滚本地状态
    if (!result) {
      const originalState = !newState;
      groupStates.value.set(groupId, originalState);

      const groupItem = displayItems.value.find(
        (item) => item.type === 'group' && item.data.groupId === groupId,
      );
      if (groupItem && groupItem.type === 'group') {
        groupItem.data.isExpanded = originalState;
      }
    }
  }

  /**
   * 获取组的展开状态
   */
  function getGroupExpansionState(groupId: string): boolean {
    return (
      groupStates.value.get(groupId) ?? groupManagerConfig.value.defaultExpanded
    );
  }

  /**
   * 设置组管理器配置
   */
  function setGroupManagerConfig(
    config: Partial<Types.GroupManagerConfig>,
  ): void {
    groupManagerConfig.value = { ...groupManagerConfig.value, ...config };
  }

  // ============================================================================
  // Actions - 缓存列表管理
  // ============================================================================

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
      pagination.value.totalPages = Math.ceil(
        pagination.value.totalCount / pageSize,
      );
    }
  }

  // ============================================================================
  // Actions - 缓存项操作
  // ============================================================================

  /**
   * 删除缓存项
   */
  async function deleteCacheItem(id: string): Promise<void> {
    const result = await UnifiedErrorHandler.withErrorBoundary(
      async () => {
        await cacheManagementService.deleteCacheItem(id);

        // 从本地状态中移除
        const index = cacheItems.value.findIndex((item) => item.id === id);
        if (index !== -1) {
          cacheItems.value.splice(index, 1);
        }

        // 从显示项列表中移除
        displayItems.value = displayItems.value.filter((item) => {
          if (item.type === 'video') {
            return item.data.id !== id;
          } else {
            // 对于组，移除被删除的视频
            item.data.videos = item.data.videos.filter(
              (video) => video.id !== id,
            );

            // 如果组内视频数量少于最小组大小，将剩余视频转为单个视频
            if (
              item.data.videos.length < groupManagerConfig.value.minGroupSize
            ) {
              item.data.videos.forEach((video) => {
                displayItems.value.push({
                  type: 'video',
                  data: video,
                });
              });
              return false; // 移除组
            }

            // 更新组统计信息
            if (item.data.videos.length > 0) {
              item.data.videoCount = item.data.videos.length;
              item.data.totalDuration = item.data.videos.reduce(
                (sum, video) => sum + video.duration,
                0,
              );
              item.data.totalFileSize = item.data.videos.reduce(
                (sum, video) => sum + video.fileSize,
                0,
              );
              item.data.latestDownloadTime = new Date(
                Math.max(
                  ...item.data.videos.map((video) =>
                    video.downloadTime.getTime(),
                  ),
                ),
              );
            }

            return true; // 保留组
          }
        });

        // 从选中列表中移除
        const selectedIndex = selectedItems.value.indexOf(id);
        if (selectedIndex !== -1) {
          selectedItems.value.splice(selectedIndex, 1);
        }

        // 更新统计信息和 UP 主列表
        await updateStatistics();
        await loadAllUploaders();
        return true;
      },
      {
        operation: '删除缓存项',
        onError: (msg) => {
          lastError.value = msg;
        },
        logLevel: 'error',
      },
    );

    if (!result) {
      throw new Error('删除缓存项失败');
    }
  }

  /**
   * 批量删除缓存项
   */
  async function batchDeleteCacheItems(
    ids: string[],
  ): Promise<Types.BatchOperationResult[]> {
    const result = await UnifiedErrorHandler.withErrorBoundary(
      async () => {
        const results = await cacheManagementService.batchDeleteCacheItems(ids);

        // 移除成功删除的项目
        const successIds = results
          .filter((r) => r.success)
          .map((r) => r.cacheId);
        cacheItems.value = cacheItems.value.filter(
          (item) => !successIds.includes(item.id),
        );

        // 更新显示项列表
        displayItems.value = displayItems.value.filter((item) => {
          if (item.type === 'video') {
            return !successIds.includes(item.data.id);
          } else {
            // 对于组，移除被删除的视频
            item.data.videos = item.data.videos.filter(
              (video) => !successIds.includes(video.id),
            );

            // 如果组内视频数量少于最小组大小，将剩余视频转为单个视频
            if (
              item.data.videos.length < groupManagerConfig.value.minGroupSize
            ) {
              item.data.videos.forEach((video) => {
                displayItems.value.push({
                  type: 'video',
                  data: video,
                });
              });
              return false; // 移除组
            }

            // 更新组统计信息
            item.data.videoCount = item.data.videos.length;
            item.data.totalDuration = item.data.videos.reduce(
              (sum, video) => sum + video.duration,
              0,
            );
            item.data.totalFileSize = item.data.videos.reduce(
              (sum, video) => sum + video.fileSize,
              0,
            );
            item.data.latestDownloadTime = new Date(
              Math.max(
                ...item.data.videos.map((video) =>
                  video.downloadTime.getTime(),
                ),
              ),
            );

            return true; // 保留组
          }
        });

        // 清除选中状态
        selectedItems.value = selectedItems.value.filter(
          (id) => !successIds.includes(id),
        );

        // 更新统计信息和 UP 主列表
        await updateStatistics();
        await loadAllUploaders();

        return results;
      },
      {
        operation: '批量删除',
        onError: (msg) => {
          lastError.value = msg;
        },
        logLevel: 'error',
      },
    );

    if (!result) {
      throw new Error('批量删除失败');
    }

    return result;
  }

  /**
   * 删除整个组
   */
  async function deleteGroup(
    groupId: string,
  ): Promise<Types.BatchOperationResult[]> {
    const groupItem = displayItems.value.find(
      (item) => item.type === 'group' && item.data.groupId === groupId,
    );

    if (!groupItem || groupItem.type !== 'group') {
      throw new Error('组不存在');
    }

    const videoIds = groupItem.data.videos.map((video) => video.id);
    return await batchDeleteCacheItems(videoIds);
  }

  /**
   * 播放组内所有视频
   */
  async function playGroup(groupId: string): Promise<void> {
    const groupItem = displayItems.value.find(
      (item) => item.type === 'group' && item.data.groupId === groupId,
    );

    if (!groupItem || groupItem.type !== 'group') {
      throw new Error('组不存在');
    }

    try {
      // 按顺序播放组内所有视频
      for (const video of groupItem.data.videos) {
        await cacheManagementService.playCacheItem(video);
      }
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '播放组失败';
      throw error;
    }
  }

  /**
   * 打开组文件夹
   */
  async function openGroupFolder(groupId: string): Promise<void> {
    const groupItem = displayItems.value.find(
      (item) => item.type === 'group' && item.data.groupId === groupId,
    );

    if (!groupItem || groupItem.type !== 'group') {
      throw new Error('组不存在');
    }

    try {
      // 打开第一个视频的文件夹
      if (groupItem.data.videos.length > 0) {
        await cacheManagementService.openCacheFolder(groupItem.data.videos[0]);
      }
    } catch (error) {
      lastError.value =
        error instanceof Error ? error.message : '打开组文件夹失败';
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
      lastError.value =
        error instanceof Error ? error.message : '打开文件夹失败';
      throw error;
    }
  }

  /**
   * 刷新缓存项状态
   */
  async function refreshCacheItemStatus(id: string): Promise<void> {
    try {
      const updatedItem =
        await cacheManagementService.refreshCacheItemStatus(id);

      // 更新本地状态
      const index = cacheItems.value.findIndex((item) => item.id === id);
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
    // 记录最后点击的项目
    lastClickedItem.value = id;
    lastClickedItemType.value = 'video';
    isRangeSelecting.value = false;
    rangePreview.value = [];
    rangePreviewGroups.value = [];
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
    // 记录最后点击的项目
    lastClickedItem.value = id;
    lastClickedItemType.value = 'video';
    isRangeSelecting.value = false;
    rangePreview.value = [];
    rangePreviewGroups.value = [];
  }

  /**
   * 选择组（选择组内所有视频）
   */
  function selectGroup(groupId: string): void {
    const groupItem = displayItems.value.find(
      (item) => item.type === 'group' && item.data.groupId === groupId,
    );

    if (groupItem && groupItem.type === 'group') {
      groupItem.data.videos.forEach((video) => {
        if (!selectedItems.value.includes(video.id)) {
          selectedItems.value.push(video.id);
        }
      });
    }
    // 记录最后点击的项目
    lastClickedItem.value = groupId;
    lastClickedItemType.value = 'group';
    isRangeSelecting.value = false;
    rangePreview.value = [];
    rangePreviewGroups.value = [];
  }

  /**
   * 取消选择组（取消选择组内所有视频）
   */
  function unselectGroup(groupId: string): void {
    const groupItem = displayItems.value.find(
      (item) => item.type === 'group' && item.data.groupId === groupId,
    );

    if (groupItem && groupItem.type === 'group') {
      groupItem.data.videos.forEach((video) => {
        const index = selectedItems.value.indexOf(video.id);
        if (index !== -1) {
          selectedItems.value.splice(index, 1);
        }
      });
    }
  }

  /**
   * 切换组选择状态
   */
  function toggleGroupSelection(groupId: string): void {
    const groupItem = displayItems.value.find(
      (item) => item.type === 'group' && item.data.groupId === groupId,
    );

    if (groupItem && groupItem.type === 'group') {
      const allSelected = groupItem.data.videos.every((video) =>
        selectedItems.value.includes(video.id),
      );

      if (allSelected) {
        unselectGroup(groupId);
      } else {
        selectGroup(groupId);
      }
    }
    // 记录最后点击的项目
    lastClickedItem.value = groupId;
    lastClickedItemType.value = 'group';
    isRangeSelecting.value = false;
    rangePreview.value = [];
    rangePreviewGroups.value = [];
  }

  /**
   * 检查组是否被选中
   */
  function isGroupSelected(groupId: string): boolean {
    const groupItem = displayItems.value.find(
      (item) => item.type === 'group' && item.data.groupId === groupId,
    );

    if (groupItem && groupItem.type === 'group') {
      return (
        groupItem.data.videos.length > 0 &&
        groupItem.data.videos.every((video) =>
          selectedItems.value.includes(video.id),
        )
      );
    }

    return false;
  }

  /**
   * 检查组是否部分选中
   */
  function isGroupPartiallySelected(groupId: string): boolean {
    const groupItem = displayItems.value.find(
      (item) => item.type === 'group' && item.data.groupId === groupId,
    );

    if (groupItem && groupItem.type === 'group') {
      const selectedCount = groupItem.data.videos.filter((video) =>
        selectedItems.value.includes(video.id),
      ).length;

      return selectedCount > 0 && selectedCount < groupItem.data.videos.length;
    }

    return false;
  }

  /**
   * 全选当前页
   */
  function selectAllCurrentPage(): void {
    paginatedDisplayItems.value.forEach((item) => {
      if (item.type === 'video') {
        if (!selectedItems.value.includes(item.data.id)) {
          selectedItems.value.push(item.data.id);
        }
      } else {
        // 选择组内所有视频
        selectGroup(item.data.groupId);
      }
    });
  }

  /**
   * 取消全选当前页
   */
  function unselectAllCurrentPage(): void {
    paginatedDisplayItems.value.forEach((item) => {
      if (item.type === 'video') {
        const index = selectedItems.value.indexOf(item.data.id);
        if (index !== -1) {
          selectedItems.value.splice(index, 1);
        }
      } else {
        // 取消选择组内所有视频
        unselectGroup(item.data.groupId);
      }
    });
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
    lastClickedItem.value = null;
    lastClickedItemType.value = null;
    isRangeSelecting.value = false;
    rangePreview.value = [];
    rangePreviewGroups.value = [];
  }

  /**
   * 计算范围选择预览
   * 返回从lastClickedItem到targetId之间的所有项目
   */
  function calculateRangePreview(
    targetId: string,
    targetType: 'video' | 'group',
  ): { videos: string[]; groups: string[] } {
    if (!lastClickedItem.value || !lastClickedItemType.value) {
      return { videos: [], groups: [] };
    }

    const videos: string[] = [];
    const groups: string[] = [];

    // 构建平铺的项目列表（包含组和单个视频）
    const flatItems: Array<{
      id: string;
      type: 'video' | 'group';
      index: number;
    }> = [];

    displayItems.value.forEach((item, index) => {
      if (item.type === 'video') {
        flatItems.push({ id: item.data.id, type: 'video', index });
      } else if (item.type === 'group') {
        flatItems.push({ id: item.data.groupId, type: 'group', index });
      }
    });

    // 找到起始和结束位置
    const startIndex = flatItems.findIndex(
      (item) =>
        item.id === lastClickedItem.value &&
        item.type === lastClickedItemType.value,
    );
    const endIndex = flatItems.findIndex(
      (item) => item.id === targetId && item.type === targetType,
    );

    if (startIndex === -1 || endIndex === -1) {
      return { videos: [], groups: [] };
    }

    // 确定范围的起始和结束
    const rangeStart = Math.min(startIndex, endIndex);
    const rangeEnd = Math.max(startIndex, endIndex);

    // 收集范围内的所有项目
    for (let i = rangeStart; i <= rangeEnd; i++) {
      const item = flatItems[i];
      if (item.type === 'video') {
        videos.push(item.id);
      } else if (item.type === 'group') {
        groups.push(item.id);
        // 同时添加组内的所有视频
        const groupItem = displayItems.value.find(
          (displayItem) =>
            displayItem.type === 'group' &&
            displayItem.data.groupId === item.id,
        );
        if (groupItem && groupItem.type === 'group') {
          groupItem.data.videos.forEach((video) => {
            if (!videos.includes(video.id)) {
              videos.push(video.id);
            }
          });
        }
      }
    }

    return { videos, groups };
  }

  /**
   * 范围选择（从lastClickedItem到targetId）
   */
  function selectRange(targetId: string, targetType: 'video' | 'group'): void {
    if (!lastClickedItem.value || !lastClickedItemType.value) {
      // 如果没有起始位置，直接选择目标项目
      if (targetType === 'video') {
        selectCacheItem(targetId);
      } else {
        selectGroup(targetId);
      }
      return;
    }

    // 计算范围预览
    const preview = calculateRangePreview(targetId, targetType);

    // 添加范围内的所有视频到选择列表
    preview.videos.forEach((videoId) => {
      if (!selectedItems.value.includes(videoId)) {
        selectedItems.value.push(videoId);
      }
    });

    // 更新最后点击的项目为目标项目
    lastClickedItem.value = targetId;
    lastClickedItemType.value = targetType;

    // 清除范围选择预览
    isRangeSelecting.value = false;
    rangePreview.value = [];
    rangePreviewGroups.value = [];
  }

  /**
   * 更新范围选择预览（用于Shift+点击时显示预览）
   */
  function updateRangePreview(
    targetId: string,
    targetType: 'video' | 'group',
  ): void {
    if (!lastClickedItem.value || !lastClickedItemType.value) {
      isRangeSelecting.value = false;
      rangePreview.value = [];
      rangePreviewGroups.value = [];
      return;
    }

    const preview = calculateRangePreview(targetId, targetType);
    isRangeSelecting.value = true;
    rangePreview.value = preview.videos;
    rangePreviewGroups.value = preview.groups;
  }

  /**
   * 清除范围选择预览
   */
  function clearRangePreview(): void {
    isRangeSelecting.value = false;
    rangePreview.value = [];
    rangePreviewGroups.value = [];
  }

  // ============================================================================
  // Actions - 键盘导航管理
  // ============================================================================

  /**
   * 设置焦点项目
   */
  function setFocusedItem(
    itemId: string | null,
    itemType: 'video' | 'group' | null,
  ): void {
    focusedItem.value = itemId;
    focusedItemType.value = itemType;
  }

  /**
   * 获取焦点项目
   */
  function getFocusedItem(): {
    itemId: string | null;
    itemType: 'video' | 'group' | null;
  } {
    return {
      itemId: focusedItem.value,
      itemType: focusedItemType.value,
    };
  }

  /**
   * 向上导航焦点
   */
  function navigateFocusUp(): void {
    if (!focusedItem.value) {
      // 如果没有焦点，设置焦点到第一个项目
      if (paginatedDisplayItems.value.length > 0) {
        const firstItem = paginatedDisplayItems.value[0];
        if (firstItem.type === 'video') {
          setFocusedItem(firstItem.data.id, 'video');
        } else {
          setFocusedItem(firstItem.data.groupId, 'group');
        }
      }
      return;
    }

    // 找到当前焦点项目的索引
    let currentIndex = -1;
    for (let i = 0; i < paginatedDisplayItems.value.length; i++) {
      const item = paginatedDisplayItems.value[i];
      if (
        (focusedItemType.value === 'video' &&
          item.type === 'video' &&
          item.data.id === focusedItem.value) ||
        (focusedItemType.value === 'group' &&
          item.type === 'group' &&
          item.data.groupId === focusedItem.value)
      ) {
        currentIndex = i;
        break;
      }
    }

    // 移动到上一个项目
    if (currentIndex > 0) {
      const prevItem = paginatedDisplayItems.value[currentIndex - 1];
      if (prevItem.type === 'video') {
        setFocusedItem(prevItem.data.id, 'video');
      } else {
        setFocusedItem(prevItem.data.groupId, 'group');
      }
    }
  }

  /**
   * 向下导航焦点
   */
  function navigateFocusDown(): void {
    if (!focusedItem.value) {
      // 如果没有焦点，设置焦点到第一个项目
      if (paginatedDisplayItems.value.length > 0) {
        const firstItem = paginatedDisplayItems.value[0];
        if (firstItem.type === 'video') {
          setFocusedItem(firstItem.data.id, 'video');
        } else {
          setFocusedItem(firstItem.data.groupId, 'group');
        }
      }
      return;
    }

    // 找到当前焦点项目的索引
    let currentIndex = -1;
    for (let i = 0; i < paginatedDisplayItems.value.length; i++) {
      const item = paginatedDisplayItems.value[i];
      if (
        (focusedItemType.value === 'video' &&
          item.type === 'video' &&
          item.data.id === focusedItem.value) ||
        (focusedItemType.value === 'group' &&
          item.type === 'group' &&
          item.data.groupId === focusedItem.value)
      ) {
        currentIndex = i;
        break;
      }
    }

    // 移动到下一个项目
    if (
      currentIndex >= 0 &&
      currentIndex < paginatedDisplayItems.value.length - 1
    ) {
      const nextItem = paginatedDisplayItems.value[currentIndex + 1];
      if (nextItem.type === 'video') {
        setFocusedItem(nextItem.data.id, 'video');
      } else {
        setFocusedItem(nextItem.data.groupId, 'group');
      }
    }
  }

  /**
   * 清除焦点
   */
  function clearFocus(): void {
    focusedItem.value = null;
    focusedItemType.value = null;
  }

  // ============================================================================
  // Actions - 导入管理
  // ============================================================================

  /**
   * 开始导入
   */
  async function startImport(
    path: string,
    options: Types.ImportOptions,
  ): Promise<string> {
    const result = await UnifiedErrorHandler.withErrorBoundary(
      async () => {
        isImporting.value = true;
        lastError.value = null;

        const importId = await cacheImportService.startImport(path, options);
        activeImportId.value = importId;

        // 开始监听进度
        const cancelProgress = await cacheImportService.listenImportProgress(
          importId,
          (progress) => {
            // 确保统计数据有默认值
            importProgress.value = {
              ...progress,
              successCount: progress.successCount ?? 0,
              failureCount: progress.failureCount ?? 0,
              skippedCount: progress.skippedCount ?? 0,
              totalDirectories: progress.totalDirectories ?? 0,
              processedDirectories: progress.processedDirectories ?? 0,
            };

            // 检查是否完成
            if (
              progress.status === 'Completed' ||
              progress.status === 'Error' ||
              progress.status === 'Cancelled'
            ) {
              isImporting.value = false;
              if (progress.status === 'Completed') {
                // 刷新缓存列表
                loadDisplayItems();
                // 刷新缓存根目录状态
                import('@/store/transfer').then(({ useTransferStore }) => {
                  const transferStore = useTransferStore();
                  transferStore.refreshCacheRoot();
                });
              }
            }
          },
        );

        // 保存取消函数以便后续使用
        (
          window as Window & { __cacheImportCancelProgress?: () => void }
        ).__cacheImportCancelProgress = cancelProgress;

        return importId;
      },
      {
        operation: '开始导入',
        onError: (msg) => {
          lastError.value = msg;
          isImporting.value = false;
        },
        logLevel: 'error',
      },
    );

    if (!result) {
      throw new Error('开始导入失败');
    }

    return result;
  }

  /**
   * 取消导入
   */
  async function cancelImport(): Promise<void> {
    if (!activeImportId.value) return;

    const result = await UnifiedErrorHandler.withErrorBoundary(
      async () => {
        await cacheImportService.cancelImport(activeImportId.value!);

        // 取消进度监听
        const windowWithCancel = window as Window & {
          __cacheImportCancelProgress?: (() => void) | null;
        };
        if (windowWithCancel.__cacheImportCancelProgress) {
          windowWithCancel.__cacheImportCancelProgress();
          windowWithCancel.__cacheImportCancelProgress = null;
        }

        // 清理状态
        isImporting.value = false;
        importProgress.value = null;
        activeImportId.value = null;
        return true;
      },
      {
        operation: '取消导入',
        onError: (msg) => {
          lastError.value = msg;
        },
        logLevel: 'error',
      },
    );

    if (!result) {
      throw new Error('取消导入失败');
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

    // 重置分页到第一页（导入新数据后应在第一页查看）
    pagination.value.currentPage = 1;

    // 刷新缓存列表
    loadDisplayItems();
  }

  /**
   * 增量扫描缓存根目录
   * 检测新增或删除的视频，自动导入新视频并清理已删除的记录
   */
  async function incrementalScanCacheRoot(): Promise<Types.IncrementalScanResult> {
    // 检查是否已设置缓存根目录，未设置时直接返回空结果
    const { useTransferStore } = await import('@/store/transfer');
    const transferStore = useTransferStore();
    if (!transferStore.currentCacheRoot) {
      return {
        scannedRoot: '',
        newDirectoriesCount: 0,
        deletedDirectoriesCount: 0,
        importedCount: 0,
        cleanedCount: 0,
        newDirectories: [],
        deletedDirectories: [],
      };
    }

    const result = await UnifiedErrorHandler.withErrorBoundary(
      async () => {
        isLoading.value = true;
        lastError.value = null;

        const result = await cacheManagementService.incrementalScanCacheRoot();

        // 如果有新导入或清理的记录，刷新缓存列表
        if (result.importedCount > 0 || result.cleanedCount > 0) {
          await loadDisplayItems();
        }

        return result;
      },
      {
        operation: '增量扫描',
        onError: (msg) => {
          lastError.value = msg;
        },
        logLevel: 'error',
      },
    );

    isLoading.value = false;

    if (!result) {
      throw new Error('增量扫描失败');
    }

    return result;
  }

  // ============================================================================
  // Actions - 数据转换函数
  // ============================================================================

  /**
   * 转换后端缓存记录格式
   */
  function convertCacheRecordFromRaw(
    raw: Types.CacheRecordRaw,
  ): Types.CacheItem {
    if (!raw) {
      throw new Error('缓存记录数据为空');
    }

    // 处理时间戳：后端存储的已经是毫秒级时间戳，直接使用
    const downloadTime = new Date(raw.download_time || 0);
    const importTime = new Date(raw.import_time || 0);

    return {
      id: raw.id || '',
      bvid: raw.bvid || '',
      aid: raw.aid || 0,
      cid: raw.cid || 0,
      title: raw.title || '未知标题',
      uname: raw.uname || '未知用户',
      coverUrl: raw.cover_url || '',
      duration: raw.duration || 0,
      fileSize: raw.file_size || 0,
      cachePath: raw.cache_path || '',
      downloadTime,
      importTime,
      status: (raw.status as Types.CacheStatus) || 'available',
      groupId: raw.group_id || undefined,
      groupTitle: raw.group_title || undefined,
      p: raw.p || 1,
    };
  }

  /**
   * 转换后端组数据格式
   */
  function convertCacheGroupFromRaw(
    raw: Types.CacheGroupRaw,
  ): Types.CacheGroup {
    if (!raw) {
      throw new Error('缓存组数据为空');
    }

    if (!raw.group_id) {
      throw new Error('缓存组缺少 group_id 字段');
    }

    // 处理时间戳：后端存储的已经是毫秒级时间戳，直接使用
    const latestDownloadTime = new Date(raw.latest_download_time || 0);

    return {
      groupId: raw.group_id,
      title: raw.title || '未知标题',
      coverUrl: raw.cover_url || '',
      uname: raw.uname || '未知用户',
      videoCount: raw.video_count || 0,
      totalDuration: raw.total_duration || 0,
      totalFileSize: raw.total_file_size || 0,
      latestDownloadTime,
      videos: (raw.videos || []).map(convertCacheRecordFromRaw),
      isExpanded: raw.is_expanded || false,
    };
  }

  // ============================================================================
  // Actions - 工具函数
  // ============================================================================

  /**
   * 更新统计信息
   */
  async function updateStatistics(): Promise<void> {
    try {
      const rawStats = await invoke<Types.CacheStatisticsRaw>(
        'get_cache_statistics',
      );

      // 转换后端数据格式
      cacheStatistics.value = {
        totalCount: rawStats.total_count,
        availableCount: rawStats.available_count,
        unavailableCount: rawStats.unavailable_count,
        incompleteCount: rawStats.incomplete_count,
        totalSize: rawStats.total_size,
        averageSize: rawStats.average_size,
        totalDuration: rawStats.total_duration,
        groupCount: rawStats.group_count,
        singleVideoCount: rawStats.single_video_count,
        averageVideosPerGroup: rawStats.average_videos_per_group,
      };
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
    currentSort.value = { field: 'completionTime', direction: 'desc' };
    importProgress.value = null;
    activeImportId.value = null;
    isLoading.value = false;
    isImporting.value = false;
    selectedItems.value = [];
    lastError.value = null;
    pagination.value = {
      currentPage: PAGINATION.DEFAULT_PAGE,
      pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
      totalCount: 0,
      totalPages: 0,
    };

    // 重置范围选择相关状态
    lastClickedItem.value = null;
    lastClickedItemType.value = null;
    isRangeSelecting.value = false;
    rangePreview.value = [];
    rangePreviewGroups.value = [];

    // 重置键盘导航相关状态
    focusedItem.value = null;
    focusedItemType.value = null;

    // 重置组相关状态
    displayItems.value = [];
    groupStates.value.clear();
    cacheGroups.value = [];
    groupManagerConfig.value = {
      defaultExpanded: false,
      minGroupSize: 2,
      titleGenerationStrategy: 'prefix',
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

    // 范围选择相关状态
    lastClickedItem,
    lastClickedItemType,
    isRangeSelecting,
    rangePreview,
    rangePreviewGroups,

    // 键盘导航相关状态
    focusedItem,
    focusedItemType,

    // 组相关状态
    displayItems,
    groupStates,
    cacheGroups,
    groupManagerConfig,

    // 计算属性
    filteredCacheItems,
    sortedCacheItems,
    paginatedCacheItems,
    filteredDisplayItems,
    sortedDisplayItems,
    paginatedDisplayItems,
    totalCacheCount,
    totalFileSize,
    averageFileSize,
    totalDuration,
    allUploaders,
    allGroupIds,
    hasSelectedItems,
    selectedItemsCount,
    isAllSelected,
    selectedGroupIds,
    selectedSingleVideos,
    partiallySelectedGroupIds,
    importProgressPercentage,

    // 组状态管理
    loadDisplayItems,
    loadGroupStates,
    loadAllUploaders,
    toggleGroupExpansion,
    getGroupExpansionState,
    setGroupManagerConfig,

    // 缓存列表管理
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

    // 组操作
    deleteGroup,
    playGroup,
    openGroupFolder,

    // 选择管理
    selectCacheItem,
    unselectCacheItem,
    toggleCacheItemSelection,
    selectGroup,
    unselectGroup,
    toggleGroupSelection,
    isGroupSelected,
    isGroupPartiallySelected,
    selectAllCurrentPage,
    unselectAllCurrentPage,
    toggleSelectAll,
    clearSelection,

    // 范围选择
    calculateRangePreview,
    selectRange,
    updateRangePreview,
    clearRangePreview,

    // 键盘导航
    setFocusedItem,
    getFocusedItem,
    navigateFocusUp,
    navigateFocusDown,
    clearFocus,

    // 导入管理
    startImport,
    cancelImport,
    completeImport,
    incrementalScanCacheRoot,

    // 数据转换
    convertCacheRecordFromRaw,
    convertCacheGroupFromRaw,

    // 工具函数
    updateStatistics,
    clearError,
    resetState,
  };
});
