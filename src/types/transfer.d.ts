/**
 * 传输功能相关的类型定义
 */

import { FileTransferProgress, ProgressStatus } from './common';
import { PROGRESS } from '@/constants';

/**
 * 传输操作类型
 */
export type TransferOperation = 'Copy' | 'Cut' | 'RootMigration';

/**
 * 传输类型
 */
export type TransferType = 'individual' | 'root_migration';

/**
 * 文件冲突处理策略
 */
export type ConflictStrategy = 'Skip' | 'Overwrite' | 'Rename' | 'Ask';

/**
 * 传输任务状态
 * @deprecated 请使用 ProgressStatus from './common'
 */
export type TransferTaskStatus = ProgressStatus;

/**
 * 传输目标
 */
export interface TransferTarget {
  id: string;
  name: string;
  path?: string;
  available_space?: number;
}

/**
 * 传输进度信息
 * 扩展 FileTransferProgress 以保持向后兼容性
 */
export interface TransferProgress extends FileTransferProgress {
  /** 当前视频名称 */
  currentVideoName: string;
  /** 当前文件路径 */
  currentFile: string;
}

/**
 * 类型迁移映射：将旧的 TransferProgress 转换为新的 FileTransferProgress
 */
export function migrateTransferProgress(oldProgress: {
  taskId: string;
  totalFiles: number;
  completedFiles: number;
  totalSize: number;
  transferredSize: number;
  speed: number;
  remainingTime: number;
  currentVideoName?: string;
  currentFile: string;
  status: TransferTaskStatus;
  errorMessage?: string;
}): TransferProgress {
  const percentage =
    oldProgress.totalFiles > 0
      ? (oldProgress.completedFiles / oldProgress.totalFiles) *
        PROGRESS.MAX_PERCENTAGE
      : PROGRESS.MIN_PERCENTAGE;

  return {
    // FileTransferProgress 字段
    taskId: oldProgress.taskId,
    totalFiles: oldProgress.totalFiles,
    completedFiles: oldProgress.completedFiles,
    totalSize: oldProgress.totalSize,
    transferredSize: oldProgress.transferredSize,
    currentVideoName: oldProgress.currentVideoName || '',
    currentFile: oldProgress.currentFile,
    errorMessage: oldProgress.errorMessage,

    // BaseProgress 字段
    total: oldProgress.totalFiles,
    completed: oldProgress.completedFiles,
    percentage,
    speed: oldProgress.speed,
    remainingTime: oldProgress.remainingTime,
    currentItem: oldProgress.currentFile,
    status: oldProgress.status,
  };
}

/**
 * 传输请求
 */
export interface TransferRequest {
  operation: TransferOperation;
  source_files: string[]; // 缓存ID列表
  target_path: string;
  conflict_strategy: ConflictStrategy;
}

/**
 * 缓存根目录迁移请求
 */
export interface RootMigrationRequest {
  targetRoot: string;
  updateDatabase: boolean;
}

/**
 * 传输任务
 */
export interface TransferTask {
  id: string;
  operation: TransferOperation;
  source_files: string[];
  target_path: string;
  status: TransferTaskStatus;
  progress: TransferProgress;
  created_at: number;
  updated_at: number;
}

/**
 * 传输响应
 */
export interface TransferResponse {
  taskId: string;
  status: 'success' | 'error';
  message?: string;
}

/**
 * 传输进度回调
 * @deprecated 请使用 ProgressCallback<TransferProgress> from './common'
 */
export type ProgressCallback = (progress: TransferProgress) => void;
