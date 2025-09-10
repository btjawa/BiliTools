<template>
<div class="flex w-full min-h-36 h-36 bg-(--block-color) rounded-lg p-4 gap-4">
    <Image :src="info.nfo.thumbs[0].url" :height="112" :ratio="16/10" />
    <div class="text flex flex-col gap-1 flex-1 min-w-0">
    <div class="flex gap-2">
        <div class="relative flex flex-col gap-1 flex-1 min-w-0">
            <h2 class="text-lg w-full truncate">{{ info.nfo.showtitle }}</h2>
            <div class="text-xs flex flex-wrap items-center text-(--desc-color)">
                <template v-for="(v, k) in info.stat">
                <template v-if="v">
                    <i class="bcc-iconfont" :class="iconMap[k]"></i>
                    <span class="ml-1.5!">{{ stat(v) }}</span>
                </template>
                </template>
            </div>
        </div>
        <a v-if="props.info.nfo.upper?.avatar"
            @click="openUrl('https://space.bilibili.com/' + info.nfo.upper?.mid)"
            class="flex flex-col items-center cursor-pointer w-20"
        >
            <Image :src="props.info.nfo.upper.avatar + '@64h'" :height="36" class="rounded-full!" />
            <span class="text-xs truncate mt-1 w-20 text-center">{{ info.nfo.upper?.name }}</span>
        </a>
    </div>
    <span class="overflow-auto text-sm whitespace-pre-wrap">{{ info.desc }}</span>
    </div>
</div>
</template>

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
</style>