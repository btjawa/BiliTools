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
        :class="{ '!border-[var(--primary-color)]': item.isTarget }"
    >
        <div class="checkbox">
            <input type="checkbox" :value="index" v-model="model"/>
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
import { ref } from 'vue';

const model = defineModel();
const props = defineProps<{
    stein_gate: MediaInfo['stein_gate'],
    list: MediaItem[],
    updateStein: Function
}>();

const scrollList = ref<RecycleScrollerInstance>();
defineExpose({ scrollList });

function show(stein_gate: typeof props.stein_gate, index: number) {
	const question = stein_gate?.choices?.[index];
	const exp = question?.condition ? question.condition.replace(/\$[\w]+/g, (match) => {
		const val = stein_gate?.hidden_vars.find(v => v.id_v2 === match.slice());
		return val?.value.toString() || '0';
	}) : '1';
	return (new Function('return ' + exp.match(/^[\d+\-*/.()=<>\s]+$/)?.[0]))();
}
</script>