<template><div class="flex items-center rounded-lg h-12 text-sm p-4 bg-[color:var(--block-color)] w-full"
    :class="{ 'border-2 border-solid border-[var(--primary-color)]': props.index === props.target }"
>
    <div class="checkbox" v-if="props.checkbox">
        <input type="checkbox" :value="props.index" v-model="model"/>
        <i class="fa-solid fa-check"></i>
    </div>
    <span class="min-w-6">{{ props.index + 1 }}</span>
    <div class="w-px h-full bg-[color:var(--split-color)] mx-4"></div>
    <span class="flex flex-1 ellipsis text">{{ props.item.title }}</span>
    <div class="w-px h-full bg-[color:var(--split-color)] mx-4"></div>
    <div class="flex gap-2">
        <button v-for="(item, index) in props.options" @click="props.options[index].action(props.index)">
            <i :class="[$store.state.settings.theme === 'dark' ? 'fa-solid' : 'fa-light', item.icon]"></i>
            <span>{{ props.options[index].text }}</span>
        </button>
    </div>
</div></template>

<script setup lang="ts">
import { MediaInfo } from '@/types/data';
import { PropType } from 'vue';
const model = defineModel();

const props = defineProps({
    index: {
        type: Number,
        required: true
    },
    target: {
        type: Number,
        required: true
    },
    item: {
        type: Object as PropType<MediaInfo["list"][0]>,
        required: true
    },
    checkbox: {
        type: Boolean,
        required: true
    },
    options: {
        type: Array as PropType<{
            icon: string;
            text: string;
            action: (index: number) => Promise<void>;
            multi: () => Promise<void>;
        }[]>,
        required: true
    },
});
</script>