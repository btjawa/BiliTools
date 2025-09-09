<template>
<ul @contextmenu.prevent
	class="flex flex-col py-4 px-2.5 gap-3 h-screen"
    :class="[os, { 'bg-(--block-color)': $fa.isDark }]"
>
    <li
        v-for="v in list" @click="click(v.path)"
        :class="{ 'active': $route.path === v.path, 'mt-auto': v.path === 'theme' }"
    >
        <template v-if="v.path === '/user-page'">
            <Image v-if="user.isLogin" :src="v.icon" class="rounded-full!" />
            <img v-else class="w-9 h-9 rounded-full" :src="v.icon" />
        </template>
        <i v-else :class="[$route.path === v.path ? 'fa-solid' : 'fa-light', v.icon]"></i>
    </li>
</ul></template>

<script setup lang="ts">
import { computed, inject, Ref } from 'vue';
import { type as osType } from '@tauri-apps/plugin-os';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useUserStore, useSettingsStore, useAppStore } from "@/store";
import Updater from './Updater.vue';
import router from '@/router';
import Image from './Image.vue';

const user = useUserStore();
const settings = useSettingsStore();
const app = useAppStore();
const os = osType();

const updater = inject<Ref<InstanceType<typeof Updater>>>('updater');

const list = computed(() => ([
    { path: '/user-page', icon: user.getAvatar },
    { path: '/', icon: 'fa-magnifying-glass' },
    { path: '/history-page', icon: 'fa-clock' },
    { path: '/down-page', icon: 'fa-download' },
    { path: 'theme', icon: 'fa-solid fa-moon-over-sun' },
    { path: 'pin', icon: app.isAlwaysOnTop ? 'fa-solid fa-thumbtack' : 'fa-light fa-thumbtack' },
    { path: '/settings-page', icon: 'fa-gear' },
    { path: '/info-page', icon: 'fa-circle-info' },
]));

function setTheme() {
    settings.theme = settings.isDark ? 'light' : 'dark';
}

async function toggleAlwaysOnTop() {
    try {
        const window = getCurrentWindow();
        const newState = !app.isAlwaysOnTop;
        await window.setAlwaysOnTop(newState);
        app.isAlwaysOnTop = newState;
    } catch (error) {
        console.error('Failed to toggle always on top:', error);
    }
}

async function click(path: string) {
    if (path === 'theme') return setTheme();
    if (path === 'pin') return toggleAlwaysOnTop();
    if (updater?.value.active) updater.value?.close();
    router.push(path);
}
</script>

<style scoped>
@reference 'tailwindcss';

li {
	@apply relative flex items-center justify-center flex-col w-9 h-9;
    @apply text-(--desc-color) transition-colors text-xl cursor-pointer;
    &:hover, &.active {
        @apply text-(--primary-color);
    }
}
ul.macos {
    @apply pt-[36px];
}
</style>