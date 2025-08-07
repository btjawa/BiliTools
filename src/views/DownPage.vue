<template><div class="pb-0">
<h1 class="w-full">
    <i :class="[$fa.weight, 'fa-download']"></i>
    <span>{{ $t('down.title') }}</span>
</h1>
<div class="flex w-full h-full mt-4 flex-1 gap-3 min-h-0">
    <Transition mode="out-in">
    <RecycleScroller class="w-full"
        key-field="index" :key="tab"
        :items="queue[tab]" :item-size="50"
    >
        <template #before v-if="!queue[tab].length">
            <Empty :text="$t('down.empty')" />
        </template>
        <template v-slot="{ item }">
            <div class="px-4 py-2 rounded-lg bg-[var(--block-color)] text-sm">
                <span>{{ item.info.nfo.showtitle }} - {{ item.info.item.title }}</span>
            </div>
        </template>
    </RecycleScroller>
    </Transition>
    <div class="tab">
    <button v-for="(v, k) in tabs" @click="tab = k" :class="{ 'active': tab === k }">
        <span>{{ $t(`down.${k}`) }}</span>
        <i :class="[tab === k ? 'fa-solid' : 'fa-light', v]"></i>
        <label class="primary-color"></label>
    </button>
    </div>
</div>
</div></template>

<script setup lang="ts">
import { ref } from 'vue';
import { Empty } from '@/components';
import { useQueueStore } from '@/store';
import { RecycleScroller } from 'vue-virtual-scroller';

const tabs = {
    waiting: 'fa-stopwatch',
    doing: 'fa-hourglass-half',
    complete: 'fa-check'
};
type Key = keyof typeof queue.$state;

const tab = ref<Key>('waiting');
const queue = useQueueStore();

defineExpose({ tab });
</script>

<style lang="scss" scoped>
.split {
    width: 1px;
    background-color: var(--split-color);
}
</style>