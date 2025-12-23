/**
 * 特征提取服务
 *
 * 负责从缓存项中提取特征向量，用于相似度计算和聚类分析
 * 实现 min-max 归一化和缓存年龄分桶功能
 *
 * @see .kiro/specs/smart-selection-suggestion/design.md
 */

import type { CacheItem } from '@/types/cache';
import type {
  FeatureVector,
  FeatureContext,
  NumberRange,
  LabelEncoder,
  CacheAgeBucket,
} from '@/types/suggestion';
import { CACHE_AGE_THRESHOLDS } from '@/types/suggestion';

// ============================================================================
// 标签编码器实现
// ============================================================================

/**
 * 创建标签编码器
 * 使用 label encoding 将分类特征编码为数值
 */
export function createLabelEncoder(values: string[]): LabelEncoder {
  const uniqueLabels = [...new Set(values)];
  const labelMap = new Map(uniqueLabels.map((label, index) => [label, index]));

  return {
    labels: uniqueLabels,
    encode(label: string): number[] {
      const index = labelMap.get(label);
      if (index === undefined) {
        // 未知标签返回全零向量
        return uniqueLabels.length > 0 ? [0] : [];
      }
      // 使用归一化的 label encoding
      const normalized =
        uniqueLabels.length > 1 ? index / (uniqueLabels.length - 1) : 0;
      return [normalized];
    },
  };
}

// ============================================================================
// 归一化函数
// ============================================================================

/**
 * Min-max 归一化
 * 将数值映射到 [0, 1] 范围
 *
 * @param value 原始数值
 * @param range 数值范围 { min, max }
 * @returns 归一化后的值，范围 [0, 1]
 */
export function normalize(value: number, range: NumberRange): number {
  // 处理无效输入
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  // 处理范围相等的情况
  if (range.max === range.min) {
    return 0.5;
  }

  // 确保 min <= max
  const min = Math.min(range.min, range.max);
  const max = Math.max(range.min, range.max);

  // 计算归一化值
  const normalized = (value - min) / (max - min);

  // 限制在 [0, 1] 范围内
  return Math.max(0, Math.min(1, normalized));
}

// ============================================================================
// 缓存年龄分桶
// ============================================================================

/**
 * 获取缓存年龄分桶
 *
 * @param ageDays 缓存年龄（天数）
 * @returns 分桶类型：recent(<7d), medium(7-30d), old(>=30d)
 */
export function getCacheAgeBucket(ageDays: number): CacheAgeBucket {
  // 处理无效输入
  if (!Number.isFinite(ageDays) || ageDays < 0) {
    return 'recent';
  }

  if (ageDays < CACHE_AGE_THRESHOLDS.RECENT) {
    return 'recent';
  }

  if (ageDays < CACHE_AGE_THRESHOLDS.MEDIUM) {
    return 'medium';
  }

  return 'old';
}

// ============================================================================
// 特征上下文构建
// ============================================================================

/**
 * 从缓存项列表构建特征上下文
 * 包含编码器和数值范围信息
 *
 * @param items 缓存项列表
 * @returns 特征上下文
 */
export function buildFeatureContext(items: CacheItem[]): FeatureContext {
  if (items.length === 0) {
    return {
      uploaderEncoder: createLabelEncoder([]),
      groupEncoder: createLabelEncoder([]),
      timeRange: { min: 0, max: 0 },
      sizeRange: { min: 0, max: 0 },
      durationRange: { min: 0, max: 0 },
      ageRange: { min: 0, max: 0 },
    };
  }

  const now = Date.now();

  // 提取所有 UP 主和组 ID
  const uploaders = items.map((item) => item.uname);
  const groupIds = items.map((item) => item.groupId || 'none');

  // 计算数值范围
  const times = items.map((item) => new Date(item.downloadTime).getTime());
  const sizes = items.map((item) => item.fileSize);
  const durations = items.map((item) => item.duration);
  const ages = items.map((item) => {
    const downloadTime = new Date(item.downloadTime).getTime();
    return (now - downloadTime) / (1000 * 60 * 60 * 24); // 转换为天数
  });

  return {
    uploaderEncoder: createLabelEncoder(uploaders),
    groupEncoder: createLabelEncoder(groupIds),
    timeRange: { min: Math.min(...times), max: Math.max(...times) },
    sizeRange: { min: Math.min(...sizes), max: Math.max(...sizes) },
    durationRange: { min: Math.min(...durations), max: Math.max(...durations) },
    ageRange: { min: Math.min(...ages), max: Math.max(...ages) },
  };
}

// ============================================================================
// 特征提取
// ============================================================================

/**
 * 从单个缓存项提取特征向量
 *
 * @param item 缓存项
 * @param context 特征上下文
 * @returns 特征向量
 */
export function extractFeatures(
  item: CacheItem,
  context: FeatureContext,
): FeatureVector {
  const now = Date.now();
  const downloadTime = new Date(item.downloadTime).getTime();
  const cacheAgeDays = (now - downloadTime) / (1000 * 60 * 60 * 24);

  return {
    // 分类特征编码
    uploaderEncoded: context.uploaderEncoder.encode(item.uname),
    groupIdEncoded: context.groupEncoder.encode(item.groupId || 'none'),

    // 数值特征归一化
    downloadTimeNorm: normalize(downloadTime, context.timeRange),
    fileSizeNorm: normalize(item.fileSize, context.sizeRange),
    durationNorm: normalize(item.duration, context.durationRange),
    cacheAgeNorm: normalize(cacheAgeDays, context.ageRange),

    // 缓存年龄分桶
    cacheAgeBucket: getCacheAgeBucket(cacheAgeDays),
  };
}

/**
 * 批量提取特征向量
 *
 * @param items 缓存项列表
 * @param context 特征上下文（可选，不提供则自动构建）
 * @returns 特征向量数组
 */
export function extractFeaturesFromItems(
  items: CacheItem[],
  context?: FeatureContext,
): FeatureVector[] {
  const ctx = context || buildFeatureContext(items);
  return items.map((item) => extractFeatures(item, ctx));
}

/**
 * 验证特征向量完整性
 *
 * @param vector 特征向量
 * @returns 是否完整有效
 */
export function isValidFeatureVector(vector: FeatureVector): boolean {
  // 检查分类特征
  if (!Array.isArray(vector.uploaderEncoded)) return false;
  if (!Array.isArray(vector.groupIdEncoded)) return false;

  // 检查数值特征范围
  const numericFields = [
    vector.downloadTimeNorm,
    vector.fileSizeNorm,
    vector.durationNorm,
    vector.cacheAgeNorm,
  ];

  for (const value of numericFields) {
    if (!Number.isFinite(value)) return false;
    if (value < 0 || value > 1) return false;
  }

  // 检查分桶值
  const validBuckets: CacheAgeBucket[] = ['recent', 'medium', 'old'];
  if (!validBuckets.includes(vector.cacheAgeBucket)) return false;

  return true;
}
