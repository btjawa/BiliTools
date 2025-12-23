/**
 * 智能选择建议功能类型定义
 *
 * 该文件定义了智能选择建议功能相关的所有 TypeScript 接口
 * 包括特征向量、相似度计算、聚类分组、建议结果等核心数据结构
 *
 * @see .kiro/specs/smart-selection-suggestion/design.md
 */

import type { CacheItem } from './cache';

// ============================================================================
// 特征提取相关类型
// ============================================================================

/**
 * 特征向量
 * 表示单个缓存项的特征表示，用于相似度计算和聚类
 */
export interface FeatureVector {
  /** 分类特征：UP主编码（one-hot 或 label encoding） */
  uploaderEncoded: number[];
  /** 分类特征：组ID编码（one-hot 或 label encoding） */
  groupIdEncoded: number[];

  /** 数值特征：下载时间（归一化后 [0, 1]） */
  downloadTimeNorm: number;
  /** 数值特征：文件大小（归一化后 [0, 1]） */
  fileSizeNorm: number;
  /** 数值特征：视频时长（归一化后 [0, 1]） */
  durationNorm: number;
  /** 数值特征：缓存年龄（归一化后 [0, 1]） */
  cacheAgeNorm: number;

  /** 缓存年龄分桶：recent(<7d), medium(7-30d), old(>30d) */
  cacheAgeBucket: CacheAgeBucket;
}

/**
 * 缓存年龄分桶类型
 */
export type CacheAgeBucket = 'recent' | 'medium' | 'old';

/**
 * 特征权重配置
 * 定义各特征在相似度计算中的权重
 */
export interface FeatureWeights {
  /** UP主权重（默认 0.30） */
  uploader: number;
  /** 组ID权重（默认 0.25） */
  groupId: number;
  /** 缓存年龄权重（默认 0.20） */
  cacheAge: number;
  /** 下载时间权重（默认 0.10） */
  downloadTime: number;
  /** 文件大小权重（默认 0.08） */
  fileSize: number;
  /** 视频时长权重（默认 0.07） */
  duration: number;
}

/**
 * 特征上下文
 * 用于特征提取时的编码器和范围信息
 */
export interface FeatureContext {
  /** UP主编码器 */
  uploaderEncoder: LabelEncoder;
  /** 组ID编码器 */
  groupEncoder: LabelEncoder;
  /** 时间范围 */
  timeRange: NumberRange;
  /** 文件大小范围 */
  sizeRange: NumberRange;
  /** 时长范围 */
  durationRange: NumberRange;
  /** 缓存年龄范围 */
  ageRange: NumberRange;
}

/**
 * 标签编码器接口
 */
export interface LabelEncoder {
  /** 编码标签为数值数组 */
  encode(label: string): number[];
  /** 获取所有已知标签 */
  labels: string[];
}

/**
 * 数值范围
 */
export interface NumberRange {
  min: number;
  max: number;
}

// ============================================================================
// 相似度计算相关类型
// ============================================================================

/**
 * 相似度计算选项
 */
export interface SimilarityOptions {
  /** 特征权重配置 */
  weights: FeatureWeights;
  /** 相似度阈值（默认 0.3） */
  threshold: number;
}

// ============================================================================
// 聚类相关类型
// ============================================================================

/**
 * 聚类选项
 */
export interface ClusterOptions {
  /** 最小聚类数（默认 2） */
  minK: number;
  /** 最大聚类数（默认 8） */
  maxK: number;
  /** 每组最大项目数（默认 10） */
  maxItemsPerGroup: number;
  /** 最大迭代次数（默认 100） */
  maxIterations: number;
  /** 收敛容差（默认 0.001） */
  tolerance: number;
}

/**
 * 聚类结果
 */
export interface ClusterResult {
  /** 聚类索引列表 */
  indices: number[];
  /** 聚类质心 */
  centroid: number[];
}

// ============================================================================
// 建议分组相关类型
// ============================================================================

