<template>
  <div
    class="flex gap-4 p-3 rounded-lg my-px bg-(--block-color) text-sm h-[120px] relative cursor-pointer"
    :class="{
      'border-2 border-(--primary-color)': selected,
      'opacity-60': hasUnavailableVideos,
    }"
    @click="$emit('select')"
  >
    <!-- 封面图片区域 -->
    <div class="relative flex rounded-lg min-w-40 overflow-hidden">
      <div class="relative rounded-lg overflow-hidden cursor-pointer" style="min-width: 160px; width: fit-content; height: 96px; display: flex;">
        <!-- 优先使用组封面，回退到第一个视频封面，最后显示占位符 -->
        <div v-if="!coverSrc" class="w-full h-full bg-(--block-color) flex items-center justify-center">
          <i class="fa-solid fa-images text-2xl text-(--desc-color)"></i>
        </div>
        <Image
          v-else
          :src="coverSrc"
          :height="96"
          :width="160"
          :prevent="true"
          class="object-cover z-10"
          style="height: 96px; width: 160px; max-width: 100%;"
        />
      </div>
      <!-- 渐变遮罩 -->
      <div class="absolute w-full h-full z-10 bg-gradient-to-b from-transparent to-black/50"></div>
      <!-- 组标识徽章 -->
      <div class="absolute top-2 left-2 z-20 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
        <i class="fa-solid fa-folder mr-1"></i>
        {{ $t('cache.group.collection') }}
      </div>
    </div>

    <!-- 内容信息区域 -->
    <div class="w-full flex flex-col gap-1 min-w-0">
      <!-- 组标题 -->
      <h2 class="text-base truncate" :title="group.title">{{ group.title }}</h2>
      
      <!-- 视频数量和总时长 -->
      <div class="desc">
        <i class="fa-solid fa-video"></i>
        <span>{{ $t('cache.group.videoCount', [group.videoCount]) }}</span>
        <span class="mx-1">·</span>
        <span>{{ $t('cache.group.totalDuration') }} {{ duration(group.totalDuration) }}</span>
      </div>
      
      <!-- 最新下载时间 -->
      <div class="desc">
        <i class="fa-solid fa-clock"></i>
        <span>{{ formatDownloadTime(group.latestDownloadTime) }}</span>
      </div>
    </div>

    <!-- UP主名称 -->
    <a class="text-xs text-nowrap mb-auto" :title="group.uname">{{ group.uname }}</a>

    <!-- 所有操作按钮 -->
    <div class="absolute bottom-3 right-3 z-20 flex gap-1">
      <!-- 展开/折叠按钮 -->
      <button 
        class="flex items-center gap-1 px-2 py-1 rounded text-xs bg-(--primary-color) text-white hover:bg-(--primary-color-hover) transition-colors"
        @click.stop="$emit('toggleExpand', group.groupId)"
      >
        <i :class="group.isExpanded ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
        <span>{{ group.isExpanded ? $t('cache.group.collapse') : $t('cache.group.expand') }}</span>
      </button>

      <button
        class="flex items-center gap-1 px-2 py-1 rounded text-xs bg-(--primary-color) text-white hover:bg-(--primary-color-hover) transition-colors"
        :title="$t('cache.card.openFolder')"
        @click.stop="$emit('openFolder', group)"
      >
        <i class="fa-solid fa-folder-open"></i>
        <span>{{ $t('cache.card.openFolder') }}</span>
      </button>
      
      <button
        class="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-500 text-white hover:bg-red-600 transition-colors"
        :title="$t('cache.card.delete')"
        @click.stop="$emit('delete', group)"
      >
        <i class="fa-solid fa-trash"></i>
        <span>{{ $t('cache.card.delete') }}</span>
      </button>
    </div>

    <!-- 选择复选框 -->
    <div class="absolute top-2 right-2 z-30 opacity-0 hover:opacity-100 transition-opacity">
      <input
        type="checkbox"
        :checked="selected"
        class="w-4 h-4"
        @click.stop
        @change="$emit('select')"
      />
    </div>

    <!-- 状态标识（如果组内有不可用视频） -->
    <div 
      v-if="hasUnavailableVideos"
      class="absolute top-2 right-8 z-20 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs bg-yellow-500"
      :title="$t('cache.group.hasUnavailableVideos')"
    >
      <i class="fa-solid fa-exclamation-triangle"></i>
    </div>
  </div>

  <!-- 展开的子视频列表 -->
  <div v-if="group.isExpanded" class="ml-4 mt-2 space-y-2">
    <div
      v-for="video in group.videos"
      :key="video.id"
      class="flex gap-3 p-2 rounded-lg bg-(--block-color) text-sm h-[96px] relative cursor-pointer border-l-4 border-(--primary-color)"
      :class="{
        'border-2 border-(--primary-color)': selectedVideos.has(video.id),
        'opacity-60': video.status === 'unavailable',
        'border border-yellow-500': video.status === 'incomplete'
      }"
      @click="$emit('selectVideo', video.id)"
    >
      <!-- 子视频封面 -->
      <div class="relative flex rounded-lg overflow-hidden" style="min-width: 128px; width: 128px; height: 72px;">
        <div v-if="!getVideoCoverSrc(video)" class="w-full h-full bg-(--block-color) flex items-center justify-center">
          <i class="fa-solid fa-image text-lg text-(--desc-color)"></i>
        </div>
        <Image
          v-else
          :src="getVideoCoverSrc(video)"
          :height="72"
          :width="128"
          :prevent="true"
          class="object-cover"
          style="height: 72px; width: 128px;"
        />
        <!-- 进度条 -->
        <div 
          class="progress relative flex-1 rounded-full bg-(--button-color) h-1 w-full absolute bottom-0 z-10"
          style="--progress: 54.7%;"
        ></div>
      </div>

      <!-- 子视频内容 -->
      <div class="w-full flex flex-col gap-1 min-w-0">
        <h3 class="text-sm truncate" :title="video.title">{{ video.title }}</h3>
        <div class="desc text-xs">
          <i class="fa-solid fa-clock"></i>
          <span>{{ formatDownloadTime(video.downloadTime) }}</span>
        </div>
        <div class="desc text-xs">
          <i class="fa-solid fa-marker"></i>
          <span>{{ duration(video.duration) }}</span>
        </div>
      </div>

      <!-- 子视频UP主 -->
      <a class="text-xs text-nowrap mb-auto" :title="video.uname">{{ video.uname }}</a>

      <!-- 子视频操作按钮 -->
      <div class="absolute bottom-2 right-2 z-20 flex gap-1">
        <button 
          class="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-(--primary-color) text-white hover:bg-(--primary-color-hover) transition-colors"
          :disabled="video.status === 'unavailable'"
          @click.stop="$emit('playVideo', video)"
        >
          <i class="fa-solid fa-play"></i>
        </button>

        <button
          class="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-(--primary-color) text-white hover:bg-(--primary-color-hover) transition-colors"
          @click.stop="$emit('openVideoFolder', video)"
        >
          <i class="fa-solid fa-folder-open"></i>
        </button>
        
        <button
          class="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-red-500 text-white hover:bg-red-600 transition-colors"
          @click.stop="$emit('deleteVideo', video)"
        >
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>

      <!-- 子视频选择复选框 -->
      <div class="absolute top-1 left-1 z-30 opacity-0 hover:opacity-100 transition-opacity">
        <input
          type="checkbox"
          :checked="selectedVideos.has(video.id)"
          class="w-3 h-3"
          @click.stop
          @change="$emit('selectVideo', video.id)"
        />
      </div>

      <!-- 子视频状态标识 -->
      <div 
        v-if="video.status !== 'available'"
        class="absolute top-1 right-1 z-20 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs"
        :class="{
          'bg-red-500': video.status === 'unavailable',
          'bg-yellow-500': video.status === 'incomplete'
        }"
      >
        <i :class="getVideoStatusIcon(video.status)" class="text-xs"></i>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { duration } from '@/services/utils';
