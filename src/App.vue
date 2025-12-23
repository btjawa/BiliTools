<template>
  <SideBar />
  <div id="main" @contextmenu.prevent="handleMainContextMenu">
    <TitleBar />
    <Toaster v-bind="toasterOptions" />
    <ContextMenu ref="contextMenu" />
    <div class="loading"></div>
    <router-view v-slot="{ Component }">
      <Transition mode="out-in">
        <keep-alive>
          <component :is="Component" ref="page" class="page" />
        </keep-alive>
      </Transition>
    </router-view>
    <ComponentsWrapper />
  </div>
</template>

<script setup lang="ts">
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
import { ref, onMounted, watch, getCurrentInstance, reactive } from 'vue';
import { Toaster } from 'vue-sonner';
import {
  TitleBar,
  ContextMenu,
  SideBar,
  ComponentsWrapper,
} from '@/components';

import { useAppStore, useQueueStore, useSettingsStore } from '@/store';
import { useCacheStore } from '@/store/cache';
import { useComponentsStore, routeMap } from './store/components';
import router from './router';
import { CACHE_AUTO_REFRESH, TIME_CONVERSION } from '@/constants';

import {
  toasterOptions,
  AppLog,
  parseId,
  setEventHook,
} from '@/services/utils';
import { fetchUser, activateCookies } from '@/services/login';
import * as clipboard from '@/services/clipboard';
import { commands } from '@/services/backend';
import { AppError } from '@/services/error';

import { Task as TaskType } from './types/shared.d';
import i18n from './i18n';

const page = ref();
const contextMenu = ref<InstanceType<typeof ContextMenu>>();

// 标记是否有自定义右键菜单正在处理
let hasCustomContextMenu = false;

/**
 * 处理主容器的右键菜单
 */
function handleMainContextMenu(e: MouseEvent) {
  // 如果有自定义右键菜单正在处理，不显示默认菜单
  if (hasCustomContextMenu) {
    hasCustomContextMenu = false;
    return;
  }

  // 显示默认文本菜单
  contextMenu.value?.init(e);
}

const queues = useQueueStore();
const settings = useSettingsStore();
const cacheStore = useCacheStore();
const components = useComponentsStore();
const app = useAppStore();
const context = getCurrentInstance()?.appContext;

// 缓存自动刷新定时器
let cacheAutoRefreshTimer: number | null = null;

// 启动缓存自动刷新
function startCacheAutoRefresh() {
  stopCacheAutoRefresh();

  const intervalMinutes = settings.cacheAutoRefreshInterval;
  if (intervalMinutes === CACHE_AUTO_REFRESH.DISABLED) return;

  const intervalMs =
    intervalMinutes *
    TIME_CONVERSION.SECONDS_TO_MINUTES *
    TIME_CONVERSION.MS_TO_SECONDS;

  cacheAutoRefreshTimer = window.setInterval(async () => {
    if (!settings.cache_root) return;

    try {
      const result = await cacheStore.incrementalScanCacheRoot();
      // 只在有变更时显示提示
      if (
        result.newDirectoriesCount > 0 ||
        result.deletedDirectoriesCount > 0
      ) {
        AppLog(
          i18n.global.t('cache.autoRefresh.changed', [
            result.importedCount,
            result.cleanedCount,
          ]),
          'info',
        );
      }
    } catch {
      /**/
    }
  }, intervalMs);
}

// 停止缓存自动刷新
function stopCacheAutoRefresh() {
  if (cacheAutoRefreshTimer !== null) {
    window.clearInterval(cacheAutoRefreshTimer);
    cacheAutoRefreshTimer = null;
  }
}

// 监听自动刷新间隔变化
watch(
  () => settings.cacheAutoRefreshInterval,
  () => {
    if (app.inited) {
      startCacheAutoRefresh();
    }
  },
);

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

router.afterEach((to) =>
  components.regRoute(to.name as keyof typeof routeMap, page),
);

context.app.config.errorHandler = (e) =>
  new AppError(e, { name: 'AppError' }).handle();

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

clipboard.register(async (s) => {
  try {
    await parseId(s);
    const page = await components.navigate('searchPage');
    page.search(s);
  } catch {
    /**/
  }
});

onMounted(async () => {
  // 监听缓存项右键菜单事件
  document.addEventListener('cache-context-menu', (e: Event) => {
    const customEvent = e as CustomEvent;
    const { event, options } = customEvent.detail;

    // 设置标记，阻止默认右键菜单
    hasCustomContextMenu = true;

    contextMenu.value?.initWithOptions(event, options);
  });

  router.push('/');
  setEventHook();

  const meta = await commands.meta();
  if (meta.status === 'error') throw new AppError(meta.error);
  const m = meta.data;

  const { version, hash } = m;
  app.$patch({
    version,
    hash,
  });
  const { config } = m;
  settings.$patch(config);
  const { tasks, schedulers, queue } = m;
  queues.$patch({
    tasks: Object.fromEntries(
      Object.entries(tasks).map(([id, t]) => [
        id,
        { ...t?.meta, ...t?.prepare, ...t?.hot } as TaskType,
      ]),
    ),
    schedulers,
    ...queue,
  });

  if (queue.doing?.length || queue.pending?.length) {
    AppLog(i18n.global.t('down.restored'), 'info');
  }

  const init = await commands.init();
  if (init.status === 'error') throw new AppError(init.error);

  await fetchUser();
  await activateCookies();
  app.inited = true;

  // 启动时自动刷新缓存（如果已设置缓存根目录）
  if (settings.cache_root) {
    try {
      const result = await cacheStore.incrementalScanCacheRoot();
      if (
        result.newDirectoriesCount > 0 ||
        result.deletedDirectoriesCount > 0
      ) {
        AppLog(
          i18n.global.t('cache.autoRefresh.changed', [
            result.importedCount,
            result.cleanedCount,
          ]),
          'info',
        );
      }
    } catch {
      /**/
    }
  }

  // 启动定时自动刷新
  startCacheAutoRefresh();
});
</script>

<style>
@reference 'tailwindcss';

.loading {
  @apply absolute w-8 h-8 top-9.5 right-6 opacity-0 z-99 pointer-events-none transition-opacity;
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
