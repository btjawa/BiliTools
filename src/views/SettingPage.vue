<template><div class="flex-col items-start justify-start">
    <h1>设置</h1>
    <hr />
    <div class="setting-page__sub flex w-full">
        <div
            class="setting-page__sub-page flex flex-col flex-1 max-h-[calc(100vh-160px)] mr-6"
            ref="subPage"
        >
            <section v-for="(item, index) in settings.find(item => item.id == subPage)?.content">
                <h3 v-if="item.type !== 'reference'" class="font-semibold">{{ item.name }}</h3>
                <template v-if="'desc' in item">
                    <span class="desc">{{ item.desc }}</span>
                </template>
                <div v-if="item.type === 'section'" class="units">
                    <div v-for="unit in item.data" :class=unit.type class="mt-3">
                        <h3>{{ unit.name }}</h3>
                        <span v-if="'desc' in unit" class="desc">{{ unit.desc }}</span>
                        <div v-if="unit.type === 'path'" class="h-8 mt-2">
                            <button @click="shell.open((store.settings as any)[unit.data])"
                                class="ellipsis max-w-[420px] rounded-r-none"
                            >{{ (store.settings as any)[unit.data] }}</button>
                            <button @click="updatePath(unit.data)"
                                class="bg-[color:var(--primary-color)] rounded-l-none"
                            ><i class="fa-light fa-folder-open"></i></button>
                        </div>
                        <div v-if="unit.type === 'cache'">
                            <button @click="getPath(unit.data).then(p => shell.open(p))"
                                :class="unit.data"
                                class="ellipsis max-w-[120px] min-w-24 rounded-r-none"
                            >{{ formatBytes((store.data.cache as any)[unit.data]) }}</button>
                            <button @click="getPath(unit.data).then(path =>
                                invoke('clean_cache', { path, ptype: unit.data }))"
                                class="bg-[color:var(--primary-color)] rounded-l-none"
                            ><i class="fa-light fa-broom-wide"></i></button>
                        </div>
                        <input v-if="unit.type === 'input'"
                            :type="unit.data === 'password' ? 'password' : 'text'"
                            :placeholder="'placeholder' in unit ? unit.placeholder : ''"
                            @blur="updateProxy($event, unit.data)"
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
                                shell.open((unit.action as any).url) :
                                unit.action?.type === 'checkConnection' ?
                                checkConnection() : 
                                unit.action?.type === 'checkUpdate' ? 
                                (checkUpdate as any)() : '' : ''
                            "
                            :class="unit.type"
                        >
                            {{ unit.name }}<i class="fa-solid ml-2" :class="'icon' in unit ? unit.icon : ''"></i>
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
                                    >{{ option.label }}</option>
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
                        <div v-if="unit.type === 'version'" :class="unit.type" class="my-[6px]" >
                            版本：<span
                                @click="shell.open('https://github.com/btjawa/BiliTools/releases/tag/' + version)"
                                class="text-[color:var(--primary-color)] [text-shadow:var(--primary-color)_0_0_12px] drop-shadow-md font-semibold cursor-pointer"
                            >{{ version }}</span>
                        </div>
                    </div>
                </div>
                <div v-if="item.type === 'reference'" class="desc">
                    Copyright &copy; {{(new Date()).getFullYear()}} btjawa, MIT License<br>
                    该应用产生与获取的所有数据将仅存储于用户本地<br>
                    觉得好用的话，点个Star吧！ご利用感謝いたします~
                </div>
                <hr v-if="index < (settings.find(item => item.id == subPage)?.content.length! - 1)" />
            </section>
        </div>
        <div class="setting-page__sub-tab flex flex-col items-start gap-1">
            <button v-for="item in settings" @click="subPage = item.id" :class="subPage !== item.id || 'active'"
                class="p-[8px_0] w-60 flex items-center justify-end bg-[color:unset] gap-3 hover:bg-[#33333380]"
            >
                <span class="text-base">{{ item.name }}</span>
                <i :class="'fa-light ' + item.icon"
                    class="min-w-4 ml-2"
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
import * as path from '@tauri-apps/api/path';
import * as dialog from '@tauri-apps/plugin-dialog';
import * as shell from '@tauri-apps/plugin-shell';
import { type as osType } from '@tauri-apps/plugin-os';
import { fetch } from '@tauri-apps/plugin-http';

