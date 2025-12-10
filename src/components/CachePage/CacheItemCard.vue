<template>
  <div
    class="cache-item-card"
    :class="{
      'selected': selected,
      'unavailable': item.status === 'unavailable',
      'incomplete': item.status === 'incomplete'
    }"
    @click="$emit('select')"
  >
    <!-- 选择复选框 -->
    <div class="selection-checkbox">
      <input
        type="checkbox"
        :checked="selected"
        @click.stop
        @change="$emit('select')"
        class="w-4 h-4"
      />
    </div>

    <!-- 封面图片 -->
    <div class="cover-container">
      <Image
        :src="item.coverUrl"
        :height="120"
        :width="200"
        :ratio="5 / 3"
        class="cover-image"
      />
      
      <!-- 状态标识 -->
      <div class="status-badge" :class="statusClass">
        <i :class="statusIcon"></i>
      </div>
      
      <!-- 时长显示 -->
      <div class="duration-badge">
        {{ duration(item.duration) }}
      </div>
      
      <!-- 文件大小 -->
      <div class="size-badge">
        {{ formatBytes(item.fileSize) }}
      </div>
    </div>

    <!-- 内容信息 -->
    <div class="content-info">
      <!-- 标题 -->
      <h3 class="title" :title="item.title">
        {{ item.title }}
      </h3>
      
      <!-- UP主 -->
      <div class="uploader">
        <i :class="[$fa.weight, 'fa-user']"></i>
        <span :title="item.uname">{{ item.uname }}</span>
      </div>
      
      <!-- 视频信息 -->
      <div class="video-info">
        <span class="bvid">{{ item.bvid }}</span>
        <span class="separator">•</span>
        <span class="import-time">{{ formatImportTime(item.importTime) }}</span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <button
        class="action-btn play-btn"
        :disabled="item.status === 'unavailable'"
        @click.stop="$emit('play', item)"
        :title="$t('cache.card.play')"
      >
        <i :class="[$fa.weight, 'fa-play']"></i>
      </button>
      
      <button
        class="action-btn folder-btn"
        @click.stop="$emit('openFolder', item)"
        :title="$t('cache.card.openFolder')"
      >
        <i :class="[$fa.weight, 'fa-folder-open']"></i>
      </button>
      
      <button
        class="action-btn delete-btn"
        @click.stop="$emit('delete', item)"
        :title="$t('cache.card.delete')"
      >
        <i :class="[$fa.weight, 'fa-trash']"></i>
      </button>
    </div>

    <!-- 悬浮操作菜单 -->
    <div class="hover-menu">
      <button
        v-if="item.status === 'available'"
        class="menu-item"
        @click.stop="$emit('play', item)"
      >
        <i :class="[$fa.weight, 'fa-play']"></i>
        <span>{{ $t('cache.card.play') }}</span>
      </button>
      
      <button
        class="menu-item"
        @click.stop="$emit('openFolder', item)"
      >
        <i :class="[$fa.weight, 'fa-folder-open']"></i>
        <span>{{ $t('cache.card.openFolder') }}</span>
      </button>
      
      <button
        class="menu-item danger"
        @click.stop="$emit('delete', item)"
      >
        <i :class="[$fa.weight, 'fa-trash']"></i>
        <span>{{ $t('cache.card.delete') }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatBytes, duration } from '@/services/utils';
import { Image } from '@/components';
import type * as Types from '@/types/cache.d';

// ============================================================================
// Props 和 Emits
// ============================================================================

interface Props {
  item: Types.CacheItem;
  selected: boolean;
}

interface Emits {
  (e: 'select'): void;
  (e: 'play', item: Types.CacheItem): void;
  (e: 'openFolder', item: Types.CacheItem): void;
  (e: 'delete', item: Types.CacheItem): void;
}

const props = defineProps<Props>();
defineEmits<Emits>();

// ============================================================================
// 计算属性
// ============================================================================

const statusClass = computed(() => `status-${props.item.status}`);

