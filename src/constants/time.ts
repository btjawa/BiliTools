/**
 * 时间相关常量
 */

/** 时间转换常量 */
export const TIME_CONVERSION = {
  /** 毫秒转秒 */
  MS_TO_SECONDS: 1000,

  /** 秒转分钟 */
  SECONDS_TO_MINUTES: 60,

  /** 分钟转小时 */
  MINUTES_TO_HOURS: 60,

  /** 小时转天 */
  HOURS_TO_DAYS: 24,

  /** 毫秒时间戳阈值（大于此值认为是毫秒时间戳） */
  MILLISECOND_TIMESTAMP_THRESHOLD: 1e10,
} as const;

/** 时间格式化相关常量 */
export const TIME_FORMAT = {
  /** 零时间显示文本 */
  ZERO_DISPLAY: '0:00',

  /** 零秒显示文本 */
  ZERO_SECONDS: '0秒',

  /** 时间单位 */
  UNITS: {
    HOURS: '小时',
    MINUTES: '分',
    SECONDS: '秒',
  } as const,
} as const;

/** 定时器相关常量 */
export const TIMER = {
  /** 剪贴板监控间隔（毫秒） */
  CLIPBOARD_INTERVAL: 1000,

  /** 随机延迟范围 */
  RANDOM_DELAY: {
    MIN: 100,
    MAX: 500,
  } as const,

  /** 进度更新间隔（毫秒） */
  PROGRESS_UPDATE_INTERVAL: 100,
} as const;

/** 缓存自动刷新相关常量 */
export const CACHE_AUTO_REFRESH = {
  /** 默认刷新间隔（分钟） */
  DEFAULT_INTERVAL_MINUTES: 10 as number,

  /** 最小刷新间隔（分钟） */
  MIN_INTERVAL_MINUTES: 1 as number,

  /** 最大刷新间隔（分钟） */
  MAX_INTERVAL_MINUTES: 60 as number,

  /** 禁用自动刷新的值 */
  DISABLED: 0 as number,
};
