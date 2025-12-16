/**
 * 类型转换工具函数
 * 统一的类型转换逻辑，避免重复代码
 */

import { TIME_CONVERSION } from '@/constants';
import type * as Types from '@/types/cache.d';

/**
 * 安全的时间戳转换为Date对象
 * @param timestamp 时间戳（秒或毫秒）
 * @returns Date对象
 */
export function safeTimestampToDate(timestamp: number): Date {
  // 处理无效值（包括 0 时间戳）
  if (!timestamp || timestamp <= 0) {
    console.warn(`无效时间戳: ${timestamp}, 使用当前时间`);
    return new Date();
  }

  // 判断是否为毫秒时间戳（大于 10^10 的认为是毫秒）
  const isMilliseconds = timestamp > TIME_CONVERSION.MILLISECOND_TIMESTAMP_THRESHOLD;
  const date = new Date(isMilliseconds ? timestamp : timestamp * TIME_CONVERSION.MS_TO_SECONDS);

  // 验证转换结果的合理性
  const year = date.getFullYear();
  if (year < 1970 || year > 2100) {
    console.warn(`异常时间戳: ${timestamp}, 转换结果: ${date.toISOString()}`);
    return new Date();
  }

  return date;
}

/**
 * 转换缓存记录原始数据为前端使用的格式
 * @param record 后端原始缓存记录
 * @returns 前端缓存项格式
 */
export function transformCacheRecord(record: Types.CacheRecordRaw): Types.CacheItem {
  return {
    id: record.id,
    bvid: record.bvid,
    aid: record.aid,
    cid: record.cid,
    title: record.title,
    uname: record.uname,
    coverUrl: record.cover_url,
    duration: record.duration,
    fileSize: record.file_size,
    cachePath: record.cache_path,
    downloadTime: safeTimestampToDate(record.download_time),
    importTime: safeTimestampToDate(record.import_time),
    status: record.status as Types.CacheStatus,
    groupId: record.group_id,
    groupTitle: record.group_title,
    p: record.p || 1,
  };
}

/**
 * 转换缓存组原始数据为前端使用的格式
 * @param group 后端原始缓存组
 * @returns 前端缓存组格式
 */
export function transformCacheGroup(group: Types.CacheGroupRaw): Types.CacheGroup {
  return {
    groupId: group.group_id,
    title: group.title,
    coverUrl: group.cover_url,
    uname: group.uname,
    videoCount: group.video_count,
    totalDuration: group.total_duration,
    totalFileSize: group.total_file_size,
    latestDownloadTime: safeTimestampToDate(group.latest_download_time),
    videos: group.videos.map(transformCacheRecord),
    isExpanded: group.is_expanded,
  };
}

/**
 * 转换显示项原始数据为前端使用的格式
 * @param item 后端原始显示项
 * @returns 前端显示项格式
 */
export function transformDisplayItem(item: Types.DisplayItemRaw): Types.DisplayItem {
  if (item.type === 'single_video') {
    return {
      type: 'video',
      data: transformCacheRecord(item.video),
    };
  } else {
    return {
      type: 'group',
      data: transformCacheGroup(item.group),
    };
  }
}

/**
 * 转换缓存统计原始数据为前端使用的格式
 * @param stats 后端原始统计数据
 * @returns 前端统计数据格式
 */
export function transformCacheStatistics(stats: Types.CacheStatisticsRaw): Types.CacheStatistics {
  return {
    totalCount: stats.total_count,
    availableCount: stats.available_count,
    unavailableCount: stats.unavailable_count || 0,
    incompleteCount: stats.incomplete_count || 0,
    totalSize: stats.total_size,
    averageSize: stats.average_size,
    totalDuration: stats.total_duration,
    groupCount: stats.group_count,
    singleVideoCount: stats.single_video_count,
    averageVideosPerGroup: stats.average_videos_per_group,
  };
}