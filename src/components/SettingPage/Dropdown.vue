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
    <i class="fa-solid fa-triangle -translate-x-6 rotate-180 text-[10px]"></i>
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