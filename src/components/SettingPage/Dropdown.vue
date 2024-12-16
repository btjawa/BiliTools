<template><div>
    <select :name="data" @change="($event) => {
        const value = JSON.parse(($event.target as HTMLSelectElement).value);
        update(value.data, value.id);
    }">
        <template v-if="typeof drop === 'string'">
            <option v-for="option in store.data.mediaMap[drop]"
                :value="JSON.stringify({ id: option.id, data })"
                :selected="option.id === store.settings[data]"
            >{{ $t(`common.default.${drop}.data.${option.id}`) }}</option>
        </template>
        <template v-else>
            <option v-for="option in drop"
                :value="JSON.stringify({ id: option.id, data: data })"
                :selected="option.id === store.settings[data]"
            >{{ option.name }}</option>
        </template>
    </select>
    <svg class="w-3 inline-block -translate-x-6" viewBox="0 0 13.4 8.1">
        <path d="M6.8 8.1L0 1.75 1.36.3l5.38 5L11.97 0l1.42 1.4-6.6 6.7z" fill="var(--primary-color)"></path>
    </svg>
</div></template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import store from '@/store';

export default defineComponent({
    props: {
        data: {
            type: String as PropType<keyof typeof store.state.settings>,
            required: true,
        },
        drop: { 
            type: [String, Array] as PropType<keyof typeof store.state.data.mediaMap | { id: number, name: string }[]>, 
            required: true,
        },
        update: {
            type: Function as PropType<(key: string, item: any) => void>,
            required: true,
        },
    },
    data() {
        return {
            store: store.state
        }
    }
})
</script>