const statusIcon = computed(() => {
  const iconMap = {
    available: 'fa-solid fa-check-circle',
    unavailable: 'fa-solid fa-times-circle',
    incomplete: 'fa-solid fa-exclamation-triangle',
  };
  return iconMap[props.item.status] ?? 'fa-solid fa-question-circle';
});

// ============================================================================
// 方法
// ============================================================================

/**
 * 格式化导入时间
 */
function formatImportTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
  return `${Math.floor(diffDays / 365)}年前`;
}
</script>

<style scoped>
@reference 'tailwindcss';

.cache-item-card {
  @apply relative bg-(--block-color) rounded-lg overflow-hidden cursor-pointer;
  @apply border-2 border-transparent transition-all duration-200;
  @apply hover:border-(--primary-color) hover:shadow-lg;
}

.cache-item-card.selected {
  @apply border-(--primary-color) shadow-lg;
}

.cache-item-card.unavailable {
  @apply opacity-60;
}

.cache-item-card.incomplete {
  @apply border-yellow-500;
}

/* 选择复选框 */
.selection-checkbox {
  @apply absolute top-2 left-2 z-20;
  @apply opacity-0 transition-opacity duration-200;
}

.cache-item-card:hover .selection-checkbox,
.cache-item-card.selected .selection-checkbox {
  @apply opacity-100;
}

/* 封面容器 */
.cover-container {
  @apply relative w-full h-32 overflow-hidden;
}

.cover-image {
  @apply w-full h-full object-cover;
}

/* 状态标识 */
.status-badge {
  @apply absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs;
}

.status-available {
  @apply bg-green-500;
}

.status-unavailable {
  @apply bg-red-500;
}

.status-incomplete {
  @apply bg-yellow-500;
}

/* 时长标识 */
.duration-badge {
  @apply absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded;
}

/* 文件大小标识 */
.size-badge {
  @apply absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded;
}

/* 内容信息 */
.content-info {
  @apply p-3 space-y-2;
}

.title {
  @apply font-medium text-sm leading-tight line-clamp-2;
  @apply text-(--text-color);
}

.uploader {
  @apply flex items-center gap-1 text-xs text-(--desc-color);
}

.uploader span {
  @apply truncate;
}

.video-info {
  @apply flex items-center gap-1 text-xs text-(--desc-color);
}

.bvid {
  @apply font-mono;
}

.separator {
  @apply mx-1;
}

/* 操作按钮 */
.action-buttons {
  @apply absolute bottom-3 right-3 flex gap-1;
  @apply opacity-0 transition-opacity duration-200;
}

.cache-item-card:hover .action-buttons {
  @apply opacity-100;
}

.action-btn {
  @apply w-8 h-8 rounded-full flex items-center justify-center text-white text-sm;
  @apply transition-all duration-200 hover:scale-110;
}

.play-btn {
  @apply bg-green-500 hover:bg-green-600;
}

.play-btn:disabled {
  @apply bg-gray-400 cursor-not-allowed hover:scale-100;
}

.folder-btn {
  @apply bg-blue-500 hover:bg-blue-600;
}

.delete-btn {
  @apply bg-red-500 hover:bg-red-600;
}

/* 悬浮菜单 */
.hover-menu {
  @apply absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2;
  @apply opacity-0 transition-opacity duration-200 pointer-events-none;
}

.cache-item-card:hover .hover-menu {
  @apply opacity-100 pointer-events-auto;
}

.menu-item {
  @apply flex items-center gap-2 px-3 py-2 bg-white/20 text-white rounded-lg;
  @apply hover:bg-white/30 transition-colors duration-200;
}

.menu-item.danger {
  @apply bg-red-500/80 hover:bg-red-500;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .cache-item-card {
    @apply flex flex-row h-24;
  }
  
  .cover-container {
    @apply w-32 h-full flex-shrink-0;
  }
  
  .content-info {
    @apply flex-1 p-2;
  }
  
  .title {
    @apply line-clamp-1;
  }
  
  .action-buttons {
    @apply opacity-100 relative bottom-auto right-auto;
    @apply flex-col;
  }
  
  .hover-menu {
    @apply hidden;
  }
}

/* 行限制样式 */
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>