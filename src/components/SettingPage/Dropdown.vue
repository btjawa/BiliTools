<template><div>
    <select :name="data" @change="($event) => {
        const value = JSON.parse(($event.target as HTMLSelectElement).value);
        update(value.data, value.id);
    }">
        <template v-if="typeof drop === 'string'">
            <option v-for="option in infoStore.mediaMap[drop]"
                :value="JSON.stringify({ id: option.id, data })"
                :selected="option.id === settings[data]"
            >{{ $t(`common.default.${drop}.data.${option.id}`) }}</option>
        </template>
        <template v-else>
            <option v-for="option in drop"
                :value="JSON.stringify({ id: option.id, data: data })"
                :selected="option.id === settings[data]"
            >{{ option.name }}</option>
        </template>
    </select>
    <svg class="w-3 inline-block -translate-x-6" viewBox="0 0 13.4 8.1">
        <path d="M6.8 8.1L0 1.75 1.36.3l5.38 5L11.97 0l1.42 1.4-6.6 6.7z" fill="var(--primary-color)"></path>
    </svg>
</div></template>

<script setup lang="ts">
import { useInfoStore, useSettingsStore } from "@/store";
const infoStore = useInfoStore();
const settings = useSettingsStore();

defineProps<{
    data: keyof typeof settings,
    drop: keyof typeof infoStore.mediaMap | { id: number, name: string }[],
    update: (key: string, item: any) => void
}>();
</script>