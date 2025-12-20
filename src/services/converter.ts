/**
 * 转换服务
 *
 * 封装缓存文件转换为 MP4 的 Tauri 命令调用和事件监听
 */

import { Channel } from '@tauri-apps/api/core';
import { commands, events } from './backend';
import type {
  ConvertConfig,
  ConvertProgress,
  ConvertTaskView,
  DiskSpaceCheck,
  ConvertEvent,
} from './backend';

export type {
  ConvertConfig,
  ConvertProgress,
  ConvertTaskView,
  DiskSpaceCheck,
  ConvertEvent,
};

/**
 * 创建并执行转换任务
 *
 * @param cacheIds 缓存记录ID列表
 * @param outputDir 输出目录路径
 * @param config 转换配置
 * @returns 创建的任务ID列表
 */
export async function convertCache(
  cacheIds: string[],
  outputDir: string,
  config: ConvertConfig,
): Promise<string[]> {
  const result = await commands.convertCache(cacheIds, outputDir, config);
  if (result.status === 'error') {
    throw new Error(result.error.message);
  }
  return result.data;
}

/**
 * 暂停转换任务
 *
 * @param taskId 任务ID
 */
export async function pauseConvert(taskId: string): Promise<void> {
  const result = await commands.pauseConvert(taskId);
  if (result.status === 'error') {
    throw new Error(result.error.message);
  }
}

/**
 * 恢复转换任务
 *
 * @param taskId 任务ID
 */
export async function resumeConvert(taskId: string): Promise<void> {
  const result = await commands.resumeConvert(taskId);
  if (result.status === 'error') {
    throw new Error(result.error.message);
  }
}

/**
 * 取消转换任务
 *
 * @param taskId 任务ID
 */
export async function cancelConvert(taskId: string): Promise<void> {
  const result = await commands.cancelConvert(taskId);
  if (result.status === 'error') {
    throw new Error(result.error.message);
  }
}

/**
 * 检查转换所需的磁盘空间
 *
 * @param cacheIds 缓存记录ID列表
 * @param outputDir 输出目录路径
 * @returns 磁盘空间检查结果
 */
export async function checkConvertSpace(
  cacheIds: string[],
  outputDir: string,
): Promise<DiskSpaceCheck> {
  const result = await commands.checkConvertSpace(cacheIds, outputDir);
  if (result.status === 'error') {
    throw new Error(result.error.message);
  }
  return result.data;
}

/**
 * 获取默认转换配置
 *
 * @returns 默认转换配置
 */
export async function getDefaultConvertConfig(): Promise<ConvertConfig> {
  return await commands.getDefaultConvertConfig();
}

/**
 * 保存转换配置
 *
 * @param videoQuality 视频质量（0=原始, 1=高质量, 2=标准）
 * @param audioBitrate 音频码率（0=原始, 1=192kbps, 2=128kbps）
 * @param embedCover 是否嵌入封面
 * @param danmakuFormat 弹幕导出格式（0=不导出, 1=XML, 2=ASS, 3=两者）
 * @param writeMetadata 是否写入元数据
 * @param lastOutputDir 上次使用的输出目录
 */
export async function saveConvertConfig(
  videoQuality: number,
  audioBitrate: number,
  embedCover: boolean = true,
  danmakuFormat: number = 0,
  writeMetadata: boolean = true,
  lastOutputDir: string | null = null,
): Promise<void> {
  const result = await commands.saveConvertConfig(
    videoQuality,
    audioBitrate,
    embedCover,
    danmakuFormat,
    writeMetadata,
    lastOutputDir,
  );
  if (result.status === 'error') {
    throw new Error(result.error.message);
  }
}

/**
 * 获取转换任务状态
 *
 * @param taskId 任务ID
 * @returns 任务视图，如果任务不存在则返回 null
 */
export async function getConvertTask(
  taskId: string,
): Promise<ConvertTaskView | null> {
  const result = await commands.getConvertTask(taskId);
  if (result.status === 'error') {
    throw new Error(result.error.message);
  }
  return result.data;
}

/**
 * 获取所有转换任务
 *
 * @returns 所有转换任务列表
 */
export async function getAllConvertTasks(): Promise<ConvertTaskView[]> {
  const result = await commands.getAllConvertTasks();
  if (result.status === 'error') {
    throw new Error(result.error.message);
  }
  return result.data;
}

/**
 * 删除已完成的转换任务
 *
 * @param taskId 任务ID
 */
