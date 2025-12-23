<template>
  <div
    class="suggestion-group rounded-lg overflow-hidden transition-all"
    :class="groupClasses"
  >
    <!-- 组头部 -->
    <div
      class="group-header flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
      :class="headerClasses"
      @click="handleHeaderClick"
    >
      <!-- 状态图标 -->
      <div class="w-6 h-6 flex items-center justify-center flex-shrink-0">
        <i
          v-if="state === 'approved'"
          :class="[$fa.weight, 'fa-check-circle']"
          class="text-green-500"
        ></i>
        <i
          v-else-if="state === 'rejected'"
          :class="[$fa.weight, 'fa-times-circle']"
          class="text-gray-400"
        ></i>
        <i
          v-else
          :class="[$fa.weight, 'fa-circle']"
          class="text-(--desc-color)"
        ></i>
      </div>

      <!-- 组标签和数量 -->
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium truncate text-(--content-color)" :title="groupLabelText">
          {{ groupLabelText }}
        </div>
        <div class="text-xs text-(--desc-color)">
          {{ itemCountText }}
        </div>
      </div>

      <!-- 平均相似度 -->
      <div class="text-xs text-(--desc-color) flex-shrink-0">
        {{ averageSimilarityText }}
      </div>

      <!-- 展开/折叠图标 -->
      <div class="w-5 h-5 flex items-center justify-center flex-shrink-0">
        <i
          :class="[$fa.weight, expanded ? 'fa-chevron-up' : 'fa-chevron-down']"
          class="text-xs text-(--desc-color) transition-transform"
        ></i>
      </div>
    </div>

    <!-- 组内容（项目列表） -->
    <div v-show="expanded" class="group-content px-2 pb-2">
      <div class="space-y-1">
        <SuggestionItem
          v-for="item in displayItems"
          :key="item.id"
          :item="item"
          :selected="isItemSelected(item.id)"
          @click="handleItemClick(item.id)"
        />
      </div>

      <!-- 显示更多提示 -->
      <div
        v-if="group.hasMore"
        class="text-center py-2 text-xs text-(--desc-color)"
      >
        {{ $t('suggestion.group.hasMore', [remainingCount]) }}
      </div>
    </div>

    <!-- 快捷键提示（聚焦时显示） -->
    <div
      v-if="focused && state === 'pending'"
      class="px-4 py-2 text-xs text-(--desc-color) bg-(--hover-color) border-t border-(--border-color)"
    >
      <span class="mr-4">
        <kbd class="px-1 py-0.5 bg-(--block-color) rounded text-xs">Tab</kbd>
        {{ $t('suggestion.group.approveHint') }}
      </span>
      <span>
        <kbd class="px-1 py-0.5 bg-(--block-color) rounded text-xs">Esc</kbd>
        {{ $t('suggestion.group.rejectHint') }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SuggestionGroup, GroupReviewState } from '@/types/suggestion';
import SuggestionItem from './SuggestionItem.vue';

// ============================================================================
// Props and Emits
// ============================================================================

interface Props {
  /** 分组数据 */
  group: SuggestionGroup;
  /** 审批状态 */
  state?: GroupReviewState;
  /** 是否聚焦 */
  focused?: boolean;
  /** 是否展开 */
  expanded?: boolean;
  /** 已选中的项目ID集合 */
  selectedItemIds?: Set<string>;
}

interface Emits {
  /** 批准分组 */
  approve: [];
  /** 拒绝分组 */
  reject: [];
  /** 切换展开状态 */
  toggle: [];
  /** 点击单个项目 */
  itemClick: [itemId: string];
}

const props = withDefaults(defineProps<Props>(), {
  state: 'pending',
  focused: false,
  expanded: true,
  selectedItemIds: () => new Set(),
});

const emit = defineEmits<Emits>();

// ============================================================================
// 依赖注入
// ============================================================================

const { t: $t } = useI18n();

// ============================================================================
// 计算属性
// ============================================================================

/**
 * 组标签文本
 * 根据 labelInfo 生成本地化的标签
 */
const groupLabelText = computed(() => {
  const { keys, uploaderName, page, totalPages } = props.group.labelInfo;
  const prefix = $t('suggestion.feature.prefix');
  
  // 构建特征标签
  const labels: string[] = [];
  if (uploaderName) {
    labels.push(uploaderName);
  }
  for (const key of keys) {
    labels.push($t(key));
  }
  
  // 组合标签
  let label = `${prefix}: ${labels.join(' + ')}`;
  
  // 添加分页信息
  if (page && totalPages) {
    label += ` (${page}/${totalPages})`;
  }
  
  return label;
});

/**
 * 组样式类
 * Requirements 9.1-9.4: 不同状态的视觉反馈
 */
const groupClasses = computed(() => {
  const classes: string[] = ['border'];

  if (props.focused) {
    classes.push('ring-2 ring-(--primary-color) border-(--primary-color)');
  } else {
    classes.push('border-(--border-color)');
  }

  if (props.state === 'approved') {
    classes.push('bg-green-500/5');
  } else if (props.state === 'rejected') {
    classes.push('opacity-50');
  } else {
    classes.push('bg-(--block-color)');
  }

  return classes.join(' ');
});

/**
 * 头部样式类
 */
const headerClasses = computed(() => {
  if (props.state === 'approved') {
    return 'bg-green-500/10';
  }
  return 'hover:bg-(--hover-color)';
});

/**
 * 显示的项目列表
 * Requirements 5.1.5: 每组最多显示20项
 */
const displayItems = computed(() => {
  return props.group.items;
});

/**
 * 项目数量文本
 */
const itemCountText = computed(() => {
  if (props.group.hasMore) {
    return $t('suggestion.group.itemCountWithMore', [
      props.group.items.length,
      props.group.itemCount,
    ]);
  }
  return $t('suggestion.group.itemCount', [props.group.itemCount]);
});

/**
 * 剩余项目数量
 */
const remainingCount = computed(() => {
  return props.group.itemCount - props.group.items.length;
});

/**
 * 平均相似度文本
 */
const averageSimilarityText = computed(() => {
  return `${Math.round(props.group.averageSimilarity * 100)}%`;
});

// ============================================================================
// 方法
// ============================================================================

/**
 * 检查项目是否被选中
 */
function isItemSelected(itemId: string): boolean {
  return props.selectedItemIds.has(itemId);
}

/**
 * 处理头部点击
 */
function handleHeaderClick(): void {
  emit('toggle');
}

/**
 * 处理项目点击
 */
function handleItemClick(itemId: string): void {
  emit('itemClick', itemId);
}
</script>

<style scoped>
@reference 'tailwindcss';

.suggestion-group {
  transition:
    opacity 0.2s ease,
    box-shadow 0.2s ease;
}

.group-header {
  transition: background-color 0.15s ease;
}

kbd {
  font-family: inherit;
}
</style>
