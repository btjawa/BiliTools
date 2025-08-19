<template><div class="flex w-full min-h-36 h-36 bg-[color:var(--block-color)] rounded-lg p-4 gap-4">
    <img :src="cover" class="object-cover rounded-lg" />
    <div class="text flex flex-col flex-1 min-w-0">
        <h2 class="text-lg ellipsis">{{ info.nfo.showtitle }}</h2>
        <div class="text-xs flex flex-wrap gap-3 mt-1.5 text-[var(--desc-color)]">
            <template v-for="([key, value]) in Object.entries(info.stat)">
            <div class="flex flex-nowrap gap-1" v-if="value">
                <i class="bcc-iconfont" :class="iconMap[key as keyof typeof iconMap]"></i>
                {{ stat(value) }}
            </div>
            </template>
        </div>
        <span class="text-sm line-clamp-3 mt-2 ellipsis">{{ info.desc }}</span>
    </div>
    <div v-if="avatar" @click="open('https://space.bilibili.com/' + info.nfo.upper?.mid)"
        class="flex flex-col items-center cursor-pointer"
    >
        <img :src="avatar" class="w-9 rounded-full" />
        <span class="text-xs ellipsis max-w-16 mt-1">{{ info.nfo.upper?.name }}</span>
    </div>
</div></template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getBlob, stat } from '@/services/utils';
import { MediaInfo } from '@/types/shared.d';

const props = defineProps<{
    info: MediaInfo,
    open: (path: string) => void
}>();
const avatar = ref(String());
const cover = ref(String());

const iconMap = {
    'play': 'bcc-icon-icon_list_player_x1',
    'danmaku': 'bcc-icon-danmuguanli',
    'reply': 'bcc-icon-pinglunguanli',
    'like': 'bcc-icon-ic_Likesx',
    'coin': 'bcc-icon-icon_action_reward_n_x',
    'favorite': 'bcc-icon-icon_action_collection_n_x',
    'share': 'bcc-icon-icon_action_share_n_x'
}

onMounted(async () => {
    avatar.value = props.info.nfo.upper?.avatar
    ? await getBlob(props.info.nfo.upper.avatar + '@64h')
    : '';
    cover.value = await getBlob(props.info.nfo.thumbs[0].url);
})
</script>

<style scoped lang="scss">
h2 ~ span {
    @apply whitespace-pre-wrap;
    display: -webkit-box;
}
</style>