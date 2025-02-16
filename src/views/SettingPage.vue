<template><div class="flex-col">
    <h1 class="self-start">
        <i class="fa-gear mr-2" :class="settings.dynFa"></i>
        {{ $t('settings.title') }}
        <i @click="openPath({ path: 'https://www.btjawa.top/bilitools#设置' })"
            class="question fa-light fa-circle-question text-xl"
        ></i>
    </h1>
    <hr />
    <div class="setting-page__sub flex w-full h-full">
        <div class="flex flex-col flex-1 mr-6" ref="$subPage">
            <Empty :exp="settingsTree.find(item => item.id == subPage)?.content?.length === 0" text="common.wip" />
            <section v-for="(item, index) in settingsTree.find(item => item.id == subPage)?.content">
                <h3 v-if="item.name" class="font-semibold">
                    <i class="mr-1" :class="[settings.dynFa, item.icon]"></i>
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
                    <Drag v-if="unit.type === 'drag'"
                        :data="unit.data" :placeholders="unit.placeholders"
                        :update="updateNest" :shorten="unit.shorten"
                    />
                    <input v-if="unit.type === 'input'"
                        :type="unit.data === 'password' ? 'password' : 'text'"
                        :placeholder="unit.placeholder"
                        @blur="(e) => updateNest(unit.data, (e.target as HTMLInputElement).value)"
                        autocorrect="off" spellcheck="false" autocapitalize="off"
                    />
                    <button v-if="unit.type === 'switch'"
                        @click="updateNest(unit.data, !getNestedValue(settings.$state, unit.data))"
                        :class="{ 'active': getNestedValue(settings.$state, unit.data) }"
                        class="inline-block w-11 h-[22px] relative delay-100 p-[3px] rounded-xl"
                    >
                        <div class="circle h-4 w-4 rounded-lg bg-[color:var(--desc-color)] absolute left-[3px] top-[3px]"></div>
                    </button>
                    <button v-if="unit.type === 'button'" @click="unit.data()">
                        <span>{{ unit.name }}</span>
                        <i :class="[settings.dynFa, unit.icon]"></i>
                    </button>
                    <div v-if="unit.type === 'about'">
                        <div class="mb-4">
                            <img class="h-16 mr-6 w-auto inline" src="@/assets/img/icon.svg" draggable="false" />
                            <img class="h-10 w-auto inline" src="@/assets/img/icon-big.svg" draggable="false" />
                        </div>
                        {{ $t('common.version') }}: <span @click="openPath({ path: 'https://github.com/btjawa/BiliTools/releases/tag/v' + infoStore.version })"
                            class="mx-2 text-[color:var(--primary-color)] [text-shadow:var(--primary-color)_0_0_12px] drop-shadow-md font-semibold cursor-pointer"
                        >{{ infoStore.version }}</span>
                        <span class="text desc ml-2">
                            <i :class="settings.dynFa" class="fa-code-commit"></i>
                            {{ infoStore.hash.slice(0, 7) }}
                        </span>
                    </div>
                    <div v-if="unit.type === 'reference'" class="desc">
                        Copyright &copy; {{(new Date()).getFullYear()}} btjawa, GPL-3.0-or-later License<br>
                        {{ $t('common.exempt') }}<br>
                        {{ $t('settings.about.thanks') }}
                    </div>
                </div>
                <hr v-if="index < (settingsTree.find(item => item.id == subPage)?.content.length! - 1)" />
            </section>
        </div>
        <div class="setting-page__sub-tab flex flex-col items-start gap-1">
            <button v-for="item in settingsTree" @click="subPage = item.id" :class="subPage !== item.id || 'active'"
                class="pr-0 w-60 flex items-center justify-end bg-[color:unset] gap-3 hover:bg-[color:var(--button-color)]"
            >
                <span class="text-base">{{ item.name }}</span>
                <i :class="['fa-light', 'min-w-4', item.icon]"></i>
                <label class="w-[3px] rounded-md h-4 bg-[color:var(--primary-color)] invisible"></label>
            </button>
        </div>
    </div>
</div></template>
<script setup lang="ts">
import { computed, nextTick, onActivated, ref, watch } from 'vue';
import { ApplicationError, iziInfo, tryFetch } from '@/services/utils';
import { Channel } from '@tauri-apps/api/core';
import { type as osType } from '@tauri-apps/plugin-os';
import { Path, Cache, Dropdown, Drag } from '@/components/SettingPage';
import { useSettingsStore, useAppStore, useInfoStore } from '@/store';
import { Empty } from '@/components';
import { commands } from '@/services/backend';
import locales from '@/locales/index.json';
import * as path from '@tauri-apps/api/path';
import * as dialog from '@tauri-apps/plugin-dialog';
import * as shell from '@tauri-apps/plugin-shell';
import i18n from '@/i18n';

