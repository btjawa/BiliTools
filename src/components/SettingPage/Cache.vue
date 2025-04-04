<template><div>
    <button @click="open(data)"
        class="ellipsis max-w-[120px] min-w-24 rounded-r-none"
    >{{ formatBytes(app.cache[data]) }}</button>
    <button @click="update(data)" class="primary-color rounded-l-none">
        <i class="fa-light fa-broom-wide"></i>
    </button>
</div></template>

<script setup lang="ts">
import { useAppStore } from "@/store";
import { formatBytes } from '@/services/utils';

const app = useAppStore();
defineProps<{
    data: keyof typeof app.cache,
    open: (name: keyof typeof app.cache) => void,
    update: (pathName: keyof typeof app.cache) => void,
}>();
</script>