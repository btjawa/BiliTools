<template>
<div data-tauri-drag-region @dblclick="appWindow.toggleMaximize()"
	class="titlebar h-[30px] w-[calc(100vw-61px)] bg-[color:transparent] absolute flex right-0 top-0"
>
    <div v-if="osType() == 'windows'" class='relative z-[100] !visible ml-auto'>
        <div class="button translate-y-[-5px]" @click="appWindow.minimize()">
            <div class="!h-[1px]" :style='`mask-image:url("${icons.minimize}")`'></div>
        </div>
        <div class="button" @click="appWindow.toggleMaximize()">
            <div v-if="!maxed" :style='`mask-image:url("${icons.maximize_0}")`'></div>
            <div v-else :style='`mask-image:url("${icons.maximize_1}")`'></div>
        </div>
        <div class="button hover:!bg-[color:#c42b1c]" @click="appWindow.close()">
            <div :style='`mask-image:url("${icons.close}")`'></div>
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

const icons = {
    minimize: new URL('@/assets/img/titlebar/minimize.svg', import.meta.url).href,
    maximize_0: new URL('@/assets/img/titlebar/maximize-0.svg', import.meta.url).href,
    maximize_1: new URL('@/assets/img/titlebar/maximize-1.svg', import.meta.url).href,
    close: new URL('@/assets/img/titlebar/close.svg', import.meta.url).href,
}

onMounted(() => {
    appWindow.onResized(debounce(async () => {
        maxed.value = await appWindow.isMaximized();
    }, 250));
})
</script>

<style scoped lang="scss">
.button {
    @apply inline-flex justify-center items-center transition-all;
    @apply hover:bg-[color:var(--block-color)];
	width: 45px;
	height: 29px;
    & > div {
        @apply w-2.5 h-2.5;
        background-color: var(--content-color);
        mask-repeat: no-repeat;
        mask-size: cover;
    }
}
</style>