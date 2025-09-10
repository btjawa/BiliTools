<template><div>
<h1 class="w-full my-1.5">
    <i :class="[$fa.weight, 'fa-download']"></i>
    <span>{{ $t('down.title') }}</span>
</h1>
<div class="flex w-full h-full mt-4 flex-1 gap-3 min-h-0">
    <Transition mode="out-in">
    <VList
        :key="tab" #default="{ item }"
        :data="queueData.length ? queueData : ['empty']"
    >
    <div>
        <Empty v-if="item == 'empty'" :text="$t('down.empty')" />
        <Scheduler v-else v-model="tab" :item :popup="initPopup" />
    </div>
    </VList>
    </Transition>
    <div class="tab">
    <button v-for="(v, k) in tabs" @click="tab = k" :class="{ 'active': tab === k }">
        <span>{{ $t(`down.${k}`) }}</span>
        <i :class="[tab === k ? 'fa-solid' : 'fa-light', v]"></i>
        <label class="primary-color"></label>
    </button>
    </div>
    <div class="popup" :class="{ 'active': v.popup }">
    <Transition name="slide">
    <div class="pr-16" v-if="v.popup">
        <button class="close" @click="v.popup = false">
            <i :class="[$fa.weight, 'fa-close']"></i>
        </button>
        <div class="flex flex-col gap-2 desc text flex-wrap [&_span]:mr-2">
            <div><span v-for="v in getId(v.task)">{{ v }}</span></div>
            <span>{{ $t('format.pubtime') }}: {{ timestamp(v.task.item.pubtime) }}</span>
            <span>{{ $t('format.container') }}: {{ $t('mediaType.' + v.task.type) }}</span>
            <span>{{ $t('format.mediaType') }}: {{ $t('mediaType.' + v.task.item.type) }}</span>
        </div>
        <div v-for="v of v.task?.subtasks" class="flex w-full gap-4 items-center">
            <span class="flex-shrink-0 min-w-28">{{ $t('taskType.' + v.type) }}</span>
            <span class="w-16">{{ stat(v.id).toFixed(2) }}%</span>
            <ProgressBar :progress="stat(v.id)" />
        </div>
    </div>
    </Transition>
    </div>
</div>
</div></template>

<script setup lang="ts">
import { useQueueStore } from '@/store';
import { computed, reactive, ref } from 'vue';
import { VList } from 'virtua/vue';

import { Empty, ProgressBar } from '@/components';
import { Scheduler } from '@/components/DownPage';
import { Task } from '@/types/shared.d';
import { timestamp } from '@/services/utils';

const tabs = {
    waiting: 'fa-stopwatch',
    doing: 'fa-hourglass-half',
    complete: 'fa-check'
};
type Key = keyof typeof tabs;

const queueData = computed(() => queue[tab.value].map(v => queue.schedulers[v]));

const tab = ref<Key>('waiting');
const queue = useQueueStore();
const v = reactive({
    popup: false,
    task: {} as Task
});

defineExpose({ tab });

function initPopup(_task: Task) {
    v.task = _task;
    v.popup = true;
}

const stat = (id: string) => {
    const stat = v.task?.status[id];
    return (stat ? (stat?.chunk / stat?.content || 0) : 0) * 100;
}

function getId(task: Task) {
    const { item } = task;
    const result: string[] = [];
    if (item.aid) result.push('av' + item.aid);
    if (item.bvid) result.push(item.bvid);
    if (item.ssid) result.push('ss' + item.ssid);
    if (item.epid) result.push('ep' + item.epid);
    if (item.sid) result.push('au' + item.sid);
    if (item.cid) result.push('cid:' + item.cid);
    if (item.fid) result.push('fid:' + item.fid);
    return result;
}
</script>