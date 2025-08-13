<template>
<ul @contextmenu.prevent
	class="flex flex-col py-4 px-2.5 gap-3 h-screen bg-[var(--block-color)]"
    :class="{ 'pt-[30px]': osType() === 'macos' }"
>
    <li
        v-for="v in list" @click="click(v.path)"
        :class="{ 'active': $route.path === v.path, 'mt-auto': v.path === 'theme' }"
    >
        <img v-if="v.path === '/user-page'" class="w-9 h-9 rounded-full" :src="v.icon" />
        <i v-else :class="[$route.path === v.path ? 'fa-solid' : 'fa-light', v.icon]"></i>
    </li>
</ul></template>

<script setup lang="ts">
import { computed, inject, Ref } from 'vue';
import { type as osType } from '@tauri-apps/plugin-os';
import { useUserStore, useSettingsStore } from "@/store";
import Updater from './Updater.vue';
import router from '@/router';

const user = useUserStore();
const settings = useSettingsStore();

const updater = inject<Ref<InstanceType<typeof Updater>>>('updater');

const list = computed(() => ([
    { path: '/user-page', icon: user.getAvatar },
    { path: '/', icon: 'fa-magnifying-glass' },
    { path: '/history-page', icon: 'fa-clock' },
    { path: '/down-page', icon: 'fa-download' },
    { path: 'theme', icon: 'fa-solid fa-moon-over-sun' },
    { path: '/settings-page', icon: 'fa-gear' },
    { path: '/info-page', icon: 'fa-circle-info' },
]));

function setTheme() {
    settings.theme = settings.isDark ? 'light' : 'dark';
}

async function click(path: string) {
    if (path === 'theme') return setTheme();
    if (updater?.value.active) updater.value?.close();
    router.push(path);
}
</script>

<style scoped lang="scss">
li {
	@apply relative flex items-center justify-center flex-col w-9 h-9;
    @apply text-[var(--desc-color)] transition-colors text-xl cursor-pointer;
    &:hover, &.active {
        @apply text-[var(--primary-color)];
    }
}
</style>