/**
 * 传输功能相关的类型定义
 */

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
 */
export type TransferTaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

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
 */
export interface TransferProgress {
  taskId: string;
  totalFiles: number;
  completedFiles: number;
  totalSize: number;
  transferredSize: number;
  speed: number; // 字节/秒
  remainingTime: number; // 秒
  currentFile: string;
  status: TransferTaskStatus;
  errorMessage?: string;
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
 */
export type ProgressCallback = (progress: TransferProgress) => void;

/**
 * 设备变化回调
 */
export type DeviceChangeCallback = (devices: DeviceInfo[]) => void;
