<template><div class="flex items-center rounded-lg h-12 text-sm p-4 bg-[color:var(--block-color)] w-full">
    <div class="checkbox" v-if="checkbox">
        <input type="checkbox" :value="index" v-model="model"/>
        <i class="fa-solid fa-check"></i>
    </div>
    <span class="min-w-6">{{ index + 1 }}</span>
    <div class="w-px h-full bg-[color:var(--split-color)] mx-4"></div>
    <span class="flex flex-1 ellipsis text">{{ item.title }}</span>
    <div class="w-px h-full bg-[color:var(--split-color)] mx-4"></div>
    <div class="flex gap-2">
        <button v-for="(item) in options" @click="item.action(index)">
            <i :class="[settings.dynFa, item.icon]"></i>
            <span>{{ item.text }}</span>
        </button>
    </div>
</div></template>

<script setup lang="ts">
import { MediaInfo } from '@/types/data';
import { useSettingsStore } from '@/store';
const settings = useSettingsStore();
const model = defineModel();

defineProps<{
    index: number,
    item: MediaInfo["list"][0],
    checkbox: boolean,
    options: {
        icon: string;
        text: string;
        action: (index: number, multi?: boolean ) => any;
    }[],
}>();
</script>