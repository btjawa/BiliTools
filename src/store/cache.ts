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

  // 组相关状态
  const displayItems = ref<Types.DisplayItem[]>([]);
  const groupStates = ref<Map<string, boolean>>(new Map());
  const cacheGroups = ref<Types.CacheGroup[]>([]);
  const groupManagerConfig = ref<Types.GroupManagerConfig>({
    defaultExpanded: false,
    minGroupSize: 2,
    enableGrouping: true,
    titleGenerationStrategy: 'prefix',
  });

  // 筛选和排序状态
  const currentFilter = ref<Types.CacheFilter>({});
  const currentSort = ref<Types.SortOption>({
    field: 'completionTime',
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
   * 筛选后的显示项列表（支持组和单个视频）
   */
  const filteredDisplayItems = computed(() => {
    let items = [...displayItems.value];
    const filter = currentFilter.value;

    // 关键词筛选
    if (filter.keyword) {
      const keyword = filter.keyword.toLowerCase();
      items = items.filter((item) => {
        if (item.type === 'video') {
          return (
            item.data.title.toLowerCase().includes(keyword) ||
            item.data.uname.toLowerCase().includes(keyword)
          );
        } else {
          // 对于组，搜索组标题和组内视频标题
          return (
            item.data.title.toLowerCase().includes(keyword) ||
            item.data.uname.toLowerCase().includes(keyword) ||
            item.data.videos.some(
              (video) =>
                video.title.toLowerCase().includes(keyword) ||
                video.uname.toLowerCase().includes(keyword),
            )
          );
        }
      });
    }

    // 状态筛选
    if (filter.status && filter.status.length > 0) {
      items = items.filter((item) => {
        if (item.type === 'video') {
          return filter.status!.includes(item.data.status);
        } else {
          // 对于组，检查组内是否有符合状态的视频
          return item.data.videos.some((video) =>
            filter.status!.includes(video.status),
          );
        }
      });
    }

    // UP主筛选
    if (filter.uploader) {
      items = items.filter((item) => {
        if (item.type === 'video') {
          return item.data.uname === filter.uploader;
        } else {
          // 对于组，检查组内是否有该UP主的视频
          return (
            item.data.uname === filter.uploader ||
            item.data.videos.some((video) => video.uname === filter.uploader)
          );
        }
      });
    }

    // 显示类型筛选
    if (filter.displayType) {
      if (filter.displayType === 'groups') {
        items = items.filter((item) => item.type === 'group');
      } else if (filter.displayType === 'singles') {
        items = items.filter((item) => item.type === 'video');
      }
      // 'all' 不需要筛选
    }

    // 按组ID筛选
    if (filter.groupId) {
      items = items.filter((item) => {
        if (item.type === 'group') {
          return item.data.groupId === filter.groupId;
        } else {
          return item.data.groupId === filter.groupId;
        }
      });
    }

    // 文件大小范围筛选
    if (filter.sizeRange) {
      items = items.filter((item) => {
        const size =
          item.type === 'video' ? item.data.fileSize : item.data.totalFileSize;
        if (
          filter.sizeRange!.min !== undefined &&
          size < filter.sizeRange!.min!
        ) {
          return false;
        }
        if (
          filter.sizeRange!.max !== undefined &&
          size > filter.sizeRange!.max!
        ) {
          return false;
        }
        return true;
      });
    }

    // 时长范围筛选
    if (filter.durationRange) {
      items = items.filter((item) => {
        const duration =
          item.type === 'video' ? item.data.duration : item.data.totalDuration;
        if (
          filter.durationRange!.min !== undefined &&
          duration < filter.durationRange!.min!
        ) {
          return false;
        }
        if (
          filter.durationRange!.max !== undefined &&
          duration > filter.durationRange!.max!
        ) {
          return false;
        }
        return true;
      });
    }

    // 导入时间范围筛选
    if (filter.importTimeRange) {
      items = items.filter((item) => {
        const importTime =
          item.type === 'video'
            ? item.data.importTime
            : item.data.latestDownloadTime;
        if (
          filter.importTimeRange!.start &&
          importTime < filter.importTimeRange!.start!
        ) {
          return false;
        }
        if (
          filter.importTimeRange!.end &&
          importTime > filter.importTimeRange!.end!
        ) {
          return false;
        }
        return true;
      });
    }

    return items;
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
   */
  const sortedDisplayItems = computed(() => {
    const items = [...filteredDisplayItems.value];
    const sort = currentSort.value;

    items.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sort.field) {
        case 'title':
          aValue = a.type === 'video' ? a.data.title : a.data.title;
          bValue = b.type === 'video' ? b.data.title : b.data.title;
          break;
        case 'uname':
          aValue = a.type === 'video' ? a.data.uname : a.data.uname;
          bValue = b.type === 'video' ? b.data.uname : b.data.uname;
          break;
        case 'duration':
          aValue = a.type === 'video' ? a.data.duration : a.data.totalDuration;
          bValue = b.type === 'video' ? b.data.duration : b.data.totalDuration;
          break;
        case 'fileSize':
          aValue = a.type === 'video' ? a.data.fileSize : a.data.totalFileSize;
          bValue = b.type === 'video' ? b.data.fileSize : b.data.totalFileSize;
          break;
        case 'downloadTime':
          aValue =
            a.type === 'video'
              ? a.data.downloadTime.getTime()
              : a.data.latestDownloadTime.getTime();
          bValue =
            b.type === 'video'
              ? b.data.downloadTime.getTime()
              : b.data.latestDownloadTime.getTime();
          break;
        case 'completionTime':
          // 使用 downloadTime 作为完成时间
          aValue =
            a.type === 'video'
              ? a.data.downloadTime.getTime()
              : a.data.latestDownloadTime.getTime();
          bValue =
            b.type === 'video'
              ? b.data.downloadTime.getTime()
              : b.data.latestDownloadTime.getTime();
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
   * 排序后的缓存列表（向后兼容）
   */
  const sortedCacheItems = computed(() => {
    return sortedDisplayItems.value
      .filter((item) => item.type === 'video')
      .map((item) => item.data as Types.CacheItem);
  });

  /**
   * 分页后的显示项列表
   */
  const paginatedDisplayItems = computed(() => {
    const items = sortedDisplayItems.value;
    const startIndex =
      (pagination.value.currentPage - 1) * pagination.value.pageSize;
    const endIndex = startIndex + pagination.value.pageSize;

    return items.slice(startIndex, endIndex);
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
   * 总缓存数量
   */
  const totalCacheCount = computed(() => cacheItems.value.length);

  /**
   * 可用缓存数量
   */
  const availableCacheCount = computed(
    () => cacheItems.value.filter((item) => item.status === 'available').length,
  );

  /**
   * 不可用缓存数量
   */
  const unavailableCacheCount = computed(
    () =>
      cacheItems.value.filter((item) => item.status === 'unavailable').length,
  );

  /**
   * 不完整缓存数量
   */
  const incompleteCacheCount = computed(
    () =>
      cacheItems.value.filter((item) => item.status === 'incomplete').length,
  );

  /**
   * 总文件大小
   */
  const totalFileSize = computed(() =>
    cacheItems.value.reduce((sum, item) => sum + item.fileSize, 0),
  );

  /**
   * 平均文件大小
   */
  const averageFileSize = computed(() =>
    totalCacheCount.value > 0 ? totalFileSize.value / totalCacheCount.value : 0,
  );

  /**
   * 总时长
   */
  const totalDuration = computed(() =>
    cacheItems.value.reduce((sum, item) => sum + item.duration, 0),
  );

  /**
   * 所有UP主列表（用于筛选）
   */
  const allUploaders = computed(() => {
    const uploaders = new Set<string>();

    displayItems.value.forEach((item) => {
      if (item.type === 'video') {
        uploaders.add(item.data.uname);
      } else {
        uploaders.add(item.data.uname);
        item.data.videos.forEach((video) => uploaders.add(video.uname));
      }
    });

    return Array.from(uploaders).sort();
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
   * 组数量
   */
  const groupCount = computed(
    () => displayItems.value.filter((item) => item.type === 'group').length,
  );

  /**
   * 单个视频数量（不属于任何组）
   */
  const singleVideoCount = computed(
    () => displayItems.value.filter((item) => item.type === 'video').length,
  );

  /**
   * 平均每组视频数量
   */
  const averageVideosPerGroup = computed(() => {
    const groups = displayItems.value.filter((item) => item.type === 'group');
    if (groups.length === 0) return 0;

    const totalVideos = groups.reduce(
      (sum, item) => sum + (item.data as Types.CacheGroup).videoCount,
      0,
    );

    return Math.round((totalVideos / groups.length) * 100) / 100;
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
   * 导入进度百分比
   */
  const importProgressPercentage = computed(() => {
    if (!importProgress.value) return 0;
    const progress = importProgress.value;
    if (progress.totalDirectories === 0) return 0;
    return Math.round(
      (progress.processedDirectories / progress.totalDirectories) * 100,
    );
  });

  // ============================================================================
  // Actions - 组状态管理
  // ============================================================================

  /**
   * 加载显示项列表（包含组和单个视频）
   */
  async function loadDisplayItems(): Promise<void> {
    if (isLoading.value) return;

    try {
      isLoading.value = true;
      lastError.value = null;

      const items = await invoke<Types.DisplayItemRaw[]>(
        'get_cache_display_items',
        {
          filter: currentFilter.value,
          sort: currentSort.value,
          pagination: pagination.value,
        },
      );

      // 转换后端数据格式
      displayItems.value = items
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
          } else {
            console.warn('无效的显示项数据:', item);
            return null;
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      // 更新缓存项列表（向后兼容）
      cacheItems.value = displayItems.value
        .filter((item) => item.type === 'video')
        .map((item) => item.data as Types.CacheItem);

      // 加载组状态
      await loadGroupStates();
    } catch (error) {
      lastError.value =
        error instanceof Error ? error.message : '加载显示项列表失败';
      console.error('加载显示项列表失败:', error);
    } finally {
      isLoading.value = false;
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
    try {
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

      // 持久化到后端
      await invoke('set_group_expansion', {
        group_id: groupId,
        is_expanded: newState,
      });
    } catch (error) {
      lastError.value =
        error instanceof Error ? error.message : '更新组状态失败';
      console.error('更新组状态失败:', error);

      // 回滚本地状态
      const originalState = !groupStates.value.get(groupId);
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
   * 加载缓存列表
   */
  async function loadCacheList(): Promise<void> {
    // 如果启用了组功能，使用新的显示项加载方法
    if (groupManagerConfig.value.enableGrouping) {
      await loadDisplayItems();
      return;
    }

    // 否则使用原有的加载方法（向后兼容）
    if (isLoading.value) return;

    try {
      isLoading.value = true;
      lastError.value = null;

      const result = await cacheManagementService.getCacheList(
        currentFilter.value,
        currentSort.value,
        pagination.value,
      );

      cacheItems.value = result.items;
      cacheStatistics.value = result.statistics;

      // 转换为显示项格式
      displayItems.value = result.items.map((item) => ({
        type: 'video' as const,
        data: item,
      }));

      // 更新分页信息
      pagination.value = {
        ...pagination.value,
        totalCount: result.statistics.totalCount,
        totalPages: Math.ceil(
          result.statistics.totalCount / pagination.value.pageSize,
        ),
      };
    } catch (error) {
      lastError.value =
        error instanceof Error ? error.message : '加载缓存列表失败';
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
  async function deleteCacheItem(
    id: string,
    deleteFiles: boolean = false,
  ): Promise<void> {
    try {
      await cacheManagementService.deleteCacheItem(id, deleteFiles);

      // 从本地状态中移除
      const index = cacheItems.value.findIndex((item) => item.id === id);
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
      lastError.value =
        error instanceof Error ? error.message : '删除缓存项失败';
      throw error;
    }
  }

  /**
   * 批量删除缓存项
   */
  async function batchDeleteCacheItems(
    ids: string[],
    deleteFiles: boolean = false,
  ): Promise<Types.BatchOperationResult[]> {
    try {
      const results = await cacheManagementService.batchDeleteCacheItems(
        ids,
        deleteFiles,
      );

      // 移除成功删除的项目
      const successIds = results.filter((r) => r.success).map((r) => r.cacheId);
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
          if (item.data.videos.length < groupManagerConfig.value.minGroupSize) {
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
              ...item.data.videos.map((video) => video.downloadTime.getTime()),
            ),
          );

          return true; // 保留组
        }
      });

      // 清除选中状态
      selectedItems.value = selectedItems.value.filter(
        (id) => !successIds.includes(id),
      );

      // 更新统计信息
      await updateStatistics();

      return results;
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '批量删除失败';
      throw error;
    }
  }

  /**
   * 删除整个组
   */
  async function deleteGroup(
    groupId: string,
    deleteFiles: boolean = false,
  ): Promise<Types.BatchOperationResult[]> {
    const groupItem = displayItems.value.find(
      (item) => item.type === 'group' && item.data.groupId === groupId,
    );

    if (!groupItem || groupItem.type !== 'group') {
      throw new Error('组不存在');
    }

    const videoIds = groupItem.data.videos.map((video) => video.id);
    return await batchDeleteCacheItems(videoIds, deleteFiles);
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
    try {
      isImporting.value = true;
      lastError.value = null;

      const importId = await cacheImportService.startImport(path, options);
      activeImportId.value = importId;

      // 开始监听进度
      const cancelProgress = await cacheImportService.listenImportProgress(
        importId,
        (progress) => {
          importProgress.value = progress;

          // 检查是否完成
          if (
            progress.status === 'Completed' ||
            progress.status === 'Error' ||
            progress.status === 'Cancelled'
          ) {
            isImporting.value = false;
            if (progress.status === 'Completed') {
              // 刷新缓存列表
              refreshCacheList();
            }
          }
        },
      );

      // 保存取消函数以便后续使用
      (
        window as Window & { __cacheImportCancelProgress?: () => void }
      ).__cacheImportCancelProgress = cancelProgress;

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
      downloadTime: new Date((raw.download_time || 0) * 1000),
      importTime: new Date((raw.import_time || 0) * 1000),
      status: (raw.status as Types.CacheStatus) || 'available',
      groupId: raw.group_id || undefined,
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

    return {
      groupId: raw.group_id,
      title: raw.title || '未知标题',
      coverUrl: raw.cover_url || '',
      uname: raw.uname || '未知用户',
      videoCount: raw.video_count || 0,
      totalDuration: raw.total_duration || 0,
      totalFileSize: raw.total_file_size || 0,
      latestDownloadTime: new Date((raw.latest_download_time || 0) * 1000),
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
    currentSort.value = { field: 'completionTime', direction: 'desc' };
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

    // 重置组相关状态
    displayItems.value = [];
    groupStates.value.clear();
    cacheGroups.value = [];
    groupManagerConfig.value = {
      defaultExpanded: false,
      minGroupSize: 2,
      enableGrouping: true,
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
    availableCacheCount,
    unavailableCacheCount,
    incompleteCacheCount,
    totalFileSize,
    averageFileSize,
    totalDuration,
    allUploaders,
    allGroupIds,
    groupCount,
    singleVideoCount,
    averageVideosPerGroup,
    hasSelectedItems,
    selectedItemsCount,
    isAllSelected,
    selectedGroupIds,
    selectedSingleVideos,
    importProgressPercentage,

    // 组状态管理
    loadDisplayItems,
    loadGroupStates,
    toggleGroupExpansion,
    getGroupExpansionState,
    setGroupManagerConfig,

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

    // 导入管理
    startImport,
    cancelImport,
    completeImport,

    // 数据转换
    convertCacheRecordFromRaw,
    convertCacheGroupFromRaw,

    // 工具函数
    updateStatistics,
    clearError,
    resetState,
  };
});
