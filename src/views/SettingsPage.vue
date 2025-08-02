<template><div>
<h1 class="w-full">
    <i class="fa-gear" :class="settings.dynFa"></i>
    <span>{{ $t('settings.title') }}</span>
    <i @click="openUrl('https://btjawa.top/bilitools#设置')"
        class="question fa-light fa-circle-question text-lg"
    ></i>
</h1>
<div class="flex w-full h-full mt-4 gap-4 min-h-0">
    <Transition mode="out-in">
    <div class="flex flex-col flex-1 overflow-auto" :key="tab">
        <component :is="list[tab].comp" :key="tab" />
    </div>
    </Transition>
    <div class="tab">
    <button v-for="(v, k) in list" @click="tab = k" :class="{ 'active': tab === k }">
        <span>{{ $t('settings.' + k) }}</span>
        <i :class="[tab === k ? 'fa-solid' : 'fa-light', v.icon]"></i>
        <label class="primary-color"></label>
    </button>
    </div>
</div>
</div></template>
<script setup lang="ts">
import { ref, Transition } from 'vue';
import { useSettingsStore } from '@/store';
import { openUrl } from '@tauri-apps/plugin-opener';

import { General, Storage, Download, Advanced } from '@/components/SettingsPage';
const list = {
    general: { icon: 'fa-sliders', comp: General },
    storage: { icon: 'fa-database', comp: Storage },
    download: { icon: 'fa-download', comp: Download },
    advanced: { icon: 'fa-flask-gear', comp: Advanced },
}

const tab = ref<keyof typeof list>('general');
const settings = useSettingsStore();
</script>
<style lang="scss" scoped>
:deep(h3) {
    @apply min-w-64 inline-block;
    & + button {
        @apply my-2;
    }
}
:deep(hr) {
    @apply my-4;
}
:deep(section > div) {
    @apply mt-2;
}
</style>