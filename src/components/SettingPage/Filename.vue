<template><div>
    <div class="flex flex-wrap gap-2 mb-4">
        <button v-for="id in FilenamePlaceholders" @click="append(id)">
            <span>{{ $t(`common.default.placeholders.${id}`) }}</span>
        </button>
    </div>
    <input class="w-full mb-4"
        type="text" spellcheck="false" @blur="check"
        v-model="settings.advanced.filename_format"
    />
</div></template>

<script lang="ts" setup>
import { useSettingsStore } from '@/store';
import { FilenamePlaceholders } from '@/types/data.d';
const settings = useSettingsStore();

function update(v: string) {
    settings.updateNest('advanced.filename_format', v);
};

function check() {
    if (!FilenamePlaceholders.some(id => settings.advanced.filename_format.includes(`{${id}}`))) update('{title}');
}

function append(id: string) {
    update(settings.advanced.filename_format + `{${id}}`);
}
</script>

<style lang="scss" scoped>
</style>