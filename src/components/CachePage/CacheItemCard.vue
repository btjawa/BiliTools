<template>
  <div
    class="flex gap-4 p-3 rounded-lg my-px bg-(--block-color) text-sm h-[120px] relative cursor-pointer"
    :class="{
      'border-2 border-(--primary-color)': selected,
      'opacity-60': item.status === 'unavailable',
      'border border-yellow-500': item.status === 'incomplete',
    }"
    @click="$emit('select')"
  >
    <!-- 封面图片区域 -->
    <div class="relative flex rounded-lg min-w-40 overflow-hidden">
      <div
        class="relative rounded-lg overflow-hidden cursor-pointer"
        style="
          min-width: 160px;
          width: fit-content;
          height: 96px;
          display: flex;
        "
      >
        <!-- 优先使用本地封面，回退到网络封面，最后显示占位符 -->
        <div
          v-if="!coverSrc"
          class="w-full h-full bg-(--block-color) flex items-center justify-center"
        >
          <i class="fa-solid fa-image text-2xl text-(--desc-color)"></i>
        </div>
        <Image
          v-else
          :src="coverSrc"
          :height="96"
          :width="160"
          :prevent="true"
          class="object-cover z-10"
          style="height: 96px; width: 160px; max-width: 100%"
        />
      </div>
      <!-- 渐变遮罩 -->
      <div
        class="absolute w-full h-full z-10 bg-gradient-to-b from-transparent to-black/50"
      ></div>
      <!-- 进度条 (示例进度，可以根据实际需求调整) -->
      <div
        class="progress relative flex-1 rounded-full bg-(--button-color) h-1.5 w-64 mx-2 absolute! h-1! w-full z-20 bottom-0"
        style="--progress: 54.7%"
      ></div>
    </div>

    <!-- 内容信息区域 -->
    <div class="w-full flex flex-col gap-1 min-w-0">
      <!-- 标题 -->
      <h2 class="text-base truncate" :title="item.title">{{ item.title }}</h2>

      <!-- 下载完成时间 -->
      <div class="desc">
        <i class="fa-solid fa-clock"></i>
        <span>{{ formatDownloadTime(item.downloadTime) }}</span>
      </div>

      <!-- 时长信息 -->
      <div class="desc">
        <i class="fa-solid fa-marker"></i>
        <span>{{ duration(item.duration) }}</span>
      </div>
    </div>

    <!-- UP主名称 -->
    <a class="text-xs text-nowrap mb-auto" :title="item.uname">{{
      item.uname
    }}</a>

    <!-- 所有操作按钮 -->
    <div class="absolute bottom-3 right-3 z-20 flex gap-1">
      <button
        class="flex items-center gap-1 px-2 py-1 rounded text-xs bg-(--primary-color) text-white hover:bg-(--primary-color-hover) transition-colors"
        :disabled="item.status === 'unavailable'"
        @click.stop="$emit('play', item)"
      >
        <i class="fa-solid fa-play"></i>
        <span>{{ $t('cache.card.play') }}</span>
      </button>

      <button
        class="flex items-center gap-1 px-2 py-1 rounded text-xs bg-(--primary-color) text-white hover:bg-(--primary-color-hover) transition-colors"
        :title="$t('cache.card.openFolder')"
        @click.stop="$emit('openFolder', item)"
      >
        <i class="fa-solid fa-folder-open"></i>
        <span>{{ $t('cache.card.openFolder') }}</span>
      </button>

      <button
        class="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-500 text-white hover:bg-red-600 transition-colors"
        :title="$t('cache.card.delete')"
        @click.stop="$emit('delete', item)"
      >
        <i class="fa-solid fa-trash"></i>
        <span>{{ $t('cache.card.delete') }}</span>
      </button>
    </div>

    <!-- 选择复选框 -->
    <div
      class="absolute top-2 left-2 z-30 opacity-0 hover:opacity-100 transition-opacity"
    >
      <input
        type="checkbox"
        :checked="selected"
        class="w-4 h-4"
        @click.stop
        @change="$emit('select')"
      />
    </div>

    <!-- 状态标识 -->
    <div
      v-if="item.status !== 'available'"
      class="absolute top-2 right-2 z-20 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
      :class="{
        'bg-red-500': item.status === 'unavailable',
        'bg-yellow-500': item.status === 'incomplete',
      }"
    >
      <i :class="statusIcon"></i>
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

const statusIcon = computed(() => {
  const iconMap = {
    available: 'fa-solid fa-check-circle',
    unavailable: 'fa-solid fa-times-circle',
    incomplete: 'fa-solid fa-exclamation-triangle',
  };
  return iconMap[props.item.status] ?? 'fa-solid fa-question-circle';
});

// 封面路径状态
const coverSrc = ref<string | null>(null);

// 异步加载封面路径
async function loadCoverSrc() {
  // 1. 优先尝试本地封面文件
  const localCoverPath = await getLocalCoverPath(props.item.cachePath);
  if (localCoverPath) {
    coverSrc.value = localCoverPath;
    return;
  }

  // 2. 如果有网络连接，使用原始封面URL
  if (props.item.coverUrl && !props.item.coverUrl.startsWith('file://')) {
    coverSrc.value = props.item.coverUrl;
    return;
  }

  // 3. 无可用封面
  coverSrc.value = null;
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
 * 获取本地封面路径
 */
async function getLocalCoverPath(cachePath: string): Promise<string | null> {
  if (!cachePath) return null;

  try {
    // 调用缓存服务检查本地封面文件
    return await checkLocalCover(cachePath);
  } catch (error) {
    console.warn('检查本地封面失败:', error);
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

// 监听缓存路径变化
watch(
  () => props.item.cachePath,
  () => {
    loadCoverSrc();
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
