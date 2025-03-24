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
                @click="getOthers(btn.id, { date, subtitle })"
            >
                <i :class="[settings.dynFa, btn.icon]"></i>
                <span>{{ $t('home.label.' + btn.id) }}</span>
            </button>
            <VueDatePicker v-if="item.content.find(c => c.id === 'historyDanmaku')"
                v-model="date" :dark="settings.isDark"
                model-type="format" format="yyyy-MM-dd"
                id="historyDanmakuDate"
            />
            <div v-if="item.content.find(c => c.id === 'subtitles')">
                <select @change="($event) => subtitle = JSON.parse(($event.target as HTMLSelectElement).value)">
                    <option v-for="option in othersReqs.subtitles" :value="JSON.stringify(option)"
                    >{{ option.lan_doc + `(${option.lan})` }}</option>
                </select>
                <i class="fa-solid fa-triangle -translate-x-6 rotate-180 text-[10px]"></i>
            </div>
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
                :class="{ 'selected': (app.currentSelect as any)[item.id] === id }"
                @click="(app.currentSelect as any)[item.id] = id"
            >
                <i :class="[settings.dynFa, item.icon]"></i>
                <span>{{ $t(`common.default.${item.id}.data.${id}`) }}</span>
            </button>
        </div>
        <hr v-if="index < general.length - 1" />
        <button @click="confirm(item.id)" class="absolute right-4 primary-color"
            :class="[index === general.length - 1 ? 'bottom-0' : 'bottom-4']"
            v-if="popupType === 'audioVideo' ? index === general.length - 1
            : (item.id === 'cdc' || item.id === 'ads')"
        >
            <i :class="[settings.dynFa, 'fa-right']"></i>
            <span>{{ $t('common.confirm') }}</span>
        </button>
    </div>
</div>
</div></template>

<script setup lang="ts">
import { DashInfo, MediaType, SubtitleList } from '@/types/data.d';
import { useAppStore, useInfoStore, useSettingsStore } from "@/store";
import { computed, ref } from 'vue';

const app = useAppStore();
const settings = useSettingsStore();

interface OthersReqs {
    aiSummary: number,
    danmaku: boolean,
    cover: boolean,
    manga: boolean,
	subtitles: SubtitleList[],
}

const props = defineProps<{
    getOthers: (type: any, options?: any) => any,
    pushBack: (type: any, options?: any) => any,
    open: (path: string) => void,
}>();

const othersReqs = ref<OthersReqs>({} as any);
const popupType = ref<'audioVideo' | 'others'>(String() as any);
const mediaType = ref(MediaType.Video);
const noFmt = ref(false);
const active = ref(false);
const subtitle = ref<SubtitleList>();
const date = ref(new Intl.DateTimeFormat('en-CA').format(new Date()));

const general = computed(() => {
    const info = app.playUrlInfo as DashInfo;
    return mediaType.value !== MediaType.Manga ? [
        ...(info.video ? [{
            content: [...new Set(info.video.map(item => item.id))],
            id: 'dms', icon: 'fa-file-video'
        }] : []),
        ...(info.video ? [{
            content: info.video.filter(item => item.id === app.currentSelect.dms).map(item => item.codecid),
            id: 'cdc', icon: 'fa-file-code'
        }] : []),
        ...(info.audio ? [{
            content: info.audio.map(item => item.id),
            id: 'ads', icon: 'fa-file-audio'
        }] : []),
        ...(popupType.value !== 'others' && mediaType.value === MediaType.Video && !noFmt.value ? [{
            content: useInfoStore().mediaMap.fmt.map(item => item.id),
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
            }] : []),
            ...(othersReqs.value.subtitles.length ? [{
                id: 'subtitles',
                icon: 'fa-closed-captioning'
            }] : []),
            ],
            id: 'home.downloadOptions.others'
        }] : []),
    ];
})

defineExpose({ init });

function init(type: 'audioVideo' | 'others', media_type: MediaType, options: { req: OthersReqs, noFmt?: boolean }) {
    popupType.value = type;
    othersReqs.value = options.req;
    mediaType.value = media_type;
    if (othersReqs.value.subtitles.length) subtitle.value = othersReqs.value.subtitles[0];
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
    } else if (popupType.value === 'audioVideo') {
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