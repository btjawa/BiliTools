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
        <Scheduler v-else v-model="tab" :item :popup="popup?.init" />
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
    <Popup ref="popup" />
</div>
</div></template>

<script setup lang="ts">
import { useQueueStore } from '@/store';
import { computed, ref } from 'vue';
import { VList } from 'virtua/vue';

import { Popup, Scheduler } from '@/components/DownPage';
import { Empty } from '@/components';

const tabs = {
    waiting: 'fa-stopwatch',
    doing: 'fa-hourglass-half',
    complete: 'fa-check'
};
type Key = keyof typeof tabs;


const queueData = computed(() => queue[tab.value].map(v => queue.schedulers[v]));

const tab = ref<Key>('waiting');
const queue = useQueueStore();
const popup = ref<InstanceType<typeof Popup>>();

defineExpose({ tab });
</script>