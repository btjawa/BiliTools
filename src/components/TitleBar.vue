<template>
  <div
    data-tauri-drag-region
    @dblclick="appWindow.toggleMaximize()"
    @contextmenu.prevent
    class="titlebar absolute right-0 h-[30px] w-[calc(100vw-56px)] bg-transparent"
  >
    <div v-if="osType() !== 'macos'" class="relative z-100 float-right">
      <div class="button" @click="toggleTop">
        <i :class="[isTop ? 'fa-solid' : 'fa-light', 'fa-thumbtack']"></i>
      </div>
      <div class="button translate-y-[-5px]" @click="appWindow.minimize()">
        <div class="h-px!"></div>
      </div>
      <div class="button" @click="appWindow.toggleMaximize()">
        <div
          v-if="!maxed"
          :style="`mask-image:url(&quot;${icons.max}&quot;)`"
        ></div>
        <div v-else :style="`mask-image:url(&quot;${icons.unmax}&quot;)`"></div>
      </div>
      <div class="button hover:bg-[#c42b1c]!" @click="appWindow.close()">
        <div :style="`mask-image:url(&quot;${icons.close}&quot;)`"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCurrentWindow } from '@tauri-apps/api/window';
import { onMounted, ref } from 'vue';
import { debounce } from '@/services/utils';
import { type as osType } from '@tauri-apps/plugin-os';

const maxed = ref(false);
const appWindow = getCurrentWindow();
const isTop = ref(false);

const icons = {
  max: new URL('@/assets/img/titlebar/max.svg', import.meta.url).href,
  unmax: new URL('@/assets/img/titlebar/unmax.svg', import.meta.url).href,
  close: new URL('@/assets/img/titlebar/close.svg', import.meta.url).href,
};

async function toggleTop() {
  await appWindow.setAlwaysOnTop(!isTop.value);
  isTop.value = await appWindow.isAlwaysOnTop();
}

onMounted(() =>
  appWindow.onResized(
    debounce(async () => {
      maxed.value = await appWindow.isMaximized();
    }, 250),
  ),
);
</script>

<style scoped>
@reference 'tailwindcss';

.button {
  @apply inline-flex justify-center items-center transition-all;
  @apply hover:bg-(--block-color) text-(--content-color) text-xs;
  width: 45px;
  height: 29px;
  div {
    @apply w-2.5 h-2.5 bg-(--content-color);
    mask-repeat: no-repeat;
    mask-size: cover;
  }
}
</style>
