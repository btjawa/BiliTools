<template>
<div ref="contextMenu" v-show="active" @contextmenu.prevent
    class="context-menu flex fixed flex-col overflow-hidden w-[200px] rounded-lg transition-opacity 
    bg-[color:var(--section-color)] border border-solid border-[var(--split-color)] z-[99] shadow-lg"
    @transitionend.prevent :style="{ opacity, top: pos.y + 'px', left: pos.x + 'px' }"
>
    <div @click="handleAction('cut')" class="context-menu__item">
        <i class="fa-light fa-cut item__icon"></i>
        {{ $t('common.context_menu.cut') }}<a class="item__key">Ctrl+X</a>
    </div>
    <div @click="handleAction('copy')" class="context-menu__item ">
        <i class="fa-light fa-copy item__icon"></i>
        {{ $t('common.context_menu.copy') }}<a class="item__key">Ctrl+C</a>
    </div>
    <div @click="handleAction('paste')" class="context-menu__item">
        <i class="fa-light fa-paste item__icon"></i>
        {{ $t('common.context_menu.paste') }}<a class="item__key">Ctrl+V</a>
    </div>
</div></template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    mounted() {
        document.addEventListener('click', this.hideMenu);
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.keyCode === 27) this.hideMenu();
        })
    },
    data() {
        return {
            active: false,
            pos: { x: 0, y: 0 },
            opacity: 0,
            activeElement: null as HTMLInputElement | HTMLTextAreaElement | null,
            selection: '',
        }
    },
    methods: {
        async handleAction(action: string) {
            switch (action) {
                case 'cut':
                    navigator.clipboard.writeText(this.handleTextUpdate(this.activeElement));
                    break;
                case 'copy':
                    navigator.clipboard.writeText(this.selection);
                    break;
                case 'paste':
                    this.handleTextUpdate(this.activeElement, await navigator.clipboard.readText() || "");
                    break;
            }
        },
        hideMenu() {
            this.active = false;
            this.opacity = 0;
        },
        handleTextUpdate(element: HTMLInputElement | HTMLTextAreaElement | null, text: string = '') {
            if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
                const start = element.selectionStart ?? 0;
                const end = element.selectionEnd ?? 0;
                element.value = element.value.substring(0, start) + text + element.value.substring(end);
                const pos = start + text.length;
                element.setSelectionRange(pos, pos);
                return element.value.substring(start, end) || this.selection;
            }
            return text;
        },
        showMenu(e: MouseEvent) {
            this.activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
            this.selection = window.getSelection()?.toString() || "";
            if (this.active) this.hideMenu();
            requestAnimationFrame(() => {
                this.active = true;
                this.$nextTick(() => {
                    const contextMenu = this.$refs.contextMenu as HTMLElement;
                    const menuHeight = contextMenu.offsetHeight;
                    const menuWidth = contextMenu.offsetWidth;
                    this.pos = {
                        x: e.clientX + menuWidth > document.body.clientWidth ? e.clientX - menuWidth - 1 : e.clientX + 1,
                        y: e.clientY + menuHeight > document.body.clientHeight ? e.clientY - menuHeight - 1 : e.clientY + 1,
                    };
                    this.opacity = 1;
                });
            });
        }
    }
});
</script>

<style scoped lang="scss">
.context-menu__item {
	color: #c4c4c4;
	height: 35px;
	display: flex;
	align-items: center;
	padding: 10px;
	font-size: 14px;
	position: relative;
	cursor: pointer;
	&:hover {
		transition: background-color 0.2s;
        background-color: var(--split-color);
	}
    .item__key {
        position: absolute;
        right: 10px;
        color: #999;
        font-size: 12px;
    }
    .item__icon {
        margin-right: 10px;
    }
}
</style>
