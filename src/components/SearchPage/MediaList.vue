<template>
<RecycleScroller
    ref="scrollList" key-field="index"
    :items="props.list" :item-size="50"
>
    <template #before v-if="stein_gate">
    <div class="max-w-full flex justify-center gap-1 mb-2 overflow-auto">
        <button v-for="story in stein_gate.story_list"
            class="w-9 h-9 rounded-full relative p-0 flex-shrink-0"
            @click="updateStein(story.edge_id)"
        >
            <i :class="[$fa.weight, story.is_current ? 'fa-check' : 'fa-location-dot']"></i>
        </button>
    </div>
    </template>
    <template v-slot="{ item, index }">
    <div
        class="flex w-full items-center h-12 text-sm p-4 rounded-lg bg-[var(--block-color)] border-2 border-solid border-transparent"
        :class="{ '!border-[var(--primary-color)]': item.isTarget, 'range': inRange(index) }"
        @mouseenter="hoverIndex = index"
    >
        <div class="checkbox">
            <input type="checkbox" :value="index" v-model="model" @click="click(index)" />
            <i class="fa-solid fa-check"></i>
        </div>
        <span class="min-w-6">{{ index + 1 }}</span>
        <div class="w-px h-full bg-[var(--split-color)] mx-4"></div>
        <span class="flex flex-1 ellipsis text">{{ item.title }}</span>
    </div>
    </template>
    <template #after v-if="stein_gate">
    <div class="w-full flex justify-center gap-1 my-2">
        <template v-for="(question, index) in stein_gate.choices"><button
            v-if="show(stein_gate, index)"
            @click="updateStein(question.id)"
        >{{ question.option }}</button></template>
    </div>
    </template>
</RecycleScroller>
</template>
<script lang="ts" setup>
import { RecycleScroller, RecycleScrollerInstance } from 'vue-virtual-scroller';
import { MediaInfo, MediaItem } from '@/types/shared.d';
import { onMounted, onUnmounted, ref } from 'vue';

const model = defineModel<number[]>();
const props = defineProps<{
    stein_gate: MediaInfo['stein_gate'],
    list: MediaItem[],
    updateStein: Function
}>();

const scrollList = ref<RecycleScrollerInstance>();
const shiftActive = ref(false);
const clickIndex = ref(0);
const hoverIndex = ref(0);

const keyDown = (e: KeyboardEvent) => {
    if (e.key === 'Shift') shiftActive.value = true;
}

const keyUp = (e: KeyboardEvent) => {
    if (e.key === 'Shift') shiftActive.value = false;
}

defineExpose({ scrollList });

onMounted(() => {
    clickIndex.value = model.value?.[0] ?? 0;
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
})

onUnmounted(() => {
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
})

const inRange = (i: number) =>
    i >= Math.min(clickIndex.value, hoverIndex.value) &&
    i <= Math.max(clickIndex.value, hoverIndex.value) &&
    shiftActive.value;

function click(i: number) {
    if (!shiftActive.value) return;
    const start = Math.min(clickIndex.value, i);
    const end = Math.max(clickIndex.value, i);
    const range: number[] = [];
    for (let i=start; i<=end; i++) range.push(i);
    model.value?.splice(0, model.value.length, ...range);
}

function show(stein_gate: typeof props.stein_gate, index: number) {
	const question = stein_gate?.choices?.[index];
	const exp = question?.condition ? question.condition.replace(/\$[\w]+/g, (match) => {
		const val = stein_gate?.hidden_vars.find(v => v.id_v2 === match.slice());
		return val?.value.toString() || '0';
	}) : '1';
	return (new Function('return ' + exp.match(/^[\d+\-*/.()=<>\s]+$/)?.[0]))();
}
</script>

<style lang="scss" scoped>
.range {
    background: color-mix(in srgb, var(--primary-color) 15%, var(--block-color));
    @apply transition-[background];
}
</style>