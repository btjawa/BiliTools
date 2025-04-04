<template><div>
    <button @click="open(settings[data] as string)"
        class="ellipsis max-w-[420px] rounded-r-none"
    >{{ settings[data] }}</button>
    <button @click="update(data)" class="primary-color rounded-l-none">
        <i class="fa-light fa-folder-open"></i>
    </button>
</div></template>

<script setup lang="ts">
import { useSettingsStore } from "@/store";

const settings = useSettingsStore();
defineProps<{
    data: keyof typeof settings.$state;
    open: (path: string) => void;
    update: (type: string) => void
}>();
</script>