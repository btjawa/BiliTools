<!-- ADD KEY FOR EACH V-FOR -->

<template><Transition name="slide">
<div class="popup flex flex-col gap-2 w-full h-full px-6 py-3 overflow-auto" v-if="v.active">
    <button class="absolute right-4 top-4 rounded-full" @click="close">
        <i class="fa-solid fa-close"></i>
    </button>
    <h2>テストですよ</h2>
    <div class="flex gap-2 overflow-x-auto">
    <button
        v-for="id in new Set(v.playUrl.video?.map(v => v.id))"
        :class="{ 'selected': v.select.res === id }"
        @click="click('res', id)"
    >
        <i class="fa-solid fa-video"></i>
        <span>{{ $t('quality.res.' + id) }}</span>
    </button>
    </div>
    <hr />
    <div>
        <h2>{{ $t('format.fmt') }}</h2>
        <i18n-t keypath="search.dash.desc" tag="span" class="desc" scope="global">
            <a @click="openUrl('https://btjawa.top/bilitools#关于-DASH-FLV-MP4')">{{ $t('search.dash.name') }}</a>
        </i18n-t>
    </div>
    <div class="flex gap-2 overflow-x-auto">
    <button
        v-for="id in Types.QualityMap.fmt"
        :class="{ 'selected': v.select.fmt === id }"
        @click="click('fmt', id)"
    >
        <i class="fa-solid fa-signal-stream"></i>
        <span>{{ $t('quality.fmt.' + id) }}</span>
    </button>
    </div>
</div>
</Transition></template>

<script lang="ts" setup>
import { reactive } from 'vue';
import * as Types from '@/types/data.d';
import { getDefaultQuality } from '@/services/utils';
import { openUrl } from '@tauri-apps/plugin-opener';

const v = reactive({
    active: false,
    isPackage: false,
    playUrl: {} as Types.PlayUrlProvider,
    select: {} as Types.CurrentSelect
})

defineExpose({ init });

async function init(playUrl: Types.PlayUrlProvider, isPackage: boolean, fmt: Types.StreamFormat) {
    v.active = true;
    v.isPackage = isPackage;
    v.playUrl = playUrl;
    v.select.res = getDefaultQuality(playUrl.videoQualities ?? [], 'res');
    v.select.abr = getDefaultQuality(playUrl.audioQualities ?? [], 'abr');
    v.select.enc = getDefaultQuality(
        playUrl.video?.filter(n => n.id === v.select.res).map(v => v.codecid ?? -1) ?? [], 'enc'
    )
    v.select.fmt = fmt;
}

function click<K extends keyof Types.CurrentSelect>(
  key: K,
  value: Types.CurrentSelect[K]
) {
  v.select[key] = value;
}


function close() {
    v.active = false;
}
</script>

<style lang="scss" scoped>
.popup {
    @apply absolute inset-0 bg-[var(--solid-block-color)];
}
hr {
    @apply my-2;
}
button {
    @apply flex-shrink-0;
    @apply border-2 border-solid border-transparent;
    &.selected {
        @apply border-[var(--primary-color)];
    }
}
.slide-enter-active,
.slide-leave-active {
	transition: transform 0.5s cubic-bezier(0,1,0.6,1), opacity 0.3s;
}
.slide-enter-from,
.slide-leave-to {
    @apply translate-y-8 opacity-0;
}
</style>