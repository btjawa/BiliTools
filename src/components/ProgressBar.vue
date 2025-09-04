<template><div
    class="progress relative flex-1 rounded-full bg-(--button-color) h-1.5 w-64"
    :style="{ '--progress': progress + '%' }"
></div></template>

<script lang="ts" setup>
defineProps<{
    progress: number,
}>();
</script>

<style scoped>
@reference 'tailwindcss';

.progress::after {
    @apply content-[''] absolute w-(--progress) h-full rounded-full bg-(--primary-color) transition-[width];
}
</style>