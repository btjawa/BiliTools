<template>
  <TitleBar />
  <div class="main">
    <SideBar />
    <ContextMenu ref="contextMenu" />
    <div class="loading"></div>
    <router-view v-slot="{ Component }">
      <Transition mode="out-in">
        <keep-alive>
          <component :is="Component" ref="page" class="page" />
        </keep-alive>
      </Transition>
    </router-view>
    <Updater ref="updater" />
    <!-- Drag and Drop Overlay -->
    <Transition name="drag-fade">
      <div
        v-if="dragState.isDragging && dragState.isValidLink"
        class="drag-overlay"
      >
        <div class="drag-hint">
          <i class="fa-solid fa-download text-4xl mb-4"></i>
          <h2>{{ $t('drag.hint') }}</h2>
          <p>{{ $t('drag.description') }}</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
import {
  ref,
  onMounted,
  provide,
  watch,
  getCurrentInstance,
  reactive,
} from 'vue';
import { TitleBar, ContextMenu, SideBar, Updater } from '@/components';
import { useAppStore, useSettingsStore } from '@/store';
import { useRouter } from 'vue-router';
import { SearchPage } from './views';

import { fetchUser, activateCookies } from '@/services/login';
import { setEventHook, waitPage, parseId } from '@/services/utils';
import { commands } from '@/services/backend';
import { AppError } from '@/services/error';
import * as clipboard from '@/services/clipboard';

const page = ref();
const updater = ref();
const contextMenu = ref<InstanceType<typeof ContextMenu>>();

const router = useRouter();
const settings = useSettingsStore();
const app = useAppStore();
const context = getCurrentInstance()?.appContext;

// Drag and drop state
const dragState = reactive({
  isDragging: false,
  isValidLink: false,
});

if (!context) throw new Error('No AppContext');

watch(
  () => settings.isDark,
  (isDark) => {
    const props = context.config.globalProperties;
    const weight = isDark ? 'fa-solid' : 'fa-light';
    if (!props.$fa)
      props.$fa = reactive({
        weight,
        isDark,
      });
    props.$fa.weight = weight;
    props.$fa.isDark = isDark;
  },
  { immediate: true },
);

context.app.config.errorHandler = (e) =>
  new AppError(e, { name: 'AppError' }).handle();

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  contextMenu.value?.init(e);
});

// Global drag and drop event listeners
function handleDragEnter(e: DragEvent) {
  if (!settings.drag_search) return;
  
  e.preventDefault();
  dragState.isDragging = true;
  
  // Try to get link content from different data types
  const transfer = e.dataTransfer;
  if (transfer) {
    // Check for URL data first (most common for browser links)
    const urlData = transfer.getData('text/uri-list') || transfer.getData('text/x-moz-url') || transfer.getData('text/plain');
    if (urlData) {
      // Extract first line/URL for multi-line content
      const content = urlData.split('\n')[0].trim();
      try {
        parseId(content);
        dragState.isValidLink = true;
      } catch {
        dragState.isValidLink = false;
      }
    } else {
      // Fallback: check if items contain text
      const items = transfer.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'string') {
          dragState.isValidLink = true; // Assume valid, check on drop
          break;
        }
      }
    }
  }
}

function handleDragOver(e: DragEvent) {
  if (!settings.drag_search) return;
  e.preventDefault(); // Allow drop
}

function handleDragLeave(e: DragEvent) {
  // Only hide overlay when leaving the app window completely
  const target = e.relatedTarget as Element;
  if (!target || !document.documentElement.contains(target)) {
    dragState.isDragging = false;
    dragState.isValidLink = false;
  }
}

async function handleDrop(e: DragEvent) {
  e.preventDefault();
  dragState.isDragging = false;
  dragState.isValidLink = false;
  
  if (!settings.drag_search) return;
  
  const transfer = e.dataTransfer;
  if (!transfer) return;
  
  // Try multiple data formats
  let content = transfer.getData('text/uri-list') || 
               transfer.getData('text/x-moz-url') || 
               transfer.getData('text/plain');
  
  // If no direct data, try items
  if (!content && transfer.items.length > 0) {
    for (let i = 0; i < transfer.items.length; i++) {
      const item = transfer.items[i];
      if (item.kind === 'string') {
        // Use Promise to handle async getAsString
        content = await new Promise<string>((resolve) => {
          item.getAsString(resolve);
        });
        break;
      }
    }
  }
  
  if (content) {
    // Extract first line/URL and clean it
    content = content.split('\n')[0].trim();
    
    try {
      await parseId(content);
      // Navigate to search page first (root path)
      await router.push('/');
      // Then trigger search
      const result = await waitPage(page, 'search');
      (result.value as InstanceType<typeof SearchPage>).search(content);
    } catch (error) {
      console.warn('Invalid drag content:', content, error);
    }
  }
}

provide('page', page);
provide('updater', updater);

clipboard.register(async (s) => {
  const result = await waitPage(page, 'search');
  (result.value as InstanceType<typeof SearchPage>).search(s);
});

onMounted(async () => {
  router.push('/');
  setEventHook();

  const meta = await commands.meta();
  if (meta.status === 'error') throw new AppError(meta.error);
  const { config, ...initData } = meta.data;
  app.$patch({ ...initData });
  settings.$patch(config);
  const init = await commands.init();
  if (init.status === 'error') throw new AppError(init.error);

  await fetchUser();
  await activateCookies();
  app.inited = true;

  // Add global drag and drop listeners
  document.addEventListener('dragenter', handleDragEnter);
  document.addEventListener('dragover', handleDragOver);
  document.addEventListener('dragleave', handleDragLeave);
  document.addEventListener('drop', handleDrop);
});
</script>

<style>
@reference 'tailwindcss';

.main {
  @apply absolute right-0 bottom-0 h-[calc(100vh-30px)];
  @apply flex w-full items-end bg-transparent overflow-visible;
}
.loading {
  @apply absolute w-8 h-8 top-2 right-6 opacity-0 z-99 pointer-events-none transition-opacity;
  @apply border-solid border-2 border-(--solid-block-color) border-l-(--content-color) rounded-full;
  animation: circle infinite 0.75s linear;
  &.active {
    opacity: 1;
  }
}
@keyframes circle {
  0% {
    transform: rotate(0);
  }
  100% {
    transform: rotate(360deg);
  }
}
.v-enter-active {
  transition: opacity 0.3s ease;
}
.v-leave-active,
.v-enter-from,
.v-leave-to {
  opacity: 0;
}
.slide-enter-active,
.slide-leave-active {
  transition:
    translate 0.5s cubic-bezier(0, 1, 0.6, 1),
    opacity 0.3s;
}
.slide-enter-from,
.slide-leave-to {
  @apply translate-y-8 opacity-0;
}
</style>
