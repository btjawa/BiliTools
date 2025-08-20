<template><div>
<h1 class="w-full my-1.5">
    <i :class="[$fa.weight, 'fa-download']"></i>
    <span>{{ $t('down.title') }}</span>
</h1>
<div class="flex w-full h-full mt-4 flex-1 gap-3 min-h-0">
    <Transition mode="out-in">
    <RecycleScroller class="w-full"
        key-field="id" :key="tab"
        :items="queueData" :item-size="112"
    >
        <template #before v-if="!queue[tab].length">
            <Empty :text="$t('down.empty')" />
        </template>
        <template v-slot="{ item }">
            <div class="flex flex-col text-sm p-4 py-3 gap-1.5 rounded-lg bg-[var(--block-color)] border-2 border-solid border-transparent"
                :style="{ 'border-color': getBorder(item) }"
            >
                <div class="flex w-full text">
                    <span class="w-full ellipsis">{{ item.item.title }}</span>
                    <span class="flex-shrink-0">{{ timestamp(item.ts * 1000) }}</span>
                </div>
                <div class="!flex gap-2 desc w-full text">
                    <div class="w-full ellipsis">
                    <template
                        v-if="item.select.media.video || item.select.media.audioVideo"
                        v-for="k in (['res', 'enc'] as const)"
                    >
                    <template v-if="item.select[k]">
                        {{ $t(`quality.${k}.${item.select[k]}`) }}
                        <gap />
                    </template>
                    </template>
                    <template v-if="(item.select.media.audio || item.select.media.audioVideo) && item.select.abr">
						{{ $t(`quality.abr.${item.select.abr}`) }}
                        <gap />
                    </template>
                    <template v-if="Object.entries(item.select.media).some(([_, k]) => k) && item.select.fmt">
                        {{ $t(`quality.fmt.${item.select.fmt}`) }}
                        <gap />
                    </template>
                    <template v-if="item.select.danmaku.live">
                        {{ $t('taskType.liveDanmaku') }}
                        <gap />
                    </template>
                    <template v-if="item.select.danmaku.history">
                        {{ $t('taskType.historyDanmaku') }}
                        <gap />
                    </template>
                    <template v-if="item.select.thumb.length">
                        {{ $t('popup.thumb.name') }}
                    </template>
                    <template v-if="item.select.misc.subtitles">
                        {{ item.select.misc.subtitles }}
                        <gap />
                    </template>
                    <template v-if="item.select.misc.aiSummary">
                        {{ $t('taskType.aiSummary') }}
                        <gap />
                    </template>
                    </div>
                    <div class="flex gap-1 flex-shrink-0 items-center">
                    <i :class="[$fa.weight, 'fa-id-badge ml-auto']"></i>
                    {{ item.id }}
                    <i :class="[$fa.weight, 'fa-hashtag']"></i>
                    {{ String(item.index + 1).padStart(2, '0') }}
                    </div>
                </div>
                <div class="flex w-full gap-4 *:flex-shrink-0 items-center">
                    <button @click="popup?.init(queue.status[item.id])">
                        <i :class="[$fa.weight, 'fa-list']"></i>
                        <span>任务列表</span>
                    </button>
                    <ProgressBar :progress="getProgress(item)" />
                    <span class="w-14">{{ getProgress(item).toFixed(2) }}%</span>
                    <div class="flex gap-2 text-sm">
                        <button
                            v-for="(v, k) in buttons"
                            @click="click(item, k)"
                        >
                            <i :class="[$fa.weight, v]"></i>
                        </button>
                    </div>
                </div>
            </div>
        </template>
    </RecycleScroller>
    </Transition>
    <div class="flex flex-col gap-4">
        <div class="tab">
        <button v-for="(v, k) in tabs" @click="tab = k" :class="{ 'active': tab === k }">
            <span>{{ $t(`down.${k}`) }}</span>
            <i :class="[tab === k ? 'fa-solid' : 'fa-light', v]"></i>
            <label class="primary-color"></label>
        </button>
        </div>
        <button
            v-if="queue.waiting.some(v => !queue.handled.includes(v))"
            @click="processQueue(); tab = 'doing'"
            class="ml-auto w-fit primary-color"
        >
            <i :class="[$fa.weight, 'fa-download']"></i>
            <span>{{ $t('down.processQueue') }}</span>
        </button>
    </div>
    <Popup ref="popup" />
</div>
</div></template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Empty, ProgressBar } from '@/components';
import { useQueueStore } from '@/store';
import { RecycleScroller } from 'vue-virtual-scroller';
import { timestamp } from '@/services/utils';
import { Popup } from '@/components/DownPage';
import { GeneralTask } from '@/types/shared.d';
import { processQueue } from '@/services/queue';
import * as backend from '@/services/backend';

const tabs = {
    waiting: 'fa-stopwatch',
    doing: 'fa-hourglass-half',
    complete: 'fa-check'
};
type Key = keyof typeof tabs;

const buttons = {
    togglePause: 'fa-play-pause',
    openfolder: 'fa-folder-open',
    cancel: 'fa-trash',
}
type Button = keyof typeof buttons;

const queueData = computed(() => (queue[tab.value].length ? queue[tab.value] : []).map(v => queue.tasks[v])); // avoid "does not exists"

const tab = ref<Key>('waiting');
const queue = useQueueStore();
const popup = ref<InstanceType<typeof Popup>>();

defineExpose({ tab });

function getProgress(task: GeneralTask) {
    const subtasks = task.subtasks;
    const content = subtasks.length;
    let chunk = 0;
    for (const [_, v] of Object.entries(queue.status[task.id].subtasks)) {
        chunk += (v.chunk / v.content || 0);
    }
    return ((chunk / content || 0) * 100);
}

function getBorder(task: GeneralTask) {
    switch (queue.status[task.id]?.state) {
        case 'active': return 'var(--primary-color)';
        case 'paused': return '#ffc107';
        case 'failed': return '#ff5252';
        case 'completed': return '#4caf50';
        default: return 'var(--split-color)';
    }
}

async function click(task: GeneralTask, id: Button) {
    const target = queue.status[task.id];
    let action = id as backend.CtrlEvent;
    if (id === 'togglePause') {
        action = target.state === 'active' ? 'pause' : 'resume';
    } else {
        action = id; // type inference
    }
    const result = await backend.commands.taskEvent(action, target.id);
    if (result.status === 'error') throw result.error;
}
</script>

<style lang="scss" scoped>
gap {
    @apply inline-block w-1;
}
</style>