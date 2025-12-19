<template>
  <div class="cache-mixed-list">
    <!-- 空状态 -->
    <Empty
      v-if="displayItems.length === 0"
      :text="
        hasActiveFilters ? $t('cache.list.noResults') : $t('cache.list.empty')
      "
    >
      <template v-if="!hasActiveFilters" #action>
        <button
          class="mt-4 px-4 py-2 bg-(--primary-color) text-white rounded-lg hover:opacity-80 transition-opacity pointer-events-auto"
          @click="$emit('goToImport')"
        >
          <i :class="[$fa.weight, 'fa-download']"></i>
          <span>{{ $t('cache.list.startImport') }}</span>
        </button>
      </template>
    </Empty>

    <!-- 混合列表
         需求 7.5: 滚动页面时保持当前的选择状态
         选择状态由 selectedItems prop 管理，不会因为滚动而改变
    -->
    <div v-else class="flex flex-col gap-1 h-full overflow-y-auto">
      <template v-for="item in displayItems" :key="getItemKey(item)">
        <!-- 单个视频项 -->
        <CacheItemCard
          v-if="item.type === 'video'"
          :item="item.data"
          :selected="selectedItems.has(item.data.id)"
          :in-range-preview="props.rangePreview.includes(item.data.id)"
          @select="$emit('selectVideo', item.data.id)"
          @select-range="$emit('selectVideoRange', $event)"
          @play="$emit('playVideo', item.data)"
          @open-folder="$emit('openVideoFolder', item.data)"
          @delete="$emit('deleteVideo', item.data)"
          @copy="$emit('copyVideo', $event)"
          @cut="$emit('cutVideo', $event)"
        />

        <!-- 视频组项 -->
        <CacheGroupCard
          v-else-if="item.type === 'group'"
          :group="item.data"
          :selected="props.selectedGroups.has(item.data.groupId)"
          :partially-selected="
            props.partiallySelectedGroups.has(item.data.groupId)
          "
          :selected-videos="selectedVideos"
          :in-range-preview="
            props.rangePreviewGroups.includes(item.data.groupId)
          "
          @select="$emit('selectGroup', item.data.groupId)"
          @select-range="$emit('selectGroupRange', $event)"
          @toggle-expand="$emit('toggleExpand', item.data.groupId)"
          @open-folder="$emit('openGroupFolder', item.data)"
          @delete="$emit('deleteGroup', item.data)"
          @copy-group="$emit('copyGroup', $event)"
          @cut-group="$emit('cutGroup', $event)"
          @select-video="$emit('selectVideo', $event)"
          @select-video-range="$emit('selectVideoRange', $event)"
          @play-video="$emit('playVideo', $event)"
          @open-video-folder="$emit('openVideoFolder', $event)"
          @delete-video="$emit('deleteVideo', $event)"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Empty, CacheItemCard, CacheGroupCard } from '@/components';
import type * as Types from '@/types/cache.d';

// ============================================================================
// Props 和 Emits
// ============================================================================

interface Props {
  /** 显示项列表（包含单个视频和组） */
  items: Types.DisplayItem[];
  /** 搜索查询 */
  searchQuery?: string;
  /** 已选择的项目ID集合 */
  selectedItems: Set<string>;
  /** 已选择的子视频ID集合 */
  selectedVideos: Set<string>;
  /** 完全选中的组ID集合 */
  selectedGroups?: Set<string>;
  /** 范围选择预览的视频ID列表 */
  rangePreview?: string[];
  /** 范围选择预览的组ID列表 */
  rangePreviewGroups?: string[];
  /** 部分选中的组ID集合 */
  partiallySelectedGroups?: Set<string>;
  /** 是否有活跃的筛选条件 */
  hasActiveFilters?: boolean;
}

interface Emits {
  // 导航事件
  (e: 'goToImport'): void;

  // 视频相关事件
  (e: 'selectVideo', videoId: string): void;
  (e: 'selectVideoRange', videoId: string): void;
  (e: 'playVideo', video: Types.CacheItem): void;
  (e: 'openVideoFolder', video: Types.CacheItem): void;
  (e: 'deleteVideo', video: Types.CacheItem): void;
  (e: 'copyVideo', video: Types.CacheItem): void;
  (e: 'cutVideo', video: Types.CacheItem): void;

  // 组相关事件
  (e: 'selectGroup', groupId: string): void;
  (e: 'selectGroupRange', groupId: string): void;
  (e: 'toggleExpand', groupId: string): void;
  (e: 'openGroupFolder', group: Types.CacheGroup): void;
  (e: 'deleteGroup', group: Types.CacheGroup): void;
  (e: 'copyGroup', group: Types.CacheGroup): void;
  (e: 'cutGroup', group: Types.CacheGroup): void;
}

const props = withDefaults(defineProps<Props>(), {
  searchQuery: '',
  selectedGroups: () => new Set(),
  rangePreview: () => [],
  rangePreviewGroups: () => [],
  partiallySelectedGroups: () => new Set(),
  hasActiveFilters: false,
});

defineEmits<Emits>();

// ============================================================================
// 计算属性
// ============================================================================

/**
 * 处理后的显示项列表
 * 应用搜索筛选和排序
 */
const displayItems = computed(() => {
  let items = [...props.items];

  // 应用搜索筛选
  if (props.searchQuery && props.searchQuery.trim()) {
    const query = props.searchQuery.toLowerCase().trim();
    items = items.filter((item) => {
      if (item.type === 'video') {
        // 单个视频：搜索标题和UP主
        const video = item.data;
        return (
          video.title.toLowerCase().includes(query) ||
          video.uname.toLowerCase().includes(query)
        );
      } else if (item.type === 'group') {
        // 视频组：搜索组标题、UP主和组内视频标题
        const group = item.data;
        return (
          group.title.toLowerCase().includes(query) ||
          group.uname.toLowerCase().includes(query) ||
          group.videos.some(
            (video) =>
              video.title.toLowerCase().includes(query) ||
              video.uname.toLowerCase().includes(query),
          )
        );
      }
      return false;
    });
  }

  return items;
});

// ============================================================================
// 方法
// ============================================================================

/**
 * 获取项目的唯一键
 */
function getItemKey(item: Types.DisplayItem): string {
  if (item.type === 'video') {
    return `video-${item.data.id}`;
  } else if (item.type === 'group') {
    return `group-${item.data.groupId}`;
  }
  return 'unknown';
}
</script>

<style scoped>
@reference 'tailwindcss';

.cache-mixed-list {
  @apply flex flex-col h-full;
}

/* 列表滚动条样式 */
.cache-mixed-list .overflow-y-auto::-webkit-scrollbar {
  @apply w-2;
}

.cache-mixed-list .overflow-y-auto::-webkit-scrollbar-track {
  @apply bg-gray-100 rounded;
}

.cache-mixed-list .overflow-y-auto::-webkit-scrollbar-thumb {
  @apply bg-gray-400 rounded hover:bg-gray-500;
}

/* 过渡动画 */
.cache-mixed-list .flex-col > * {
  transition: all 0.2s ease;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .cache-mixed-list .gap-1 {
    @apply gap-2;
  }
}
</style>
