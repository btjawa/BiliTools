<template>
<ul data-tauri-drag-region @contextmenu.prevent class="sidebar">
    <router-link to="/login-page" custom v-slot="{ navigate }">
        <li :class="{ 'active': isActive('/login-page') }" class="sidebar-item sidebar-login-page"
            @click="store.state.inited ? navigate() : iziError('请等待初始化完成');">
            <img class="user-avatar" :src="avatarUrl" draggable="false" />
        </li>
    </router-link>
    <router-link to="/" custom v-slot="{ navigate }">
        <li :class="{ 'active': isActive('/') }" class="sidebar-item sidebar-home-page" @click="navigate">
            <i class="fa-duotone fa-house-chimney-user"></i>
            <span>主页</span>
        </li>
    </router-link>
    <router-link to="/down-page" custom v-slot="{ navigate }">
        <li class="sidebar-item sidebar-down-page" @click="navigate"
            :class="{ 'active': isActive('/down-page') }">
            <i class="fa-duotone fa-bars-progress"></i>
            <span>下载页</span>
        </li>
    </router-link>
    <router-link to="/setting-page" custom v-slot="{ navigate }">
        <li class="sidebar-item sidebar-setting-page" @click="navigate"
            :class="{ 'active': isActive('/setting-page') }">
            <i class="fa-duotone fa-gear faa-gear animated"></i>
            <span>设置</span>
        </li>
    </router-link>
</ul>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { iziError } from '../scripts/utils';
export default defineComponent({
    setup() {
        const route = useRoute();
        const store = useStore();
        const avatarUrl = computed(() => {
            return store.state.user.isLogin ? store.state.user.avatar : new URL('../assets/default-avatar.jpg', import.meta.url).href;
        });
        const userName = computed(() => {
            return store.state.user.isLogin ? store.state.user.name : '登录';
        });
        const isActive = (path: string) => route.path == path;
        return { isActive, avatarUrl, userName, store, iziError };
    },
});
</script>

<style scoped>
.sidebar {
    width: 63px;
    height: calc(100vh - 35px);
    bottom: 0;
    background-color: rgba(31,31,31,1);
    border-right: #333333 solid 1px;
    position: absolute;
    display: flex;
    flex-direction: column;
    user-select: none;
}

.user-avatar {
    width: 37px;
    height: 37px;
    border-radius: 50%;
    cursor: pointer;
}

.sidebar-item {
    width: 63px;
    height: 63px;
    color: var(--desc-color);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    margin: 8px 0;
    transition: all 0.1s;
}

.sidebar-item:hover, .sidebar-item.active {
    color: rgb(212,78,125);
    cursor: pointer;
}

.sidebar-item i {
    font-size: 22px;
    margin-bottom: 6px;
}

.sidebar-item span {
    font-size: 11px;
}

.sidebar-down-page {
    margin-bottom: auto;
}
</style>