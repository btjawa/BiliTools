<template>
  <div class="history-page h-full flex flex-col">
    <!-- Top Toolbar -->
    <div class="toolbar absolute top-[13px] left-4 right-4 z-10 flex items-center gap-4">
      <!-- Search Bar -->
      <div class="search-bar flex-1 flex rounded-[26px] p-2.5 gap-2 bg-[color:var(--block-color)]">
        <input
          type="text" 
          :placeholder="$t('common.history.search.placeholder')" 
          v-model="searchKeyword" 
          class="w-full !rounded-2xl bg-transparent border-none outline-none text-[var(--content-color)]"
          autocomplete="off" 
          spellcheck="false"
        />
        <button v-if="searchKeyword" @click="searchKeyword = ''" 
                class="fa-solid fa-times rounded-full text-[var(--desc-color)] hover:text-[var(--content-color)] transition-colors">
        </button>
        <button class="fa-solid fa-search rounded-full text-[var(--desc-color)] hover:text-[var(--content-color)] transition-colors">
        </button>
      </div>
      
      <!-- Refresh Button -->
      <button @click="refresh" 
              :disabled="refreshing"
              class="flex items-center justify-center w-10 h-10 rounded-full transition-colors duration-200"
              :class="{ 
                'text-[var(--primary-color)]': refreshing, 
                'text-[var(--desc-color)] hover:text-[var(--content-color)]': !refreshing,
                'opacity-60 cursor-not-allowed': refreshing 
              }">
        <i :class="['fa-solid fa-refresh transition-transform duration-500', { 'animate-spin': refreshing }]"></i>
      </button>
      
      <!-- Filter Control -->
      <button @click="filterExpanded = !filterExpanded" 
              class="flex items-center gap-2 text-[var(--primary-color)] hover:opacity-80 transition-opacity bg-[color:var(--block-color)] px-3 py-2 rounded-lg">
        <span>{{ $t('common.history.filter.moreFilters') }}</span>
        <i :class="['fa-solid', filterExpanded ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
      </button>
    </div>

    <!-- Filter Panel (Outside toolbar) -->
    <div :class="[
           'filter-panel absolute top-[70px] right-4 p-6 bg-[color:var(--solid-block-color)] rounded-lg border border-[var(--split-color)] transition-all duration-300 ease-in-out overflow-hidden min-w-96 shadow-xl z-20',
           filterExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 p-0'
         ]">
        <div class="filter-content" :class="{ 'filter-content-visible': filterExpanded }">
          <!-- Duration Filter -->
          <div class="filter-group mb-4">
            <h3 class="text-sm font-medium mb-2 text-[var(--content-color)]">{{ $t('common.history.filter.duration.title') }}</h3>
            <div class="flex flex-wrap gap-2">
              <button v-for="option in durationOptions" 
                      :key="option.value"
                      @click="selectDuration(option.value)"
                      :class="[
                        'filter-button',
                        selectedDuration === option.value ? 'active' : ''
                      ]">
                {{ $t(option.labelKey) }}
              </button>
            </div>
          </div>
          
          <!-- Time Filter -->
          <div class="filter-group">
            <h3 class="text-sm font-medium mb-2 text-[var(--content-color)]">{{ $t('common.history.filter.time.title') }}</h3>
            <div class="flex flex-wrap gap-2 mb-3">
              <button v-for="option in timeOptions" 
                      :key="option.value"
                      @click="selectTimeRange(option.value)"
                      :class="[
                        'filter-button',
                        selectedTimeRange === option.value ? 'active' : ''
                      ]">
                {{ $t(option.labelKey) }}
              </button>
            </div>
            
            <!-- Custom Date Range -->
            <div v-if="selectedTimeRange === 'custom'" class="mt-3 space-y-2">
              <div class="flex flex-col gap-1">
                <label class="text-xs text-[var(--desc-color)]">{{ $t('common.history.filter.time.startDate') }}</label>
                <input type="date" 
                       v-model="customStartDate"
                       class="text-sm border border-[var(--split-color)] rounded px-2 py-1 bg-[var(--button-color)] text-[var(--content-color)]"
                       :max="customEndDate">
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs text-[var(--desc-color)]">{{ $t('common.history.filter.time.endDate') }}</label>
                <input type="date" 
                       v-model="customEndDate"
                       class="text-sm border border-[var(--split-color)] rounded px-2 py-1 bg-[var(--button-color)] text-[var(--content-color)]"
                       :min="customStartDate"
                       :max="today">
              </div>
            </div>
          </div>
          
          <!-- Apply/Reset Buttons -->
          <div class="flex gap-2 mt-4 pt-3 border-t border-[var(--split-color)]">
            <button @click="applyFilters" 
                    class="flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-[var(--primary-color)] text-white hover:opacity-80 transition-opacity">
              <i class="fa-solid fa-filter"></i>
              <span>{{ $t('common.history.filter.apply') }}</span>
            </button>
            <button @click="resetFilters"
                    class="flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-[var(--split-color)] bg-[var(--button-color)] text-[var(--content-color)] hover:brightness-150 transition-all">
              <i class="fa-solid fa-refresh"></i>
              <span>{{ $t('common.history.filter.reset') }}</span>
            </button>
          </div>
        </div>
      </div>

    <!-- Search Divider -->
    <div class="search-divider mt-[50px] mb-4">
      <hr class="w-full border-t-2 border-red-500" />
    </div>

    <!-- History List -->
    <div class="flex-1 overflow-auto min-h-0 pt-4" ref="scrollContainer" @scroll="handleScroll">
      <!-- Show empty state when not logged in -->
      <div v-if="!user.isLogin" class="flex justify-center items-center h-full">
        <Empty text="downloads.empty" />
      </div>
      
      <div v-else-if="loading && historyList.length === 0" class="flex justify-center items-center h-32">
        <div class="loading-spinner"></div>
      </div>
      
      <div v-else-if="historyList.length === 0 && !loading" class="flex flex-col items-center justify-center h-32">
        <i class="fa-light fa-clock text-4xl text-[var(--desc-color)] mb-2"></i>
        <p class="text-[var(--desc-color)]">{{ $t('common.history.empty') }}</p>
      </div>

      <div v-else class="p-4 space-y-3">
        <div v-for="item in filteredHistoryList" :key="item.history.oid" 
             class="history-item group flex bg-[var(--block-color)] rounded-lg p-3 hover:bg-[var(--hover-color)] transition-colors"
             @dblclick="playVideo(item)">
          
          <!-- Cover with duration overlay -->
          <div class="flex-shrink-0 relative">
            <div class="cover-container w-40 h-24 mr-4 rounded-lg overflow-hidden bg-gray-200">
              <img :src="item.cover" :alt="item.title" 
                   class="w-full h-full object-cover"/>
              <!-- Duration overlay -->
              <div class="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1.5 py-0.5 rounded">
                {{ formatDuration(item.duration) }}
              </div>
              <!-- Progress bar if partially watched -->
              <div v-if="item.progress > 0 && item.progress !== -1" 
                   class="absolute bottom-0 left-0 w-full h-1 bg-black bg-opacity-30">
                <div class="h-full bg-[var(--primary-color)]" 
                     :style="{ width: Math.round((item.progress / item.duration) * 100) + '%' }"></div>
              </div>
            </div>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0 flex flex-col justify-between">
            <!-- Title and metadata -->
            <div>
              <h3 class="text-base font-medium line-clamp-2 mb-1 leading-5 text-[var(--content-color)] hover:text-[var(--primary-color)] cursor-text transition-colors select-text"
                  @dblclick.stop="openVideo(item)">
                {{ item.title }}
              </h3>
              <div class="flex items-center gap-2 text-sm text-[var(--desc-color)] mb-1">
                <span class="hover:text-[var(--primary-color)] cursor-text transition-colors select-text"
                      @dblclick.stop="openAuthorSpace(item)">
                  {{ item.author_name }}
                </span>
                <span>•</span>
                <span>{{ formatViewTime(item.view_at) }}</span>
              </div>
            </div>
            
            <!-- Progress info if available -->
            <div v-if="item.progress > 0" class="text-xs text-[var(--desc-color)]">
              {{ item.progress === -1 ? $t('common.history.finished') : 
                 $t('common.history.progress') + ': ' + formatProgress(item.progress, item.duration) }}
            </div>
          </div>

          <!-- Action buttons (show on hover) -->
          <div class="flex-shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <div class="flex flex-col gap-2">
              <button @click.stop="downloadCover(item)" 
                      class="primary-color"
                      :title="$t('common.history.downloadCover')">
                <i class="fa-solid fa-download"></i>
                <span>{{ $t('common.history.downloadCover') }}</span>
              </button>
              <button @click.stop="addToDownload(item)" 
                      :title="$t('common.history.addDownload')">
                <i class="fa-solid fa-plus"></i>
                <span>{{ $t('common.history.addDownload') }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Loading more indicator -->
        <div v-if="loading && historyList.length > 0" class="flex justify-center py-4">
          <div class="loading-spinner"></div>
        </div>

        <!-- No more data indicator -->
        <div v-if="!hasMore && historyList.length > 0" class="text-center py-4 text-[var(--desc-color)]">
          {{ $t('common.history.noMore') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue';
import { save } from '@tauri-apps/plugin-dialog';
import { useUserStore, useQueueStore } from '@/store';
import { getHistory, getMediaInfo } from '@/services/data';
import { tryFetch, ApplicationError, getImageBlob } from '@/services/utils';
import { TYPE } from 'vue-toastification';
import { AppLog } from '@/services/utils';
import * as Types from '@/types/data.d';
import { useI18n } from 'vue-i18n';
import { Empty } from '@/components';
import { openUrl } from '@tauri-apps/plugin-opener';

const { t } = useI18n();
const user = useUserStore();
const queue = useQueueStore();

const historyList = ref<Types.HistoryItem[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const hasMore = ref(true);
const viewAt = ref<number | undefined>(undefined);
const scrollContainer = ref<HTMLElement>();
const searchKeyword = ref('');

// Filter state
const filterExpanded = ref(false);
const selectedDuration = ref('all');
const selectedTimeRange = ref('all');
const customStartDate = ref('');
const customEndDate = ref('');

// Filter options with translation keys
const durationOptions = [
  { labelKey: 'common.history.filter.duration.all', value: 'all' },
  { labelKey: 'common.history.filter.duration.under10', value: '0-10' },
  { labelKey: 'common.history.filter.duration.10to30', value: '10-30' },
  { labelKey: 'common.history.filter.duration.30to60', value: '30-60' },
  { labelKey: 'common.history.filter.duration.over60', value: '60+' }
];

const timeOptions = [
  { labelKey: 'common.history.filter.time.all', value: 'all' },
  { labelKey: 'common.history.filter.time.today', value: 'today' },
  { labelKey: 'common.history.filter.time.yesterday', value: 'yesterday' },
  { labelKey: 'common.history.filter.time.week', value: 'week' },
  { labelKey: 'common.history.filter.time.custom', value: 'custom' }
];

// Get today's date for date input max
const today = new Date().toISOString().split('T')[0];

// Utility function for creating local date without timezone issues
function createLocalDate(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date {
  return new Date(year, month, day, hour, minute, second);
}

// Utility function for parsing date string to local date
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return createLocalDate(year, month - 1, day); // month is 0-indexed
}

// Utility function to get day start/end in local time
function getDayBounds(date: Date): { start: Date; end: Date } {
  const start = createLocalDate(date.getFullYear(), date.getMonth(), date.getDate());
  const end = createLocalDate(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
  end.setMilliseconds(999);
  return { start, end };
}

// Computed filtered list
const filteredHistoryList = computed(() => {
  let filtered = historyList.value;
  
  // Search filter
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase().trim();
    filtered = filtered.filter(item => 
      item.title.toLowerCase().includes(keyword) || 
      item.author_name.toLowerCase().includes(keyword)
    );
  }
  
  // Duration filter
  if (selectedDuration.value !== 'all') {
    filtered = filtered.filter(item => {
      const minutes = Math.floor(item.duration / 60);
      switch (selectedDuration.value) {
        case '0-10': return minutes < 10;
        case '10-30': return minutes >= 10 && minutes < 30;
        case '30-60': return minutes >= 30 && minutes < 60;
        case '60+': return minutes >= 60;
        default: return true;
      }
    });
  }
  
  // Time filter
  if (selectedTimeRange.value !== 'all') {
    const now = new Date();
    const today = createLocalDate(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    filtered = filtered.filter(item => {
      const viewDate = new Date(item.view_at * 1000);
      const viewDay = createLocalDate(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate());
      
      switch (selectedTimeRange.value) {
        case 'today': return viewDay.getTime() === today.getTime();
        case 'yesterday': return viewDay.getTime() === yesterday.getTime();
        case 'week': return viewDate.getTime() >= weekAgo.getTime();
        case 'custom':
          if (customStartDate.value && customEndDate.value) {
            // Parse dates as local time to avoid timezone issues
            const startDate = parseLocalDate(customStartDate.value);
            const endDate = parseLocalDate(customEndDate.value);
            const { start } = getDayBounds(startDate);
            const { end } = getDayBounds(endDate);
            return viewDate >= start && viewDate <= end;
          }
          return true;
        default: return true;
      }
    });
  }
  
  return filtered;
});

onMounted(async () => {
  if (user.isLogin) {
    await loadMore();
  }
});

// Filter functions
function selectDuration(value: string) {
  selectedDuration.value = value;
}

function selectTimeRange(value: string) {
  selectedTimeRange.value = value;
  if (value !== 'custom') {
    customStartDate.value = '';
    customEndDate.value = '';
  }
}

function applyFilters() {
  // Filters are applied automatically through computed property
  // This function can be extended to reload data from server with filters
  AppLog(t('common.history.filter.applied'), TYPE.SUCCESS);
}

function resetFilters() {
  selectedDuration.value = 'all';
  selectedTimeRange.value = 'all';
  customStartDate.value = '';
  customEndDate.value = '';
  AppLog(t('common.history.filter.resetSuccess'), TYPE.INFO);
}

// Refresh history data
async function refresh() {
  if (refreshing.value || !user.isLogin) return;
  
  refreshing.value = true;
  try {
    // Reset pagination state
    historyList.value = [];
    viewAt.value = undefined;
    hasMore.value = true;
    
    // Load fresh data
    await loadMore();
  } finally {
    refreshing.value = false;
  }
}

// Load more history data
async function loadMore() {
  if (loading.value || !hasMore.value) return;
  
  loading.value = true;
  try {
    const response = await getHistory(20, viewAt.value);
    if (response.code !== 0) {
      throw new Error(response.message);
    }
    
    const newItems = response.data.list;
    
    // Process images with getImageBlob to fix CORS issues
    for (const item of newItems) {
      try {
        item.cover = await getImageBlob(item.cover);
      } catch (err) {
        // Keep original URL if getImageBlob fails
        console.warn('Failed to process cover image:', err);
      }
    }
    
    historyList.value.push(...newItems);
    
    // Update cursor for next page
    if (newItems.length > 0) {
      viewAt.value = response.data.cursor.view_at;
    } else {
      hasMore.value = false;
    }
  } catch (err) {
    new ApplicationError(err).handleError();
  } finally {
    loading.value = false;
  }
}

// Handle scroll for infinite loading
function handleScroll() {
  if (!scrollContainer.value || !user.isLogin) return;
  
  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value;
  const threshold = 100; // Load when 100px from bottom
  
  if (scrollHeight - scrollTop - clientHeight < threshold) {
    loadMore();
  }
}

// Play video (navigate to search and auto-play)
async function playVideo(item: Types.HistoryItem) {
  await addToDownload(item);
}

// Download cover image
async function downloadCover(item: Types.HistoryItem) {
  try {
    const filePath = await save({
      defaultPath: `${sanitizeFilename(item.title)}.jpg`,
      filters: [{
        name: 'Images',
        extensions: ['jpg', 'jpeg', 'png']
      }]
    });
    
    if (!filePath) return;
    
    const imageData = await tryFetch(item.cover, { type: 'binary' });
    const { commands } = await import('@/services/backend');
    const { useAppStore } = await import('@/store');
    const app = useAppStore();
    
    const result = await commands.writeBinary(app.secret, filePath, imageData as any);
    if (result?.status === 'error') {
      throw result.error;
    }
    
    AppLog(t('common.history.coverDownloaded'), TYPE.SUCCESS);
  } catch (err) {
    new ApplicationError(err).handleError();
  }
}

// Add video to download queue
async function addToDownload(item: Types.HistoryItem) {
  try {
    if (!item.history.bvid && !item.history.oid) {
      throw new Error(t('common.history.noVideoId'));
    }
    
    // Use BVID if available, otherwise use aid
    const id = item.history.bvid || `av${item.history.oid}`;
    
    // Navigate to search page and trigger search
    const router = await import('@/router');
    await router.default.push('/');
    
    // Wait for navigation to complete and retry search input setup
    let attempts = 0;
    const maxAttempts = 10;
    const attemptInterval = 100; // ms
    
    const trySetupSearch = async (): Promise<boolean> => {
      attempts++;
      
      // Wait for DOM to be ready
      await new Promise(resolve => setTimeout(resolve, attemptInterval));
      
      // Find search input
      const searchInput = document.querySelector('.search_input input') as HTMLInputElement;
      
      if (!searchInput) {
        if (attempts < maxAttempts) {
          return trySetupSearch();
        }
        return false;
      }
      
      // Set the search value
      searchInput.value = id;
      
      // Trigger input event to update Vue's reactive data
      const inputEvent = new Event('input', { bubbles: true });
      searchInput.dispatchEvent(inputEvent);
      
      // Also trigger change event for good measure
      const changeEvent = new Event('change', { bubbles: true });
      searchInput.dispatchEvent(changeEvent);
      
      // Wait a bit more for Vue to process the input
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Find and click search button
      const searchButton = document.querySelector('.search_input button[class*="fa-search"]') as HTMLButtonElement;
      if (searchButton) {
        searchButton.click();
        return true;
      }
      
      // If button not found, try pressing Enter on the input
      const enterEvent = new KeyboardEvent('keydown', { 
        key: 'Enter', 
        code: 'Enter', 
        keyCode: 13,
        bubbles: true 
      });
      searchInput.dispatchEvent(enterEvent);
      
      return true;
    };
    
    const success = await trySetupSearch();
    
    if (success) {
      AppLog(t('common.history.addedToSearch'), TYPE.SUCCESS);
    } else {
      AppLog(t('error.searchPageNotReady'), TYPE.WARNING);
    }
  } catch (err) {
    new ApplicationError(err).handleError();
  }
}

// Open video in browser
async function openVideo(item: Types.HistoryItem) {
  try {
    console.log('openVideo called with item:', item);
    if (!item.history.bvid && !item.history.oid) {
      throw new Error('No video ID available');
    }
    
    // Use BVID if available, otherwise use aid
    const id = item.history.bvid || `av${item.history.oid}`;
    const videoUrl = `https://www.bilibili.com/video/${id}`;
    console.log('Opening video URL:', videoUrl);
    
    await openUrl(videoUrl);
  } catch (err) {
    console.error('openVideo error:', err);
    new ApplicationError(err).handleError();
  }
}

// Open author space in browser
async function openAuthorSpace(item: Types.HistoryItem) {
  try {
    console.log('openAuthorSpace called with item:', item);
    
    // Try to get video info first to obtain accurate mid
    if (item.history.bvid || item.history.oid) {
      try {
        const id = item.history.bvid || `av${item.history.oid}`;
        console.log('Getting media info for ID:', id);
        
        const mediaInfo = await getMediaInfo(id, Types.MediaType.Video);
        console.log('Media info retrieved:', mediaInfo.nfo.upper);
        
        if (mediaInfo.nfo.upper?.mid) {
          const spaceUrl = `https://space.bilibili.com/${mediaInfo.nfo.upper.mid}`;
          console.log('Opening author space URL:', spaceUrl);
          await openUrl(spaceUrl);
          return;
        }
      } catch (apiError) {
        console.warn('API call failed, falling back to search:', apiError);
      }
    }
    
    // Fallback: search for the author name on bilibili
    const searchUrl = `https://search.bilibili.com/upuser?keyword=${encodeURIComponent(item.author_name)}`;
    console.log('Opening search URL:', searchUrl);
    await openUrl(searchUrl);
  } catch (err) {
    console.error('openAuthorSpace error:', err);
    new ApplicationError(err).handleError();
  }
}

// Utility functions
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatViewTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const today = createLocalDate(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const viewDate = createLocalDate(date.getFullYear(), date.getMonth(), date.getDate());
  
  const timeStr = date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  
  if (viewDate.getTime() === today.getTime()) {
    return `${t('common.history.filter.time.today')}${timeStr}`;
  } else if (viewDate.getTime() === yesterday.getTime()) {
    return `${t('common.history.filter.time.yesterday')}${timeStr}`;
  } else {
    const diffDays = Math.floor((today.getTime() - viewDate.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays < 7) {
      return t('common.history.daysAgo', { days: diffDays });
    } else {
      return date.toLocaleDateString([], { 
        month: '2-digit', 
        day: '2-digit'
      });
    }
  }
}

function formatProgress(progress: number, duration: number): string {
  if (progress === -1) return t('common.history.finished');
  const percentage = Math.round((progress / duration) * 100);
  return `${percentage}%`;
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100);
}
</script>

<style scoped lang="scss">
.history-page {
  @apply bg-[var(--background-color)];
}

.history-item {
  border: 1px solid var(--split-color);
  
  &:hover {
    border-color: var(--primary-color);
  }
}

.cover-container {
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.1));
    pointer-events: none;
  }
}

.filter-panel {
  transition: max-height 0.3s ease-in-out, opacity 0.3s ease-in-out, margin-top 0.3s ease-in-out, padding 0.3s ease-in-out;
}

.filter-content {
  opacity: 0;
  transform: translateY(-10px);
  transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
  transition-delay: 0s;
}

.filter-content-visible {
  opacity: 1;
  transform: translateY(0);
  transition-delay: 0.1s;
}

.filter-button {
  @apply px-3 py-1 text-sm rounded-md border border-[var(--split-color)] bg-[var(--button-color)] text-[var(--content-color)];
  @apply hover:brightness-150 transition-all cursor-pointer;
  
  &.active {
    @apply bg-[var(--primary-color)] text-[var(--dark-button-color)] border-[var(--primary-color)];
  }
}

.filter-group {
  h3 {
    @apply font-medium text-[var(--content-color)];
  }
}

.loading-spinner {
  @apply w-6 h-6 border-2 border-[var(--primary-color)] border-t-transparent rounded-full animate-spin;
}

.queue__tab h3 {
  transition: color .1s;
  @apply hover:text-[color:var(--primary-color)];
  &.active {
    color: var(--primary-color);
  }
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Date input styling for dark theme compatibility */
input[type="date"] {
  position: relative;
  
  /* Fix calendar icon in dark theme */
  &::-webkit-calendar-picker-indicator {
    filter: invert(var(--icon-invert, 0));
    opacity: 0.7;
    cursor: pointer;
    
    &:hover {
      opacity: 1;
    }
  }
  
  /* Firefox */
  &::-moz-calendar-picker-indicator {
    filter: invert(var(--icon-invert, 0));
    opacity: 0.7;
    cursor: pointer;
    
    &:hover {
      opacity: 1;
    }
  }
}

/* Dark theme icon inversion */
@media (prefers-color-scheme: dark) {
  input[type="date"] {
    &::-webkit-calendar-picker-indicator {
      filter: invert(1);
    }
    
    &::-moz-calendar-picker-indicator {
      filter: invert(1);
    }
  }
}
</style> 