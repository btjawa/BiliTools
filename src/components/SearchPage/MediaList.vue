<template>
<RecycleScroller
    ref="scrollList" key-field="index"
    :items="props.info.list" :item-size="50"
>
    <template #before v-if="info.stein_gate">
    <div class="max-w-full flex justify-center gap-1 mb-2 overflow-auto">
        <button v-for="story in info.stein_gate.story_list"
            class="w-9 h-9 rounded-full relative p-0 flex-shrink-0"
            @click="updateStein(story.edge_id)"
        >
            <i :class="[$fa.weight, story.is_current ? 'fa-check' : 'fa-location-dot']"></i>
        </button>
    </div>
    </template>
    <template v-slot="{ item, index }">
    <div
        class="flex w-full items-center h-12 text-sm p-4 rounded-lg bg-[var(--block-color)]"
        :class="{ 'border-2 border-solid border-[var(--primary-color)]': item.isTarget }"
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
    <template #after v-if="info.stein_gate">
    <div class="w-full flex justify-center gap-1 my-2">
        <template v-for="(question, index) in info.stein_gate.choices"><button
            v-if="show(info.stein_gate, index)"
            @click="updateStein(question.id)"
        >{{ question.option }}</button></template>
    </div>
    </template>
</RecycleScroller>
</template>
<!--  -->
<script lang="ts" setup>
import { RecycleScroller } from 'vue-virtual-scroller';
import { MediaInfo } from '@/types/shared.d';
import { ref } from 'vue';

const model = defineModel();
const props = defineProps<{
    info: MediaInfo,
    updateStein: Function
}>();

const scrollList = ref<InstanceType<typeof RecycleScroller>>();

function show(stein_gate: typeof props.info.stein_gate, index: number) {
	const question = stein_gate?.choices?.[index];
	const exp = question?.condition ? question.condition.replace(/\$[\w]+/g, (match) => {
		const val = stein_gate?.hidden_vars.find(v => v.id_v2 === match.slice());
		return val?.value.toString() || '0';
	}) : '1';
	return (new Function('return ' + exp.match(/^[\d+\-*/.()=<>\s]+$/)?.[0]))();
}

requestAnimationFrame(() => scrollList.value?.scrollToItem((model.value as number[])[0]));
</script>