<template><div class="relative min-w-[152px]">
  <template v-if="!props.useActive">
    <button @click="active = !active" ref="dropdown" class="w-full text-left" type="button">{{ props.name }}</button>
    <i class="fa-solid fa-triangle text-[10px] absolute right-[14px] top-[11px] transition-transform pointer-events-none"></i>
  </template>
  <div :class="{ 'active': active }" class="list absolute flex flex-col">
    <button v-for="option in drop" @click="props.emit(option.id)" type="button">{{ option.name }}</button>
  </div>
</div></template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
const props = defineProps<{
  drop: { id: any, name: any }[],
  name: any,
  emit: (id: any) => any,
  useActive?: { active: boolean, close: Function, target?: HTMLElement },
}>();
const active = ref(false);
const dropdown = ref<HTMLElement>();
watch(() => props.useActive?.active, v => active.value = v ?? false)
function handleClick(e: MouseEvent) {
  if ((dropdown.value || props.useActive?.target)?.contains(e.target as Node)) return;
  if (props.useActive) props.useActive.close();
  active.value = false;
}
onMounted(() => document.addEventListener('click', handleClick));
onBeforeUnmount(() => document.addEventListener('click', handleClick));
</script>

<style lang="scss" scoped>
button:hover + i {
  @apply rotate-180;
}
.list {
  @apply bg-[var(--solid-block-color)] border border-solid border-[var(--split-color)] shadow-lg mt-1 max-h-64;
  @apply transition-opacity opacity-0 pointer-events-none invisible overflow-auto rounded-lg min-w-[152px] w-max z-10;
  &.active {
    @apply opacity-100 pointer-events-auto visible;
  }
  button {
    @apply text-left rounded-none h-[27px];
  }
}
</style>