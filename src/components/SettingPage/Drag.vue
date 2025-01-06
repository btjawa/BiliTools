<template><div class="flex flex-col gap-3">
<VueDraggable
    class="list target w-fit" v-model="sources"
    :group="{ name: 'list', pull: 'clone' }" @add="onSourceAdd"
    :animation="150" ghostClass="ghost" :sort="false"
>
    <button v-for="item in sources" :key="item.id">
        {{ item.name }}
    </button>
</VueDraggable>
<div class="flex items-center">
    <span class="min-w-[140px]">{{ shorten }}</span>
    <VueDraggable
        class="list target min-w-fit max-w-[420px]" v-model="target"
        :animation="150" ghostClass="ghost" group="list"
        @remove="onUpdate" @add="onUpdate" @update="onUpdate"
    >
        <button v-for="item in target" :key="item.id">
            {{ item.name }}
        </button>
    </VueDraggable>
</div>
</div></template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';

export default defineComponent({
    components: {
        VueDraggable
    },
    data() {
        return {
            store: this.$store.state,
            sources: [] as { id: string | number, name: string | number }[],
            target: [] as { id: string | number, name: string | number }[],
        }
    },
    props: {
        placeholders: {
            type: Array as PropType<{ id: number | string, name: string | number }[]>,
            required: true,
        },
        update: {
            type: Function as PropType<(key: string, data: any) => any>,
            required: true,
        },
        shorten: {
            type: String as PropType<string>,
            required: true,
        },
        data: {
            type: String as PropType<string>,
            required: true,
        },
    },
    computed: {
        fa_dyn() {
            return this.store.settings.theme === 'light' ? 'fa-light' : 'fa-solid';
        }
    },
    methods: {
        onUpdate(e: any) {
            console.log(e.data)
            if (!this.target.length) this.target.push(e.data);
            this.target = Array.from(new Map(this.target.map(item => [item.id, item])).values());
            this.update(this.data, this.target.map(item => item.id).join('_'));
        },
        onSourceAdd() { this.sources = this.placeholders },
    },
    mounted() {
        this.onSourceAdd();
        this.target = this.store.settings.filename.split('_').map((id) => {
            return { id, name: this.placeholders.find(item => item.id === id)?.name || id };
        });
    },
});
</script>

<style scoped lang="scss">
button {
    cursor: move !important;
}
.ghost {
    opacity: 0.5;
    background: var(--content-color);
}
.list {
    @apply flex gap-2 overflow-hidden;
}
.target { 
    @apply bg-[color:var(--button-color)] text-[color:var(--content-color)] rounded-lg min-h-8;
}
</style>