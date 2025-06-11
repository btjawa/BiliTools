<template><div class="relative inline-block">
  <template v-if="!props.useActive">
    <button @click="active = !active" ref="button" class="text-left" type="button">
      <i v-if="icon" :class="['fa-solid', icon]"></i>
      <span ref="label">{{ name }}</span>
    </button>
    <i class="fa-solid fa-triangle text-[10px] absolute right-[14px] top-[11px] transition-transform pointer-events-none"></i>
  </template>
  <div :class="{ 'active': active }" class="list absolute flex flex-col">
    <button v-for="v in drop" @click="props.emit(v.id)" type="button">{{ v.name }}</button>
  </div>
</div></template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
const props = defineProps<{
  drop: { id: any, name: any }[],
  id: any,
  emit: (id: any) => any,
  icon?: string,
  useActive?: { active: boolean, close: Function, target?: HTMLElement },
}>();
const active = ref(false);
const button = ref<HTMLElement>();
const label = ref<HTMLElement>();
const name = computed(() => props.drop.find(v => v.id === props.id)?.name ?? '');

const update = () => nextTick(() => {
  if (!label.value || !button.value) return;
  button.value.style.width = `${Math.max(152, label.value.offsetWidth + 70)}px`;
});

watch(() => props.useActive?.active, v => active.value = v ?? false)
watch(() => name.value, update, { immediate: true });
onMounted(update);

function handleClick(e: MouseEvent) {
  if ((button.value || props.useActive?.target)?.contains(e.target as Node)) return;
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