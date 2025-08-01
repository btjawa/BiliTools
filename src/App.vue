<template>
    <TitleBar />
    <div class="main" @contextmenu="contextMenu?.init">
		<SideBar />
		<Updater ref="updater" />
		<ContextMenu ref="contextMenu" />
        <div class="loading"></div>
		<router-view v-slot="{ Component }">
            <Transition mode="out-in">
			<keep-alive>
			<component :is="Component" class="page" ref="page" />
			</keep-alive>
            </Transition>
        </router-view>
    </div>
</template>

<script setup lang="ts">
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
import { TitleBar, ContextMenu, SideBar, Updater } from "@/components";
import { useRouter } from 'vue-router';
import { ref, onMounted } from 'vue';

import { checkRefresh, fetchUser, activateCookies } from '@/services/login';
import { useAppStore, useQueueStore, useSettingsStore } from '@/store';
import { ApplicationError, setEventHook } from '@/services/utils';
import { commands } from '@/services/backend';

const page = ref();
const contextMenu = ref<InstanceType<typeof ContextMenu>>();
const updater = ref<InstanceType<typeof Updater>>();
const router = useRouter();

const app = useAppStore();
const queue = useQueueStore();
const settings = useSettingsStore();

onMounted(async () => {
	router.push('/');
	setEventHook();
	try {
		const ready = await commands.ready();
		if (ready.status === 'error') throw new ApplicationError(ready.error);
		const secret = ready.data;
		app.secret = secret;
		const init = await commands.init(secret);
		if (init.status === 'error') throw new ApplicationError(init.error);
		const data = init.data;
		const { downloads, config, ...initData } = init.data;
		settings.$patch(config);
		queue.$patch({ complete: data.downloads as any });
		app.$patch({ ...initData });
		const initLogin = await commands.initLogin(secret);
		if (initLogin.status === 'error') throw new ApplicationError(initLogin.error); 
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
.main {
	@apply absolute right-0 bottom-0 h-[calc(100vh_-_30px)];
	@apply flex w-full items-end bg-transparent overflow-visible;
}
.page {
	@apply flex flex-col relative justify-center items-center w-full h-full;
	@apply text-[color:var(--content-color)] px-6 py-3 overflow-hidden;
}
.v-enter-active {
	transition: opacity 0.3s ease;
}
.v-leave-active,
.v-enter-from,
.v-leave-to {
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
</style>