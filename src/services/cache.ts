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
import * as Types from '@/types/cache.d';

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
        defaultPath: 'C:\\Users\\%USERNAME%\\AppData\\Local\\BilibiliDownload\\data',
      });
      
      return Array.isArray(selected) ? selected[0] : selected;
    } catch (error) {
      throw new AppError('选择目录失败');
    }
  }

  /**
   * 扫描缓存目录
   * 扫描指定目录下的所有缓存文件，返回扫描结果
   * 注意：此功能需要后端实现 scan_cache_directory 命令
   * 
   * @param path 缓存根目录路径
   * @returns 扫描结果，包含发现的缓存目录信息
   */
  async scanCacheDirectory(path: string): Promise<Types.ScanResult> {
    // TODO: 等待后端实现 scan_cache_directory 命令
    // 目前返回模拟数据用于开发
    return {
      rootPath: path,
      totalDirectories: 0,
      validDirectories: 0,
      invalidDirectories: 0,
      estimatedTotalSize: 0,
      scanDuration: 0,
      directories: []
    };
  }

  /**
   * 开始导入操作
   * 启动缓存文件导入流程
   * 
   * @param path 缓存根目录路径
   * @param options 导入选项配置（当前后端未使用此参数）
   * @returns 导入结果
   */
  async startImport(path: string, _options?: Types.ImportOptions): Promise<any> {
    try {
      const result = await invoke('import_cache_directory', { path });
      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('启动导入失败');
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
      await invoke('cancel_import', { importId });
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
    onProgress: (progress: any) => void
  ): Promise<() => void> {
    try {
      const channel = new Channel<any>();
      
      // 监听进度更新
      channel.onmessage = (progress) => {
        onProgress(progress);
      };

      // 启动进度监听
      await invoke('get_import_progress', { importId, event: channel });

      // 返回取消监听的函数
      return () => {
        // Channel会在后端完成时自动关闭
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('监听导入进度失败');
    }
  }

  /**
   * 获取导入结果
   * 获取已完成导入操作的详细结果
   * 注意：此功能需要后端实现 get_import_result 命令
   * 
   * @param importId 导入操作ID
   * @returns 导入结果详情
   */
  async getImportResult(importId: string): Promise<Types.ImportResult> {
    // TODO: 等待后端实现 get_import_result 命令
    // 目前返回模拟数据用于开发
    return {
      importId,
      totalFound: 0,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      startTime: new Date(),
      endTime: new Date(),
      details: []
    };
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
   * 获取缓存列表
   * 根据筛选条件获取缓存文件列表
   * 
   * @param filter 筛选条件（可选，当前后端未使用）
   * @param sort 排序选项（可选，当前后端未使用）
   * @param pagination 分页信息（可选，当前后端未使用）
   * @returns 缓存文件列表
   */
  async getCacheList(
    _filter?: Types.CacheFilter,
    _sort?: Types.SortOption,
    _pagination?: Types.CachePagination
  ): Promise<{
    items: Types.CacheItem[];
    pagination: Types.CachePagination;
    statistics: Types.CacheStatistics;
  }> {
    try {
      const result = await invoke('get_cache_list');
      
      // 转换后端数据格式为前端类型
      const items: Types.CacheItem[] = (result as any[]).map((record: any) => ({
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
        downloadTime: new Date(record.download_time * 1000),
        importTime: new Date(record.import_time * 1000),
        status: record.status as Types.CacheStatus
      }));

      // 构造分页信息（当前为简单实现）
      const paginationInfo: Types.CachePagination = {
        currentPage: 1,
        pageSize: items.length,
        totalCount: items.length,
        totalPages: 1
      };

      // 构造统计信息
      const statistics: Types.CacheStatistics = {
        totalCount: items.length,
        availableCount: items.filter(item => item.status === 'available').length,
        unavailableCount: items.filter(item => item.status === 'unavailable').length,
        incompleteCount: items.filter(item => item.status === 'incomplete').length,
        totalSize: items.reduce((sum, item) => sum + item.fileSize, 0),
        averageSize: items.length > 0 ? items.reduce((sum, item) => sum + item.fileSize, 0) / items.length : 0,
        totalDuration: items.reduce((sum, item) => sum + item.duration, 0)
      };

      return {
        items,
        pagination: paginationInfo,
        statistics
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('获取缓存列表失败');
    }
  }

  /**
   * 删除缓存项
   * 从数据库中删除指定的缓存记录
   * 
   * @param id 缓存项ID
   * @param deleteFiles 是否同时删除本地文件（当前后端未使用此参数）
   */
  async deleteCacheItem(id: string, _deleteFiles: boolean = false): Promise<void> {
    try {
      await invoke('delete_cache_item', { id });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('删除缓存项失败');
    }
  }

  /**
   * 批量删除缓存项
   * 批量删除多个缓存记录
   * 
   * @param ids 缓存项ID列表
   * @param deleteFiles 是否同时删除本地文件
   * @returns 批量操作结果
   */
  async batchDeleteCacheItems(
    ids: string[],
    deleteFiles: boolean = false
  ): Promise<Types.BatchOperationResult[]> {
    // 当前后端未实现批量删除，使用单个删除的方式实现
    const results: Types.BatchOperationResult[] = [];
    
    for (const id of ids) {
      try {
        await this.deleteCacheItem(id, deleteFiles);
        results.push({
          cacheId: id,
          success: true
        });
      } catch (error) {
        results.push({
          cacheId: id,
          success: false,
          error: error instanceof Error ? error.message : '删除失败'
        });
      }
    }
    
    return results;
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
    // 目前通过重新获取列表的方式实现
    const listResult = await this.getCacheList();
    const item = listResult.items.find(item => item.id === id);
    if (!item) {
      throw new AppError('缓存项不存在');
    }
    return item;
  }

  /**
   * 清理无效缓存
   * 扫描并清理所有不可用的缓存记录
   * 注意：此功能需要后端实现 clean_invalid_cache 命令
   * 
   * @returns 清理的缓存数量
   */
  async cleanInvalidCache(): Promise<number> {
    // TODO: 等待后端实现 clean_invalid_cache 命令
    // 目前返回0作为占位
    return 0;
  }

  /**
   * 获取缓存统计信息
   * 获取缓存文件的统计数据
   * 
   * @returns 缓存统计信息
   */
  async getCacheStatistics(): Promise<Types.CacheStatistics> {
    try {
      const result = await invoke('get_cache_stats') as any;
      
      // 转换后端数据格式为前端类型
      return {
        totalCount: result.total_count,
        availableCount: result.available_count,
        unavailableCount: result.total_count - result.available_count,
        incompleteCount: 0, // 后端暂未提供此数据
        totalSize: result.total_size,
        averageSize: result.total_count > 0 ? result.total_size / result.total_count : 0,
        totalDuration: 0 // 后端暂未提供此数据
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('获取缓存统计失败');
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
    const listResult = await this.getCacheList(filter);
    
    // 使用现有的 exportData 命令
    const exportData = {
      exportTime: new Date().toISOString(),
      totalCount: listResult.items.length,
      items: listResult.items.map(item => ({
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
        status: item.status
      }))
    };
    
    // 选择保存位置
    const savePath = await open({
      directory: false,
      multiple: false,
      title: '导出缓存列表',
      defaultPath: `cache_list_${new Date().toISOString().split('T')[0]}.json`,
      filters: [{
        name: 'JSON文件',
        extensions: ['json']
      }]
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
 * 执行完整的导入流程
 * 从选择目录到完成导入的完整流程
 * 
 * @param options 导入选项配置
 * @param onProgress 进度更新回调
 * @returns 导入结果
 */
export async function performFullImport(
  options: Types.ImportOptions,
  onProgress?: (progress: Types.ImportProgress) => void
): Promise<Types.ImportResult | null> {
  // 选择目录
  const path = await cacheImportService.selectCacheDirectory();
  if (!path) return null;

  // 开始导入
  const importId = await cacheImportService.startImport(path, options);

  // 监听进度（如果提供了回调）
  let cancelProgress: (() => void) | undefined;
  if (onProgress) {
    cancelProgress = await cacheImportService.listenImportProgress(importId, onProgress);
  }

  try {
    // 等待导入完成并获取结果
    return await cacheImportService.getImportResult(importId);
  } finally {
    // 清理进度监听
    if (cancelProgress) {
      cancelProgress();
    }
  }
}

/**
 * 格式化文件大小
 * 将字节数转换为人类可读的文件大小格式
 * 
 * @param bytes 字节数
 * @returns 格式化的文件大小字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化时长
 * 将秒数转换为时:分:秒格式
 * 
 * @param seconds 秒数
 * @returns 格式化的时长字符串
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
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
  const commonPaths = [
    'BilibiliDownload',
    'bilibili',
    'cache',
    'data'
  ];
  
  const lowerPath = path.toLowerCase();
  return commonPaths.some(pattern => lowerPath.includes(pattern.toLowerCase()));
}