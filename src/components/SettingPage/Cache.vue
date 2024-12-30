<template><div>
    <button @click="open({ getPath: true, pathName: data })"
        class="ellipsis max-w-[120px] min-w-24 rounded-r-none"
    >{{ formatBytes(store.data.cache[data]) }}</button>
    <button @click="update(data)" class="primary-color rounded-l-none">
        <i class="fa-light fa-broom-wide"></i>
    </button>
</div></template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import store from '@/store';
import { formatBytes } from '@/services/utils';

export default defineComponent({
    props: {
        data: {
            type: String as PropType<keyof typeof store.state.data.cache>,
            required: true,
        },
        open: {
            type: Function as PropType<(options: { path?: string, getPath?: boolean, pathName?: keyof typeof store.state.data.cache }) => void>,
            required: true,
        },
        update: {
            type: Function as PropType<(pathName: keyof typeof store.state.data.cache) => void>,
            required: true,
        },
    },
    methods: {
        formatBytes
    },
    data() {
        return {
            store: store.state
        }
    }
})
</script>