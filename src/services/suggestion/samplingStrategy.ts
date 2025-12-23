/**
 * 大数据集采样策略服务
 *
 * 实现智能采样和渐进式加载：
 * - 超过 1000 项时使用分层采样
 * - 支持渐进式加载更多结果
 * - 保证采样的代表性
 *
 * @see .kiro/specs/smart-selection-suggestion/design.md
 * _Requirements: 8.3, 8.5_
 */

import type { CacheItem } from '@/types/cache';
import { PERFORMANCE_CONSTRAINTS } from '@/types/suggestion';

// ============================================================================
// 采样策略类型
// ============================================================================

/**
 * 采样策略类型
 */
export type SamplingStrategy =
  | 'random' // 随机采样
  | 'stratified' // 分层采样（按UP主分层）
  | 'systematic' // 系统采样（等间隔）
  | 'time_weighted'; // 时间加权采样（优先近期）

/**
 * 采样选项
 */
export interface SamplingOptions {
  /** 采样策略 */
  strategy: SamplingStrategy;
  /** 最大采样数量 */
  maxSamples: number;
  /** 是否保留选中项相关的项目 */
  preserveRelated: boolean;
  /** 相关项目的UP主列表 */
  relatedUploaders?: string[];
  /** 相关项目的组ID列表 */
  relatedGroupIds?: string[];
}

/**
 * 渐进式加载状态
 */
export interface ProgressiveLoadState {
  /** 已加载的项目 */
  loadedItems: CacheItem[];
  /** 剩余未加载的项目 */
  remainingItems: CacheItem[];
  /** 当前批次索引 */
  currentBatch: number;
  /** 总批次数 */
  totalBatches: number;
  /** 是否还有更多 */
  hasMore: boolean;
  /** 加载进度 (0-1) */
  progress: number;
}

/**
 * 默认采样选项
 */
export const DEFAULT_SAMPLING_OPTIONS: SamplingOptions = {
  strategy: 'stratified',
  maxSamples: PERFORMANCE_CONSTRAINTS.SAMPLING_THRESHOLD,
  preserveRelated: true,
};

// ============================================================================
// 采样算法实现
// ============================================================================

/**
 * 随机采样
 * 使用 Fisher-Yates 洗牌算法的变体
 */
export function randomSample(
  items: CacheItem[],
  sampleSize: number,
): CacheItem[] {
  if (items.length <= sampleSize) return [...items];

  const result: CacheItem[] = [];
  const indices = new Set<number>();

  while (indices.size < sampleSize) {
    const randomIndex = Math.floor(Math.random() * items.length);
    if (!indices.has(randomIndex)) {
      indices.add(randomIndex);
      result.push(items[randomIndex]);
    }
  }

  return result;
}

/**
 * 系统采样（等间隔采样）
 * 保证采样的均匀分布
 */
export function systematicSample(
  items: CacheItem[],
  sampleSize: number,
): CacheItem[] {
  if (items.length <= sampleSize) return [...items];

  const step = items.length / sampleSize;
  const result: CacheItem[] = [];
  const startOffset = Math.random() * step;

  for (let i = 0; i < sampleSize; i++) {
    const index = Math.floor(startOffset + i * step);
    if (index < items.length) {
      result.push(items[index]);
    }
  }

  return result;
}

/**
 * 分层采样
 * 按UP主分层，确保每个UP主都有代表
 */
