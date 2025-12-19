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
 * @param precision 可选的精度设置，默认使用常量配置
 * @returns 格式化后的文件大小字符串 (如: "1.23 MB")
 */
export function formatFileSize(bytes: number, precision?: number): string {
  if (bytes === 0) return FILE_SIZE.ZERO_DISPLAY;
  if (bytes < 0) return FILE_SIZE.ZERO_DISPLAY; // 处理负数边界情况

  const k = FILE_SIZE.BYTES_PER_KB;
  const sizes = FILE_SIZE.UNITS;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // 确保索引不超出数组范围
  const sizeIndex = Math.min(i, sizes.length - 1);
  const value = bytes / Math.pow(k, sizeIndex);

  // 根据大小调整精度，支持自定义精度
  const finalPrecision =
    precision !== undefined
      ? precision
      : sizeIndex === 0
        ? 0
        : FILE_SIZE.DECIMAL_PLACES;

  // 对于小数值，避免显示不必要的小数位
  const formattedValue =
    sizeIndex === 0 || value >= 100
      ? Math.round(value).toString()
      : parseFloat(value.toFixed(finalPrecision)).toString();

  return formattedValue + ' ' + sizes[sizeIndex];
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
 * @param precision 可选的精度设置
 * @returns 格式化后的速度字符串 (如: "1.23 MB/s")
 */
export function formatSpeed(
  bytesPerSecond: number,
  precision?: number,
): string {
  if (bytesPerSecond <= 0) return '0 B/s';
  return formatFileSize(bytesPerSecond, precision) + '/s';
}

/**
 * 格式化持续时间（秒转为时:分:秒格式）
 *
 * @param seconds 秒数
 * @returns 格式化后的时间字符串 (如: "1:23:45" 或 "23:45")
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) return TIME_FORMAT.ZERO_DISPLAY;

  const hours = Math.floor(
    seconds /
      (TIME_CONVERSION.SECONDS_TO_MINUTES * TIME_CONVERSION.MINUTES_TO_HOURS),
  );
  const minutes = Math.floor(
    (seconds %
      (TIME_CONVERSION.SECONDS_TO_MINUTES * TIME_CONVERSION.MINUTES_TO_HOURS)) /
      TIME_CONVERSION.SECONDS_TO_MINUTES,
  );
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
  return formatDuration(
    Math.floor(milliseconds / TIME_CONVERSION.MS_TO_SECONDS),
  );
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
  } else if (
    seconds <
    TIME_CONVERSION.SECONDS_TO_MINUTES * TIME_CONVERSION.MINUTES_TO_HOURS
  ) {
    const minutes = Math.floor(seconds / TIME_CONVERSION.SECONDS_TO_MINUTES);
    const remainingSeconds = Math.round(
      seconds % TIME_CONVERSION.SECONDS_TO_MINUTES,
    );
    return remainingSeconds > 0
      ? `${minutes}${TIME_FORMAT.UNITS.MINUTES}${remainingSeconds}${TIME_FORMAT.UNITS.SECONDS}`
      : `${minutes}${TIME_FORMAT.UNITS.MINUTES}`;
  } else {
    const hours = Math.floor(
      seconds /
        (TIME_CONVERSION.SECONDS_TO_MINUTES * TIME_CONVERSION.MINUTES_TO_HOURS),
    );
    const minutes = Math.floor(
      (seconds %
        (TIME_CONVERSION.SECONDS_TO_MINUTES *
          TIME_CONVERSION.MINUTES_TO_HOURS)) /
        TIME_CONVERSION.SECONDS_TO_MINUTES,
    );
    return minutes > 0
      ? `${hours}${TIME_FORMAT.UNITS.HOURS}${minutes}${TIME_FORMAT.UNITS.MINUTES}`
      : `${hours}${TIME_FORMAT.UNITS.HOURS}`;
  }
}

/**
 * 格式化时间（更通用的版本，支持天数）
 *
 * @param seconds 秒数
 * @param showSeconds 是否显示秒数，默认为true
 * @returns 格式化后的时间字符串
 */
export function formatTime(
  seconds: number,
  showSeconds: boolean = true,
): string {
  if (seconds < 0 || !isFinite(seconds)) return TIME_FORMAT.ZERO_SECONDS;
  if (seconds === 0) return TIME_FORMAT.ZERO_SECONDS;

  const secondsPerDay =
    TIME_CONVERSION.SECONDS_TO_MINUTES *
    TIME_CONVERSION.MINUTES_TO_HOURS *
    TIME_CONVERSION.HOURS_TO_DAYS;
  const secondsPerHour =
    TIME_CONVERSION.SECONDS_TO_MINUTES * TIME_CONVERSION.MINUTES_TO_HOURS;

  const days = Math.floor(seconds / secondsPerDay);
  const hours = Math.floor((seconds % secondsPerDay) / secondsPerHour);
  const minutes = Math.floor(
    (seconds % secondsPerHour) / TIME_CONVERSION.SECONDS_TO_MINUTES,
  );
  const secs = Math.round(seconds % TIME_CONVERSION.SECONDS_TO_MINUTES);

  if (days > 0) {
    return hours > 0
      ? `${days}天${hours}${TIME_FORMAT.UNITS.HOURS}`
      : `${days}天`;
  } else if (hours > 0) {
    return minutes > 0
      ? `${hours}${TIME_FORMAT.UNITS.HOURS}${minutes}${TIME_FORMAT.UNITS.MINUTES}`
      : `${hours}${TIME_FORMAT.UNITS.HOURS}`;
  } else if (minutes > 0) {
    if (showSeconds && secs > 0) {
      return `${minutes}${TIME_FORMAT.UNITS.MINUTES}${secs}${TIME_FORMAT.UNITS.SECONDS}`;
    } else {
      return `${minutes}${TIME_FORMAT.UNITS.MINUTES}`;
    }
  } else {
    return showSeconds ? `${secs}${TIME_FORMAT.UNITS.SECONDS}` : '不到1分钟';
  }
}

/**
 * 格式化文件计数进度
 * 将已完成文件数和总文件数格式化为进度显示
 *
 * @param completed 已完成文件数
 * @param total 总文件数
 * @returns 格式化后的文件计数字符串 (如: "3/10")
 */
export function formatFileCount(completed: number, total: number): string {
  const completedCount = Math.max(0, Math.floor(completed));
  const totalCount = Math.max(1, Math.floor(total));
  return `${completedCount}/${totalCount}`;
}

/**
 * 格式化大小进度
 * 将已传输大小和总大小格式化为进度显示
 *
 * @param transferred 已传输大小（字节）
 * @param total 总大小（字节）
 * @param precision 可选的精度设置
 * @returns 格式化后的大小进度字符串 (如: "1.2 GB/3.5 GB")
 */
export function formatSizeProgress(
  transferred: number,
  total: number,
  precision?: number,
): string {
  const transferredSize = Math.max(0, transferred);
  const totalSize = Math.max(0, total);

  if (totalSize === 0) {
    return `${formatFileSize(transferredSize, precision)}/0 B`;
  }

  return `${formatFileSize(transferredSize, precision)}/${formatFileSize(totalSize, precision)}`;
}

/**
 * 格式化百分比
 * 将数值转换为百分比显示
 *
 * @param value 数值（0-1之间）
 * @param precision 小数位数，默认为1
 * @returns 格式化后的百分比字符串 (如: "85.5%")
 */
export function formatPercentage(value: number, precision: number = 1): string {
  if (value < 0) return '0%';
  if (value > 1) return '100%';

  const percentage = value * 100;
  return `${percentage.toFixed(precision)}%`;
}

/**
 * 格式化剩余时间（专用于传输进度）
 * 针对传输场景优化的时间格式化
 *
 * @param seconds 剩余秒数
 * @returns 格式化后的剩余时间字符串
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return '计算中...';

  // 对于很大的时间值，显示为"超过X小时"
  const maxDisplayHours = 24;
  const maxDisplaySeconds = maxDisplayHours * 3600;

  if (seconds > maxDisplaySeconds) {
    const days = Math.floor(seconds / (24 * 3600));
    return `超过${days}天`;
  }

  // 使用不显示秒数的格式，让显示更简洁
  return formatTime(seconds, false);
}
