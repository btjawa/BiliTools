<template><div>
    <div class="profile" v-if="store.user.isLogin">
        <div class="profile__top_photo" :style="{ opacity: store.user.topPhoto ? 1 : 0 }">
            <img :src=store.user.topPhoto draggable="false" />
        </div>
        <div class="profile__meta">
            <div class="avatar">
                <img :src="store.user.avatar + '@100w_100h'" />
                <img v-if="store.user.vipLabel" class="avatar_vip" src="/src/assets/img/profile/big-vip.svg" />
            </div>
            <div class="details">
                <div>
                    <h2>{{ store.user.name }}</h2>
                    <img class="details__level" :src="`/src/assets/img/profile/level/level${store.user.level}.svg`" />
                    <img v-if="store.user.vipLabel" class="details__vip" :src="store.user.vipLabel" />
                </div>
                <span>{{ store.user.desc }}</span>
            </div>
            <div class="stat">
                <div class="stat__item">
                    <span>硬币数</span>
                    <span>{{ store.user.stat.coins }}</span>
                </div>
                <div class="stat__item">
                    <span>关注数</span>
                    <span>{{ store.user.stat.following }}</span>
                </div>
                <div class="stat__item">
                    <span>粉丝数</span>
                    <span>{{ store.user.stat.follower }}</span>
                </div>
                <div class="stat__item">
                    <span>动态数</span>
                    <span>{{ store.user.stat.dynamic_count }}</span>
                </div>
            </div>
            <button @click="exit()">退出登录</button>
        </div>
    </div>
    <div class="login" v-if="!store.user.isLogin">
        <div class="scan">
            <h3>扫描二维码登录</h3>
            <div class="scan__box">                
                <img src="/src/assets/img/login/loadTV.gif" />
                <canvas ref="loginQrcode"></canvas>
                <div class="scan__tips" v-if="scan.code === 86038" @click="scanLogin()">
                    <div class="icon">
                        <i class="fa-solid fa-arrow-rotate-right"></i>
                    </div>
                    <span>二维码已过期</span>
                    <span>请点击刷新</span>
                </div>
                <div class="scan__tips" v-if="scan.code === 86090">
                    <div class="icon">
                        <i class="fa-solid fa-check"></i>
                    </div>
                    <span>扫码成功</span>
                    <span>请在手机上确认</span>
                </div>
            </div>
            <span class="desc">
                请使用 <a href="https://app.bilibili.com/" target="_blank">哔哩哔哩客户端</a>
                <br>扫码登录或扫码下载APP
            </span>
        </div>
        <div class="split"></div>
        <div class="others">
            <div class="others__tab">
                <!-- <h3 class="temp_disable" @click="othersPage = 0" :class="othersPage !== 0 || 'active'">密码登录</h3> -->
                <h3
                    :class="othersPage !== 0 || 'active'" :style="{ color: 'var(--split-color)' }"
                    @click="iziInfo('密码登录目前风控率较大，维护中')"
                >
                    密码登录
                </h3>
                <div class="split"></div>
                <h3 @click="othersPage = 1" :class="othersPage !== 1 || 'active'">短信登录</h3>
            </div>
            <div class="others__page" ref="othersPage">
                <form class="input_form">
                    <div class="form_item">
                        <span v-if="othersPage === 0">账号</span>
                        <div v-if="othersPage === 1">
                            +{{ sms.cid }}
                            <img src="/src/assets/img/login/select_arrow.svg" />
                        </div>
                        <select v-if="othersPage === 1" @change="($event) => {
                            sms.cid = Number(($event.target as HTMLSelectElement).value);
                        }">
                            <option
                                v-for="country in countryList"
                                :value="country.country_id"
                            >
                                {{ country.cname }} +{{ country.country_id }}
                            </option>
                        </select>
                        <input v-model="pwd.username" v-if="othersPage === 0"
                            oninput="value=value.replace(/\s+/g, '')"
                            placeholder="请输入账号"
                            spellcheck="false"
                        />
                        <input v-model="sms.tel" v-if="othersPage === 1"
                            oninput="value=value.replace(/[^\d]/g, '')"
                            placeholder="请输入手机号"
                            spellcheck="false"
                        />
                    </div>
                    <div class="form_item">
                        <span>{{ othersPage ? '验证码' : '密码' }}</span>
                        <input v-model="pwd.pwd" v-if="othersPage === 0"
                            oninput="value=value.replace(/\s+/g, '')"
                            placeholder="请输入密码"
                            type="password"
                            spellcheck="false"
                        />
                        <template v-if="othersPage === 1">
                            <input v-model="sms.code"
                                oninput="value=value.replace(/[^\d]/g, '')"
                                placeholder="请输入验证码"
                                spellcheck="false"
                            />
                            <div class="split"></div>
                            <button type="button" @click="sendSmsCode()">获取验证码</button>
                        </template>
                    </div>
                </form>
                <button @click="othersPage ? smsLogin() : pwdLogin()">登录</button>
            </div>
            <div class="agreement">
                <span class="desc">该应用产生与获取的所有数据将仅存储于用户本地</span>
                <span class="desc">登录即代表你同意 <a href="https://www.bilibili.com" target="_blank">哔哩哔哩</a>
                的 <a href="https://www.bilibili.com/protocal/licence.html" target="_blank">用户协议</a>
                和 <a href="https://www.bilibili.com/blackboard/privacy-pc.html" target="_blank">隐私政策</a>
                </span>
            </div>
        </div>
    </div>
    <div class="verify_tel" :class="{ 'active': telVerify.need }">
        <span>为了您的账号安全，需要验证您的手机号</span>
        <form class="input_form">
            <div class="form_item">
                <span>验证码</span>
                <input v-model="telVerify.code"
                    oninput="value=value.replace(/[^\d]/g, '')"
                    placeholder="请输入验证码"
                    spellcheck="false"
                />
                <div class="split"></div>
                <button type="button" @click="sendVerifyTelSmsCode()">获取验证码</button>
            </div>
        </form>
        <button @click="othersPage ? smsLogin() : pwdLogin()">登录</button>
    </div>
