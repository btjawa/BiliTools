<template><div class="flex-col">
    <h1 class="self-start">
        <i class="fa-gear mr-2" :class="settings.dynFa"></i>
        {{ $t('settings.title') }}
        <i @click="openUrl('https://www.btjawa.top/bilitools#设置')"
            class="question fa-light fa-circle-question text-xl"
        ></i>
    </h1>
    <hr />
    <div class="setting-page__sub flex w-full h-full">
        <div class="flex flex-col flex-1 mr-6" ref="$subPage">
            <Empty v-if="settingsTree.find(item => item.id == subPage)?.content?.length === 0" text="common.wip" />
            <section v-for="(item, index) in settingsTree.find(item => item.id == subPage)?.content">
                <h3 v-if="item.id" class="font-semibold">
                    <i class="mr-1" :class="[settings.dynFa, item.icon]"></i>
                    {{ $t(`settings.${subPage}.${item.id}.name`) }}
                </h3>
                <span v-if="item.desc" class="desc">{{ $t(`settings.${subPage}.${item.id}.desc`) }}</span>
                <div v-for="unit in item.data" :class=unit.type class="mt-3">
                    <h3 v-if="unit.name || unit.id">{{ unit.name ?? $t(`settings.label.${unit.id}`) }}</h3>
                    <span v-if="unit.desc" class="desc">{{ unit.desc }}</span>
                    <Path v-if="unit.type === 'path'" class="h-8 mt-2"
                        :data="unit.data" :update="updatePath" :open="openPath"
                    />
                    <Cache v-if="unit.type === 'cache'"
                        :data="unit.data" :update="cleanCache" :open="(v) => getPath(v).then(v => openPath(v))"
                    />
                    <Dropdown v-if="unit.type === 'dropdown'"
                        :drop="getDropdown(unit.drop)"
                        :id="settings.value(unit.data)"
                        :emit="(v) => bind(unit.data).value = v"
                    />
                    <Format v-if="unit.type === 'format'" />
                    <input v-if="unit.type === 'input'"
                        type="text" spellcheck="false"
                        :value="bind(unit.data).value" :placeholder="unit.placeholder"
                        @blur="(e) => bind(unit.data).value = (e.target as HTMLInputElement).value"
                    />
                    <button v-if="unit.type === 'switch'"
                        @click="bind(unit.data).value = !bind(unit.data).value"
                        :class="{ 'active': bind(unit.data).value }"
                        class="inline-block w-11 h-[22px] relative delay-100 p-[3px] rounded-xl"
                    >
                        <div class="circle h-4 w-4 rounded-lg bg-[color:var(--desc-color)] absolute left-[3px] top-[3px]"></div>
                    </button>
                    <button v-if="unit.type === 'button'" @click="unit.data()">
                        <span>{{ $t(`settings.label.${unit.id}`) }}</span>
                        <i :class="[settings.dynFa, unit.icon]"></i>
                    </button>
                    <div v-if="unit.type === 'about'">
                        <div class="mb-4">
                            <img class="h-16 mr-6 w-auto inline" src="@/assets/img/icon.svg" draggable="false" />
                            <img class="h-10 w-auto inline" src="@/assets/img/icon-big.svg" draggable="false" />
                        </div>
                        {{ $t('common.version') }}: <span @click="openUrl('https://github.com/btjawa/BiliTools/releases/tag/v' + app.version)"
                            class="mx-2 text-[color:var(--primary-color)] [text-shadow:var(--primary-color)_0_0_12px] drop-shadow-md font-semibold cursor-pointer"
                        >{{ app.version }}</span>
                        <span class="text desc ml-2">
                            <i :class="settings.dynFa" class="fa-code-commit"></i>
                            {{ app.hash.slice(0, 7) }}
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
                <span class="text-base">{{ $t(`settings.${item.id}.name`) }}</span>
                <i :class="['fa-light', 'min-w-4', item.icon]"></i>
                <label class="w-[3px] rounded-md h-4 bg-[color:var(--primary-color)] invisible"></label>
            </button>
        </div>
    </div>
</div></template>
<script setup lang="ts">
import { computed, inject, nextTick, onActivated, ref, watch } from 'vue';
import { ApplicationError, AppLog, tryFetch } from '@/services/utils';
import { Path, Cache, Format } from '@/components/SettingPage';
import { openPath, openUrl } from '@tauri-apps/plugin-opener';
import { useSettingsStore, useAppStore } from '@/store';
import { type as osType } from '@tauri-apps/plugin-os';
import { Channel } from '@tauri-apps/api/core';
import { commands } from '@/services/backend';
import { QualityMap } from '@/types/data.d';
import { TYPE } from 'vue-toastification';
import i18n, { locales } from '@/i18n';
import { Empty } from '@/components';
import * as dialog from '@tauri-apps/plugin-dialog';
import * as path from '@tauri-apps/api/path';
import Dropdown from '@/components/Dropdown.vue';

type PathAlias = keyof typeof app.cache;

const subPage = ref("storage");
const $subPage = ref<HTMLElement>();
const settings = useSettingsStore();
const app = useAppStore();

const checkUpdate = inject<Function>('checkUpdate');

const bind = (key: string) => computed({
    get() { return settings.value(key) },
    set(v) { settings.updateNest(key, v) }
});

