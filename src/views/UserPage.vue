<template><div>
    <div class="profile" v-if="user.isLogin">
        <div class="profile__top_photo" :style="{ opacity: user.topPhoto ? 1 : 0 }"><img :src=user.topPhoto draggable="false" /></div>
        <div class="profile__details">
            <div class="profile__avatar_cont">
                <img :src="user.avatar" draggable="false" class="profile__avatar" />
                <img src="@/assets/img/big-vip.svg" draggable="false" class="profile__big_vip" v-if="user.vipStatus" />
            </div>
            <div class="profile__text_area text">
                <div class="profile__name">
                    <span>{{ user.name }}</span>
                    <img :src="levelIcon" draggable="false" class="profile__level" />
                    <img :src="user.vip" draggable="false" class="profile__vip_label" />
                </div>
                <span class="profile__desc"><div>{{ user.desc }}</div>
                    <i :class="'fa-regular fa-' + sexDesc"></i>
                    <span class="profile__mid">
                        <i class="fa-regular fa-id-card"></i>
                        {{ user.mid }}
                    </span>
                    <span class="profile__coin">
                        <i class="fa-regular fa-coin-front"></i>
                        {{ user.coins }}
                    </span>
                </span>
            </div>
            <div class="profile__operates">
                <button class="profile__exit_login" @click="exit">
                    <i class="fa-regular fa-arrow-right-from-arc"></i>
                    <span>退出登录</span>
                </button>
            </div>
        </div>
    </div>
    <div class="login" v-if="!user.isLogin">
        <div class="login__scan_wp">
            <div class="login__scan_title">扫描二维码登录</div>
            <div class="login__scan_box">
                <canvas id="login__qrcode" ref="qrcodeBox"></canvas>
            </div>
            <div class="login__scan_tips" ref="qrcodeTips"></div>
            <div class="login__scan_warning" v-if="scanStat" @click="scanStat == 2 ? login('scan') : null">
				<template v-if="scanStat == 1">
					<div><i class="fa-regular fa-octagon-check"></i></div>
					<span>扫码成功</span>
					<span>请在手机上确认</span>
				</template>
				<template v-if="scanStat == 2">
					<div><i class="fa-solid fa-rotate-right"></i></div>
					<span>二维码已过期</span>
					<span>点击刷新</span>
				</template>
			</div>
            <div class="login__desc">
                <p>请使用 <a href="https://app.bilibili.com/" target="_blank">哔哩哔哩客户端</a></p>
                <p>扫码登录或扫码下载APP</p>
            </div>
        </div>
        <div class="login__main_split"></div>
        <div class="login__input_wp">
            <div class="login__tab_wp">
                <button :class="['login__tab_btn', { 'active': tab == 'pwd' }]" @click="tab = 'pwd'"> 密码登录 </button>
                <div class="login__small_split"></div>
                <button :class="['login__tab_btn', { 'active': tab == 'sms' }]" @click="tab = 'sms'"> 短信登录 </button>
            </div>
            <div class="login__input_form" v-if="tab == 'pwd'">
                <div class="login__input_form_item">
                    <span>账号</span>
                    <input autocomplete="on" maxlength="32" oninput="value=value.replace(/\s+/g, '')" placeholder="请输入账号" type="text" ref="pwdAccount">
                </div>
                <div class="login__input_form_split"></div>
                <div class="login__input_form_item">
                    <span>密码</span>
                    <input autocomplete="on" maxlength="32" oninput="value=value.replace(/\s+/g, '')" placeholder="请输入密码"
                    :type="pwdVisible ? 'text' : 'password'" ref="pwdPwd" @keydown.enter="login('pwd')">
                    <button @click="pwdVisible = !pwdVisible">
                        <i :class="['fa-solid', pwdVisible ? 'fa-eye' : 'fa-eye-slash']"></i>
                    </button>
                </div>
            </div>
            <div class="login__input_form" v-if="tab == 'sms'">
                <div class="login__input_form_item">
                    <div class="login__drop">
                        <span> +{{ cid }} </span>
                        <button @click="drop = !drop"><img src="@/assets/img/select_arrow.svg" draggable="false" /></button>
                        <div class="login__drop_box" :class="{ active: drop }">
                            <div class="login__drop_item" v-for="country in countryList" @click="cid = country.country_id; drop = false">
                                <span>{{ country.cname }}</span>
                                <span>{{ '+' + country.country_id }}</span>
                            </div>
                        </div>
                    </div>
                    <input autocomplete="on" maxlength="32" oninput="value=value.replace(/[^\d]/g, '')" placeholder="请输入手机号" type="text" ref="smsAccount">
                    <div class="login__small_split"></div>
                    <button @click="sendSms">获取验证码</button>
                </div>
                <div class="login__input_form_split"></div>
                <div class="login__input_form_item">
                    <span>验证码</span>
                    <input autocomplete="on" maxlength="32" oninput="value=value.replace(/[^\d]/g, '')" placeholder="请输入验证码"
                    type="text" ref="smsCode" @keydown.enter="login('pwd')">
                </div>
            </div>
            <button class="login__input_btn" @click="login(tab)">登录</button>
            <div class="login__desc">用户数据将仅存储于本地</div>
        </div>
    </div>
