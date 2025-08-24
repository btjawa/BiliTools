<template>
    <TitleBar />
    <div class="main" @contextmenu.prevent="contextMenu?.init">
		<SideBar />
		<ContextMenu ref="contextMenu" />
        <div class="loading"></div>
		<router-view v-slot="{ Component }">
            <Transition mode="out-in">
			<keep-alive>
			<component :is="Component" class="page" ref="page" />
			</keep-alive>
            </Transition>
        </router-view>
		<Updater ref="updater" />
    </div>
</template>

<script setup lang="ts">
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
import { ref, onMounted, provide, watch, getCurrentInstance, reactive } from 'vue';
import { TitleBar, ContextMenu, SideBar, Updater } from "@/components";
import { useRouter } from 'vue-router';

import { checkRefresh, fetchUser, activateCookies } from '@/services/login';
import { useAppStore, useQueueStore, useSettingsStore } from '@/store';
import { setEventHook } from '@/services/utils';
import { AppError } from '@/services/error';
import { commands } from '@/services/backend';

const page = ref();
const contextMenu = ref<InstanceType<typeof ContextMenu>>();
const updater = ref<InstanceType<typeof Updater>>();
const router = useRouter();

const settings = useSettingsStore();
const queue = useQueueStore();
const app = useAppStore();
const context = getCurrentInstance()?.appContext!;

watch(() => settings.isDark, (v) => {
	const props = context.config.globalProperties;
	if (!props.$fa) props.$fa = reactive<any>({});
	props.$fa.weight = v ? 'fa-solid' : 'fa-light';
	props.$fa.isDark = v;
}, { immediate: true });

context.app.config.errorHandler = e => new AppError(e, { name: 'AppError' }).handle();

provide('page', page);
provide('updater', updater);

onMounted(async () => {
	router.push('/');
	setEventHook();

	const ready = await commands.ready();
	if (ready.status === 'error') throw new AppError(ready.error);
	const secret = ready.data;
	app.secret = secret;

	const init = await commands.init(secret);
	if (init.status === 'error') throw new AppError(init.error);
	const { config, tasks, status, ...initData } = init.data;
	app.$patch({ ...initData });
	queue.$patch(v => {
		v.tasks = tasks as any;
		v.status = status as any;
	});
	settings.$patch(config);

	const initLogin = await commands.initLogin(secret);
	if (initLogin.status === 'error') throw new AppError(initLogin.error);

	await checkRefresh();
	await fetchUser();
	await activateCookies();
	app.inited = true;
})
</script>

<style lang="scss">
.main {
	@apply absolute right-0 bottom-0 h-[calc(100vh-30px)];
	@apply flex w-full items-end bg-transparent overflow-visible;
}
.page {
	@apply flex flex-col relative justify-center items-center w-full h-full;
	@apply text-[color:var(--content-color)] px-6 overflow-hidden;
}
.loading {
	@apply absolute w-8 h-8 top-2 right-6 opacity-0 z-[99] pointer-events-none transition-opacity;
	@apply border-solid border-2 border-[color:var(--solid-block-color)] border-l-[color:var(--content-color)] rounded-full;
	animation: circle infinite 0.75s linear;
	&.active { opacity: 1 }
}
@keyframes circle {
    0% { transform: rotate(0); }
    100% { transform: rotate(360deg); }
}
.v-enter-active {
	transition: opacity 0.3s ease;
}
.v-leave-active,
.v-enter-from,
.v-leave-to {
	opacity: 0;
}
.slide-enter-active,
.slide-leave-active {
	transition: transform 0.5s cubic-bezier(0,1,0.6,1), opacity 0.3s;
}
.slide-enter-from,
.slide-leave-to {
    @apply translate-y-8 opacity-0;
}
</style>