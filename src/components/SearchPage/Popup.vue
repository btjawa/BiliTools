<template><div class="popup_container absolute flex items-center justify-center w-full h-full" :class="{ active }">
<div class="min-w-[calc(100%-269px)] relative h-fit p-4 rounded-xl bg-[color:var(--solid-block-color)]">
    <button class="absolute right-4 top-4 rounded-full w-8 h-8 p-0 z-30" @click="close">
        <i class="fa-solid fa-close"></i>
    </button>
    <div v-for="(item, index) in others" v-if="popupType === 'others'">
        <h3>{{ $t(item.id) }}</h3>
        <div class="flex gap-1 mt-2 items-center">
            <button
                v-for="btn in item.content"
                @click="getOthers(btn.id, { date })"
            >
                <i :class="[fa_dyn, btn.icon]"></i>
                <span>{{ $t('home.label.' + btn.id) }}</span>
            </button>
            <VueDatePicker v-if="item.content.find(c => c.id === 'historyDanmaku')"
                v-model="date" :dark
                model-type="format" format="yyyy-MM-dd"
                id="historyDanmakuDate"
            />
        </div>
        <hr v-if="index < others.length - 1" />
    </div>
    <hr v-if="others.length && general.length && popupType === 'others'" />
    <div v-for="(item, index) in general" class="relative">
        <h3>{{ $t(`common.default.${item.id}.name`) }}
        <i v-if="item.id === 'fmt'" class="fa-light fa-circle-question question"
            @click="open('https://www.btjawa.top/bilitools#关于-DASH-FLV-MP4')"
        ></i></h3>
        <div class="flex gap-1 mt-2">
            <button v-for="id in item.content"
                :class="{ 'selected': currentSelect[item.id] === id }"
                @click="currentSelect[item.id] = id"
            >
                <i :class="[fa_dyn, item.icon]"></i>
                <span>{{ $t(`common.default.${item.id}.data.${id}`) }}</span>
            </button>
        </div>
        <hr v-if="index < general.length - 1" />
        <button @click="confirm(item.id)" class="absolute right-4 primary-color"
            :class="[index === general.length - 1 ? 'bottom-0' : 'bottom-4']"
            v-if="popupType === 'audioVisual' ? index === general.length - 1
            : (item.id === 'cdc' || item.id === 'ads')"
        >
            <i :class="[fa_dyn, 'fa-right']"></i>
            <span>{{ $t('common.confirm') }}</span>
        </button>
    </div>
</div>
</div></template>

<script setup lang="ts">
import { DashInfo, MediaType } from '@/types/data.d';
import { computed, ref } from 'vue';
import store from '@/store';

interface OthersReqs {
    aiSummary: number,
    danmaku: boolean,
    cover: boolean,
    manga: boolean,
}

const props = defineProps<{
    getOthers: (type: any, options?: any) => any,
    pushBack: (type: any, options?: any) => any,
    open: (path: string) => void,
}>();

const othersReqs = ref<OthersReqs>({} as any);
const popupType = ref<'audioVisual' | 'others'>(String() as any);
const mediaType = ref(MediaType.Video);
const noFmt = ref(false);
const active = ref(false);
const date = ref(new Intl.DateTimeFormat('en-CA').format(new Date()));

const currentSelect = computed({
    get: () => store.state.data.currentSelect as any,
    set: (v: any) => store.state.data.currentSelect = v
});
const playUrlInfo = computed({
    get: () => store.state.data.playUrlInfo,
    set: (v: any) => store.state.data.playUrlInfo = v
});
const mediaMap = computed(() => store.state.data.mediaMap);
const fa_dyn = computed(() => dark.value ? 'fa-solid' : 'fa-light');
const dark = computed(() => store.state.settings.theme === 'dark');
const general = computed(() => {
    const info = playUrlInfo.value as DashInfo;
    return mediaType.value !== MediaType.Manga ? [
        ...(info.video ? [{
            content: [...new Set(info.video.map(item => item.id))],
            id: 'dms', icon: 'fa-file-video'
        }] : []),
        ...(info.video ? [{
            content: info.video.filter(item => item.id === currentSelect.value.dms).map(item => item.codecid),
            id: 'cdc', icon: 'fa-file-code'
        }] : []),
        ...(info.audio ? [{
            content: info.audio.map(item => item.id),
            id: 'ads', icon: 'fa-file-audio'
        }] : []),
        ...(popupType.value !== 'others' && mediaType.value === MediaType.Video && !noFmt.value ? [{
            content: mediaMap.value.fmt.map(item => item.id),
            id: 'fmt', icon: 'fa-file-code'
        }] : []),
    ] : [];
});

const others = computed(() => {
    return [
        ...(othersReqs.value.danmaku ? [{
            content: [{
                id: 'liveDanmaku',
                icon: 'fa-clock'
            }, {
                id: 'historyDanmaku',
                icon: 'fa-clock-rotate-left'
            }],
            id: 'home.label.danmaku'
        }] : []),
        ...(othersReqs.value.cover || othersReqs.value.aiSummary >= 0 || othersReqs.value.manga ? [{
            content: [
            ...(othersReqs.value.cover ? [{
                id: 'cover',
                icon: 'fa-image'
            }] : []),
            ...(othersReqs.value.aiSummary === 0 ? [{
                id: 'aiSummary',
                icon: 'fa-microchip-ai'
            }] : []),
            ...(othersReqs.value.manga ? [{
                id: 'manga',
                icon: 'fa-book'
            }] : [])
            ],
            id: 'home.downloadOptions.others'
        }] : []),
    ];
})

defineExpose({ init });

function init(type: 'audioVisual' | 'others', media_type: MediaType, options: { req: OthersReqs, noFmt?: boolean }) {
    popupType.value = type;
    othersReqs.value = options.req;
    mediaType.value = media_type;
    if (options.noFmt) noFmt.value = options.noFmt;
    active.value = true;
}

function close() {
    active.value = false;
}

function confirm(id: string) {
    if (popupType.value === 'others') {
        let type: string | undefined;
        if (id === 'cdc') type = 'video';
        if (id === 'ads') type = 'audio';
        if (type) props.pushBack(type, { init: true });
    } else if (popupType.value === 'audioVisual') {
        props.pushBack('all', { init: true });
    }
    close();
}
</script>

<style lang="scss">
.popup_container {
    @apply bg-opacity-50 bg-black transition-opacity duration-200 opacity-0 pointer-events-none;
    & > div {
        @apply transform translate-y-8;
        transition: transform .5s cubic-bezier(0,1,.6,1);
        button {
            border: 2px solid transparent;
            &.selected {
                border: 2px solid var(--primary-color)
            }
        }
    }
    &.active {
        @apply opacity-100;
        pointer-events: all;
        & > div {
            @apply transform translate-y-0;
        }
    }
    hr {
        @apply my-[15px];
    }
}

#historyDanmakuDate {
    @apply max-w-40;
    .dp__input {
        @apply text-sm;
    }
    .dp__menu_inner + div {
        display: none;
    }
}
</style>