<template><div>
<h1 class="w-full">
    <i class="fa-circle-info" :class="settings.dynFa"></i>
    <span>{{ $t('info.title') }}</span>
</h1>
<div class="flex flex-col w-full h-full mt-4 gap-4">
    <div class="flex items-end">
        <img class="h-16 mr-6" src="@/assets/img/icon.svg" />
        <img class="h-10 mb-2" src="@/assets/img/logo.svg" />
    </div>
    <div>BiliTools<a
            class="glow font-semibold cursor-pointer mx-2"
            @click="openUrl('https://github.com/btjawa/BiliTools/releases/tag/v' + app.version)"
        >v{{ app.version }}</a>
        <span class="text desc">
            <i :class="settings.dynFa" class="fa-code-commit"></i>
            {{ app.hash.slice(0, 7) }}
        </span>
    </div>
    <div class="flex gap-2">
        <button
            @click="openUrl('https://github.com/btjawa/BiliTools/blob/master/CHANGELOG.md')"
        ><i :class="[settings.dynFa, 'fa-memo']"></i><span>{{ $t('info.changelog') }}</span></button>
        <button class="primary-color"
            @click=""
        ><i :class="[settings.dynFa, 'fa-clock-rotate-left']"></i><span>{{ $t('info.checkUpdate') }}</span></button>
    </div>
    <div class="flex gap-2">
        <button
            @click="openUrl('https://github.com/btjawa/BiliTools')"
        ><i class="fa-brands fa-github"></i><span>GitHub</span></button>
        <button
            @click="openUrl('https://btjawa.top/bilitools')"
        ><i :class="[settings.dynFa, 'fa-book']"></i><span>{{ $t('info.document') }}</span></button>
        <button
            @click="openUrl('https://github.com/btjawa/BiliTools/issues/new/choose')"
        ><i :class="[settings.dynFa, 'fa-bug']"></i><span>{{ $t('info.feedback') }}</span></button>
        <button
            @click="openUrl('https://afdian.com/a/BTJ_Shiroi')"
        ><i :class="[settings.dynFa, 'fa-thumbs-up']"></i><span>{{ $t('info.donate') }}</span></button>
    </div>
    <div class="text-sm">
        {{ $t('info.paid') }}<br>
        {{ $t('info.star') }}
    </div>
    <div class="desc">
        Copyright &copy; {{(new Date()).getFullYear()}} <a
            @click="openUrl('https://github.com/btjawa')"
        >btjawa</a>. Licensed under <a
            @click="openUrl('https://github.com/btjawa/BiliTools/blob/master/LICENSE')"
        >GPL-3.0-or-later</a>.<br>
        {{ $t('info.data') }}<br>
    </div>
</div>
</div></template>

<script lang="ts" setup>
import { useSettingsStore, useAppStore } from '@/store';
import { openUrl } from '@tauri-apps/plugin-opener';

const settings = useSettingsStore();
const app = useAppStore();
</script>

<style lang="scss" scoped>
.glow {
    @apply text-[color:var(--primary-color)] [text-shadow:var(--primary-color)_0_0_12px] drop-shadow-md;
}
</style>