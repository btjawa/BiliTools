/**
 * 缓存相关常量
 */

/** B站缓存文件名常量 */
export const CACHE_FILES = {
  /** 播放URL配置信息文件 */
  PLAYURL: '.playurl',
  
  /** 视频基础信息文件（无扩展名） */
  VIDEO_INFO: 'videoInfo',
  
  /** 详细视频元数据JSON文件 */
  VIDEO_INFO_JSON: 'videoInfo.json',
  
  /** 弹幕文件前缀（实际文件名如 dm1, dm2, dm3 等） */
  DANMAKU_PREFIX: 'dm',
  
  /** 视图相关信息文件 */
  VIEW: 'view',
  
  /** 媒体文件扩展名 */
  MEDIA_EXTENSION: '.m4s',
} as const;

/** 缓存导入相关常量 */
export const CACHE_IMPORT = {
  /** 默认最大并发处理数 */
  DEFAULT_MAX_CONCURRENCY: 5,
  
  /** 扫描超时时间（毫秒） */
  SCAN_TIMEOUT: 30000,
  
  /** 单个文件处理超时时间（毫秒） */
  PROCESS_TIMEOUT: 10000,
  
  /** 重试次数 */
  MAX_RETRIES: 3,
} as const;

/** 缓存验证相关常量 */
export const CACHE_VALIDATION = {
  /** 必需文件列表 */
  REQUIRED_FILES: [
    CACHE_FILES.VIDEO_INFO_JSON,
  ] as const,
  
  /** 可选文件前缀列表（用于模式匹配） */
  OPTIONAL_FILE_PATTERNS: [
    CACHE_FILES.PLAYURL,
    CACHE_FILES.VIDEO_INFO,
    CACHE_FILES.DANMAKU_PREFIX, // 匹配 dm1, dm2, dm3 等
    CACHE_FILES.VIEW,
  ] as const,
  
  /** 最小文件夹大小（字节） */
  MIN_FOLDER_SIZE: 1024,
} as const;

/** 缓存文件名辅助函数 */
export const CACHE_HELPERS = {
  /** 
   * 检查文件名是否为弹幕文件
   * @param filename 文件名
   * @returns 是否为弹幕文件
   */
  isDanmakuFile: (filename: string): boolean => {
    return /^dm\d+$/.test(filename);
  },
  
  /** 
   * 检查文件名是否为媒体文件
   * @param filename 文件名
   * @returns 是否为媒体文件
   */
  isMediaFile: (filename: string): boolean => {
    return filename.endsWith(CACHE_FILES.MEDIA_EXTENSION);
  },
  
  /** 
   * 生成弹幕文件名
   * @param index 弹幕文件索引
   * @returns 弹幕文件名
   */
  getDanmakuFileName: (index: number): string => {
    return `${CACHE_FILES.DANMAKU_PREFIX}${index}`;
  },
} as const;