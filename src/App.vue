<template>
    <TitleBar/>
    <ContextMenu ref="contextMenu" />
    <SideBar />
    <div class="main" @contextmenu.prevent="showMenu">
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
    background-color: rgba(23,23,23,0.75);
    display: flex;
    justify-content: center;
    align-items: center;
    position: absolute;
    right: 0;
    bottom: 0;
    width: calc(100vw - 63px);
    height: calc(100vh - 35px);
}

.page {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--content-color);
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>