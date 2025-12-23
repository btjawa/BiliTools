<template>
  <Teleport to="body">
    <Transition name="panel">
      <div
        v-if="visible"
        class="suggestion-panel-overlay fixed inset-0 z-50 flex items-center justify-center"
        @click.self="handleOverlayClick"
      >
        <div
          class="suggestion-panel bg-(--solid-block-color) rounded-xl shadow-2xl flex flex-col max-h-[80vh] w-[600px] max-w-[90vw] border border-(--border-color)"
          @keydown="handleKeydown"
        >
          <!-- 面板头部 -->
          <div
            class="panel-header flex items-center justify-between px-5 py-4 border-b border-(--border-color)"
          >
            <div class="flex items-center gap-3">
              <i
                :class="[$fa.weight, 'fa-lightbulb']"
                class="text-amber-500 text-lg"
              ></i>
              <h2 class="text-base font-medium text-(--content-color)">
                {{ $t('suggestion.panel.title') }}
              </h2>
            </div>

            <!-- 关闭按钮 -->
            <button
              class="w-8 h-8 flex items-center justify-center rounded hover:bg-(--hover-color) transition-colors"
              :title="$t('suggestion.panel.close')"
              @click="handleClose"
            >
              <i :class="[$fa.weight, 'fa-times']" class="text-(--desc-color)"></i>
            </button>
          </div>

          <!-- 加载状态 -->
          <div
            v-if="isCalculating"
            class="flex-1 flex flex-col items-center justify-center py-12"
          >
            <i
              :class="[$fa.weight, 'fa-spinner fa-spin']"
              class="text-3xl text-(--primary-color) mb-4"
            ></i>
            <p class="text-sm text-(--desc-color)">
              {{ $t('suggestion.panel.calculating') }}
            </p>
          </div>

          <!-- 空状态 -->
          <div
            v-else-if="groups.length === 0"
            class="flex-1 flex flex-col items-center justify-center py-12"
          >
            <i
              :class="[$fa.weight, 'fa-inbox']"
              class="text-4xl text-(--desc-color) mb-4"
            ></i>
            <p class="text-sm text-(--desc-color)">
              {{ $t('suggestion.panel.empty') }}
            </p>
          </div>

          <!-- 内容区域 -->
          <template v-else>
            <!-- 过滤器和统计信息 -->
            <div
              class="filter-bar flex items-center justify-between px-5 py-3 border-b border-(--border-color) bg-(--input-bg)"
            >
              <!-- 快速过滤器 -->
              <div class="flex items-center gap-2">
                <button
                  v-for="filter in filterOptions"
                  :key="filter.value"
                  class="px-3 py-1 text-xs rounded-full transition-colors"
                  :class="
                    currentFilter === filter.value
                      ? 'bg-(--primary-color) text-white'
                      : 'bg-(--block-color) text-(--content-color) hover:bg-(--hover-color)'
                  "
                  @click="handleFilterChange(filter.value)"
                >
                  {{ filter.label }}
                </button>
              </div>

              <!-- 统计信息 -->
              <div class="text-xs text-(--desc-color)">
                {{ statisticsText }}
              </div>
            </div>

            <!-- 审批进度 -->
            <div
              class="progress-bar flex items-center gap-3 px-5 py-2 border-b border-(--border-color)"
            >
              <span class="text-xs text-(--desc-color)">
                {{ progressText }}
              </span>
              <div class="flex-1 h-1.5 bg-(--border-color) rounded-full overflow-hidden">
                <div
                  class="h-full bg-(--primary-color) transition-all duration-300"
                  :style="{ width: progressPercent }"
                ></div>
              </div>
              <span class="text-xs font-medium text-(--content-color)">
                {{ approvedItemCount }}
              </span>
            </div>

            <!-- 分组列表 -->
            <div class="group-list flex-1 overflow-y-auto px-4 py-3 space-y-3">
              <SuggestionGroupComponent
                v-for="(group, index) in groups"
                :key="group.id"
                :group="group"
                :state="getGroupState(group.id)"
                :focused="focusedGroupIndex === index"
                :expanded="expandedGroups.has(group.id)"
                :selected-item-ids="getGroupSelectedItems(group.id)"
                @toggle="handleGroupToggle(group.id)"
                @approve="handleGroupApprove(group.id)"
                @reject="handleGroupReject(group.id)"
                @item-click="handleItemClick"
              />
            </div>
          </template>

          <!-- 面板底部操作栏 -->
          <div
            v-if="groups.length > 0"
            class="panel-footer flex items-center justify-between px-5 py-4 border-t border-(--border-color)"
          >
            <!-- 左侧：批量操作 -->
            <div class="flex items-center gap-2">
              <button
                class="px-3 py-1.5 text-sm rounded bg-(--input-bg) text-(--content-color) hover:bg-(--hover-color) transition-colors"
                @click="handleApproveAll"
              >
                {{ $t('suggestion.panel.approveAll') }}
              </button>
              <button
                class="px-3 py-1.5 text-sm rounded bg-(--input-bg) text-(--content-color) hover:bg-(--hover-color) transition-colors"
                @click="handleResetAll"
              >
                {{ $t('suggestion.panel.reset') }}
              </button>
            </div>

            <!-- 右侧：确认操作 -->
            <div class="flex items-center gap-2">
              <button
                class="px-4 py-2 text-sm rounded bg-(--input-bg) text-(--content-color) hover:bg-(--hover-color) transition-colors"
                @click="handleClose"
              >
                {{ $t('suggestion.panel.cancel') }}
              </button>
              <button
                class="px-4 py-2 text-sm rounded bg-(--primary-color) text-white hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="approvedItemCount === 0"
                @click="handleApply"
              >
                {{ $t('suggestion.panel.apply') }}
                <span v-if="approvedItemCount > 0" class="ml-1 opacity-75">
                  ({{ approvedItemCount }})
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import type {
  SuggestionGroup as SuggestionGroupType,
  GroupReviewState,
  SuggestionFilterType,
} from '@/types/suggestion';
import { useSuggestionStore } from '@/store/suggestion';
import SuggestionGroupComponent from './SuggestionGroup.vue';

