<template>
<div class="setting-page">
    <h1>设置&ensp;<i class="dis-placeholder">WIP</i></h1>
    <div class="setting-page__info">
        <div>
            <img src="@/assets/img/icon.png" draggable="false" />
            <img src="@/assets/img/icon-big.svg" draggable="false" ref="iconBigSvg" class="icon-big-svg" />
        </div>
        <span>Version {{ version }}</span>
    </div>
    <span>存储管理</span>
    <div class="setting-page__option">
        <section>
            <span>将下载的文件保存到</span>
            <div class="ellipsis">{{ store.settings.down_dir }}</div>
            <div class="btn-sec">
                <button @click="shell.open(store.settings.down_dir)">
                    <i class="fa-regular fa-folder-open"></i>
                    打开文件夹
                </button>
                <button @click="changePath('down_dir')">
                    <i class="fa-regular fa-exchange"></i>
                    更改
                </button>
            </div>
        </section>
        <hr />
        <section>
            <span>将临时产生的数据保存到</span>
            <div class="ellipsis">{{ store.settings.temp_dir }}</div>
            <div class="btn-sec">
                <button @click="shell.open(store.settings.temp_dir)">
                    <i class="fa-regular fa-folder-open"></i>
                    打开文件夹
                </button>
                <button @click="changePath('temp_dir')">
                    <i class="fa-regular fa-exchange"></i>
                    更改
                </button>
            </div>
        </section>
        <hr />
        <section>
            <span>临时数据概览</span>
            <div class="ellipsis">{{ store.data.tempCount }}</div>
            <div class="btn-sec">
                <button @click="handleTemp('clear')">
                    <i class="fa-regular fa-broom-wide"></i>
                    清除临时数据
                </button>
                <button @click="handleTemp('calc')">
                    <i class="fa-regular fa-arrows-rotate"></i>
                    刷新
                </button>
            </div>
        </section>
    </div>
    <span>默认参数</span>
    <span class="desc dis-placeholder">
        若某媒体无您选择的默认参数，将会尝试使用媒体最高可用参数。
    <br>若部分选项无法选择，则需要登录，或该选项为大会员专享。
    </span>
    <div class="setting-page__option">
        <section>
            <span>分辨率/画质</span>
            <form>
                <label v-for="item in dms_list" :key="item.id" :class="[{ 'dis-placeholder': !store.user.isLogin && item.login}, 'radio']">
                    <input type="radio" name="dms" :value="item.id" :checked="store.settings.df_dms === item.id"
                    @click="updateRadio('df_dms', item.id)" />
                    <span class="radio-btn"></span>
                    {{ item.label }}
                </label>
            </form>
        </section>
        <hr />
        <section>
            <span>比特率/音质</span>
            <form>
                <label v-for="item in ads_list" :key="item.id" :class="[{ 'dis-placeholder': !store.user.isLogin && item.login}, 'radio']">
                    <input type="radio" name="ads" :value="item.id" :checked="store.settings.df_ads === item.id"
                    @click="updateRadio('df_ads', item.id)" />
                    <span class="radio-btn"></span>
                    {{ item.label }}
                </label>
            </form>
        </section>
        <hr />
        <section>
            <span>编码格式</span>
            <form>
                <label v-for="item in cdc_list" :key="item.id" :class="[{ 'dis-placeholder': !store.user.isLogin && item.login}, 'radio']">
                    <input type="radio" name="cdc" :value="item.id" :checked="store.settings.df_cdc === item.id"
                    @click="updateRadio('df_cdc', item.id)" />
                    <span class="radio-btn"></span>
                    {{ item.label }}
                </label>
            </form>
        </section>
        <hr />
        <section>
            <span>下载并发数</span>
            <form>
                <label v-for="item in conc_list" :key="item.id" class="radio">
                    <input type="radio" name="conc" :value="item.id" :checked="store.settings.max_conc == item.id"
                    @click="updateRadio('max_conc', item.id)" />
                    <span class="radio-btn"></span>
                    {{ item.label }}
                </label>
            </form>
        </section>
    </div>
    <!-- <span>网络选项&ensp;<i class="dis-placeholder">WIP</i></span>
    <div class="setting-page__option">
        <section>
            <span>代理</span>
            <div class="ellipsis">%ProxyAddr%</div>
            <div class="btn-sec">
                <button>
                    <i class="fa-regular fa-exchange"></i>
                    更改
                </button>
                <button>
                    <i class="fa-regular fa-vial"></i>
                    测试
                </button>
            </div>
        </section>
    </div> -->
</div>
</template>

<script lang="ts">
import { getVersion } from '@tauri-apps/api/app';
import * as dialog from '@tauri-apps/plugin-dialog';
import * as shell from '@tauri-apps/plugin-shell';
import store from '@/store';
import { utils } from '@/services';
import { invoke } from '@tauri-apps/api/core';

