<template>
<ul @contextmenu.prevent
	:class="{'macos': osType() === 'macos'}" :style="{ paddingTop: osType() === 'macos' ? '30px' : '' }"
	class="sidebar absolute flex flex-col py-2.5 px-2.5 w-[61px] h-screen bottom-0 bg-[color:transparent] opacity-100 transition-all"
>
    <router-link to="/user-page" custom v-slot="{ navigate }">
        <li :class="{ 'active': isActive('/user-page') }" class="sidebar-item mb-3"
            @click="store.data.inited ? navigate() : iziError(new Error('请等待初始化完成'));">
            <img class="user-avatar w-[37px] h-[37px] rounded-[50%] cursor-pointer"
				:src="store.user.isLogin ? store.user.avatar : '/src/assets/img/profile/default-avatar.jpg'"
				draggable="false"
			/>
        </li>
    </router-link>
    <router-link to="/" custom v-slot="{ navigate }">
        <li :class="{ 'active': isActive('/') }" class="sidebar-item" @click="navigate">
            <i :class="{ 'fa-duotone': isActive('/'), 'fa-regular': !isActive('/'), }"
            class="fa-house-chimney-user"></i>
        </li>
    </router-link>
	<router-link to="/down-page" custom v-slot="{ navigate }">
        <li class="sidebar-item" @click="navigate"
            :class="{ 'active': isActive('/down-page') }">
            <i :class="{ 'fa-duotone': isActive('/down-page'), 'fa-regular': !isActive('/down-page'), }"
            class="fa-bars-progress"></i>
        </li>
    </router-link>
    <router-link to="/fav-page" custom v-slot="{ navigate }">
        <li class="sidebar-item" @click="navigate"
            :class="{ 'active': isActive('/fav-page') }">
            <i :class="{ 'fa-duotone': isActive('/fav-page'), 'fa-regular': !isActive('/fav-page'), }"
            class="fa-bookmark"></i>
        </li>
    </router-link>
    <router-link to="/setting-page" custom v-slot="{ navigate }">
        <li class="sidebar-item !mt-auto" @click="navigate"
            :class="{ 'active': isActive('/setting-page') }">
            <i :class="{ 'fa-duotone': isActive('/setting-page'), 'fa-regular': !isActive('/setting-page'), }"
            class="fa-gear"></i>
        </li>
    </router-link>
</ul></template>

<script lang="ts">
import { defineComponent } from 'vue';
import { iziError } from '@/services/utils';
import { type as osType } from '@tauri-apps/plugin-os';
export default defineComponent({
    methods: {
        isActive(path: string) { return this.$route.path == path },
        iziError
    },
	data() {
		return {
			store: this.$store.state,
			osType
		}
	},
    computed: {
        avatarUrl(): string {
            return this.store.user.isLogin ? this.store.user.avatar : new URL('@/assets/img/profile/default-avatar.jpg', import.meta.url).href;
        },
    }
});
</script>

<style scoped lang="scss">
.sidebar-item {
	width: 40px;
	height: 40px;
	color: var(--desc-color);
	@apply relative flex items-center justify-center flex-col my-1.5;
	transition: background-color 0.1s;
	font-size: 21px;
	&:hover, &.active {
		background-color: rgba(80, 80, 80, 0.5);
		border-radius: 6px;
	}
}
.sidebar-item:hover, .sidebar-item.active {
	color: var(--primary-color);
	cursor: pointer;
}
</style>