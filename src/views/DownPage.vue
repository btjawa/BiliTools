<template><div class="flex-col pb-0">
    <div class="queue__tab flex mt-1 mb-1 h-fit items-center hover:cursor-pointer flex-shrink-0">
        <h3 @click="queuePage = 0" :class="queuePage !== 0 || 'active'">{{ $t('downloads.tab.waiting') }}</h3>
        <div class="split h-5 mx-[21px]"></div>
        <h3 @click="queuePage = 1" :class="queuePage !== 1 || 'active'">{{ $t('downloads.tab.doing') }}</h3>
        <div class="split h-5 mx-[21px]"></div>
        <h3 @click="queuePage = 2" :class="queuePage !== 2 || 'active'">{{ $t('downloads.tab.complete') }}</h3>
    </div>
    <hr class="w-full my-4 flex-shrink-0" />
    <div class="queue__page flex flex-col w-[calc(100%-269px)] mt-[13px] h-full gap-0.5 overflow-auto" ref="$queuePage">
        <div v-for="item in queueData"
            class="queue_item relative flex w-full bg-[color:var(--block-color)] flex-col rounded-lg px-4 py-3"
        >
            <div class="flex gap-4">
                <h3 class="text-base text ellipsis w-full">{{ item.info.title }}</h3>
                <span class="desc text">{{ item.id }}</span>
            </div>
            <div class="!flex gap-2 desc">
                <span>{{ timestamp(item.info.ts.millis) }}</span>
            </div>
            <div class="progress flex items-center justify-center">
                <span class="pr-2 min-w-fit text-sm">{{ queuePage === 2 ? $t('downloads.label.complete') : (statusList[item.id]?.message ?? $t('downloads.label.waiting')) }}</span>
                <div :style="`--progress-width: ${queuePage === 2 ? 100.0 : (statusList[item.id]?.progress ?? 0)}%`"
                    class="progress-bar relative h-1.5 rounded-[3px] mx-2 bg-[color:var(--button-color)] w-full"
                ></div>
                <span class="px-2 min-w-[70px] text-sm"> {{ 
                    queuePage === 2 ? '100.0' : (statusList[item.id]?.progress.toFixed(1) ?? '0.0')
                }} %</span>
                <div class="flex gap-2">
                    <button @click="togglePause(item.id)">
                        <i :class="[settings.dynFa, 'fa-play-pause']"></i>
                    </button>
                    <button @click="dirname(item.output).then(v => openPath(v))">
                        <i :class="[settings.dynFa, 'fa-folder-open']"></i>
                    </button>
                    <button @click="removeTask(item.id, Object.keys(queue.$state)[queuePage])">
                        <i :class="[settings.dynFa, 'fa-trash']"></i>
                    </button>
                </div>
            </div>
        </div>
        <button v-if="queuePage === 0 && queue.waiting.length > 0" @click="processQueue()"
            class="absolute right-6 top-6 primary-color"
        >
            <i :class="[settings.dynFa, 'fa-download']"></i><span>{{ $t('downloads.label.startDownload') }}</span>
        </button>
        <Empty v-if="Object.values(queue.$state)[queuePage].length === 0" text="downloads.empty" />
    </div>
</div></template>

<script setup lang="ts">
import { inject, nextTick, ref, watch, Ref, computed } from 'vue';
import { ApplicationError, timestamp } from '@/services/utils';
import { commands, DownloadEvent } from '@/services/backend';
import { useSettingsStore, useQueueStore } from '@/store';
import { openPath } from '@tauri-apps/plugin-opener';
import { Channel } from '@tauri-apps/api/core';
import { dirname } from '@tauri-apps/api/path';
import { Empty } from '@/components';
import i18n from '@/i18n';

const statusList = ref<{ [id: string]: {
  gid: string;
  message: string;
  status: DownloadEvent['status'];
  progress: number;
  paused: boolean;
} }>({});

const $queuePage = ref<HTMLElement>();
const queuePage = inject<Ref<number>>('queuePage') as Ref<number>;
const settings = useSettingsStore();
const queue = useQueueStore();
const queueData = computed(() => queue.$state[{ 0: 'waiting', 1: 'doing', 2: 'complete' }[queuePage.value] as keyof typeof queue.$state]);

watch(queuePage, (oldPage, newPage) => {
    if (oldPage !== newPage) {
        if (!$queuePage.value) return;
        $queuePage.value.style.transition = 'none';
        $queuePage.value.style.opacity = '0';
        nextTick(() => requestAnimationFrame(() => {
            if (!$queuePage.value) return;
            $queuePage.value.style.transition = 'opacity 0.3s';
            $queuePage.value.style.opacity = '1';
        }));
    }
})

defineExpose({ processQueue });
async function processQueue() {
    queuePage.value = 1;
    try {
        const event = new Channel<DownloadEvent>();
        event.onmessage = (msg) => {
            switch(msg.status) {
            case 'Started': 
                statusList.value[msg.id] = {
                    gid: msg.gid,
                    message: i18n.global.t('downloads.task_type.' + msg.taskType),
                    status: msg.status,
                    progress: 0.0,
                    paused: false,
                };
                break;

            case 'Progress':
                const status = statusList.value[msg.id];
                if (status) {
                    status.progress = msg.chunkLength / msg.contentLength * 100;
                    if ( Number.isNaN(status.progress) || status.progress === Infinity ) {
                        status.progress = 0.0;
                    }
                    status.status = msg.status;
                }
                break;

            case 'Finished':
                const _status = statusList.value[msg.id];
                if (_status) {
                    _status.progress = 100.0;
                    _status.status = msg.status;
                }
                break;
            }
        }
        const result = await commands.processQueue(event);
        if (result.status === 'error') throw result.error;
        queuePage.value = 2;
    } catch (err) {
        new ApplicationError(err).handleError();
    }
}

async function togglePause(id: string) {
    try {
        const status = statusList.value[id];
        if (!status) return;
        const result = await commands.togglePause(!status.paused, status.gid);
        if (result.status === 'error') throw result.error;
        status.paused = !status.paused;
    } catch (err) {
        new ApplicationError(err).handleError();
    }
}

async function removeTask(id: string, type: string) {
    try {
        const status = statusList.value[id];
        if (status) {
            const queueType = (() => { switch(status.status) {
                case 'Started': return 'doing';
                case 'Progress': return 'doing';
                case 'Finished': return 'complete';
            }})();
            const result = await commands.removeTask(id, queueType, status.gid);
            if (result.status === 'error') throw result.error;
            return result.data;
        }
        const result = await commands.removeTask(id, type as keyof typeof queue.$state, null);
        if (result.status === 'error') throw result.error;
    } catch (err) {
        new ApplicationError(err).handleError();
    }
}
</script>

<style lang="scss" scoped>
.split {
    width: 1px;
    background-color: var(--split-color);
}
.queue__tab h3 {
    transition: color .1s;
    @apply hover:text-[color:var(--primary-color)];
    &.active {
        color: var(--primary-color);
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