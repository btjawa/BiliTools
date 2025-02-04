<template><div class="flex w-full h-40 bg-[color:var(--block-color)] rounded-lg p-4 gap-4">
    <img :src="info.cover" draggable="false" class="object-cover rounded-lg" />
    <div class="text h-full w-full">
        <h3 ref="title" class="w-[calc(100%-64px)] text-lg">{{ info.title }}</h3>
        <div v-if="info.upper && info.upper.avatar" @click="open('https://space.bilibili.com/' + info.upper.mid)"
            class="user absolute flex flex-col items-center top-4 right-4 cursor-pointer"
        >
            <img :src="info.upper?.avatar" draggable="false" class="w-9 rounded-[50%]" />
            <span class="text-xs ellipsis max-w-16 mt-1">{{ info.upper.name }}</span>
        </div>
        <div class="text-xs flex gap-3 mt-1.5 text-[var(--desc-color)]">
            <template v-if="info.stat" v-for="([key, value]) in Object.entries(info.stat)">
                <div class="flex" v-if="typeof value === 'string' || typeof value === 'number'">
                    <i class="bcc-iconfont mr-1" :class="iconMap[key as keyof typeof iconMap]"></i>
                    <span>{{ stat(value ?? '') }}</span>
                </div>
            </template>
        </div>
        <span ref="desc" class="w-[calc(100%-64px)] text-sm block mt-2 whitespace-pre-wrap">
            {{ info.desc }}
        </span>
    </div>
</div></template>

<script setup lang="ts">
import { stat } from '@/services/utils';
import { MediaInfo } from '@/types/data.d';
import { nextTick, onMounted, ref, watch } from 'vue';

const props = defineProps<{
    info: MediaInfo,
    open: (path: string) => void
}>();

const title = ref<HTMLElement>();
const desc = ref<HTMLElement>();

const iconMap = {
    'play': 'bcc-icon-icon_list_player_x1',
    'danmaku': 'bcc-icon-danmuguanli',
    'reply': 'bcc-icon-pinglunguanli',
    'like': 'bcc-icon-ic_Likesx',
    'coin': 'bcc-icon-icon_action_reward_n_x',
    'favorite': 'bcc-icon-icon_action_collection_n_x',
    'share': 'bcc-icon-icon_action_share_n_x'
}

function handleDesc() {
    nextTick(() => {
        if (!title.value || !desc.value) return;
        const titleHeight = title.value.offsetHeight;
        const lineHeight = parseFloat(getComputedStyle(title.value).lineHeight);
        desc.value.style.webkitLineClamp = titleHeight <= lineHeight ? '3' : '2';
    });
}

onMounted(handleDesc);
watch(() => props.info, handleDesc, { deep: true });
</script>

<style scoped lang="scss">
h3, h3 ~ span {
    @apply overflow-hidden text-ellipsis;
    display: -webkit-box;
    -webkit-box-orient: vertical;
}
</style>