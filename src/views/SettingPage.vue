<template><div class="flex-col items-start justify-start">
    <h1>
        <i class="fa-solid fa-gear mr-2"></i>
        {{ $t('settings.title') }}
        <i @click="openPath({ path: 'https://www.btjawa.top/bilitools#设置' })"
            class="question fa-light fa-circle-question text-xl"
        ></i>
    </h1>
    <hr />
    <div class="setting-page__sub flex w-full">
        <div
            class="setting-page__sub-page flex flex-col flex-1 max-h-[calc(100vh-160px)] mr-6"
            ref="subPage"
        >
            <section v-for="(item, index) in settings.find(item => item.id == subPage)?.content">
                <h3 v-if="item.type !== 'reference'" class="font-semibold">
                    <i v-if="'icon' in item" class="fa-solid mr-1" :class="item.icon"></i>
                    {{ item.name }}
                </h3>
                <template v-if="'desc' in item && item.desc">
                    <span class="desc">{{ item.desc }}</span>
                </template>
                <div v-if="item.type === 'section'" class="units">
                    <div v-for="unit in item.data" :class=unit.type class="mt-3">
                        <h3>{{ unit.name }}</h3>
                        <span v-if="'desc' in unit && unit.desc" class="desc">{{ unit.desc }}</span>
                        <div v-if="unit.type === 'path'" class="h-8 mt-2">
                            <button @click="openPath((store.settings as any)[unit.data])"
                                class="ellipsis max-w-[420px] rounded-r-none"
                            >{{ (store.settings as any)[unit.data] }}</button>
                            <button @click="updatePath(unit.data)"
                                class="bg-[color:var(--primary-color)] rounded-l-none"
                            ><i class="fa-light fa-folder-open"></i></button>
                        </div>
                        <div v-if="unit.type === 'cache'">
                            <button @click="openPath({ getPath: true, pathName: unit.data })"
                                :class="unit.data"
                                class="ellipsis max-w-[120px] min-w-24 rounded-r-none"
                            >{{ formatBytes((store.data.cache as any)[unit.data]) }}</button>
                            <button @click="cleanCache(unit.data)"
                                class="bg-[color:var(--primary-color)] rounded-l-none"
                            ><i class="fa-light fa-broom-wide"></i></button>
                        </div>
                        <input v-if="unit.type === 'input'"
                            :type="unit.data === 'password' ? 'password' : 'text'"
                            :placeholder="'placeholder' in unit ? unit.placeholder : ''"
                            @blur="updateProxy($event, unit.data as typeof store.settings.proxy)"
                            :value="(store.settings.proxy as any)[unit.data]"
                            autocorrect="off" spellcheck="false" autocapitalize="off"
                        />
                        <button v-if="unit.type === 'switch'"
                            @click="updateSettings('auto_check_update', !(store.settings as any)[unit.data])"
                            :class="{ 'active': (store.settings as any)[unit.data] }"
                            class="inline-block w-11 h-[22px] relative delay-100 p-[3px] rounded-xl hover:brightness-150"
                        >
                            <div class="circle h-4 w-4 rounded-lg bg-[color:var(--desc-color)] absolute left-[3px] top-[3px]"></div>
                        </button>
                        <button v-if="unit.type === 'button' && 'action' in unit"
                            @click=" unit.data === 'function' ?
                                unit.action?.type === 'url' ?
                                openPath({ path: (unit.action as any).url }) :
                                unit.action?.type === 'checkProxy' ?
                                checkProxy() : 
                                unit.action?.type === 'checkUpdate' ? 
                                (checkUpdate as any)() : '' : ''
                            "
                            :class="unit.type"
                        >
                            <span>{{ unit.name }}</span>
                            <i class="fa-solid" :class="'icon' in unit ? unit.icon : ''"></i>
                        </button>
                        <template v-if="unit.type === 'dropdown'">
                            <select :name="unit.data" v-if="'drop' in unit" @change="($event) => {
                                const value = JSON.parse(($event.target as HTMLSelectElement).value);
                                updateSettings(value.data, value.id);
                            }">
                                <template v-if="typeof unit.drop === 'string'">
                                    <option v-for="option in (store.data.mediaMap as any)[unit.drop]"
                                        :value="JSON.stringify({ id: option.id, data: unit.data })"
                                        :selected="option.id === (store.settings as any)[unit.data]"
                                    >{{ $t(`common.default.${unit.drop}.data.${option.id}`) }}</option>
                                </template>
                                <template v-else>
                                    <option v-for="option in unit.drop"
                                        :value="JSON.stringify({ id: option.id, data: unit.data })"
                                        :selected="option.id === (store.settings as any)[unit.data]"
                                    >{{ option.name }}</option>
                                </template>
                            </select>
                            <svg class="w-3 inline-block -translate-x-6" viewBox="0 0 13.4 8.1">
                                <path d="M6.8 8.1L0 1.75 1.36.3l5.38 5L11.97 0l1.42 1.4-6.6 6.7z" fill="var(--primary-color)"></path>
                            </svg>
                        </template>
                        <div v-if="unit.type === 'icon'" :class="unit.type" class="flex items-center">
                            <img class="h-16 mr-6 w-auto inline" src="@/assets/img/icon.svg" draggable="false" />
                            <img class="h-10 w-auto inline" src="@/assets/img/icon-big.svg" draggable="false" />
                        </div>
                        <div v-if="unit.type === 'version'" :class="unit.type" class="my-[6px] relative">
                            {{ $t('common.version') }}: <span @click="openPath({ path: 'https://github.com/btjawa/BiliTools/releases/tag/v' + version })"
                                class="mx-2 text-[color:var(--primary-color)] [text-shadow:var(--primary-color)_0_0_12px] drop-shadow-md font-semibold cursor-pointer"
                            >{{ version }}</span>
                            <span class="text desc ml-2">
                                <i class="fa-solid fa-code-commit"></i>
                                {{ store.data.hash.slice(0, 7) }}
                            </span>
                        </div>
                    </div>
                </div>
                <div v-if="item.type === 'reference'" class="desc">
                    Copyright &copy; {{(new Date()).getFullYear()}} btjawa, MIT License<br>
                    {{ $t('common.exempt') }}<br>
                    {{ $t('settings.about.thanks') }}
                </div>
                <hr v-if="index < (settings.find(item => item.id == subPage)?.content.length! - 1)" />
            </section>
        </div>
        <div class="setting-page__sub-tab flex flex-col items-start gap-1">
            <button v-for="item in settings" @click="subPage = item.id" :class="subPage !== item.id || 'active'"
                class="p-[8px_0] w-60 flex items-center justify-end bg-[color:unset] gap-3 hover:bg-[#33333380]"
            >
                <span class="text-base">{{ item.name }}</span>
                <i 
                    class="min-w-4"
                    :class="['fa-light', 'min-w-4', item.icon]"
                ></i>
                <label class="w-[3px] rounded-md h-4 bg-[color:var(--primary-color)] invisible"></label>
            </button>
        </div>
    </div>
