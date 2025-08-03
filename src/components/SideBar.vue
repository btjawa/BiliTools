<template>
<ul @contextmenu.prevent
	class="flex flex-col py-4 px-2.5 gap-3 h-screen bg-[var(--block-color)]"
    :class="{ 'pt-[30px]': osType() === 'macos' }"
>
    <router-link to="/user-page" custom v-slot="{ navigate }">
    <li :class="{ 'active': isActive('/user-page') }" class="cursor-pointer" @click="navigate">
        <img class="w-9 h-9 rounded-[50%]" :src="user.getAvatar" raggable="false" />
    </li>
    </router-link>
    <router-link to="/" custom v-slot="{ navigate }">
    <li :class="{ 'active': isActive('/') }" @click="navigate">
        <i :class="`fa-${isActive('/') ? 'solid' : 'light'}`" class="fa-magnifying-glass"></i>
    </li>
    </router-link>
    <router-link to="/history-page" custom v-slot="{ navigate }">
    <li :class="{ 'active': isActive('/history-page') }" @click="navigate">
        <i :class="`fa-${isActive('/history-page') ? 'solid' : 'light'}`" class="fa-clock"></i>
    </li>
    </router-link>
	<router-link to="/down-page" custom v-slot="{ navigate }">
    <li :class="{ 'active': isActive('/down-page') }" @click="navigate">
        <i :class="`fa-${isActive('/down-page') ? 'solid' : 'light'}`" class="fa-download"></i>
    </li>
    </router-link>
    <li class="!mt-auto" @click="setTheme">
        <i class="fa-solid fa-moon-over-sun"></i>
    </li>
    <router-link to="/settings-page" custom v-slot="{ navigate }">
    <li :class="{ 'active': isActive('/settings-page') }" @click="navigate">
        <i :class="`fa-${isActive('/settings-page') ? 'solid' : 'light'}`" class="fa-gear"></i>
    </li>
    </router-link>
    <router-link to="/info-page" custom v-slot="{ navigate }">
    <li :class="{ 'active': isActive('/info-page') }" @click="navigate">
        <i :class="`fa-${isActive('/info-page') ? 'solid' : 'light'}`" class="fa-circle-info"></i>
    </li>
    </router-link>
</ul></template>

<script setup lang="ts">
import { computed } from 'vue';
import { type as osType } from '@tauri-apps/plugin-os';
import { useUserStore, useSettingsStore } from "@/store";
import { commands } from '@/services/backend';
import { useRoute } from 'vue-router';

const user = useUserStore();
const settings = useSettingsStore();

const isActive = computed(() => {
    return (path: string) => useRoute().path == path;
});

async function setTheme() {
    const newTheme = await commands.setTheme(settings.theme, true);
    if (newTheme.status === 'error') throw newTheme.error;
    settings.theme = newTheme.data;
}
</script>

<style scoped lang="scss">
li {
	@apply relative flex items-center justify-center flex-col;
    @apply w-9 h-9 text-[var(--desc-color)] transition-colors text-xl;
    &:hover, &.active {
        @apply text-[var(--primary-color)];
    }
}
</style>