/**
 * 建议分组
 * 表示一组相似的建议项目
 */
export interface SuggestionGroup {
  /** 组唯一标识 */
  id: string;
  /** 标签信息，包含 i18n keys、可选的 UP 主名字和分页信息 */
  labelInfo: { keys: string[]; uploaderName?: string; page?: number; totalPages?: number };
  /** 主导特征列表 */
  dominantFeatures: DominantFeature[];
  /** 组内项目 */
  items: SuggestionItem[];
  /** 组内平均相似度 */
  averageSimilarity: number;
  /** 项目总数 */
  itemCount: number;
  /** 是否有更多（超过 maxItemsPerGroup） */
  hasMore: boolean;
}

/**
 * 主导特征类型
 */
export type DominantFeature =
  | 'uploader'
  | 'groupId'
  | 'cacheAge_recent'
  | 'cacheAge_medium'
  | 'cacheAge_old'
  | 'downloadTime'
  | 'fileSize'
  | 'duration';

/**
 * 建议项目
 * 表示单个建议的缓存项
 */
export interface SuggestionItem {
  /** 项目唯一标识 */
  id: string;
  /** 关联的缓存项 */
  cacheItem: CacheItem;
  /** 与选择质心的相似度 */
  similarity: number;
  /** 匹配的特征描述 */
  matchedFeatures: string[];
}

// ============================================================================
// 建议结果相关类型
// ============================================================================

/**
 * 建议结果
 * 表示完整的建议生成结果
 */
export interface SuggestionResult {
  /** 建议分组列表 */
  groups: SuggestionGroup[];
  /** 总建议数 */
  totalCount: number;
  /** 计算耗时（毫秒） */
  calculationTime: number;
  /** 选择项质心 */
  centroid: FeatureVector;
}

/**
 * 建议选项
 * 生成建议时的配置选项
 */
export interface SuggestionOptions {
  /** 相似度阈值（默认 0.3） */
  similarityThreshold?: number;
  /** 最大分组数（默认 8） */
  maxGroups?: number;
  /** 每组最大项目数（默认 10） */
  maxItemsPerGroup?: number;
  /** 特征权重配置 */
  featureWeights?: Partial<FeatureWeights>;
  /** 过滤器类型 */
  filterType?: SuggestionFilterType;
}

/**
 * 建议过滤器类型
 */
export type SuggestionFilterType =
  | 'all' // 全部
  | 'same_uploader' // 同UP主
  | 'same_group' // 同合集
  | 'similar_time'; // 相近时间

// ============================================================================
// 审批流程相关类型
// ============================================================================

/**
 * 组审批状态
 */
export type GroupReviewState = 'pending' | 'approved' | 'rejected';

/**
 * 组审批信息
 */
export interface GroupReviewInfo {
  /** 组标识符 */
  groupId: string;
  /** 审批状态 */
  state: GroupReviewState;
  /** 审批时间 */
  reviewedAt?: Date;
}

// ============================================================================
// UI 组件相关类型
// ============================================================================

/**
 * 建议按钮组件属性
 */
export interface SuggestionButtonProps {
  /** 是否禁用（无选中项时） */
  disabled: boolean;
  /** 可用建议数量（用于徽章显示） */
  suggestionCount: number;
}

/**
 * 建议按钮组件事件
 */
export interface SuggestionButtonEmits {
  /** 点击事件 */
  click: [];
}

/**
 * 建议面板组件属性
 */
export interface SuggestionPanelProps {
  /** 是否可见 */
  visible: boolean;
  /** 建议分组列表 */
  groups: SuggestionGroup[];
  /** 是否正在计算 */
  isCalculating: boolean;
}

/**
 * 建议面板组件事件
 */
export interface SuggestionPanelEmits {
  /** 关闭面板 */
  close: [];
  /** 应用选择 */
  apply: [approvedItemIds: string[]];
}

/**
 * 建议分组组件属性
 */