type PathAlias = keyof typeof app.cache;

type UnitType =
| { name: string; type: 'path'; data: keyof typeof settings.$state; }
| { name: string; type: 'switch'; data: keyof typeof settings.$state; }
| { name: string; type: 'cache'; data: PathAlias; }
| { name: string; type: 'dropdown'; data: keyof typeof settings.$state; drop: keyof typeof infoStore.mediaMap; }
| { name: string; type: 'button'; data: Function; icon: string; }
| { name: string; type: 'input'; data: string; placeholder: string; }
| { name: string; type: 'drag'; data: string; shorten: string; placeholders: Array<{ id: number | string, name: string | number }>; }
| { name: string; type: 'about' }
| { name: string; type: 'reference' };

const subPage = ref("storage");
const $subPage = ref<HTMLElement>();
const settings = useSettingsStore();
const infoStore = useInfoStore();
const app = useAppStore();

const settingsTree = computed(() => {
    const t = i18n.global.t;
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
            { name: t('settings.download.filename.name'), icon: "fa-file", data: [
                { name: String(), type: "drag", data: 'filename', shorten: t('settings.download.filename.shorten'), placeholders: [
                    { id: "{mediaType}", name: t('settings.download.filename.data.mediaType') },
                    { id: "{aid}", name: t('settings.download.filename.data.aid') },
                    { id: "{title}", name: t('settings.download.filename.data.title') },
                    { id: "{date}", name: t('settings.download.filename.data.date') },
                    { id: "{timestamp}", name: t('settings.download.filename.data.timestamp') },
                ] },
            ] },
            { name: t('settings.download.proxy.name'), icon: "fa-globe", desc: t('settings.download.proxy.desc'), data: [
                { name: t('common.address'), type: "input", data: "proxy.addr", placeholder: "http(s)://server:port" },
                { name: t('common.username'), type: "input", data: "proxy.username", placeholder: t('common.optional') },
                { name: t('common.password'), type: "input", data: "proxy.password", placeholder: t('common.optional') },
                { name: t('settings.label.checkProxy'), type: "button", data: checkProxy.bind(this), icon: "fa-cloud-question" },
            ] }
        ] },
        { id: "advanced", name: t('settings.advanced.name'), icon: "fa-flask", content: [
            { name: t('settings.advanced.auto_convert_flac.name'), icon: "fa-exchange", desc: t('settings.advanced.auto_convert_flac.desc'), data: [
                { name: t('settings.label.enable'), type: "switch", data: "advanced.auto_convert_flac" },
            ] },
            { name: t('settings.advanced.prefer_pb_danmaku.name'), icon: "fa-exchange", desc: t('settings.advanced.prefer_pb_danmaku.desc'), data: [
                { name: t('settings.label.enable'), type: "switch", data: "advanced.prefer_pb_danmaku" },
            ] },
            { name: t('settings.advanced.inspect_manga.name'), icon: "fa-image", desc: t('settings.advanced.inspect_manga.desc'), data: [
                { name: t('settings.label.enable'), type: "switch", data: "advanced.inspect_manga" },
            ] },
            { name: t('settings.advanced.config.name'), icon: "fa-wrench", desc: t('settings.advanced.config.desc'), data: [
                { name: t('home.label.danmaku'), type: "button", data: () => openPath({ getPath: true, pathName: "danmaku" }), icon: "fa-file-circle-info" },
                { name: "Aria2c", type: "button", data: () => openPath({ getPath: true, pathName: "aria2c" }), icon: "fa-file-circle-info" },
            ] },
        ] },
        { id: "about", name: t('settings.about.name'), icon: "fa-circle-info", content: [
            { data: [{ type: "about" }] },
            { name: t('settings.about.update.name'), icon: "fa-upload", data: [
                { name: t('settings.label.auto_check_update'), type: "switch", data: "auto_check_update" },
                { name: t('settings.label.checkUpdate'), type: "button", data: checkUpdate.bind(this), icon: "fa-wrench" },
            ] },
            { name: t('settings.about.links.name'), icon: "fa-link", data: [
                { name: t('settings.label.documentation'), type: "button", data: () => openPath({ path: "https://btjawa.top/bilitools" }), icon: "fa-book" },
                { name: t('settings.label.feedback'), type: "button", data: () => openPath({ path: "https://github.com/btjawa/BiliTools/issues/new/choose" }), icon: "fa-comment-exclamation" }
            ] },
            { data: [{ type: "reference" }] }
        ] }
    ];
});

