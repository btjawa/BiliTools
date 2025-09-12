<template>
  <button
    @click="model = !model"
    :class="{ 'primary-color active': model }"
    class="h-fit! w-10! p-1! rounded-full!"
  >
    <div class="h-4 w-4 rounded-full"></div></button
  ><br />
</template>

<script lang="ts" setup>
const model = defineModel();
</script>

<style scoped>
@reference 'tailwindcss';

button {
  div {
    @apply translate-x-0 bg-(--desc-color);
    transition: translate 0.2s cubic-bezier(0, 1, 0.6, 1);
  }
  &:hover div {
    @apply scale-110;
  }
  &.active div {
    @apply translate-x-full bg-(--primary-text);
  }
}
</style>
