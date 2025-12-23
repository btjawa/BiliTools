/**
 * 相似度计算服务
 *
 * 负责计算特征向量之间的相似度，包括：
 * - 加权相似度计算
 * - 质心向量计算
 * - Jaccard 相似度计算（分类特征）
 *
 * @see .kiro/specs/smart-selection-suggestion/design.md
 */

import type { FeatureVector, FeatureWeights } from '@/types/suggestion';
import { DEFAULT_FEATURE_WEIGHTS } from '@/types/suggestion';

// ============================================================================
// Jaccard 相似度计算
// ============================================================================

/**
 * 计算两个数值数组的 Jaccard 相似度
 * 用于分类特征（编码后的数组）的相似度计算
 *
 * 对于 label encoding 的数组，使用精确匹配：
 * - 如果两个数组相等，返回 1
 * - 否则返回 0
 *
 * @param arr1 第一个数组
 * @param arr2 第二个数组
 * @returns 相似度值 [0, 1]
 */
export function jaccardSimilarity(arr1: number[], arr2: number[]): number {
  // 处理空数组
  if (arr1.length === 0 && arr2.length === 0) {
    return 1;
  }
  if (arr1.length === 0 || arr2.length === 0) {
    return 0;
  }

  // 对于 label encoding，使用精确匹配
  if (arr1.length === 1 && arr2.length === 1) {
    // 使用容差比较浮点数
    const tolerance = 0.0001;
    return Math.abs(arr1[0] - arr2[0]) < tolerance ? 1 : 0;
  }

  // 对于 one-hot encoding，计算 Jaccard 系数
  // Jaccard = |A ∩ B| / |A ∪ B|
  const maxLen = Math.max(arr1.length, arr2.length);
  let intersection = 0;
  let union = 0;

  for (let i = 0; i < maxLen; i++) {
    const v1 = arr1[i] ?? 0;
    const v2 = arr2[i] ?? 0;

    // 对于二值向量
    if (v1 > 0 || v2 > 0) {
      union++;
      if (v1 > 0 && v2 > 0) {
        intersection++;
      }
    }
  }

  return union === 0 ? 1 : intersection / union;
}

// ============================================================================
// 相似度计算
// ============================================================================

/**
 * 计算两个特征向量之间的加权相似度
 *
 * 相似度计算方式：
 * - 分类特征：使用 Jaccard 相似度
 * - 数值特征：使用 1 - |差值| 作为相似度
 * - 最终结果为各特征相似度的加权和
 *
 * @param v1 第一个特征向量
 * @param v2 第二个特征向量
 * @param weights 特征权重配置（可选，默认使用 DEFAULT_FEATURE_WEIGHTS）
 * @returns 相似度值 [0, 1]
 */
export function calculateSimilarity(
  v1: FeatureVector,
  v2: FeatureVector,
  weights: FeatureWeights = DEFAULT_FEATURE_WEIGHTS,
): number {
  // 分类特征相似度（Jaccard 或精确匹配）
  const uploaderSim = jaccardSimilarity(v1.uploaderEncoded, v2.uploaderEncoded);
  const groupSim = jaccardSimilarity(v1.groupIdEncoded, v2.groupIdEncoded);

  // 数值特征相似度（1 - 归一化距离）
  const timeSim = 1 - Math.abs(v1.downloadTimeNorm - v2.downloadTimeNorm);
  const sizeSim = 1 - Math.abs(v1.fileSizeNorm - v2.fileSizeNorm);
  const durationSim = 1 - Math.abs(v1.durationNorm - v2.durationNorm);
  const ageSim = 1 - Math.abs(v1.cacheAgeNorm - v2.cacheAgeNorm);

  // 加权求和
  const similarity =
    weights.uploader * uploaderSim +
    weights.groupId * groupSim +
    weights.cacheAge * ageSim +
    weights.downloadTime * timeSim +
    weights.fileSize * sizeSim +
    weights.duration * durationSim;

  // 确保结果在 [0, 1] 范围内
  return Math.max(0, Math.min(1, similarity));
}

// ============================================================================
// 质心计算
// ============================================================================

/**
 * 计算多个特征向量的质心
 * 质心是所有特征向量的元素级平均值
 *
 * @param vectors 特征向量数组
 * @returns 质心特征向量
 * @throws Error 当输入数组为空时
 */
