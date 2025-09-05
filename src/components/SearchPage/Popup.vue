<template><Transition name="slide">
<div class="el flex flex-col rounded-t-xl px-6 py-3 overflow-auto" v-if="v.active">
    <div class="absolute flex items-center right-4 top-4">
        <i :class="[$fa.weight, 'fa-info-circle']"></i>
        <span class="desc">{{ $t('popup.popupLint') }}</span>
        <button class="rounded-full ml-4" @click="close">
            <i class="fa-solid fa-close"></i>
        </button>
    </div>
    <template v-for="(i, k) in extras">
    <div v-if="i.data.length">
        <h2>
            <i :class="[$fa.weight, i.icon]"></i>
            <span>{{ $t(`popup.${k}.name`) }}</span>
        </h2>
        <div class="flex gap-2 overflow-x-auto mt-2">
            <template v-for="id in i.data" :key="id">
            <button
                :class="{ 'selected': selected(k, id) }"
                @click="click(k, id)"
            >{{
                id.includes('-')
                ? $t(`popup.${k}.${id.split('-')[0]}`, { num: id.split('-')[1] })
                : $t(`popup.${k}.${id}`) }}</button>
            <Dropdown
                v-if="id === 'subtitles'"
                :drop="v.extras.misc.subtitles"
                v-model="v.subtitle"
            />
            <VueDatePicker
                v-if="id === 'history'"
                v-model="v.date"
                format="yyyy-MM-dd"
                :teleport="true"
                :max-date="new Date()"
                :locale="$i18n.locale"
                :dark="$fa.isDark"
            />
            </template>
        </div>
        <hr />
    </div>
    </template>
    <template v-for="(i, k) in quality">
    <div v-if="i.data.size">
        <h2>
            <i :class="[$fa.weight, i.icon]"></i>
            <span>{{ $t('format.' + k) }}</span>
        </h2>
        <i18n-t keypath="popup.dashHint.desc" tag="span" class="desc" scope="global" v-if="k === 'fmt'">
            <a @click="openUrl('https://btjawa.top/bilitools/stream')">{{ $t('popup.dashHint.name') }}</a>
        </i18n-t>
        <span v-if="k === 'abr'" class="desc">{{ $t('popup.abrHint') }}</span>
        <div class="flex gap-2 overflow-x-auto mt-2">
            <button
                v-for="id in i.data" :key="id"
                :class="{ 'selected': v.select[k] === id }"
                @click="qualityClick(k, id)"
            >{{ $t(`quality.${k}.${id}`) }}</button>
        </div>
        <hr />
    </div>
    </template>
    <div class="flex gap-2">
        <template v-for="(i, k) in options" :key="k">
        <button
            v-if="i.data"
            :class="{ 'selected': selected('media', k) }"
            @click="click('media', k)"
        >
            <i :class="[$fa.weight, i.icon]"></i>
            <span>{{ $t('popup.mediaType.' + k) }}</span>
        </button>
        </template>
        <button class="ml-auto primary-color" @click="emit">
            <i :class="[$fa.weight, 'fa-arrow-right']"></i>
            <span>{{ $t('popup.nextStep') }}</span>
        </button>
    </div>
</div>
</Transition></template>

<script lang="ts" setup>
import { computed, reactive } from 'vue';
import { openUrl } from '@tauri-apps/plugin-opener';
import VueDatePicker from '@vuepic/vue-datepicker';

import { getDefaultQuality } from '@/services/utils';
import * as Types from '@/types/shared.d';
import Dropdown from '../Dropdown.vue';

const props = defineProps<{
    fmt: (fmt: any) => any
    close: () => any,
    emit: (select: Types.PopupSelect) => any
}>();

const v = reactive({
    active: false,
    subtitle: String(),
    date: String(),
    playUrl: {} as Types.PlayUrlProvider,
    extras: {} as Types.ExtrasProvider,
    select: {} as Types.PopupSelect,
})

