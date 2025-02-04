<template>
<ul @contextmenu.prevent
	class="sidebar absolute flex flex-col py-2.5 px-2.5 w-[61px] h-screen bottom-0 bg-transparent transition-opacity" ref="$el"
>
    <router-link to="/user-page" custom v-slot="{ navigate }">
        <li :class="{ 'active': isActive('/user-page') }" class="cursor-pointer"
            @click="store.state.data.inited ? navigate() : new ApplicationError($t('error.waitInit'), { noStack: true }).handleError()">
            <img class="w-9 h-9 rounded-[50%]" :src="avatarUrl" raggable="false" />
        </li>
    </router-link>
    <router-link to="/" custom v-slot="{ navigate }">
        <li :class="{ 'active': isActive('/') }" @click="navigate">
            <i :class="{ 'fa-solid': isActive('/'), 'fa-light': !isActive('/'), }"
            class="fa-magnifying-glass"></i>
        </li>
    </router-link>
	<router-link to="/down-page" custom v-slot="{ navigate }">
        <li @click="navigate"
            :class="{ 'active': isActive('/down-page') }">
            <i :class="{ 'fa-solid': isActive('/down-page'), 'fa-light': !isActive('/down-page'), }"
            class="fa-bars-progress"></i>
        </li>
    </router-link>
    <router-link to="/fav-page" custom v-slot="{ navigate }">
        <li @click="navigate"
            :class="{ 'active': isActive('/fav-page') }">
            <i :class="{ 'fa-solid': isActive('/fav-page'), 'fa-light': !isActive('/fav-page'), }"
            class="fa-bookmark"></i>
        </li>
    </router-link>
    <li class="sidebar-item !mt-auto" @click="setTheme">
        <i class="fa-solid fa-moon-over-sun"></i>
    </li>
    <router-link to="/setting-page" custom v-slot="{ navigate }">
        <li @click="navigate"
            :class="{ 'active': isActive('/setting-page') }">
            <i :class="{ 'fa-solid': isActive('/setting-page'), 'fa-light': !isActive('/setting-page'), }"
            class="fa-gear"></i>
        </li>
    </router-link>
</ul></template>

<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { type as osType } from '@tauri-apps/plugin-os';
import { ApplicationError } from '@/services/utils';
import { commands } from '@/services/backend';
import { useRoute } from 'vue-router';
import store from '@/store';

const $el = ref<HTMLElement>();
const isActive = computed(() => {
    return (path: string) => useRoute().path == path;
});
const avatarUrl = computed(() => {
    return store.state.user.isLogin ? store.state.user.avatar : new URL('@/assets/img/profile/default-avatar.jpg', import.meta.url).href;
});

async function setTheme() {
    const newTheme = store.state.settings.theme === 'dark' ? 'light' : 'dark';
    const result = await commands.rwConfig('write', { theme: newTheme }, store.state.data.secret);
    if (result.status === 'error') throw new ApplicationError(result.error);
}

onMounted(() => {
    if (osType() === 'macos' && $el.value) $el.value.style.paddingTop = '30px';
})
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