<template>
  <div class="space-y-3">
    <h3 class="text-sm font-medium text-(--content-color)">
      {{ $t('transfer.taskList') }} ({{ tasks.length }})
    </h3>
    <div class="task-list space-y-2">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="task-item"
        @click="handleTaskSelect(task.id)"
      >
        <TaskProgressItem
          :task="task"
          :progress="getTaskProgress(task.id)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type * as Types from '@/types/transfer.d';
import TaskProgressItem from './TaskProgressItem.vue';

// ============================================================================
// Props 和 Emits
// ============================================================================

interface Props {
  tasks: Types.TransferTask[];
  getTaskProgress: (taskId: string) => Types.TransferProgress | null;
}

interface Emits {
  (e: 'taskSelect', taskId: string): void;
}

const { tasks, getTaskProgress } = defineProps<Props>();
const emit = defineEmits<Emits>();

// ============================================================================
// 依赖注入
// ============================================================================

useI18n();

// ============================================================================
// 方法
// ============================================================================

/**
 * 处理任务选择
 */
function handleTaskSelect(taskId: string) {
  emit('taskSelect', taskId);
}
</script>

<style scoped>
@reference 'tailwindcss';

/* 任务列表 */
.task-list {
  @apply bg-(--solid-button-color) rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto;
}

.task-item {
  @apply bg-(--input-bg) rounded-lg p-3 border border-(--split-color) cursor-pointer;
  @apply hover:bg-(--hover-color) transition-colors duration-200;
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

/* 响应式调整 */
@media (max-width: 768px) {
  .task-list {
    @apply max-h-48;
  }
}
</style>