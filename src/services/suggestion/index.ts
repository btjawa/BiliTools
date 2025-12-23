/**
 * 智能选择建议服务主入口
 *
 * 整合特征提取、相似度计算、聚类引擎，提供完整的建议生成功能
 * 支持多种过滤器：同UP主、同合集、相近时间
 *
 * @see .kiro/specs/smart-selection-suggestion/design.md
 */

import type { CacheItem } from '@/types/cache';
import type {
  FeatureVector,
  FeatureWeights,
  SuggestionGroup,
  SuggestionItem,
  SuggestionResult,
  SuggestionOptions,
  SuggestionFilterType,
  ClusterOptions,
} from '@/types/suggestion';
import {
  DEFAULT_FEATURE_WEIGHTS,
  DEFAULT_SUGGESTION_OPTIONS,
  DEFAULT_CLUSTER_OPTIONS,
  InsufficientDataError,
  CalculationTimeoutError,
  PERFORMANCE_CONSTRAINTS,
} from '@/types/suggestion';

import {
  extractFeatures,
  buildFeatureContext,
} from './featureExtractor';
import {
  computeCentroid,
  filterBySimilarity,
} from './similarityCalculator';
import { clusterToSuggestionGroups } from './clusteringEngine';
import {
  FeatureCache,
  getFeatureCache,
  resetFeatureCache,
  computeSelectionDiff,
  shouldFullRecalculate,
} from './featureCache';

// 导出子模块
export * from './featureExtractor';
export * from './similarityCalculator';
export * from './clusteringEngine';
export * from './featureCache';
export * from './samplingStrategy';

// 显式导出以避免 lint 警告
export { FeatureCache, resetFeatureCache, computeSelectionDiff, shouldFullRecalculate };
export * from './featureCache';


// ============================================================================
// 过滤器实现
// ============================================================================

/**
 * 同UP主过滤器
 * 只返回与已选项目有相同UP主的项目
 */
export function filterBySameUploader(
  items: CacheItem[],
  selectedItems: CacheItem[],
): CacheItem[] {
  if (selectedItems.length === 0) return [];
  const selectedUploaders = new Set(selectedItems.map((item) => item.uname));
  return items.filter((item) => selectedUploaders.has(item.uname));
}

/**
 * 同合集过滤器
 * 只返回与已选项目有相同组ID的项目
 */
export function filterBySameGroup(
  items: CacheItem[],
  selectedItems: CacheItem[],
): CacheItem[] {
  if (selectedItems.length === 0) return [];
  const selectedGroupIds = new Set(
    selectedItems
      .map((item) => item.groupId)
      .filter((groupId): groupId is string => !!groupId),
  );
  if (selectedGroupIds.size === 0) return [];
  return items.filter(
    (item) => item.groupId && selectedGroupIds.has(item.groupId),
  );
}

/**
 * 相近时间过滤器
 * 只返回下载时间与已选项目相近的项目（默认7天内）
 */
export function filterBySimilarTime(
  items: CacheItem[],
  selectedItems: CacheItem[],
  thresholdDays: number = 7,
): CacheItem[] {
  if (selectedItems.length === 0) return [];
  const selectedTimes = selectedItems.map((item) =>
    new Date(item.downloadTime).getTime(),
  );
  const minTime = Math.min(...selectedTimes);
  const maxTime = Math.max(...selectedTimes);
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
  const rangeStart = minTime - thresholdMs;
  const rangeEnd = maxTime + thresholdMs;
  return items.filter((item) => {
    const itemTime = new Date(item.downloadTime).getTime();
    return itemTime >= rangeStart && itemTime <= rangeEnd;
  });
}

/**
 * 应用过滤器
 */
export function applyFilter(
  items: CacheItem[],
  selectedItems: CacheItem[],
  filterType: SuggestionFilterType,
): CacheItem[] {
  switch (filterType) {
    case 'same_uploader':
      return filterBySameUploader(items, selectedItems);
    case 'same_group':
      return filterBySameGroup(items, selectedItems);
    case 'similar_time':
      return filterBySimilarTime(items, selectedItems);
    case 'all':
    default:
      return items;
  }
}


