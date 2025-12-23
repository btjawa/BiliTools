/**
 * B站缓存导入和管理服务
 *
 * 提供缓存导入、管理和操作的前端API封装
 * 复用现有的commands模式和错误处理机制
 */

import { Channel, invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { AppError } from './error';
import * as backend from './backend';
import type { ImportProgress as BackendImportProgress } from './backend';
import * as Types from '@/types/cache.d';
import { transformCacheRecord } from '@/utils/transform';

// ============================================================================
// 缓存导入服务类
// ============================================================================

/**
 * 缓存导入服务
 * 负责处理B站缓存文件的导入操作
 */
export class CacheImportService {
  /**
   * 选择缓存根目录
   * 使用系统文件选择对话框让用户选择B站缓存根目录
   *
   * @returns 选择的目录路径，如果用户取消则返回null
   */
  async selectCacheDirectory(): Promise<string | null> {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择B站缓存根目录',
        defaultPath:
          'C:\\Users\\%USERNAME%\\AppData\\Local\\BilibiliDownload\\data',
      });

      return Array.isArray(selected) ? selected[0] : selected;
    } catch {
      throw new AppError('选择目录失败');
    }
  }

  /**
   * 扫描缓存目录
   * 扫描指定目录下的所有缓存文件，返回扫描结果
   *
   * @param path 缓存根目录路径
   * @returns 扫描结果，包含发现的缓存目录信息
   */
  async scanCacheDirectory(path: string): Promise<Types.ScanResult> {
    try {
      const result = (await invoke('scan_cache_directory', {
        path,
      })) as Types.ScanResultRaw;

      // 转换后端数据格式为前端类型
      return {
        rootPath: result.root_path,
        totalDirectories: result.total_directories,
        validDirectories: result.valid_directories,
        invalidDirectories: result.invalid_directories,
        estimatedTotalSize: result.estimated_total_size,
        scanDuration: result.scan_duration,
        directories: result.directories.map((dir: Types.DirectoryInfoRaw) => ({
          path: dir.path,
          isValid: dir.is_valid,
          invalidReason: dir.invalid_reason,
          preview: dir.preview
            ? {
                title: dir.preview.title,
                uname: dir.preview.uname,
                bvid: dir.preview.bvid,
                fileSize: dir.preview.file_size,
                duration: dir.preview.duration,
              }
            : undefined,
        })),
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('扫描缓存目录失败');
    }
  }

  /**
   * 开始导入操作
   * 启动缓存文件导入流程
   *
   * @param path 缓存根目录路径
   * @param options 导入选项配置
   * @returns 导入操作ID
   */
  async startImport(
    path: string,
    options: Types.ImportOptions,
  ): Promise<string> {
    try {
      // 转换前端类型为后端类型
      const backendOptions = {
        duplicate_handling:
          options.duplicateHandling === 'skip'
            ? 'Skip'
            : options.duplicateHandling === 'overwrite'
              ? 'Overwrite'
              : 'Ask',
        verify_integrity: true,
        delete_after_import: false,
        create_playlist: false,
        max_concurrency: options.maxConcurrency,
      };

      const importId = (await invoke('import_cache_directory', {
        path,
        options: backendOptions,
      })) as string;
      return importId;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `启动导入失败: ${(error as Error)?.message || '未知错误'}`,
      );
    }
  }

  /**
   * 取消导入操作
   * 取消正在进行的导入操作
   *
   * @param importId 导入操作ID
   */
  async cancelImport(importId: string): Promise<void> {
    try {
      await invoke('cancel_import', { importId: importId });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('取消导入失败');
    }
  }

  /**
   * 监听导入进度
   * 创建Channel监听导入进度更新
   *
   * @param importId 导入操作ID
   * @param onProgress 进度更新回调函数
   * @returns 取消监听的函数
   */
  async listenImportProgress(
    importId: string,
    onProgress: (progress: BackendImportProgress) => void,
  ): Promise<() => void> {
    try {
      const channel = new Channel<BackendImportProgress>();
      let isCancelled = false;

      // 监听进度更新
      channel.onmessage = (progress) => {
        if (!isCancelled) {
          onProgress(progress);
        }
      };

      // 启动进度监听
      await invoke('get_import_progress', {
        importId: importId,
        event: channel,
      });

      // 返回取消监听的函数
      return () => {
        isCancelled = true;
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `监听导入进度失败: ${(error as Error)?.message || '未知错误'}`,
      );
    }
  }
}

// ============================================================================
// 缓存管理服务类
// ============================================================================

/**
 * 缓存管理服务
 * 负责已导入缓存文件的管理和操作
 */
