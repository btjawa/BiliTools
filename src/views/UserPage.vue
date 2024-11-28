<template><div>
    <div v-if="store.user.isLogin"
        class="profile w-full absolute max-w-7xl bg-[color:var(--section-color)]"
    >
        <div class="profile__top_photo relative" :style="{ opacity: store.user.topPhoto ? 1 : 0 }">
            <img :src=store.user.topPhoto draggable="false" class="w-full block" />
        </div>
        <div class="profile__meta relative flex items-center mx-10">
            <div
                class="avatar -translate-y-2.5 box-content block relative w-[100px] h-[100px] rounded-[50%] border-2 border-solid border-[rgba(255,255,255,0.4)]"
            >
                <img :src="store.user.avatar + '@100w_100h'" class="rounded-[50%]" />
                <img v-if="store.user.vipLabel" class="w-[30px] absolute right-0 bottom-0" src="/src/assets/img/profile/big-vip.svg" />
            </div>
            <div class="details absolute top-[10px] ml-[120px]">
                <div class="mb-[6px] flex items-center gap-2">
                    <h2>{{ store.user.name }}</h2>
                    <img class="h-[14px]" :src="`/src/assets/img/profile/level/level${store.user.level}.svg`" />
                    <img class="h-5" v-if="store.user.vipLabel" :src="store.user.vipLabel" />
                </div>
                <span class="text-[var(--desc-color)] text-sm w-[530px] block">{{ store.user.desc }}</span>
            </div>
            <div class="stat ml-auto mr-6">
                <div class="stat__item">
                    <span>{{ $t('user.stat.coins') }}</span>
                    <span>{{ store.user.stat.coins }}</span>
                </div>
                <div class="stat__item">
                    <span>{{ $t('user.stat.following') }}</span>
                    <span>{{ store.user.stat.following }}</span>
                </div>
                <div class="stat__item">
                    <span>{{ $t('user.stat.follwer') }}</span>
                    <span>{{ store.user.stat.follower }}</span>
                </div>
                <div class="stat__item">
                    <span>{{ $t('user.stat.dynamic') }}</span>
                    <span>{{ store.user.stat.dynamic_count }}</span>
                </div>
            </div>
            <button @click="exit()"
                class="px-3 py-2.5 rounded-lg hover:bg-[color:var(--primary-color)]"
            >退出登录</button>
        </div>
    </div>
    <div v-if="!store.user.isLogin"
        class="login flex relative border border-solid border-[#333] rounded-lg"
    >
        <div class="scan h-[350px]">
            <h3 class="mb-[26px]">{{ $t('user.scan.title') }}</h3>
            <div class="scan__box relative box-content w-40 h-40 p-[5px] border border-solid border-[var(--desc-color)] rounded-lg">                
                <img src="/src/assets/img/login/loadTV.gif" class="absolute invert m-[30px] z-0" />
                <canvas ref="loginQrcode" class="relative z-1"></canvas>
                <div v-if="scan.code === 86038 || scan.code === 86090" @click="scanLogin()"
                    class="scan__tips absolute flex w-[172px] h-[172px] z-2 bg-[#18181890] -top-px -left-px
                    flex-col justify-center items-center cursor-pointer rounded-md text-sm"
                >
                    <i :class="{'fa-solid': true, 'fa-arrow-rotate-right': scan.code === 86038, 'fa-check': scan.code === 86090}"
                        class="w-14 h-14 p-4 text-[24px] bg-[var(--block-color)] text-[var(--primary-color)] mb-[10px] rounded-[50%]"
                    ></i>
                    <span>{{ $t('user.scan.code_0.' + scan.code) }}</span>
                    <span>{{ $t('user.scan.code_1.' + scan.code) }}</span>
                </div>
            </div>
            <span class="desc mt-[18px]" v-html="$t('user.scan.desc')"></span>
        </div>
        <div class="split h-[228px] mt-[51px] mx-[45px]"></div>
        <div class="others flex relative h-[290px] w-[400px] flex-col items-center">
            <div class="others__tab flex mb-[26px] h-fit items-center hover:cursor-pointer">
                <!-- <h3 @click="othersPage = 0" :class="othersPage !== 0 || 'active'"> -->
                <h3 @click.prevent :class="othersPage !== 0 || 'active'">
                    {{ $t('user.others.pwd') }}
                </h3>
                <div class="split h-5 mx-[21px]"></div>
                <h3 @click="othersPage = 1" :class="othersPage !== 1 || 'active'">
                    {{ $t('user.others.sms') }}
                </h3>
            </div>
            <div class="others__page w-full" ref="othersPage">
                <form class="input_form rounded-lg border boredr-solid border-[var(--split-color)]">
                    <div class="form_item border-b-[color:var(--split-color)] border-b border-solid">
                        <span v-if="othersPage === 0">{{ $t('common.account') }}</span>
                        <div v-if="othersPage === 1" class="w-[42px] relative">
                            +{{ sms.cid }}
                            <svg class="absolute left-[42px] top-2 w-[12px] p-0 hover:cursor-pointer" viewBox="0 0 13.4 8.1">
                                <path d="M6.8 8.1L0 1.75 1.36.3l5.38 5L11.97 0l1.42 1.4-6.6 6.7z" fill="var(--primary-color)"></path>
                            </svg>
                        </div>
                        <select v-if="othersPage === 1"
                            class="absolute opacity-0 h-[22px] p-0 hover:cursor-pointer"
                            @change="($event) => {
                                sms.cid = Number(($event.target as HTMLSelectElement).value);
                            }"
                        >
                            <option
                                v-for="country in countryList"
                                :value="country.country_id"
                            >
                                {{ country.cname }} +{{ country.country_id }}
                            </option>
                        </select>
                        <input v-model="pwd.username" v-if="othersPage === 0"
                            oninput="value=value.replace(/\s+/g, '')"
                            :placeholder="$t('user.others.pleaseInput', [$t('common.account')])"
                            spellcheck="false"
                        />
                        <input v-model="sms.tel" v-if="othersPage === 1"
                            oninput="value=value.replace(/[^\d]/g, '')"
                            :placeholder="$t('user.others.pleaseInput', [$t('common.telephone')])"
                            spellcheck="false"
                        />
                    </div>
                    <div class="form_item">
                        <span>{{ othersPage ? $t('common.verifyCode') : $t('common.password') }}</span>
                        <input v-model="pwd.pwd" v-if="othersPage === 0"
                            oninput="value=value.replace(/\s+/g, '')"
                            :placeholder="$t('user.others.pleaseInput', [$t('common.password')])"
                            type="password"
                            spellcheck="false"
                        />
                        <template v-if="othersPage === 1">
                            <input v-model="sms.code"
                                oninput="value=value.replace(/[^\d]/g, '')"
                                :placeholder="$t('user.others.pleaseInput', [$t('common.verifyCode')])"
                                spellcheck="false"
                            />
                            <div class="split h-[22px] mx-[20px]"></div>
                            <button type="button" @click="sendSmsCode()"
                                class="bg-[color:unset] p-0 h-fit leading-[22px]"
                            >{{ $t('user.others.get', [$t('common.verifyCode')]) }}</button>
                        </template>
                    </div>
                </form>
                <button @click="othersPage ? smsLogin() : pwdLogin()"
                    class="mt-5 rounded-lg h-10 w-full hover:bg-[color:var(--primary-color)]"
                >登录</button>
            </div>
            <div class="agreement absolute bottom-2 text-sm">
                <span class="desc">{{ $t('user.others.exempt') }}</span>
                <span class="desc">登录即代表你同意 <a href="https://www.bilibili.com" target="_blank">哔哩哔哩</a>
                的 <a href="https://www.bilibili.com/protocal/licence.html" target="_blank">用户协议</a>
                和 <a href="https://www.bilibili.com/blackboard/privacy-pc.html" target="_blank">隐私政策</a>
                </span>
            </div>
        </div>
    </div>
