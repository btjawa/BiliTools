/**
 * 统一的格式化工具库
 * 提供文件大小、时间、速度等格式化功能
 * 消除项目中重复的格式化函数实现
 */

import { FILE_SIZE, TIME_CONVERSION, TIME_FORMAT } from '@/constants';

/**
 * 格式化文件大小
 * 将字节数转换为人类可读的文件大小格式
 * 
 * @param bytes 字节数
 * @returns 格式化后的文件大小字符串 (如: "1.23 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return FILE_SIZE.ZERO_DISPLAY;
  if (bytes < 0) return FILE_SIZE.ZERO_DISPLAY; // 处理负数边界情况
  
  const k = FILE_SIZE.BYTES_PER_KB;
  const sizes = FILE_SIZE.UNITS;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  // 确保索引不超出数组范围
  const sizeIndex = Math.min(i, sizes.length - 1);
  const value = bytes / Math.pow(k, sizeIndex);
  
  // 根据大小调整精度
  const precision = sizeIndex === 0 ? 0 : FILE_SIZE.DECIMAL_PLACES;
  return parseFloat(value.toFixed(precision)) + ' ' + sizes[sizeIndex];
}

/**
 * 向后兼容的别名函数
 * 保持与现有代码的兼容性
 * 
 * @param bytes 字节数
 * @returns 格式化后的文件大小字符串
 */
export const formatBytes = formatFileSize;

/**
 * 格式化传输速度
 * 将每秒字节数转换为可读的速度格式
 * 
 * @param bytesPerSecond 每秒字节数
 * @returns 格式化后的速度字符串 (如: "1.23 MB/s")
 */
export function formatSpeed(bytesPerSecond: number): string {
  return formatFileSize(bytesPerSecond) + '/s';
}

/**
 * 格式化持续时间（秒转为时:分:秒格式）
 * 
 * @param seconds 秒数
 * @returns 格式化后的时间字符串 (如: "1:23:45" 或 "23:45")
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) return TIME_FORMAT.ZERO_DISPLAY;
  
  const hours = Math.floor(seconds / (TIME_CONVERSION.SECONDS_TO_MINUTES * TIME_CONVERSION.MINUTES_TO_HOURS));
  const minutes = Math.floor((seconds % (TIME_CONVERSION.SECONDS_TO_MINUTES * TIME_CONVERSION.MINUTES_TO_HOURS)) / TIME_CONVERSION.SECONDS_TO_MINUTES);
  const secs = Math.floor(seconds % TIME_CONVERSION.SECONDS_TO_MINUTES);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * 格式化持续时间（毫秒转为可读格式）
 * 
 * @param milliseconds 毫秒数
 * @returns 格式化后的时间字符串
 */
export function formatDurationMs(milliseconds: number): string {
  return formatDuration(Math.floor(milliseconds / TIME_CONVERSION.MS_TO_SECONDS));
}

/**
 * 格式化时间（秒转为中文可读格式）
 * 简单版本，不依赖i18n，直接使用中文
 * 
 * @param seconds 秒数
 * @returns 格式化后的时间字符串 (如: "1小时23分", "45秒")
 */
export function formatTimeSimple(seconds: number): string {
  if (seconds < 0) return TIME_FORMAT.ZERO_SECONDS;
  
  if (seconds < TIME_CONVERSION.SECONDS_TO_MINUTES) {
    return `${Math.round(seconds)}${TIME_FORMAT.UNITS.SECONDS}`;
  } else if (seconds < TIME_CONVERSION.SECONDS_TO_MINUTES * TIME_CONVERSION.MINUTES_TO_HOURS) {
    const minutes = Math.floor(seconds / TIME_CONVERSION.SECONDS_TO_MINUTES);
    const remainingSeconds = Math.round(seconds % TIME_CONVERSION.SECONDS_TO_MINUTES);
    return remainingSeconds > 0 ? `${minutes}${TIME_FORMAT.UNITS.MINUTES}${remainingSeconds}${TIME_FORMAT.UNITS.SECONDS}` : `${minutes}${TIME_FORMAT.UNITS.MINUTES}`;
  } else {
    const hours = Math.floor(seconds / (TIME_CONVERSION.SECONDS_TO_MINUTES * TIME_CONVERSION.MINUTES_TO_HOURS));
    const minutes = Math.floor((seconds % (TIME_CONVERSION.SECONDS_TO_MINUTES * TIME_CONVERSION.MINUTES_TO_HOURS)) / TIME_CONVERSION.SECONDS_TO_MINUTES);
    return minutes > 0 ? `${hours}${TIME_FORMAT.UNITS.HOURS}${minutes}${TIME_FORMAT.UNITS.MINUTES}` : `${hours}${TIME_FORMAT.UNITS.HOURS}`;
  }
}

/**
 * 格式化时间（更通用的版本，支持天数）
 * 
 * @param seconds 秒数
 * @returns 格式化后的时间字符串
 */
export function formatTime(seconds: number): string {
  if (seconds < 0) return TIME_FORMAT.ZERO_SECONDS;
  
  const secondsPerDay = TIME_CONVERSION.SECONDS_TO_MINUTES * TIME_CONVERSION.MINUTES_TO_HOURS * TIME_CONVERSION.HOURS_TO_DAYS;
  const secondsPerHour = TIME_CONVERSION.SECONDS_TO_MINUTES * TIME_CONVERSION.MINUTES_TO_HOURS;
  
  const days = Math.floor(seconds / secondsPerDay);
  const hours = Math.floor((seconds % secondsPerDay) / secondsPerHour);
  const minutes = Math.floor((seconds % secondsPerHour) / TIME_CONVERSION.SECONDS_TO_MINUTES);
  const secs = Math.round(seconds % TIME_CONVERSION.SECONDS_TO_MINUTES);
  
  if (days > 0) {
    return `${days}天${hours}${TIME_FORMAT.UNITS.HOURS}`;
  } else if (hours > 0) {
    return minutes > 0 ? `${hours}${TIME_FORMAT.UNITS.HOURS}${minutes}${TIME_FORMAT.UNITS.MINUTES}` : `${hours}${TIME_FORMAT.UNITS.HOURS}`;
  } else if (minutes > 0) {
    return secs > 0 ? `${minutes}${TIME_FORMAT.UNITS.MINUTES}${secs}${TIME_FORMAT.UNITS.SECONDS}` : `${minutes}${TIME_FORMAT.UNITS.MINUTES}`;
  } else {
    return `${secs}${TIME_FORMAT.UNITS.SECONDS}`;
  }
}