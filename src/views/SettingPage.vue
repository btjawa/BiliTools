<template><div>
    <h1>设置</h1>
    <hr />
    <div class="setting-page__sub">
        <div class="setting-page__sub-page" ref="subPage">
            <section v-for="(item, index) in settings.find(item => item.id == subPage)?.content">
                <h3>{{ item.name }}</h3>
                <template v-if="'desc' in item">
                    <span class="desc">{{ item.desc }}</span>
                </template>
                <div v-if="item.type === 'section'" class="units">
                    <div v-for="unit in item.data" :class=unit.type>
                        <span>{{ unit.name }}</span>
                        <template v-if="'desc' in unit">
                            <span class="desc">{{ unit.desc }}</span>
                        </template>
                        <template v-if="unit.type === 'path'">
                        <div>
                            <button @click="shell.open((store.settings as any)[unit.data])" class="ellipsis">{{ (store.settings as any)[unit.data] }}</button>
                            <button @click="updatePath(unit.data)"><i class="fa-light fa-folder-open"></i></button>
                        </div>
                        </template>
                        <template v-if="unit.type === 'cache'">
                        <div>
                            <button @click="getPath(unit.data).then(p => shell.open(p))" :class="unit.data">{{ formatBytes((store.data.cache as any)[unit.data]) }}</button>
                            <button @click="getPath(unit.data).then(path => invoke('clean_cache', { path, ptype: unit.data }))"><i class="fa-light fa-broom-wide"></i></button>
                        </div>
                        </template>
                        <template v-if="unit.type === 'dropdown'">
                            <select :name="unit.data" :id="unit.data" v-if="'drop' in unit" @change="updateDrop">
                                <template v-if="typeof unit.drop === 'string'">
                                    <option v-for="option in (store.data.mediaMap as any)[unit.drop]" :value="JSON.stringify({ id: option.id, data: unit.data })">
                                        {{ option.label }}
                                    </option>
                                </template>
                                <template v-else>
                                    <option v-for="option in unit.drop" :value="JSON.stringify({ id: option.id, data: unit.data })">
                                        {{ option.name }}
                                    </option>
                                </template>
                            </select>
                            <svg class="dropdown-arrow" viewBox="0 0 13.4 8.1" >
                                <path d="M6.8 8.1L0 1.75 1.36.3l5.38 5L11.97 0l1.42 1.4-6.6 6.7z" fill="var(--primary-color)"></path>
                            </svg>
                        </template>
                    </div>
                </div>
                <hr v-if="index < (settings.find(item => item.id == subPage)?.content.length! - 1)" />
            </section>
        </div>
        <div class="setting-page__sub-tab">
            <div v-for="item in settings" @click="subPage = item.id" :class="subPage !== item.id || 'active'">
                <span>{{ item.name }}</span>
                <i :class="'fa-light ' + item.icon"></i>
                <label></label>
            </div>
        </div>
    </div>
</div></template>
<script lang="ts">
import { ApplicationError, formatBytes } from '@/services/utils';
import { invoke } from '@tauri-apps/api/core';
import * as path from '@tauri-apps/api/path';
import store from '@/store';
import * as dialog from '@tauri-apps/plugin-dialog';
import * as shell from '@tauri-apps/plugin-shell';
import { type as osType } from '@tauri-apps/plugin-os';
import { listen } from '@tauri-apps/api/event';

