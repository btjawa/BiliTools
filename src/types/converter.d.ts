/**
 * 缓存转换功能相关的类型定义
 */

/**
 * 视频质量预设
 */
export type VideoQuality = 'original' | 'high' | 'standard';

/**
 * 音频码率预设
 */
export type AudioBitrate = 'original' | 'kbps192' | 'kbps128';

/**
 * 弹幕导出格式
 */
export type DanmakuFormat = 'none' | 'xml' | 'ass' | 'both';

/**
 * 转换配置
 */
export interface ConvertConfig {
  /** 视频质量预设 */
  videoQuality: VideoQuality;
  /** 音频码率 */
  audioBitrate: AudioBitrate;
  /** 是否嵌入封面 */
  embedCover: boolean;
  /** 弹幕导出格式 */
  danmakuFormat: DanmakuFormat;
  /** 是否写入元数据 */
  writeMetadata: boolean;
}

/**
 * 转换阶段
 */
export type ConvertStage =
  | 'preparing'
  | 'processing'
  | 'merging'
  | 'exportDanmaku'
  | 'addingMeta'
  | 'finalizing'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled';

/**
 * 转换进度
 */
export interface ConvertProgress {
  /** 当前阶段 */
  stage: ConvertStage;
  /** 进度百分比 (0-100) */
  percentage: number;
  /** 当前处理的文件名 */
  currentFile: string;
  /** 处理速度 */
  speed: string;
  /** 已处理字节数 */
  processedBytes: number;
  /** 总字节数 */
  totalBytes: number;
}

/**
 * 文件名冲突策略
 */
export type ConflictStrategy = 'autoRename' | 'overwrite' | 'skip';

/**
 * 磁盘空间检查结果
 */
export interface DiskSpaceCheck {
  /** 预估所需空间（字节） */
  requiredSpace: number;
  /** 可用空间（字节） */
  availableSpace: number;
  /** 空间是否充足 */
  isSufficient: boolean;
}

/**
 * 转换任务视图
 */
export interface ConvertTaskView {
  /** 任务ID */
  id: string;
  /** 缓存记录ID */
  cacheId: string;
  /** 缓存路径 */
  cachePath: string;
  /** 输出目录 */
  outputDir: string;
  /** 输出文件路径（转换完成后设置） */
  outputPath?: string;
  /** 转换配置 */
  config: ConvertConfig;
  /** 当前进度 */
  progress: ConvertProgress;
  /** 错误信息 */
  errorMessage?: string;
  /** 视频标题 */
  title: string;
  /** 创建时间戳 */
  createdAt: number;
  /** 更新时间戳 */
  updatedAt: number;
  /** 完成时间戳 */
  completedAt?: number;
}

/**
 * 单个转换结果
 */
export interface ConvertResult {
  /** 任务ID */
  taskId: string;
  /** 缓存ID */
  cacheId: string;
  /** 是否成功 */
  success: boolean;
  /** 输出文件路径 */
  outputPath?: string;
  /** 错误信息 */
  error?: string;
}

/**
 * 批量转换结果
 */
export interface BatchConvertResult {
  /** 总任务数 */
  totalCount: number;
  /** 成功数量 */
  successCount: number;
  /** 失败数量 */
  failureCount: number;
  /** 总耗时（秒） */
  totalTime: number;
  /** 各任务结果 */
  results: ConvertResult[];
}

/**
 * 转换进度事件
 */
export interface ConvertProgressEvent {
  type: 'progress';
  taskId: string;
  progress: ConvertProgress;
}

/**
 * 转换完成事件
 */
export interface ConvertCompletedEvent {
  type: 'completed';
  taskId: string;
  outputPath: string;
}

/**
 * 转换失败事件
 */
export interface ConvertFailedEvent {
  type: 'failed';
  taskId: string;
  error: string;
}

/**
 * 转换取消事件
 */
export interface ConvertCancelledEvent {
  type: 'cancelled';
  taskId: string;
}

/**
 * 批量转换结果事件
 */
export interface ConvertBatchResultEvent {
  type: 'batchResult';
  result: BatchConvertResult;
}

/**
 * 转换事件联合类型
 */
export type ConvertEvent =
  | ConvertProgressEvent
  | ConvertCompletedEvent
  | ConvertFailedEvent
  | ConvertCancelledEvent
  | ConvertBatchResultEvent;

/**
 * 转换设置（持久化配置）
 */
export interface ConvertSettings {
  /** 默认视频质量 */
  defaultVideoQuality: VideoQuality;
  /** 默认音频码率 */
  defaultAudioBitrate: AudioBitrate;
  /** 是否默认嵌入封面 */
  defaultEmbedCover: boolean;
  /** 默认弹幕导出格式 */
  defaultDanmakuFormat: DanmakuFormat;
  /** 是否默认写入元数据 */
  defaultWriteMetadata: boolean;
  /** 上次使用的输出目录 */
  lastOutputDir?: string;
}

/**
 * 获取默认转换配置
 */
export function getDefaultConvertConfig(): ConvertConfig {
  return {
    videoQuality: 'original',
    audioBitrate: 'original',
    embedCover: true,
    danmakuFormat: 'none',
    writeMetadata: true,
  };
}

/**
 * 判断转换阶段是否为终态
 */
export function isTerminalStage(stage: ConvertStage): boolean {
  return stage === 'completed' || stage === 'failed' || stage === 'cancelled';
}

/**
 * 判断转换阶段是否可以暂停
 */
export function canPauseStage(stage: ConvertStage): boolean {
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
export function canResumeStage(stage: ConvertStage): boolean {
  return stage === 'paused';
}

/**
 * 判断转换阶段是否可以取消
 */
export function canCancelStage(stage: ConvertStage): boolean {
  return !isTerminalStage(stage);
}

/**
 * 获取转换阶段的显示名称
 */
export function getStageDisplayName(stage: ConvertStage): string {
  const names: Record<ConvertStage, string> = {
    preparing: '准备中',
    processing: '处理m4s文件',
    merging: '合并音视频',
    exportDanmaku: '导出弹幕',
    addingMeta: '添加元数据',
    finalizing: '完成中',
    completed: '已完成',
    failed: '失败',
    paused: '已暂停',
    cancelled: '已取消',
  };
  return names[stage];
}