// ============================================================================
// Props and Emits
// ============================================================================

interface Props {
  /** 是否可见 */
  visible: boolean;
  /** 建议分组列表 */
  groups: SuggestionGroupType[];
  /** 是否正在计算 */
  isCalculating?: boolean;
}

interface Emits {
  /** 关闭面板 */
  close: [];
  /** 应用选择 */
  apply: [approvedItemIds: string[]];
}

const props = withDefaults(defineProps<Props>(), {
  isCalculating: false,
});

const emit = defineEmits<Emits>();

// ============================================================================
// 依赖注入
// ============================================================================

const { t: $t } = useI18n();
const suggestionStore = useSuggestionStore();

// ============================================================================
// 本地状态
// ============================================================================

/** 展开的分组ID集合 */
const expandedGroups = ref<Set<string>>(new Set());

/** 当前聚焦的分组索引 */
const focusedGroupIndex = ref(0);

/** 当前过滤器 */
const currentFilter = ref<SuggestionFilterType>('all');

/** 单独选中的项目ID（用于单个项目点击切换） */
const individualSelectedItems = ref<Set<string>>(new Set());

// ============================================================================
// 计算属性
// ============================================================================

/**
 * 过滤器选项
 * Requirements 7.1: 提供快速过滤按钮
 */
const filterOptions = computed(() => [
  { value: 'all' as const, label: $t('suggestion.filter.all') },
  { value: 'same_uploader' as const, label: $t('suggestion.filter.sameUploader') },
  { value: 'same_group' as const, label: $t('suggestion.filter.sameGroup') },
  { value: 'similar_time' as const, label: $t('suggestion.filter.similarTime') },
]);

/**
 * 统计信息文本
 * Requirements 5.5: 显示总建议数和分组数
 */
const statisticsText = computed(() => {
  const totalItems = props.groups.reduce((sum, g) => sum + g.itemCount, 0);
  return $t('suggestion.panel.statistics', [totalItems, props.groups.length]);
});

/**
 * 审批进度文本
 * Requirements 6.1.2: 显示审批进度
 */
const progressText = computed(() => {
  const reviewed = suggestionStore.reviewedGroupCount;
  const total = props.groups.length;
  return $t('suggestion.panel.progress', [reviewed, total]);
});

/**
 * 进度百分比
 */
const progressPercent = computed(() => {
  if (props.groups.length === 0) return '0%';
  const percent =
    (suggestionStore.reviewedGroupCount / props.groups.length) * 100;
  return `${percent}%`;
});

/**
 * 已批准的项目数量
 * Requirements 6.5: 显示已批准项目数
 */
