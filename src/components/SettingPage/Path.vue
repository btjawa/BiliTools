<template><div>
    <button @click="open({ path: settings[data] as string })"
        class="ellipsis max-w-[420px] rounded-r-none"
    >{{ settings[data] }}</button>
    <button @click="update(data)" class="primary-color rounded-l-none">
        <i class="fa-light fa-folder-open"></i>
    </button>
</div></template>

<script setup lang="ts">
import { useAppStore, useSettingsStore } from "@/store";

const settings = useSettingsStore();
const app = useAppStore();
defineProps<{
    data: keyof typeof settings.$state;
    open: (options: { path?: string, getPath?: boolean, pathName?: keyof typeof app.cache }) => void;
    update: (type: string) => void
}>();
</script>