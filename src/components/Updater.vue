<template>
<div class="updater text z-[99] opacity-0 w-screen flex-col transition-opacity duration-[0.3s] pointer-events-none pt-[18px] pb-12 px-9">
    <h1 class="text-3xl"><i class="fa-solid fa-wrench mr-3"></i>{{ $t('updater.title') }}<span class="desc ml-3">{{ $t('updater.current', [update?.currentVersion]) }}</span></h1>
    <h3 class="text-lg">BiliTools v{{ update?.version }}<span class="desc ml-3">{{ update?.date }}</span></h3>
    <span class="desc">{{ $t('updater.disableUpdate') }}</span>
    <markdown-style v-html="body"
        class="updater-body leading-7 max-h-[calc(100%-165px)] overflow-auto mt-3 mb-6"
    ></markdown-style>
    <div ref="updaterAction"
        class="updater-action inline-block relative transition-opacity z-[2]"
    >
        <button @click="handleAction(true)" class="primary-color">
            <i class="fa-solid fa-download"></i>
            <span>{{ $t('updater.install') }}</span>
        </button>
        <button @click="handleAction()">{{ $t('common.cancel') }}</button>
    </div>
    <div ref="updaterProgress"
        class="updater-progress opacity-0 inline-block absolute z-[1] left-12 transition-opacity leading-8"
    >
        <div :style="'--progress-width: ' + updateProgress.bytes * 160 / updateProgress.length + 'px;'"
            class="updater-progress-bar inline-block mr-3 relative h-1.5 bg-[color:var(--block-color)] w-40 rounded-[3px]"
        ></div>
        <span class="inline-block min-w-[70px]">{{
            updateProgress.length ? 
            (updateProgress.bytes * 100 / updateProgress.length).toFixed(2) + ' %'
            : formatBytes(updateProgress.bytes)
        }}</span>
    </div>
</div>
</template>

<script lang="ts">
import { defineComponent, markRaw } from 'vue';
import { ApplicationError, formatBytes, formatProxyUrl } from '@/services/utils';
import { check as checkUpdate, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { marked } from 'marked';

export default defineComponent({
    data() {
        return {
            update: null as Update | null,
            body: String(),
            mainElement: {} as HTMLElement,
            sidebarElement: {} as HTMLElement,
            updateProgress: {
                bytes: 0,
                length: 1,
                completed: false,
            },
            store: this.$store.state
        }
    },
    computed: {
        auto_check_update() {
            return this.store.settings.auto_check_update;
        }
    },
    watch: {
        async auto_check_update(v, _) {
            if (!v) return null;
            try {
                await this.checkUpdate();
            } catch(err) {
                new ApplicationError(err as string + '\n' + this.$t('error.tryManualUpdate')).handleError();
            }
        }
    },
    methods: {
        formatBytes,
        async checkUpdate() {
            const update = await checkUpdate({
                ...(this.store.settings.proxy.addr && {
                    proxy: formatProxyUrl(this.store.settings.proxy)
                })
            });
            console.log('Update:', update);
            if (update?.available) {
                this.update = markRaw(update);
                this.body = await marked.parse(this.update.body || '');
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
                    this.$el.classList.add('active');
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
                    await this.update?.downloadAndInstall((event) => {
                        switch (event.event) {
                        case 'Started':
                            this.updateProgress.length = event.data?.contentLength || 0;
                            console.log(`started downloading ${event.data.contentLength} bytes`);
                            break;
                        case 'Progress':
                            this.updateProgress.bytes += event.data.chunkLength;
                            console.log(`downloaded ${this.updateProgress.bytes} from ${this.updateProgress.length}`);
                            break;
                        case 'Finished':
                            this.updateProgress.completed = true;
                            console.log('download finished');
                            break;
                        }
                    });
                    await relaunch();
                } catch(err) {
                    new ApplicationError(err as string).handleError();
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
                this.$el.classList.remove('active');
            }
        }
    }
});
</script>
    
<style scoped lang="scss">
.updater.active, .updater-progress.active {
    opacity: 1;
    pointer-events: all;
}
button {
    margin-right: 16px;
    display: inline-block;
    min-height: 32px;
    border-radius: 8px;
    font-size: 14px;
    padding: 6px 10px;
    i {
        margin-right: 8px;
    }
}
.updater-progress-bar::after {
    content: '';
    position: absolute;
    width: var(--progress-width);
    height: 6px;
    inset: 0;
    border-radius: 3px;
    background-color: var(--primary-color);
}
</style>