export async function removeConvertTask(taskId: string): Promise<void> {
  const result = await commands.removeConvertTask(taskId);
  if (result.status === 'error') {
    throw new Error(result.error.message);
  }
}

/**
 * 监听转换进度更新（使用 Channel 事件流）
 *
 * @param taskId 任务ID
 * @param callback 进度更新回调函数
 * @returns 取消监听的函数
 */
export async function listenConvertProgress(
  taskId: string,
  callback: (progress: ConvertProgress) => void,
): Promise<() => void> {
  const channel = new Channel<ConvertProgress>();
  channel.onmessage = callback;

  const result = await commands.listenConvertProgress(taskId, channel);
  if (result.status === 'error') {
    throw new Error(result.error.message);
  }

  // 返回取消监听的函数
  return () => {
    // Channel 会在作用域结束时自动清理
  };
}

/**
 * 监听转换事件（全局事件）
 *
 * @param callback 事件回调函数
 * @returns 取消监听的函数
 */
export function onConvertEvent(
  callback: (event: ConvertEvent) => void,
): () => void {
  const unlisten = events.convertEvent.listen((e) => {
    callback(e.payload);
  });

  return () => {
    unlisten.then((fn) => fn());
  };
}

/**
 * 监听转换进度事件
 *
 * @param callback 进度回调函数
 * @returns 取消监听的函数
 */
export function onConvertProgress(
  callback: (taskId: string, progress: ConvertProgress) => void,
): () => void {
  return onConvertEvent((event) => {
    if (event.type === 'progress') {
      callback(event.task_id, event.progress);
    }
  });
}

/**
 * 监听转换完成事件
 *
 * @param callback 完成回调函数
 * @returns 取消监听的函数
 */
export function onConvertCompleted(
  callback: (taskId: string, outputPath: string) => void,
): () => void {
  return onConvertEvent((event) => {
    if (event.type === 'completed') {
      callback(event.task_id, event.output_path);
    }
  });
}

/**
 * 监听转换失败事件
 *
 * @param callback 失败回调函数
 * @returns 取消监听的函数
 */
export function onConvertFailed(
  callback: (taskId: string, error: string) => void,
): () => void {
  return onConvertEvent((event) => {
    if (event.type === 'failed') {
      callback(event.task_id, event.error);
    }
  });
}

/**
 * 监听转换取消事件
 *
 * @param callback 取消回调函数
 * @returns 取消监听的函数
 */
export function onConvertCancelled(
  callback: (taskId: string) => void,
): () => void {
  return onConvertEvent((event) => {
    if (event.type === 'cancelled') {
      callback(event.task_id);
    }
  });
}

/**
 * 判断转换阶段是否为终态
 */
export function isTerminalStage(stage: ConvertProgress['stage']): boolean {
  return stage === 'completed' || stage === 'failed' || stage === 'cancelled';
}

/**
 * 判断转换阶段是否可以暂停
 */
export function canPauseStage(stage: ConvertProgress['stage']): boolean {
  return (
    stage === 'preparing' ||
    stage === 'processing' ||
    stage === 'merging' ||
    stage === 'exportDanmaku' ||
    stage === 'addingMeta' ||
    stage === 'finalizing'
  );
}

/**
 * 判断转换阶段是否可以恢复
 */
export function canResumeStage(stage: ConvertProgress['stage']): boolean {
  return stage === 'paused';
}

/**
 * 判断转换阶段是否可以取消
 */
export function canCancelStage(stage: ConvertProgress['stage']): boolean {
  return !isTerminalStage(stage);
}

// ============================================================================
// 批量转换相关类型和函数
// ============================================================================

export type { BatchConvertResult, ConvertResult } from './backend';

/**
 * 监听批量转换结果事件
 *
 * @param callback 批量结果回调函数
 * @returns 取消监听的函数
 */
export function onConvertBatchResult(
  callback: (result: import('./backend').BatchConvertResult) => void,
): () => void {
  return onConvertEvent((event) => {
    if (event.type === 'batchResult') {
      callback(event.result);
    }
  });
}

/**
 * 批量暂停转换任务
 *
 * @param taskIds 任务ID列表
 * @returns 暂停结果（成功暂停的任务ID列表）
 */