</div></template>

<script lang="ts">
import { utils, login } from '@/services';
import { invoke } from '@tauri-apps/api/core';
import { emit, listen } from "@tauri-apps/api/event";
import store from '@/store';
import { ApplicationError, iziError } from '@/services/utils';
import { useRouter } from 'vue-router';

export default {
    data() {
        return {
            pwdVisible: false,
            tab: 'pwd' as 'pwd' | 'sms',
            cid: '86',
            drop: false,
            countryList: [] as { id: number; cname: string; country_id: string; }[],
			scanStat: 0
        }
    },
    computed: {
        user() { return store.state.user },
        levelIcon() {
            return new URL(`../assets/img/level/level${this.user.level}.svg`, import.meta.url).href
        },
        sexDesc() {
            const sex = this.user.sex;
            return sex == '男' ? 'mars' : sex == '女' ? 'venus' : 'question';
        },
    },
    methods: {
        async login(type: 'scan' | 'pwd' | 'sms') {
            try {
				if (this.user.isLogin) return null;
                if (type === 'sms') {
                    const tel = (this.$refs.smsAccount as HTMLInputElement).value;
                    const code = (this.$refs.smsCode as HTMLInputElement).value;
                    if (!tel || !code) {
                        iziError(new Error('手机号或验证码为空'));
                        return null;
                    }
                    await login.smsLogin(tel, code, this.cid);
                } else if (type === 'pwd') {
                    const account = (this.$refs.pwdAccount as HTMLInputElement).value;
                    const password = (this.$refs.pwdPwd as HTMLInputElement).value;
                    if (!account || !password) {
                        iziError(new Error('手机号或验证码为空'));
                        return null;
                    }
                    await login.pwdLogin(account, password);
                } else if (type === 'scan') {
					this.scanStat = 0;
					emit('stop_login');
					this.cid = await login.getZoneCode();
                	this.countryList = await login.getCountryList();
					listen('login-status', e => {
						if (e.payload == 86090) this.scanStat = 1;
						else if (e.payload == 86038) this.scanStat = 2;
					});
                    await login.scanLogin(this.$refs.qrcodeBox as HTMLCanvasElement);
                }
				utils.iziInfo('登录成功~')
				invoke('rw_config', { action: 'write', settings: { df_dms: 80 }, secret: store.state.data.secret });
				useRouter().push('/');
				store.dispatch('fetchUser', true);
            } catch(err) {
				if ((err as Error).message === "86114") return 86114;
				iziError(err as Error);
                return null;
            };
        },
        async exit() {
            await login.exitLogin();
            useRouter().push('/');
            invoke('rw_config', { action: 'write', settings: { df_dms: 32, df_ads: 30280 }, secret: store.state.data.secret });
            store.dispatch('fetchUser');
        },
        async sendSms() {
            const tel = (this.$refs.smsAccount as HTMLInputElement).value;
            if (!tel) {
                iziError(new Error('手机号为空'));
                return null;
            }
            try {
                await login.sendSms(tel, this.cid);
            } catch(err) {
				if (err instanceof ApplicationError) {
					(err as ApplicationError).handleError();
				} else {
					new ApplicationError(err as Error).handleError();
				}
                return null;
            }
        }
    },
    async activated() {
        try {
            this.login('scan');
        } catch(err) {
            iziError(err as Error);
            return null;
        }
    },
    deactivated() {
        emit('stop_login');
    }
};
</script>