export default {
    data() {
        return {
            dms_list: [
                { id: 16, label: '360P 流畅', login: false },
                { id: 32, label: '480P 清晰', login: false },
                { id: 64, label: '720P 高清', login: true },
                { id: 80, label: '1080P 高清', login: true },
                { id: 112, label: '1080P+ 高码率', login: true },
                { id: 116, label: '1080P60 高帧率', login: true },
                { id: 120, label: '4K 超清', login: true },
                { id: 125, label: 'HDR 真彩', login: true },
                { id: 126, label: '杜比视界', login: true },
                { id: 127, label: '8K 超高清', login: true }
            ],
            ads_list: [
                { id: 30216, label: '64K', login: false },
                { id: 30232, label: '132K', login: false },
                { id: 30280, label: '192K', login: false },
                { id: 30250, label: '杜比全景声', login: true },
                { id: 30251, label: 'Hi-Res无损', login: true }
            ],
            cdc_list: [
                { id: 7, label: 'AVC 编码', login: false },
                { id: 12, label: 'HEVC 编码', login: false },
                { id: 13, label: 'AV1 编码', login: false }
            ],
            conc_list: [
                { id: 1, label: '1个' },
                { id: 2, label: '2个' },
                { id: 3, label: '3个' },
                { id: 4, label: '4个' },
                { id: 5, label: '5个' }
            ],
            store: store.state,
            shell,
            version: '',
            tempCount: ''
        }
    },
    methods: {
        changePath(type: 'down_dir' | 'temp_dir') {
            dialog.open({
                directory: true,
                defaultPath: this.store.settings[type]
            }).then(path => {
                if (!path) return null;
                invoke('rw_config', { action: 'write', settings: { [type]: path }, secret: this.store.data.secret });
                this.store.settings[type] = path;
            }).catch(err => {
                utils.iziError(err.message);
                return null;
            })
        },
        handleTemp(action: string) {
            invoke('handle_temp', { action }).then(data => store.state.data.tempCount = data as string);
        },
        updateRadio(type: 'df_dms' | 'df_ads' | 'df_cdc' | 'max_conc', data: number) {
            invoke('rw_config', { action: 'write', settings: { [type]: data }, secret: this.store.data.secret });
        }
    },
    activated() {
        (this.$refs.iconBigSvg as HTMLImageElement).src = "/src/assets/img/icon-big.svg?" + Date.now();
        getVersion().then(v => this.version = v);
        this.handleTemp("calc");
    },
};
</script>

<style scoped>
.setting-page {
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
}

.setting-page__info {
    position: absolute;
    right: 36px;
    top: 24px;
    text-align: center;
}

.setting-page__info div {
    display: flex;
}

.setting-page__info img:not(.icon-big-svg) {
    width: 50px;
    margin-right: 10px;
} 

.setting-page__info img.icon-big-svg {
    width: 160px;
}

.setting-page > span:not(.desc) {
    margin: 16px 2px 2px;
}

.setting-page > span.desc {
    font-size: 12px;
}

.setting-page__option {
    margin: 8px 0;
    padding: 10px 12px;
    border: 1px solid #333;
    background: var(--section-color);
    border-radius: 12px;
    min-width: 400px;
}

.setting-page__option,
.setting-page__option section {
    display: flex;
    flex-direction: column;
    position: relative;
    gap: 5px;
    font-size: 13px;
}

.setting-page__option section .ellipsis {
    max-width: 300px;
}

.setting-page__option section .btn-sec {
    display: flex;
    flex-direction: column;
    position: absolute;
    align-items: flex-end;
    min-height: 42px;
    transform: translateY(-50%);
    flex: 1;
    right: 0;
    top: 50%;
    gap: 5px;
}

.setting-page__option section button {
    padding: 4px 8px;
    border-radius: 3px;
    line-height: 10px;
    width: fit-content;
    border: 1px solid var(--split-color);
}

.setting-page__option section button:hover {
    background: var(--split-color);
}

.setting-page__option div {
    max-width: 400px;
}

.setting-page__option section form {
    display: flex;
    gap: 16px;
}

.radio,
.radio-btn {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    position: relative;
    gap: 4px;
}

.radio:nth-child(-n+5) {
    min-width: 78.8px;
}

.radio input[type="radio"] {
    display: none;
}

.radio-btn {
    height: 15px;
    width: 15px;
    border-radius: 50%;
    justify-content: center;
    border: 2px solid #808080;
    transition: border 0.1s ease-in-out;
}

.radio.dis-placeholder .radio-btn {
    border: 2px solid #c4c4c450;
}

.radio input[type="radio"]:checked + .radio-btn::before {
    content: '';
    width: 50%;
    height: 50%;
    border-radius: 50%;
    background: var(--primary-color);
}

.radio input[type="radio"]:checked + .radio-btn {
    border: 2px solid var(--primary-color);
}
</style>