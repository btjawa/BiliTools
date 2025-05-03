<template>
<div class="updater text z-[99] opacity-0 w-screen flex-col transition-opacity duration-[0.3s] pointer-events-none pt-[18px] pb-12 px-9 text-[var(--content-color)]" :class="{ active }">
    <h1 class="text-3xl"><i class="fa-wrench mr-3" :class="settings.dynFa"></i>{{ $t('updater.title') }}<span class="desc ml-3">{{ $t('updater.current', [updateData?.currentVersion]) }}</span></h1>
    <h3 class="text-lg">BiliTools v{{ updateData?.version }}<span class="desc ml-3">{{ updateData?.date }}</span></h3>
    <span class="desc">{{ $t('updater.disableUpdate') }}</span>
    <markdown-style v-html="body"
        class="updater-body leading-7 max-h-[calc(100%-165px)] overflow-auto mt-3 mb-6"
    ></markdown-style>
    <div ref="updaterAction"
        class="updater-action inline-block relative transition-opacity z-[2]"
    >
        <button @click="update" class="primary-color">
            <i class="fa-solid fa-download"></i>
            <span>{{ $t('updater.install') }}</span>
        </button>
        <button @click="cancel">{{ $t('common.cancel') }}</button>
    </div>
    <div ref="progress"
        class="progress opacity-0 inline-block absolute z-[1] left-12 transition-opacity leading-8"
    >
        <div :style="'--progress-width: ' + updateProgress.bytes * 160 / updateProgress.length + 'px;'"
            class="progress-bar inline-block mr-3 relative h-1.5 bg-[color:var(--block-color)] w-40 rounded-[3px]"
        ></div>
        <span class="inline-block min-w-[70px]">{{
            updateProgress.length ? 
            (updateProgress.bytes * 100 / updateProgress.length).toFixed(2) + ' %'
            : formatBytes(updateProgress.bytes)
        }}</span>
    </div>
</div>
</template>

<script setup lang="ts">
import { ApplicationError, formatBytes } from '@/services/utils';
import { markRaw, reactive, ref } from 'vue';
import { useSettingsStore } from "@/store";
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { marked } from 'marked';
import i18n from '@/i18n';
import { info } from '@tauri-apps/plugin-log';

const updateData = ref<Update | null>(null);
const body = ref(String());
const active = ref(false);
const updaterAction = ref<HTMLElement>();
const progress = ref<HTMLElement>();
const mainElement = ref<HTMLElement>();
const sidebarElement = ref<HTMLElement>();

const updateProgress = reactive({
  bytes: 0,
  length: 1,
  completed: false,
});

const settings = useSettingsStore();

defineExpose({ checkUpdate });
async function checkUpdate() {
    const proxy = settings.proxyUrl();
    try {
        const update = await check({ ...(proxy && { proxy }) });
        console.log('Update:', update);
        info('Update: ' + JSON.stringify(update));
        if (!update) return;
        updateData.value = markRaw(update);
        body.value = await marked.parse(update.body || '');
    } catch(err) {
        new ApplicationError(err + '\n' + i18n.global.t('error.tryManualUpdate')).handleError();
    }
    body.value = body.value.replace(/<a href=/g, '<a target="_blank" href=');
    mainElement.value = (document.querySelector('.main') as HTMLElement);
    sidebarElement.value = (document.querySelector('.sidebar') as HTMLElement);
    mainElement.value.animate(
        [ { maskPosition: '0' },
            { maskPosition: '-100vw' } ],
        { duration: 600,
            easing: 'cubic-bezier(0.2,1,1,1)',
            fill: 'forwards' } );
    sidebarElement.value.style.opacity = '0';
    sidebarElement.value.style.pointerEvents = 'none';
    setTimeout(() => active.value = true, 400);
}

async function update() {
    if (!updaterAction.value || !progress.value) return;
    updaterAction.value.style.opacity = '0';
    updaterAction.value.style.pointerEvents = 'none';
    progress.value.classList.add('active');
    try {
        await updateData.value?.downloadAndInstall((event) => {
            switch (event.event) {
            case 'Started':
                updateProgress.length = event.data?.contentLength || 0;
                console.log(`started downloading ${event.data.contentLength} bytes`);
                info(`started downloading ${event.data.contentLength} bytes`);
                break;
            case 'Progress':
                updateProgress.bytes += event.data.chunkLength;
                console.log(`downloaded ${updateProgress.bytes} from ${updateProgress.length}`);
                info(`downloaded ${updateProgress.bytes} from ${updateProgress.length}`);
                break;
            case 'Finished':
                updateProgress.completed = true;
                console.log('download finished');
                info('download finished');
                break;
            }
        });
        await relaunch();
    } catch(err) {
        new ApplicationError(err).handleError();
    }
}

function cancel() {
    if (!sidebarElement.value) return;
    mainElement.value?.animate(
        [ { maskPosition: '-100vw' },
            { maskPosition: '0' } ],
        { duration: 600,
            easing: 'cubic-bezier(0.2,1,1,1)',
            fill: 'forwards' } );
    sidebarElement.value.style.opacity = '1';
    sidebarElement.value.style.pointerEvents = 'all';
    active.value = false;
}
</script>
    
<style scoped lang="scss">
.updater.active, .progress.active {
    opacity: 1;
    pointer-events: all;
}
button {
    margin-right: 16px;
    display: inline-block;
    min-height: 32px;
    border-radius: 8px;
    font-size: 14px;
    padding: 6px 10px;
    i {
        margin-right: 8px;
    }
}
.progress-bar::after {
    content: '';
    position: absolute;
    width: var(--progress-width);
    height: 6px;
    inset: 0;
    border-radius: 3px;
    background-color: var(--primary-color);
}
</style>