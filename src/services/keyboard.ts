/**
 * 键盘事件处理服务
 *
 * 提供全局键盘事件监听、快捷键注册和分发功能
 * 支持缓存选择相关的快捷键操作
 */

import { useCacheStore } from '@/store/cache';

/**
 * 快捷键处理器类型
 */
export type KeyboardHandler = (event: KeyboardEvent) => void;

/**
 * 快捷键配置
 */
interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: KeyboardHandler;
}

/**
 * 键盘事件处理服务
 */
class KeyboardService {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private isListening = false;
  private handleKeyDown: ((event: KeyboardEvent) => void) | null = null;

  /**
   * 生成快捷键标识符
   */
  private generateShortcutId(
    key: string,
    ctrlKey = false,
    shiftKey = false,
    altKey = false,
  ): string {
    const modifiers = [
      ctrlKey ? 'ctrl' : '',
      shiftKey ? 'shift' : '',
      altKey ? 'alt' : '',
    ]
      .filter(Boolean)
      .join('+');

    return modifiers ? `${modifiers}+${key}` : key;
  }

  /**
   * 注册快捷键
   */
  registerShortcut(
    key: string,
    handler: KeyboardHandler,
    options: {
      ctrlKey?: boolean;
      shiftKey?: boolean;
      altKey?: boolean;
    } = {},
  ): void {
    const id = this.generateShortcutId(
      key,
      options.ctrlKey,
      options.shiftKey,
      options.altKey,
    );

    this.shortcuts.set(id, {
      key,
      ctrlKey: options.ctrlKey,
      shiftKey: options.shiftKey,
      altKey: options.altKey,
      handler,
    });
  }

  /**
   * 取消注册快捷键
   */
  unregisterShortcut(
    key: string,
    options: {
      ctrlKey?: boolean;
      shiftKey?: boolean;
      altKey?: boolean;
    } = {},
  ): void {
    const id = this.generateShortcutId(
      key,
      options.ctrlKey,
      options.shiftKey,
      options.altKey,
    );

    this.shortcuts.delete(id);
  }

  /**
   * 清除所有快捷键
   */
  clearAllShortcuts(): void {
    this.shortcuts.clear();
  }

  /**
   * 启动全局键盘事件监听
   */
  startListening(): void {
    if (this.isListening) return;

    this.handleKeyDown = (event: KeyboardEvent) => {
      this.handleKeyboardEvent(event);
    };

    window.addEventListener('keydown', this.handleKeyDown);
    this.isListening = true;
  }

  /**
   * 停止全局键盘事件监听
   */
  stopListening(): void {
    if (!this.isListening || !this.handleKeyDown) return;

    window.removeEventListener('keydown', this.handleKeyDown);
    this.handleKeyDown = null;
    this.isListening = false;
  }

  /**
   * 处理键盘事件
   */
  private handleKeyboardEvent(event: KeyboardEvent): void {
    // 检查是否在输入框中，如果是则忽略快捷键
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return;
    }

    // 获取按键名称
    const key = event.key.toUpperCase();

    // 查找匹配的快捷键
    for (const shortcut of this.shortcuts.values()) {
      if (
        shortcut.key.toUpperCase() === key &&
        shortcut.ctrlKey === event.ctrlKey &&
        shortcut.shiftKey === event.shiftKey &&
        shortcut.altKey === event.altKey
      ) {
        event.preventDefault();
        shortcut.handler(event);
        break;
      }
    }
  }
}

/**
 * 全局键盘服务实例
 */
const keyboardService = new KeyboardService();

/**
 * 初始化缓存选择相关的快捷键
 */
