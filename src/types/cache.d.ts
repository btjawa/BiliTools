/**
 * B站缓存导入功能相关类型定义
 *
 * 该文件定义了缓存导入、管理和展示相关的所有TypeScript接口
 * 包括缓存项目、导入进度、导入结果等核心数据结构
 */

// ============================================================================
// 核心数据模型
// ============================================================================

/**
 * 缓存项目信息
 * 表示一个已导入的B站缓存文件的完整信息
 */
export interface CacheItem {
  /** 唯一标识符 */
  id: string;
  /** B站视频BV号 */
  bvid: string;
  /** B站视频AV号 */
  aid: number;
  /** 视频分P的CID */
  cid: number;
  /** 视频标题 */
  title: string;
  /** UP主用户名 */
  uname: string;
  /** 封面图片URL */
  coverUrl: string;
  /** 视频时长（秒） */
  duration: number;
  /** 文件总大小（字节） */
  fileSize: number;
  /** 缓存文件在本地的路径 */
  cachePath: string;
  /** 视频原始下载时间（从videoInfo.json获取，优先使用completionTime） */
  downloadTime: Date;
  /** 导入到BiliTools的时间 */
  importTime: Date;
  /** 缓存状态 */
  status: CacheStatus;
  /** 视频组标识符（可选，用于组织相关视频） */
  groupId?: string;
}

/**
 * 缓存状态枚举
 */
export type CacheStatus =
  | 'available' // 可用 - 文件完整且可播放
  | 'unavailable' // 不可用 - 文件已被移动或删除
  | 'incomplete'; // 不完整 - 文件损坏或缺失

/**
 * 缓存视频组信息
 * 表示具有相同groupId的多个缓存视频的聚合显示
 */
export interface CacheGroup {
  /** 组标识符 */
  groupId: string;
  /** 组标题（从组内视频标题生成或使用默认标题） */
  title: string;
  /** 组封面URL（优先使用group.jpg，回退到第一个视频封面） */
  coverUrl: string;
  /** UP主名称（组内视频的共同UP主或主要UP主） */
  uname: string;
  /** 组内视频数量 */
  videoCount: number;
  /** 组内所有视频的总时长（秒） */
  totalDuration: number;
  /** 组内所有视频的总文件大小（字节） */
  totalFileSize: number;
  /** 组内最新的下载时间（用于排序） */
  latestDownloadTime: Date;
  /** 组内的视频列表 */
  videos: CacheItem[];
  /** 组是否处于展开状态 */
  isExpanded: boolean;
}

/**
 * 显示项联合类型
 * 表示缓存列表中可以显示的项目类型：单个视频或视频组
 */
export type DisplayItem =
  | { type: 'video'; data: CacheItem }
  | { type: 'group'; data: CacheGroup };

/**
 * 组状态信息
 * 用于持久化组的展开/折叠状态
 */
export interface GroupState {
  /** 组标识符 */
  groupId: string;
  /** 是否展开 */
  isExpanded: boolean;
  /** 状态创建时间 */
  createdAt: Date;
  /** 状态更新时间 */
  updatedAt: Date;
}

// ============================================================================
// 导入相关类型
// ============================================================================

/**
 * 导入进度信息
 * 用于实时显示导入操作的进度状态
 */
export interface ImportProgress {
  /** 导入操作的唯一标识符 */
  importId: string;
  /** 总共需要处理的目录数量 */
  totalDirectories: number;
  /** 已处理完成的目录数量 */
  processedDirectories: number;
  /** 当前正在处理的目录路径 */
  currentDirectory: string;
  /** 当前导入状态 */
  status: ImportStatus;
  /** 导入过程中遇到的错误列表 */
  errors: ImportError[];
  /** 成功导入的数量 */
  successCount: number;
  /** 失败的数量 */
  failureCount: number;
  /** 跳过的数量（重复或无效） */
  skippedCount: number;
  /** 预计剩余时间（秒） */
  estimatedTimeRemaining?: number;
}

/**
 * 导入状态枚举
 */
export type ImportStatus =
  | 'Scanning' // 扫描目录中
  | 'Parsing' // 解析JSON文件中
  | 'Validating' // 验证文件完整性中
  | 'Saving' // 保存到数据库中
  | 'Completed' // 导入完成
  | 'Cancelled' // 用户取消
  | 'Error'; // 发生错误

