<template><div>
    <button @click="open({ path: store.state.settings[data] as string })"
        class="ellipsis max-w-[420px] rounded-r-none"
    >{{ store.state.settings[data] }}</button>
    <button @click="update(data)" class="primary-color rounded-l-none">
        <i class="fa-light fa-folder-open"></i>
    </button>
</div></template>

<script setup lang="ts">
import store from '@/store';

defineProps<{
    data: keyof typeof store.state.settings;
    open: (options: { path?: string, getPath?: boolean, pathName?: keyof typeof store.state.data.cache }) => void;
    update: (type: string) => void
}>();
</script>