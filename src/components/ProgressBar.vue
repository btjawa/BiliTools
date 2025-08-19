<template><div
    class="progress relative flex-1 rounded-full bg-[var(--button-color)] h-1.5 w-64"
    :style="{ '--progress': progress + '%' }"
></div></template>

<script lang="ts" setup>
defineProps<{
    progress: number,
}>();
</script>

<style lang="scss" scoped>
.progress::after {
    @apply content-[''] absolute w-[var(--progress)] h-full rounded-full bg-[var(--primary-color)] transition-[width];
}
</style>