export function stratifiedSample(
  items: CacheItem[],
  sampleSize: number,
  stratifyBy: 'uploader' | 'group' = 'uploader',
): CacheItem[] {
  if (items.length <= sampleSize) return [...items];

  // 按分层键分组
  const strata = new Map<string, CacheItem[]>();
  for (const item of items) {
    const key = stratifyBy === 'uploader' ? item.uname : (item.groupId || 'none');
    if (!strata.has(key)) {
      strata.set(key, []);
    }
    strata.get(key)!.push(item);
  }

  const result: CacheItem[] = [];
  const strataCount = strata.size;

  // 计算每层的采样数量（按比例分配）
  const strataEntries = Array.from(strata.entries());

  // 第一轮：确保每层至少有一个样本
  const minPerStrata = Math.min(1, Math.floor(sampleSize / strataCount));
  let remaining = sampleSize;

  for (const [, strataItems] of strataEntries) {
    const toTake = Math.min(minPerStrata, strataItems.length, remaining);
    const sampled = randomSample(strataItems, toTake);
    result.push(...sampled);
    remaining -= sampled.length;
  }

  // 第二轮：按比例分配剩余配额
  if (remaining > 0) {
    for (const [, strataItems] of strataEntries) {
      const proportion = strataItems.length / items.length;
      const additionalQuota = Math.floor(proportion * remaining);
      const alreadyTaken = result.filter((r) =>
        strataItems.some((s) => s.id === r.id),
      ).length;
      const toTake = Math.min(
        additionalQuota,
        strataItems.length - alreadyTaken,
      );

      if (toTake > 0) {
        const notYetTaken = strataItems.filter(
          (s) => !result.some((r) => r.id === s.id),
        );
        const sampled = randomSample(notYetTaken, toTake);
        result.push(...sampled);
      }
    }
  }

  return result.slice(0, sampleSize);
}

/**
 * 时间加权采样
 * 优先采样近期下载的项目
 */
export function timeWeightedSample(
  items: CacheItem[],
  sampleSize: number,
): CacheItem[] {
  if (items.length <= sampleSize) return [...items];

  const now = Date.now();

  // 计算每个项目的权重（越近期权重越高）
  const weightedItems = items.map((item) => {
    const downloadTime = new Date(item.downloadTime).getTime();
    const ageMs = now - downloadTime;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    // 使用指数衰减：近期项目权重更高
    const weight = Math.exp(-ageDays / 30);
    return { item, weight };
  });

  // 按权重排序
  weightedItems.sort((a, b) => b.weight - a.weight);

  // 取前 70% 按权重，后 30% 随机（保证多样性）
  const weightedCount = Math.floor(sampleSize * 0.7);
  const randomCount = sampleSize - weightedCount;

  const result: CacheItem[] = [];

  // 添加权重最高的项目
  for (let i = 0; i < weightedCount && i < weightedItems.length; i++) {
    result.push(weightedItems[i].item);
  }

  // 从剩余项目中随机采样
  const remainingItems = weightedItems
    .slice(weightedCount)
    .map((w) => w.item);
  const randomSampled = randomSample(remainingItems, randomCount);
  result.push(...randomSampled);

  return result;
}

// ============================================================================
// 智能采样主函数
// ============================================================================

/**
 * 智能采样
 * 根据选项选择合适的采样策略
 */
export function smartSample(
  items: CacheItem[],
  options: Partial<SamplingOptions> = {},
): CacheItem[] {
  const opts = { ...DEFAULT_SAMPLING_OPTIONS, ...options };

  if (items.length <= opts.maxSamples) {
    return [...items];
  }

  // 如果需要保留相关项目，先提取它们
  let relatedItems: CacheItem[] = [];
  let otherItems: CacheItem[] = items;

  if (opts.preserveRelated) {
    const relatedUploaders = new Set(opts.relatedUploaders || []);
    const relatedGroupIds = new Set(opts.relatedGroupIds || []);

    if (relatedUploaders.size > 0 || relatedGroupIds.size > 0) {
      relatedItems = items.filter(
        (item) =>
          relatedUploaders.has(item.uname) ||
          (item.groupId && relatedGroupIds.has(item.groupId)),
      );
      otherItems = items.filter(
        (item) =>
          !relatedUploaders.has(item.uname) &&
          !(item.groupId && relatedGroupIds.has(item.groupId)),
      );
    }
  }

  // 计算需要从其他项目中采样的数量
  const relatedCount = Math.min(
    relatedItems.length,
    Math.floor(opts.maxSamples * 0.3),
  );
  const otherCount = opts.maxSamples - relatedCount;

  // 对相关项目采样
  const sampledRelated =
    relatedItems.length > relatedCount
      ? randomSample(relatedItems, relatedCount)
      : relatedItems;

  // 对其他项目采样
  let sampledOther: CacheItem[];
  switch (opts.strategy) {
    case 'random':
      sampledOther = randomSample(otherItems, otherCount);
      break;
    case 'systematic':
      sampledOther = systematicSample(otherItems, otherCount);
      break;
    case 'time_weighted':
      sampledOther = timeWeightedSample(otherItems, otherCount);
      break;
    case 'stratified':
    default:
      sampledOther = stratifiedSample(otherItems, otherCount);
      break;
  }

  return [...sampledRelated, ...sampledOther];
}

