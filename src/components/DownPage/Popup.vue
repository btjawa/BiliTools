<template>
<div class="popup flex w-full h-full" :class="{ active }">
<Transition name="slide">
<div class="container w-fit h-fit pl-4 pr-16 py-4 gap-2 m-auto" v-if="active">
    <button
        class="absolute top-4 right-4 rounded-full"
        @click="active = false"
    >
        <i :class="[$fa.weight, 'fa-close']"></i>
    </button>
    <div v-for="v of status?.subtasks" class="flex w-full gap-4 items-center">
        <span class="flex-shrink-0 min-w-28">{{ $t('taskType.' + v.type) }}</span>
        <span class="w-16">{{ ((v.chunk / v.content || 0) * 100).toFixed(2) }}%</span>
        <ProgressBar :progress="(v.chunk / v.content || 0) * 100" />
    </div>
</div>
</Transition>
</div>
</template>

<script lang="ts" setup>
import { TaskStatus } from '@/types/shared';
import { ref, Transition } from 'vue';
import ProgressBar from '../ProgressBar.vue';

defineExpose({ init });

const active = ref(false);
const status = ref<TaskStatus>();

function init(stat: TaskStatus) {
    active.value = true;
    status.value = stat;
}
</script>

<style lang="scss" scoped>
.popup {
    @apply absolute inset-0 bg-black bg-opacity-50;
    @apply pointer-events-none opacity-0 transition-opacity;
    &.active {
        @apply pointer-events-auto opacity-100;
    }
}
.container {
    @apply flex flex-col relative rounded-lg shadow-lg bg-[var(--solid-block-color)];
}
</style>