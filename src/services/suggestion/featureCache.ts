/**
 * 特征向量缓存服务
 *
 * 实现增量计算优化：
 * - 缓存已计算的特征向量，避免重复计算
 * - 选择变化时只更新差异部分
 * - 支持缓存失效和清理
 *
 * @see .kiro/specs/smart-selection-suggestion/design.md
 * _Requirements: 8.2_
 */

import type { CacheItem } from '@/types/cache';
import type { FeatureVector, FeatureContext } from '@/types/suggestion';
import { extractFeatures } from './featureExtractor';

// ============================================================================
// 缓存键生成
// ============================================================================

/**
 * 生成缓存项的唯一键
 * 基于项目ID和影响特征计算的关键属性
 */
function generateCacheKey(item: CacheItem): string {
  return `${item.id}_${item.uname}_${item.groupId || 'none'}_${item.downloadTime}_${item.fileSize}_${item.duration}`;
}

/**
 * 生成上下文的哈希键
 * 用于检测上下文是否发生变化
 */
function generateContextHash(context: FeatureContext): string {
  const uploaderLabels = context.uploaderEncoder.labels.join(',');
  const groupLabels = context.groupEncoder.labels.join(',');
  const ranges = [
    context.timeRange.min,
    context.timeRange.max,
    context.sizeRange.min,
    context.sizeRange.max,
    context.durationRange.min,
    context.durationRange.max,
    context.ageRange.min,
    context.ageRange.max,
  ].join(',');
  return `${uploaderLabels}|${groupLabels}|${ranges}`;
}

// ============================================================================
// 特征缓存类
// ============================================================================

/**
 * 特征向量缓存
 * 管理特征向量的缓存和增量更新
 */
export class FeatureCache {
  /** 特征向量缓存 Map<cacheKey, FeatureVector> */
  private cache: Map<string, FeatureVector> = new Map();

  /** 项目ID到缓存键的映射 Map<itemId, cacheKey> */
  private itemKeyMap: Map<string, string> = new Map();

  /** 当前上下文哈希 */
  private contextHash: string = '';

  /** 当前特征上下文 */
  private currentContext: FeatureContext | null = null;

  /** 缓存命中次数 */
  private hitCount: number = 0;

  /** 缓存未命中次数 */
  private missCount: number = 0;

  /**
   * 获取或计算特征向量
   * 如果缓存中存在且上下文未变化，直接返回缓存值
   */
  getOrCompute(item: CacheItem, context: FeatureContext): FeatureVector {
    const contextHash = generateContextHash(context);

    // 上下文变化时清除缓存
    if (contextHash !== this.contextHash) {
      this.invalidateAll();
      this.contextHash = contextHash;
      this.currentContext = context;
    }

    const cacheKey = generateCacheKey(item);
    const existingKey = this.itemKeyMap.get(item.id);

    // 检查缓存是否有效
    if (existingKey === cacheKey && this.cache.has(cacheKey)) {
      this.hitCount++;
      return this.cache.get(cacheKey)!;
    }

    // 计算新的特征向量
    this.missCount++;
    const feature = extractFeatures(item, context);

    // 更新缓存
    if (existingKey && existingKey !== cacheKey) {
      this.cache.delete(existingKey);
    }
    this.cache.set(cacheKey, feature);
    this.itemKeyMap.set(item.id, cacheKey);

    return feature;
  }

  /**
   * 批量获取或计算特征向量
   * 优化批量操作，减少上下文检查开销
   */
  getOrComputeBatch(
    items: CacheItem[],
    context: FeatureContext,
  ): FeatureVector[] {
    const contextHash = generateContextHash(context);

    // 上下文变化时清除缓存
    if (contextHash !== this.contextHash) {
      this.invalidateAll();
      this.contextHash = contextHash;
      this.currentContext = context;
    }

    return items.map((item) => {
      const cacheKey = generateCacheKey(item);
      const existingKey = this.itemKeyMap.get(item.id);

      if (existingKey === cacheKey && this.cache.has(cacheKey)) {
        this.hitCount++;
        return this.cache.get(cacheKey)!;
      }

      this.missCount++;
      const feature = extractFeatures(item, context);

      if (existingKey && existingKey !== cacheKey) {
        this.cache.delete(existingKey);
      }
      this.cache.set(cacheKey, feature);
      this.itemKeyMap.set(item.id, cacheKey);

      return feature;
    });
  }

