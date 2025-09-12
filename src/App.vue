<template>
  <TitleBar />
  <div class="main" @contextmenu.prevent="contextMenu?.init">
    <SideBar />
    <ContextMenu ref="contextMenu" />
    <div class="loading"></div>
    <router-view v-slot="{ Component }">
      <Transition mode="out-in">
        <keep-alive>
          <component :is="Component" class="page" ref="page" />
        </keep-alive>
      </Transition>
    </router-view>
    <Updater ref="updater" />
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
const context = getCurrentInstance()?.appContext!;

watch(
  () => settings.isDark,
  (v) => {
    const props = context.config.globalProperties;
    if (!props.$fa) props.$fa = reactive<any>({});
    props.$fa.weight = v ? 'fa-solid' : 'fa-light';
    props.$fa.isDark = v;
  },
  { immediate: true },
);

context.app.config.errorHandler = (e) =>
  new AppError(e, { name: 'AppError' }).handle();

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
