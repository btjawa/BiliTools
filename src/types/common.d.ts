/**
 * 通用类型定义库
 * 
 * 提供项目中通用的基础类型定义，包括进度相关类型、状态枚举等
 * 用于统一不同模块间的类型定义，减少重复并提高类型安全性
 */

import { PROGRESS } from '@/constants';

// ============================================================================
// 基础进度类型
// ============================================================================

/**
 * 进度状态枚举
 * 定义所有进度相关操作的通用状态
 */
export type ProgressStatus = 
  | 'pending'    // 等待中
  | 'running'    // 运行中
  | 'paused'     // 已暂停
  | 'completed'  // 已完成
  | 'failed'     // 失败
  | 'cancelled'; // 已取消

/**
 * 基础进度接口
 * 所有进度相关类型的基础接口，提供通用的进度信息结构
 */
export interface BaseProgress {
  /** 总数量 */
  total: number;
  /** 已完成数量 */
  completed: number;
  /** 完成百分比 (0-100) */
  percentage: number;
  /** 处理速度 (单位/秒) */
  speed: number;
  /** 预计剩余时间 (秒) */
  remainingTime: number;
  /** 当前处理项目描述 */
  currentItem: string;
  /** 当前状态 */
  status: ProgressStatus;
}

// ============================================================================
// 扩展进度类型
// ============================================================================

/**
 * 文件传输进度接口
 * 扩展基础进度，添加文件传输特有的字段
 */
export interface FileTransferProgress extends BaseProgress {
  /** 任务唯一标识符 */
  taskId: string;
  /** 总文件数量 */
  totalFiles: number;
  /** 已完成文件数量 */
  completedFiles: number;
  /** 总文件大小 (字节) */
  totalSize: number;
  /** 已传输大小 (字节) */
  transferredSize: number;
  /** 当前处理的文件名 */
  currentFile: string;
  /** 错误信息 (可选) */
  errorMessage?: string;
}

/**
 * 数据导入进度接口
 * 扩展基础进度，添加数据导入特有的字段
 */
export interface DataImportProgress extends BaseProgress {
  /** 导入操作唯一标识符 */
  importId: string;
  /** 总目录数量 */
  totalDirectories: number;
  /** 已处理目录数量 */
  processedDirectories: number;
  /** 当前处理的目录路径 */
  currentDirectory: string;
  /** 成功导入数量 */
  successCount: number;
  /** 失败数量 */
  failureCount: number;
  /** 跳过数量 */
  skippedCount: number;
}

// ============================================================================
// 向后兼容类型别名
// ============================================================================

/**
 * 传输进度类型别名 (向后兼容)
 * @deprecated 请使用 FileTransferProgress
 */
export type LegacyTransferProgress = FileTransferProgress;

/**
 * 导入进度类型别名 (向后兼容)
 * @deprecated 请使用 DataImportProgress
 */
export type LegacyImportProgress = DataImportProgress;

// ============================================================================
// 通用操作结果类型
// ============================================================================

/**
 * 操作结果接口
 * 表示任何操作的执行结果
 */
export interface OperationResult<T = unknown> {
  /** 操作是否成功 */
  success: boolean;
  /** 返回数据 (成功时) */
  data?: T;
  /** 错误信息 (失败时) */
  error?: string;
  /** 错误代码 (失败时) */
  errorCode?: string;
  /** 操作耗时 (毫秒) */
  duration?: number;
}

/**
 * 批量操作结果接口
 * 表示批量操作中单个项目的结果
 */
export interface BatchOperationResult<T = unknown> {
  /** 项目标识符 */
  itemId: string;
  /** 操作是否成功 */
  success: boolean;
  /** 返回数据 (成功时) */
  data?: T;
  /** 错误信息 (失败时) */
  error?: string;
  /** 处理耗时 (毫秒) */
  processingTime: number;
}

// ============================================================================
// 通用回调函数类型
// ============================================================================

/**
 * 进度回调函数类型
 */
export type ProgressCallback<T extends BaseProgress = BaseProgress> = (progress: T) => void;

/**
 * 错误回调函数类型
 */
export type ErrorCallback = (error: Error) => void;

/**
 * 完成回调函数类型
 */
export type CompletionCallback<T = unknown> = (result: OperationResult<T>) => void;

// ============================================================================
// 类型工具函数
// ============================================================================

/**
 * 类型守卫：检查是否为文件传输进度
 */
export function isFileTransferProgress(progress: BaseProgress): progress is FileTransferProgress {
  return 'taskId' in progress && 'totalFiles' in progress;
}

/**
 * 类型守卫：检查是否为数据导入进度
 */
export function isDataImportProgress(progress: BaseProgress): progress is DataImportProgress {
  return 'importId' in progress && 'totalDirectories' in progress;
}

/**
 * 计算进度百分比
 */
export function calculatePercentage(completed: number, total: number): number {
  if (total === 0) return PROGRESS.MIN_PERCENTAGE;
  return Math.min(PROGRESS.MAX_PERCENTAGE, Math.max(PROGRESS.MIN_PERCENTAGE, (completed / total) * PROGRESS.MAX_PERCENTAGE));
}

/**
 * 格式化剩余时间
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}分钟`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}小时${minutes}分钟`;
  }
}