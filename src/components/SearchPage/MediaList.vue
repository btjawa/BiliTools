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
        :class="{ 
            '!border-[var(--primary-color)]': item.isTarget,
            'range-preview-highlight': isInPreviewRange(index)
        }"
        @mouseenter="handleMouseEnter($event, index)"
        @mouseleave="handleMouseLeave"
    >
        <div class="checkbox">
            <input type="checkbox" :value="index" v-model="model" @click="handleCheckboxClick($event, index)"/>
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

const model = defineModel<number[]>();
const props = defineProps<{
    stein_gate: MediaInfo['stein_gate'],
    list: MediaItem[],
    updateStein: Function
}>();

const scrollList = ref<RecycleScrollerInstance>();
// Track the last clicked index for range selection
const lastClickedIndex = ref<number | null>(null);
// Track current hover index for range preview
const currentHoverIndex = ref<number | null>(null);
const currentShiftState = ref<boolean>(false);

defineExpose({ scrollList });

// Mouse hover handlers for range preview
function handleMouseEnter(event: MouseEvent, index: number): void {
    // Update Shift key state based on current mouse event
    currentShiftState.value = event.shiftKey;
    
    if (event.shiftKey && lastClickedIndex.value !== null) {
        currentHoverIndex.value = index;
    } else {
        currentHoverIndex.value = null;
    }
}

function handleMouseLeave(): void {
    currentHoverIndex.value = null;
    currentShiftState.value = false;
}

// Check if an index is in the preview range
function isInPreviewRange(index: number): boolean {
    if (!currentShiftState.value || 
        lastClickedIndex.value === null || 
        currentHoverIndex.value === null) {
        return false;
    }
    
    const startIndex = Math.min(lastClickedIndex.value, currentHoverIndex.value);
    const endIndex = Math.max(lastClickedIndex.value, currentHoverIndex.value);
    
    return index >= startIndex && index <= endIndex;
}

// Handle checkbox click with Shift key range selection support
function handleCheckboxClick(event: MouseEvent, currentIndex: number): void {
    if (event.shiftKey && lastClickedIndex.value !== null) {
        // Prevent default behavior only for range selection
        event.preventDefault();
        
        if (!model.value) return;
        
        // Range selection: select all items between lastClickedIndex and currentIndex
        const startIndex = Math.min(lastClickedIndex.value, currentIndex);
        const endIndex = Math.max(lastClickedIndex.value, currentIndex);
        
        // Create range array and replace current selection
        const rangeSelection: number[] = [];
        for (let i = startIndex; i <= endIndex; i++) {
            rangeSelection.push(i);
        }
        model.value.splice(0, model.value.length, ...rangeSelection);
    } else {
        // Normal single selection: let v-model handle it naturally
        // No preventDefault() here, so checkbox responds immediately
    }
    
    // Update last clicked index for future range selections
    lastClickedIndex.value = currentIndex;
    // Clear hover preview after click
    currentHoverIndex.value = null;
    currentShiftState.value = false;
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

<style scoped>
/* Range preview highlight style */
.range-preview-highlight {
    background: color-mix(in srgb, var(--primary-color) 15%, var(--block-color)) !important;
    transition: background-color 0.15s ease;
}
</style>