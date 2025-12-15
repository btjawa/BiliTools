/**
 * 传输服务
 *
 * 处理缓存文件的复制、剪切和缓存根目录迁移操作
 */

import { invoke } from '@tauri-apps/api/core';
import type * as Types from '@/types/transfer.d';

/**
 * 发现可用的传输目标（本地文件夹和移动设备）
 */
export async function discoverTransferTargets(): Promise<Types.TransferTarget[]> {
  try {
    const targets = await invoke<Types.TransferTarget[]>('discover_transfer_targets');
    return targets;
  } catch (error) {
    console.error('发现传输目标失败:', error);
    throw error;
  }
}

/**
 * 验证传输目标的有效性
 */
export async function validateTransferTarget(target: Types.TransferTarget): Promise<boolean> {
  try {
    const isValid = await invoke<boolean>('validate_transfer_target', {
      target,
    });
    return isValid;
  } catch (error) {
    console.error('验证传输目标失败:', error);
    throw error;
  }
}

/**
 * 检查目标位置的可用空间
 */
export async function checkAvailableSpace(
  targetPath: string,
  requiredSize: number,
): Promise<boolean> {
  try {
    const hasSpace = await invoke<boolean>('check_available_space', {
      targetPath,
      requiredSize,
    });
    return hasSpace;
  } catch (error) {
    console.error('检查可用空间失败:', error);
    throw error;
  }
}

/**
 * 开始文件传输
 */
export async function startTransfer(request: Types.TransferRequest): Promise<string> {
  try {
    const taskId = await invoke<string>('start_transfer', {
      request,
    });
    return taskId;
  } catch (error) {
    console.error('开始传输失败:', error);
    throw error;
  }
}

/**
 * 开始缓存根目录迁移
 */
export async function startRootMigration(request: Types.RootMigrationRequest): Promise<string> {
  try {
    const taskId = await invoke<string>('start_root_migration', {
      request,
    });
    return taskId;
  } catch (error) {
    console.error('开始缓存根目录迁移失败:', error);
    throw error;
  }
}

/**
 * 暂停传输任务
 */
export async function pauseTransfer(taskId: string): Promise<void> {
  try {
    await invoke('pause_transfer', { taskId });
  } catch (error) {
    console.error('暂停传输失败:', error);
    throw error;
  }
}

/**
 * 取消传输任务
 */
export async function cancelTransfer(taskId: string): Promise<void> {
  try {
    await invoke('cancel_transfer', { taskId });
  } catch (error) {
    console.error('取消传输失败:', error);
    throw error;
  }
}

/**
 * 恢复传输任务
 */
export async function resumeTransfer(taskId: string): Promise<void> {
  try {
    await invoke('resume_transfer', { taskId });
  } catch (error) {
    console.error('恢复传输失败:', error);
    throw error;
  }
}

/**
 * 获取传输进度
 */
export async function getTransferProgress(taskId: string): Promise<Types.TransferProgress | null> {
  try {
    const progress = await invoke<Types.TransferProgress | null>('get_transfer_progress', {
      taskId,
    });
    return progress;
  } catch (error) {
    console.error('获取传输进度失败:', error);
    throw error;
  }
}



/**
 * 打开文件夹选择对话框
 */
export async function selectFolder(): Promise<string | null> {
  try {
    const folderPath = await invoke<string | null>('select_folder');
    return folderPath;
  } catch (error) {
    console.error('选择文件夹失败:', error);
    throw error;
  }
}

/**
 * 获取当前缓存根目录
 */
export async function getCurrentCacheRoot(): Promise<string> {
  try {
    const root = await invoke<string>('get_current_cache_root');
    return root;
  } catch (error) {
    console.error('获取当前缓存根目录失败:', error);
    throw error;
  }
}

/**
 * 设置缓存根目录
 */
export async function setCacheRoot(path: string): Promise<void> {
  try {
    await invoke('set_cache_root', { path });
  } catch (error) {
    console.error('设置缓存根目录失败:', error);
    throw error;
  }
}

/**
 * 监听设备变化
 */
export function onDeviceChange(): () => void {
  // 这个函数会在后续的Tauri事件监听中实现
  // 返回一个取消监听的函数
  return () => {
    // 取消监听
  };
}

/**
 * 监听传输进度更新
 */
export function onTransferProgress(): () => void {
  // 这个函数会在后续的Tauri事件监听中实现
  // 返回一个取消监听的函数
  return () => {
    // 取消监听
  };
}
