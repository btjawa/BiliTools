<template>
<div class="flex h-fit w-fit m-auto p-0 bg-[var(--block-color)] rounded-lg" :class="{ 'flex-row': !user.isLogin }">
<div v-if="user.isLogin" class="max-w-7xl">
    <div class="relative">
        <div class="absolute w-full h-full z-10 bg-gradient-to-b from-transparent to-black/50"></div>
        <img class="z-0" :src="user.topPhoto"/>
    </div>
    <div class="flex p-6 gap-4 items-end">
        <div class="relative w-fit">
            <img class="rounded-full" :src="user.avatar">
            <img class="absolute w-7 right-0 bottom-0" v-if="user.vipLabel" src="@/assets/img/user/big-vip.svg">
        </div>
        <div class="flex flex-col gap-2 self-center">
            <div class="flex gap-2 items-center">
                <h1 class="text-2xl font-bold">{{ user.name }}</h1>
                <img class="h-5" v-if="user.vipLabel" :src="user.vipLabel">
            </div>
            <span class="text-sm">{{ user.desc }}</span>
        </div>
        <div class="flex gap-2 ml-auto">
            <div v-for="[k, v] in Object.entries(user.stat)" class="flex flex-col text-sm text-center">
                <span class="desc">{{ $t('user.stat.' + k) }}</span>
                <span>{{ v }}</span>
            </div>
        </div>
        <button class="primary-color" @click="req('exit')">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
            <span>{{ $t('user.exit') }}</span>
        </button>
    </div>
</div>
<template v-else>
<div class="flex flex-col items-center gap-4 m-16">
    <h1>{{ $t('user.scan') }}</h1>
    <div class="relative flex w-[160px] p-2 rounded-lg bg-white">
        <img v-if="v.scanStatus === -1"
            src="@/assets/img/user/loadTV.gif"
            class="absolute m-[22px]"
        />
        <div v-if="v.scanStatus === 86038 || v.scanStatus === 86090" @click="req('scan')"
            class="absolute flex flex-col items-center justify-center gap-2 w-36 h-36 bg-white cursor-pointer"
        >
            <i
                class="fa-solid text-[var(--primary-color)] text-2xl"
                :class="{ 'fa-arrow-rotate-right': v.scanStatus === 86038, 'fa-check': v.scanStatus === 86090 }"
            ></i>
            <span class="desc m-0">{{ $t('user.info.' + v.scanStatus) }}</span>
        </div>
        <canvas ref="qrcode" class="w-36 h-36"></canvas>
    </div>
    <span class="desc">{{ $t('user.getScan') }}</span>
</div>
<div class="flex flex-col items-center gap-4 mr-16">
    <div class="flex gap-8 tabs">
        <h1 @click="v.tab = 0" :class="{ 'active': !v.tab }">{{ $t('user.pwd') }}</h1>
        <h1 @click="v.tab = 1" :class="{ 'active':  v.tab }">{{ $t('user.sms') }}</h1>
    </div>
    <div class="w-96 flex flex-col form">
        <div class="flex">
            <Dropdown v-if="v.tab" class="dropdown inline-block min-w-[52px]"
                :drop="v.countries" v-model="v.cid"
            />
            <span v-else>{{ $t('user.account') }}</span>
            <input
                type="text" spellcheck="false"
                :placeholder="$t('user.input', [v.tab ? $t('user.phone') : $t('user.account')])"
                v-model="form[1]"
            />
            <button v-if="v.tab" class="h-5 bg-transparent p-0 ml-auto" @click="req('sendSms')">{{ $t('user.sendSms') }}</button>
        </div>
        <hr class="m-0" />
        <div>
            <span>{{ v.tab ? $t('user.code') : $t('user.password') }}</span>
            <input
                type="text" spellcheck="false"
                :placeholder="$t('user.input', [v.tab ? $t('user.code') : $t('user.password')])"
                v-model="form[2]"
            />
        </div>
    </div>
    <button class="w-full h-10 mb-[17px] primary-color" @click="v.tab ? req('sms') : req('pwd')">
        <i class="fa-solid fa-arrow-right-to-bracket"></i>
        <span>{{ $t('user.login') }}</span>
    </button>
    <span class="desc">{{ $t('user.agree', [$t('info.data')]) }}</span>
</div>
</template>
</div>
</template>

<script lang="ts" setup>
import { onActivated, onDeactivated, reactive, ref } from 'vue';
import { useUserStore } from '@/store';
import { useRouter } from 'vue-router';
import Dropdown from '@/components/Dropdown.vue';

import { ApplicationError } from '@/services/utils';
import { commands } from '@/services/backend';
import * as login from '@/services/login';

const user = useUserStore();
const router = useRouter();

const qrcode = ref<HTMLCanvasElement>();
const v = reactive({
    cid: 0,
    captchaKey: '',
    countries: [] as { id: string; name: string }[],
    scanStatus: -1,
    tab: 0,
})

const form = reactive({ 1: '', 2: '' });

async function req(type: 'init' | 'scan' | 'pwd' | 'sms' | 'sendSms' | 'exit') {
    try {
    let status = -1;
    switch (type) {
    case 'init': {
        req('scan');
        v.cid = await login.getZoneCode();
        v.countries = (await login.getCountryList()).map(v => ({
            id: v.country_id, name: '+' + v.country_id
        }));
        break;
    }
    case 'scan': {
        if (!qrcode.value) return;
        v.scanStatus = -1;
        qrcode.value.height = 144; // reset canvas
        const key = await login.genQrcode(qrcode.value);
        status = await login.scanLogin(key, (code) => v.scanStatus = code);
        break;
    }
    case 'pwd': {
        if (!form[1] || !form[2]) return;
        status = await login.pwdLogin(form[1], form[2]);
        break;
    }
    case 'sms': {
        if (!form[1] || !form[2] || !v.captchaKey) return;
        status = await login.smsLogin(v.cid, form[1], form[2], v.captchaKey);
        break;
    }
    case 'sendSms': {
        if (!form[1] || !v.cid) return;
        v.captchaKey = await login.sendSmsCode(v.cid, form[1]);
        break;
    }
    case 'exit': {
        status = await login.exitLogin();
        break;
    }
    }
    if (status === 0) {
        router.push('/');
        await login.fetchUser();
    }
    } catch(err) {
        new ApplicationError(err).handleError();
    }
}

onActivated(() => !user.isLogin && req('init'));
onDeactivated(commands.stopLogin);
</script>

<style lang="scss" scoped>
h1 {
    @apply text-lg;
}
:deep(.dropdown > button) {
    @apply h-5 p-0 bg-transparent;
}
.tabs h1 {
    @apply cursor-pointer;
    &.active {
        @apply text-[var(--primary-color)];
    }
}
.form {
    @apply rounded-lg border border-solid border-[var(--split-color)];
    & > div {
        @apply px-5 py-2.5;
    }
    span {
        @apply text-sm mr-2.5;
    }
    input {
        @apply h-5 bg-transparent;
    }
}
.desc {
    @apply text-center;
}
</style>