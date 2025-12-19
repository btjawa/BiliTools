/**
 * UI 相关常量
 */

/** 进度更新相关常量 */
export const PROGRESS = {
  /** 进度更新间隔（毫秒） */
  UPDATE_INTERVAL: 100,

  /** 最小百分比值 */
  MIN_PERCENTAGE: 0,

  /** 最大百分比值 */
  MAX_PERCENTAGE: 100,

  /** 百分比计算精度 */
  PERCENTAGE_PRECISION: 2,
} as const;

/** 防抖和节流相关常量 */
export const DEBOUNCE = {
  /** 默认防抖延迟（毫秒） */
  DEFAULT_DELAY: 300,

  /** 搜索输入防抖延迟 */
  SEARCH_DELAY: 500,

  /** 窗口大小调整防抖延迟 */
  RESIZE_DELAY: 200,
} as const;

/** 组件相关常量 */
export const COMPONENT = {
  /** 组件最大行数限制 */
  MAX_LINES: 1000,

  /** 虚拟滚动项目高度 */
  VIRTUAL_ITEM_HEIGHT: 48,

  /** 列表项默认高度 */
  LIST_ITEM_HEIGHT: 64,
} as const;

/** 分页相关常量 */
export const PAGINATION = {
  /** 默认页面大小 */
  DEFAULT_PAGE_SIZE: 20,

  /** 小页面大小 */
  SMALL_PAGE_SIZE: 10,

  /** 默认起始页码 */
  DEFAULT_PAGE: 1,

  /** 最大通知数量 */
  MAX_TOASTS: 20,
} as const;

/** 通知相关常量 */
export const NOTIFICATION = {
  /** 成功消息显示时长（毫秒） */
  SUCCESS_TIMEOUT: 3000,

  /** 警告消息显示时长（毫秒） */
  WARNING_TIMEOUT: 5000,

  /** 错误消息显示时长（毫秒，false表示不自动关闭） */
  ERROR_TIMEOUT: false as const,

  /** 信息消息显示时长（毫秒） */
  INFO_TIMEOUT: 3000,
} as const;

/** 动画相关常量 */
export const ANIMATION = {
  /** 默认过渡时长（毫秒） */
  DEFAULT_DURATION: 300,

  /** 快速过渡时长（毫秒） */
  FAST_DURATION: 150,

  /** 慢速过渡时长（毫秒） */
  SLOW_DURATION: 500,
} as const;
