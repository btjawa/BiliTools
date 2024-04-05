<template>
<div ref="contextMenu" class="context-menu" v-show="data.active" @contextmenu.prevent
    :style="{ opacity: data.opacity, top: data.pos.y + 'px', left: data.pos.x + 'px' }">
    <div @click="handleAction('cut')" class="context-menu-item cut">
        <i class="fa-light fa-cut context-menu-item-icon"></i>
        剪切<a class="context-menu-item-key">Ctrl+X</a>
    </div>
    <div @click="handleAction('copy')" class="context-menu-item copy">
        <i class="fa-light fa-copy context-menu-item-icon"></i>
        复制<a class="context-menu-item-key">Ctrl+C</a>
    </div>
    <div @click="handleAction('paste')" class="context-menu-item paste">
        <i class="fa-light fa-paste context-menu-item-icon"></i>
        粘贴<a class="context-menu-item-key">Ctrl+V</a>
    </div>
    <div class="context-menu-split"></div>
    <div @click="handleAction('bilibili')" class="context-menu-item bilibili">
        <i class="fa-brands fa-bilibili context-menu-item-icon"></i>
        在Bilibili上打开此页
    </div>
</div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, nextTick, onMounted, onUnmounted } from 'vue';
import { clipboard } from '@tauri-apps/api';
import * as utils from '../scripts/utils';

export default defineComponent({
    setup() {
        const contextMenu = ref<HTMLElement | null>(null);
        const data = reactive({
            active: false,
            pos: { x: 0, y: 0 },
            opacity: 0,
        });

        function showMenu(e: MouseEvent) {
            if (data.active) hideMenu();
            requestAnimationFrame(() => {
                data.active = true;
                nextTick(() => {
                    if (!contextMenu.value) return;
                    const menuHeight = contextMenu.value.offsetHeight;
                    const menuWidth = contextMenu.value.offsetWidth;
                    data.pos = {
                        x: e.clientX + menuWidth > document.body.clientWidth ? e.clientX - menuWidth - 1 : e.clientX + 1,
                        y: e.clientY + menuHeight > document.body.clientHeight ? e.clientY - menuHeight - 1 : e.clientY + 1,
                    };
                    data.opacity = 1;
                });
            });
        };

        async function handleAction(action: string) {
            const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
            switch (action) {
                case 'cut':
                    clipboard.writeText(handleTextUpdate(activeElement));
                    break;
                case 'copy':
                    clipboard.writeText(window.getSelection()?.toString() || "");
                    break;
                case 'paste':
                    handleTextUpdate(activeElement, await clipboard.readText() || "");
                    break;
                case 'bilibili':
                    utils.bilibili(null, document.querySelector('.search__input'));
                    break;
            }
        };

        const handleTextUpdate = (element: HTMLInputElement | HTMLTextAreaElement | null, text: string = ''): string => {
            if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
                const start = element.selectionStart ?? 0;
                const end = element.selectionEnd ?? 0;
                element.value = element.value.substring(0, start) + text + element.value.substring(end);
                const pos = start + text.length;
                element.setSelectionRange(pos, pos);
                return element.value.substring(start, end);
            }
            return text;
        };

        function hideMenu() {
            data.active = false;
            data.opacity = 0;
        }

        onMounted(() => document.addEventListener('click', hideMenu));

        onUnmounted(() => document.removeEventListener('click', hideMenu));

        return { data, contextMenu, showMenu, handleAction };
    },
});
</script>

<style scoped>
.context-menu {
    width: 200px;
    border-radius: 8px;
    background-color: #2c2c2c;
    border: solid 1px #666666d3;
    z-index: 10;
    flex-direction: column;
    flex-wrap: wrap;
    position: fixed;
    user-select: none;
    opacity: 0;
    display: flex;
    transition: opacity 0.2s;
}

.context-menu-split {
    height: 8px;
    align-self: center;
    width: 100%;
    position: relative;
}

.context-menu-split::after {
    content: '';
    height: 0.5px;
    width: 96%;
    left: 2%;
    top: 50%;
    position: absolute;
    background-color: #6666669d;
}

.context-menu-item {
    color: #c4c4c4;
    height: 35px;
    display: flex;
    align-items: center;
    padding: 0 10px;
    font-size: 14px;
    position: relative;
    cursor: pointer;
}

.context-menu-item::after {
    content: '';
    position: absolute;
    top: 9%;
    left: 2%;
    right: 0;
    height: 100%;
    border-radius: 4px;
    width: 96%;
    height: 82%;
    z-index: -1;
    transition: all 0.2s;
}

.context-menu-item:hover::after { background-color: #6666669d; }

.context-menu-item-key {
    position: absolute;
    right: 10px;
    color: #999;
    font-size: 12px;
}

.context-menu-item-icon {
    margin-right: 10px;
}
</style>