</div></template>
<script lang="ts">
import { ApplicationError, formatBytes, formatProxyUrl, iziInfo } from '@/services/utils';
import { Channel, invoke } from '@tauri-apps/api/core';
import { getVersion as getAppVersion } from '@tauri-apps/api/app';
import { type as osType } from '@tauri-apps/plugin-os';
import { fetch } from '@tauri-apps/plugin-http';
import locales from '@/locales/index.json';
import store from '@/store';
import * as path from '@tauri-apps/api/path';
import * as dialog from '@tauri-apps/plugin-dialog';
import * as shell from '@tauri-apps/plugin-shell';

export default {
    data() {
        return {
            subPage: "storage",
            store: store.state,
            version: '',
            abortGetSize: false,
        }
    },
    computed: {
        settings() {
            const t = this.$t;
            return [
                { id: "storage", name: t('settings.storage.name'), icon: "fa-database", content: [
                    { name: t('settings.storage.paths.name'), type: "section", icon: "fa-folder", data: [
                        { name: t('settings.label.down_dir'), type: "path", data: "down_dir" },
                        { name: t('settings.label.temp_dir'), type: "path", desc: t('settings.storage.paths.temp_dir.desc'), data: "temp_dir" },
                    ] },
                    { name: t('settings.storage.cache.name'), type: "section", icon: "fa-database", desc: t('settings.storage.cache.desc'), data: [
                        { name: t('settings.label.log'), type: "cache", data: "log" },
                        { name: t('settings.label.temp'), type: "cache", data: "temp" },
                        { name: t('settings.label.webview'), type: "cache", data: "webview" },
                        { name: t('settings.label.database'), type: "cache", data: "database" },
                    ] },
                    { name: t('settings.storage.language.name'), type: "section", icon: "fa-earth-americas", data: [
                        { name: t('settings.storage.language.name'), type: "dropdown", data: "language", drop: locales.languages.map(lang => ({
                            id: lang.id,
                            name: `${lang.name} ${lang.flag}`
                        })) }
                    ] },
                ] },
                { id: "download", name: t('settings.download.name'), icon: "fa-download", content: [
                    { name: t('settings.download.default.name'), type: "section", icon: "fa-user", desc: t('settings.download.default.desc'), data: [
                        { name: t('common.default.dms.name'), type: "dropdown", data: "df_dms", drop: "dms" },
                        { name: t('common.default.ads.name'), type: "dropdown", data: "df_ads", drop: "ads" },
                        { name: t('common.default.cdc.name'), type: "dropdown", data: "df_cdc", drop: "cdc" },
                        { name: t('settings.label.max_conc'), type: "dropdown", data: "max_conc", drop: [
                            { id: 1, name: "1" },
                            { id: 2, name: "2" },
                            { id: 3, name: "3" },
                            { id: 4, name: "4" },
                            { id: 5, name: "5" },
                        ] },
                    ] },
                    { name: t('settings.download.proxy.name'), type: "section", icon: "fa-globe", desc: t('settings.download.proxy.desc'), data: [
                        { name: t('common.address'), type: "input", data: "addr", placeholder: "http(s)://server:port" },
                        { name: t('common.username'), type: "input", data: "username", placeholder: t('common.optional') },
                        { name: t('common.password'), type: "input", data: "password", placeholder: t('common.optional') },
                        { name: t('settings.label.checkProxy'), type: "button", data: "function", action: { type: "checkProxy" }, icon: "fa-cloud-question" },
                    ] }
                ] },
                { id: "about", name: t('settings.about.name'), icon: "fa-circle-info", content: [
                    { name: null, type: "section", data: [
                        { name: null, type: "icon", data: '' },
                        { name: null, type: "version", data: '' }
                    ] },
                    { name: t('settings.about.update.name'), type: "section", icon: "fa-upload", data: [
                        { name: t('settings.label.auto_check_update'), type: "switch", data: "auto_check_update" },
                        { name: t('settings.label.checkUpdate'), type: "button", data: "function", action: { type: "checkUpdate" }, icon: "fa-wrench" },
                    ] },
                    { name: t('settings.about.links.name'), type: "section", icon: "fa-link", data: [
                        { name: t('settings.label.documentation'), type: "button", data: "function", action: { type: "url", url: "https://btjawa.top/bilitools" }, icon: "fa-book" },
                        { name: t('settings.label.feedback'), type: "button", data: "function", action: { type: "url", url: "https://github.com/btjawa/BiliTools/issues/new/choose"}, icon: "fa-comment-exclamation" }
                    ] },
                    { type: "reference" }
                ] }
            ];
        }
    },
    watch: {
        subPage(oldPage, newPage) {
            if (oldPage !== newPage) {
                const subPage = this.$refs.subPage as HTMLElement;
                subPage.style.transition = 'none';
                subPage.style.opacity = '0';
                this.$nextTick(() => requestAnimationFrame(() => {
                    subPage.style.transition = 'opacity 0.3s';
                    subPage.style.opacity = '1';
                }));
            }
        },
    },
    methods: {
        invoke,
        formatBytes,
        checkUpdate() {
            const status = this.store.settings.auto_check_update;
            this.updateSettings('auto_check_update', !status);
            this.updateSettings('auto_check_update', status);
        },
        updatePath(type: string) {
            dialog.open({
                directory: true,
                defaultPath: (this.store.settings as any)[type]
            }).then(path => {
                if (!path) return null;
                this.updateSettings(type, path);
            }).catch(err => {
                new ApplicationError(err).handleError();
            })
        },
        updateProxy(event: Event, key: keyof typeof this.store.settings.proxy) {
            const data = (event.target as HTMLInputElement).value;
            if (data === this.store.settings.proxy[key]) return null;
            this.store.settings.proxy[key] = data;
            this.updateSettings('proxy', this.store.settings.proxy);
        },
        updateSettings(key: string, item: any) {
            if (key === "df_cdc" && item as number < 0) return;
            invoke('rw_config', { action: 'write', settings: { [key]: item }, secret: this.store.data.secret });
        },
        async getPath(type: string) {
            if (type === 'log') {
                return await path.appLogDir();
            } else if (type === 'temp') {
                return path.join(await path.tempDir(), 'com.btjawa.bilitools');
            } else if (type === 'webview') {
                return osType() === "windows" ? path.join(await path.appLocalDataDir(), 'EBWebView') : path.join(await path.cacheDir(), '..', 'WebKit', 'BiliTools', 'WebsiteData');
            } else if (type === 'database') {
                return path.join(await path.appDataDir(), 'Storage');
            } else return '';
        },
        async checkProxy() {
            try {
                const response = await fetch('https://api.bilibili.com/x/click-interface/click/now', {
                    headers: this.store.data.headers,
                    ...(this.store.settings.proxy.addr && {
                        proxy: { all: formatProxyUrl(this.store.settings.proxy) }
                    })
                });
                if (!response.ok) {
                    throw new ApplicationError(response.statusText, { code: response.status });
                }
                const body = await response.json();
                const timestamp = JSON.stringify(body?.data);
                if (timestamp) {
                    iziInfo(this.$t('common.iziToast.success') + ': ' + timestamp);
                    return timestamp;
                } else {
                    throw new ApplicationError(body?.message, { code: body?.code });
                }
            } catch(err) {
                err instanceof ApplicationError ? err.handleError() :
                new ApplicationError(err as string).handleError();
            }
        },
        async openPath(options: { path?: string, getPath?: boolean, pathName?: string }) {
            if (!options.path) {
                if (!options?.getPath || !options.pathName) return;
                const path = await this.getPath(options.pathName);
                return shell.open(path);
            }
            return shell.open(options.path);
        },
        async getSize(pathName: string) {
            (this.store.data.cache as any)[pathName] = 0;
            const event = new Channel<number>();
            event.onmessage = (bytes) => {
                (this.store.data.cache as any)[pathName] = bytes;
            }
            await invoke('get_size', { path: await this.getPath(pathName), event });
        },
        async cleanCache(pathName: string) {
            const result = await dialog.ask(this.$t('settings.askDelete'), { 'kind': osType() === "windows" ? 'warning' : 'error' });
            if (!result) return;
            await invoke('clean_cache', { path: await this.getPath(pathName) });
            await this.getSize(pathName);
        }
    },
    async activated() {
        Object.entries(this.store.data.cache).forEach(async type => this.getSize(type[0]));
    },
    deactivated() {
        this.abortGetSize = true;
    },
    async mounted() {
        this.version = await getAppVersion();
    }
};
</script>
<style lang="scss" scoped>
hr {
    @apply w-full my-4;
}
.page span.desc {
    @apply text-sm;
}
.setting-page__sub-tab button.active {
    @apply bg-[#33333380];
    label {
        @apply visible animate-[slide_0.2s_cubic-bezier(0,1,1,1)];
    }
}
.cache, .dropdown, .input, .button, .switch {
    & > div {
        @apply inline-block;
    }
    h3 {
        @apply inline-block w-[140px];
    }
}
.switch button {
    &:hover .circle {
        transform: scale(112%);
    }
    .circle {
        transition: left 0.2s cubic-bezier(0,1,.6,1), transform 0.2s;
    }
    &.active {
        background-color: var(--primary-color);
        .circle {
            background-color: var(--content-color);
            left: 25px;
        }
    }
}
</style>