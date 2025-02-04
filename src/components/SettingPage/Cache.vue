<template><div>
    <button @click="open({ getPath: true, pathName: data })"
        class="ellipsis max-w-[120px] min-w-24 rounded-r-none"
    >{{ formatBytes(store.state.data.cache[data]) }}</button>
    <button @click="update(data)" class="primary-color rounded-l-none">
        <i class="fa-light fa-broom-wide"></i>
    </button>
</div></template>

<script setup lang="ts">
import store from '@/store';
import { formatBytes } from '@/services/utils';

defineProps<{
    data: keyof typeof store.state.data.cache,
    open: (options: { path?: string, getPath?: boolean, pathName?: keyof typeof store.state.data.cache }) => void,
    update: (pathName: keyof typeof store.state.data.cache) => void,
}>();
</script>