/**
 * 导入错误信息
 */
export interface ImportError {
  /** 发生错误的目录路径 */
  directoryPath: string;
  /** 错误类型 */
  errorType: ImportErrorType;
  /** 错误详细信息 */
  message: string;
  /** 错误发生时间 */
  timestamp: Date;
}

/**
 * 导入错误类型枚举
 */
export type ImportErrorType =
  | 'directory_not_found' // 目录不存在
  | 'invalid_json_format' // JSON格式无效
  | 'missing_required_files' // 缺少必需文件
  | 'file_size_mismatch' // 文件大小不匹配
  | 'database_error' // 数据库操作失败
  | 'permission_denied' // 权限不足
  | 'unknown_error'; // 未知错误

/**
 * 导入结果
 * 表示一次完整导入操作的最终结果
 */
export interface ImportResult {
  /** 导入操作的唯一标识符 */
  importId: string;
  /** 扫描发现的总目录数 */
  totalFound: number;
  /** 成功导入的数量 */
  successCount: number;
  /** 导入失败的数量 */
  failureCount: number;
  /** 跳过的数量（重复或无效） */
  skippedCount: number;
  /** 导入开始时间 */
  startTime: Date;
  /** 导入结束时间 */
  endTime: Date;
  /** 详细的导入结果列表 */
  details: ImportDetail[];
}

/**
 * 单个目录的导入详情
 */
export interface ImportDetail {
  /** 目录路径 */
  directoryPath: string;
  /** 处理状态 */
  status: ImportDetailStatus;
  /** 失败或跳过的原因 */
  reason?: string;
  /** 成功导入时生成的缓存项目 */
  cacheItem?: CacheItem;
  /** 处理耗时（毫秒） */
  processingTime: number;
}

/**
 * 导入详情状态枚举
 */
export type ImportDetailStatus =
  | 'success' // 成功导入
  | 'failure' // 导入失败
  | 'skipped'; // 跳过处理

// ============================================================================
// 导入配置和选项
// ============================================================================

/**
 * 重复处理策略
 */
export type DuplicateHandlingStrategy =
  | 'skip' // 跳过重复项
  | 'overwrite' // 覆盖现有记录
  | 'ask'; // 询问用户（暂不实现，预留）

/**
 * 导入选项配置
 */
export interface ImportOptions {
  /** 重复处理策略 */
  duplicateHandling: DuplicateHandlingStrategy;
  /** 验证文件完整性 */
  verifyIntegrity: boolean;
  /** 导入后删除原文件 */
  deleteAfterImport: boolean;
  /** 自动创建播放列表 */
  createPlaylist: boolean;
  /** 最大并发处理数 */
  maxConcurrency: number;
}

/**
 * 扫描结果
 * 表示目录扫描操作的结果
 */
export interface ScanResult {
  /** 扫描的根目录路径 */
  rootPath: string;
  /** 发现的缓存目录总数 */
  totalDirectories: number;
  /** 有效的缓存目录数 */
  validDirectories: number;
  /** 无效的缓存目录数 */
  invalidDirectories: number;
  /** 预计总文件大小（字节） */
  estimatedTotalSize: number;
  /** 扫描耗时（毫秒） */
  scanDuration: number;
  /** 发现的缓存目录列表 */
  directories: ScanDirectoryInfo[];
}

/**
 * 扫描发现的目录信息
 */
export interface ScanDirectoryInfo {
  /** 目录路径 */
  path: string;
  /** 是否为有效缓存目录 */
  isValid: boolean;
  /** 无效原因（如果无效） */
  invalidReason?: string;
  /** 预览信息（如果有效） */
  preview?: CachePreview;
}

/**
 * 缓存预览信息
 * 用于在导入前展示缓存内容概览
 */
export interface CachePreview {
  /** 视频标题 */
  title: string;
  /** UP主名称 */
  uname: string;
  /** 视频时长（秒） */
  duration: number;
  /** 文件大小（字节） */
  fileSize: number;
  /** BV号 */
  bvid: string;
}

// ============================================================================
// 视频信息相关类型（从videoInfo.json解析）
// ============================================================================

