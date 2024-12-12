<template><div class="flex-col">
    <div class="queue__tab flex mt-[7px] mb-[13px] h-fit items-center hover:cursor-pointer">
        <h3 @click="queuePage = 0" :class="queuePage !== 0 || 'active'">{{ $t('downloads.tab.waiting') }}</h3>
        <div class="split h-5 mx-[21px]"></div>
        <h3 @click="queuePage = 1" :class="queuePage !== 1 || 'active'">{{ $t('downloads.tab.doing') }}</h3>
        <div class="split h-5 mx-[21px]"></div>
        <h3 @click="queuePage = 2" :class="queuePage !== 2 || 'active'">{{ $t('downloads.tab.complete') }}</h3>
    </div>
    <hr class="w-full my-4" />
    <div class="queue__page flex w-[768px] mt-[13px] h-full flex-col gap-0.5" ref="queuePage">
        <div v-for="item in Object.values(store.queue)[queuePage]"
            class="queue_item relative flex w-full bg-[color:var(--block-color)] flex-col rounded-lg px-4 py-3"
        >
            <h3 class="w-[calc(100%-92px)] text-base text ellipsis">
                {{ item.info.title }}
                <span class="ml-2 desc" v-for="option in item.currentSelect">
                    {{ $t(`common.default.${
                    Object.keys(item.currentSelect)
                        .find(k => (item.currentSelect as any)[k] === option)
                    }.data.${option}`) }}
                </span>
            </h3>
            <span class="absolute top-3 right-4 desc">av{{ item.info.id }}</span>
            <div class="progress flex items-center justify-center">
                <span class="pr-2 min-w-fit text-sm">{{
                    queuePage === 2 ? $t('downloads.label.complete') :
                    (getMessage(item.tasks)?.message || $t('downloads.label.waiting'))
                }}</span>
                <div :style="`--progress-width: ${queuePage === 2 ? 100 : (getMessage(item.tasks)?.progress ?? 0)}%`"
                    class="progress-bar relative h-1.5 rounded-[3px] mx-2 bg-[color:var(--section-color)] w-full"
                ></div>
                <span class="px-2 min-w-[68px] text-right text-sm"> {{ 
                    queuePage === 2 ? '100.0' : 
                    (getMessage(item.tasks)?.progress.toFixed(1) ?? '0.0')
                }} %</span>
                <button @click="postAria2c('togglePause', getMessage(item.tasks)?.gid)">
                    <i class="fa-solid fa-play-pause"></i>
                </button>
                <button @click="openPath(item.output, { parent: true })">
                    <i class="fa-solid fa-folder-open"></i>
                </button>
            </div>
        </div>
        <button v-if="queuePage === 0 && store.queue.waiting.length > 0" @click="processQueue()"
            class="absolute right-6 bottom-6"
        >
            <i class="fa-solid fa-download"></i><span>{{ $t('downloads.label.startDownload') }}</span>
        </button>
        <div class="flex mx-auto my-auto flex-col items-center" v-if="Object.values(store.queue)[queuePage].length === 0">
            <img src="/src/assets/img/empty.png" class="w-64" draggable="false" />
            <span class="">{{ $t('downloads.empty') }}</span>
        </div>
    </div>
</div></template>

<script lang="ts">
import { ApplicationError } from '@/services/utils';
import { DownloadEvent, QueueEvent } from '@/types/DataTypes';
import { Channel, invoke } from '@tauri-apps/api/core';
import { dirname } from '@tauri-apps/api/path';
import store from '@/store';
import * as shell from '@tauri-apps/plugin-shell';

export default {
    data() {
        return {
            store: store.state,
            mediaType: '',
            statusList: [] as { gid: string, message: string, status: string, progress: number, paused: boolean }[],
        }
    },
    computed: {
        queuePage: {
            get() { return this.store.data.queuePage },
            set(v: number) { this.store.data.queuePage = v }
        }
    },
    watch: {
        queuePage(oldPage, newPage) {
            if (oldPage !== newPage) {
                const queuePage = this.$refs.queuePage as HTMLElement;
                queuePage.style.transition = 'none';
                queuePage.style.opacity = '0';
                this.$nextTick(() => requestAnimationFrame(() => {
                    queuePage.style.transition = 'opacity 0.3s';
                    queuePage.style.opacity = '1';
                }));
            }
        }
    },
    methods: {
        async postAria2c(action: string, gid: string) {
            if (action === 'togglePause') {
                const status = this.statusList.find(status => status.gid === gid);
                if (!status) return;
                action = status.paused ? 'unpause' : 'pause';
                status.paused = !status.paused;
            }
            const body = await invoke('post_aria2c', { action, params: [gid] }) as any;
            if (body.error) {
                new ApplicationError(body.error.message, { code: body.error.code }).handleError();
            }
        },
        async processQueue() {
            this.queuePage = 1;
            try {
				const downloadEvent = new Channel<DownloadEvent>();
                const queueEvent = new Channel<QueueEvent>();
                downloadEvent.onmessage = (message) => {
					console.log('got download event', message);
                    switch(message.status) {
                        case 'Started': 
                            this.statusList = this.statusList.filter(status => status.status !== 'Finished');
                            this.statusList.push({
                                gid: message.gid,
                                message: (() => {
                                    switch(message.media_type) {
                                        case 'video': 
                                            return this.$t('downloads.label.video'); 
                                        case 'audio': 
                                            return this.$t('downloads.label.audio'); 
                                        case 'merge': 
                                            return this.$t('downloads.label.merge'); 
                                        default: return message.media_type;
                                    }
                                })(),
                                status: message.status,
                                progress: 0.0,
                                paused: false,
                            });
                            break;

                        case 'Progress':
                            const status0 = this.statusList.find(status => status.gid === message.gid);
                            if (status0) {
                                status0.progress = message.chunk_length / message.content_length * 100;
                                if (
                                    Number.isNaN(status0.progress) ||
                                    status0.progress === Infinity
                                ) status0.progress = 0.0;
                                status0.status = message.status;
                            }
                            break;

                        case 'Finished':
                            const status1 = this.statusList.find(status => status.gid === message.gid);
                            if (status1) {
                                status1.progress = 100.0;
                                status1.status = message.status;
                            }
                            break;

                        case 'Error':
                            new ApplicationError(message.message, { code: message.code }).handleError();
                            break;
                    }
				}
                queueEvent.onmessage = (message) => {
					console.log('got queue event', message.type, message.data);
                    store.commit('updateState', { ['queue.' + message.type.toLowerCase()]: message.data });
                    console.log(this.store.queue);
				}
                await invoke('process_queue', { downloadEvent, queueEvent });
            } catch (err) {
                err instanceof ApplicationError ? err.handleError() :
                new ApplicationError(err as string).handleError();
            }
        },
        getMessage(tasks: typeof this.store.queue.waiting[0]['tasks']) {
            return tasks.map(task => {
                const status = this.statusList.find(status => status.gid === task.gid);
                return status ? { ...status } : null;
            }).filter(status => status !== null)[0];
        },
        async openPath(path: string, options?: { parent: boolean }) {
            return shell.open(options?.parent ? await dirname(path) : path);
        },
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