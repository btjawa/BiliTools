<template><div class="flex w-full min-h-36 bg-[color:var(--block-color)] rounded-lg p-4 gap-4">
    <img :src="cover" class="object-cover rounded-lg" />
    <div class="flex w-full">
        <div class="text h-full w-full">
            <h3 ref="title" class="text-lg">{{ info.nfo.showtitle }}</h3>
            <div class="text-xs flex flex-wrap gap-3 mt-1.5 text-[var(--desc-color)]">
                <template v-for="([key, value]) in Object.entries(info.stat)">
                <div class="flex flex-nowrap gap-1" v-if="value">
                    <i class="bcc-iconfont" :class="iconMap[key as keyof typeof iconMap]"></i>
                    {{ stat(value) }}
                </div>
                </template>
            </div>
            <span ref="desc" class="text-sm block mt-2 whitespace-pre-wrap">{{ info.desc }}</span>
        </div>
        <div v-if="avatar" @click="open('https://space.bilibili.com/' + info.nfo.upper?.mid)"
            class="flex flex-col items-center cursor-pointer"
        >
            <img :src="avatar" class="w-9 rounded-full" />
            <span class="text-xs ellipsis max-w-16 mt-1">{{ info.nfo.upper?.name }}</span>
        </div>
    </div>
</div></template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ApplicationError, getBlob, stat } from '@/services/utils';
import { MediaInfo } from '@/types/data.d';

const props = defineProps<{
    info: MediaInfo,
    open: (path: string) => void
}>();

const title = ref<HTMLElement>();
const desc = ref<HTMLElement>();
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
    if (!title.value || !desc.value) return;
    const titleHeight = title.value.offsetHeight;
    const lineHeight = parseFloat(getComputedStyle(title.value).lineHeight);
    desc.value.style.webkitLineClamp = titleHeight <= lineHeight ? '3' : '2';
    try {
        avatar.value = props.info.nfo.upper?.avatar
        ? await getBlob(props.info.nfo.upper.avatar + '@64h')
        : '';
        cover.value = await getBlob(props.info.cover);
    } catch (err) {
        new ApplicationError(err).handleError();
    }
})
</script>

<style scoped lang="scss">
h3, h3 ~ span {
    @apply overflow-hidden text-ellipsis;
    display: -webkit-box;
    -webkit-box-orient: vertical;
}
</style>