export default {
    data() {
        return {
            subPage: "storage",
            settings: [
                { id: "storage", name: "存储", icon: "fa-database", content: [
                    { name: "保存路径", type: "section", data: [
                        { name: "下载文件", type: "path", data: "down_dir" },
                        { name: "未处理完成的文件", type: "path", desc: "下载文件时，首先下载至此文件夹，随后经过处理转移至输出文件夹", data: "temp_dir" },
                    ] },
                    { name: "缓存", type: "section", desc: "用户数据库存有登录信息、下载记录等数据，切勿随意删除", data: [
                        { name: "日志", type: "cache", data: "log" },
                        { name: "临时文件", type: "cache", data: "temp" },
                        { name: "WebView", type: "cache", data: "webview" },
                        { name: "用户数据库", type: "cache", data: "database" },
                    ] },
                ] },
                { id: "download", name: "下载", icon: "fa-download", content: [
                    { name: "默认参数", type: "section", desc: "若某资源无此选择的参数，将会使用资源最高可用参数", data: [
                        { name: "分辨率/画质", type: "dropdown", data: "df_dms", drop: "dms" },
                        { name: "比特率/音质", type: "dropdown", data: "df_ads", drop: "ads" },
                        { name: "编码格式", type: "dropdown", data: "df_cdc", drop: "cdc" },
                        { name: "下载并发数", type: "dropdown", data: "max_conc", drop: [
                                { id: 1, name: "1个" },
                                { id: 2, name: "2个" },
                                { id: 3, name: "3个" },
                                { id: 4, name: "4个" },
                                { id: 5, name: "5个" },
                        ] },
                    ] },
                    { name: "网络代理", type: "section", desc: "暂仅支持 HTTP(S) 协议，修改完成后建议重启应用以全局生效", data: [
                        { name: "地址", type: "input", data: "addr", placeholder: "http(s)://server:port" },
                        { name: "用户名", type: "input", data: "username", placeholder: "可选" },
                        { name: "密码", type: "input", data: "password", placeholder: "可选" },
                        { name: "检查代理连通性", type: "button", data: "function", action: { type: "checkConnection" }, icon: "fa-cloud-question" },
                    ] }
                ] },
                { id: "about", name: "关于", icon: "fa-circle-info", content: [
                    { name: null, type: "section", data: [
                        { name: null, type: "icon", data: '' },
                        { name: null, type: "version", data: '' }
                    ] },
                    { name: "更新", type: "section", data: [
                        { name: "自动检查", type: "switch", data: "auto_check_update" },
                        { name: "检查更新", type: "button", data: "function", action: { type: "checkUpdate" }, icon: "fa-wrench" },
                    ] },
                    { name: "相关链接", type: "section", data: [
                        { name: "文档", type: "button", data: "function", action: { type: "url", url: "https://btjawa.top/bilitools" }, icon: "fa-book" },
                        { name: "反馈", type: "button", data: "function", action: { type: "url", url: "https://github.com/btjawa/BiliTools/issues/new/choose"}, icon: "fa-comment-exclamation" }
                    ] },
                    { type: "reference" }
                ] }
            ],
            store: this.$store.state,
            version: '',
            abortGetSize: false,
            shell
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
        }
    },
    methods: {
        invoke,
        formatBytes,
        openURL(url: string) {
            shell.open(url);
        },
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
                (new ApplicationError(err)).handleError();
            })
        },
        updateProxy(event: Event, key: keyof typeof this.store.settings.proxy) {
            const data = (event.target as HTMLInputElement).value;
            if (data === this.store.settings.proxy[key]) return null;
            this.store.settings.proxy[key] = data;
            this.updateSettings('proxy', this.store.settings.proxy);
        },
        updateSettings(key: string, item: any) {
            invoke('rw_config', { action: 'write', settings: { [key]: item }, secret: this.store.data.secret });
        },
        async getPath(type: string) {
            const workiingDir = await path.appDataDir();
            if (type === 'log') {
                return await path.appLogDir();
            } else if (type === 'temp') {
                return path.join(await path.tempDir(), 'com.btjawa.bilitools');
                // return await path.tempDir();
            } else if (type === 'webview') {
                return osType() === "windows" ? path.join(workiingDir, 'EBWebView') : path.join(await path.cacheDir(), '..', 'WebKit', 'BiliTools', 'WebsiteData');
            } else if (type === 'database') {
                return path.join(workiingDir, 'Storage');
            } else return '';
        },
        async checkConnection() {
            try {
                const response = await fetch('https://api.bilibili.com/x/click-interface/click/now', {
                    headers: this.store.data.headers,
                    ...(this.store.settings.proxy.addr && {
                        proxy: { all: formatProxyUrl(this.store.settings.proxy) }
                    })
                });
                const body = await response.json();
                const timestamp = JSON.stringify(body?.data);
                if (timestamp) {
                    iziInfo("通过测试：" + timestamp);
                    return timestamp;
                } else {
                    throw new ApplicationError(new Error('测试失败：\n' + body?.message), { code: body?.code });
                }
            } catch(err) {
                err instanceof ApplicationError ? err.handleError() :
                (new ApplicationError(new Error('测试失败：\n' + err as string), { code: -101 })).handleError();
            }
        }
    },
    async activated() {
        Object.entries(this.store.data.cache).forEach(async type => {
            (this.store.data.cache as any)[type[0]] = 0;
            const event = new Channel<number>();
            event.onmessage = (bytes) => {
                (this.store.data.cache as any)[type[0]] = bytes;
            }
            invoke('get_size', { path: await this.getPath(type[0]), event });
        });
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
    @apply text-xs;
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