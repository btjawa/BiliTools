<template><div class="flex mx-auto my-auto flex-col items-center pointer-events-none">
    <img src="/src/assets/img/empty.png" class="w-64" />
    <span class="desc">{{ $t(text) }}</span>
</div></template>

<script setup lang="ts">
defineProps<{ text: string; }>();
</script>