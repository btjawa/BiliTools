<template>
    <TitleBar />
    <ContextMenu ref="contextMenu" />
    <SideBar />
	<Updater @contextmenu.prevent="showMenu" ref="updater" />
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
import { fetchUser, activateCookies, checkRefresh } from "@/services/login";
import { useQueueStore, useAppStore } from "@/store";
import { commands } from "@/services/backend";
import { DownPage } from "@/views";
import { useRouter } from "vue-router";

const page = ref();
const updater = ref<InstanceType<typeof Updater>>();
const contextMenu = ref<InstanceType<typeof ContextMenu>>();
const router = useRouter();
const queuePage = ref(0)

const showMenu = (e: MouseEvent) => contextMenu.value?.showMenu(e);

onMounted(async () => {
	router.push("/");
	setEventHook();
	provide('queuePage', queuePage);
	provide('checkUpdate', updater.value?.checkUpdate);
	provide('processQueue', async () => {
		await (page.value as InstanceType<typeof DownPage>)?.processQueue();
	});
	const app = useAppStore();
	try {
		const ready = await commands.ready();
		if (ready.status === 'error') throw new ApplicationError(ready.error);
		const secret = ready.data;
		app.secret = secret;
		const init = await commands.init(secret);
		if (init.status === 'error') throw new ApplicationError(init.error);
		const data = init.data;
		const { downloads, ...initData } = init.data;
		useQueueStore().$patch({ complete: data.downloads as any });
		app.$patch({ ...initData });
		await checkRefresh();
		await fetchUser();
	} catch(err) {
		new ApplicationError(err).handleError();
	} finally {
		await activateCookies().catch(e => new ApplicationError(e).handleError());
		app.inited = true;
	}
})
</script>

<style lang="scss">
.main, .updater {
	@apply absolute right-0 bottom-0 h-[calc(100vh_-_30px)];
}
.main {
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
		@apply text-2xl;
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