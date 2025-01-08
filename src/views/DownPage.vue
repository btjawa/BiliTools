<template><div class="flex-col pb-0">
    <div class="queue__tab flex mt-1 mb-[13px] h-fit items-center hover:cursor-pointer flex-shrink-0">
        <h3 @click="queuePage = 0" :class="queuePage !== 0 || 'active'">{{ $t('downloads.tab.waiting') }}</h3>
        <div class="split h-5 mx-[21px]"></div>
        <h3 @click="queuePage = 1" :class="queuePage !== 1 || 'active'">{{ $t('downloads.tab.doing') }}</h3>
        <div class="split h-5 mx-[21px]"></div>
        <h3 @click="queuePage = 2" :class="queuePage !== 2 || 'active'">{{ $t('downloads.tab.complete') }}</h3>
    </div>
    <hr class="w-full my-4 flex-shrink-0" />
    <div class="queue__page flex flex-col w-[calc(100%-269px)] mt-[13px] h-full gap-0.5 overflow-auto" ref="queuePage">
        <div v-for="item in Object.values(store.queue)[queuePage]"
            class="queue_item relative flex w-full bg-[color:var(--block-color)] flex-col rounded-lg px-4 py-3"
        >
            <h3 class="w-[calc(100%-92px)] text-base text ellipsis">
                {{ item.info.title }}
            </h3>
            <div class="!flex gap-2 desc">
                <template v-for="option in item.currentSelect">
                <span v-if="!(option < 0)">
                    {{ $t(`common.default.${Object.keys(item.currentSelect).find(k => (item.currentSelect as any)[k] === option)}.data.${option}`) }}
                </span>
                </template>
                <span>{{ item.ts.string }}</span>
            </div>
            <span class="absolute top-3 right-4 desc text">{{ item.info.id }}</span>
            <div class="progress flex items-center justify-center">
                <span class="pr-2 min-w-fit text-sm">{{ queuePage === 2 ? recycleI18n()[1] : (statusList[item.id]?.message ?? recycleI18n()[2]) }}</span>
                <div :style="`--progress-width: ${queuePage === 2 ? 100.0 : (statusList[item.id]?.progress ?? 0)}%`"
                    class="progress-bar relative h-1.5 rounded-[3px] mx-2 bg-[color:var(--button-color)] w-full"
                ></div>
                <span class="px-2 min-w-[70px] text-sm"> {{ 
                    queuePage === 2 ? '100.0' : (statusList[item.id]?.progress.toFixed(1) ?? '0.0')
                }} %</span>
                <div class="flex gap-2">
                    <button @click="togglePause(item.id)">
                        <i :class="[fa_dyn, 'fa-play-pause']"></i>
                    </button>
                    <button @click="openPath(item.output, { parent: true })">
                        <i :class="[fa_dyn, 'fa-folder-open']"></i>
                    </button>
                    <button @click="removeTask(item.id, Object.keys(store.queue)[queuePage])">
                        <i :class="[fa_dyn, 'fa-trash']"></i>
                    </button>
                </div>
            </div>
        </div>
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
import { commands, DownloadEvent, QueueEvent } from '@/services/backend';
import { Channel } from '@tauri-apps/api/core';
import { dirname } from '@tauri-apps/api/path';
import { Empty } from '@/components';
import * as shell from '@tauri-apps/plugin-shell';

interface Status {
  gid: string;
  message: string;
  status: DownloadEvent['status'];
  progress: number;
  paused: boolean;
}

export default {
    components: {
        Empty
    },
    data() {
        return {
            store: this.$store.state,
            statusList: {} as { [id: string]: Status },
        }
    },
    computed: {
        queuePage: {
            get() { return this.store.status.queuePage },
            set(v: number) { this.store.status.queuePage = v }
        },
        fa_dyn() {
			return this.$store.state.settings.theme === 'dark' ? 'fa-solid' : 'fa-light';
		},
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
        async togglePause(id: string) {
            try {
                const status = this.statusList[id];
                if (!status) return;
                status.paused = !status.paused;
                const post_aria2c = await commands.postAria2c(status.paused ? 'unpause' : 'pause', [status.gid]);
                if (post_aria2c.status === 'error') throw post_aria2c.error;
                const body = post_aria2c.data as any;
                if (body.error) {
                    new ApplicationError(body.error.message, { code: body.error.code }).handleError();
                }
            } catch (err) {
                err instanceof ApplicationError ? err.handleError() :
                new ApplicationError(err as string).handleError();
            }
        },
        async removeTask(id: string, queue: string) {
            try {
                const status = this.statusList[id];
                if (status) {
                    const queue_id = (() => { switch(status.status) {
                        case 'Started': return 'doing';
                        case 'Progress': return 'doing';
                        case 'Finished': return 'complete';
                        case 'Error': return 'doing';
                    }})();
                    const remove_aria2c_task = await commands.removeAria2cTask(queue_id, id, status.gid);
                    if (remove_aria2c_task.status === 'error') throw remove_aria2c_task.status;
                    return remove_aria2c_task.data;
                }
                const queue_id = queue as keyof typeof this.store.queue;
                const index = this.store.queue[queue_id].findIndex(q => q.id === id);
                if (index < 0) return;
                const targetQueue = this.store.queue[queue_id][index];
                for (let task of targetQueue.tasks) {
                    if (task.media_type === 'merge' || task.media_type === 'flac') continue;
                    try {
                        const remove_aria2c_task = await commands.removeAria2cTask(queue_id, id, task.gid);
                        if (remove_aria2c_task.status === 'error') throw remove_aria2c_task.status;
                        this.store.queue[queue_id].splice(index, 1);
                    } catch(err) {
                        throw err;
                    }
                }
            } catch (err) {
                err instanceof ApplicationError ? err.handleError() :
                new ApplicationError(err as string).handleError();
            }
        },
        recycleI18n() {
			return [
                '',
                this.$t('downloads.label.complete'),
                this.$t('downloads.label.waiting'),
                this.$t('downloads.label.download'),
            ];
		},
        async processQueue() {
            this.queuePage = 1;
            try {
				const downloadEvent = new Channel<DownloadEvent>();
                const queueEvent = new Channel<QueueEvent>();
                downloadEvent.onmessage = (message) => {
                    switch(message.status) {
                    case 'Started': 
                        this.statusList[message.id] = {
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
                        };
                        break;

                    case 'Progress':
                        const status = this.statusList[message.id];
                        if (status) {
                            status.progress = message.chunk_length / message.content_length * 100;
                            if ( Number.isNaN(status.progress) || status.progress === Infinity ) {
                                status.progress = 0.0;
                            }
                            status.status = message.status;
                        }
                        break;

                    case 'Finished':
                        this.statusList[message.id].status = message.status;
                        break;

                    case 'Error':
                        new ApplicationError(message.message, { code: message.code }).handleError();
                        break;
                    }
				}
                queueEvent.onmessage = (message) => {
                    this.$store.commit('updateState', { ['queue.' + message.type.toLowerCase()]: message.data });
				}
                const process_queue = await commands.processQueue(downloadEvent, queueEvent);
                if (process_queue.status === 'error') throw process_queue.status;
            } catch (err) {
                err instanceof ApplicationError ? err.handleError() :
                new ApplicationError(err as string).handleError();
            }
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