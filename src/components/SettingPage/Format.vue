<template><div>
<template v-for="(item, key) in options">
    <span>{{ $t(`settings.advanced.format.${key}`) }}</span>
    <div class="flex flex-wrap gap-2 mb-4 mt-2">
        <button v-for="id in item.source" @click="append(key, id)">
        <span>{{ $t(`common.default.placeholders.${id}`) }}</span>
        </button>
    </div>
    <input
        class="w-full mb-4" type="text" spellcheck="false"
        v-model="item.data.value" @blur="check(key)"
        @input="(e) => update(key, (e.target as HTMLInputElement).value)"
    />
</template>
</div></template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useSettingsStore } from '@/store';
import { FilenamePlaceholders, FolderPlaceholders } from '@/types/data.d';

const settings = useSettingsStore();

const options = {
    filename: { source: FilenamePlaceholders, data: ref(settings.advanced.filename_format) },
    folder: { source: FolderPlaceholders, data: ref(settings.advanced.folder_format) },
}

function update(type: 'filename' | 'folder', value: string) {
    options[type].data.value = value;
    settings.updateNest(`advanced.${type}_format`, value);
}

function check(type: 'filename' | 'folder') {
    const { source, data } = options[type];
    if (!source.some(id => data.value.includes(`{${id}}`))) {
        if (type === 'filename') update(type, '{index}_{title}');
        else update(type, '{title}_{date_sec}');
    }
}

function append(type: 'filename' | 'folder', id: string) {
    update(type, options[type].data.value + `{${id}}`);
}
</script>

<style lang="scss" scoped>
</style>
