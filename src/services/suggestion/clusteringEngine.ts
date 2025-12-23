/**
 * 聚类引擎服务
 *
 * 负责对特征向量进行 K-means 聚类，包括：
 * - K-means 聚类算法实现
 * - 自动选择最优 K 值（轮廓系数）
 * - 组标签生成
 *
 * @see .kiro/specs/smart-selection-suggestion/design.md
 */

import type {
  FeatureVector,
  ClusterOptions,
  ClusterResult,
  SuggestionGroup,
  SuggestionItem,
  DominantFeature,
} from '@/types/suggestion';
import { DEFAULT_CLUSTER_OPTIONS } from '@/types/suggestion';

// ============================================================================
// 向量操作工具函数
// ============================================================================

/**
 * 将特征向量转换为数值数组（用于聚类计算）
 */
function featureVectorToArray(vector: FeatureVector): number[] {
  return [
    ...vector.uploaderEncoded,
    ...vector.groupIdEncoded,
    vector.downloadTimeNorm,
    vector.fileSizeNorm,
    vector.durationNorm,
    vector.cacheAgeNorm,
  ];
}

/**
 * 计算两个数值数组之间的欧氏距离
 */
function euclideanDistance(a: number[], b: number[]): number {
  const maxLen = Math.max(a.length, b.length);
  let sum = 0;

  for (let i = 0; i < maxLen; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * 计算数值数组的元素级平均值（质心）
 */
function computeArrayCentroid(arrays: number[][]): number[] {
  if (arrays.length === 0) return [];

  const maxLen = Math.max(...arrays.map((arr) => arr.length));
  const result: number[] = new Array(maxLen).fill(0);

  for (const arr of arrays) {
    for (let i = 0; i < arr.length; i++) {
      result[i] += arr[i];
    }
  }

  for (let i = 0; i < maxLen; i++) {
    result[i] /= arrays.length;
  }

  return result;
}

/**
 * 检查两个质心数组是否收敛（变化小于容差）
 */
function centroidsConverged(
  oldCentroids: number[][],
  newCentroids: number[][],
  tolerance: number,
): boolean {
  if (oldCentroids.length !== newCentroids.length) return false;

  for (let i = 0; i < oldCentroids.length; i++) {
    const dist = euclideanDistance(oldCentroids[i], newCentroids[i]);
    if (dist > tolerance) return false;
  }

  return true;
}

// ============================================================================
// K-means 聚类算法
// ============================================================================

/**
 * K-means 聚类算法
 *
 * @param features 特征向量数组
 * @param k 聚类数量
 * @param options 聚类选项
 * @returns 聚类结果数组
 */
export function kmeans(
  features: FeatureVector[],
  k: number,
  options: Partial<ClusterOptions> = {},
): ClusterResult[] {
  const opts = { ...DEFAULT_CLUSTER_OPTIONS, ...options };
  const n = features.length;

  // 边界情况处理
  if (n === 0) return [];
  if (k <= 0) return [];
  if (k >= n) {
    // 每个点一个聚类
    return features.map((f, i) => ({
      indices: [i],
      centroid: featureVectorToArray(f),
    }));
  }

  // 转换为数值数组
  const dataPoints = features.map(featureVectorToArray);

  // 初始化质心（K-means++ 初始化）
  let centroids = initializeCentroids(dataPoints, k);

  // 迭代优化
  let assignments: number[] = new Array(n).fill(0);

  for (let iter = 0; iter < opts.maxIterations; iter++) {
    // 分配步骤：将每个点分配到最近的质心
    const newAssignments = assignToClusters(dataPoints, centroids);

    // 更新步骤：重新计算质心
    const newCentroids = updateCentroids(dataPoints, newAssignments, k);

    // 检查收敛
    if (centroidsConverged(centroids, newCentroids, opts.tolerance)) {
      assignments = newAssignments;
      centroids = newCentroids;
      break;
    }

    assignments = newAssignments;
    centroids = newCentroids;
  }

  // 构建聚类结果
  const clusters: ClusterResult[] = [];
  for (let i = 0; i < k; i++) {
    const indices = assignments
      .map((cluster, idx) => (cluster === i ? idx : -1))
      .filter((idx) => idx !== -1);

    if (indices.length > 0) {
      clusters.push({
        indices,
        centroid: centroids[i],
      });
    }
  }

  return clusters;
}

/**
 * K-means++ 初始化质心
 */
function initializeCentroids(dataPoints: number[][], k: number): number[][] {
  const n = dataPoints.length;
  const centroids: number[][] = [];

  // 随机选择第一个质心
  const firstIdx = Math.floor(Math.random() * n);
  centroids.push([...dataPoints[firstIdx]]);

  // 选择剩余质心
  for (let i = 1; i < k; i++) {
    // 计算每个点到最近质心的距离
    const distances: number[] = dataPoints.map((point) => {
      let minDist = Infinity;
      for (const centroid of centroids) {
        const dist = euclideanDistance(point, centroid);
        minDist = Math.min(minDist, dist);
      }
      return minDist * minDist; // 距离平方
    });

    // 按距离平方的概率选择下一个质心
    const totalDist = distances.reduce((sum, d) => sum + d, 0);
    if (totalDist === 0) {
      // 所有点距离为0，随机选择
      const idx = Math.floor(Math.random() * n);
      centroids.push([...dataPoints[idx]]);
    } else {
      let random = Math.random() * totalDist;
      let selectedIdx = 0;
      for (let j = 0; j < n; j++) {
        random -= distances[j];
        if (random <= 0) {
          selectedIdx = j;
          break;
        }
      }
      centroids.push([...dataPoints[selectedIdx]]);
    }
  }

  return centroids;
}

/**
 * 将数据点分配到最近的质心
 */
function assignToClusters(
  dataPoints: number[][],
  centroids: number[][],
): number[] {
  return dataPoints.map((point) => {
    let minDist = Infinity;
    let minIdx = 0;

    for (let i = 0; i < centroids.length; i++) {
      const dist = euclideanDistance(point, centroids[i]);
      if (dist < minDist) {
        minDist = dist;
        minIdx = i;
      }
    }

    return minIdx;
  });
}

/**
 * 更新质心位置
 */
function updateCentroids(
  dataPoints: number[][],
  assignments: number[],
  k: number,
): number[][] {
  const centroids: number[][] = [];

  for (let i = 0; i < k; i++) {
    const clusterPoints = dataPoints.filter((_, idx) => assignments[idx] === i);

    if (clusterPoints.length > 0) {
      centroids.push(computeArrayCentroid(clusterPoints));
    } else {
      // 空聚类，随机选择一个点作为新质心
      const randomIdx = Math.floor(Math.random() * dataPoints.length);
      centroids.push([...dataPoints[randomIdx]]);
    }
  }

  return centroids;
}

// ============================================================================
// 轮廓系数计算
// ============================================================================

/**
 * 计算轮廓系数
 * 用于评估聚类质量，值越高表示聚类效果越好
 *
 * @param features 特征向量数组
 * @param k 聚类数量
 * @returns 轮廓系数 [-1, 1]
 */
export function silhouetteScore(features: FeatureVector[], k: number): number {
  const n = features.length;

  // 边界情况
  if (n < 2 || k < 2 || k >= n) return 0;

  // 执行聚类
  const clusters = kmeans(features, k);
  if (clusters.length < 2) return 0;

  const dataPoints = features.map(featureVectorToArray);

  // 构建点到聚类的映射
  const pointToCluster = new Map<number, number>();
  clusters.forEach((cluster, clusterIdx) => {
    cluster.indices.forEach((pointIdx) => {
      pointToCluster.set(pointIdx, clusterIdx);
    });
  });

  // 计算每个点的轮廓系数
  let totalSilhouette = 0;
  let validPoints = 0;

  for (let i = 0; i < n; i++) {
    const clusterIdx = pointToCluster.get(i);
    if (clusterIdx === undefined) continue;

    const cluster = clusters[clusterIdx];
    if (cluster.indices.length <= 1) continue;

    // 计算 a(i)：点 i 到同聚类其他点的平均距离
    let a = 0;
    let aCount = 0;
    for (const j of cluster.indices) {
      if (j !== i) {
        a += euclideanDistance(dataPoints[i], dataPoints[j]);
        aCount++;
      }
    }
    a = aCount > 0 ? a / aCount : 0;

    // 计算 b(i)：点 i 到最近其他聚类的平均距离
    let b = Infinity;
    for (let c = 0; c < clusters.length; c++) {
      if (c === clusterIdx) continue;

      let avgDist = 0;
      for (const j of clusters[c].indices) {
        avgDist += euclideanDistance(dataPoints[i], dataPoints[j]);
      }
      avgDist /= clusters[c].indices.length;

      b = Math.min(b, avgDist);
    }

    // 计算轮廓系数
    const s = b === Infinity ? 0 : (b - a) / Math.max(a, b);
    totalSilhouette += s;
    validPoints++;
  }

  return validPoints > 0 ? totalSilhouette / validPoints : 0;
}

// ============================================================================
// 自动选择最优 K 值
// ============================================================================

/**
 * 自动选择最优 K 值
 * 使用轮廓系数评估不同 K 值的聚类效果
 *
 * @param features 特征向量数组
 * @param minK 最小 K 值（默认 2）
 * @param maxK 最大 K 值（默认 8）
 * @returns 最优 K 值
 */
export function findOptimalK(
  features: FeatureVector[],
  minK: number = DEFAULT_CLUSTER_OPTIONS.minK,
  maxK: number = DEFAULT_CLUSTER_OPTIONS.maxK,
): number {
  const n = features.length;

  // 边界情况
  if (n < 2) return 1;
  if (n <= minK) return Math.max(1, n - 1);

  // 调整 maxK 不超过 n-1
  const effectiveMaxK = Math.min(maxK, n - 1);
  const effectiveMinK = Math.min(minK, effectiveMaxK);

  let bestK = effectiveMinK;
  let bestScore = -1;

  for (let k = effectiveMinK; k <= effectiveMaxK; k++) {
    const score = silhouetteScore(features, k);
    if (score > bestScore) {
      bestScore = score;
      bestK = k;
    }
  }

  return bestK;
}

// ============================================================================
// 组标签生成
// ============================================================================

/**
 * 特征标签 i18n key 映射
 */
const FEATURE_LABEL_KEYS: Record<DominantFeature, string> = {
  uploader: 'suggestion.feature.sameUploader',
  groupId: 'suggestion.feature.sameGroup',
  cacheAge_recent: 'suggestion.feature.recentDownload',
  cacheAge_medium: 'suggestion.feature.mediumDownload',
  cacheAge_old: 'suggestion.feature.oldDownload',
  downloadTime: 'suggestion.feature.sameTime',
  fileSize: 'suggestion.feature.sameSize',
  duration: 'suggestion.feature.sameDuration',
};

/**
 * 识别聚类的主导特征
 * 使用原始标签统计唯一值，而非方差计算
 *
 * @param clusterFeatures 聚类内所有特征向量
 * @param clusterUploaders 聚类内所有 UP 主名称
 * @param clusterGroupIds 聚类内所有组 ID
 * @returns 主导特征列表
 */
export function identifyDominantFeatures(
  clusterFeatures: FeatureVector[],
  clusterUploaders?: string[],
  clusterGroupIds?: (string | undefined)[],
): DominantFeature[] {
  if (clusterFeatures.length === 0) return [];

  const dominantFeatures: DominantFeature[] = [];

  // 检查 UP 主一致性：使用原始标签统计唯一值
  if (clusterUploaders && clusterUploaders.length > 0) {
    const uniqueUploaders = new Set(clusterUploaders);
    if (uniqueUploaders.size === 1) {
      dominantFeatures.push('uploader');
    }
  }

  // 检查组 ID 一致性：使用原始标签统计唯一值
  if (clusterGroupIds && clusterGroupIds.length > 0) {
    const validGroupIds = clusterGroupIds.filter((id): id is string => !!id);
    if (validGroupIds.length > 0) {
      const uniqueGroups = new Set(validGroupIds);
      // 所有项目都有 groupId 且唯一
      if (uniqueGroups.size === 1 && validGroupIds.length === clusterGroupIds.length) {
        dominantFeatures.push('groupId');
      }
    }
  }

  // 检查缓存年龄分桶一致性
  const bucketCounts = new Map<string, number>();
  for (const f of clusterFeatures) {
    bucketCounts.set(f.cacheAgeBucket, (bucketCounts.get(f.cacheAgeBucket) || 0) + 1);
  }
  const maxBucketCount = Math.max(...bucketCounts.values());
  const bucketRatio = maxBucketCount / clusterFeatures.length;

  if (bucketRatio >= 0.7) {
    const dominantBucket = [...bucketCounts.entries()].find(
      ([, count]) => count === maxBucketCount,
    )?.[0];
    if (dominantBucket === 'recent') {
      dominantFeatures.push('cacheAge_recent');
    } else if (dominantBucket === 'medium') {
      dominantFeatures.push('cacheAge_medium');
    } else if (dominantBucket === 'old') {
      dominantFeatures.push('cacheAge_old');
    }
  }

  // 检查下载时间相近性
  const timeVariance = computeNumericVariance(
    clusterFeatures.map((f) => f.downloadTimeNorm),
  );
  if (timeVariance < 0.05) {
    dominantFeatures.push('downloadTime');
  }

  // 检查文件大小相近性
  const sizeVariance = computeNumericVariance(
    clusterFeatures.map((f) => f.fileSizeNorm),
  );
  if (sizeVariance < 0.05) {
    dominantFeatures.push('fileSize');
  }

  // 检查时长相近性
  const durationVariance = computeNumericVariance(
    clusterFeatures.map((f) => f.durationNorm),
  );
  if (durationVariance < 0.05) {
    dominantFeatures.push('duration');
  }

  return dominantFeatures;
}

/**
 * 计算数值数组的方差
 */
function computeNumericVariance(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;

  return variance;
}

/**
 * 生成组标签
 * 返回 i18n key 数组和可选的 UP 主名字，由组件负责渲染
 *
 * @param dominantFeatures 主导特征列表
 * @param uploaderName 当同UP主时显示的具体名字
 * @returns 标签信息对象
 */
export function generateGroupLabel(
  dominantFeatures: DominantFeature[],
  uploaderName?: string,
): { keys: string[]; uploaderName?: string } {
  if (dominantFeatures.length === 0) {
    return { keys: ['suggestion.feature.similar'] };
  }

  // 同合集一般都是同UP主，避免冗余显示，只保留同UP主
  let features = dominantFeatures;
  if (features.includes('groupId') && features.includes('uploader')) {
    features = features.filter((f) => f !== 'groupId');
  }

  const keys = features
    .filter((f) => f !== 'uploader' || !uploaderName) // 有名字时不用 key
    .map((f) => FEATURE_LABEL_KEYS[f])
    .filter(Boolean)
    .slice(0, 2);

  // 如果有 UP 主名字且 uploader 是主导特征，把名字放在最前面
  if (uploaderName && features.includes('uploader')) {
    return { keys, uploaderName };
  }

  return { keys };
}

// ============================================================================
// 聚类到建议分组转换
// ============================================================================

/**
 * 将单个聚类拆分为多个子组（每组最多 maxItems 个）
 */
function splitClusterIntoGroups(
  clusterItems: SuggestionItem[],
  clusterFeatures: FeatureVector[],
  maxItems: number,
  baseIndex: number,
): SuggestionGroup[] {
  const groups: SuggestionGroup[] = [];
  const totalItems = clusterItems.length;
  const numGroups = Math.ceil(totalItems / maxItems);

  // 提取原始标签用于主导特征识别
  const uploaders = clusterItems.map((item) => item.cacheItem.uname);
  const groupIds = clusterItems.map((item) => item.cacheItem.groupId);

  // 识别整个聚类的主导特征
  const dominantFeatures = identifyDominantFeatures(clusterFeatures, uploaders, groupIds);
  
  // 如果是同UP主，获取具体名字
  const uniqueUploaders = new Set(uploaders);
  const uploaderName = uniqueUploaders.size === 1 ? uploaders[0] : undefined;
  const labelInfo = generateGroupLabel(dominantFeatures, uploaderName);

  for (let i = 0; i < numGroups; i++) {
    const start = i * maxItems;
    const end = Math.min(start + maxItems, totalItems);
    const groupItems = clusterItems.slice(start, end);

    const avgSimilarity =
      groupItems.reduce((sum, item) => sum + item.similarity, 0) / groupItems.length;

    // 多个子组时添加分页信息
    const groupLabelInfo = numGroups > 1
      ? { ...labelInfo, page: i + 1, totalPages: numGroups }
      : labelInfo;

    groups.push({
      id: `group-${baseIndex + i}`,
      labelInfo: groupLabelInfo,
      dominantFeatures,
      items: groupItems,
      averageSimilarity: avgSimilarity,
      itemCount: groupItems.length,
      hasMore: false,
    });
  }

  return groups;
}

/**
 * 将聚类结果转换为建议分组
 * 超过 maxItemsPerGroup 的聚类会被拆分成多个子组
 *
 * @param items 建议项目数组
 * @param features 对应的特征向量数组
 * @param options 聚类选项
 * @returns 建议分组数组
 */
export function clusterToSuggestionGroups(
  items: SuggestionItem[],
  features: FeatureVector[],
  options: Partial<ClusterOptions> = {},
): SuggestionGroup[] {
  const opts = { ...DEFAULT_CLUSTER_OPTIONS, ...options };
  const n = items.length;

  // 边界情况
  if (n === 0) return [];
  if (n === 1) {
    return [
      {
        id: 'group-0',
        labelInfo: { keys: ['suggestion.feature.similar'] },
        dominantFeatures: [],
        items: items,
        averageSimilarity: items[0].similarity,
        itemCount: 1,
        hasMore: false,
      },
    ];
  }

  // 自动选择最优 K 值
  const k = findOptimalK(features, opts.minK, opts.maxK);

  // 执行聚类
  const clusters = kmeans(features, k, opts);

  // 转换为建议分组，超过限制的聚类拆分成多个子组
  const groups: SuggestionGroup[] = [];
  let groupIndex = 0;

  for (const cluster of clusters) {
    const clusterItems = cluster.indices.map((i) => items[i]);
    const clusterFeatures = cluster.indices.map((i) => features[i]);

    // 按相似度降序排序
    const sortedIndices = clusterItems
      .map((item, idx) => ({ item, feature: clusterFeatures[idx], similarity: item.similarity }))
      .sort((a, b) => b.similarity - a.similarity);

    const sortedItems = sortedIndices.map((x) => x.item);
    const sortedFeatures = sortedIndices.map((x) => x.feature);

    // 拆分成多个子组
    const subGroups = splitClusterIntoGroups(
      sortedItems,
      sortedFeatures,
      opts.maxItemsPerGroup,
      groupIndex,
    );

    groups.push(...subGroups);
    groupIndex += subGroups.length;
  }

  // 按平均相似度降序排序
  groups.sort((a, b) => b.averageSimilarity - a.averageSimilarity);

  // 重新分配 ID
  groups.forEach((group, index) => {
    group.id = `group-${index}`;
  });

  return groups;
}
