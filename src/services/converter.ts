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
 */
export async function saveConvertConfig(
  videoQuality: number,
  audioBitrate: number,
): Promise<void> {
  const result = await commands.saveConvertConfig(videoQuality, audioBitrate);
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
export function isTerminalStage(
  stage: ConvertProgress['stage'],
): boolean {
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
