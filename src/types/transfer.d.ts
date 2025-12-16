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
 * 设备类型
 */
export type DeviceType = 'LocalDrive' | 'RemovableStorage';

/**
 * 连接状态
 */
export type ConnectionStatus = 'Connected' | 'Disconnected';

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
  device_type: DeviceType;
  path?: string;
  available_space?: number;
  connection_status: ConnectionStatus;
}

/**
 * 传输进度信息
 * 扩展 FileTransferProgress 以保持向后兼容性
 */
export interface TransferProgress extends FileTransferProgress {
  /** 当前文件名 (兼容性别名) */
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
  currentFile: string;
  status: TransferTaskStatus;
  errorMessage?: string;
}): TransferProgress {
  const percentage = oldProgress.totalFiles > 0 
    ? (oldProgress.completedFiles / oldProgress.totalFiles) * PROGRESS.MAX_PERCENTAGE 
    : PROGRESS.MIN_PERCENTAGE;

  return {
    // FileTransferProgress 字段
    taskId: oldProgress.taskId,
    totalFiles: oldProgress.totalFiles,
    completedFiles: oldProgress.completedFiles,
    totalSize: oldProgress.totalSize,
    transferredSize: oldProgress.transferredSize,
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
    
    // 兼容性字段
    currentFile: oldProgress.currentFile,
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
 * 设备信息
 */
export interface DeviceInfo {
  id: string;
  name: string;
  type: DeviceType;
  availableSpace?: number;
  connectionStatus: ConnectionStatus;
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

/**
 * 设备变化回调
 */
export type DeviceChangeCallback = (devices: DeviceInfo[]) => void;
