<template><div class="flex w-full min-h-36 h-36 bg-(--block-color) rounded-lg p-4 gap-4">
    <Image :src="info.nfo.thumbs[0].url + '@112h'" :height="112" :ratio="16/10" />
    <div class="text flex flex-col flex-1 min-w-0">
        <h2 class="text-lg ellipsis">{{ info.nfo.showtitle }}</h2>
        <div class="text-xs flex flex-wrap gap-3 mt-1.5 text-(--desc-color)">
            <template v-for="([key, value]) in Object.entries(info.stat)">
            <div class="flex flex-nowrap gap-1 items-center" v-if="value">
                <i class="bcc-iconfont" :class="iconMap[key as keyof typeof iconMap]"></i>{{ stat(value) }}
            </div>
            </template>
        </div>
        <span class="text-sm line-clamp-3 mt-1.5 ellipsis">{{ info.desc }}</span>
    </div>
    <a v-if="props.info.nfo.upper?.avatar"
        @click="openUrl('https://space.bilibili.com/' + info.nfo.upper?.mid)"
        class="flex flex-col items-center cursor-pointer min-w-16"
    >
        <Image :src="props.info.nfo.upper.avatar + '@64h'" :height="36" class="rounded-full!" />
        <span class="text-xs ellipsis mt-1">{{ info.nfo.upper?.name }}</span>
    </a>
</div></template>

<script setup lang="ts">
import { openUrl } from '@tauri-apps/plugin-opener';
import { MediaInfo } from '@/types/shared.d';
import { stat } from '@/services/utils';
import Image from '../Image.vue';

const props = defineProps<{
    info: MediaInfo,
}>();

const iconMap = {
    'play': 'bcc-icon-icon_list_player_x1',
    'danmaku': 'bcc-icon-danmuguanli',
    'reply': 'bcc-icon-pinglunguanli',
    'like': 'bcc-icon-ic_Likesx',
    'coin': 'bcc-icon-icon_action_reward_n_x',
    'favorite': 'bcc-icon-icon_action_collection_n_x',
    'share': 'bcc-icon-icon_action_share_n_x'
}
</script>

<style scoped>
@reference 'tailwindcss';

h2 ~ span {
    @apply whitespace-pre-wrap;
    display: -webkit-box;
}
</style>