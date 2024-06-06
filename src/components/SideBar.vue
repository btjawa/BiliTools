<template>
<ul @contextmenu.prevent class="sidebar" ref="sidebar">
    <router-link to="/user-page" custom v-slot="{ navigate }">
        <li :class="{ 'active': isActive('/user-page') }" class="sidebar-item sidebar-user-page"
            @click="inited ? navigate() : iziError('请等待初始化完成');">
            <img class="user-avatar" :src="avatarUrl" draggable="false" />
        </li>
    </router-link>
    <router-link to="/" custom v-slot="{ navigate }">
        <li :class="{ 'active': isActive('/') }" class="sidebar-item sidebar-home-page" @click="navigate">
            <i :class="{ 'fa-duotone': isActive('/'), 'fa-regular': !isActive('/'), }"
            class="fa-house-chimney-user"></i>
        </li>
    </router-link>
    <router-link to="/down-page" custom v-slot="{ navigate }">
        <li class="sidebar-item sidebar-down-page" @click="navigate"
            :class="{ 'active': isActive('/down-page') }">
            <i :class="{ 'fa-duotone': isActive('/down-page'), 'fa-regular': !isActive('/down-page'), }"
            class="fa-bars-progress"></i>
        </li>
    </router-link>
    <router-link to="/setting-page" custom v-slot="{ navigate }">
        <li class="sidebar-item sidebar-setting-page" @click="navigate"
            :class="{ 'active': isActive('/setting-page') }">
            <i :class="{ 'fa-duotone': isActive('/setting-page'), 'fa-regular': !isActive('/setting-page'), }"
            class="fa-gear"></i>
        </li>
    </router-link>
</ul>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { iziError } from '@/services/utils';
import { type } from '@tauri-apps/plugin-os';
import store from '@/store';
export default defineComponent({
    methods: {
        isActive(path: string): boolean {
            return this.$route.path == path;
        },
        iziError
    },
    computed: {
        user() { return store.state.user },
        inited() { return store.state.data.inited },
        avatarUrl(): string {
            return this.user.isLogin ? this.user.avatar : new URL('@/assets/img/default-avatar.jpg', import.meta.url).href;
        },
        userName(): string {
            return this.user.isLogin ? this.user.name : '登录';
        },
    },
    mounted() {
        type().then(os => {
            if (os == "macos") (this.$refs.sidebar as HTMLElement).classList.add('macos');
        })
    }
});
</script>

<style scoped>
.sidebar {
    width: 61px;
    height: 100vh;
    bottom: 0;
    background: transparent;
    /* background-color: rgba(31,31,31,0.5); */
    border-right: #333333 solid 1px;
    position: absolute;
    display: flex;
    flex-direction: column;
    user-select: none;
    padding: 10px 0;
    transition: padding 0.2s;
}

.sidebar.macos {
    padding-top: 30px;
}

.user-avatar {
    width: 37px;
    height: 37px;
    border-radius: 50%;
    cursor: pointer;
}

.sidebar-item {
    width: 40px;
    height: 40px;
    color: var(--desc-color);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    transition: all 0.1s;
    position: relative;
    margin: 6px 10px;
}

.sidebar-item.sidebar-user-page {
    margin-bottom: 12px;
}

.sidebar-item:hover, .sidebar-item.active {
    color: var(--primary-color);
    cursor: pointer;
}

.sidebar-item:not(.sidebar-user-page):hover:before, .sidebar-item:not(.sidebar-user-page).active::before {
    background: rgba(80, 80, 80, 0.5);
}

.sidebar-item::before {
    position: absolute;
    content: '';
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: -1;
    transition: all 0.2s;
    border-radius: 6px;
}

.sidebar-item i {
    font-size: 21px;
}

.sidebar-down-page {
    margin-bottom: auto;
}
</style>