// ============================================================================
// 采样策略
// ============================================================================

import {
  smartSample,
  shouldSample,
  getRecommendedSampleSize,
  ProgressiveLoader,
  type SamplingOptions,
  type ProgressiveLoadState,
} from './samplingStrategy';

/**
 * 对大数据集进行采样
 * 使用智能采样策略，支持分层采样和相关项目保留
 *
 * @param items 待采样的项目列表
 * @param maxSamples 最大采样数量
 * @param selectedItems 已选择的项目（用于保留相关项目）
 * @returns 采样后的项目列表
 */
export function sampleItems(
  items: CacheItem[],
  maxSamples: number = PERFORMANCE_CONSTRAINTS.SAMPLING_THRESHOLD,
  selectedItems?: CacheItem[],
): CacheItem[] {
  if (items.length <= maxSamples) return items;

  // 构建采样选项
  const options: Partial<SamplingOptions> = {
    strategy: 'stratified',
    maxSamples,
    preserveRelated: !!selectedItems,
  };

  // 如果有已选项目，提取相关的UP主和组ID
  if (selectedItems && selectedItems.length > 0) {
    options.relatedUploaders = [...new Set(selectedItems.map((item) => item.uname))];
    options.relatedGroupIds = [
      ...new Set(
        selectedItems
          .map((item) => item.groupId)
          .filter((id): id is string => !!id),
      ),
    ];
  }

  return smartSample(items, options);
}

/**
 * 创建渐进式加载器
 * 用于大数据集的分批加载
 */
export function createItemLoader(
  items: CacheItem[],
  batchSize: number = 100,
  onBatchLoaded?: (items: CacheItem[], progress: number) => void,
): ProgressiveLoader {
  return new ProgressiveLoader(items, batchSize, onBatchLoaded);
}

// 重新导出采样相关函数
export { shouldSample, getRecommendedSampleSize, ProgressiveLoader };
export type { SamplingOptions, ProgressiveLoadState };

// ============================================================================
// 辅助函数
// ============================================================================

function createEmptyCentroid(): FeatureVector {
  return {
    uploaderEncoded: [],
    groupIdEncoded: [],
    downloadTimeNorm: 0.5,
    fileSizeNorm: 0.5,
    durationNorm: 0.5,
    cacheAgeNorm: 0.5,
    cacheAgeBucket: 'recent',
  };
}

function createEmptyResult(
  selectedItems: CacheItem[],
  startTime: number,
): SuggestionResult {
  const featureContext = buildFeatureContext(selectedItems);
  const selectedFeatures = selectedItems.map((item) =>
    extractFeatures(item, featureContext),
  );
  const centroid =
    selectedFeatures.length > 0
      ? computeCentroid(selectedFeatures)
      : createEmptyCentroid();
  return {
    groups: [],
    totalCount: 0,
    calculationTime: performance.now() - startTime,
    centroid,
  };
}

function createPartialResult(
  similarityResults: { index: number; similarity: number }[],
  unselectedItems: CacheItem[],
  centroid: FeatureVector,
  opts: Required<SuggestionOptions>,
  startTime: number,
): SuggestionResult {
  const limitedResults = similarityResults.slice(0, opts.maxItemsPerGroup * 2);
  const suggestionItems: SuggestionItem[] = limitedResults.map(
    ({ index, similarity }) => ({
      id: unselectedItems[index].id,
      cacheItem: unselectedItems[index],
      similarity,
      matchedFeatures: [],
    }),
  );
  const groups: SuggestionGroup[] = [
    {
      id: 'group-0',
      label: '特征: 相似内容',
      dominantFeatures: [],
      items: suggestionItems.slice(0, opts.maxItemsPerGroup),
      averageSimilarity:
        suggestionItems.reduce((sum, item) => sum + item.similarity, 0) /
        suggestionItems.length,
      itemCount: suggestionItems.length,
      hasMore: suggestionItems.length > opts.maxItemsPerGroup,
    },
  ];
  return {
    groups,
    totalCount: suggestionItems.length,
    calculationTime: performance.now() - startTime,
    centroid,
  };
}

