import { readText } from '@tauri-apps/plugin-clipboard-manager';
import { ref, watch } from 'vue';
import { useSettingsStore } from '@/store';
import { parseId } from './utils';
import { data } from './media';
import * as Types from '@/types/shared.d';
import { AppError } from './error';
import i18n from '@/i18n';

export interface ClipboardDetection {
  originalUrl: string;
  mediaInfo: Types.MediaInfo;
}

export class ClipboardService {
  private isRunning = false;
  private intervalId: number | null = null;
  private lastClipboardContent = '';
  private callbacks: ((info: ClipboardDetection) => void)[] = [];
  private initialized = false;

  constructor() {
    // Don't initialize immediately - wait for init() call
  }

  /**
   * Initialize the service with store access
   */
  init() {
    if (this.initialized) return;
    this.initialized = true;

    const settings = useSettingsStore();
    
    console.log('[ClipboardService] Initializing with clipboard setting:', settings.clipboard);
    
    // Watch clipboard setting changes
    watch(() => settings.clipboard, (enabled) => {
      console.log('[ClipboardService] Clipboard setting changed:', enabled);
      if (enabled) {
        this.start();
      } else {
        this.stop();
      }
    }, { immediate: true });
  }

  /**
   * Start clipboard monitoring
   */
  start() {
    if (this.isRunning) return;
    
    console.log('[ClipboardService] Starting clipboard monitoring');
    this.isRunning = true;
    this.intervalId = window.setInterval(async () => {
      try {
        await this.checkClipboard();
      } catch (error) {
        console.error('[ClipboardService] Clipboard check error:', error);
      }
    }, 1000); // Check every second
  }

  /**
   * Stop clipboard monitoring
   */
  stop() {
    if (!this.isRunning) return;
    
    console.log('[ClipboardService] Stopping clipboard monitoring');
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Add callback for when Bilibili content is detected
   */
  onBilibiliDetected(callback: (info: ClipboardDetection) => void) {
    this.callbacks.push(callback);
  }

  /**
   * Remove callback
   */
  removeCallback(callback: (info: ClipboardDetection) => void) {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Check clipboard content for changes and Bilibili links
   */
  private async checkClipboard() {
    try {
      const currentContent = await readText();
      
      // Skip if content hasn't changed
      if (currentContent === this.lastClipboardContent) {
        return;
      }
      
      console.log('[ClipboardService] New clipboard content detected:', currentContent?.substring(0, 100) + '...');
      this.lastClipboardContent = currentContent;
      
      // Skip empty content
      if (!currentContent?.trim()) {
        console.log('[ClipboardService] Skipping empty content');
        return;
      }

      // Try to parse as Bilibili content
      await this.processBilibiliContent(currentContent.trim());
      
    } catch (error) {
      // Log all clipboard errors for debugging
      console.warn('[ClipboardService] Clipboard read error:', error);
    }
  }

  /**
   * Process potential Bilibili content
   */
  private async processBilibiliContent(content: string) {
    try {
      console.log('[ClipboardService] Processing content:', content);
      
      // Try to parse the content as Bilibili ID/URL
      const parseResult = await parseId(content, false);
      console.log('[ClipboardService] Parse result:', parseResult);
      
      if (!parseResult.id || !parseResult.type) {
        console.log('[ClipboardService] Not a valid Bilibili link');
        return; // Not a valid Bilibili link
      }

      console.log('[ClipboardService] Getting media info for:', parseResult.id, parseResult.type);
      
      // Get media info
      const mediaInfo = await data.getMediaInfo(parseResult.id, parseResult.type);
      
      // Validate media info
      if (!mediaInfo.nfo?.showtitle && !mediaInfo.list?.[0]?.title) {
        console.log('[ClipboardService] Failed to get media info');
        return; // Failed to get media info
      }

      // Create clipboard detection info
      const clipboardInfo: ClipboardDetection = {
        originalUrl: content,
        mediaInfo: mediaInfo
      };

      console.log('[ClipboardService] Bilibili content detected:', clipboardInfo);

      // Notify all callbacks
      this.callbacks.forEach(callback => {
        try {
          callback(clipboardInfo);
        } catch (error) {
          console.error('[ClipboardService] Callback error:', error);
        }
      });

    } catch (error) {
      // Log parsing errors for debugging
      console.log('[ClipboardService] Not a Bilibili link or parsing failed:', content, error);
    }
  }

  /**
   * Get current clipboard content
   */
  async getCurrentContent(): Promise<string> {
    try {
      return await readText();
    } catch (error) {
      throw new AppError(i18n.global.t('error.clipboardRead'), { name: 'ClipboardError' });
    }
  }
}

// Export singleton instance (will be initialized later)
export const clipboardService = new ClipboardService(); 