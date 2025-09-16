<template>
  <VList ref="vlist" v-slot="{ item, index }" :data="list">
    <div>
      <div
        v-if="edge"
        class="w-fit max-w-full mx-auto flex gap-1 mb-2 overflow-auto"
      >
        <button
          v-for="v in edge.list"
          :key="v.cursor"
          class="w-9 h-9 rounded-full relative p-0 flex-shrink-0"
          @click="updateEdge(v.edge_id)"
        >
          <i
            :class="[$fa.weight, v.is_current ? 'fa-check' : 'fa-location-dot']"
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
      <div v-if="edge" class="w-full flex justify-center gap-1 mt-2">
        <template v-for="v in edge.choices" :key="v.id">
          <button v-if="showChoice(v)" class="mx-1" @click="updateEdge(v.id)">
            {{ v.option }}
          </button>
        </template>
      </div>
    </div>
  </VList>
</template>
<script lang="ts" setup>
import { MediaEdge, MediaItem } from '@/types/shared.d';
import { EdgeChoice } from '@/types/media/extras.d';
import { onMounted, onUnmounted, ref } from 'vue';
import { VList } from 'virtua/vue';

const checkboxs = defineModel<number[]>();
const props = defineProps<{
  edge?: MediaEdge;
  list: MediaItem[];
  updateEdge: (id: number) => void;
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

function showChoice(choice: EdgeChoice) {
  const expr = choice.condition
    .replace(
      /\$[\w]+/g,
      (val) =>
        props.edge?.vars.find((v) => v.id_v2 === val)?.value.toString() || '0',
    )
    .match(/^[\d+\-*/.()=<>\s]+$/)?.[0];
  return choice.condition ? new Function('return ' + expr)() : true;
}
</script>

<style scoped>
@reference 'tailwindcss';

.range {
  background: color-mix(in srgb, var(--primary-color) 15%, var(--block-color));
  @apply transition-[background];
}
</style>
