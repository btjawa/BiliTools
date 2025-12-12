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
      <div
        class="relative rounded-lg overflow-hidden cursor-pointer flex items-center justify-center"
        style="width: 160px; height: 90px"
      >
        <!-- 优先使用组封面，回退到第一个视频封面，最后显示占位符 -->
        <div
          v-if="!coverSrc || coverError"
          class="w-full h-full bg-(--block-color) flex items-center justify-center"
        >
          <i class="fa-solid fa-images text-2xl text-(--desc-color)"></i>
        </div>
        <img
          v-else
          :src="coverSrc"
          class="z-10 min-w-full min-h-full object-cover"
          @error="handleCoverError"
        />
      </div>
      <!-- 渐变遮罩 -->
      <div
        class="absolute w-full h-full z-10 bg-gradient-to-b from-transparent to-black/50"
      ></div>
      <!-- 组标识徽章 -->
      <div
        class="absolute top-2 left-2 z-20 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium"
      >
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
        <span
          >{{ $t('cache.group.totalDuration') }}
          {{ duration(group.totalDuration) }}</span
        >
      </div>

      <!-- 最新下载时间 -->
      <div class="desc">
        <i class="fa-solid fa-clock"></i>
        <span>{{ formatDownloadTime(group.latestDownloadTime) }}</span>
      </div>
    </div>

    <!-- UP主名称 -->
    <a class="text-xs text-nowrap mb-auto" :title="group.uname">{{
      group.uname
    }}</a>

    <!-- 所有操作按钮 -->
    <div class="absolute bottom-3 right-3 z-20 flex gap-1">
      <!-- 展开/折叠按钮 -->
      <button
        class="flex items-center gap-1 px-2 py-1 rounded text-xs bg-(--primary-color) text-white hover:bg-(--primary-color-hover) transition-colors"
        @click.stop="$emit('toggleExpand', group.groupId)"
      >
        <i
          :class="
            group.isExpanded
              ? 'fa-solid fa-chevron-up'
              : 'fa-solid fa-chevron-down'
          "
        ></i>
        <span>{{
          group.isExpanded
            ? $t('cache.group.collapse')
            : $t('cache.group.expand')
        }}</span>
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
    <div
      class="absolute top-2 right-2 z-30 opacity-0 hover:opacity-100 transition-opacity"
    >
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
        'border border-yellow-500': video.status === 'incomplete',
      }"
      @click="$emit('selectVideo', video.id)"
    >
      <!-- 子视频封面 -->
      <div
        class="relative shrink-0 rounded-lg overflow-hidden flex items-center justify-center w-[128px] h-[72px]"
      >
        <div
          v-if="!getVideoCoverSrc(video)"
          class="w-full h-full bg-(--block-color) flex items-center justify-center"
        >
          <i class="fa-solid fa-image text-lg text-(--desc-color)"></i>
        </div>
        <img
          v-else
          :src="getVideoCoverSrc(video)"
          class="z-10 min-w-full min-h-full object-cover"
        />
        <!-- 进度条 -->
        <div
          class="progress relative flex-1 rounded-full bg-(--button-color) h-1 w-full absolute bottom-0 z-10"
          style="--progress: 54.7%"
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
      <a class="text-xs text-nowrap mb-auto" :title="video.uname">{{
        video.uname
      }}</a>

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
      <div
        class="absolute top-1 left-1 z-30 opacity-0 hover:opacity-100 transition-opacity"
      >
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
          'bg-yellow-500': video.status === 'incomplete',
        }"
      >
        <i :class="getVideoStatusIcon(video.status)" class="text-xs"></i>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { duration } from '@/services/utils';
import { checkLocalCover } from '@/services/cache';
import type * as Types from '@/types/cache.d';

const { t } = useI18n();

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
  return props.group.videos.some((video) => video.status !== 'available');
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
const coverError = ref(false);

// 子视频封面状态管理（使用 Map 存储每个视频的封面）
const videoCoverMap = reactive<Map<string, string | null>>(new Map());

// 加载组封面（后端已按优先级返回: group.jpg > group.png > image.jpg > image.png）
function loadCoverSrc() {
  coverError.value = false;
  // 直接使用后端返回的封面URL（已是 base64 data URL）
  coverSrc.value = props.group.coverUrl || null;
}

/**
 * 处理封面加载错误
 */
function handleCoverError() {
  coverError.value = true;
}

/**
 * 异步加载子视频封面
 */
async function loadVideoCover(video: Types.CacheItem): Promise<void> {
  // 如果已经加载过，跳过
  if (videoCoverMap.has(video.id)) return;

  // 先设置为 null 表示正在加载
  videoCoverMap.set(video.id, null);

  try {
    // 1. 优先尝试本地封面文件
    if (video.cachePath) {
      const localCover = await checkLocalCover(video.cachePath);
      if (localCover) {
        videoCoverMap.set(video.id, localCover);
        return;
      }
    }

    // 2. 回退到网络封面URL
    if (video.coverUrl && !video.coverUrl.startsWith('file://')) {
      videoCoverMap.set(video.id, video.coverUrl);
      return;
    }

    // 3. 无可用封面
    videoCoverMap.set(video.id, null);
  } catch (error) {
    console.warn('加载子视频封面失败:', video.id, error);
    videoCoverMap.set(video.id, null);
  }
}

/**
 * 加载所有子视频封面（展开时调用）
 */
async function loadAllVideoCovers(): Promise<void> {
  if (!props.group.isExpanded) return;

  // 并行加载所有子视频封面
  await Promise.all(props.group.videos.map((video) => loadVideoCover(video)));
}

/**
 * 获取子视频的封面路径（从缓存中获取）
 */
function getVideoCoverSrc(video: Types.CacheItem): string | undefined {
  return videoCoverMap.get(video.id) ?? undefined;
}

// ============================================================================
// 方法
// ============================================================================

/**
 * 格式化下载完成时间
 */
function formatDownloadTime(date: Date): string {
  // 处理异常时间戳
  if (!date) {
    return t('cache.time.unknown');
  }

  const importDate = date instanceof Date ? date : new Date(date);
  
  // 检查转换后的 Date 对象是否有效
  if (isNaN(importDate.getTime())) {
    return t('cache.time.unknown');
  }

  // 检查年份是否合理（1970-2100）
  const year = importDate.getFullYear();
  if (year < 1970 || year > 2100) {
    return t('cache.time.formatError');
  }

  const month = String(importDate.getMonth() + 1).padStart(2, '0');
  const day = String(importDate.getDate()).padStart(2, '0');
  const hours = String(importDate.getHours()).padStart(2, '0');
  const minutes = String(importDate.getMinutes()).padStart(2, '0');
  const seconds = String(importDate.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// ============================================================================
// 生命周期
// ============================================================================

// 组件挂载时加载封面
onMounted(() => {
  loadCoverSrc();
  // 如果组已展开，加载子视频封面
  if (props.group.isExpanded) {
    loadAllVideoCovers();
  }
});

// 监听组数据变化
watch(
  () => props.group,
  () => {
    loadCoverSrc();
  },
  { deep: true },
);

// 监听展开状态变化，展开时加载子视频封面
watch(
  () => props.group.isExpanded,
  (isExpanded) => {
    if (isExpanded) {
      loadAllVideoCovers();
    }
  },
);
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