function jaccardSimilaritySimple(arr1: number[], arr2: number[]): number {
  if (arr1.length === 0 && arr2.length === 0) return 1;
  if (arr1.length === 0 || arr2.length === 0) return 0;
  if (arr1.length === 1 && arr2.length === 1) {
    const tolerance = 0.0001;
    return Math.abs(arr1[0] - arr2[0]) < tolerance ? 1 : 0;
  }
  return 0;
}

function generateMatchedFeatures(
  centroid: FeatureVector,
  itemFeature: FeatureVector,
): string[] {
  const features: string[] = [];
  const threshold = 0.8;

  if (
    centroid.uploaderEncoded.length > 0 &&
    itemFeature.uploaderEncoded.length > 0
  ) {
    const uploaderSim = jaccardSimilaritySimple(
      centroid.uploaderEncoded,
      itemFeature.uploaderEncoded,
    );
    if (uploaderSim >= threshold) features.push('同UP主');
  }

  if (
    centroid.groupIdEncoded.length > 0 &&
    itemFeature.groupIdEncoded.length > 0
  ) {
    const groupSim = jaccardSimilaritySimple(
      centroid.groupIdEncoded,
      itemFeature.groupIdEncoded,
    );
    if (groupSim >= threshold) features.push('同合集');
  }

  if (centroid.cacheAgeBucket === itemFeature.cacheAgeBucket) {
    const bucketLabels = {
      recent: '近期下载',
      medium: '中期下载',
      old: '早期下载',
    };
    features.push(bucketLabels[itemFeature.cacheAgeBucket]);
  }

  if (Math.abs(centroid.downloadTimeNorm - itemFeature.downloadTimeNorm) < 0.1) {
    features.push('相近时间');
  }
  if (Math.abs(centroid.fileSizeNorm - itemFeature.fileSizeNorm) < 0.1) {
    features.push('相近大小');
  }
  if (Math.abs(centroid.durationNorm - itemFeature.durationNorm) < 0.1) {
    features.push('相近时长');
  }

  return features;
}


// ============================================================================
// 建议生成主函数
// ============================================================================

/**
 * 生成智能选择建议
 *
 * 主要流程：
 * 1. 验证输入数据
 * 2. 应用过滤器
 * 3. 提取特征向量（使用缓存优化）
 * 4. 计算质心和相似度
 * 5. 过滤低相似度项目
 * 6. 聚类分组
 * 7. 生成建议结果
 *
 * 性能优化：
 * - 使用特征缓存避免重复计算
 * - 大数据集采样策略
 * - 渐进式加载支持
 */