</div></template>

<script lang="ts">
import { ApplicationError, iziInfo } from '@/services/utils';
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
                    new ApplicationError('手机号为空', { noStack: true }).handleError();
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
                    new ApplicationError(err).handleError();
                } else if ((err as any)?.tmp_code && (err as any)?.request_id) {
                    new ApplicationError((err as any).message, { code: (err as any).code }).handleError();
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

<style lang="scss" scoped>
.login {
    padding: 52px 65px 29px 92px;
    background-color: var(--section-color);
    background-image: url("/src/assets/img/login/22_open.png"), url("/src/assets/img/login/33_open.png");
    background-position: 0 100%, 100% 100%;
    background-repeat: no-repeat, no-repeat;
    background-size: 14%;
}
.desc {
    font-size: 13px;
    text-align: center;
    width: 100%;
    margin-bottom: 0;
}
.split {
    width: 1px;
    background-color: var(--split-color);
}
h3 {
    font-size: 18px;
    text-align: center;
}
.others__tab h3.active {
    color: var(--primary-color);
}
.others__page .form_item {
    display: flex;
    padding: 12px 20px;
    font-size: 14px;
    input {
        @apply flex flex-1 h-fit leading-[22px] ml-5 p-[unset] bg-[color:unset];
    }
}
.profile__top_photo:after {
    @apply content-[""] absolute border-b-[#333] border-b-[1px] border-solid inset-0;
    background: linear-gradient(
        to bottom,
        transparent 0,
        rgba(0, 0, 0, 0.13) 25%,
        rgba(0, 0, 0, 0.26) 50%,
        rgba(0, 0, 0, 0.4) 75%,
        rgba(0, 0, 0, 0.66) 100%
    );
}
.profile__meta {
    .avatar {
        @apply bg-cover bg-clip-padding;
        background-image: url("/src/assets/img/profile/default-avatar.jpg");
    }
    .details span {
        @apply overflow-hidden text-ellipsis;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
    }
    .stat .stat__item {
        @apply text-xs inline-flex flex-col items-center mx-[5px];
        span:first-child {
            color: var(--desc-color);
            margin-bottom: 5px;
        }
    }
}
</style>