/**
 * 网络相关常量
 */

/** HTTP 状态码常量 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/** 网络请求相关常量 */
export const NETWORK = {
  /** 默认请求超时时间（毫秒） */
  DEFAULT_TIMEOUT: 10000,

  /** 文件下载超时时间（毫秒） */
  DOWNLOAD_TIMEOUT: 30000,

  /** 最大重试次数 */
  MAX_RETRIES: 3,

  /** 重试延迟（毫秒） */
  RETRY_DELAY: 1000,
} as const;

/** API 相关常量 */
export const API = {
  /** B站API基础URL */
  BILIBILI_BASE_URL: 'https://api.bilibili.com',

  /** 用户代理字符串 */
  USER_AGENT:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',

  /** 请求头 */
  HEADERS: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  } as const,
} as const;
