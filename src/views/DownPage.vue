<template><div class="flex-col">
    <div class="queue__tab flex mt-[26px] mb-[13px] h-fit items-center hover:cursor-pointer">
        <h3 @click="queuePage = 0" :class="queuePage !== 0 || 'active'">等待中</h3>
        <div class="split h-5 mx-[21px]"></div>
        <h3 @click="queuePage = 1" :class="queuePage !== 1 || 'active'">进行中</h3>
        <div class="split h-5 mx-[21px]"></div>
        <h3 @click="queuePage = 2" :class="queuePage !== 2 || 'active'">已完成</h3>
    </div>
    <hr class="w-full my-4" />
    <div class="queue__page flex w-[768px] mt-[13px] h-full flex-col" ref="queuePage">
        <div v-for="item in Object.values(store.queue)[queuePage]"
            class="queue_item relative flex w-full bg-[color:var(--block-color)] flex-col rounded-lg px-4 py-3"
        >
            <h3 class="w-[calc(100%-92px)] text-base text ellipsis">{{ item.info.title }}</h3>
            <span class="absolute top-3 right-4 desc">av{{ item.info.id }}</span>
            <div class="progress flex items-center justify-center">
                <span class="pr-2 min-w-fit text-sm">{{ getMessage(item.tasks)?.message || '等待' }}</span>
                <div :style="`--progress-width: ${getMessage(item.tasks)?.progress || 0}%`"
                    class="progress-bar relative h-1.5 rounded-[3px] mx-2 bg-[color:var(--section-color)] w-full"
                ></div>
                <span class="px-2 min-w-[67px] text-right text-sm"> {{ 
                    (getMessage(item.tasks)?.progress === Infinity || getMessage(item.tasks)?.progress === -Infinity) 
                    ? '未知' : (getMessage(item.tasks)?.progress.toFixed(1) || '0.0')
                }} %</span>
                <button @click="item.tasks.forEach(task => postAria2c('pause', task.gid))">
                    <i class="fa-solid fa-play-pause"></i>
                </button>
                <button @click="item.tasks.forEach(task => postAria2c('unpause', task.gid))">
                    <i class="fa-solid fa-folder-open"></i>
                </button>
            </div>
        </div>
        <button v-if="queuePage === 0 && store.queue.waiting.length > 0" @click="processQueue()"
            class="absolute right-6 bottom-6"
        >
            <i class="fa-solid fa-download"></i><span>开始下载</span>
        </button>
        <img v-if="Object.values(store.queue)[queuePage].length === 0"
            src="/src/assets/img/empty.png" class="w-64 mx-auto my-auto" draggable="false"
        />
    </div>
</div></template>

<script lang="ts">
import { ApplicationError } from '@/services/utils';
import { DownloadEvent, QueueEvent } from '@/types/DataTypes';
import { Channel, invoke } from '@tauri-apps/api/core';
import store from '@/store';

export default {
    data() {
        return {
            queuePage: 0,
            store: store.state,
            mediaType: '',
            statusList: [] as { gid: string, message: string, status: string, progress: number }[]
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
            await invoke('post_aria2c', { action, params: [gid] });
        },
        async processQueue() {
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
                                            return '视频'; 
                                        case 'audio': 
                                            return '音频';
                                        default: return message.media_type;
                                    }
                                })(),
                                status: message.status,
                                progress: 0,
                            });
                            break;

                        case 'Progress':
                            const status0 = this.statusList.find(status => status.gid === message.gid);
                            if (status0) {
                                status0.progress = message.chunk_length / message.content_length * 100;
                            }
                            break;

                        case 'Finished': 
                            const status1 = this.statusList.find(status => status.gid === message.gid);
                            if (status1) status1.status = message.status;
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
    },
    async mounted() {
        // while (true) {
        //     this.test += 0.1;
        //     if (this.test > 100) this.test = 0;
        //     await new Promise(resolve => setTimeout(resolve, 1));
        // }
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