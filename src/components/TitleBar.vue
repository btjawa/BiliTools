<template>
<div data-tauri-drag-region @contextmenu.prevent class="title-bar">
    <img class="favicon" src="../assets/icon.png" />
    <div class="title">BiliTools</div>
    <div class="titlebar-button" id="titlebar-minimize" @click="minimize">
        <i class="iconfont icon-minus-bold"></i>
    </div>
    <div class="titlebar-button" id="titlebar-maximize" @click="maximize">
        <i :class="{'iconfont': true, 'icon-3zuidahua-3': maxed, 'icon-zuidahua': !maxed}"></i>
    </div>
    <div class="titlebar-button" id="titlebar-close" @click="close">
        <i class="iconfont icon-xmark"></i>
    </div>
</div>
</template>

<script lang="ts">
import { getCurrent } from '@tauri-apps/api/window';
import { defineComponent, onMounted, ref } from 'vue';

export default defineComponent({
    setup() {
        const maxed = ref(false);
        const appWindow = getCurrent();
        onMounted(async () => maxed.value = await appWindow.isMaximized());
        function minimize() { appWindow.minimize(); }
        function maximize() {
            if (maxed.value) appWindow.unmaximize();
            else appWindow.maximize();
            maxed.value = !maxed.value;
        }
        function close() { appWindow.close(); }
        return { minimize, maximize, close, maxed }
    }
});

</script>

<style scoped>
.title-bar {
    height: 35px;
    width: 100vw;
    background: rgba(26,26,26,1);
    border-bottom: #333333 solid 1px;
    position: absolute;
    display: flex;
    z-index: 99;
    right: 0;
    top: 0;
    color: #c4c4c4;
}

.titlebar-button {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    width: 45px;
    height: 34px;
    transition: all 0.1s;
}

.titlebar-button i {
    font-size: 13px;
}

.titlebar-button:hover:not(#titlebar-close) {
    background-color: #242424;
}

#titlebar-close:hover {
    background-color: rgb(196,43,28);
}

.favicon {
    height: 18px;
    width: 18px;
    margin: 8.5px;
}

.title {
    margin-right: auto;
    line-height: 35px;
    font-size: 13px;
}

.favicon, .title {
    user-select: none;
    pointer-events: none;
}
</style>