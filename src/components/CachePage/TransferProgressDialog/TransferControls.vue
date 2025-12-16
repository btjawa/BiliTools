<template>
  <div class="flex justify-end gap-3">
    <!-- 暂停/继续按钮 -->
    <button
      v-if="hasRunningTasks"
      class="px-4 py-2 rounded-lg border border-(--border-color) text-(--content-color) hover:bg-(--hover-color) transition-colors flex items-center gap-2"
      :disabled="!canPause"
      @click="handlePause"
    >
      <i :class="[$fa.weight, isPaused ? 'fa-play' : 'fa-pause']"></i>
      {{ isPaused ? $t('transfer.resume') : $t('transfer.pause') }}
    </button>

    <!-- 取消按钮 -->
    <button
      class="px-4 py-2 rounded-lg border border-(--border-color) text-(--content-color) hover:bg-(--hover-color) transition-colors flex items-center gap-2"
      :disabled="!canCancel"
      @click="handleCancel"
    >
      <i :class="[$fa.weight, 'fa-stop']"></i>
      {{ $t('transfer.stop') }}
    </button>

    <!-- 关闭按钮 -->
    <button
      v-if="canClose"
      class="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors font-medium flex items-center gap-2"
      @click="handleClose"
    >
      <i :class="[$fa.weight, 'fa-check']"></i>
      {{ $t('transfer.close') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

// ============================================================================
// Props 和 Emits
// ============================================================================

interface Props {
  canPause: boolean;
  canCancel: boolean;
  canClose: boolean;
  isPaused: boolean;
  hasRunningTasks: boolean;
}

interface Emits {
  (e: 'pause'): void;
  (e: 'cancel'): void;
  (e: 'close'): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

// ============================================================================
// 依赖注入
// ============================================================================

useI18n();

// ============================================================================
// 计算属性
// ============================================================================

/**
 * Font Awesome 权重
 */
const $fa = computed(() => ({
  weight: 'fa-solid',
}));

// ============================================================================
// 方法
// ============================================================================

/**
 * 处理暂停/继续
 */
function handlePause() {
  emit('pause');
}

/**
 * 处理取消
 */
function handleCancel() {
  emit('cancel');
}

/**
 * 处理关闭
 */
function handleClose() {
  emit('close');
}
</script>

<style scoped>
@reference 'tailwindcss';

/* 响应式调整 */
@media (max-width: 768px) {
  .flex {
    @apply flex-col gap-2;
  }
}
</style>