export function computeCentroid(vectors: FeatureVector[]): FeatureVector {
  if (vectors.length === 0) {
    throw new Error('无法计算空数组的质心');
  }

  if (vectors.length === 1) {
    // 单个向量，直接返回副本
    return { ...vectors[0] };
  }

  const n = vectors.length;

  // 计算分类特征的平均值
  const uploaderEncodedAvg = computeArrayAverage(
    vectors.map((v) => v.uploaderEncoded),
  );
  const groupIdEncodedAvg = computeArrayAverage(
    vectors.map((v) => v.groupIdEncoded),
  );

  // 计算数值特征的平均值
  const downloadTimeNormAvg =
    vectors.reduce((sum, v) => sum + v.downloadTimeNorm, 0) / n;
  const fileSizeNormAvg =
    vectors.reduce((sum, v) => sum + v.fileSizeNorm, 0) / n;
  const durationNormAvg =
    vectors.reduce((sum, v) => sum + v.durationNorm, 0) / n;
  const cacheAgeNormAvg =
    vectors.reduce((sum, v) => sum + v.cacheAgeNorm, 0) / n;

  // 计算最常见的缓存年龄分桶
  const cacheAgeBucketMode = computeBucketMode(
    vectors.map((v) => v.cacheAgeBucket),
  );

  return {
    uploaderEncoded: uploaderEncodedAvg,
    groupIdEncoded: groupIdEncodedAvg,
    downloadTimeNorm: downloadTimeNormAvg,
    fileSizeNorm: fileSizeNormAvg,
    durationNorm: durationNormAvg,
    cacheAgeNorm: cacheAgeNormAvg,
    cacheAgeBucket: cacheAgeBucketMode,
  };
}

/**
 * 计算数值数组的元素级平均值
 *
 * @param arrays 数值数组的数组
 * @returns 平均值数组
 */
function computeArrayAverage(arrays: number[][]): number[] {
  if (arrays.length === 0) {
    return [];
  }

  // 找到最大长度
  const maxLen = Math.max(...arrays.map((arr) => arr.length));
  if (maxLen === 0) {
    return [];
  }

  const result: number[] = new Array(maxLen).fill(0);
  const counts: number[] = new Array(maxLen).fill(0);

  for (const arr of arrays) {
    for (let i = 0; i < arr.length; i++) {
      result[i] += arr[i];
      counts[i]++;
    }
  }

  // 计算平均值
  for (let i = 0; i < maxLen; i++) {
    if (counts[i] > 0) {
      result[i] /= counts[i];
    }
  }

  return result;
}

/**
 * 计算分桶的众数（最常见值）
 *
 * @param buckets 分桶值数组
 * @returns 最常见的分桶值
 */
function computeBucketMode(
  buckets: FeatureVector['cacheAgeBucket'][],
): FeatureVector['cacheAgeBucket'] {
  const counts = new Map<FeatureVector['cacheAgeBucket'], number>();

  for (const bucket of buckets) {
    counts.set(bucket, (counts.get(bucket) || 0) + 1);
  }

  let maxCount = 0;
  let mode: FeatureVector['cacheAgeBucket'] = 'recent';

  for (const [bucket, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      mode = bucket;
    }
  }

  return mode;
}

// ============================================================================
// 批量相似度计算
// ============================================================================

/**
 * 计算一个特征向量与多个特征向量的相似度
 *
 * @param target 目标特征向量
 * @param vectors 待比较的特征向量数组
 * @param weights 特征权重配置
 * @returns 相似度数组，与 vectors 一一对应
 */
export function calculateSimilarities(
  target: FeatureVector,
  vectors: FeatureVector[],
  weights: FeatureWeights = DEFAULT_FEATURE_WEIGHTS,
): number[] {
  return vectors.map((v) => calculateSimilarity(target, v, weights));
}

/**
 * 过滤相似度高于阈值的项目
 *
 * @param target 目标特征向量
 * @param vectors 待比较的特征向量数组
 * @param threshold 相似度阈值
 * @param weights 特征权重配置
 * @returns 过滤后的索引和相似度数组
 */
export function filterBySimilarity(
  target: FeatureVector,
  vectors: FeatureVector[],
  threshold: number,
  weights: FeatureWeights = DEFAULT_FEATURE_WEIGHTS,
): { index: number; similarity: number }[] {
  const results: { index: number; similarity: number }[] = [];

  for (let i = 0; i < vectors.length; i++) {
    const similarity = calculateSimilarity(target, vectors[i], weights);
    if (similarity >= threshold) {
      results.push({ index: i, similarity });
    }
  }

  // 按相似度降序排序
  results.sort((a, b) => b.similarity - a.similarity);

  return results;
}
