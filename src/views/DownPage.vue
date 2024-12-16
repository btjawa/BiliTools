<template><div class="flex-col pb-0">
    <div class="queue__tab flex mt-[7px] mb-[13px] h-fit items-center hover:cursor-pointer flex-shrink-0">
        <h3 @click="queuePage = 0" :class="queuePage !== 0 || 'active'">{{ $t('downloads.tab.waiting') }}</h3>
        <div class="split h-5 mx-[21px]"></div>
        <h3 @click="queuePage = 1" :class="queuePage !== 1 || 'active'">{{ $t('downloads.tab.doing') }}</h3>
        <div class="split h-5 mx-[21px]"></div>
        <h3 @click="queuePage = 2" :class="queuePage !== 2 || 'active'">{{ $t('downloads.tab.complete') }}</h3>
    </div>
    <hr class="w-full my-4 flex-shrink-0" />
    <div class="queue__page flex flex-col w-[calc(100%-269px)] mt-[13px] h-[calc(100%-90px)]" ref="queuePage">
        <RecycleScroller
			v-if="Object.values(store.queue)[queuePage].length"
			:items="Object.values(store.queue)[queuePage]"
			:item-size="103" v-slot="{ item }"
		>
            <div class="queue_item relative flex w-full bg-[color:var(--block-color)] flex-col rounded-lg px-4 py-3">
                <h3 class="w-[calc(100%-92px)] text-base text ellipsis">
                    {{ item.info.title }}
                </h3>
                <div class="!flex gap-2 desc">
                    <template v-for="option in item.currentSelect">
                    <span v-if="!(option < 0)">
                        {{ $t(`common.default.${Object.keys(item.currentSelect).find(k => item.currentSelect[k] === option)}.data.${option}`) }}
                    </span>
                    </template>
                    <span>{{ item.ts.string }}</span>
                </div>
                <span class="absolute top-3 right-4 desc">{{ item.info.id }}</span>
                <div class="progress flex items-center justify-center">
                    <span class="pr-2 min-w-fit text-sm">{{
                        queuePage === 2 ? recycleI18n()[1] :
                        (getMessage(item.tasks)?.message || recycleI18n()[2])
                    }}</span>
                    <div :style="`--progress-width: ${queuePage === 2 ? 100 : (getMessage(item.tasks)?.progress ?? 0)}%`"
                        class="progress-bar relative h-1.5 rounded-[3px] mx-2 bg-[color:var(--button-color)] w-full"
                    ></div>
                    <span class="px-2 min-w-[70px] text-sm"> {{ 
                        queuePage === 2 ? '100.0' : 
                        (getMessage(item.tasks)?.progress.toFixed(1) ?? '0.0')
                    }} %</span>
                    <button class="mr-2" @click="postAria2c('togglePause', getMessage(item.tasks)?.gid)">
                        <i :class="[fa_dyn, 'fa-play-pause']"></i>
                    </button>
                    <button @click="openPath(item.output, { parent: true })">
                        <i :class="[fa_dyn, 'fa-folder-open']"></i>
                    </button>
                </div>
            </div>
		</RecycleScroller>
        <button v-if="queuePage === 0 && store.queue.waiting.length > 0" @click="processQueue()"
            class="absolute right-6 bottom-6"
        >
            <i :class="[fa_dyn, 'fa-download']"></i><span>{{ recycleI18n()[3] }}</span>
        </button>
        <Empty :expression="Object.values(store.queue)[queuePage].length === 0" text="downloads.empty" />
    </div>
</div></template>

<script lang="ts">
import { ApplicationError } from '@/services/utils';
import { DownloadEvent, QueueEvent } from '@/types/data';
import { Channel, invoke } from '@tauri-apps/api/core';
import { dirname } from '@tauri-apps/api/path';
import { Empty } from '@/components';
import store from '@/store';
import * as shell from '@tauri-apps/plugin-shell';

export default {
    components: {
        Empty
    },
    data() {
        return {
            store: store.state,
            statusList: [] as { gid: string, message: string, status: string, progress: number, paused: boolean }[],
        }
    },
    computed: {
        queuePage: {
            get() { return this.store.status.queuePage },
            set(v: number) { this.store.status.queuePage = v }
        },
        fa_dyn() {
			return this.$store.state.settings.theme === 'dark' ? 'fa-solid' : 'fa-light';
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
        recycleI18n() {
			return [
                '',
                this.$t('downloads.label.complete'),
                this.$t('downloads.label.waiting'),
                this.$t('downloads.label.startDownload'),
            ];
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