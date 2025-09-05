<template>
<div class="relative rounded-lg overflow-hidden" :style="ctnStyle">
    <Transition>
        <img v-if="v.blob" :src="v.blob" class="object-cover z-10" :style="imgStyle" />
    </Transition>
    <div v-if="!v.blob" class="hold absolute inset-0 bg-(--block-color)"></div>
</div>
</template>

<script lang="ts" setup>
import { computed, reactive, watch } from 'vue';
import { getBlob } from '@/services/utils';
const model = defineModel<Record<string, string>>();

const props = defineProps<{
    src: string | null | undefined;
    width?: number;
    height?: number;
    ratio?: number;
    cache?: boolean;
}>();

const v = reactive({
    blob: null as string | null,
});

const ctnStyle = computed(() => {
    let w = props.width;
    let h = props.height;
    if (!w && !h && !props.ratio) return {
        width: '100%',
        height: '100%'
    };
    if (!w && !h && props.ratio) return {
        width: '100%',
        aspectRatio: props.ratio,
        display: v.blob ? 'flex' : 'block',
    };
    if (w && !h && props.ratio) h = w / props.ratio;
    if (h && !w && props.ratio) w = h * props.ratio;
    if (h && !w && !props.ratio) w = h;
    return {
        ...(props.width && props.height && props.ratio && {
            minWidth: w + 'px'
        }),
        width: v.blob
            ? 'fit-content'
            : (w ? w + 'px' : '100%'),
        height: h ? h + 'px' : '100%',
        display: v.blob ? 'flex' : 'block',
    };
});

const imgStyle = computed(() => ({
    height: props.height ? props.height + 'px' : '100%',
    width: (props.width && props.height && props.ratio) ? props.width + 'px' : 'auto',
    maxWidth: '100%',
}));

watch(() => props.src, async (src) => {
    if (!src) return;
    if (!model.value) {
        v.blob = await getBlob(src);
        return;
    }
    try {
        const blob = model.value[src] ?? await getBlob(src);
        model.value[src] ??= blob;
        v.blob = blob;
    } catch(_) {}
}, { immediate: true });
</script>

<style scoped>
@reference 'tailwindcss';

.hold::after {
    @apply content-[""] absolute pointer-events-none blur-xl;
    @apply -inset-12 -inset-x-24;
    background: linear-gradient(
        110deg,
        transparent 0%,
        #ffffff05 25%,
        #ffffff20 50%,
        #ffffff05 75%,
        transparent 100%
    );
    animation: sweep 1s linear infinite;
}

@keyframes sweep {
    from { transform: translateX(-100%); }
    to   { transform: translateX(100%); }
}
</style>