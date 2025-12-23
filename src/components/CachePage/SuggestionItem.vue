<template>
  <div
    class="suggestion-item flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition-all"
    :class="itemClasses"
    @click="handleClick"
  >
    <!-- 相似度指示器 -->
    <div
      class="similarity-indicator w-1 h-8 rounded-full flex-shrink-0"
      :class="similarityColorClass"
      :title="similarityTooltip"
    ></div>

    <!-- 内容区域 -->
    <div class="flex-1 min-w-0">
      <!-- 标题 -->
      <div class="text-sm text-(--content-color) truncate" :title="item.cacheItem.title">
        {{ item.cacheItem.title }}
      </div>
      <!-- UP主 -->
      <div class="text-xs text-(--desc-color) truncate">
        {{ item.cacheItem.uname }}
      </div>
    </div>

    <!-- 相似度百分比 -->
    <div class="text-xs text-(--desc-color) flex-shrink-0">
      {{ similarityPercent }}
    </div>

    <!-- 选中状态图标 -->
    <div class="w-4 h-4 flex items-center justify-center flex-shrink-0">
      <i
        v-if="selected"
        :class="[$fa.weight, 'fa-check']"
        class="text-(--primary-color)"
      ></i>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SuggestionItem } from '@/types/suggestion';

// ============================================================================
// Props and Emits
// ============================================================================

interface Props {
  /** 建议项目数据 */
  item: SuggestionItem;
  /** 是否选中 */
  selected?: boolean;
}

interface Emits {
  /** 点击事件 */
  click: [];
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
});

const emit = defineEmits<Emits>();

// ============================================================================
// 计算属性
// ============================================================================

/**
 * 项目样式类
 */
const itemClasses = computed(() => {
  if (props.selected) {
    return 'bg-(--primary-color)/10 border border-(--primary-color)/30';
  }
  return 'hover:bg-(--hover-color) border border-transparent';
});

/**
 * 相似度颜色类
 * 根据相似度值显示不同颜色
 */
const similarityColorClass = computed(() => {
  const similarity = props.item.similarity;
  if (similarity >= 0.8) return 'bg-green-500';
  if (similarity >= 0.6) return 'bg-blue-500';
  if (similarity >= 0.4) return 'bg-amber-500';
  return 'bg-gray-400';
});

/**
 * 相似度百分比显示
 */
const similarityPercent = computed(() => {
  return `${Math.round(props.item.similarity * 100)}%`;
});

/**
 * 相似度提示文本
 */
const similarityTooltip = computed(() => {
  const features = props.item.matchedFeatures;
  if (features.length > 0) {
    return `匹配特征: ${features.join(', ')}`;
  }
  return `相似度: ${similarityPercent.value}`;
});

// ============================================================================
// 方法
// ============================================================================

/**
 * 处理点击事件
 */
function handleClick(): void {
  emit('click');
}
</script>

<style scoped>
@reference 'tailwindcss';

.suggestion-item {
  @apply select-none;
}

.similarity-indicator {
  transition: background-color 0.2s ease;
}
</style>
