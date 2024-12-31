<template><div class="flex-col">
    <h1 class="self-start">
        <i class="fa-gear mr-2" :class="store.settings.theme === 'light' ? 'fa-light' : 'fa-solid'"></i>
        {{ $t('settings.title') }}
        <i @click="openPath({ path: 'https://www.btjawa.top/bilitools#设置' })"
            class="question fa-light fa-circle-question text-xl"
        ></i>
    </h1>
    <hr />
    <div class="setting-page__sub flex w-full h-full">
        <div class="flex flex-col flex-1 mr-6" ref="subPage">
            <Empty :expression="settings.find(item => item.id == subPage)?.content?.length === 0" text="common.wip" />
            <section v-for="(item, index) in settings.find(item => item.id == subPage)?.content">
                <h3 v-if="item.name" class="font-semibold">
                    <i class="mr-1" :class="[store.settings.theme === 'light' ? 'fa-light' : 'fa-solid', item.icon]"></i>
                    {{ item.name }}
                </h3>
                <span v-if="'desc' in item" class="desc">{{ item.desc }}</span>
                <div v-for="unit in item.data as UnitType[]" :class=unit.type class="mt-3">
                    <h3>{{ unit.name }}</h3>
                    <span v-if="'desc' in unit" class="desc">{{ unit.desc }}</span>
                    <Path v-if="unit.type === 'path'" class="h-8 mt-2"
                        :data="unit.data" :update="updatePath" :open="openPath"
                    />
                    <Cache v-if="unit.type === 'cache'"
                        :data="unit.data" :update="cleanCache" :open="openPath"
                    />
                    <Dropdown v-if="unit.type === 'dropdown'"
                        :data="unit.data" :drop="unit.drop" :update="updateSettings"
                    />
                    <input v-if="unit.type === 'input'"
                        :type="unit.data === 'password' ? 'password' : 'text'"
                        :placeholder="unit.placeholder"
                        @blur="(e) => updateNest(unit.data, (e.target as HTMLInputElement).value)"
                        autocorrect="off" spellcheck="false" autocapitalize="off"
                    />
                    <button v-if="unit.type === 'switch'"
                        @click="updateNest(unit.data, !getNestedValue(store.settings, unit.data))"
                        :class="{ 'active': getNestedValue(store.settings, unit.data) }"
                        class="inline-block w-11 h-[22px] relative delay-100 p-[3px] rounded-xl"
                    >
                        <div class="circle h-4 w-4 rounded-lg bg-[color:var(--desc-color)] absolute left-[3px] top-[3px]"></div>
                    </button>
                    <button v-if="unit.type === 'button'" @click="unit.data()">
                        <span>{{ unit.name }}</span>
                        <i :class="[store.settings.theme === 'light' ? 'fa-light' : 'fa-solid', unit.icon]"></i>
                    </button>
                    <div v-if="unit.type === 'about'">
                        <div class="mb-4">
                            <img class="h-16 mr-6 w-auto inline" src="@/assets/img/icon.svg" draggable="false" />
                            <img class="h-10 w-auto inline" src="@/assets/img/icon-big.svg" draggable="false" />
                        </div>
                        {{ $t('common.version') }}: <span @click="openPath({ path: 'https://github.com/btjawa/BiliTools/releases/tag/v' + version })"
                            class="mx-2 text-[color:var(--primary-color)] [text-shadow:var(--primary-color)_0_0_12px] drop-shadow-md font-semibold cursor-pointer"
                        >{{ version }}</span>
                        <span class="text desc ml-2">
                            <i :class="store.settings.theme === 'light' ? 'fa-light' : 'fa-solid'" class="fa-code-commit"></i>
                            {{ store.data.hash.slice(0, 7) }}
                        </span>
                    </div>
                    <div v-if="unit.type === 'reference'" class="desc">
                        Copyright &copy; {{(new Date()).getFullYear()}} btjawa, MIT License<br>
                        {{ $t('common.exempt') }}<br>
                        {{ $t('settings.about.thanks') }}
                    </div>
                </div>
                <hr v-if="index < (settings.find(item => item.id == subPage)?.content.length! - 1)" />
            </section>
        </div>
        <div class="setting-page__sub-tab flex flex-col items-start gap-1">
            <button v-for="item in settings" @click="subPage = item.id" :class="subPage !== item.id || 'active'"
                class="p-[8px_0] w-60 flex items-center justify-end bg-[color:unset] gap-3 hover:bg-[color:var(--button-color)]"
            >
                <span class="text-base">{{ item.name }}</span>
                <i :class="['fa-light', 'min-w-4', item.icon]"></i>
                <label class="w-[3px] rounded-md h-4 bg-[color:var(--primary-color)] invisible"></label>
            </button>
        </div>
    </div>