export async function batchPauseConvert(taskIds: string[]): Promise<string[]> {
  const pausedIds: string[] = [];
  for (const taskId of taskIds) {
    try {
      await pauseConvert(taskId);
      pausedIds.push(taskId);
    } catch (error) {
      console.warn(`暂停任务 ${taskId} 失败:`, error);
    }
  }
  return pausedIds;
}

/**
 * 批量恢复转换任务
 *
 * @param taskIds 任务ID列表
 * @returns 恢复结果（成功恢复的任务ID列表）
 */
export async function batchResumeConvert(taskIds: string[]): Promise<string[]> {
  const resumedIds: string[] = [];
  for (const taskId of taskIds) {
    try {
      await resumeConvert(taskId);
      resumedIds.push(taskId);
    } catch (error) {
      console.warn(`恢复任务 ${taskId} 失败:`, error);
    }
  }
  return resumedIds;
}

/**
 * 批量取消转换任务
 *
 * @param taskIds 任务ID列表
 * @returns 取消结果（成功取消的任务ID列表）
 */
export async function batchCancelConvert(taskIds: string[]): Promise<string[]> {
  const cancelledIds: string[] = [];
  for (const taskId of taskIds) {
    try {
      await cancelConvert(taskId);
      cancelledIds.push(taskId);
    } catch (error) {
      console.warn(`取消任务 ${taskId} 失败:`, error);
    }
  }
  return cancelledIds;
}

/**
 * 计算批量转换进度汇总
 *
 * @param tasks 任务列表
 * @returns 进度汇总信息
 */
export function calculateBatchProgress(tasks: ConvertTaskView[]): {
  totalCount: number;
  completedCount: number;
  failedCount: number;
  cancelledCount: number;
  runningCount: number;
  pausedCount: number;
  overallPercentage: number;
} {
  const totalCount = tasks.length;
  const completedCount = tasks.filter(
    (t) => t.progress.stage === 'completed',
  ).length;
  const failedCount = tasks.filter((t) => t.progress.stage === 'failed').length;
  const cancelledCount = tasks.filter(
    (t) => t.progress.stage === 'cancelled',
  ).length;
  const pausedCount = tasks.filter((t) => t.progress.stage === 'paused').length;
  const runningCount =
    totalCount - completedCount - failedCount - cancelledCount - pausedCount;

  // 计算总体进度百分比
  const overallPercentage =
    totalCount > 0
      ? Math.round(
          tasks.reduce((sum, t) => sum + t.progress.percentage, 0) / totalCount,
        )
      : 0;

  return {
    totalCount,
    completedCount,
    failedCount,
    cancelledCount,
    runningCount,
    pausedCount,
    overallPercentage,
  };
}

/**
 * 格式化批量转换结果摘要
 *
 * @param result 批量转换结果
 * @returns 格式化的摘要字符串
 */
export function formatBatchResultSummary(
  result: import('./backend').BatchConvertResult,
): string {
  const { totalCount, successCount, failureCount, totalTime } = result;

  // 格式化耗时
  const hours = Math.floor(totalTime / 3600);
  const minutes = Math.floor((totalTime % 3600) / 60);
  const seconds = totalTime % 60;

  let timeStr = '';
  if (hours > 0) {
    timeStr = `${hours}小时${minutes}分${seconds}秒`;
  } else if (minutes > 0) {
    timeStr = `${minutes}分${seconds}秒`;
  } else {
    timeStr = `${seconds}秒`;
  }

  return `共 ${totalCount} 个任务，成功 ${successCount} 个，失败 ${failureCount} 个，耗时 ${timeStr}`;
}

// ============================================================================
// 后端批量命令封装
// ============================================================================

// 批量操作ID结果类型（与后端 BatchOperationIds 对应）
export interface BatchOperationIds {
  successIds: string[];
  failedIds: string[];
}

// 批量转换进度汇总类型（与后端 BatchConvertProgress 对应）
export interface BatchConvertProgressResult {
  totalCount: number;
  completedCount: number;
  failedCount: number;
  cancelledCount: number;
  pausedCount: number;
  runningCount: number;
  overallPercentage: number;
  tasks: ConvertTaskView[];
}

/**
 * 批量暂停转换任务（后端命令）
 *
 * @param taskIds 任务ID列表
 * @returns 操作结果
 */
export async function batchPauseConvertCommand(
  taskIds: string[],
): Promise<BatchOperationIds> {
  // 使用 invoke 直接调用后端命令
  const { invoke } = await import('@tauri-apps/api/core');
  return await invoke('batch_pause_convert', { taskIds });
}

