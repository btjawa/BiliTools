<template><div class="flex mx-auto my-auto flex-col items-center" v-if="exp">
    <img src="/src/assets/img/empty.png" class="w-64" draggable="false" />
    <span class="desc">{{ $t(text) }}</span>
</div></template>

<script setup lang="ts">
defineProps<{
    exp: boolean;
    text: string;
}>();
</script>