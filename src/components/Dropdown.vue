<template>
  <div class="relative w-fit min-w-40 inline-block">
    <button
      ref="button"
      class="w-full flex items-center"
      @click="active = !active"
    >
      <span class="w-full text-left">{{
        drop.find((v) => v.id == model)?.name
      }}</span>
      <i class="fa-solid fa-triangle text-[10px] transition-transform"></i>
    </button>
    <Transition>
      <div v-if="active" class="list fixed flex flex-col shadow-lg mt-1">
        <button v-for="(v, k) in drop" :key="k" @click="model = v.id">
          {{ v.name }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
defineProps<{
  drop: { id: unknown; name: unknown }[];
}>();
const active = ref(false);
const button = ref<HTMLElement>();
const model = defineModel<unknown>();

function close(e: MouseEvent) {
  if (button.value?.contains(e.target as Node)) return;
  active.value = false;
}
onMounted(() => document.addEventListener('click', close));
onBeforeUnmount(() => document.removeEventListener('click', close));
</script>

<style scoped>
@reference 'tailwindcss';

button:hover i {
  @apply rotate-180;
}
.list {
  @apply bg-(--solid-block-color) border border-solid border-(--split-color) max-h-64;
  @apply overflow-auto rounded-lg min-w-40 w-max z-10;
  button {
    @apply text-left rounded-none h-[27px];
  }
}
.flat > button {
  @apply h-5 p-0 bg-transparent;
}
</style>