/**
 * videoInfo.json文件的数据结构
 * 这是B站客户端缓存文件中包含的元数据信息
 */
export interface VideoInfo {
  /** 视频AV号 */
  aid: number;
  /** 视频BV号 */
  bvid: string;
  /** 分P的CID */
  cid: number;
  /** 视频标题 */
  title: string;
  /** UP主用户名 */
  uname: string;
  /** 封面图片URL */
  cover: string;
  /** 视频时长（秒） */
  duration: number;
  /** 文件总大小（字节） */
  totalSize: number;
  /** 视频质量等级 */
  quality: number;
  /** 下载时间戳 */
  downloadTime?: number;
  /** 完成时间（通常为 Unix 时间戳的毫秒表示） */
  completionTime?: number;
  /** 视频组标识符（可选，用于组织相关视频） */
  groupId?: string;
  /** 其他可选字段 */
  [key: string]: unknown;
}

// ============================================================================
// 筛选和排序相关类型
// ============================================================================

/**
 * 缓存筛选条件
 */
export interface CacheFilter {
  /** 搜索关键词（匹配标题或UP主） */
  keyword?: string;
  /** 按状态筛选 */
  status?: CacheStatus[];
  /** 按UP主筛选 */
  uploader?: string;
  /** 文件大小范围筛选（字节） */
  sizeRange?: {
    min?: number;
    max?: number;
  };
  /** 时长范围筛选（秒） */
  durationRange?: {
    min?: number;
    max?: number;
  };
  /** 导入时间范围筛选 */
  importTimeRange?: {
    start?: Date;
    end?: Date;
  };
  /** 按组筛选（仅显示组或仅显示单个视频） */
  displayType?: 'all' | 'groups' | 'singles';
  /** 按组ID筛选 */
  groupId?: string;
}

/**
 * 排序选项
 */
export interface SortOption {
  /** 排序字段 */
  field: SortField;
  /** 排序方向 */
  direction: SortDirection;
}

/**
 * 可排序的字段
 */
export type SortField =
  | 'title' // 按标题排序
  | 'uname' // 按UP主排序
  | 'duration' // 按时长排序
  | 'fileSize' // 按文件大小排序
  | 'downloadTime' // 按下载时间排序
  | 'completionTime'; // 按下载完成时间排序

/**
 * 排序方向
 */
export type SortDirection = 'asc' | 'desc';

// ============================================================================
// UI组件相关类型
// ============================================================================

/**
 * 缓存列表的分页信息
 */
export interface CachePagination {
  /** 当前页码（从1开始） */
  currentPage: number;
  /** 每页显示数量 */
  pageSize: number;
  /** 总记录数 */
  totalCount: number;
  /** 总页数 */
  totalPages: number;
}

/**
 * 组卡片组件属性
 */
export interface CacheGroupCardProps {
  /** 组数据 */
  group: CacheGroup;
  /** 是否被选中 */
  isSelected: boolean;
  /** 展开/折叠切换回调 */
  onToggleExpand: (groupId: string) => void;
  /** 选择组回调 */
  onSelectGroup: (groupId: string, selected: boolean) => void;
  /** 删除组回调 */
  onDeleteGroup: (groupId: string) => void;
  /** 打开文件夹回调 */
  onOpenFolder: (groupId: string) => void;
}

/**
 * 混合列表组件属性
 */
export interface CacheMixedListProps {
  /** 显示项列表（包含单个视频和组） */
  items: DisplayItem[];
  /** 排序方式 */
  sortBy: 'time' | 'size' | 'title';
  /** 搜索查询 */
  searchQuery: string;
  /** 已选择的项目ID集合 */
  selectedItems: Set<string>;
}

/**
 * 组管理器配置
 */
export interface GroupManagerConfig {
  /** 默认展开状态 */
  defaultExpanded: boolean;
  /** 最小组大小（少于此数量的视频不会成组） */
  minGroupSize: number;
  /** 是否启用组功能 */
  enableGrouping: boolean;
  /** 组标题生成策略 */
  titleGenerationStrategy: 'prefix' | 'series' | 'default';
}

/**
 * 缓存统计信息
 */
