<template>
  <Teleport to="body">
    <!-- 模态框遮罩 -->
    <Transition name="modal">
      <div
        v-if="visible"
        class="modal-overlay"
        @click="handleCancel"
      >
        <!-- 对话框容器 -->
        <div
          class="modal-content"
          @click.stop
        >
          <!-- 对话框头部 -->
          <div class="modal-header">
            <h2 class="modal-title">
              <i class="fa-solid fa-trash text-red-500"></i>
              <span class="text-(--content-color)">{{ $t('cache.batchDelete.title') }}</span>
            </h2>
            <button
              class="close-btn"
              @click="handleCancel"
            >
              <i class="fa-solid fa-times"></i>
            </button>
          </div>

          <!-- 对话框内容 -->
          <div class="modal-body space-y-6">
            <!-- 删除项目列表 -->
            <div>
              <h3 class="text-sm font-medium mb-3 text-(--content-color)">
                {{ $t('cache.batchDelete.itemsToDelete', [itemsToDelete.length]) }}
              </h3>

              <!-- 项目列表容器 -->
              <div class="bg-(--solid-button-color) rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                <!-- 组项目 -->
                <div
                  v-for="item in groupItems"
                  :key="`group-${item.groupId}`"
                  class="flex items-start gap-3 p-2 rounded hover:bg-(--hover-color) transition-colors"
                >
                  <div class="flex-shrink-0 mt-1">
                    <i class="fa-solid fa-folder text-blue-500"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium truncate text-(--content-color)">{{ item.title }}</div>
                    <div class="text-xs text-(--desc-color) mt-1">
                      {{ $t('cache.batchDelete.groupVideos', [item.videoCount]) }}
                    </div>
                    <!-- 组内视频列表 -->
                    <div class="mt-2 ml-4 space-y-1">
                      <div
                        v-for="video in item.videos"
                        :key="video.id"
                        class="text-xs text-(--desc-color) flex items-center gap-2"
                      >
                        <i class="fa-solid fa-video text-gray-400"></i>
                        <span class="truncate">{{ video.title }}</span>
                        <span class="text-gray-500 flex-shrink-0">({{ formatFileSize(video.fileSize) }})</span>
                      </div>
                    </div>
                  </div>
                  <div class="flex-shrink-0 text-right">
                    <div class="text-sm font-medium text-(--content-color)">{{ formatFileSize(item.totalFileSize) }}</div>
                  </div>
                </div>

                <!-- 单个视频项目 -->
                <div
                  v-for="item in singleVideoItems"
                  :key="`video-${item.id}`"
                  class="flex items-center gap-3 p-2 rounded hover:bg-(--hover-color) transition-colors"
                >
                  <div class="flex-shrink-0">
                    <i class="fa-solid fa-film text-purple-500"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium truncate text-(--content-color)">{{ item.title }}</div>
                  </div>
                  <div class="flex-shrink-0 text-right">
                    <div class="text-sm font-medium text-(--content-color)">{{ formatFileSize(item.fileSize) }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 统计信息 -->
            <div class="bg-(--solid-button-color) rounded-lg p-4 space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-(--desc-color)">{{ $t('cache.batchDelete.totalItems') }}</span>
                <span class="font-medium text-(--content-color)">{{ itemsToDelete.length }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-(--desc-color)">{{ $t('cache.batchDelete.estimatedSpaceFreed') }}</span>
                <span class="font-medium text-green-600">{{ formatFileSize(totalFileSize) }}</span>
              </div>
              <div class="border-t border-(--split-color) pt-2 mt-2 flex justify-between items-center">
                <span class="text-(--desc-color) font-medium">{{ $t('cache.batchDelete.totalSize') }}</span>
                <span class="font-semibold text-lg text-(--content-color)">{{ formatFileSize(totalFileSize) }}</span>
              </div>
            </div>

            <!-- 删除说明 -->
            <div class="space-y-3">
              <h3 class="text-sm font-medium text-(--content-color)">{{ $t('cache.batchDelete.deleteInfo') }}</h3>
              <div class="p-3 rounded-lg border border-(--split-color) bg-(--solid-button-color)">
                <div class="font-medium text-(--content-color)">{{ $t('cache.batchDelete.deleteAll') }}</div>
                <div class="text-xs text-(--desc-color) mt-1">
                  {{ $t('cache.batchDelete.deleteAllDesc') }}
                </div>
              </div>
            </div>

            <!-- 警告信息 -->
            <div class="warning-box">
              <i class="fa-solid fa-exclamation-triangle text-orange-500 flex-shrink-0 mt-0.5"></i>
              <div class="text-sm text-(--content-color)">
                {{ $t('cache.batchDelete.warning') }}
              </div>
            </div>
          </div>

          <!-- 对话框底部 -->
          <div class="modal-footer flex justify-end gap-3">
            <button
              class="px-4 py-2 rounded-lg border border-(--border-color) text-(--content-color) hover:bg-(--hover-color) transition-colors"
              @click="handleCancel"
            >
              <i class="fa-solid fa-times mr-2"></i>
              {{ $t('cache.batchDelete.cancel') }}
            </button>
            <button
              class="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors font-medium"
              @click="handleConfirm"
            >
              <i class="fa-solid fa-trash mr-2"></i>
              {{ $t('cache.batchDelete.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type * as Types from '@/types/cache.d';
import { formatFileSize } from '@/utils/format';

// ============================================================================
// Props 和 Emits
// ============================================================================

interface Props {
  visible: boolean;
  itemsToDelete: Array<{
    type: 'video' | 'group';
    data: Types.CacheItem | Types.CacheGroup;
  }>;
}

interface Emits {
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// ============================================================================
// 状态
// ============================================================================

// 删除选项已移除，现在只有一种删除方式

// ============================================================================
// 计算属性
// ============================================================================

/**
 * 获取组项目列表
 */
const groupItems = computed(() => {
  return props.itemsToDelete
    .filter((item) => item.type === 'group')
    .map((item) => {
      const group = item.data as Types.CacheGroup;
      return {
        groupId: group.groupId,
        title: group.title,
        videoCount: group.videoCount,
        videos: group.videos,
        totalFileSize: group.totalFileSize,
      };
    });
});

/**
 * 获取单个视频项目列表
 */
const singleVideoItems = computed(() => {
  return props.itemsToDelete
    .filter((item) => item.type === 'video')
    .map((item) => item.data as Types.CacheItem);
});

/**
 * 计算总文件大小
 */
const totalFileSize = computed(() => {
  return props.itemsToDelete.reduce((sum, item) => {
    if (item.type === 'group') {
      return sum + (item.data as Types.CacheGroup).totalFileSize;
    } else {
      return sum + (item.data as Types.CacheItem).fileSize;
    }
  }, 0);
});

// ============================================================================
// 方法
// ============================================================================



/**
 * 处理确认按钮
 */
function handleConfirm() {
  emit('confirm');
}

/**
 * 处理取消按钮
 */
function handleCancel() {
  emit('cancel');
}
</script>

<style scoped>
@reference 'tailwindcss';

/* 模态框遮罩 */
.modal-overlay {
  @apply fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4;
}

/* 模态框内容 */
.modal-content {
  @apply bg-(--solid-block-color) rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col;
}

/* 标题栏 */
.modal-header {
  @apply flex items-center justify-between p-6 border-b border-(--split-color) bg-(--solid-block-color);
}

.modal-title {
  @apply text-xl font-bold flex items-center gap-2 text-(--content-color);
}

.close-btn {
  @apply w-8 h-8 rounded-full flex items-center justify-center;
  @apply text-(--desc-color) hover:text-(--text-color) hover:bg-(--hover-color);
  @apply transition-colors duration-200;
}

/* 主体内容 */
.modal-body {
  @apply flex-1 p-6 overflow-y-auto;
}

/* 底部按钮 */
.modal-footer {
  @apply p-6 border-t border-(--split-color) bg-(--solid-block-color);
}

/* 过渡动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--desc-color);
}

/* 警告框样式 */
.warning-box {
  @apply bg-(--solid-button-color) border border-orange-400/50 rounded-lg p-4 flex gap-3;
  @apply text-(--content-color);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .modal-content {
    @apply max-w-full m-2;
  }

  .modal-header {
    @apply p-4;
  }

  .modal-body {
    @apply p-4;
  }

  .modal-footer {
    @apply p-4;
  }

  .modal-footer .flex {
    @apply flex-col gap-2;
  }
}
</style>
