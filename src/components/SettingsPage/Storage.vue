<template>
<section>
    <h2>
        <i :class="[settings.dynFa, 'fa-folder']"></i>
        <span>{{ $t('settings.paths.name') }}</span>
    </h2>
    <span class="desc">{{ $t('settings.paths.desc') }}</span>
    <div v-for="v in pathList">
        <h3>{{ $t('settings.paths.' + v) }}</h3>
        <button @click="openPath(settings[v])">{{ settings[v] }}</button>
        <button @click="choosePath(v)"><i class="fa-light fa-folder-open"></i></button>
    </div>
</section>
<hr />
<section>
    <h2>
        <i :class="[settings.dynFa, 'fa-database']"></i>
        <span>{{ $t('settings.cache.name') }}</span>
    </h2>
    <span class="desc">{{ $t('settings.cache.desc') }}</span>
    <div v-for="v in cacheList">
        <h3>{{ $t('settings.cache.' + v) }}</h3>
        <button @click="openPath(app.paths[v])">{{ formatBytes(app.cache[v]) }}</button>
        <button @click="cleanCache(v)"><i class="fa-light fa-broom-wide"></i></button>
    </div>
</section>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import i18n from '@/i18n';

import { openPath } from '@tauri-apps/plugin-opener';
import { Channel } from '@tauri-apps/api/core';
import * as dialog from '@tauri-apps/plugin-dialog';

import { useAppStore, useSettingsStore } from '@/store';
import { commands } from '@/services/backend';
import { formatBytes } from '@/services/utils';

const settings = useSettingsStore();
const app = useAppStore();

const pathList = ['down_dir', 'temp_dir'] as const;
const cacheList = ['log', 'temp', 'webview', 'database'] as const;
type CacheKey = keyof typeof app.cache;

onMounted(() => cacheList.forEach(k => getSize(k)));

async function getSize(type: CacheKey) {
    const event = new Channel<number>();
    event.onmessage = (v) => app.cache[type] = v;
    await commands.getSize(app.paths[type], event);
}

async function cleanCache(type: CacheKey) {
    const result = await dialog.ask(i18n.global.t('settings.confirm'), { 'kind': 'warning' });
    if (!result) return;
    await commands.cleanCache(app.paths[type]);
    await getSize(type);
}

async function choosePath(type: typeof pathList[number]) {
    const path = await dialog.open({
        directory: true,
        defaultPath: settings[type]
    });
    if (!path) return;
    settings[type] = path;
    app.paths.temp = path;
}
</script>

<style lang="scss" scoped>
section > div button {
    @apply m-0;
    &:nth-of-type(1) {
        @apply min-w-24 max-w-[420px] rounded-r-none;
    }
    &:nth-of-type(2) {
        @apply bg-[var(--primary-color)] rounded-l-none;
    }
}
</style>