import { checkLocalCover } from '@/services/cache';
import { Image } from '@/components';
import type * as Types from '@/types/cache.d';

// ============================================================================
// Props 和 Emits
// ============================================================================

interface Props {
  group: Types.CacheGroup;
  selected: boolean;
  selectedVideos: Set<string>;
}

interface Emits {
  (e: 'select'): void;
  (e: 'toggleExpand', groupId: string): void;
  (e: 'openFolder', group: Types.CacheGroup): void;
  (e: 'delete', group: Types.CacheGroup): void;
  (e: 'selectVideo', videoId: string): void;
  (e: 'playVideo', video: Types.CacheItem): void;
  (e: 'openVideoFolder', video: Types.CacheItem): void;
  (e: 'deleteVideo', video: Types.CacheItem): void;
}

const props = defineProps<Props>();
defineEmits<Emits>();

// ============================================================================
// 计算属性
// ============================================================================

/**
 * 检查组内是否有不可用的视频
 */
const hasUnavailableVideos = computed(() => {
  return props.group.videos.some(video => video.status !== 'available');
});

/**
 * 获取视频状态图标
 */
function getVideoStatusIcon(status: Types.CacheStatus): string {
  const iconMap = {
    available: 'fa-solid fa-check-circle',
    unavailable: 'fa-solid fa-times-circle',
    incomplete: 'fa-solid fa-exclamation-triangle',
  };
  return iconMap[status] ?? 'fa-solid fa-question-circle';
}