export default {
    data() {
        return {
            subPage: "storage",
            settings: [
                { id: "storage", name: "存储", icon: "fa-database", content: [
                    { name: "保存路径", type: "section", data: [
                        { name: "文件下载", type: "path", data: "down_dir" },
                        { name: "未处理完成的文件", type: "path", desc: "下载文件时，首先下载至此文件夹，随后经过处理转移至输出文件夹", data: "temp_dir" },
                    ] },
                    { name: "缓存", type: "section", data: [
                        { name: "日志", type: "cache", data: "log" },
                        { name: "临时文件", type: "cache", data: "temp" },
                        { name: "WebView", type: "cache", data: "webview" },
                        { name: "用户数据库", type: "cache", data: "database" },
                    ] },
                ] },
                { id: "download", name: "下载", icon: "fa-download", content: [
                    { name: "默认参数", type: "section", desc: "若某资源无此选择的参数，默认将会使用资源最高可用参数。", data: [
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
                ] },
                // { id: "advanced", name: "高级", icon: "fa-flask", content: [/* WIP */] },
            ],
            store: store.state,
            shell,
            invoke,
            formatBytes,
            abortGetSize: false,
        }
    },
    computed: {
        
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
        updatePath(type: string) {
            dialog.open({
                directory: true,
                defaultPath: (this.store.settings as any)[type]
            }).then(path => {
                if (!path) return null;
                invoke('rw_config', { action: 'write', settings: { [type]: path }, secret: this.store.data.secret });
                (this.store.settings as any)[type] = path;
            }).catch(err => {
                (new ApplicationError(err)).handleError();
            })
        },
        updateDrop(event: Event) {
            const target = event.target as HTMLSelectElement;
            const value = JSON.parse(target.value);
            invoke('rw_config', { action: 'write', settings: { [value.data]: value.id }, secret: this.store.data.secret });
        },
        async getPath(type: string) {
            const workiingDir = await path.join(await path.localDataDir(), 'com.btjawa.bilitools');
            if (type === 'log') {
                return await path.appLogDir();
            } else if (type === 'temp') {
                return path.join(await path.tempDir(), 'com.btjawa.bilitools');
            } else if (type === 'webview') {
                return osType() === "windows" ? path.join(workiingDir, 'EBWebView') : path.join(await path.cacheDir(), '..', 'WebKit', 'BiliTools', 'WebsiteData');
            } else if (type === 'database') {
                return path.join(workiingDir, 'Storage');
            } else return '';
        },
    },
    async activated() {
        Object.entries(this.store.data.cache).forEach(async type => {
            (this.store.data.cache as any)[type[0]] = 0;
            invoke('get_size', { path: await this.getPath(type[0]), ptype: type[0] });
        })
        listen('get_size:bytes', e => {
            const payload = e.payload as any;
            (this.store.data.cache as any)[payload.ptype] = payload.bytes;
        })
    },
    deactivated() {
        this.abortGetSize = true;
    }
};
</script>
<style scoped lang="scss">
.page {
	flex-direction: column;
	align-items: flex-start;
	justify-content: flex-start;
	& > span {
		&:not(.desc) {
			margin: 16px 2px 2px;
		}
		&.desc {
			font-size: 12px;
		}
	}
}
hr {
    width: 100%;
    margin: 16px 0;
    height: 1px;
}
.setting-page__sub {
    display: flex;
    width: 100%;
}
.setting-page__sub-tab {
    display: flex;
    flex-direction: column;
    align-self: flex-start;
    gap: 4px;
    div {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding: 8px 0;
        width: 240px;
        transition: background-color .1s;
        border-radius: 5px;
        gap: 12px;
        i {
            margin-left: 8px;
        }
        span {
            font-size: 16px;
        }
        label {
            width: 3px;
            border-radius: 6px;
            height: 16px;
            background-color: var(--primary-color);
            visibility: hidden;
        }
        &.active label {
            visibility: visible;
            animation: slide 0.2s cubic-bezier(0,1,1,1);
        }
        &:hover, &.active {
            background-color: #33333380;
        }
    }
}
.setting-page__sub-page {
    display: flex;
    flex-direction: column;
    flex: 1;
    hr {
        width: 200px;
    }
    section {
        .units {
            margin-bottom: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            div.path, div.cache {
                & > div {
                    height: 32px;
                    button {
                        max-width: 420px;
                        border-radius: 8px 0 0 8px;
                        min-height: 32px;
                        &:has(i) {
                            background-color: var(--primary-color);
                            border-radius: 0 8px 8px 0;
                            i {
                                font-size: 15px;
                                padding: 8px;
                            }
                        }
                        &:not(:has(i)) {
                            font-size: 14px;
                            padding: 6px 10px;
                        }
                        &:hover {
                            filter: brightness(85%);
                        }
                    }
                }
            }
            .path, .dropdown {
                span {
                    display: block;
                    margin-bottom: 12px;
                }
            }
            .cache, .dropdown {
                span {
                    display: inline-block;
                    width: 140px;
                }
                button:not(:has(i)) {
                    min-width: 90px;
                }
                & > div {
                    display: inline-block;
                }
            }
        }
    }
}
@keyframes slide {
    0% {
        height: 8px;
        opacity: 0;
    }
    100% {
        height: 16px;
        opacity: 1;
    }
}
select {
    transition: filter 0.1s;
    appearance: none;
    border: none;
    outline: none;
    padding: 6px 10px;
    border-radius: 8px;
    background-color: var(--block-color);
    font-size: 14px;
    color: var(--content-color);
    min-height: 32px;
    position: relative;
    min-width: 152px;
    & + .dropdown-arrow {
        width: 12px;
        transform: translateX(-24px);
    }
    &:hover {
        filter: brightness(85%);
        cursor: pointer;
    }
}
</style>