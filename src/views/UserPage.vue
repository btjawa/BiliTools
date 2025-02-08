<template><div>
    <div v-if="user.isLogin" class="profile w-full absolute max-w-7xl bg-[color:var(--block-color)]">
        <div class="profile__top_photo relative" :style="{ opacity: user.topPhoto ? 1 : 0 }">
            <img :src=user.topPhoto draggable="false" class="w-full" />
        </div>
        <div class="profile__meta relative flex items-center mx-10">
            <div class="avatar -translate-y-2.5 w-[104px] h-[104px] rounded-full">
                <img :src="user.avatar" class="rounded-full" />
                <img v-if="user.vipLabel" class="w-[30px] absolute right-0 bottom-0" src="/src/assets/img/profile/big-vip.svg" />
            </div>
            <div class="details absolute top-[10px] ml-[120px]">
                <div class="mb-[6px] flex items-center gap-2">
                    <h2>{{ user.name }}</h2>
                    <img class="h-[14px]" :src="level" />
                    <img class="h-5" v-if="user.vipLabel" :src="user.vipLabel" />
                </div>
                <span class="text-[var(--desc-color)] text-sm w-[530px]">{{ user.desc }}</span>
            </div>
            <div class="stat ml-auto mr-6">
                <div class="stat__item" v-for="item in Object.keys(user.stat)">
                    <span>{{ $t('user.stat.' + item) }}</span>
                    <span>{{ (user.stat as any)[item] }}</span>
                </div>
            </div>
            <button @click="tryLogin('exit')">{{ $t('user.exit') }}</button>
        </div>
    </div>
    <div v-else class="login flex relative border border-solid border-[var(--split-color)] rounded-lg">
        <div class="h-[350px]">
            <h3 class="mb-[26px]">{{ $t('user.scan.title') }}</h3>
            <div class="relative box-content w-40 h-40 p-[5px] border border-solid border-[var(--desc-color)] rounded-lg bg-[color:var(--solid-block-color)]">
                <img src="/src/assets/img/login/loadTV.gif" class="absolute m-[30px] z-0" :class="{ 'invert': settings.isDark }" />
                <canvas ref="loginQrcode" :class="{ 'invert': settings.isDark }" class="relative z-1"></canvas>
                <div v-if="scanCode === 86038 || scanCode === 86090" @click="tryLogin('scan')"
                    class="absolute flex w-[172px] h-[172px] z-2 bg-opacity-50 bg-black -top-px -left-px
                    flex-col gap-2.5 justify-center items-center cursor-pointer rounded-md text-sm"
                >
                    <i :class="{'fa-solid': true, 'fa-arrow-rotate-right': scanCode === 86038, 'fa-check': scanCode === 86090}"
                        class="w-14 h-14 p-4 text-[24px] bg-[var(--solid-block-color)] text-[var(--primary-color)] rounded-[50%]"
                    ></i>
                    <span class="whitespace-pre-wrap text-center text-[color:var(--dark-button-color)]">{{ $t('user.scan.' + scanCode) }}</span>
                </div>
            </div>
            <i18n-t keypath="user.scan.desc" tag="span" class="desc mt-[18px]">
            <template v-slot:link>
                <a @click="open('https://app.bilibili.com')">{{ $t('user.scan.client') }}</a><br>
            </template>
            </i18n-t>
        </div>
        <div class="split h-[228px] mt-[51px] mx-[45px]"></div>
        <div class="flex relative h-[290px] w-[400px] flex-col items-center">
            <div class="others__tab flex mb-[26px] h-fit items-center hover:cursor-pointer">
                <h3 @click="othersPage = 0" :class="othersPage !== 0 || 'active'">
                    {{ $t('user.others.pwd') }}
                </h3>
                <div class="split h-5 mx-[21px]"></div>
                <h3 @click="othersPage = 1" :class="othersPage !== 1 || 'active'">
                    {{ $t('user.others.sms') }}
                </h3>
            </div>
            <div class="others__page w-full">
                <form class="rounded-lg border boredr-solid border-[var(--split-color)]">
                    <div class="form_item border-b-[color:var(--split-color)] border-b border-solid">
                        <span v-if="!othersPage">{{ $t('common.account') }}</span>
                        <template v-else>
                        <div class="w-[42px] relative">
                            +{{ cid }}
                            <svg class="absolute left-[42px] top-2 w-[12px] p-0 hover:cursor-pointer" viewBox="0 0 13.4 8.1">
                                <path d="M6.8 8.1L0 1.75 1.36.3l5.38 5L11.97 0l1.42 1.4-6.6 6.7z" fill="var(--primary-color)"></path>
                            </svg>
                        </div>
                        <select class="absolute opacity-0 h-[22px] p-0 hover:cursor-pointer z-10"
                            @change="($event) => cid = Number(($event.target as HTMLSelectElement).value)"
                        >
                            <option v-for="country in countryList" :value="country.country_id">
                                {{ country.cname }} +{{ country.country_id }}
                            </option>
                        </select>
                        </template>
                        <input v-model="tel"
                            @input="tel=tel.replace(othersPage ? /[^\d]/g : /\s+/g, '')"
                            autocomplete="new-password" class="z-20" spellcheck="false"
                            :placeholder="$t('user.others.pleaseInput', [$t(`common.${othersPage === 0 ? 'account' : 'telephone'}`)])"
                        />
                        <template v-if="othersPage">
                        <div class="split h-[22px] mx-[20px]"></div>
                        <button type="button" @click="tryLogin('sendSms')"
                            class="bg-[color:unset] p-0 h-fit leading-[22px]"
                        >{{ $t('user.others.get', [$t('common.verifyCode')]) }}</button>
                        </template>
                    </div>
                    <div class="form_item">
                        <span>{{ othersPage ? $t('common.verifyCode') : $t('common.password') }}</span>
                        <input v-model="pwd"
                            @input="pwd=pwd.replace(othersPage ? /[^\d]/g : /\s+/g, '')"
                            autocomplete="new-password" :type="othersPage ? undefined : 'password'" spellcheck="false"
                            :placeholder="$t('user.others.pleaseInput', [$t(`common.${othersPage === 0 ? 'password' : 'verifyCode'}`)])"
                        />
                    </div>
                </form>
                <button @click="tryLogin(othersPage ? 'sms' : 'pwd')"
                    class="mt-5 rounded-lg h-10 w-full hover:bg-[color:var(--primary-color)]"
                >{{ $t('user.login') }}</button>
            </div>
            <div class="absolute bottom-2 text-sm">
                <span class="desc">{{ $t('user.others.exempt') }}</span>
                <i18n-t keypath="user.others.agree" tag="span" class="desc">
                <template v-slot:bilibili>
                    <a @click="open('https://www.bilibili.com')">{{ $t('common.bilibili') }}</a>
                </template>
                <template v-slot:licence>
                    <a @click="open('https://www.bilibili.com/protocal/licence.html')">{{ $t('user.others.licence') }}</a>
                </template>
                <template v-slot:privacy>
                    <a @click="open('https://www.bilibili.com/blackboard/privacy-pc.html')">{{ $t('user.others.privacy') }}</a>
                </template>
                </i18n-t>
            </div>
        </div>
    </div>
