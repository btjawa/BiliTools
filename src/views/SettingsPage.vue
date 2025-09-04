<template><div>
<h1 class="w-full my-1.5">
    <i :class="[$fa.weight, 'fa-gear']"></i>
    <span>{{ $t('settings.title') }}</span>
    <i @click="openUrl('https://btjawa.top/bilitools/settings')"
        class="question fa-light fa-circle-question text-lg"
    ></i>
</h1>
<div class="flex w-full h-full mt-4 gap-4 min-h-0">
    <Transition mode="out-in">
    <div class="flex flex-col flex-1 overflow-auto pr-3" :key="tab">
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
import { openUrl } from '@tauri-apps/plugin-opener';

import { General, Storage, Download, Strategy, Format } from '@/components/SettingsPage';
const list = {
    general: { icon: 'fa-sliders', comp: General },
    storage: { icon: 'fa-database', comp: Storage },
    download: { icon: 'fa-download', comp: Download },
    strategy: { icon: 'fa-bullseye-arrow', comp: Strategy },
    format: { icon: 'fa-file-signature', comp: Format },
}

const tab = ref<keyof typeof list>('general');
</script>
<style scoped>
@reference 'tailwindcss';

:deep(h3) {
    @apply min-w-32 mr-4 inline-block;
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