watch(subPage, (oldPage, newPage) => {
    if (oldPage !== newPage) {
        if (!$subPage.value) return;
        $subPage.value.style.transition = 'none';
        $subPage.value.style.opacity = '0';
        nextTick(() => requestAnimationFrame(() => {
            if (!$subPage.value) return;
            $subPage.value.style.transition = 'opacity 0.3s';
            $subPage.value.style.opacity = '1';
        }));
    }
})

onActivated(() => Object.keys(app.cache).forEach(key => getSize(key as PathAlias)));

function checkUpdate() {
    const status = settings.auto_check_update;
    updateSettings('auto_check_update', !status);
    updateSettings('auto_check_update', status);
}

function updatePath(type: string) {
    dialog.open({
        directory: true,
        defaultPath: (settings.$state as any)[type]
    }).then(path => {
        if (!path) return null;
        updateSettings(type, path);
    }).catch(err => {
        new ApplicationError(err).handleError();
    })
}

function updateNest(key: string, data: any) {
    const parent = key.split('.')[0] as keyof typeof settings.$state;
    let value = getNestedValue(settings.$state, key);
    if (data === value) return null;
    settings.updateNest(key, data);
    updateSettings(parent, settings.$state[parent]);
}

async function updateSettings(key: string, item: any) {
    const result = await commands.rwConfig('write', { [key]: item }, infoStore.secret);
    if (result.status === 'error') throw new ApplicationError(result.error);
}

async function getPath(type: PathAlias | "danmaku" | "aria2c") {
    switch (type) {
        case 'log': return await path.appLogDir();
        case 'temp': return path.join(await path.tempDir(), 'com.btjawa.bilitools');
        case 'webview': return (async () => {
            switch(osType()) {
                case 'windows': return path.join(await path.appLocalDataDir(), 'EBWebView');
                case 'macos': return path.join(await path.cacheDir(), '..', 'WebKit', 'BiliTools', 'WebsiteData');
                case 'linux': return path.join(await path.cacheDir(), 'bilitools');
                default: return '';
            }
        })()
        case 'database': return path.join(await path.appDataDir(), 'Storage');
        case 'danmaku': return path.join(infoStore.resources_path, 'DanmakuFactoryConfig.json');
        case 'aria2c': return path.join(infoStore.resources_path, 'aria2.conf');
    }
}

async function checkProxy() {
    try {
        const body = await tryFetch('https://api.bilibili.com/x/click-interface/click/now');
        const timestamp = JSON.stringify(body?.data);
        if (timestamp) {
            iziInfo(i18n.global.t('common.iziToast.success') + ': ' + timestamp);
            return timestamp;
        } else {
            throw new ApplicationError(body?.message, { code: body?.code });
        }
    } catch(err) {
        err instanceof ApplicationError ? err.handleError() :
        new ApplicationError(err as string).handleError();
    }
}
async function openPath(options: { path?: string, getPath?: boolean, pathName?: PathAlias | "danmaku" | "aria2c" }) {
    if (!options.path) {
        if (!options?.getPath || !options.pathName) return;
        const path = await getPath(options.pathName);
        return shell.open(path);
    }
    return shell.open(options.path);
}
async function getSize(pathName: PathAlias) {
    (app.cache as any)[pathName] = 0;
    const event = new Channel<number>();
    event.onmessage = (bytes) => {
        (app.cache as any)[pathName] = bytes;
    }
    const result = await commands.getSize(await getPath(pathName), event);
    if (result.status === 'error') throw new ApplicationError(result.error);
}
async function cleanCache(pathName: PathAlias) {
    const result = await dialog.ask(i18n.global.t('settings.askDelete'), { 'kind': 'warning' });
    if (!result) return;
    const clean = await commands.cleanCache(await getPath(pathName));
    if (clean.status === 'error') throw new ApplicationError(clean.error);
    await getSize(pathName);
}
function getNestedValue(obj: Record<string, any>, path: string): any {
    if (!path.includes('.')) return obj[path];
    const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
    if (value && typeof value === 'object') {
        return Array.isArray(value) ? [...value] : { ...value };
    }
    return value;
}
</script>
<style lang="scss" scoped>
.ghost {
  opacity: 0.5;
  background: #c8ebfb;
}
hr {
    @apply w-full my-4;
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