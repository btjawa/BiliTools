<template>
  <SideBar />
  <div id="main" @contextmenu.prevent="contextMenu?.init">
    <TitleBar />
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
import {
  TitleBar,
  ContextMenu,
  SideBar,
  ComponentsWrapper,
} from '@/components';

import { useAppStore, useQueueStore, useSettingsStore } from '@/store';
import { useComponentsStore, routeMap } from './store/components';
import router from './router';

import { fetchUser, activateCookies } from '@/services/login';
import { AppLog, parseId, setEventHook } from '@/services/utils';
import { commands } from '@/services/backend';
import { AppError } from '@/services/error';
import * as clipboard from '@/services/clipboard';

import { Task as TaskType } from './types/shared.d';
import i18n from './i18n';

const page = ref();
const contextMenu = ref<InstanceType<typeof ContextMenu>>();

const queues = useQueueStore();
const settings = useSettingsStore();
const components = useComponentsStore();
const app = useAppStore();
const context = getCurrentInstance()?.appContext;

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
});
</script>

<style>
@reference 'tailwindcss';

.loading {
  @apply absolute w-8 h-8 top-[38px] right-6 opacity-0 z-99 pointer-events-none transition-opacity;
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
