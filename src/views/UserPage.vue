<template>
  <div>
    <div
      class="flex h-fit max-w-7xl m-auto bg-(--block-color) rounded-lg"
      :class="{
        'flex-row w-fit': !user.isLogin,
        'w-full': user.isLogin,
      }"
    >
      <div v-if="user.isLogin" class="w-full">
        <div class="relative">
          <div
            class="absolute w-full h-full z-10 bg-linear-to-b from-transparent to-black/50"
          ></div>
          <Image
            class="z-0 rounded-b-none"
            :src="user.topPhoto"
            :ratio="856 / 170"
          />
        </div>
        <div class="flex p-6 gap-4 items-end">
          <div class="relative w-fit">
            <Image class="rounded-full! z-0" :height="100" :src="user.avatar" />
            <img
              v-if="user.vipLabel"
              class="absolute w-7 right-0 bottom-0"
              src="@/assets/img/user/big-vip.svg"
            />
          </div>
          <div class="flex flex-col gap-1 self-center flex-1 min-w-0">
            <div class="flex gap-2 items-center">
              <h1 class="text-2xl font-bold truncate">{{ user.name }}</h1>
              <Image
                v-if="user.vipLabel"
                class="h-5 shrink-0"
                :height="24"
                :ratio="274 / 66"
                :src="user.vipLabel"
              />
            </div>
            <span class="text-sm">{{ user.desc }}</span>
          </div>
          <div class="flex gap-2">
            <div
              v-for="[k, i] in Object.entries(user.stat)"
              :key="k"
              class="flex flex-col text-sm text-center"
            >
              <span class="desc">{{ $t('user.stat.' + k) }}</span>
              <span>{{ i }}</span>
            </div>
          </div>
          <button class="primary-color" @click="req('exit')">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
            <span>{{ $t('user.exit') }}</span>
          </button>
        </div>
      </div>
      <template v-else>
        <div class="flex flex-col items-center gap-4 m-16 mr-8 w-fit">
          <h1>{{ $t('user.scan') }}</h1>
          <div class="relative flex w-[160px] p-2 rounded-lg bg-white">
            <img
              v-if="v.scanStatus === -1"
              src="@/assets/img/user/loadTV.gif"
              class="absolute m-[22px]"
            />
            <div
              v-if="v.scanStatus === 86038 || v.scanStatus === 86090"
              class="absolute flex flex-col items-center justify-center gap-2 w-36 h-36 bg-white cursor-pointer"
              @click="req('scan')"
            >
              <i
                class="fa-solid text-(--primary-color) text-2xl"
                :class="{
                  'fa-arrow-rotate-right': v.scanStatus === 86038,
                  'fa-check': v.scanStatus === 86090,
                }"
              ></i>
              <span class="desc m-0">{{
                $t('user.info.' + v.scanStatus)
              }}</span>
            </div>
            <canvas ref="qrcode" class="w-36 h-36"></canvas>
          </div>
          <span class="desc">{{ $t('user.getScan') }}</span>
        </div>
        <div class="flex flex-col items-center gap-4 m-16 ml-8">
          <div class="flex gap-8 tabs">
            <h1 :class="{ active: !v.tab }" @click="v.tab = 0">
              {{ $t('user.pwd') }}
            </h1>
            <h1 :class="{ active: v.tab }" @click="v.tab = 1">
              {{ $t('user.sms') }}
            </h1>
          </div>
          <div class="w-96 flex flex-col form">
            <div class="flex">
              <Dropdown
                v-if="v.tab"
                v-model="v.cid"
                class="flat min-w-[52px]"
                :drop="v.countries"
              />
              <span v-else>{{ $t('user.account') }}</span>
              <input
                v-model="form[v.tab][1]"
                type="text"
                spellcheck="false"
                :placeholder="
                  $t('user.input', [
                    v.tab ? $t('user.phone') : $t('user.account'),
                  ])
                "
              />
              <button
                v-if="v.tab"
                class="h-5 bg-transparent p-0 ml-auto"
                @click="req('sendSms')"
              >
                {{ $t('user.sendSms') }}
              </button>
            </div>
            <hr class="m-0" />
            <div>
              <span>{{ v.tab ? $t('user.code') : $t('user.password') }}</span>
              <input
                v-model="form[v.tab][2]"
                :type="v.tab ? 'text' : 'password'"
                spellcheck="false"
                :placeholder="
                  $t('user.input', [
                    v.tab ? $t('user.code') : $t('user.password'),
                  ])
                "
              />
            </div>
          </div>
          <button
            class="w-full h-10 mb-[17px] primary-color"
            @click="v.tab ? req('sms') : req('pwd')"
          >
            <i class="fa-solid fa-arrow-right-to-bracket"></i>
            <span>{{ $t('user.login') }}</span>
          </button>
          <span class="desc">{{ $t('user.agree', [$t('info.data')]) }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onActivated, onDeactivated, reactive, ref } from 'vue';
import { useUserStore } from '@/store';
import { useRouter } from 'vue-router';
import { Dropdown, Image } from '@/components';

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
  tab: 1 as 0 | 1,
});

const form = reactive({
  0: [],
  1: [],
});

async function req(type: 'init' | 'scan' | 'pwd' | 'sms' | 'sendSms' | 'exit') {
  let status = -1;
  const pwd = form[0];
  const sms = form[1];
  switch (type) {
    case 'init': {
      req('scan');
      v.cid = await login.getZoneCode();
      v.countries = (await login.getCountryList()).map((v) => ({
        id: v.country_id,
        name: '+' + v.country_id,
      }));
      break;
    }
    case 'scan': {
      if (!qrcode.value) return;
      v.scanStatus = -1;
      qrcode.value.height = 144; // reset canvas
      const key = await login.genQrcode(qrcode.value);
      status = await login.scanLogin(key, (code) => (v.scanStatus = code));
      break;
    }
    case 'pwd': {
      if (!pwd[1] || !pwd[2]) return;
      status = await login.pwdLogin(pwd[1], pwd[2]);
      break;
    }
    case 'sms': {
      if (!sms[1] || !sms[2] || !v.captchaKey) return;
      status = await login.smsLogin(v.cid, sms[1], sms[2], v.captchaKey);
      break;
    }
    case 'sendSms': {
      if (!sms[1] || !v.cid) return;
      v.captchaKey = await login.sendSmsCode(v.cid, sms[1]);
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
}

onActivated(() => !user.isLogin && req('init'));
onDeactivated(commands.stopLogin);
</script>

<style scoped>
@reference 'tailwindcss';

h1 {
  @apply text-lg;
}
.tabs h1 {
  @apply cursor-pointer;
  &.active {
    @apply text-(--primary-color);
  }
}
.form {
  @apply rounded-lg border border-solid border-(--split-color);
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