</div></template>
<script lang="ts">
import { ApplicationError, formatProxyUrl, iziInfo } from '@/services/utils';
import { Channel, invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import { type as osType } from '@tauri-apps/plugin-os';
import { fetch } from '@tauri-apps/plugin-http';
import { Path, Cache, Dropdown } from '@/components/SettingPage';
import { Empty } from '@/components';
import locales from '@/locales/index.json';
import store from '@/store';
import * as path from '@tauri-apps/api/path';
import * as dialog from '@tauri-apps/plugin-dialog';
import * as shell from '@tauri-apps/plugin-shell';

type PathAlias = keyof typeof store.state.data.cache;

type UnitType =
| { name: string; type: 'path'; data: keyof typeof store.state.settings; }
| { name: string; type: 'switch'; data: keyof typeof store.state.settings; }
| { name: string; type: 'cache'; data: PathAlias; }
| { name: string; type: 'dropdown'; data: keyof typeof store.state.settings; drop: keyof typeof store.state.data.mediaMap; }
| { name: string; type: 'button'; data: Function; icon: string; }
| { name: string; type: 'input'; data: string; placeholder: string; }
| { name: string; type: 'about' }
| { name: string; type: 'reference' };

export default {
    components: {
        Path,
        Cache,
        Dropdown,
        Empty
    },
    data() {
        return {
            subPage: "storage",
            store: store.state,
            version: String(),
        }
    },
    computed: {
        settings() {
            const t = this.$t;
            return [
                { id: "storage", name: t('settings.storage.name'), icon: "fa-database", content: [
                    { name: t('settings.storage.paths.name'), icon: "fa-folder", data: [
                        { name: t('settings.label.down_dir'), type: "path", data: "down_dir" },
                        { name: t('settings.label.temp_dir'), type: "path", desc: t('settings.storage.paths.temp_dir.desc'), data: "temp_dir" },
                    ] },
                    { name: t('settings.storage.cache.name'), icon: "fa-database", desc: t('settings.storage.cache.desc'), data: [
                        { name: t('settings.label.log'), type: "cache", data: "log" },
                        { name: t('settings.label.temp'), type: "cache", data: "temp" },
                        { name: t('settings.label.webview'), type: "cache", data: "webview" },
                        { name: t('settings.label.database'), type: "cache", data: "database" },
                    ] },
                    { name: t('settings.storage.language.name'), icon: "fa-earth-americas", data: [
                        { name: t('settings.storage.language.name'), type: "dropdown", data: "language", drop: locales.languages.map(lang => ({
                            id: lang.id,
                            name: `${lang.name} ${lang.flag}`
                        })) }
                    ] },
                ] },
                { id: "download", name: t('settings.download.name'), icon: "fa-download", content: [
                    { name: t('settings.download.default.name'), icon: "fa-user", desc: t('settings.download.default.desc'), data: [
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
                    { name: t('settings.download.proxy.name'), icon: "fa-globe", desc: t('settings.download.proxy.desc'), data: [
                        { name: t('common.address'), type: "input", data: "proxy.addr", placeholder: "http(s)://server:port" },
                        { name: t('common.username'), type: "input", data: "proxy.username", placeholder: t('common.optional') },
                        { name: t('common.password'), type: "input", data: "proxy.password", placeholder: t('common.optional') },
                        { name: t('settings.label.checkProxy'), type: "button", data: this.checkProxy.bind(this), icon: "fa-cloud-question" },
                    ] }
                ] },
                { id: "advanced", name: t('settings.advanced.name'), icon: "fa-flask", content: [
                    { name: t('settings.advanced.auto_convert_flac.name'), icon: "fa-exchange", desc: t('settings.advanced.auto_convert_flac.desc'), data: [
                        { name: t('settings.label.auto_convert_flac'), type: "switch", data: "advanced.auto_convert_flac" },
                    ] }
                ] },
                { id: "about", name: t('settings.about.name'), icon: "fa-circle-info", content: [
                    { data: [{ type: "about" }] },
                    { name: t('settings.about.update.name'), icon: "fa-upload", data: [
                        { name: t('settings.label.auto_check_update'), type: "switch", data: "auto_check_update" },
                        { name: t('settings.label.checkUpdate'), type: "button", data: this.checkUpdate.bind(this), icon: "fa-wrench" },
                    ] },
                    { name: t('settings.about.links.name'), icon: "fa-link", data: [
                        { name: t('settings.label.documentation'), type: "button", data: () => this.openPath({ path: "https://btjawa.top/bilitools" }), icon: "fa-book" },
                        { name: t('settings.label.feedback'), type: "button", data: () => this.openPath({ path: "https://github.com/btjawa/BiliTools/issues/new/choose" }), icon: "fa-comment-exclamation" }
                    ] },
                    { data: [{ type: "reference" }] }
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
        updateNest(key: string, data: any) {
            const parent = key.split('.')[0] as keyof typeof this.store.settings;
            let value = this.getNestedValue(this.store.settings, key);
            if (data === value) return null;
            this.$store.commit('updateState', { [`settings.${key}`]: data });
            this.updateSettings(parent, this.store.settings[parent]);
        },
        updateSettings(key: string, item: any) {
            if (key === "df_cdc" && item as number < 0) return;
            invoke('rw_config', { action: 'write', settings: { [key]: item }, secret: this.store.data.secret });
        },
        async getPath(type: PathAlias) {
            switch (type) {
                case 'log': return await path.appLogDir();
                case 'temp': return path.join(await path.tempDir(), 'com.btjawa.bilitools');
                case 'webview': return osType() === "windows" ? path.join(await path.appLocalDataDir(), 'EBWebView') : path.join(await path.cacheDir(), '..', 'WebKit', 'BiliTools', 'WebsiteData');
                case 'database': return path.join(await path.appDataDir(), 'Storage');
            }
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
        async openPath(options: { path?: string, getPath?: boolean, pathName?: PathAlias }) {
            if (!options.path) {
                if (!options?.getPath || !options.pathName) return;
                const path = await this.getPath(options.pathName);
                return shell.open(path);
            }
            return shell.open(options.path);
        },
        async getSize(pathName: PathAlias) {
            (this.store.data.cache as any)[pathName] = 0;
            const event = new Channel<number>();
            event.onmessage = (bytes) => {
                (this.store.data.cache as any)[pathName] = bytes;
            }
            await invoke('get_size', { path: await this.getPath(pathName), event });
        },
        async cleanCache(pathName: PathAlias) {
            const result = await dialog.ask(this.$t('settings.askDelete'), { 'kind': osType() === "windows" ? 'warning' : 'error' });
            if (!result) return;
            await invoke('clean_cache', { path: await this.getPath(pathName) });
            await this.getSize(pathName);
        },
        getNestedValue(obj: Record<string, any>, path: string): any {
            if (!path.includes('.')) return obj[path];
            const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
            if (value && typeof value === 'object') {
                return Array.isArray(value) ? [...value] : { ...value };
            }
            return value;
        }
    },
    async activated() {
        Object.keys(this.store.data.cache).forEach(key => this.getSize(key as PathAlias));
    },
    async mounted() {
        this.version = await getVersion();
    }
};
</script>
<style lang="scss" scoped>
$color: red;
hr {
    @apply w-full my-4;
    color: $color;
}
.page span.desc {
    @apply text-sm;
}
.setting-page__sub-tab button.active {
    @apply bg-[color:var(--button-color)];
    label {
        @apply visible;
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
            background-color: var(--dark-button-color);
            left: 25px;
        }
    }
}
</style>