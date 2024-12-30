<template><div>
    <button @click="open({ path: store.settings[data] as string })"
        class="ellipsis max-w-[420px] rounded-r-none"
    >{{ store.settings[data] }}</button>
    <button @click="update(data)" class="primary-color rounded-l-none">
        <i class="fa-light fa-folder-open"></i>
    </button>
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
        open: {
            type: Function as PropType<(options: { path?: string, getPath?: boolean, pathName?: keyof typeof store.state.data.cache }) => void>,
            required: true,
        },
        update: {
            type: Function as PropType<(type: string) => void>,
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