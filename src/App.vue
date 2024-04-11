<template>
    <TitleBar/>
    <ContextMenu ref="contextMenu" />
    <SideBar />
    <div class="main" @contextmenu.prevent="showMenu">
        <div class="loading"></div>
        <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
                <keep-alive><component :is="Component" class="page" /></keep-alive>
            </transition>
        </router-view>
    </div>
</template>

<script lang="ts">
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
import TitleBar from "./components/TitleBar.vue";
import ContextMenu from "./components/ContextMenu.vue";
import SideBar from "./components/SideBar.vue";
import { useRouter } from "vue-router";
import { iziError } from "./scripts/utils"; 
import { listen } from "@tauri-apps/api/event";
import { ref } from 'vue';

export default {
    components: {
        TitleBar,
        ContextMenu,
        SideBar
    },
    mounted() {
        this.$store.dispatch('init');
        listen('headers', (e) => this.$store.commit('updateHeaders', e.payload));
        listen('error', (e) => iziError(e.payload as string));
    },
    setup() {
        const contextMenu = ref(null);
        const router = useRouter();
        router.push("/");
        function showMenu(e: MouseEvent) {
            if (contextMenu.value)
            (contextMenu.value as any).showMenu(e);
        }
        return { contextMenu, showMenu }
    },
}

</script>

<style scoped>
.main {
    background-color: rgb(24,24,24);
    display: flex;
    justify-content: center;
    align-items: center;
    position: absolute;
    right: 0;
    bottom: 0;
    width: calc(100vw - 61px);
    height: calc(100vh - 35px);
}

.page {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    color: var(--content-color);
}

/* .fade-leave-active, */
.fade-enter-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.loading {
    position: absolute;
    width: 30px;
    height: 30px;
    top: 0;
    left: 0;
    z-index: 99;
    margin: 24px;
    opacity: 0;
    border: 2px solid #c4c4c4;
    border-top-color: rgba(255, 255, 255, 0.2);
    border-right-color: rgba(255, 255, 255, 0.2);
    border-bottom-color: rgba(255, 255, 255, 0.2);
    border-radius: 100%;
    transition: opacity 0.2s;
    animation: circle infinite 0.75s linear;
}

.loading.active {
    opacity: 1;
}

@keyframes circle {
    0% { transform: rotate(0); }
    100% { transform: rotate(360deg); }
}
</style>