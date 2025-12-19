/**
 * 文件系统相关常量
 */

/** 文件大小相关常量 */
export const FILE_SIZE = {
  /** 字节转换基数 */
  BYTES_PER_KB: 1024,

  /** 文件大小单位数组 */
  UNITS: ['B', 'KB', 'MB', 'GB', 'TB'] as const,

  /** 零字节显示文本 */
  ZERO_DISPLAY: '0 B',

  /** 格式化精度（小数位数） */
  DECIMAL_PLACES: 2,
} as const;

/** 数值格式化相关常量 */
export const NUMBER_FORMAT = {
  /** 千位分隔符阈值 */
  THOUSAND_THRESHOLD: 1000,

  /** 百万位分隔符阈值 */
  MILLION_THRESHOLD: 1000000,

  /** K单位显示精度 */
  K_PRECISION: 1,

  /** M单位显示精度 */
  M_PRECISION: 1,
} as const;

/** 文件路径相关常量 */
export const FILE_PATH = {
  /** 最大路径长度 */
  MAX_PATH_LENGTH: 260,

  /** 无效路径字符 */
  INVALID_CHARS: ['<', '>', ':', '"', '|', '?', '*'] as const,
} as const;