const settingsTree = computed<any[]>(() => {
    const t = i18n.global.t;
    return [
        { id: "storage", icon: "fa-database", content: [
            { id: 'paths', icon: "fa-folder", data: [
                { id: 'down_dir', type: "path", data: "down_dir" },
                { id: 'temp_dir', type: "path", desc: t('settings.storage.paths.temp_dir'), data: "temp_dir" },
            ] },
            { id: 'cache', icon: "fa-database", desc: true, data: [
                { id: 'log', type: "cache", data: "log" },
                { id: 'temp', type: "cache", data: "temp" },
                { id: 'webview', type: "cache", data: "webview" },
                { id: 'database', type: "cache", data: "database" },
            ] },
            { id: 'language', icon: "fa-earth-americas", data: [
                { name: t('settings.storage.language.name'), type: "dropdown", data: "language", drop: locales }
            ] },
        ] },
        { id: "download", icon: "fa-download", content: [
            { id: 'default', icon: "fa-user", desc: true, data: [
                { name: t('common.default.placeholders.dms'), type: "dropdown", data: "df_dms", drop: "dms" },
                { name: t('common.default.placeholders.ads'), type: "dropdown", data: "df_ads", drop: "ads" },
                { name: t('common.default.placeholders.cdc'), type: "dropdown", data: "df_cdc", drop: "cdc" },
                { name: t('settings.label.max_conc'), type: "dropdown", data: "max_conc", drop: [
                    { id: 1, name: "1" },
                    { id: 2, name: "2" },
                    { id: 3, name: "3" },
                    { id: 4, name: "4" },
                    { id: 5, name: "5" },
                ] },
            ] },
            { id: 'proxy', icon: "fa-globe", desc: true, data: [
                { name: t('common.address'), type: "input", data: "proxy.addr", placeholder: "http(s)://server:port" },
                { name: t('common.username'), type: "input", data: "proxy.username", placeholder: t('common.optional') },
                { name: t('common.password'), type: "input", data: "proxy.password", placeholder: t('common.optional') },
                { id: 'checkProxy', type: "button", data: checkProxy, icon: "fa-cloud-question" },
            ] },
            { id: 'auto_download', icon: "fa-download", desc: true, data: [
                { id: 'enable', type: "switch", data: "auto_download" },
            ] },
        ] },
        { id: "advanced", icon: "fa-flask", content: [
            { id: 'prefer_pb_danmaku', icon: "fa-exchange", desc: true, data: [
                { id: 'enable', type: "switch", data: "advanced.prefer_pb_danmaku" },
            ] },
            { id: 'add_metadata', icon: "fa-memo-circle-info", desc: true, data: [
                { id: 'enable', type: "switch", data: "advanced.add_metadata" },
            ] },
            { id: 'format', icon: "fa-file", desc: true, data: [{ type: "format" }] },
        ] },
        { id: "about", icon: "fa-circle-info", content: [
            { data: [{ type: "about" }] },
            { id: 'update', icon: "fa-upload", data: [
                { id: 'auto_check_update', type: "switch", data: "auto_check_update" },
                { id: 'checkUpdate', type: "button", data: checkUpdate, icon: "fa-wrench" },
            ] },
            { id: 'links', icon: "fa-link", data: [
                { id: 'documentation', type: "button", data: () => openUrl("https://btjawa.top/bilitools"), icon: "fa-book" },
                { id: 'feedback', type: "button", data: () => openUrl("https://github.com/btjawa/BiliTools/issues/new/choose"), icon: "fa-comment-exclamation" }
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

function getDropdown(drop: keyof typeof QualityMap | { id: number, name: string }[]) {
    if (Array.isArray(drop)) return drop;
    else return QualityMap[drop].map(v => ({ id: v.id, name: i18n.global.t(`common.default.${drop}.${v.id}`) }))
}

async function getPath(type: PathAlias) {
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
    }
}

async function getSize(pathName: PathAlias) {
    (app.cache as any)[pathName] = 0;
    const event = new Channel<number>();
    event.onmessage = (bytes) => {
        (app.cache as any)[pathName] = bytes;
    }
    const result = await commands.getSize(await getPath(pathName), event);
    if (result.status === 'error') throw result.error;
}

async function checkProxy() {
    try {
        const body = await tryFetch('https://api.bilibili.com/x/report/click/now');
        if (body?.data?.now) {
            return AppLog(`/x/report/click/now: ${body.data.now}`, TYPE.SUCCESS);
        } else {
            throw new ApplicationError(body?.message, { code: body?.code });
        }
    } catch(err) {
        new ApplicationError(err).handleError();
    }
}

async function updatePath(type: string) {
    const path = await dialog.open({
        directory: true,
        defaultPath: settings.value(type)
    });
    if (path) bind(type).value = path;
}

async function cleanCache(pathName: PathAlias) {
    const result = await dialog.ask(i18n.global.t('settings.askDelete'), { 'kind': 'warning' });
    if (!result) return;
    const clean = await commands.cleanCache(await getPath(pathName));
    if (clean.status === 'error') throw new ApplicationError(clean.error);
    await getSize(pathName);
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
    @apply text-sm whitespace-pre-wrap;
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