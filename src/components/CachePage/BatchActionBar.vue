<template>
  <div class="bg-(--block-color) rounded-lg p-4">
    <div class="flex items-center justify-between gap-4">
      <!-- 左侧：选择信息和操作 -->
      <div class="flex items-center gap-4 flex-1">
        <!-- 选择数量显示 -->
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">
            {{ $t('cache.list.selectedCount', [selectedCount]) }}
          </span>
          <!-- 显示选择详情（组和单个视频） -->
          <div v-if="showGroupDetails" class="text-xs text-(--desc-color)">
            <span v-if="selectedGroupCount > 0">
              {{ selectedGroupCount }}{{ $t('cache.sidebar.groups') }}
            </span>
            <span v-if="selectedGroupCount > 0 && selectedVideoCount > 0">
              ，
            </span>
            <span v-if="selectedVideoCount > 0">
              {{ selectedVideoCount }}{{ $t('cache.sidebar.singleVideos') }}
            </span>
          </div>
        </div>

        <!-- 全选/取消全选按钮 -->
        <div
          class="flex items-center gap-2 border-l border-(--border-color) pl-4"
        >
          <button
            class="px-3 py-1 text-sm bg-(--input-bg) border border-(--border-color) rounded hover:bg-(--hover-color) transition-colors flex items-center gap-1"
            :title="
              isAllSelected
                ? $t('cache.list.unselectAll')
                : $t('cache.list.selectAll')
            "
            @click="handleSelectAllClick"
          >
            <!-- 复选框状态显示 -->
            <span class="flex items-center justify-center w-4 h-4">
              <i
                v-if="isAllSelected"
                :class="[$fa.weight, 'fa-times']"
                class="text-xs text-(--primary-color)"
              ></i>
              <i
                v-else-if="isPartiallySelected"
                :class="[$fa.weight, 'fa-list-check']"
                class="text-xs text-(--primary-color)"
              ></i>
              <i
                v-else
                :class="[$fa.weight, 'fa-square']"
                class="text-xs text-(--desc-color)"
              ></i>
            </span>
            <span>{{
              isAllSelected
                ? $t('cache.list.unselectAll')
                : $t('cache.list.selectAll')
            }}</span>
          </button>

          <!-- 清除选择按钮 -->
          <button
            class="text-sm text-(--primary-color) hover:underline"
            @click="handleClearSelection"
          >
            {{ $t('cache.list.clearSelection') }}
          </button>
        </div>
      </div>

      <!-- 右侧：批量操作按钮 -->
      <div class="flex gap-2">
        <!-- 复制按钮 -->
        <button
          class="px-4 py-2 text-sm bg-(--primary-color) text-white rounded hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          :disabled="selectedCount === 0"
          :title="
            selectedCount === 0
              ? $t('transfer.copy') + ' (无选中项)'
              : $t('transfer.copy')
          "
          @click="handleBatchCopy"
        >
          <i :class="[$fa.weight, 'fa-copy']"></i>
          <span>{{ $t('transfer.copy') }}</span>
          <span v-if="selectedCount > 0" class="text-xs opacity-75"
            >({{ selectedCount }})</span
          >
        </button>

        <!-- 剪切按钮 -->
        <button
          class="px-4 py-2 text-sm bg-orange-500 text-white rounded hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          :disabled="selectedCount === 0"
          :title="
            selectedCount === 0
              ? $t('transfer.cut') + ' (无选中项)'
              : $t('transfer.cut')
          "
          @click="handleBatchCut"
        >
          <i :class="[$fa.weight, 'fa-scissors']"></i>
          <span>{{ $t('transfer.cut') }}</span>
          <span v-if="selectedCount > 0" class="text-xs opacity-75"
            >({{ selectedCount }})</span
          >
        </button>

        <!-- 删除按钮 -->
        <button
          class="px-4 py-2 text-sm bg-red-500 text-white rounded hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          :disabled="selectedCount === 0"
          :title="
            selectedCount === 0
              ? $t('cache.list.batchDelete') + ' (无选中项)'
              : $t('cache.list.batchDelete')
          "
          @click="handleBatchDelete"
        >
          <i :class="[$fa.weight, 'fa-trash']"></i>
          <span>{{ $t('cache.list.batchDelete') }}</span>
          <span v-if="selectedCount > 0" class="text-xs opacity-75"
            >({{ selectedCount }})</span
          >
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useCacheStore } from '@/store/cache';

// ============================================================================
// Props and Emits
// ============================================================================

interface Props {
  /** 是否显示操作栏 */
  visible: boolean;
  /** 是否显示组和单个视频的详细信息 */
  showGroupDetails?: boolean;
}

interface Emits {
  /** 全选事件 */
  selectAll: [];
  /** 取消全选事件 */
  unselectAll: [];
  /** 清除选择事件 */
  clearSelection: [];
  /** 批量复制事件 */
  batchCopy: [];
  /** 批量剪切事件 */
  batchCut: [];
  /** 批量删除事件 */
  batchDelete: [];
}

withDefaults(defineProps<Props>(), {
  showGroupDetails: true,
});

const emit = defineEmits<Emits>();

// ============================================================================
// 依赖注入
// ============================================================================

const { t: $t } = useI18n();
const cacheStore = useCacheStore();

// ============================================================================
// 计算属性
// ============================================================================

/**
 * 选中项目总数
 */
const selectedCount = computed(() => cacheStore.selectedItemsCount);

/**
 * 选中的单个视频数量
 */
const selectedVideoCount = computed(
  () => cacheStore.selectedSingleVideos.length,
);

/**
 * 选中的组数量
 */
const selectedGroupCount = computed(() => cacheStore.selectedGroupIds.length);

/**
 * 是否全选
 * 需求 3.4: 所有记录都被选中时，"全选"按钮状态更改为"取消全选"
 */
const isAllSelected = computed(() => cacheStore.isAllSelected);

/**
 * 是否部分选择
 * 需求 3.5: 部分记录被选中时，"全选"按钮显示为半选状态
 */
const isPartiallySelected = computed(() => {
  return selectedCount.value > 0 && !isAllSelected.value;
});

// ============================================================================
// 方法
// ============================================================================

/**
 * 处理全选/取消全选点击
 * 需求 3.2, 3.3, 3.4: 全选/取消全选功能
 */
function handleSelectAllClick(): void {
  if (isAllSelected.value) {
    // 需求 3.3: 取消全选
    emit('unselectAll');
    cacheStore.unselectAllCurrentPage();
  } else {
    // 需求 3.2: 全选
    emit('selectAll');
    cacheStore.selectAllCurrentPage();
  }
}

/**
 * 处理清除选择
 */
function handleClearSelection(): void {
  emit('clearSelection');
  cacheStore.clearSelection();
}

/**
 * 处理批量复制
 */
function handleBatchCopy(): void {
  if (selectedCount.value > 0) {
    emit('batchCopy');
  }
}

/**
 * 处理批量剪切
 */
function handleBatchCut(): void {
  if (selectedCount.value > 0) {
    emit('batchCut');
  }
}

/**
 * 处理批量删除
 * 需求 4.1, 4.2: 根据选择状态启用/禁用批量删除按钮
 */
function handleBatchDelete(): void {
  if (selectedCount.value > 0) {
    emit('batchDelete');
  }
}
</script>

<style scoped>
@reference 'tailwindcss';
</style>