export interface SuggestionGroupProps {
  /** 分组数据 */
  group: SuggestionGroup;
  /** 审批状态 */
  state: GroupReviewState;
  /** 是否聚焦 */
  focused: boolean;
  /** 是否展开 */
  expanded: boolean;
}

/**
 * 建议分组组件事件
 */
export interface SuggestionGroupEmits {
  /** 批准分组 */
  approve: [];
  /** 拒绝分组 */
  reject: [];
  /** 切换展开状态 */
  toggle: [];
  /** 点击单个项目 */
  itemClick: [itemId: string];
}

/**
 * 建议项目组件属性
 */
export interface SuggestionItemProps {
  /** 建议项目数据 */
  item: SuggestionItem;
  /** 是否选中 */
  selected: boolean;
}

/**
 * 建议项目组件事件
 */
export interface SuggestionItemEmits {
  /** 点击事件 */
  click: [];
}

// ============================================================================
// Store 相关类型
// ============================================================================

/**
 * 建议 Store 状态
 */
export interface SuggestionStoreState {
  /** 建议分组列表 */
  suggestions: SuggestionGroup[];
  /** 当前聚焦的分组索引 */
  focusedGroupIndex: number;
  /** 分组审批状态映射 */
  groupStates: Map<string, GroupReviewState>;
  /** 是否正在计算 */
  isCalculating: boolean;
  /** 面板是否可见 */
  isPanelVisible: boolean;
  /** 当前过滤器类型 */
  filterType: SuggestionFilterType;
  /** 计算结果 */
  result: SuggestionResult | null;
}

// ============================================================================
// 错误类型
// ============================================================================

/**
 * 数据不足错误
 * 当选择项太少无法生成有意义的建议时抛出
 */
export class InsufficientDataError extends Error {
  constructor(message: string = '选择项太少，无法生成有意义的建议') {
    super(message);
    this.name = 'InsufficientDataError';
  }
}

/**
 * 计算超时错误
 * 当计算时间超过限制时抛出
 */
export class CalculationTimeoutError extends Error {
  /** 部分计算结果 */
  partialResult?: SuggestionResult;

  constructor(
    message: string = '计算超时',
    partialResult?: SuggestionResult,
  ) {
    super(message);
    this.name = 'CalculationTimeoutError';
    this.partialResult = partialResult;
  }
}

// ============================================================================
// 默认配置常量
// ============================================================================

/**
 * 默认特征权重
 */
export const DEFAULT_FEATURE_WEIGHTS: FeatureWeights = {
  uploader: 0.30,
  groupId: 0.25,
  cacheAge: 0.20,
  downloadTime: 0.10,
  fileSize: 0.08,
  duration: 0.07,
};

/**
 * 默认建议选项
 */
export const DEFAULT_SUGGESTION_OPTIONS: Required<SuggestionOptions> = {
  similarityThreshold: 0.3,
  maxGroups: 8,
  maxItemsPerGroup: 10,
  featureWeights: DEFAULT_FEATURE_WEIGHTS,
  filterType: 'all',
};

/**
 * 默认聚类选项
 */
export const DEFAULT_CLUSTER_OPTIONS: ClusterOptions = {
  minK: 2,
  maxK: 8,
  maxItemsPerGroup: 10,
  maxIterations: 100,
  tolerance: 0.001,
};

/**
 * 缓存年龄分桶阈值（天）
 */
export const CACHE_AGE_THRESHOLDS = {
  /** 近期阈值：7天 */
  RECENT: 7,
  /** 中期阈值：30天 */
  MEDIUM: 30,
} as const;

/**
 * 性能约束常量
 */
export const PERFORMANCE_CONSTRAINTS = {
  /** 最大计算时间（毫秒） */
  MAX_CALCULATION_TIME: 100,
  /** 触发采样的项目数阈值 */
  SAMPLING_THRESHOLD: 1000,
  /** 显示部分结果的延迟（毫秒） */
  PARTIAL_RESULT_DELAY: 200,
} as const;
