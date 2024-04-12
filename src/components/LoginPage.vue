<template>
<div class="login-page">
    <div class="user-profile" v-if="user.isLogin">
        <div class="user-profile__top_photo" :style="{ opacity: base64Img ? 1 : 0 }"><img :src=base64Img draggable="false" /></div>
        <div class="user-profile__details">
            <div class="user-profile__avatar_cont">
                <img :src="user.avatar" draggable="false" class="user-profile__avatar" />
                <img src="../assets/big-vip.svg" draggable="false" class="user-profile__big_vip" v-if="user.vip_status" />
            </div>
            <div class="user-profile__text_area">
                <div class="user-profile__name">
                    <span>{{ user.name }}</span>
                    <img :src="levelIcon" draggable="false" class="user-profile__level" />
                    <img :src="user.vip" draggable="false" class="user-profile__vip_label" />
                </div>
                <span class="user-profile__desc"><div>{{ user.desc }}</div>
                    <i :class="'fa-regular fa-' + sexDesc"></i>
                    <span class="user-profile__mid">
                        <i class="fa-regular fa-id-card"></i>
                        {{ user.mid }}
                    </span>
                    <span class="user-profile__coin">
                        <i class="fa-regular fa-coin-front"></i>
                        {{ user.coins }}
                    </span>
                </span>
            </div>
            <div class="user-profile__operates">
                <div class="user-profile__exit_login" @click="exit">
                    <i class="fa-regular fa-arrow-right-from-arc"></i>
                    <span>退出登录</span>
                </div>
            </div>
        </div>
    </div>
    <div class="user-login" v-if="!user.isLogin">
        <div class="user-login__scan_wp">
            <div class="user-login__scan_title">扫描二维码登录</div>
            <div class="user-login__scan_box">
                <div class="user-login__qrcode" ref="qrcodeBox"></div>
            </div>
            <div class="user-login__scan_tips" ref="qrcodeTips"></div>
            <div class="user-login__scan_desc">
                <p>请使用<a href="https://app.bilibili.com/" target="_blank">哔哩哔哩客户端</a></p>
                <p>扫码登录或扫码下载APP</p>
            </div>
        </div>
        <div class="user-login__main_split"></div>
        <div class="user-login__pwd_wp"></div>
    </div>
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { iziInfo } from '../scripts/utils';
import { invoke } from '@tauri-apps/api/core';
import { emit } from "@tauri-apps/api/event";
import * as login from '../scripts/login';
import * as http from '../scripts/http';

export default defineComponent({
    data() {
        return { base64Img: '' };
    },
    computed: {
        user() { return this.$store.state.user },
        headers() { return this.$store.state.headers },
        levelIcon() { return new URL(`../assets/level/level${this.user.level}.svg`, import.meta.url).href },
        sexDesc() {
            const sex = this.user.sex;
            return sex == '男' ? 'mars' : sex == '女' ? 'venus' : 'question';
        },
    },
    methods: {
        async fetchImage(url: string) {
            const arrayBuffer = await (await http.fetch(url, {
                headers: this.headers, method: 'GET'
            })).arrayBuffer();
            const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
            this.base64Img = `data:image/jpeg;base64,${base64}`;
        },
        async login() {
            login.scanLogin(this.$refs.qrcodeBox as HTMLElement).then(mid => {
                if (mid !== 0) {
                    iziInfo('登录成功~')
                    this.$router.push('/');
                    setTimeout(() => this.$store.dispatch('fetchUser', mid), 300);
                }
            })
        },
        async exit() {
            const loadingBox = document.querySelector('.loading');
            if (loadingBox) loadingBox.classList.add('active');
            const mid = Number(await invoke('exit'));
            if (loadingBox) loadingBox.classList.remove('active');
            this.$router.push('/');
            setTimeout(() => this.$store.dispatch('fetchUser', mid), 300);
        },
    },
    unmounted() {
        emit('stop_login');
    },
    activated() {
        if (this.user.isLogin) {
            this.fetchImage(this.user.top_photo);
        } else this.login();
    },
});
</script>

