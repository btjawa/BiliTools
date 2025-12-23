/**
 * 智能选择建议状态管理 Store
 *
 * 使用 Pinia 管理智能选择建议功能的状态
 * 包括建议分组、审批状态、焦点管理、面板可见性等
 *
 * @see .kiro/specs/smart-selection-suggestion/design.md
 */

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { CacheItem } from '@/types/cache';
import type {
  SuggestionGroup,
  SuggestionResult,
  SuggestionOptions,
  SuggestionFilterType,
  GroupReviewState,
} from '@/types/suggestion';
import {
  DEFAULT_SUGGESTION_OPTIONS,
  InsufficientDataError,
  CalculationTimeoutError,
} from '@/types/suggestion';
import {
  generateSuggestions,
  resetFeatureCache,
  getFeatureCache,
  shouldSample,
} from '@/services/suggestion';

/**
 * 建议 Store
 */
export const useSuggestionStore = defineStore('suggestion', () => {
  // ============================================================================
  // 状态定义
  // ============================================================================

  /** 建议分组列表 */
  const suggestions = ref<SuggestionGroup[]>([]);

  /** 当前聚焦的分组索引 */
  const focusedGroupIndex = ref<number>(0);

  /** 分组审批状态映射 */
  const groupStates = ref<Map<string, GroupReviewState>>(new Map());

  /** 是否正在计算 */
  const isCalculating = ref<boolean>(false);

  /** 面板是否可见 */
  const isPanelVisible = ref<boolean>(false);

  /** 当前过滤器类型 */
  const filterType = ref<SuggestionFilterType>('all');

  /** 计算结果 */
  const result = ref<SuggestionResult | null>(null);

  /** 最后一次错误信息 */
  const lastError = ref<string | null>(null);

  /** 上一次选择的项目ID集合（用于增量计算） */
  const previousSelectedIds = ref<Set<string>>(new Set());

  /** 缓存统计信息 */
  const cacheStats = ref<{
    hitCount: number;
    missCount: number;
    hitRate: number;
    size: number;
  }>({ hitCount: 0, missCount: 0, hitRate: 0, size: 0 });

  /** 渐进式加载状态 */
  const progressiveLoadProgress = ref<number>(0);

  /** 是否正在渐进式加载 */
  const isProgressiveLoading = ref<boolean>(false);

  /** 是否使用了采样 */
  const isSampled = ref<boolean>(false);

  /** 原始数据集大小（采样前） */
  const originalDataSize = ref<number>(0);

  // ============================================================================
  // 计算属性
  // ============================================================================

  /** 总建议数量 */
  const totalSuggestionCount = computed(() => {
    return suggestions.value.reduce((sum, group) => sum + group.itemCount, 0);
  });

  /** 总分组数量 */
  const totalGroupCount = computed(() => suggestions.value.length);

  /** 已审批的分组数量 */
  const reviewedGroupCount = computed(() => {
    let count = 0;
    groupStates.value.forEach((state) => {
      if (state === 'approved' || state === 'rejected') {
        count++;
      }
    });
    return count;
  });

  /** 已批准的分组数量 */
  const approvedGroupCount = computed(() => {
    let count = 0;
    groupStates.value.forEach((state) => {
      if (state === 'approved') {
        count++;
      }
    });
    return count;
  });

  /** 已拒绝的分组数量 */
  const rejectedGroupCount = computed(() => {
    let count = 0;
    groupStates.value.forEach((state) => {
      if (state === 'rejected') {
        count++;
      }
    });
    return count;
  });

  /** 待审批的分组数量 */
  const pendingGroupCount = computed(() => {
    return totalGroupCount.value - reviewedGroupCount.value;
  });

  /** 是否所有分组都已审批 */
  const isAllReviewed = computed(() => {
    return (
      totalGroupCount.value > 0 &&
      reviewedGroupCount.value === totalGroupCount.value
    );
  });

  /** 当前聚焦的分组 */
  const focusedGroup = computed(() => {
    if (
      focusedGroupIndex.value >= 0 &&
      focusedGroupIndex.value < suggestions.value.length
    ) {
      return suggestions.value[focusedGroupIndex.value];
    }
    return null;
  });

  /** 当前聚焦分组的审批状态 */
  const focusedGroupState = computed((): GroupReviewState => {
    if (!focusedGroup.value) return 'pending';
    return groupStates.value.get(focusedGroup.value.id) ?? 'pending';
  });

  /** 已批准的项目ID列表 */
  const approvedItemIds = computed(() => {
    const ids: string[] = [];
    suggestions.value.forEach((group) => {
      const state = groupStates.value.get(group.id);
      if (state === 'approved') {
        group.items.forEach((item) => {
          ids.push(item.id);
        });
      }
    });
    return ids;
  });

  /** 已批准的项目数量 */
  const approvedItemCount = computed(() => approvedItemIds.value.length);

  /** 是否有建议可用 */
  const hasSuggestions = computed(() => suggestions.value.length > 0);

  /** 计算耗时（毫秒） */
  const calculationTime = computed(() => result.value?.calculationTime ?? 0);

  // ============================================================================
  // Actions - 建议生成
  // ============================================================================

  /**
   * 生成建议
   */
  async function generate(
    selectedItems: CacheItem[],
    allItems: CacheItem[],
    options?: SuggestionOptions,
  ): Promise<void> {
    if (isCalculating.value) return;

    isCalculating.value = true;
    lastError.value = null;

    // 记录原始数据集大小和采样状态
    const selectedIds = new Set(selectedItems.map((item) => item.id));
    const unselectedCount = allItems.filter((item) => !selectedIds.has(item.id)).length;
    originalDataSize.value = unselectedCount;
    isSampled.value = shouldSample(unselectedCount);

    try {
      const mergedOptions: SuggestionOptions = {
        ...DEFAULT_SUGGESTION_OPTIONS,
        ...options,
        filterType: filterType.value,
      };

      const suggestionResult = await generateSuggestions(
        selectedItems,
        allItems,
        mergedOptions,
      );

      result.value = suggestionResult;
      suggestions.value = suggestionResult.groups;

      // 初始化分组状态
      groupStates.value.clear();
      suggestionResult.groups.forEach((group) => {
        groupStates.value.set(group.id, 'pending');
      });

      // 重置焦点到第一个分组
      focusedGroupIndex.value = 0;

      // 更新选择ID集合（用于增量计算）
      previousSelectedIds.value = new Set(selectedItems.map((item) => item.id));

      // 更新缓存统计
      updateCacheStats();
    } catch (error) {
      if (error instanceof InsufficientDataError) {
        lastError.value = error.message;
        suggestions.value = [];
        result.value = null;
      } else if (error instanceof CalculationTimeoutError) {
        lastError.value = '计算超时，显示部分结果';
        if (error.partialResult) {
          result.value = error.partialResult;
          suggestions.value = error.partialResult.groups;
          groupStates.value.clear();
          error.partialResult.groups.forEach((group) => {
            groupStates.value.set(group.id, 'pending');
          });
          focusedGroupIndex.value = 0;
        }
      } else {
        lastError.value =
          error instanceof Error ? error.message : '生成建议时出错';
        suggestions.value = [];
        result.value = null;
      }
    } finally {
      isCalculating.value = false;
    }
  }

  // ============================================================================
  // Actions - 分组审批
  // ============================================================================

  /**
   * 批准分组
   */
  function approveGroup(groupId: string): void {
    groupStates.value.set(groupId, 'approved');
  }

  /**
   * 拒绝分组
   */
  function rejectGroup(groupId: string): void {
    groupStates.value.set(groupId, 'rejected');
  }

  /**
   * 重置分组状态为待审批
   */
  function resetGroupState(groupId: string): void {
    groupStates.value.set(groupId, 'pending');
  }

  /**
   * 切换分组审批状态
   */
  function toggleGroupState(groupId: string): void {
    const currentState = groupStates.value.get(groupId) ?? 'pending';
    if (currentState === 'approved') {
      groupStates.value.set(groupId, 'pending');
    } else {
      groupStates.value.set(groupId, 'approved');
    }
  }

  /**
   * 批准当前聚焦的分组并移动到下一个
   */
  function approveCurrentAndNext(): void {
    if (focusedGroup.value) {
      approveGroup(focusedGroup.value.id);
      moveToNextGroup();
    }
  }

  /**
   * 拒绝当前聚焦的分组并移动到下一个
   */
  function rejectCurrentAndNext(): void {
    if (focusedGroup.value) {
      rejectGroup(focusedGroup.value.id);
      moveToNextGroup();
    }
  }

  /**
   * 批准所有待审批的分组
   */
  function approveAllPending(): void {
    suggestions.value.forEach((group) => {
      const state = groupStates.value.get(group.id);
      if (state === 'pending') {
        groupStates.value.set(group.id, 'approved');
      }
    });
  }

  /**
   * 重置所有分组状态
   */
  function resetAllGroupStates(): void {
    suggestions.value.forEach((group) => {
      groupStates.value.set(group.id, 'pending');
    });
    focusedGroupIndex.value = 0;
  }

  // ============================================================================
  // Actions - 焦点导航
  // ============================================================================

  /**
   * 移动到下一个分组
   */
  function moveToNextGroup(): void {
    if (focusedGroupIndex.value < suggestions.value.length - 1) {
      focusedGroupIndex.value++;
    }
  }

  /**
   * 移动到上一个分组
   */
  function moveToPreviousGroup(): void {
    if (focusedGroupIndex.value > 0) {
      focusedGroupIndex.value--;
    }
  }

  /**
   * 设置聚焦的分组索引
   */
  function setFocusedGroupIndex(index: number): void {
    if (index >= 0 && index < suggestions.value.length) {
      focusedGroupIndex.value = index;
    }
  }

  /**
   * 通过分组ID设置焦点
   */
  function focusGroupById(groupId: string): void {
    const index = suggestions.value.findIndex((group) => group.id === groupId);
    if (index !== -1) {
      focusedGroupIndex.value = index;
    }
  }

  // ============================================================================
  // Actions - 面板控制
  // ============================================================================

  /**
   * 打开建议面板
   */
  function openPanel(): void {
    isPanelVisible.value = true;
    // 重置焦点到第一个分组
    focusedGroupIndex.value = 0;
  }

  /**
   * 关闭建议面板
   */
  function closePanel(): void {
    isPanelVisible.value = false;
  }

  /**
   * 切换面板可见性
   */
  function togglePanel(): void {
    if (isPanelVisible.value) {
      closePanel();
    } else {
      openPanel();
    }
  }

  // ============================================================================
  // Actions - 过滤器
  // ============================================================================

  /**
   * 设置过滤器类型
   */
  function setFilterType(type: SuggestionFilterType): void {
    filterType.value = type;
  }

  // ============================================================================
  // Actions - 应用选择
  // ============================================================================

  /**
   * 获取已批准的项目ID列表（用于应用选择）
   */
  function getApprovedItemIds(): string[] {
    return approvedItemIds.value;
  }

  /**
   * 清除所有状态
   */
  function clearAll(): void {
    suggestions.value = [];
    focusedGroupIndex.value = 0;
    groupStates.value.clear();
    isCalculating.value = false;
    isPanelVisible.value = false;
    filterType.value = 'all';
    result.value = null;
    lastError.value = null;
    previousSelectedIds.value.clear();
    cacheStats.value = { hitCount: 0, missCount: 0, hitRate: 0, size: 0 };
    progressiveLoadProgress.value = 0;
    isProgressiveLoading.value = false;
    isSampled.value = false;
    originalDataSize.value = 0;
    resetFeatureCache();
  }

  /**
   * 清除特征缓存
   */
  function clearFeatureCacheData(): void {
    resetFeatureCache();
    cacheStats.value = { hitCount: 0, missCount: 0, hitRate: 0, size: 0 };
  }

  /**
   * 更新缓存统计信息
   */
  function updateCacheStats(): void {
    const cache = getFeatureCache();
    cacheStats.value = cache.getStats();
  }

  /**
   * 获取分组的审批状态
   */
  function getGroupState(groupId: string): GroupReviewState {
    return groupStates.value.get(groupId) ?? 'pending';
  }

  // ============================================================================
  // 返回 Store
  // ============================================================================

  return {
    // 状态
    suggestions,
    focusedGroupIndex,
    groupStates,
    isCalculating,
    isPanelVisible,
    filterType,
    result,
    lastError,

    // 计算属性
    totalSuggestionCount,
    totalGroupCount,
    reviewedGroupCount,
    approvedGroupCount,
    rejectedGroupCount,
    pendingGroupCount,
    isAllReviewed,
    focusedGroup,
    focusedGroupState,
    approvedItemIds,
    approvedItemCount,
    hasSuggestions,
    calculationTime,

    // Actions - 建议生成
    generate,

    // Actions - 分组审批
    approveGroup,
    rejectGroup,
    resetGroupState,
    toggleGroupState,
    approveCurrentAndNext,
    rejectCurrentAndNext,
    approveAllPending,
    resetAllGroupStates,

    // Actions - 焦点导航
    moveToNextGroup,
    moveToPreviousGroup,
    setFocusedGroupIndex,
    focusGroupById,

    // Actions - 面板控制
    openPanel,
    closePanel,
    togglePanel,

    // Actions - 过滤器
    setFilterType,

    // Actions - 应用选择
    getApprovedItemIds,
    clearAll,
    getGroupState,

    // Actions - 缓存管理
    clearFeatureCacheData,
    updateCacheStats,

    // 缓存相关状态
    cacheStats,
    previousSelectedIds,

    // 渐进式加载相关状态
    progressiveLoadProgress,
    isProgressiveLoading,
    isSampled,
    originalDataSize,
  };
});