const extras = computed(() => ({
    misc: {
        icon: 'fa-file-export',
        data: [
            ...v.extras.misc.aiSummary ? ['aiSummary'] : [],
            ...v.extras.misc.subtitles.length ? ['subtitles'] : [],
        ]
    },
    nfo: {
        icon: 'fa-memo-circle-info',
        data: v.extras.nfo ? ['album', 'single'] : []
    },
    danmaku: {
        icon: 'fa-subtitles',
        data: v.extras.danmaku
    },
    thumb: {
        icon: 'fa-images',
        data: v.extras.thumb,
    }
}));

const quality = computed(() => ({
    res: {
        icon: 'fa-video',
        data: new Set(v.playUrl.video?.map(v => v.id)),
    },
    enc: {
        icon: 'fa-video-plus',
        data: new Set(v.playUrl.video?.filter(i => i.id === v.select.res)?.map(v => v.codecid).filter(Boolean)) as Set<number>,
    },
    abr: {
        icon: 'fa-volume',
        data: new Set(v.playUrl.audio?.map(v => v.id)),
    },
    fmt: {
        icon: 'fa-code-simple',
        data: new Set(Types.QualityMap.fmt)
    }
}));

const options = computed(() => ({
    audioVideo: { // #81
        icon: 'fa-video',
        data: v.playUrl.video?.length && v.playUrl.audio?.length
    },
    video: {
        icon: 'fa-volume-slash',
        data: v.playUrl.video?.length
    },
    audio: {
        icon: 'fa-video-slash',
        data: v.playUrl.audio?.length
    }
}));

defineExpose({ init });

async function init(playUrl: Types.PlayUrlProvider, extras: Types.ExtrasProvider) {
    v.active = true;
    v.playUrl = playUrl;
    v.extras = extras;
    (['res', 'abr', 'enc'] as const).forEach(i => {
        v.select[i] = getDefaultQuality([...quality.value[i].data], i);
    })
    v.select.misc = {
        aiSummary: false,
        subtitles: false
    }
    v.select.nfo = {
        album: false,
        single: false,
    }
    v.select.danmaku = {
        live: false,
        history: false,
    }
    v.select.thumb = [];
    v.select.fmt = playUrl.codec;
    v.subtitle = v.extras.misc.subtitles[0]?.id ?? '';
    v.date = new Intl.DateTimeFormat('en-CA').format(new Date());
    v.select.media = {
        video: false,
        audio: false,
        audioVideo: false,
    }
}

function emit() {
    props.emit(v.select);
    close();
}

function qualityClick<K extends keyof typeof quality.value>(
  key: K,
  value: Types.PopupSelect[K]
) {
    v.select[key] = value;
    if (key === 'res') {
        v.select.enc = getDefaultQuality([...quality.value.enc.data], 'enc');
    } else if (key === 'fmt') {
        props.fmt(value);
        close();
    }
}

function click(key: keyof typeof extras.value | 'media', id: string) {
    const select = v.select[key] as any;
    if (key === 'thumb') {
        const i = select.indexOf(id);
        return i === -1 ? select.push(id) : select.splice(i, 1);
    }
    if (key === 'danmaku' && id === 'history') {
        return select[id] = select[id] ? false : v.date;
    }
    if (key === 'misc' && id === 'subtitles') {
        return select[id] = select[id] ? false : v.subtitle;
    }
    select[id] = !select[id];
}

function selected(key: keyof typeof extras.value | 'media', id: string) {
    if (key === 'thumb') {
        return v.select.thumb?.includes(id)
    } else {
        return (v.select[key] as any)?.[id];
    }
}

function close() {
    props.close();
    v.active = false;
}
</script>

<style scoped>
@reference 'tailwindcss';

.el {
    @apply absolute inset-0 mx-6 w-[calc(100%-48px)] bg-(--block-color);
}
hr {
    @apply my-2.5;
}
button {
    @apply flex-shrink-0;
    @apply border-2 border-solid border-transparent;
    &.selected {
        @apply border-(--primary-color);
    }
}
</style>