export class CacheManagementService {
  /**
   * 删除缓存项
   * 同时删除数据库记录和本地文件
   *
   * @param id 缓存项ID
   */
  async deleteCacheItem(id: string): Promise<void> {
    try {
      await invoke('delete_cache_item', { id });
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('删除缓存项详细错误:', error);
      throw new AppError(
        `删除缓存项失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 批量删除缓存项
   * 调用后端批量删除命令，支持组和单个视频
   *
   * @param ids 缓存项ID列表
   * @param types 对应的项目类型列表 ('video' | 'group')
   * @returns 批量操作结果
   */
  async batchDeleteCacheItems(
    ids: string[],
    types: ('video' | 'group')[],
  ): Promise<Types.BatchDeleteResult> {
    try {
      const result = (await invoke('batch_delete_cache_items', {
        itemIds: ids,
        itemTypes: types,
      })) as Types.BatchDeleteResultRaw;

      return {
        successCount: result.success_count,
        deletedVideos: result.deleted_videos,
        deletedGroups: result.deleted_groups,
        errorCount: result.error_count,
        errors: result.errors,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `批量删除失败: ${error instanceof Error ? error.message : '未知错误'}`,
      );
    }
  }

  /**
   * 播放缓存文件
   * 使用系统默认播放器播放缓存视频
   * 注意：此功能需要后端实现 play_cache_item 命令
   *
   * @param item 缓存项信息
   */
  async playCacheItem(item: Types.CacheItem): Promise<void> {
    // TODO: 等待后端实现 play_cache_item 命令
    // 目前使用打开文件夹的方式作为替代
    await this.openCacheFolder(item);
  }

  /**
   * 打开缓存文件所在文件夹
   * 在文件管理器中打开缓存文件所在的文件夹
   *
   * @param item 缓存项信息
   */
  async openCacheFolder(item: Types.CacheItem): Promise<void> {
    try {
      await invoke('open_cache_folder', { cachePath: item.cachePath });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('打开文件夹失败');
    }
  }

  /**
   * 刷新缓存项状态
   * 重新检查缓存文件的可用性状态
   * 注意：此功能需要后端实现 refresh_cache_item_status 命令
   *
   * @param id 缓存项ID
   * @returns 更新后的缓存项信息
   */
  async refreshCacheItemStatus(id: string): Promise<Types.CacheItem> {
    // TODO: 等待后端实现 refresh_cache_item_status 命令
    // 目前通过重新加载显示项的方式实现
    const rawItems = (await invoke(
      'get_cache_display_items',
    )) as Types.DisplayItemRaw[];

    // 在单独视频和合集视频中查找
    for (const item of rawItems) {
      if (item.type === 'single_video' && item.video?.id === id) {
        return transformCacheRecord(item.video);
      } else if (item.type === 'video_group' && item.group) {
        const video = item.group.videos.find((v) => v.id === id);
        if (video) {
          return transformCacheRecord(video);
        }
      }
    }

    throw new AppError('缓存项不存在');
  }

  /**
   * 清理无效缓存
   * 扫描并清理所有不可用的缓存记录
   * 注意：此功能需要后端实现 clean_invalid_cache 命令
   *
   * @returns 清理的缓存数量
   */
  async cleanInvalidCache(): Promise<number> {
    try {
      const result = await invoke('cleanup_invalid_cache_records');
      return result as number;
    } catch (error) {
      console.error('清理无效缓存记录失败:', error);
      throw error;
    }
  }

  /**
   * 增量扫描缓存根目录
   * 检测新增或删除的视频，自动导入新视频并清理已删除的记录
   *
   * @returns 增量扫描结果
   */
  async incrementalScanCacheRoot(): Promise<Types.IncrementalScanResult> {
    try {
      const result = (await invoke(
        'incremental_scan_cache_root',
      )) as Types.IncrementalScanResultRaw;

      // 转换后端数据格式为前端类型
      return {
        scannedRoot: result.scanned_root,
        newDirectoriesCount: result.new_directories_count,
        deletedDirectoriesCount: result.deleted_directories_count,
        importedCount: result.imported_count,
        cleanedCount: result.cleaned_count,
        newDirectories: result.new_directories,
        deletedDirectories: result.deleted_directories,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `增量扫描失败: ${(error as Error)?.message || '未知错误'}`,
      );
    }
  }

  /**
   * 获取缓存统计信息
   * 获取缓存文件的统计数据
   *
   * @returns 缓存统计信息
   */
  async getCacheStatistics(): Promise<Types.CacheStatistics> {
    try {
      const result = (await invoke(
        'get_cache_stats',
      )) as Types.CacheStatisticsRaw;

      // 转换后端数据格式为前端类型
      return {
        totalCount: result.total_count,
        availableCount: result.available_count,
        unavailableCount: result.total_count - result.available_count,
        incompleteCount: 0, // 后端暂未提供此数据
        totalSize: result.total_size,
        averageSize:
          result.total_count > 0 ? result.total_size / result.total_count : 0,
        totalDuration: 0, // 后端暂未提供此数据
        // 组相关统计（暂时使用默认值，后续任务会实现）
        groupCount: result.group_count || 0,
        singleVideoCount: result.single_video_count || result.total_count,
        averageVideosPerGroup: result.average_videos_per_group || 0,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('获取缓存统计失败');
    }
  }

  /**
   * 检查本地封面文件
   * 检查指定缓存目录是否存在封面文件
   *
   * @param cachePath 缓存目录路径
   * @returns 本地封面文件路径，如果不存在则返回null
   */
  async checkLocalCover(cachePath: string): Promise<string | null> {
    try {
      const result = (await invoke('check_local_cover', { cachePath })) as
        | string
        | null;
      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('检查本地封面失败');
    }
  }

  /**
   * 导出缓存列表
   * 将缓存列表导出为JSON文件
   * 注意：此功能需要后端实现 export_cache_list 命令
   *
   * @param filter 筛选条件（可选）
   * @returns 导出的文件路径
   */
  async exportCacheList(filter?: Types.CacheFilter): Promise<string> {
    // TODO: 等待后端实现 export_cache_list 命令
    // 目前通过前端实现导出功能
    const rawItems = (await invoke(
      'get_cache_display_items',
    )) as Types.DisplayItemRaw[];

    // 提取所有视频项（包括单独视频和合集内的视频）
    const videoItems = rawItems.flatMap((item) => {
      if (item.type === 'single_video' && item.video) {
        return [transformCacheRecord(item.video)];
      } else if (item.type === 'video_group' && item.group) {
        return item.group.videos.map((video) => transformCacheRecord(video));
      }
      return [];
    });

    // 应用筛选条件（如果提供）
    const items = filter
      ? videoItems.filter((item) => {
          if (
            filter.status &&
            filter.status.length > 0 &&
            !filter.status.includes(item.status)
          ) {
            return false;
          }
          return true;
        })
      : videoItems;

    // 使用现有的 exportData 命令
    const exportData = {
      exportTime: new Date().toISOString(),
      totalCount: items.length,
      items: items.map((item) => ({
        id: item.id,
        bvid: item.bvid,
        aid: item.aid,
        cid: item.cid,
        title: item.title,
        uname: item.uname,
        coverUrl: item.coverUrl,
        duration: item.duration,
        fileSize: item.fileSize,
        cachePath: item.cachePath,
        downloadTime: item.downloadTime.toISOString(),
        importTime: item.importTime.toISOString(),
        // completionTime 使用 downloadTime 代替
        completionTime: item.downloadTime.toISOString(),
        status: item.status,
      })),
    };

    // 选择保存位置
    const savePath = await open({
      directory: false,
      multiple: false,
      title: '导出缓存列表',
      defaultPath: `cache_list_${new Date().toISOString().split('T')[0]}.json`,
      filters: [
        {
          name: 'JSON文件',
          extensions: ['json'],
        },
      ],
    });

    if (!savePath || Array.isArray(savePath)) {
      throw new AppError('未选择保存位置');
    }

    const result = await backend.commands.exportData(savePath, exportData);
    if (result.status === 'error') {
      throw new AppError(result.error.message);
    }

    return savePath;
  }
}

// ============================================================================
// 服务实例导出
// ============================================================================

/**
 * 缓存导入服务实例
 */
export const cacheImportService = new CacheImportService();

/**
 * 缓存管理服务实例
 */
export const cacheManagementService = new CacheManagementService();

// ============================================================================
// 便捷函数导出
// ============================================================================

/**
 * 选择并扫描缓存目录
 * 组合选择目录和扫描操作的便捷函数
 *
 * @returns 扫描结果，如果用户取消选择则返回null
 */
export async function selectAndScanCacheDirectory(): Promise<Types.ScanResult | null> {
  const path = await cacheImportService.selectCacheDirectory();
  if (!path) return null;

  return await cacheImportService.scanCacheDirectory(path);
}

/**
 * 检查本地封面文件
 * 便捷函数，直接调用缓存管理服务的封面检查方法
 *
 * @param cachePath 缓存目录路径
 * @returns 本地封面文件路径，如果不存在则返回null
 */
export async function checkLocalCover(
  cachePath: string,
): Promise<string | null> {
  return await cacheManagementService.checkLocalCover(cachePath);
}

/**
 * 验证缓存目录路径
 * 检查路径是否可能是有效的B站缓存目录
 *
 * @param path 目录路径
 * @returns 是否可能是有效的缓存目录
 */
export function validateCachePath(path: string): boolean {
  if (!path) return false;

  // 检查路径是否包含常见的B站缓存目录特征
  const commonPaths = ['BilibiliDownload', 'bilibili', 'cache', 'data'];

  const lowerPath = path.toLowerCase();
  return commonPaths.some((pattern) =>
    lowerPath.includes(pattern.toLowerCase()),
  );
}
