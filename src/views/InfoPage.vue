<template><div>
<h1 class="w-full my-1.5">
    <i :class="[$fa.weight, 'fa-circle-info']"></i>
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
            <i :class="[$fa.weight, 'fa-code-commit']"></i>
            {{ app.hash.slice(0, 7) }}
        </span>
    </div>
    <div class="flex gap-2">
        <button
            @click="openUrl('https://github.com/btjawa/BiliTools/blob/master/CHANGELOG.md')"
        ><i :class="[$fa.weight, 'fa-memo']"></i><span>{{ $t('info.changelog') }}</span></button>
        <button class="primary-color"
            @click="updater?.check(true)"
        ><i :class="[$fa.weight, 'fa-clock-rotate-left']"></i><span>{{ $t('info.checkUpdate') }}</span></button>
    </div>
    <div class="flex gap-2">
        <button
            @click="openUrl('https://github.com/btjawa/BiliTools')"
        ><i class="fa-brands fa-github"></i><span>GitHub</span></button>
        <button
            @click="openUrl('https://btjawa.top/bilitools')"
        ><i :class="[$fa.weight, 'fa-book']"></i><span>{{ $t('info.document') }}</span></button>
        <button
            @click="openUrl('https://github.com/btjawa/BiliTools/issues/new/choose')"
        ><i :class="[$fa.weight, 'fa-bug']"></i><span>{{ $t('info.feedback') }}</span></button>
        <button
            @click="openUrl('https://afdian.com/a/BTJ_Shiroi')"
        ><i :class="[$fa.weight, 'fa-thumbs-up']"></i><span>{{ $t('info.donate') }}</span></button>
    </div>
    <div class="text-sm text">
        {{ $t('info.paid') }}<br>
        {{ $t('info.star') }}
    </div>
    <div class="desc text">
        Copyright &copy; {{(new Date()).getFullYear()}} <a
            @click="openUrl('https://github.com/btjawa')"
        >btjawa</a>. Licensed under <a
            @click="openUrl('https://github.com/btjawa/BiliTools/blob/master/LICENSE')"
        >GPL-3.0-or-later</a>.<br />
        {{ $t('info.data') }}
        <hr />
        {{ $t('info.others') }}
    </div>
</div>
</div></template>

<script lang="ts" setup>
import Updater from '@/components/Updater.vue';
import { useAppStore } from '@/store';
import { openUrl } from '@tauri-apps/plugin-opener';
import { inject, Ref } from 'vue';

const updater = inject<Ref<InstanceType<typeof Updater>>>('updater');

const app = useAppStore();
</script>

<style scoped>
@reference 'tailwindcss';

.glow {
    @apply text-(--primary-color) [text-shadow:var(--primary-color)_0_0_12px] drop-shadow-md;
}
</style>