<template>
  <button
    class="suggestion-btn px-4 py-2 text-sm rounded transition-all flex items-center gap-2 relative"
    :class="buttonClasses"
    :disabled="disabled"
    :title="tooltipText"
    @click="handleClick"
  >
    <i :class="[$fa.weight, 'fa-lightbulb']"></i>
    <span>{{ $t('suggestion.button.title') }}</span>
    <!-- 建议数量徽章 -->
    <span
      v-if="suggestionCount > 0 && !disabled"
      class="suggestion-badge absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 flex items-center justify-center text-xs font-medium bg-(--primary-color) text-white rounded-full"
    >
      {{ displayCount }}
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

// ============================================================================
// Props and Emits
// ============================================================================

interface Props {
  /** 是否禁用按钮（无选中项时禁用） */
  disabled?: boolean;
  /** 可用建议数量（用于徽章显示） */
  suggestionCount?: number;
  /** 是否正在计算建议 */
  isCalculating?: boolean;
}

interface Emits {
  /** 点击事件 */
  click: [];
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  suggestionCount: 0,
  isCalculating: false,
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
 * 按钮样式类
 * Requirements 1.2: 无选中项时禁用并降低透明度
 * Requirements 1.3: 有选中项时启用并可点击
 */
const buttonClasses = computed(() => {
  if (props.disabled) {
    return 'bg-(--input-bg) text-(--desc-color) opacity-50 cursor-not-allowed border border-(--border-color)';
  }
  if (props.isCalculating) {
    return 'bg-amber-500 text-white cursor-wait';
  }
  return 'bg-amber-500 text-white hover:opacity-80 cursor-pointer';
});

/**
 * 提示文本
 * Requirements 1.4: 悬停时显示提示
 */
const tooltipText = computed(() => {
  if (props.disabled) {
    return $t('suggestion.button.disabledHint');
  }
  if (props.isCalculating) {
    return $t('suggestion.button.calculating');
  }
  return $t('suggestion.button.tooltip');
});

/**
 * 显示的建议数量
 * Requirements 9.6: 显示建议数量徽章
 */
const displayCount = computed(() => {
  if (props.suggestionCount > 99) {
    return '99+';
  }
  return props.suggestionCount.toString();
});

// ============================================================================
// 方法
// ============================================================================

/**
 * 处理点击事件
 */
function handleClick(): void {
  if (!props.disabled && !props.isCalculating) {
    emit('click');
  }
}
</script>

<style scoped>
@reference 'tailwindcss';

.suggestion-btn {
  position: relative;
}

.suggestion-badge {
  animation: badge-pulse 2s ease-in-out infinite;
}

@keyframes badge-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}
</style>
