<template>
    <TitleBar />
    <ContextMenu ref="contextMenu" />
    <SideBar />
	<Updater @contextmenu.prevent="showMenu" />
    <div class="main" @contextmenu.prevent="showMenu">
        <div class="loading"></div>
        <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
                <keep-alive><component :is="Component" class="page" ref="page" /></keep-alive>
            </transition>
        </router-view>
    </div>
</template>

<script lang="ts">
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
import { provide } from "vue";
import { TitleBar, ContextMenu, SideBar, Updater } from "@/components";
import { listen } from "@tauri-apps/api/event";
import { ApplicationError } from "@/services/utils";
import { invoke } from "@tauri-apps/api/core";
import { fetchUser, checkRefresh } from "@/services/login";
import { InitData } from "@/types/data.d";
import { getCurrentWindow, Theme } from '@tauri-apps/api/window';
import { version as osVersion } from "@tauri-apps/plugin-os";
import { SearchPage } from "@/views";

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
		listen('rw_config:settings', async e => {
			this.$store.commit('updateState', { settings: e.payload });
			const window = getCurrentWindow();
			const theme = this.$store.state.settings.theme as Theme;
			const version = osVersion().split('.');
			if (version[0] === '10' && (Number(version[2]) <= 22000 )) {
				document.body.classList.remove('override-dark');
				document.body.classList.remove('override-light');
				document.body.classList.add('override-' + theme);
			}
			await window.setTheme(theme);
			this.$i18n.locale = this.$store.state.settings.language;
		});
		provide('trySearch', async (input?: string) => {
			this.$router.push('/');
			const start = Date.now();
			const checkCondition = () => {
				const page = this.$refs.page as InstanceType<typeof SearchPage>;
				if (Date.now() - start > 1000) return;
				if (page && typeof page.search === 'function') {
					page.search(input);
				} else setTimeout(checkCondition, 50);
			};
			checkCondition();
		});
        try {
			const secret = await invoke('ready');
			const data: InitData = await invoke('init', { secret });
			this.$store.commit('updateState', { 'data.secret': secret });
			this.$store.commit('updateState', { 'queue.complete': data.downloads });
			this.$store.commit('updateState', { 'data.hash': data.hash });
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
	@apply absolute right-0 bottom-0 h-[calc(100vh_-_30px)];
}
.main {
	// background-color: rgba(24,24,24);
	@apply flex justify-center items-center w-[calc(100vw_-_61px)] bg-transparent;
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
	@apply flex absolute justify-center items-center w-full h-full;
	@apply text-[color:var(--content-color)] p-6 overflow-hidden;
	h1 {
		@apply text-2xl mb-2;
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
	@apply absolute w-8 h-8 top-0 right-0 m-6 opacity-0 z-[99] pointer-events-none;
	@apply border-solid border-2 border-[color:var(--solid-block-color)] border-l-[color:var(--content-color)] rounded-full;
	@apply transition-opacity animate-[circle_infinite_0.75s_linear];
	&.active { opacity: 1 }
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