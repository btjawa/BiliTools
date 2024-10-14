<template>
    <TitleBar />
    <ContextMenu ref="contextMenu" />
    <SideBar />
	<Updater />
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
import { TitleBar, ContextMenu, SideBar, Updater } from "@/components";
import { listen } from "@tauri-apps/api/event";
import { ApplicationError } from "@/services/utils";
import { invoke } from "@tauri-apps/api/core";
import { fetchUser, checkRefresh } from "@/services/login";

export default {
    components: {
        TitleBar,
        ContextMenu,
        SideBar,
		Updater
    },
    methods: {
        showMenu(e: MouseEvent) {
            (this.$refs.contextMenu as InstanceType<typeof ContextMenu>).showMenu(e);
        }
    },
    async mounted() {
		this.$router.push("/");
		listen('headers', e => {
			this.$store.commit('updateState', { 'data.headers': e.payload });
		});
		listen('rw_config:settings', e => {
			this.$store.commit('updateState', { settings: e.payload })
		});
        try {
			this.$store.commit('updateState', { 'data.secret': await invoke('ready') });
			await invoke('init', { secret: this.$store.state.data.secret });
			await checkRefresh();
			await fetchUser();
		} catch(err) {
			const error = err instanceof ApplicationError ? err : new ApplicationError(err as string);
			return error.handleError();
		} finally {
			this.$store.commit('updateState', { 'data.inited': true });
		}
    }
}

</script>

<style lang="scss">
.main, .updater {
	position: absolute;
	right: 0;
	bottom: 0;
	height: calc(100vh - 30px);
}
.main {
	background-color: rgba(24,24,24);
	display: flex;
	justify-content: center;
	align-items: center;
	width: calc(100vw - 61px);
	mask-size: 100% 100%;
    mask-repeat: no-repeat;
    mask-image: linear-gradient(
        to left,
        transparent 0%,
        black 0%,
        black 100%,
        transparent 100%
    );
}
.page {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	position: absolute;
	color: var(--content-color);
	padding: 24px;
	overflow: hidden;
	h1 {
		font-size: 24px;
		margin-bottom: 8px;
	}
}
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
	&.active {
		opacity: 1;
	}
}
@keyframes circle {
    0% { transform: rotate(0); }
    100% { transform: rotate(360deg); }
}
@keyframes slideIn {
    from { mask-position: 0; }
    to { mask-position: -100vw; }
}
</style>