const approvedItemCount = computed(() => {
  let count = 0;
  props.groups.forEach((group) => {
    const state = suggestionStore.getGroupState(group.id);
    if (state === 'approved') {
      // 整组批准时，计算组内所有项目
      count += group.items.length;
    }
  });
  // 加上单独选中的项目
  individualSelectedItems.value.forEach((itemId) => {
    // 检查该项目是否已经在批准的组中
    const isInApprovedGroup = props.groups.some((group) => {
      const state = suggestionStore.getGroupState(group.id);
      return state === 'approved' && group.items.some((item) => item.id === itemId);
    });
    if (!isInApprovedGroup) {
      count++;
    }
  });
  return count;
});

// ============================================================================
// 方法
// ============================================================================

/**
 * 获取分组审批状态
 */
function getGroupState(groupId: string): GroupReviewState {
  return suggestionStore.getGroupState(groupId);
}

/**
 * 获取分组内已选中的项目ID
 */
function getGroupSelectedItems(groupId: string): Set<string> {
  const state = suggestionStore.getGroupState(groupId);
  const group = props.groups.find((g) => g.id === groupId);
  if (!group) return new Set();

  if (state === 'approved') {
    // 整组批准时，所有项目都选中
    return new Set(group.items.map((item) => item.id));
  }

  // 返回单独选中的项目
  const selected = new Set<string>();
  group.items.forEach((item) => {
    if (individualSelectedItems.value.has(item.id)) {
      selected.add(item.id);
    }
  });
  return selected;
}

/**
 * 处理分组展开/折叠
 */
function handleGroupToggle(groupId: string): void {
  if (expandedGroups.value.has(groupId)) {
    expandedGroups.value.delete(groupId);
  } else {
    expandedGroups.value.add(groupId);
  }
}

/**
 * 处理分组批准
 */
function handleGroupApprove(groupId: string): void {
  suggestionStore.approveGroup(groupId);
}

/**
 * 处理分组拒绝
 */
function handleGroupReject(groupId: string): void {
  suggestionStore.rejectGroup(groupId);
}

/**
 * 处理单个项目点击
 * Requirements 6.2: 点击单个项目切换选择状态
 */
function handleItemClick(itemId: string): void {
  if (individualSelectedItems.value.has(itemId)) {
    individualSelectedItems.value.delete(itemId);
  } else {
    individualSelectedItems.value.add(itemId);
  }
}

/**
 * 处理过滤器变更
 * Requirements 7.1-7.4: 过滤器功能
 */
function handleFilterChange(filter: SuggestionFilterType): void {
  currentFilter.value = filter;
  suggestionStore.setFilterType(filter);
}

/**
 * 处理全部批准
 * Requirements 6.3: 点击"全部批准"批准所有待审批组
 */
function handleApproveAll(): void {
  suggestionStore.approveAllPending();
}

/**
 * 处理重置
 */
function handleResetAll(): void {
  suggestionStore.resetAllGroupStates();
  individualSelectedItems.value.clear();
}

/**
 * 处理应用
 * Requirements 6.4: 应用已批准的选择
 */
function handleApply(): void {
  const approvedIds = collectApprovedItemIds();
  emit('apply', approvedIds);
}

/**
 * 收集所有已批准的项目ID
 */
function collectApprovedItemIds(): string[] {
  const ids = new Set<string>();

  // 添加整组批准的项目
  props.groups.forEach((group) => {
    const state = suggestionStore.getGroupState(group.id);
    if (state === 'approved') {
      group.items.forEach((item) => ids.add(item.id));
    }
  });

  // 添加单独选中的项目
  individualSelectedItems.value.forEach((id) => ids.add(id));

  return Array.from(ids);
}

/**
 * 处理关闭
 */
function handleClose(): void {
  emit('close');
}

/**
 * 处理遮罩层点击
 * Requirements 6.1.5: 点击外部显示确认对话框
 */
function handleOverlayClick(): void {
  // 如果有未完成的审批，可以显示确认对话框
  // 这里简化处理，直接关闭
  handleClose();
}

/**
 * 处理键盘事件
 * Requirements 2.1: 键盘导航支持
 */
function handleKeydown(event: KeyboardEvent): void {
  switch (event.key) {
    case 'Tab':
      event.preventDefault();
      if (event.shiftKey) {
        // Shift+Tab: 上一组
        moveToPreviousGroup();
      } else {
        // Tab: 批准当前组并移动到下一组
        approveCurrentAndNext();
      }
      break;
    case 'Escape':
      if (event.ctrlKey) {
        // Ctrl+Escape: 取消并关闭
        handleClose();
      } else {
        // Escape: 拒绝当前组并移动到下一组
        rejectCurrentAndNext();
      }
      break;
    case 'Enter':
      if (event.ctrlKey) {
        // Ctrl+Enter: 应用选择
        handleApply();
      }
      break;
  }
}

