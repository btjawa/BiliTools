<template><div class="pb-0">
<h1 class="w-full">
    <i class="fa-download" :class="settings.dynFa"></i>
    <span>{{ $t('down.title') }}</span>
</h1>
<div class="flex w-full h-full mt-4">
    <Transition mode="out-in">
    <div class="flex flex-col flex-1 overflow-auto" :key="tab">
        <Empty text="down.empty" />
    </div>
    </Transition>
    <div class="tab">
    <button v-for="(v, k) in tabs" @click="tab = k" :class="{ 'active': tab === k }">
        <span>{{ $t(`down.${k}`) }}</span>
        <i :class="[tab === k ? 'fa-solid' : 'fa-light', v]"></i>
        <label class="primary-color"></label>
    </button>
    </div>
</div>
</div></template>

<script setup lang="ts">
import { ref } from 'vue';
import Empty from '@/components/Empty.vue';
import { useSettingsStore } from '@/store';

const tabs = {
    waiting: 'fa-stopwatch',
    doing: 'fa-hourglass-half',
    complete: 'fa-check'
} as const;
type Key = keyof typeof tabs;

const tab = ref<Key>('waiting');
const settings = useSettingsStore();
</script>

<style lang="scss" scoped>
.split {
    width: 1px;
    background-color: var(--split-color);
}
</style>