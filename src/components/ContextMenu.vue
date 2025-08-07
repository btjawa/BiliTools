<template><Transition>
<ul @mousedown.prevent
    v-if="v.active" :style="{ 'top': v.y + 'px', 'left': v.x + 'px' }"
    class="fixed flex flex-col min-w-36 w-fit shadow-lg rounded-lg" ref="menu"
>
    <button v-for="v in options" @click="v.action">
        <i :class="['fa-light', v.icon]"></i>
        <span>{{ $t(v.text) }}</span>
    </button>
</ul>
</Transition></template>

<script lang="ts" setup>
import { readText } from '@tauri-apps/plugin-clipboard-manager';
import { nextTick, onMounted, reactive, ref } from 'vue';

const options = [{
    icon: 'fa-scissors',
    text: 'contextMenu.cut',
    action: () => document.execCommand('cut'),
}, {
    icon: 'fa-copy',
    text: 'contextMenu.copy',
    action: () => document.execCommand('copy'),
}, {
    icon: 'fa-paste',
    text: 'contextMenu.paste',
    action: async () => {
        const elm = document.activeElement as HTMLInputElement;
        const text = await readText();
        if ('selectionStart' in elm && !elm.readOnly && !elm.disabled) {
            const start = elm.selectionStart ?? 0;
            const end = elm.selectionEnd ?? 0;
            elm.value = elm.value.slice(0, start) + text + elm.value.slice(end);
            elm.selectionStart = elm.selectionEnd = start + text.length;
            elm.dispatchEvent(new Event('input'));
        }
    },
}];

const menu = ref<HTMLElement>();
const v = reactive({
    active: false,
    x: 0,
    y: 0,
});

defineExpose({ init });
async function init(e: MouseEvent) {
    close();
    await nextTick();
    v.active = true;
    await nextTick();
    if (!menu.value) return;
    menu.value.animate([
        { transform: 'translateY(-50px)' },
        { transform: 'translateY(0)' }
    ], {
        duration: 200,
        easing: 'cubic-bezier(0.23,0,0,1.32)',
    });
    const w = menu.value.offsetWidth;
    const h = menu.value.offsetHeight;
    v.x = e.clientX + w > window.innerWidth ? e.clientX - w : e.clientX;
    v.y = e.clientY + h > window.innerHeight ? e.clientY - h : e.clientY;
}

function close() {
    v.active = false;
}

onMounted(() => document.addEventListener('click', close));
</script>

<style lang="scss" scoped>
ul {
    @apply overflow-hidden z-[100] bg-[var(--solid-block-color)];
    @apply border border-solid border-[var(--split-color)]
}

button {
    @apply rounded-none text-left;
}
</style>