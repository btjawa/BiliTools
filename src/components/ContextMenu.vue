<template>
<div v-show="active" @contextmenu.prevent @transitionend.prevent
    class="context-menu" :style="{ opacity: Number(active), top: pos.y + 'px', left: pos.x + 'px' }" ref="$el"
>
    <button @click="handleAction('cut')" class="context-menu__item">
        <i class="fa-light fa-cut"></i>
        <span>{{ $t('common.context_menu.cut') }}<a>Ctrl+X</a></span>
    </button>
    <button @click="handleAction('copy')" class="context-menu__item ">
        <i class="fa-light fa-copy"></i>
        <span>{{ $t('common.context_menu.copy') }}<a>Ctrl+C</a></span>
    </button>
    <button @click="handleAction('paste')" class="context-menu__item">
        <i class="fa-light fa-paste"></i>
        <span>{{ $t('common.context_menu.paste') }}<a>Ctrl+V</a></span>
    </button>
</div></template>

<script setup lang="ts">
import { onMounted, ref, watch, nextTick } from 'vue';
import { readText } from '@tauri-apps/plugin-clipboard-manager';

const $el = ref<HTMLElement>();
const active = ref(false);
const pos = ref({
    x: 0, y: 0
});
const activeElement = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);
const selection = ref(String());

onMounted(() => {
    const hideMenu = () => active.value = false;
    document.addEventListener('click', hideMenu);
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.keyCode === 27) hideMenu();
    })
});

watch(active, () => {
    if (!$el.value) return;
    $el.value.style.transition = 'none';
    nextTick(() => requestAnimationFrame(() => {
        if (!$el.value) return;
        $el.value.style.transition = 'top 0.1s, left 0.1s';
    }));
})

async function handleAction(action: string) {
    switch (action) {
        case 'cut':
            return document.execCommand('cut');
        case 'copy':
            return document.execCommand('copy');
        case 'paste':
            return handleTextUpdate(activeElement.value, await readText());
    }
}

function handleTextUpdate(element: HTMLInputElement | HTMLTextAreaElement | null, text: string = '') {
    if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
        const start = element.selectionStart ?? 0;
        const end = element.selectionEnd ?? 0;
        element.value = element.value.substring(0, start) + text + element.value.substring(end);
        const pos = start + text.length;
        element.setSelectionRange(pos, pos);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        return element.value.substring(start, end) || selection.value;
    }
    return text;
}

function showMenu(e: MouseEvent) {
    activeElement.value = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    selection.value = window.getSelection()?.toString() || "";
    active.value = true;
    nextTick(() => {
        if (!$el.value) return;
        const menuHeight = $el.value.offsetHeight;
        const menuWidth = $el.value.offsetWidth;
        pos.value = {
            x: e.clientX + menuWidth > document.body.clientWidth ? e.clientX - menuWidth - 1 : e.clientX + 1,
            y: e.clientY + menuHeight > document.body.clientHeight ? e.clientY - menuHeight - 1 : e.clientY + 1,
        };
    });
}

defineExpose({ showMenu });
</script>

<style scoped lang="scss">
.context-menu {
    @apply fixed overflow-hidden w-[200px] rounded-lg z-[100] shadow-lg;
    @apply bg-[color:var(--solid-block-color)] border border-solid border-[var(--split-color)];
    @apply animate-[rightmenu-in_.2s_cubic-bezier(.23,0,0,1.32)];
}
.context-menu__item {
    @apply flex items-center w-full p-2.5 h-[35px] rounded-none;
    a {
        @apply absolute right-2.5 text-xs text-[var(--desc-color)];
    }
}
@keyframes rightmenu-in {
  0% {
    opacity: 0;
    transform: translateY(-50px);
  }
  100% {
    opacity: 1;
    filter: none;
    transform: translateY(0);
  }
}
</style>
