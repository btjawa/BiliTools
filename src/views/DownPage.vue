<template><div>
<h1 class="w-full my-1.5">
    <i :class="[$fa.weight, 'fa-download']"></i>
    <span>{{ $t('down.title') }}</span>
</h1>
<div class="flex w-full h-full mt-4 flex-1 gap-3 min-h-0">
    <Transition mode="out-in">
    <DynamicScroller class="w-full"
        key-field="sid" :key="tab"
        :items="queueData" :min-item-size="48"
    >
        <template #before v-if="!queueData.length">
            <Empty :text="$t('down.empty')" />
        </template>
        <template v-slot="{ item, active }">
        <DynamicScrollerItem
            :item :active :size-dependencies="item.list"
            class="block gap-0.5"
        >
            <div class="flex mb-2.5 mx-[14px] text items-center">
                <i :class="[$fa.weight, 'fa-id-badge']"></i>
                <span class="mr-auto">{{
                    item.sid === '__waiting__' ? $t('down.ordering') : item.sid
                }}</span>
                <div class="flex gap-2 items-center">
                    <button
                        @click="processQueue(); tab = 'doing'"
                        v-if="item.sid === '__waiting__' && item.list.length"
                        class="ml-auto w-fit"
                    >
                        <i :class="[$fa.weight, 'fa-download']"></i>
                        <span>{{ $t('down.processQueue') }}</span>
                    </button>
                    <template v-if="item.sid !== '__waiting__'">
                        <span class="mr-2 ml-auto">{{ timestamp(item.ts) }}</span>
                        <button
                            @click="event(k, item.sid, null)"
                            v-for="(v, k) in buttons()"
                        >
                            <i :class="[$fa.weight, v]"></i>
                        </button>
                    </template>
                </div>
            </div>
            <Empty v-if="!item.list.length" :text="$t('down.empty')" />
            <template v-for="task in item.list.map(v => queue.tasks[v])">
            <div
                class="block gap-1.5 px-4 border-2 border-solid border-transparent"
                :style="{ 'border-color': getBorder(task.id) }"
            >
                <div class="flex w-full text">
                    <span class="w-full ellipsis">{{ task.item.title }}</span>
                    <span class="flex-shrink-0">{{ timestamp(task.ts * 1000) }}</span>
                </div>
                <div class="!flex gap-2 desc w-full text">
                <div class="flex gap-1 max-w-full overflow-auto whitespace-nowrap">
                    <span
                        v-if="task.select.media.video || task.select.media.audioVideo"
                        v-for="k in (['res', 'enc'] as const)"
                    >
                    <span v-if="task.select[k]">
                        {{ $t(`quality.${k}.${task.select[k]}`) }}
                    </span>
                    </span>
                    <span v-if="(task.select.media.audio || task.select.media.audioVideo) && task.select.abr">
						{{ $t(`quality.abr.${task.select.abr}`) }}
                    </span>
                    <span v-if="Object.entries(task.select.media).some(([_, k]) => k) && task.select.fmt">
                        {{ $t(`quality.fmt.${task.select.fmt}`) }}
                    </span>
                    <span v-if="task.select.danmaku.live">
                        {{ $t('taskType.liveDanmaku') }}
                    </span>
                    <span v-if="task.select.danmaku.history">
                        {{ $t('taskType.historyDanmaku') }}
                    </span>
                    <span v-if="task.select.thumb.length">
                        {{ $t('popup.thumb.name') }}
                    </span>
                    <span v-if="task.select.misc.subtitles">
                        {{ task.select.misc.subtitles }}
                    </span>
                    <span v-if="task.select.misc.aiSummary">
                        {{ $t('taskType.aiSummary') }}
                    </span>
                </div>
                <div class="flex gap-1 ml-auto flex-shrink-0 items-center">
                    <i :class="[$fa.weight, 'fa-id-badge ml-auto']"></i>
                    {{ task.id }}
                    <i :class="[$fa.weight, 'fa-hashtag']"></i>
                    {{ String(task.seq + 1).padStart(2, '0') }}
                </div>
                </div>
                <div class="flex w-full gap-4 *:flex-shrink-0 items-center">
                    <button @click="popup?.init(task)">
                        <i :class="[$fa.weight, 'fa-list']"></i>
                        <span>{{ $t('down.taskList') }}</span>
                    </button>
                    <ProgressBar :progress="getProgress(task)" />
                    <span class="w-14">{{ getProgress(task).toFixed(2) }}%</span>
                    <div class="flex gap-2 text-sm">
                        <button
                            v-for="(v, k) in buttons(task)"
                            @click="event(k, item.sid, task.id)"
                        >
                            <i :class="[$fa.weight, v]"></i>
                        </button>
                    </div>
                </div>
            </div>
            </template>
        </DynamicScrollerItem>
        </template>
    </DynamicScroller>
    </Transition>
    <div class="tab">
    <button v-for="(v, k) in tabs" @click="tab = k" :class="{ 'active': tab === k }">
        <span>{{ $t(`down.${k}`) }}</span>
        <i :class="[tab === k ? 'fa-solid' : 'fa-light', v]"></i>
        <label class="primary-color"></label>
    </button>
    </div>
    <Popup ref="popup" />
</div>
</div></template>

<script setup lang="ts">
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import { Empty, ProgressBar } from '@/components';
import { Popup } from '@/components/DownPage';
import { useQueueStore } from '@/store';
import { computed, ref } from 'vue';

import * as backend from '@/services/backend';
import { processQueue } from '@/services/queue';
import { timestamp } from '@/services/utils';
import { Task } from '@/types/shared.d';

const tabs = {
    waiting: 'fa-stopwatch',
    doing: 'fa-hourglass-half',
    complete: 'fa-check'
};
type Key = keyof typeof tabs;

const buttons = computed(() => (task?: Task) => ({
    ...(task?.state === 'active' && {
        pause: 'fa-pause',
    }),
    ...(task?.state === 'paused' && {
        resume: 'fa-play',
    }),
    ...((!task && tab.value === 'doing') && {
        pause: 'fa-pause',
        resume: 'fa-play',
    }),
    openFolder: 'fa-folder-open',
    cancel: 'fa-trash',
}))

const queueData = computed(() => queue[tab.value].map(v => queue.schedulers[v]));

const tab = ref<Key>('waiting');
const queue = useQueueStore();
const popup = ref<InstanceType<typeof Popup>>();

defineExpose({ tab });

function getProgress(task: Task) {
    const subtasks = task.subtasks;
    const content = subtasks.length;
    let chunk = 0;
    for (const [_, v] of Object.entries(queue.tasks[task.id].status)) {
        chunk += (v.chunk / v.content || 0);
    }
    return ((chunk / content || 0) * 100);
}

function getBorder(id: string) {
    switch (queue.tasks[id]?.state) {
        case 'active': return 'var(--primary-color)';
        case 'paused': return '#ffc107';
        case 'failed': return '#ff5252';
        case 'completed': return '#4caf50';
        default: return 'transparent';
    }
}

async function event(event: backend.CtrlEvent | 'openFolder', sid: string, id: string | null) {
    const sch = queue.schedulers[sid];
    const result = event === 'openFolder'
        ? await backend.commands.openFolder(sid, id)
        : await backend.commands.ctrlEvent(event, sid, id ? [id] : sch.list);
    if (result.status === 'error') throw result.error;
}
</script>

<style lang="scss" scoped>
.block {
    @apply flex flex-col p-3 rounded-lg text-sm bg-[var(--block-color)];
}
</style>