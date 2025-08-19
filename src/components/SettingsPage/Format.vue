<template>
<section>
<h2>
    <i :class="[$fa.weight, 'fa-file-signature']"></i>
    <span>{{ $t('settings.format') }}</span>
</h2>
<span class="desc">{{ $t('settings.naming.desc') }}</span>
</section>
<hr />
<template v-for="(val, key) in placeholders">
    <section>
    <h2>
        <i :class="[$fa.weight, key === 'folder' ? 'fa-folder' : 'fa-file']"></i>
        <span>{{ $t('settings.naming.' + key) }}</span>
    </h2>
    <div v-for="(v, k) in val">
        <h2>{{ $t('settings.naming.' + k) }}</h2>
        <div class="flex flex-wrap gap-2 w-full">
            <button v-for="i in v" @click="click(i, key)">{{ $t('format.' + i) }}</button>
        </div>
    </div>
    <input type="text" spellcheck="false" v-model="settings.format[key]" />
    </section>
    <hr />
</template>
</template>

<script lang="ts" setup>
import { useSettingsStore } from '@/store';
import { FormatPlaceholders as p } from '@/types/shared.d';

const settings = useSettingsStore();

const placeholders = {
    folder: {
        basic: p.basic.filter(v => v !== 'title' && v !== 'taskType'),
        down: p.down.filter(v => v !== 'index')
    },
    filename: { ...p }
}

function click(v: string, k: keyof typeof settings.format) {
    const id = `{${v}}`;
    let val = settings.format[k];
    if (!val.includes(id)) val += id;
    settings.format[k] = val;
}
</script>

<style lang="scss" scoped>
h2 {
    @apply mb-2;
}
input {
    @apply mt-2 w-full;
}
</style>