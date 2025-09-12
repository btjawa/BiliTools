<template>
  <VList ref="vlist" v-slot="{ item, index }" :data="list">
    <div>
      <div
        v-if="steinGate"
        class="max-w-full flex justify-center gap-1 mb-2 flex-shrink-0 overflow-auto"
      >
        <button
          v-for="(story, k) in steinGate.story_list"
          :key="k"
          class="w-9 h-9 rounded-full relative p-0 flex-shrink-0"
          @click="updateStein(story.edge_id)"
        >
          <i
            :class="[
              $fa.weight,
              story.is_current ? 'fa-check' : 'fa-location-dot',
            ]"
          ></i>
        </button>
      </div>
      <div
        class="flex w-full items-center h-12 text-sm p-4 my-px rounded-lg bg-(--block-color) border-2 border-solid border-transparent"
        :class="{
          'border-(--primary-color)!': item.isTarget,
          range: inRange(index),
        }"
        @mouseenter="hoverIndex = index"
      >
        <div class="checkbox">
          <input
            v-model="checkboxs"
            type="checkbox"
            :value="index"
            @click="click(index)"
          />
          <i class="fa-solid fa-check"></i>
        </div>
        <span class="min-w-6">{{ index + 1 }}</span>
        <div class="w-px h-full bg-(--split-color) mx-4"></div>
        <span class="flex flex-1 truncate text">{{ item.title }}</span>
      </div>
      <div v-if="steinGate" class="w-full flex justify-center gap-1 my-2">
        <template v-for="(question, k) in steinGate.choices" :key="k"
          ><button
            v-if="show(steinGate, k)"
            class="mx-1"
            @click="updateStein(question.id)"
          >
            {{ question.option }}
          </button></template
        >
      </div>
    </div>
  </VList>
</template>
<script lang="ts" setup>
import { MediaInfo, MediaItem } from '@/types/shared.d';
import { onMounted, onUnmounted, ref } from 'vue';
import { VList } from 'virtua/vue';

const checkboxs = defineModel<number[]>();
defineProps<{
  steinGate: MediaInfo['stein_gate'];
  list: MediaItem[];
  updateStein: (id: number) => void;
}>();

const vlist = ref<InstanceType<typeof VList>>();
const shiftActive = ref(false);
const clickIndex = ref(0);
const hoverIndex = ref(0);

const keyDown = (e: KeyboardEvent) => {
  if (e.key === 'Shift') shiftActive.value = true;
};

const keyUp = (e: KeyboardEvent) => {
  if (e.key === 'Shift') shiftActive.value = false;
};

defineExpose({ vlist });

onMounted(() => {
  clickIndex.value = checkboxs.value?.[0] ?? 0;
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
});

onUnmounted(() => {
  window.removeEventListener('keydown', keyDown);
  window.removeEventListener('keyup', keyUp);
});

const inRange = (i: number) =>
  i >= Math.min(clickIndex.value, hoverIndex.value) &&
  i <= Math.max(clickIndex.value, hoverIndex.value) &&
  shiftActive.value;

function click(i: number) {
  const click = clickIndex.value;
  if (!shiftActive.value && checkboxs.value) {
    clickIndex.value = i;
    const idx = checkboxs.value?.indexOf(i);
    if (idx === -1) {
      checkboxs.value?.push(i);
    } else {
      checkboxs.value?.splice(idx, 1);
    }
    return;
  }
  const start = Math.min(click, i);
  const end = Math.max(click, i);
  const range: number[] = [];
  for (let i = start; i <= end; i++) range.push(i);
  checkboxs.value = range;
}

function show(steinGate: MediaInfo['stein_gate'], index: number) {
  const question = steinGate?.choices?.[index];
  const exp = question?.condition
    ? question.condition.replace(/\$[\w]+/g, (match) => {
        const val = steinGate?.hidden_vars.find(
          (v) => v.id_v2 === match.slice(),
        );
        return val?.value.toString() || '0';
      })
    : '1';
  return new Function('return ' + exp.match(/^[\d+\-*/.()=<>\s]+$/)?.[0])();
}
</script>

<style scoped>
@reference 'tailwindcss';

.range {
  background: color-mix(in srgb, var(--primary-color) 15%, var(--block-color));
  @apply transition-[background];
}
</style>