// 封面路径状态
const coverSrc = ref<string | null>(null);

// 异步加载组封面路径
async function loadCoverSrc() {
  // 1. 优先尝试组封面文件 (group.jpg)
  if (props.group.videos.length > 0) {
    const groupCoverPath = await getGroupCoverPath(props.group.videos[0].cachePath);
    if (groupCoverPath) {
      coverSrc.value = groupCoverPath;
      return;
    }
  }
  
  // 2. 回退到组的封面URL（可能是第一个视频的封面）
  if (props.group.coverUrl && !props.group.coverUrl.startsWith('file://')) {
    coverSrc.value = props.group.coverUrl;
    return;
  }
  
  // 3. 无可用封面
  coverSrc.value = null;
}

/**
 * 获取子视频的封面路径
 */
function getVideoCoverSrc(video: Types.CacheItem): string | null {
  // 对于子视频，直接使用其封面URL
  return video.coverUrl || null;
}

// ============================================================================
// 方法
// ============================================================================

/**
 * 格式化下载完成时间
 */
function formatDownloadTime(date: Date): string {
  // 处理异常时间戳
  if (!date || isNaN(date.getTime())) {
    return '未知时间';
  }
  
  const importDate = new Date(date);
  
  // 检查年份是否合理（1970-2100）
  const year = importDate.getFullYear();
  if (year < 1970 || year > 2100) {
    return '时间格式错误';
  }
  
  const month = String(importDate.getMonth() + 1).padStart(2, '0');
  const day = String(importDate.getDate()).padStart(2, '0');
  const hours = String(importDate.getHours()).padStart(2, '0');
  const minutes = String(importDate.getMinutes()).padStart(2, '0');
  const seconds = String(importDate.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 获取组封面路径（优先查找group.jpg）
 */
async function getGroupCoverPath(cachePath: string): Promise<string | null> {
  if (!cachePath) return null;
  
  try {
    // 尝试查找group.jpg文件
    const groupCoverPath = cachePath.replace(/[^/\\]+$/, 'group.jpg');
    const localCover = await checkLocalCover(groupCoverPath);
    if (localCover) {
      return localCover;
    }
    
    // 回退到视频封面
    return await checkLocalCover(cachePath);
  } catch (error) {
    console.warn('检查组封面失败:', error);
    return null;
  }
}

// ============================================================================
// 生命周期
// ============================================================================

// 组件挂载时加载封面
onMounted(() => {
  loadCoverSrc();
});

// 监听组数据变化
watch(() => props.group, () => {
  loadCoverSrc();
}, { deep: true });
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

/* 子视频样式调整 */
.space-y-2 > * + * {
  margin-top: 0.5rem;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .cache-group-card {
    @apply h-auto min-h-[100px] flex-col gap-2;
  }
  
  .cache-group-card .relative:first-child {
    @apply w-full min-w-0;
  }
  
  .cache-group-card .relative:first-child > div {
    @apply w-full h-24;
  }
  
  .cache-group-card .relative:first-child img {
    @apply w-full h-24;
  }
}
</style>