<style>
.user-profile .user-profile__text_area,
.user-login__scan_wp, .user-login__pwd_wp,
.user-profile__operates {
    display: flex;
    flex-direction: column;
}

.user-profile__text_area {
    margin-right: auto;
}

.user-profile, .user-login {
    position: relative;
    border-radius: 20px;
    background: var(--block-color);
    border: #333333 solid 1px;
    height: 240px;
}

.user-login {
    display: flex;
    width: 820px;
    height: 430px;
    padding: 52px 65px 29px 92px;
    background-image: url("../assets/22_open.png"),
                      url("../assets/33_open.png");
    background-position: 0 100%, 100% 100%;
    background-repeat: no-repeat, no-repeat;
    background-size: 14%;
    user-select: none;
}

.user-profile__top_photo, .user-profile__top_photo img, .user-profile::after {
    width: 912.75px;
    height: 142.6171875px;
    user-select: none;
    border-radius: 20px 20px 0 0;
    transition: opacity 0.5s;
}

.user-profile::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    border-bottom: #333333 solid 1px;
    background: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.13) 25%, rgba(0,0,0,0.26) 50%, rgba(0,0,0,0.4) 75%, rgba(0,0,0,0.66) 100%);
}

.user-profile__details {
    position: absolute;
    bottom: 0;
    width: 100%;
    padding: 0 30px 15px 30px;
    display: flex;
}

.user-profile__avatar_cont, .user-profile__avatar {
    position: relative;
    height: 90px;
    user-select: none;
    z-index: 1;
}

.user-profile__avatar_cont {
    margin-right: 20px;
}

.user-profile__avatar {
    border: var(--block-color) 1px solid;
    border-radius: 50%;
}

.user-profile__big_vip {
    position: absolute;
    height: 25px;
    bottom: 0;
    right: 0;
    z-index: 1;
}

.user-profile__name, .user-profile__exit_login {
    display: flex;
    margin-top: auto;
    align-items: center;
}

.user-profile__name span,
.user-profile__desc {
    display: inline-block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.user-profile__name span {
    font-size: 20px;
    font-weight: 700;
    max-width: 40%;
    margin-top: auto;
}

.user-profile__name img {
    margin-left: 12px;
    user-select: none;
}

.user-profile__level {
    height: 15px;
}

.user-profile__vip_label {
    height: 18px;
}

.user-profile__desc, .user-profile__desc span {
    font-size: 13px;
    line-height: 22px;
    color: var(--desc-color);
}

.user-profile__desc i, .user-profile__mid {
    color: rgb(79,82,89);
    font-size: 12px;
}

.user-profile__desc span {
    margin-left: 8px;
}

.user-profile__operates {
    font-size: 13px;
    user-select: none;
}

.user-profile__operates div {
    padding: 8px;
    transition: color 0.2s;
}

.user-profile__operates div:hover {
    color: rgb(212,78,125);
    cursor: pointer;
}

.user-profile__operates i {
    margin-right: 6px;
}

.user-login__scan_wp, .user-login__pwd_wp,
.user-login__scan_box {
    display: flex;
    align-items: center;
}

.user-login__scan_title {
    font-size: 18px;
    margin-bottom: 26px;
}

.user-login__scan_box {
    border-radius: 8px;
    border: solid #444 2px;
    width: 180px;
    height: 180px;
    justify-content: center;
    transition: opacity 0.4s;
}

.user-login__scan_tips {
    position: absolute;
    opacity: 0;
    height: 173px;
    width: 330px;
    transform: translateX(0);
    transform: translateY(50px);
    background-size: 100% 100%;
    background-image: url("../assets/qr-tips.png");
    transition: opacity 0.4s;
}

.user-login__scan_desc {
    font-size: 13px;
    margin-top: 18px;
    text-align: center;
}

.user-login__scan_desc a {
    color: #3086bf;
    text-decoration: none;
}

.user-login__main_split {
    height: 70%;
    width: 1px;
    background-color: #444;
    margin: 43px 44px 0 45px;
}
</style>