// ============================================================================
// 渐进式加载
// ============================================================================

/**
 * 创建渐进式加载状态
 */
export function createProgressiveLoadState(
  items: CacheItem[],
  batchSize: number = 100,
): ProgressiveLoadState {
  const totalBatches = Math.ceil(items.length / batchSize);

  return {
    loadedItems: [],
    remainingItems: [...items],
    currentBatch: 0,
    totalBatches,
    hasMore: items.length > 0,
    progress: 0,
  };
}

/**
 * 加载下一批项目
 */
export function loadNextBatch(
  state: ProgressiveLoadState,
  batchSize: number = 100,
): ProgressiveLoadState {
  if (!state.hasMore) {
    return state;
  }

  const nextBatch = state.remainingItems.slice(0, batchSize);
  const remaining = state.remainingItems.slice(batchSize);
  const newCurrentBatch = state.currentBatch + 1;

  return {
    loadedItems: [...state.loadedItems, ...nextBatch],
    remainingItems: remaining,
    currentBatch: newCurrentBatch,
    totalBatches: state.totalBatches,
    hasMore: remaining.length > 0,
    progress: newCurrentBatch / state.totalBatches,
  };
}

/**
 * 渐进式加载管理器
 */
export class ProgressiveLoader {
  private state: ProgressiveLoadState;
  private batchSize: number;
  private onBatchLoaded?: (items: CacheItem[], progress: number) => void;

  constructor(
    items: CacheItem[],
    batchSize: number = 100,
    onBatchLoaded?: (items: CacheItem[], progress: number) => void,
  ) {
    this.state = createProgressiveLoadState(items, batchSize);
    this.batchSize = batchSize;
    this.onBatchLoaded = onBatchLoaded;
  }

  /**
   * 加载下一批
   */
  loadNext(): CacheItem[] {
    if (!this.state.hasMore) {
      return [];
    }

    this.state = loadNextBatch(this.state, this.batchSize);

    if (this.onBatchLoaded) {
      this.onBatchLoaded(this.state.loadedItems, this.state.progress);
    }

    return this.state.loadedItems;
  }

  /**
   * 加载所有剩余项目
   */
  loadAll(): CacheItem[] {
    while (this.state.hasMore) {
      this.state = loadNextBatch(this.state, this.batchSize);
    }

    if (this.onBatchLoaded) {
      this.onBatchLoaded(this.state.loadedItems, 1);
    }

    return this.state.loadedItems;
  }

  /**
   * 异步加载下一批（带延迟，避免阻塞UI）
   */
  async loadNextAsync(delayMs: number = 0): Promise<CacheItem[]> {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return this.loadNext();
  }

  /**
   * 获取当前状态
   */
  getState(): ProgressiveLoadState {
    return { ...this.state };
  }

  /**
   * 是否还有更多
   */
  hasMore(): boolean {
    return this.state.hasMore;
  }

  /**
   * 获取进度
   */
  getProgress(): number {
    return this.state.progress;
  }

  /**
   * 获取已加载的项目
   */
  getLoadedItems(): CacheItem[] {
    return this.state.loadedItems;
  }

  /**
   * 重置加载器
   */
  reset(items: CacheItem[]): void {
    this.state = createProgressiveLoadState(items, this.batchSize);
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 判断是否需要采样
 */
export function shouldSample(
  itemCount: number,
  threshold: number = PERFORMANCE_CONSTRAINTS.SAMPLING_THRESHOLD,
): boolean {
  return itemCount > threshold;
}

/**
 * 计算推荐的采样大小
 */
export function getRecommendedSampleSize(
  itemCount: number,
  maxSamples: number = PERFORMANCE_CONSTRAINTS.SAMPLING_THRESHOLD,
): number {
  if (itemCount <= maxSamples) {
    return itemCount;
  }

  // 对于非常大的数据集，使用对数缩放
  if (itemCount > maxSamples * 10) {
    return Math.min(
      maxSamples * 2,
      Math.floor(maxSamples * (1 + Math.log10(itemCount / maxSamples))),
    );
  }

  return maxSamples;
}