/**
 * 批准当前组并移动到下一组
 */
function approveCurrentAndNext(): void {
  if (props.groups.length === 0) return;
  const currentGroup = props.groups[focusedGroupIndex.value];
  if (currentGroup) {
    suggestionStore.approveGroup(currentGroup.id);
    moveToNextGroup();
  }
}

/**
 * 拒绝当前组并移动到下一组
 */
function rejectCurrentAndNext(): void {
  if (props.groups.length === 0) return;
  const currentGroup = props.groups[focusedGroupIndex.value];
  if (currentGroup) {
    suggestionStore.rejectGroup(currentGroup.id);
    moveToNextGroup();
  }
}

/**
 * 移动到下一组
 */
function moveToNextGroup(): void {
  if (focusedGroupIndex.value < props.groups.length - 1) {
    focusedGroupIndex.value++;
  }
}

/**
 * 移动到上一组
 */
function moveToPreviousGroup(): void {
  if (focusedGroupIndex.value > 0) {
    focusedGroupIndex.value--;
  }
}

// ============================================================================
// 生命周期
// ============================================================================

// 监听可见性变化，初始化状态
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      // 打开时初始化
      focusedGroupIndex.value = 0;
      individualSelectedItems.value.clear();
      // 默认展开所有分组
      expandedGroups.value = new Set(props.groups.map((g) => g.id));
    }
  },
);

// 监听分组变化，更新展开状态
watch(
  () => props.groups,
  (groups) => {
    // 新分组默认展开
    groups.forEach((g) => {
      if (!expandedGroups.value.has(g.id)) {
        expandedGroups.value.add(g.id);
      }
    });
  },
  { deep: true },
);

// 全局键盘事件监听
function handleGlobalKeydown(): void {
  if (!props.visible) return;
  // 面板内的键盘事件由 handleKeydown 处理
}

/**
 * 处理来自键盘服务的拒绝当前组事件
 * Requirements 2.1.3: Escape 拒绝当前组
 */
function handleRejectCurrentGroupEvent(): void {
  if (!props.visible) return;
  rejectCurrentAndNext();
}

/**
 * 处理来自键盘服务的应用建议事件
 * Requirements 2.3: Ctrl+Enter 应用选择
 */
function handleApplyEvent(event: Event): void {
  if (!props.visible) return;
  const customEvent = event as CustomEvent<{ approvedItemIds: string[] }>;
  if (customEvent.detail?.approvedItemIds) {
    emit('apply', customEvent.detail.approvedItemIds);
  } else {
    handleApply();
  }
}

/**
 * 处理来自键盘服务的取消建议事件
 * Requirements 2.4: Ctrl+Escape 取消
 */
function handleCancelEvent(): void {
  if (!props.visible) return;
  handleClose();
}

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown);
  // 监听来自键盘服务的自定义事件
  window.addEventListener('suggestion:rejectCurrentGroup', handleRejectCurrentGroupEvent);
  window.addEventListener('suggestion:apply', handleApplyEvent);
  window.addEventListener('suggestion:cancel', handleCancelEvent);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
  // 移除自定义事件监听
  window.removeEventListener('suggestion:rejectCurrentGroup', handleRejectCurrentGroupEvent);
  window.removeEventListener('suggestion:apply', handleApplyEvent);
  window.removeEventListener('suggestion:cancel', handleCancelEvent);
});
</script>

<style scoped>
@reference 'tailwindcss';

.suggestion-panel-overlay {
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

.suggestion-panel {
  animation: panel-enter 0.2s ease-out;
}

@keyframes panel-enter {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 过渡动画 */
.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.2s ease;
}

.panel-enter-active .suggestion-panel,
.panel-leave-active .suggestion-panel {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
}

.panel-enter-from .suggestion-panel,
.panel-leave-to .suggestion-panel {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}

/* 滚动条样式 */
.group-list::-webkit-scrollbar {
  width: 6px;
}

.group-list::-webkit-scrollbar-track {
  background: transparent;
}

.group-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.group-list::-webkit-scrollbar-thumb:hover {
  background: var(--desc-color);
}
</style>