</div></template>

<script lang="ts">
import { ApplicationError, iziError, iziInfo } from '@/services/utils';
import { emit } from '@tauri-apps/api/event';
import * as login from '@/services/login';

export default {
    data() {
        return {
            store: this.$store.state,
            pwd: {
                username: '',
                pwd: '',
            },
            sms: {
                tel: '',
                code: '',
                captchaKey: "",
                cid: 86,
            },
            scan: {
                code: 0,
            },
            countryList: [] as {
                id: number;
                cname: string;
                country_id: string;
            }[],
            telVerify: {
                need: false,
                code: '',
                captchaKey: '',
                tmpCode: '',
                requestId: ''
            },
            othersPage: 1,
        }
    },
    methods: {
        iziInfo,
        async scanLogin() {
            await this.handleError(async () => {
                this.scan.code = 0;
                (this.$refs.loginQrcode as HTMLCanvasElement).height = 160;
                const qrcodeKey = await login.genQrcode(this.$refs.loginQrcode as HTMLCanvasElement);
                return await login.scanLogin(qrcodeKey, ({ code }) => {
                    this.scan.code = code;
                    if (code === 86114) return null; // USER CANCELD
                });
            }, { login: true });
        },
        async pwdLogin() {
            await this.handleError(async () => {
                return await login.pwdLogin(this.pwd.username, this.pwd.pwd);
            }, { login: true });
        },
        async verifyTel() {
            await this.handleError(async () => {
                return await login.verifyTel(this.telVerify.tmpCode, this.telVerify.captchaKey, this.telVerify.code, this.telVerify.requestId);
            }, { login: true });
        },
        async sendVerifyTelSmsCode() {
            await this.handleError(async () => {
                this.telVerify.captchaKey = await login.verifyTelSendSmsCode(this.telVerify.tmpCode);
            });
        },
        async sendSmsCode() {
            await this.handleError(async () => {
                if (!this.sms.tel) {
                    iziError(new Error('手机号为空'));
                    return null;
                }
                this.sms.captchaKey = await login.sendSmsCode(this.sms.cid, this.sms.tel);
            });
        },
        async smsLogin() {
            await this.handleError(async () => {
                return await login.smsLogin(this.sms.cid, this.sms.tel, this.sms.code, this.sms.captchaKey);
            }, { login: true });
        },
        async exit() {
            await this.handleError(async () => {
                return await login.exitLogin();
            }, { login: true });
        },
        async handleError(func: Function, options?: { login: boolean }) {
            try {
                const code = await func();
                if (options?.login && code === 0) {
                    this.$router.push('/');
                    login.fetchUser();
                }
            } catch (err) {
                if (err instanceof ApplicationError) {
                    err.handleError();
                } else if (typeof err === 'string') {
                    (new ApplicationError(new Error(err as string), { code: -101 })).handleError();
                } else if ((err as any)?.tmp_code && (err as any)?.request_id) {
                    (new ApplicationError(new Error((err as any).message), { code: (err as any).code })).handleError();
                    this.telVerify.need = true;
                    this.telVerify.tmpCode = (err as any).tmp_code;
                    this.telVerify.requestId = (err as any).request_id;
                    console.log(this.telVerify)
                }
            }
        },
    },
    async activated() {
        this.telVerify.need = false;
        if (!this.store.user.isLogin) {
            this.scanLogin();
            await this.handleError(async () => {
                this.sms.cid = await login.getZoneCode();
                this.countryList = await login.getCountryList();
            });
        }
    },
    deactivated() {
        emit('stop_login');
    }

}

