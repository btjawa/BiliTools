<template><button
    @click="model = !model"
    :class="{ 'active': model }"
    class="h-fit w-10 p-1 rounded-full"
><div
    class="h-4 w-4 rounded-full"
></div></button><br /></template>

<script lang="ts" setup>
const model = defineModel();
</script>

<style lang="scss" scoped>
button {
    div {
        @apply translate-x-0 bg-[var(--desc-color)];
        transition: transform 0.2s cubic-bezier(0,1,.6,1);
    }
    &:hover div {
        @apply scale-110;
    }
    &.active {
        @apply bg-[var(--primary-color)];
        div {
            @apply translate-x-full bg-[var(--dark-button-color)];
        }
    }
}
</style>