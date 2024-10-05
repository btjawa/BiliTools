<template>
<div class="updater text" ref="updater" @contextmenu.prevent>
    <h1 class=""><i class="fa-solid fa-wrench"></i>版本更新<span class="desc">当前版本：{{ update?.currentVersion }}</span></h1>
    <h3 class="">BiliTools v{{ update?.version }}<span class="desc">{{ update?.date }}</span></h3>
    <span class="desc">您可以在 "设置 -> 关于 -> 更新" 关闭 “自动检查”，但不建议这样做</span>
    <div class="updater-body" v-html="formatEscape(update?.body)" v-if="update?.body"></div>
    <div class="updater-action" ref="updaterAction">
        <button @click="handleAction(true)"><i class="fa-solid fa-download"></i>下载更新</button>
        <button @click="handleAction()">取消</button>
    </div>
    <div class="updater-progress" ref="updaterProgress">
        <span>{{
            updateProgress.length ? 
            (updateProgress.bytes * 100 / updateProgress.length).toFixed(2) + ' %'
            : formatBytes(updateProgress.bytes)
        }}</span>
        <div class="updater-progress-bar" :style="'--progress-width: ' + updateProgress.bytes * 160 / updateProgress.length + 'px;'"></div>
        <button @click="updateProgress.completed ? install() : null"><i class="fa-solid" :class="updateProgress.completed ? 'fa-rocket-launch' : 'fa-ban'"></i>安装更新</button>
    </div>
</div>
</template>

<script lang="ts">
import { defineComponent, markRaw } from 'vue';
import { check as checkUpdate, Update } from '@tauri-apps/plugin-updater';
import * as log from '@tauri-apps/plugin-log';
import { ApplicationError, formatBytes, formatEscape, formatProxyUrl } from '@/services/utils';
import { relaunch } from '@tauri-apps/plugin-process';

export default defineComponent({
    data() {
        return {
            update: null as Update | null,
            mainElement: {} as HTMLElement,
            sidebarElement: {} as HTMLElement,
            updateProgress: {
                bytes: 0,
                length: 0,
                completed: false,
            },
            store: this.$store.state
        }
    },
    async mounted() {
        this.$watch(() => this.store.settings.auto_check_update, async () => {
            if (!this.store.settings.auto_check_update) return null;
            try {
                await this.checkUpdate();
            } catch(err) {
                const error = new ApplicationError(new Error(err as string), { code: -101 });
                error.handleError();
            }
        });
    },
    methods: {
        formatEscape,
        formatBytes,
        async checkUpdate() {
            const update = await checkUpdate({
                ...(this.store.settings.proxy.addr && {
                    proxy: formatProxyUrl(this.store.settings.proxy)
                })
            });
            if (update?.available) {
                console.log(update)
                this.update = markRaw(update);
                this.mainElement = (document.querySelector('.main') as HTMLElement);
                this.sidebarElement = (document.querySelector('.sidebar') as HTMLElement);
                this.mainElement.animate(
                    [ { maskPosition: '0' },
                        { maskPosition: '-100vw' } ],
                    { duration: 600,
                        easing: 'cubic-bezier(0.2,1,1,1)',
                        fill: 'forwards' } );
                this.sidebarElement.style.opacity = '0';
                this.sidebarElement.style.pointerEvents = 'none';
                setTimeout(() => {
                    (this.$refs.updater as HTMLElement).classList.add('active');
                }, 400);
            }
        },
        async handleAction(action?: boolean) {
            if (action) {
                const updaterAction = (this.$refs.updaterAction as HTMLElement);
                updaterAction.style.opacity = '0';
                updaterAction.style.pointerEvents = 'none';
                (this.$refs.updaterProgress as HTMLElement).classList.add('active');
                try {
                    await this.update?.download((event) => {
                        switch (event.event) {
                        case 'Started':
                            this.updateProgress.length = event.data?.contentLength || 0;
                            log.info(`started downloading ${event.data.contentLength} bytes`);
                            break;
                        case 'Progress':
                            this.updateProgress.bytes += event.data.chunkLength;
                            log.info(`downloaded ${this.updateProgress.bytes} from ${this.updateProgress.length}`);
                            break;
                        case 'Finished':
                            this.updateProgress.completed = true;
                            log.info('download finished');
                            break;
                        }
                    });
                } catch(err) {
                    const error = new ApplicationError(new Error(err as string), { code: -102 });
                    error.handleError();
                }
            } else {
                this.mainElement.animate(
                    [ { maskPosition: '-100vw' },
                        { maskPosition: '0' } ],
                    { duration: 600,
                        easing: 'cubic-bezier(0.2,1,1,1)',
                        fill: 'forwards' } );
                this.sidebarElement.style.opacity = '1';
                this.sidebarElement.style.pointerEvents = 'all';
                (this.$refs.updater as HTMLElement).classList.remove('active');

            }
        },
        async install() {
            await this.update?.install();
            await relaunch();
        }
    }
});
</script>
    
<style scoped lang="scss">
.updater {
    background: transparent;
    z-index: 99;
    opacity: 0;
    padding: 18px 36px 48px;
    width: 100vw;
    flex-direction: column;
    transition: opacity 0.3s;
    pointer-events: none;
    &.active {
        opacity: 1;
        pointer-events: all;
    }
    .updater-body {
        margin: 12px 0 24px 0;
        line-height: 28px;
        max-height: 450px;
        overflow: auto;
    }
    .updater-action, .updater-progress {
        button {
            margin-right: 16px;
            display: inline-block;
            min-height: 32px;
            border-radius: 8px;
            font-size: 14px;
            padding: 6px 10px;
            &:hover {
                filter: brightness(80%);
            }
            i {
                margin-right: 8px;
            }
        }
    }
    .updater-action {
        display: inline-block;
        position: relative;
        transition: opacity 0.2s;
        z-index: 2;
        button {
            &:first-child {
                background-color: var(--primary-color);
            }
        }
    }
    .updater-progress {
        opacity: 0;
        display: inline-block;
        position: absolute;
        z-index: 1;
        left: 48px;
        transition: opacity .2s;
        line-height: 32px;
        &.active {
            opacity: 1;
        }
        span {
            display: inline-block;
        }
        .updater-progress-bar {
            display: inline-block;
            margin-left: 12px;
            position: relative;
            height: 6px;
            background-color: var(--block-color);
            width: 160px;
            border-radius: 3px;
            &::after {
                content: '';
                position: absolute;
                width: var(--progress-width);
                height: 6px;
                bottom: 0;
                left: 0;
                border-radius: 3px;
                background-color: var(--primary-color);
            }
            & ~ button {
                margin-left: 16px;
                background-color: var(--primary-color);
            }
        }
    }
}
h1, h3 {
    span {
        margin: 0 0 0 8px;
    }
}
h1 {
    margin-bottom: 16px;
    i {
        margin-right: 8px;
    }
}
h3 {
    margin-bottom: 8px;
}
</style>