</div></template>

<script setup lang="ts">
import { computed, onActivated, onDeactivated, ref, watch } from 'vue';
import { ApplicationError } from '@/services/utils';
import { useSettingsStore, useUserStore } from '@/store';
import { useRouter } from 'vue-router';
import { commands } from '@/services/backend';
import { open } from '@tauri-apps/plugin-shell';
import * as login from '@/services/login';

const tel = ref(String());
const pwd = ref(String());
const captchaKey = ref(String());
const scanCode = ref(0);
const cid = ref(86);
const othersPage = ref(0);
const countryList = ref<{
    id: number;
    cname: string;
    country_id: string;
}[]>([]);

const loginQrcode = ref<HTMLCanvasElement>();
const router = useRouter();

watch(othersPage, () => {
    tel.value = String();
    pwd.value = String();
})

const user = useUserStore();
const settings = useSettingsStore();
const level = computed(() => {
    return new URL(`/src/assets/img/profile/level/level${user.level}.svg`, import.meta.url).href;
});

onActivated(() => !user.isLogin && tryLogin('init'));
onDeactivated(commands.stopLogin);

async function tryLogin(type: 'scan' | 'pwd' | 'sms' | 'sendSms' | 'exit' | 'init') {
    try {
        let code = -1;
        switch(type) {
            case 'scan': {
                scanCode.value = 0;
                if (!loginQrcode.value) return;
                loginQrcode.value.height = 160;
                const qrcodeKey = await login.genQrcode(loginQrcode.value);
                code = await login.scanLogin(qrcodeKey, ({ code }) => { scanCode.value = code });
                break;
            };
            case 'pwd': {
                if (!tel.value || !pwd.value) return;
                code = await login.pwdLogin(tel.value, pwd.value);
                break;
            };
            case 'sms': {
                if (!tel.value || !pwd.value || !captchaKey.value) return;
                code = await login.smsLogin(cid.value, tel.value, pwd.value, captchaKey.value);
                break;
            };
            case 'sendSms': {
                if (!tel.value || !cid.value) return;
                captchaKey.value = await login.sendSmsCode(cid.value, tel.value);
                break;
            }
            case 'exit': {
                code = await login.exitLogin();
                break;
            }
            case 'init': {
                tryLogin('scan');
                cid.value = await login.getZoneCode();
                countryList.value = await login.getCountryList();
                break;
            }
        }
        if (code === 0) {
            router.push('/');
            await login.fetchUser();
        }
    } catch (err) {
        const error = err instanceof ApplicationError ? err : new ApplicationError(err as string);
        return error.handleError();
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
a {
    color: var(--primary-color);
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
        border: 2px solid var(--desc-color);
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