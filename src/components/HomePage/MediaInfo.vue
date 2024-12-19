<template><div class="flex w-full h-40 bg-[color:var(--block-color)] rounded-lg p-4 gap-4">
    <img :src="info.cover" draggable="false" class="object-cover rounded-lg" />
    <div class="info__details text h-full w-full">
        <h3 class="w-[calc(100%-64px)] text-lg">{{ info.title }}</h3>
        <div v-if="info.upper && info.upper.avatar" @click="open('https://space.bilibili.com/' + info.upper.mid)"
            class="user absolute flex flex-col items-center top-4 right-4 cursor-pointer"
        >
            <img :src="info.upper?.avatar" draggable="false" class="w-9 rounded-[50%]" />
            <span class="text-xs ellipsis max-w-16 mt-1">{{ info.upper.name }}</span>
        </div>
        <div class="stat text-xs flex gap-3 mt-1.5 text-[var(--desc-color)]">
            <div v-if="info.stat" class="stat_item flex" v-for="([key, value]) in Object.entries(info.stat)">
                <i class="bcc-iconfont mr-1" :class="iconMap[key as keyof typeof iconMap]"></i>
                <span>{{ stat(value ?? '') }}</span>
            </div>
        </div>
        <span class="w-[calc(100%-64px)] text-sm block mt-2" v-html="info.desc"></span>
    </div>
</div></template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { stat } from '@/services/utils';
import { MediaInfo } from '@/types/data.d';

export default defineComponent({
    props: {
        info: {
            type: Object as PropType<MediaInfo>,
            required: true,
        },
        open: {
            type: Function as PropType<(path: string) => void>,
            required: true,
        },
    },
    data() {
        return {
            iconMap: {
				'play': 'bcc-icon-icon_list_player_x1',
				'danmaku': 'bcc-icon-danmuguanli',
				'reply': 'bcc-icon-pinglunguanli',
				'like': 'bcc-icon-ic_Likesx',
				'coin': 'bcc-icon-icon_action_reward_n_x',
				'favorite': 'bcc-icon-icon_action_collection_n_x',
				'share': 'bcc-icon-icon_action_share_n_x'
			},
            stat
        }
    }
});
</script>

<style scoped>
.info__details {
	h3, & > span {
        @apply overflow-hidden text-ellipsis;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
    }
}
</style>