export function initializeCacheKeyboardShortcuts(): void {

  // Ctrl+A: 全选
  keyboardService.registerShortcut('a', (event) => {
    handleSelectAll(event);
  }, { ctrlKey: true });

  // Delete: 批量删除
  keyboardService.registerShortcut('Delete', (event) => {
    handleDelete(event);
  });

  // Escape: 取消选择
  keyboardService.registerShortcut('Escape', (event) => {
    handleEscape(event);
  });

  // ArrowUp: 向上导航
  keyboardService.registerShortcut('ArrowUp', (event) => {
    handleArrowUp(event);
  });

  // ArrowDown: 向下导航
  keyboardService.registerShortcut('ArrowDown', (event) => {
    handleArrowDown(event);
  });

  // Space: 切换选择
  keyboardService.registerShortcut(' ', (event) => {
    handleSpace(event);
  });

  // 启动监听
  keyboardService.startListening();
}

/**
 * 清理缓存选择相关的快捷键
 */
export function cleanupCacheKeyboardShortcuts(): void {
  keyboardService.stopListening();
  keyboardService.clearAllShortcuts();
}

/**
 * 处理 Ctrl+A 全选
 */
function handleSelectAll(event: KeyboardEvent): void {
  const cacheStore = useCacheStore();

  // 检查是否在缓存列表页面
  if (!isInCacheListPage()) {
    return;
  }

  event.preventDefault();
  cacheStore.selectAllCurrentPage();
}

/**
 * 处理 Delete 键删除
 */
function handleDelete(event: KeyboardEvent): void {
  const cacheStore = useCacheStore();

  // 检查是否在缓存列表页面
  if (!isInCacheListPage()) {
    return;
  }

  // 检查是否有选中的项目
  if (!cacheStore.hasSelectedItems) {
    return;
  }

  event.preventDefault();

  // 触发批量删除事件
  window.dispatchEvent(
    new CustomEvent('cache:batchDelete', {
      detail: { selectedItems: cacheStore.selectedItems },
    }),
  );
}

/**
 * 处理 Escape 键取消选择
 */
function handleEscape(event: KeyboardEvent): void {
  const cacheStore = useCacheStore();

  // 检查是否在缓存列表页面
  if (!isInCacheListPage()) {
    return;
  }

  // 检查是否有选中的项目或范围选择预览
  if (!cacheStore.hasSelectedItems && !cacheStore.isRangeSelecting) {
    return;
  }

  event.preventDefault();

  // 清除范围选择预览
  if (cacheStore.isRangeSelecting) {
    cacheStore.clearRangePreview();
  } else {
    // 清除所有选择
    cacheStore.clearSelection();
  }
}

/**
 * 处理 ArrowUp 向上导航
 */
function handleArrowUp(event: KeyboardEvent): void {

  // 检查是否在缓存列表页面
  if (!isInCacheListPage()) {
    return;
  }

  event.preventDefault();

  // 触发向上导航事件
  window.dispatchEvent(new CustomEvent('cache:navigateUp'));
}

/**
 * 处理 ArrowDown 向下导航
 */
function handleArrowDown(event: KeyboardEvent): void {

  // 检查是否在缓存列表页面
  if (!isInCacheListPage()) {
    return;
  }

  event.preventDefault();

  // 触发向下导航事件
  window.dispatchEvent(new CustomEvent('cache:navigateDown'));
}

/**
 * 处理 Space 切换选择
 */
function handleSpace(event: KeyboardEvent): void {
  const cacheStore = useCacheStore();

  // 检查是否在缓存列表页面
  if (!isInCacheListPage()) {
    return;
  }

  // 检查是否有焦点项目
  if (!cacheStore.focusedItem) {
    return;
  }

  event.preventDefault();

  // 切换焦点项目的选择状态
  if (cacheStore.focusedItemType === 'video') {
    cacheStore.toggleCacheItemSelection(cacheStore.focusedItem);
  } else if (cacheStore.focusedItemType === 'group') {
    cacheStore.toggleGroupSelection(cacheStore.focusedItem);
  }
}

/**
 * 检查是否在缓存列表页面
 */
function isInCacheListPage(): boolean {
  // 检查当前路由是否为缓存列表页面
  const currentPath = window.location.pathname;
  return currentPath.includes('cache') || currentPath.includes('list');
}

export { keyboardService };