</script>

<style lang="scss">
.profile {
    width: 100%;
    position: absolute;
    max-width: 1280px;
    background-color: var(--section-color);
    border-top: #333 solid 1px;
    border-bottom: #333 solid 1px;
    .profile__top_photo {
        position: relative;
        img {
            width: 100%;
            display: block;
        }
        &:after {
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
    .profile__meta {
        margin: 0 40px;
        position: relative;
        display: flex;
        align-items: center;
        .avatar {
            transform: translateY(-10px);
            border: 2px solid rgba(255,255,255,0.4);
            box-sizing: content-box;
            display: block;
            position: relative;
            width: 100px;
            height: 100px;
            background-image: url("/src/assets/img/profile/default-avatar.jpg");
            background-size: cover;
            background-clip: padding-box;
            border-radius: 50%;
            img {
                border-radius: 50%;
            }
            .avatar_vip {
                width: 30px;
                position: absolute;
                bottom: 0;
                right: 0;
            }
        }
        .details {
            position: absolute;
            top: 10px;
            margin-left: 120px;
            span {
                color: var(--desc-color);
                font-size: 14px;
            }
            & > div {
                margin-bottom: 6px;
                display: flex;
                align-items: center;
                gap: 8px;
                .details__level {
                    height: 14px;
                }
                .details__vip {
                    height: 20px;
                }
            }
            & > span {
                width: 530px;
                word-break: break-all;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-box-orient: vertical;
                -webkit-line-clamp: 2;
                line-clamp: 2;
                overflow: hidden;
            }
        }
        .stat {
            margin: 0 24px 0 auto;
            .stat__item {
                font-size: 12px;
                display: inline-flex;
                flex-direction: column;
                align-items: center;
                margin: 0 5px;
                span:first-child {
                    color: var(--desc-color);
                    margin-bottom: 5px;
                }
            }
        }
        button {
            padding: 10px 12px;
            border-radius: 8px;
            &:hover {
                background-color: var(--primary-color);
            }
        }
    }
}
.login {
    padding: 52px 65px 29px 92px;
    display: flex;
    position: relative;
    min-height: 430px;
    border: 1px solid #333;
    border-radius: 8px;
    background-color: var(--section-color);
    background-image: url("/src/assets/img/login/22_open.png"), url("/src/assets/img/login/33_open.png");
    background-position: 0 100%, 100% 100%;
    background-repeat: no-repeat, no-repeat;
    background-size: 14%;
    .desc {
        font-size: 13px;
        text-align: center;
        width: 100%;
        margin-bottom: 0;
    }
    h3 {
        font-weight: 400;
        text-align: center;
    }
    .scan {
        height: 290px;
        h3 {
            margin-bottom: 26px;
        }
        .scan__box {
            width: 160px;
            height: 160px;
            padding: 5px;
            border: solid var(--desc-color) 1px;
            border-radius: 8px;
            box-sizing: content-box;
            position: relative;
            img {
                position: absolute;
                filter: invert(1);
                margin: 29px;
                z-index: 0;
            }
            canvas {
                position: relative;
                z-index: 1;
            }
            .scan__tips {
                width: 172px;
                height: 172px;
                position: absolute;
                z-index: 2;
                background-color: rgba(24,24,24,0.9);
                top: -1px;
                left: -1px;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                display: flex;
                border-radius: 6px;
                .icon {
                    width: 24px;
                    height: 24px;
                    padding: 16px;
                    border-radius: 50%;
                    box-sizing: content-box;
                    background-color: rgba(24,24,24);
                    i {
                        color: var(--primary-color);
                        font-size: 24px;
                    }
                    margin-bottom: 10px;
                }
                span {
                    font-size: 13px;
                    line-height: 19px;
                }
            }
        }
        .desc {
            margin-top: 18px;
        }
    }
    & > .split {
        width: 1px;
        background-color: var(--split-color);
        margin: 51px 45px 0 45px;
        height: 228px;
    }
    .others {
        display: flex;
        height: 290px;
        width: 400px;
        flex-direction: column;
        align-items: center;
        position: relative;
        .others__tab {
            display: flex;
            margin-bottom: 26px;
            height: fit-content;
            align-items: center;
            h3 {
                margin: unset;
                transition: color .1s;
                &.active {
                    color: var(--primary-color);
                }
                &:hover {
                    cursor: pointer;
                }
            }
            .split {
                width: 1px;
                background-color: var(--split-color);
                height: 20px;
                margin: 0 21px;
            }
        }
        .others__page {
            width: 100%;
            .input_form {
                border-radius: 8px;
                border: 1px solid var(--split-color);
                .form_item {
                    display: flex;
                    padding: 12px 20px;
                    font-size: 14px;
                    input {
                        margin-left: 20px;
                        display: flex;
                        flex: 1;
                    }
                    & > div {
                        width: 42px;
                        position: relative;
                        img {
                            position: absolute;
                            top: 5px;
                            left: 42px;
                            width: 12px;
                        }
                    }
                    select {
                        position: absolute;
                        opacity: 0;
                        width: 54px;
                        &:hover {
                            cursor: pointer;
                        }
                    }
                    &:first-child {
                        border-bottom: 1px solid var(--split-color);
                    }
                    .split {
                        height: 19px;
                        width: 1px;
                        margin: 0 20px;
                        background-color: var(--split-color);
                    }
                    button {
                        background-color: unset;
                    }
                }
            }
            & > button {
                margin-top: 20px;
                border-radius: 8px;
                height: 40px;
                width: 100%;
                &:hover {
                    background-color: var(--primary-color);
                }
            }
        }
        .agreement {
            position: absolute;
            bottom: 14px;
        }
    }
}
.verify_tel {
    position: absolute;
    width: 100%;
    height: 100%;
    background-color: var(--section-color);
    z-index: 2;
    opacity: 0;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    transition: opacity 0.2s;
    width: 100%;
    & > span {
        margin-bottom: 20px;
    }
    .input_form {
        width: 400px;
        border-radius: 8px;
        border: 1px solid var(--split-color);
        .form_item {
            display: flex;
            padding: 12px 20px;
            font-size: 14px;
            input {
                margin-left: 20px;
                display: flex;
                flex: 1;
            }
            .split {
                height: 19px;
                width: 1px;
                margin: 0 20px;
                background-color: var(--split-color);
            }
            button {
                background-color: unset;
            }
        }
    }
    & > button {
        width: 400px;
        margin-top: 20px;
        border-radius: 8px;
        height: 40px;
        &:hover {
            background-color: var(--primary-color);
        }
    }
    &.active {
        opacity: 1;
        pointer-events: all;
    }
}
</style>