  /**
   * 增量更新：只计算新增项目的特征
   * 返回所有项目的特征向量（包括缓存的和新计算的）
   */
  incrementalUpdate(
    allItems: CacheItem[],
    context: FeatureContext,
  ): { features: FeatureVector[]; newCount: number; cachedCount: number } {
    const contextHash = generateContextHash(context);
    let newCount = 0;
    let cachedCount = 0;

    // 上下文变化时清除缓存
    if (contextHash !== this.contextHash) {
      this.invalidateAll();
      this.contextHash = contextHash;
      this.currentContext = context;
    }

    const features: FeatureVector[] = [];

    for (const item of allItems) {
      const cacheKey = generateCacheKey(item);
      const existingKey = this.itemKeyMap.get(item.id);

      if (existingKey === cacheKey && this.cache.has(cacheKey)) {
        cachedCount++;
        this.hitCount++;
        features.push(this.cache.get(cacheKey)!);
      } else {
        newCount++;
        this.missCount++;
        const feature = extractFeatures(item, context);

        if (existingKey && existingKey !== cacheKey) {
          this.cache.delete(existingKey);
        }
        this.cache.set(cacheKey, feature);
        this.itemKeyMap.set(item.id, cacheKey);
        features.push(feature);
      }
    }

    return { features, newCount, cachedCount };
  }

  /**
   * 使单个项目的缓存失效
   */
  invalidate(itemId: string): void {
    const cacheKey = this.itemKeyMap.get(itemId);
    if (cacheKey) {
      this.cache.delete(cacheKey);
      this.itemKeyMap.delete(itemId);
    }
  }

  /**
   * 使多个项目的缓存失效
   */
  invalidateMany(itemIds: string[]): void {
    for (const itemId of itemIds) {
      this.invalidate(itemId);
    }
  }

  /**
   * 清除所有缓存
   */
  invalidateAll(): void {
    this.cache.clear();
    this.itemKeyMap.clear();
    this.contextHash = '';
    this.currentContext = null;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    hitCount: number;
    missCount: number;
    hitRate: number;
  } {
    const total = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: total > 0 ? this.hitCount / total : 0,
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * 检查项目是否在缓存中
   */
  has(itemId: string): boolean {
    const cacheKey = this.itemKeyMap.get(itemId);
    return cacheKey !== undefined && this.cache.has(cacheKey);
  }

  /**
   * 获取缓存的特征向量（不触发计算）
   */
  get(itemId: string): FeatureVector | undefined {
    const cacheKey = this.itemKeyMap.get(itemId);
    return cacheKey ? this.cache.get(cacheKey) : undefined;
  }

  /**
   * 预热缓存：预先计算所有项目的特征向量
   */
  warmup(items: CacheItem[], context: FeatureContext): void {
    this.getOrComputeBatch(items, context);
  }

  /**
   * 获取当前上下文
   */
  getContext(): FeatureContext | null {
    return this.currentContext;
  }
}

// ============================================================================
// 全局缓存实例
// ============================================================================

/** 全局特征缓存实例 */
let globalFeatureCache: FeatureCache | null = null;

/**
 * 获取全局特征缓存实例
 */
export function getFeatureCache(): FeatureCache {
  if (!globalFeatureCache) {
    globalFeatureCache = new FeatureCache();
  }
  return globalFeatureCache;
}

/**
 * 重置全局特征缓存
 */
export function resetFeatureCache(): void {
  if (globalFeatureCache) {
    globalFeatureCache.invalidateAll();
    globalFeatureCache.resetStats();
  }
}

/**
 * 清除全局特征缓存实例
 */
export function clearFeatureCache(): void {
  globalFeatureCache = null;
}

// ============================================================================
// 增量计算辅助函数
// ============================================================================

/**
 * 计算选择变化的差异
 * 返回新增和移除的项目ID
 */
export function computeSelectionDiff(
  previousIds: Set<string>,
  currentIds: Set<string>,
): { added: string[]; removed: string[] } {
  const added: string[] = [];
  const removed: string[] = [];

  for (const id of currentIds) {
    if (!previousIds.has(id)) {
      added.push(id);
    }
  }

  for (const id of previousIds) {
    if (!currentIds.has(id)) {
      removed.push(id);
    }
  }

  return { added, removed };
}

/**
 * 判断是否需要完全重新计算
 * 当变化超过阈值时，完全重新计算可能更高效
 */
export function shouldFullRecalculate(
  totalItems: number,
  changedCount: number,
  threshold: number = 0.5,
): boolean {
  if (totalItems === 0) return true;
  return changedCount / totalItems > threshold;
}