<style scoped lang="scss">
button {
	background: 0 0;
	transition: color .2s,background .2s;
}
input[type=password]::-ms-clear,input[type=password]::-ms-reveal,input[type=password]::-webkit-inner-spin-button,input[type=password]::-webkit-outer-spin-button {
	display: none;
}
.login__input_btn {
	height: 40px;
	border-radius: var(--block-radius);
	border: 1px solid var(--split-color);
	margin-top: 20px;
	width: 100%;
	&:hover {
		background: var(--primary-color);
	}
}
.login__desc a,.login__input_form_item>button:hover,.login__tab_btn.active,.profile__exit_login:hover {
	color: var(--primary-color);
	text-decoration: none;
}
.login__desc {
	font-size: 13px;
	position: absolute;
	bottom: 100px;
	text-align: center;
}
.login__drop {
	min-width: 42px;
	position: relative;
	& + input {
		width: 169px;
	}
	img {
		position: absolute;
		right: -12px;
		top: 5px;
	}
}
.login__drop_box {
	border: 1px solid var(--split-color);
	padding: 6px 0;
	display: flex;
	flex-direction: column;
	width: 220px;
	max-height: 200px;
	position: absolute;
	left: -23px;
	top: 32px;
	border-radius: var(--block-radius);
	background: var(--block-color);
	z-index: 1;
	overflow: auto;
	transition: opacity .1s;
	pointer-events: none;
	opacity: 0;
	&.active {
		opacity: 1;
		pointer-events: all;
	}
}
.login__drop_item {
	padding: 6px 12px;
	display: flex;
	flex: 1;
	justify-content: space-between;
	cursor: pointer;
	transition: background .1s;
	&:hover {
		background: var(--split-color);
	}
}
.profile {
	.profile__text_area {
		display: flex;
		flex-direction: column;
	}
	&::after {
		content: "";
		position: absolute;
		top: 0;
		left: 0;
		bottom: 0;
		right: 0;
		border-bottom: #333 solid 1px;
		background: linear-gradient(to bottom,transparent 0,rgba(0,0,0,.13) 25%,rgba(0,0,0,.26) 50%,rgba(0,0,0,.4) 75%,rgba(0,0,0,.66) 100%);
	}
}
.login__input_wp,.login__scan_wp,.profile__operates {
	flex-direction: column;
}
.profile__operates {
	display: flex;
	button {
		padding: var(--block-radius);
		transition: color .2s;
	}
	i {
		margin-right: 6px;
	}
}
.profile__text_area {
	flex: 1;
}
.login,.profile {
	position: relative;
	border-radius: var(--block-radius);
	background: var(--section-color);
	border: #333 solid 1px;
	height: 240px;
}
.login {
	display: flex;
	width: 820px;
	height: 430px;
	padding: 52px 65px 29px 92px;
	background-image: url(../assets/img/22_open.png),url(../assets/img/33_open.png);
	background-position: 0 100%,100% 100%;
	background-repeat: no-repeat,no-repeat;
	background-size: 14%;
}
.profile::after,.profile__top_photo,.profile__top_photo img {
	width: 912.75px;
	height: 142.6171875px;
	border-radius: var(--block-radius);
	border-bottom-left-radius: 0;
	border-bottom-right-radius: 0;
	transition: opacity .5s;
}
.profile__details {
	position: absolute;
	bottom: 0;
	width: 100%;
	padding: 0 30px 15px;
	display: flex;
}
.profile__avatar,.profile__avatar_cont {
	position: relative;
	height: 90px;
	z-index: 1;
}
.profile__avatar_cont {
	margin-right: 20px;
}
.profile__avatar {
	border: var(--section-color) 1px solid;
	border-radius: 50%;
}
.profile__big_vip {
	position: absolute;
	height: 25px;
	bottom: 0;
	right: 0;
	z-index: 1;
}
.profile__exit_login,.profile__name {
	display: flex;
	margin-top: auto;
	align-items: center;
}
.profile__name {
	width: 100%;
	span {
		font-size: 20px;
		font-weight: 700;
		max-width: 40%;
		margin-top: auto;
	}
	img {
		margin-left: 12px;
	}
}
.profile__desc,.profile__name span {
	display: inline-block;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.profile__level {
	height: 15px;
}
.profile__vip_label {
	height: 18px;
}
.profile__desc,.profile__desc span {
	font-size: 13px;
	line-height: 22px;
	color: var(--desc-color);
}
.profile__desc i,.profile__mid {
	color: #4f5259;
	font-size: 12px;
}
.profile__desc {
	span {
		margin-left: var(--block-radius);
	}
}
.login__scan_warning>span,.profile__operates {
	font-size: 13px;
}
.login__input_wp,.login__scan_box,.login__scan_wp,.login__tab_wp {
	display: flex;
	align-items: center;
}
.login__scan_title,.login__tab_wp {
	line-height: 22.4px;
	margin-bottom: 26px;
}
.login__scan_box {
	border-radius: var(--block-radius);
	border: solid #444 2px;
	width: 180px;
	height: 180px;
	justify-content: center;
	transition: opacity .4s;
	z-index: 1;
	&:hover {
		opacity: 0;
		& + .login__scan_tips {
			opacity: 1;
		}
	}
}
.login__scan_tips {
	position: absolute;
	opacity: 0;
	height: 173px;
	width: 330px;
	z-index: 0;
	transform: translateY(50px);
	background-size: 100% 100%;
	background-image: url(@/assets/img/qr-tips.png);
	transition: opacity .4s;
}
.login__scan_warning {
	border-radius: var(--block-radius);
	position: absolute;
	width: 180px;
	z-index: 2;
	height: 180px;
	transform: translateY(26.7%);
	background-color: rgba(31,31,31,.9);
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	cursor: pointer;
	div {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background-color: var(--section-color);
		margin-bottom: 10px;
		i {
			padding: 16px;
			font-size: 24px;
			color: var(--primary-color);
		}
	}
}
.login__main_split,.login__small_split {
	height: 70%;
	width: 1px;
	background: var(--split-color);
	margin: 43px 44px 0 45px;
}
.login__small_split {
	height: 20px;
	margin: 0 21px;
}
.login__tab_btn {
	font-size: 18px;
}
.login__input_wp {
	& > span {
		font-size: 12px;
		margin-top: 60px;
		align-self: center;
	}
}
.login__input_form {
	width: 390px;
	border: 1px solid var(--split-color);
	font-size: 14px;
	border-radius: var(--block-radius);
}
.login__input_form_split {
	flex: 1;
	height: 1px;
	background: var(--split-color);
}
.login__input_form_item {
	padding: 12px 22px;
	display: flex;
	* {
		line-height: 20px;
		font-size: 14px;
	}
	input {
		margin-left: 20px;
		flex: 1;
	}
}
</style>