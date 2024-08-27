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
            <div class="ellipsis">{{ store.settings.down_dir || '加载中...' }}</div>
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
            <div class="ellipsis">{{ store.settings.temp_dir || '加载中...' }}</div>
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
                <label v-for="item in store.data.mediaMap.dms" :key="item.id" :class="[{ 'dis-placeholder': !store.user.isLogin && item.login}, 'radio']">
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
                <label v-for="item in store.data.mediaMap.ads" :key="item.id" :class="[{ 'dis-placeholder': !store.user.isLogin && item.login}, 'radio']">
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
                <label v-for="item in store.data.mediaMap.cdc" :key="item.id" :class="[{ 'dis-placeholder': !store.user.isLogin && item.login}, 'radio']">
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
                <label v-for="item in concList" :key="item.id" class="radio">
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
            concList: [
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
                utils.iziError(err);
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
        (this.$refs.iconBigSvg as HTMLImageElement).src = "/src/assets/img/icon-big.svg?t=" + Date.now();
        getVersion().then(v => this.version = v);
        this.handleTemp("calc");
    },
};
</script>

<style scoped lang="scss">
.setting-page {
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
.setting-page__info {
	position: absolute;
	right: 36px;
	top: 24px;
	text-align: center;
	img {
		&:not(.icon-big-svg) {
			width: 50px;
			margin-right: 10px;
		}
		&.icon-big-svg {
			width: 160px;
		}
	}
}
.setting-page__info div,.setting-page__option section form {
	display: flex;
}
.setting-page__option {
	margin: 8px 0;
	padding: 10px 12px;
	border: 1px solid #333;
	background: var(--section-color);
	border-radius: 12px;
	min-width: 400px;
	section {
		.ellipsis {
			max-width: 290px;
		}
		.btn-sec {
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
		button {
			padding: 4px 8px;
			border-radius: 3px;
			line-height: 10px;
			width: fit-content;
			border: 1px solid var(--split-color);
			&:hover {
				background: var(--split-color);
			}
		}
	}
}
.setting-page__option,.setting-page__option section {
	display: flex;
	flex-direction: column;
	position: relative;
	gap: 5px;
	font-size: 13px;
}
.radio,.radio-btn {
	display: inline-flex;
	align-items: center;
	cursor: pointer;
	position: relative;
	gap: 4px;
}
.radio {
	&:nth-child(-n+5) { min-width: 94px; }
    &:not(:nth-child(-n+4)) { margin-right: 16px; }
    &:nth-child(4) { margin-right: 5px; }
    &:nth-child(5) { margin-right: 13px; }
	input[type=radio] {
		display: none;
	}
	&.dis-placeholder {
		.radio-btn {
			border: 2px solid #c4c4c450;
		}
	}
	input[type=radio]:checked {
		& + .radio-btn {
			border: 2px solid var(--primary-color);
			&::before {
				content: "";
				width: 50%;
				height: 50%;
				border-radius: 50%;
				background: var(--primary-color);
			}
		}
	}
}
.radio-btn {
	height: 15px;
	width: 15px;
	border-radius: 50%;
	justify-content: center;
	border: 2px solid gray;
	transition: border .1s ease-in-out;
}
</style>