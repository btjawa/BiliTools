<template>
<ul @contextmenu.prevent
	class="sidebar absolute flex flex-col py-2.5 px-2.5 w-[61px] h-screen bottom-0 bg-transparent transition-opacity" ref="$el"
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
	<router-link to="/down-page" custom v-slot="{ navigate }">
        <li :class="{ 'active': isActive('/down-page') }" @click="navigate">
            <i :class="`fa-${isActive('/down-page') ? 'solid' : 'light'}`" class="fa-download"></i>
        </li>
    </router-link>
    <li class="sidebar-item !mt-auto" @click="setTheme">
        <i class="fa-solid fa-moon-over-sun"></i>
    </li>
    <router-link to="/setting-page" custom v-slot="{ navigate }">
        <li :class="{ 'active': isActive('/setting-page') }" @click="navigate">
            <i :class="`fa-${isActive('/setting-page') ? 'solid' : 'light'}`" class="fa-gear"></i>
        </li>
    </router-link>
</ul></template>

<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { type as osType } from '@tauri-apps/plugin-os';
import { ApplicationError } from '@/services/utils';
import { useUserStore, useSettingsStore, useAppStore } from "@/store";
import { commands } from '@/services/backend';
import { useRoute } from 'vue-router';

const user = useUserStore();

const $el = ref<HTMLElement>();
const isActive = computed(() => {
    return (path: string) => useRoute().path == path;
});

onMounted(() => osType() === 'macos' && $el.value && ($el.value.style.paddingTop = '30px'))

async function setTheme() {
    try {
        const newTheme = await commands.setTheme(useSettingsStore().theme, true);
        if (newTheme.status === 'error') throw newTheme.error;
        const result = await commands.rwConfig('write', { theme: newTheme.data }, useAppStore().secret);
        if (result.status === 'error') throw result.error;
    } catch(err) {
        new ApplicationError(err).handleError();
    }
}
</script>

<style scoped lang="scss">
li {
	@apply relative flex items-center justify-center flex-col my-1.5;
    @apply w-10 h-10 text-[var(--desc-color)] transition-colors text-xl;
    &:hover, &.active {
        @apply text-[var(--primary-color)];
    }
}
</style>