/**
 * 批量恢复转换任务（后端命令）
 *
 * @param taskIds 任务ID列表
 * @returns 操作结果
 */
export async function batchResumeConvertCommand(
  taskIds: string[],
): Promise<BatchOperationIds> {
  const { invoke } = await import('@tauri-apps/api/core');
  return await invoke('batch_resume_convert', { taskIds });
}

/**
 * 批量取消转换任务（后端命令）
 *
 * @param taskIds 任务ID列表
 * @returns 操作结果
 */
export async function batchCancelConvertCommand(
  taskIds: string[],
): Promise<BatchOperationIds> {
  const { invoke } = await import('@tauri-apps/api/core');
  return await invoke('batch_cancel_convert', { taskIds });
}

/**
 * 获取批量转换进度汇总（后端命令）
 *
 * @param taskIds 任务ID列表
 * @returns 批量进度汇总
 */
export async function getBatchConvertProgress(
  taskIds: string[],
): Promise<BatchConvertProgressResult> {
  const { invoke } = await import('@tauri-apps/api/core');
  return await invoke('get_batch_convert_progress', { taskIds });
}


// ============================================================================
// 任务恢复功能
// ============================================================================

/**
 * 获取未完成的转换任务
 *
 * 在应用启动时调用，检测之前未完成的转换任务
 *
 * @returns 未完成的任务列表
 */
export async function getIncompleteConvertTasks(): Promise<ConvertTaskView[]> {
  const result = await commands.getIncompleteConvertTasks();
  if (result.status === 'error') {
    throw new Error(result.error.message);
  }
  return result.data;
}

/**
 * 恢复未完成的转换任务
 *
 * 重新执行之前中断的转换任务
 *
 * @param taskId 任务ID
 * @returns 输出文件路径
 */
export async function recoverConvertTask(taskId: string): Promise<string> {
  const result = await commands.recoverConvertTask(taskId);
  if (result.status === 'error') {
    throw new Error(result.error.message);
  }
  return result.data;
}

/**
 * 批量恢复未完成的转换任务
 *
 * @param taskIds 任务ID列表
 * @returns 批量转换结果
 */
export async function batchRecoverConvert(
  taskIds: string[],
): Promise<import('./backend').BatchConvertResult> {
  const result = await commands.batchRecoverConvert(taskIds);
  if (result.status === 'error') {
    throw new Error(result.error.message);
  }
  return result.data;
}

/**
 * 放弃未完成的转换任务
 *
 * 将未完成的任务标记为取消状态
 *
 * @param taskId 任务ID
 */
export async function abandonConvertTask(taskId: string): Promise<void> {
  const result = await commands.abandonConvertTask(taskId);
  if (result.status === 'error') {
    throw new Error(result.error.message);
  }
}

/**
 * 批量放弃未完成的转换任务
 *
 * @param taskIds 任务ID列表
 * @returns 成功放弃的任务数量
 */
export async function batchAbandonConvert(taskIds: string[]): Promise<number> {
  const result = await commands.batchAbandonConvert(taskIds);
  if (result.status === 'error') {
    throw new Error(result.error.message);
  }
  return result.data;
}

/**
 * 清理已完成的转换任务记录
 *
 * @param daysToKeep 保留最近 N 天的记录，undefined 表示清理所有已完成的任务
 * @returns 清理的任务数量
 */
export async function cleanupCompletedConvertTasks(
  daysToKeep?: number,
): Promise<number> {
  const result = await commands.cleanupCompletedConvertTasks(
    daysToKeep ?? null,
  );
  if (result.status === 'error') {
    throw new Error(result.error.message);
  }
  return result.data;
}

/**
 * 检查是否有未完成的转换任务
 *
 * @returns 是否有未完成的任务
 */
export async function hasIncompleteConvertTasks(): Promise<boolean> {
  const tasks = await getIncompleteConvertTasks();
  return tasks.length > 0;
}


// ============================================================================
// 临时文件清理功能
// ============================================================================

/**
 * 清理转换临时文件
 *
 * 清理所有残留的转换临时目录
 *
 * @returns [清理成功数量, 清理失败数量]
 */
export async function cleanupConvertTempFiles(): Promise<[number, number]> {
  const result = await commands.cleanupConvertTempFiles();
  if (result.status === 'error') {
    throw new Error(result.error.message);
  }
  return result.data;
}