export async function generateSuggestions(
  selectedItems: CacheItem[],
  allItems: CacheItem[],
  options: SuggestionOptions = {},
): Promise<SuggestionResult> {
  const startTime = performance.now();

  // 合并选项
  const opts = {
    ...DEFAULT_SUGGESTION_OPTIONS,
    ...options,
    featureWeights: {
      ...DEFAULT_FEATURE_WEIGHTS,
      ...options.featureWeights,
    },
  };

  // 验证输入
  if (selectedItems.length === 0) {
    throw new InsufficientDataError('请至少选择一个项目');
  }

  // 获取未选择的项目
  const selectedIds = new Set(selectedItems.map((item) => item.id));
  let unselectedItems = allItems.filter((item) => !selectedIds.has(item.id));

  // 应用过滤器
  unselectedItems = applyFilter(unselectedItems, selectedItems, opts.filterType);

  // 如果没有可推荐的项目
  if (unselectedItems.length === 0) {
    return createEmptyResult(selectedItems, startTime);
  }

  // 大数据集采样（使用智能采样策略，保留与已选项目相关的内容）
  if (shouldSample(unselectedItems.length)) {
    const recommendedSize = getRecommendedSampleSize(unselectedItems.length);
    unselectedItems = sampleItems(unselectedItems, recommendedSize, selectedItems);
  }

  // 构建特征上下文
  const allItemsForContext = [...selectedItems, ...unselectedItems];
  const featureContext = buildFeatureContext(allItemsForContext);

  // 使用特征缓存提取特征向量
  const featureCache = getFeatureCache();

  // 提取已选项目的特征向量并计算质心（使用缓存）
  const selectedFeatures = featureCache.getOrComputeBatch(
    selectedItems,
    featureContext,
  );
  const centroid = computeCentroid(selectedFeatures);

  // 提取未选项目的特征向量（使用增量更新）
  const { features: unselectedFeatures } = featureCache.incrementalUpdate(
    unselectedItems,
    featureContext,
  );

  // 计算相似度并过滤
  const similarityResults = filterBySimilarity(
    centroid,
    unselectedFeatures,
    opts.similarityThreshold,
    opts.featureWeights as FeatureWeights,
  );

  // 检查超时
  const elapsedTime = performance.now() - startTime;
  if (elapsedTime > PERFORMANCE_CONSTRAINTS.MAX_CALCULATION_TIME * 2) {
    const partialResult = createPartialResult(
      similarityResults,
      unselectedItems,
      centroid,
      opts,
      startTime,
    );
    throw new CalculationTimeoutError('计算超时，返回部分结果', partialResult);
  }

  // 如果没有满足阈值的项目
  if (similarityResults.length === 0) {
    return createEmptyResult(selectedItems, startTime);
  }

  // 限制推荐数量：只取前 30% 且最多 30 个
  const topPercentCount = Math.ceil(similarityResults.length * 0.3);
  const maxRecommendations = 30;
  const limitedResults = similarityResults.slice(
    0,
    Math.min(topPercentCount, maxRecommendations),
  );

  // 构建建议项目
  const suggestionItems: SuggestionItem[] = limitedResults.map(
    ({ index, similarity }) => ({
      id: unselectedItems[index].id,
      cacheItem: unselectedItems[index],
      similarity,
      matchedFeatures: generateMatchedFeatures(centroid, unselectedFeatures[index]),
    }),
  );

  // 获取对应的特征向量
  const filteredFeatures = limitedResults.map(
    ({ index }) => unselectedFeatures[index],
  );

  // 聚类分组
  const clusterOptions: Partial<ClusterOptions> = {
    minK: DEFAULT_CLUSTER_OPTIONS.minK,
    maxK: Math.min(opts.maxGroups, DEFAULT_CLUSTER_OPTIONS.maxK),
    maxItemsPerGroup: opts.maxItemsPerGroup,
  };

  const groups = clusterToSuggestionGroups(
    suggestionItems,
    filteredFeatures,
    clusterOptions,
  );

  return {
    groups,
    totalCount: suggestionItems.length,
    calculationTime: performance.now() - startTime,
    centroid,
  };
}

// ============================================================================
// 便捷函数
// ============================================================================

/** 快速生成同UP主建议 */
export async function generateSameUploaderSuggestions(
  selectedItems: CacheItem[],
  allItems: CacheItem[],
  options?: Omit<SuggestionOptions, 'filterType'>,
): Promise<SuggestionResult> {
  return generateSuggestions(selectedItems, allItems, {
    ...options,
    filterType: 'same_uploader',
  });
}

/** 快速生成同合集建议 */
export async function generateSameGroupSuggestions(
  selectedItems: CacheItem[],
  allItems: CacheItem[],
  options?: Omit<SuggestionOptions, 'filterType'>,
): Promise<SuggestionResult> {
  return generateSuggestions(selectedItems, allItems, {
    ...options,
    filterType: 'same_group',
  });
}

/** 快速生成相近时间建议 */
export async function generateSimilarTimeSuggestions(
  selectedItems: CacheItem[],
  allItems: CacheItem[],
  options?: Omit<SuggestionOptions, 'filterType'>,
): Promise<SuggestionResult> {
  return generateSuggestions(selectedItems, allItems, {
    ...options,
    filterType: 'similar_time',
  });
}