export interface CacheStatistics {
  /** 总缓存数量 */
  totalCount: number;
  /** 可用缓存数量 */
  availableCount: number;
  /** 不可用缓存数量 */
  unavailableCount: number;
  /** 不完整缓存数量 */
  incompleteCount: number;
  /** 总文件大小（字节） */
  totalSize: number;
  /** 平均文件大小（字节） */
  averageSize: number;
  /** 总时长（秒） */
  totalDuration: number;
  /** 组数量 */
  groupCount: number;
  /** 单个视频数量（不属于任何组） */
  singleVideoCount: number;
  /** 平均每组视频数量 */
  averageVideosPerGroup: number;
}

// ============================================================================
// 事件相关类型
// ============================================================================

/**
 * 缓存相关事件类型
 */
export type CacheEventType =
  | 'import_started' // 导入开始
  | 'import_progress' // 导入进度更新
  | 'import_completed' // 导入完成
  | 'import_cancelled' // 导入取消
  | 'import_error' // 导入错误
  | 'cache_deleted' // 缓存删除
  | 'cache_updated'; // 缓存更新

/**
 * 缓存事件数据
 */
export interface CacheEvent {
  /** 事件类型 */
  type: CacheEventType;
  /** 事件时间戳 */
  timestamp: Date;
  /** 事件相关数据 */
  data: unknown;
}

// ============================================================================
// 操作相关类型
// ============================================================================

/**
 * 缓存操作类型
 */
export type CacheAction =
  | 'play' // 播放
  | 'open_folder' // 打开文件夹
  | 'delete' // 删除
  | 'export' // 导出
  | 'refresh' // 刷新状态
  | 'expand' // 展开组
  | 'collapse' // 折叠组
  | 'select_group' // 选择整个组
  | 'play_group'; // 播放组内所有视频

/**
 * 批量操作选项
 */
export interface BatchOperationOptions {
  /** 操作类型 */
  action: CacheAction;
  /** 目标缓存项目ID列表 */
  targetIds: string[];
  /** 操作确认回调 */
  onConfirm?: () => void;
  /** 操作完成回调 */
  onComplete?: (results: BatchOperationResult[]) => void;
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult {
  /** 缓存项目ID */
  cacheId: string;
  /** 操作是否成功 */
  success: boolean;
  /** 错误信息（如果失败） */
  error?: string;
}
// ============================================================================
// 后端原始数据类型（用于类型转换）
// ============================================================================

/** 后端扫描结果原始格式 */
export interface ScanResultRaw {
  root_path: string;
  total_directories: number;
  valid_directories: number;
  invalid_directories: number;
  estimated_total_size: number;
  scan_duration: number;
  directories: DirectoryInfoRaw[];
}

/** 后端目录信息原始格式 */
export interface DirectoryInfoRaw {
  path: string;
  is_valid: boolean;
  invalid_reason?: string;
  preview?: VideoInfoPreviewRaw;
}

/** 后端视频预览信息原始格式 */
export interface VideoInfoPreviewRaw {
  title: string;
  uname: string;
  bvid: string;
  file_size: number;
  duration: number;
}

/** 后端缓存记录原始格式 */
export interface CacheRecordRaw {
  id: string;
  bvid: string;
  aid: number;
  cid: number;
  title: string;
  uname: string;
  cover_url: string;
  duration: number;
  file_size: number;
  cache_path: string;
  download_time: number;
  import_time: number;
  status: string;
  source: string;
  group_id?: string;
}

/** 后端缓存统计原始格式 */
export interface CacheStatisticsRaw {
  total_count: number;
  available_count: number;
  total_size: number;
  average_file_size: number;
  total_duration: number;
  group_count: number;
  single_video_count: number;
  average_videos_per_group: number;
}

/** 后端组数据原始格式 */
export interface CacheGroupRaw {
  group_id: string;
  title: string;
  cover_url: string;
  uname: string;
  video_count: number;
  total_duration: number;
  total_file_size: number;
  latest_download_time: number;
  videos: CacheRecordRaw[];
  is_expanded: boolean;
}

/** 后端显示项原始格式 */
export type DisplayItemRaw =
  | { type: 'single_video'; video: CacheRecordRaw }
  | { type: 'video_group'; group: CacheGroupRaw };

/** 后端组状态原始格式 */
export interface GroupStateRaw {
  group_id: string;
  is_expanded: boolean;
  created_at: number;
  updated_at: number;
}
