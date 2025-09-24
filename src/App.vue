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
    <LinkDropper />
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
import {
  TitleBar,
  ContextMenu,
  SideBar,
  Updater,
  LinkDropper,
} from '@/components';
import { useAppStore, useSettingsStore } from '@/store';
import { useRouter } from 'vue-router';
import { SearchPage } from './views';

import { fetchUser, activateCookies } from '@/services/login';
import { setEventHook, waitPage } from '@/services/utils';
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

// Watch UI scale changes and apply to CSS
watch(
  () => settings.ui_scale,
  (scale) => {
    let scaleFactor = 1;
    
    if (scale === 'auto') {
      scaleFactor = window.devicePixelRatio || 1;
      scaleFactor = Math.max(1, Math.min(2, scaleFactor));
    } else {
      const scaleNum = parseInt(scale);
      scaleFactor = scaleNum / 100;
    }
    
    document.documentElement.style.setProperty('--ui-scale-factor', scaleFactor.toString());
  },
  { immediate: true },
);

context.app.config.errorHandler = (e) =>
  new AppError(e, { name: 'AppError' }).handle();

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  contextMenu.value?.init(e);
});

provide('page', page);
provide('updater', updater);

clipboard.register(async (s) => {
  router.push('/');
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
