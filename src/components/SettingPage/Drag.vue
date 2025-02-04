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

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import store from '@/store';

const sources = ref<{ id: string | number, name: string | number }[]>([]);
const target = ref<{ id: string | number, name: string | number }[]>([]);

const props = defineProps<{
    placeholders: { id: number | string, name: string | number }[],
    update: (key: string, data: any) => any,
    shorten: string,
    data: string,
}>();

function onUpdate(e: any) {
    console.log(e.data)
    if (!target.value.length) target.value.push(e.data);
    target.value = Array.from(new Map(target.value.map(item => [item.id, item])).values());
    props.update(props.data, target.value.map(item => item.id).join('_'));
}

function onSourceAdd() {
    sources.value = props.placeholders;
}

onMounted(() => {
    onSourceAdd();
    target.value = store.state.settings.filename.split('_').map((id) => {
        return { id, name: props.placeholders.find(item => item.id === id)?.name || id };
    });
})
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