<template>
  <div
    class="flex gap-4 p-3 rounded-lg my-px bg-(--block-color) text-sm h-[120px] relative cursor-pointer"
    :class="{
      'border-2 border-(--primary-color)': selected,
      'opacity-60': item.status === 'unavailable',
      'border border-yellow-500': item.status === 'incomplete'
    }"
    @click="$emit('select')"
  >
    <!-- 封面图片区域 -->
    <div class="relative flex rounded-lg min-w-40 overflow-hidden">
      <div class="relative rounded-lg overflow-hidden cursor-pointer" style="min-width: 160px; width: fit-content; height: 96px; display: flex;">
        <Image
          :src="item.coverUrl"
          :height="96"
          :width="160"
          class="object-cover z-10"
          style="height: 96px; width: 160px; max-width: 100%;"
        />
      </div>
      <!-- 渐变遮罩 -->
      <div class="absolute w-full h-full z-10 bg-gradient-to-b from-transparent to-black/50"></div>
      <!-- 进度条 (示例进度，可以根据实际需求调整) -->
      <div 
        class="progress relative flex-1 rounded-full bg-(--button-color) h-1.5 w-64 mx-2 absolute! h-1! w-full z-20 bottom-0"
        style="--progress: 54.7%;"
      ></div>
    </div>

    <!-- 内容信息区域 -->
    <div class="w-full flex flex-col gap-1 min-w-0">
      <!-- 标题 -->
      <h2 class="text-base truncate" :title="item.title">{{ item.title }}</h2>
      
      <!-- 导入时间 -->
      <div class="desc">
        <i class="fa-solid fa-clock"></i>
        <span>{{ formatImportTime(item.importTime) }}</span>
      </div>
      
      <!-- 时长信息 -->
      <div class="desc">
        <i class="fa-solid fa-marker"></i>
        <span>{{ duration(item.duration) }}</span>
      </div>
    </div>

    <!-- UP主名称 -->
    <a class="text-xs text-nowrap mb-auto" :title="item.uname">{{ item.uname }}</a>

    <!-- 操作按钮 -->
    <button 
      class="absolute right-3 bottom-3 flex items-center gap-1 px-2 py-1 rounded text-xs bg-(--primary-color) text-white hover:bg-(--primary-color-hover) transition-colors"
      @click.stop="$emit('play', item)"
      :disabled="item.status === 'unavailable'"
    >
      <i class="fa-solid fa-play"></i>
      <span>{{ $t('cache.card.play') }}</span>
    </button>

    <!-- 选择复选框 -->
    <div class="absolute top-2 left-2 z-30 opacity-0 hover:opacity-100 transition-opacity">
      <input
        type="checkbox"
        :checked="selected"
        @click.stop
        @change="$emit('select')"
        class="w-4 h-4"
      />
    </div>

    <!-- 状态标识 -->
    <div 
      v-if="item.status !== 'available'"
      class="absolute top-2 right-2 z-20 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
      :class="{
        'bg-red-500': item.status === 'unavailable',
        'bg-yellow-500': item.status === 'incomplete'
      }"
    >
      <i :class="statusIcon"></i>
    </div>

    <!-- 右键菜单或悬浮菜单 -->
    <div class="absolute top-2 right-8 z-20 opacity-0 hover:opacity-100 transition-opacity flex gap-1">
      <button
        class="w-6 h-6 rounded-full bg-blue-500 text-white text-xs hover:bg-blue-600"
        @click.stop="$emit('openFolder', item)"
        :title="$t('cache.card.openFolder')"
      >
        <i class="fa-solid fa-folder-open"></i>
      </button>
      
      <button
        class="w-6 h-6 rounded-full bg-red-500 text-white text-xs hover:bg-red-600"
        @click.stop="$emit('delete', item)"
        :title="$t('cache.card.delete')"
      >
        <i class="fa-solid fa-trash"></i>
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
  const importDate = new Date(date);
  const year = importDate.getFullYear();
  const month = String(importDate.getMonth() + 1).padStart(2, '0');
  const day = String(importDate.getDate()).padStart(2, '0');
  const hours = String(importDate.getHours()).padStart(2, '0');
  const minutes = String(importDate.getMinutes()).padStart(2, '0');
  const seconds = String(importDate.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
</script>

<style scoped>
@reference 'tailwindcss';

/* 进度条样式 */
.progress::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: var(--progress);
  background: linear-gradient(90deg, #3b82f6, #06b6d4);
  border-radius: inherit;
  transition: width 0.3s ease;
}

/* 悬浮效果 */
div:hover {
  @apply shadow-lg transition-all duration-200;
}

/* 操作按钮样式 */
button {
  @apply flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors;
}

button:hover {
  @apply bg-(--hover-color);
}

button:disabled {
  @apply opacity-50 cursor-not-allowed;
}

/* 描述文本样式 */
.desc {
  @apply flex items-center gap-1 text-(--desc-color);
}

.desc i {
  @apply w-3 text-center;
}

/* 截断文本 */
.truncate {
  @apply overflow-hidden whitespace-nowrap text-ellipsis;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .cache-item-card {
    @apply h-auto min-h-[100px] flex-col gap-2;
  }
  
  .cache-item-card .relative:first-child {
    @apply w-full min-w-0;
  }
  
  .cache-item-card .relative:first-child > div {
    @apply w-full h-24;
  }
  
  .cache-item-card .relative:first-child img {
    @apply w-full h-24;
  }
}
</style>