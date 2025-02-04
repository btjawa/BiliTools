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

<script setup lang="ts">
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
import { onMounted, provide, ref } from "vue";
import { TitleBar, ContextMenu, SideBar, Updater } from "@/components";
import { ApplicationError, setEventHook } from "@/services/utils";
import { fetchUser, checkRefresh } from "@/services/login";
import { commands } from "@/services/backend";
import { SearchPage } from "@/views";
import { useRouter } from "vue-router";
import store from "@/store";

const page = ref<unknown | null>(null);
const contextMenu = ref<unknown | null>(null);

function showMenu(e: MouseEvent) {
	(contextMenu.value as InstanceType<typeof ContextMenu>).showMenu(e);
}

onMounted(async () => {
	const router = useRouter();
	router.push("/");
	setEventHook();
	provide('trySearch', async (input?: string) => {
		router.push('/');
		const start = Date.now();
		const checkCondition = () => {
			const _page = page.value as InstanceType<typeof SearchPage>;
			if (Date.now() - start > 1000) return;
			if (_page && typeof _page.search === 'function') {
				_page.search(input);
			} else setTimeout(checkCondition, 50);
		};
		checkCondition();
	});
	try {
		const ready = await commands.ready();
		if (ready.status === 'error') throw new ApplicationError(ready.error);
		const secret = ready.data;
		const init = await commands.init(secret);
		if (init.status === 'error') throw new ApplicationError(init.error);
		const data = init.data;
		store.commit('updateState', { 'data.secret': secret });
		store.commit('updateState', { 'queue.complete': data.downloads });
		store.commit('updateState', { 'data.hash': data.hash });
		store.commit('updateState', { 'data.resources_path': data.resources_path });
		await checkRefresh();
		await fetchUser();
	} catch(err) {
		err instanceof ApplicationError ? err.handleError() :
		new ApplicationError(err as string).handleError();
	} finally {
		store.commit('updateState', { 'data.inited': true });
	}
})
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