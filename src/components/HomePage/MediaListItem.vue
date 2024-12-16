<template><div class="flex items-center rounded-lg h-12 text-sm p-4 bg-[color:var(--block-color)]">
    <span class="min-w-6">{{ index + 1 }}</span>
    <div class="w-px h-full bg-[color:var(--split-color)] mx-4"></div>
    <span class="flex flex-1 ellipsis">{{ title }}</span>
    <div class="w-px h-full bg-[color:var(--split-color)] mx-4"></div>
    <div class="flex gap-2">
        <button @click="actions[0]();">
            <i :class="[fa_dyn, 'fa-file-arrow-down']"></i>
            <span>{{ recycleI18n[0] }}</span>
        </button>
        <button @click="actions[1]()"> 
            <i :class="[fa_dyn, 'fa-file-export']"></i>
            <span>{{ recycleI18n[1] }}</span>
        </button>
    </div>
</div></template>

<script lang="ts">
import { MediaType } from '@/types/data.d';
import { defineComponent, PropType } from 'vue';

export default defineComponent({
    props: {
        index: {
            type: Number as PropType<number>,
            required: true,
        },
        title: {
            type: String as PropType<string>,
            required: true,
        },
        mediaType: {
            type: String as PropType<MediaType>,
            required: true,
        },
        actions: {
            type: Array as PropType<Function[]>,
            required: true,
        },
    },
    computed: {
        fa_dyn() {
			return this.$store.state.settings.theme === 'dark' ? 'fa-solid' : 'fa-light';
		},
        recycleI18n() {
			return [
                this.$t(`home.downloadOptions.${this.mediaType === MediaType.Music ? 'audio' : 'audioVisual'}`),
                this.$t('home.downloadOptions.others')
            ];
		}
    }
});
</script>