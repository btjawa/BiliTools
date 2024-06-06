<template>
<div class="user-page">
    <div class="profile" v-if="user.isLogin">
        <div class="profile__top_photo" :style="{ opacity: base64Img ? 1 : 0 }"><img :src=base64Img draggable="false" /></div>
        <div class="profile__details">
            <div class="profile__avatar_cont">
                <img :src="user.avatar" draggable="false" class="profile__avatar" />
                <img src="@/assets/img/big-vip.svg" draggable="false" class="profile__big_vip" v-if="user.vip_status" />
            </div>
            <div class="profile__text_area">
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
                <div class="profile__exit_login" @click="exit">
                    <i class="fa-regular fa-arrow-right-from-arc"></i>
                    <span>退出登录</span>
                </div>
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
            <div class="login__scan_desc">
                <p>请使用<a href="https://app.bilibili.com/" target="_blank">哔哩哔哩客户端</a></p>
                <p>扫码登录或扫码下载APP</p>
            </div>
        </div>
        <div class="login__main_split"></div>
        <div class="login__pwd_wp"></div>
    </div>
</div>
</template>

<script lang="ts">
import { utils, login } from '@/services';
import { fetch } from '@tauri-apps/plugin-http';
import { invoke } from '@tauri-apps/api/core';
import { emit } from "@tauri-apps/api/event";
import store from '@/store';

export default {
    data() {
        return { base64Img: '' };
    },
    computed: {
        user() { return store.state.user },
        headers() { return store.state.data.headers },
        levelIcon() {
            return new URL(`../assets/img/level/level${this.user.level}.svg`, import.meta.url).href
        },
        sexDesc() {
            const sex = this.user.sex;
            return sex == '男' ? 'mars' : sex == '女' ? 'venus' : 'question';
        },
    },
    methods: {
        async fetchImage(url: string) {
            const arrayBuffer = await (await fetch(url, {
                headers: this.headers, method: 'GET'
            })).arrayBuffer();
            const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
            this.base64Img = `data:image/jpeg;base64,${base64}`;
        },
        async login() {
            login.scanLogin(this.$refs.qrcodeBox as HTMLCanvasElement).then(mid => {
                if (mid !== 0) {
                    utils.iziInfo('登录成功~')
                    this.$router.push('/');
                    setTimeout(() => store.dispatch('fetchUser', mid), 300);
                }
            })
        },
        async exit() {
            const loadingBox = document.querySelector('.loading');
            if (loadingBox) loadingBox.classList.add('active');
            const mid = Number(await invoke('exit'));
            if (loadingBox) loadingBox.classList.remove('active');
            this.$router.push('/');
            setTimeout(() => store.dispatch('fetchUser', mid), 300);
        },
    },
    deactivated() {
        emit('stop_login');
    },
    activated() {
        if (this.user.isLogin) {
            this.fetchImage(this.user.top_photo);
        } else this.login();
    },
};
</script>

<style>
.profile .profile__text_area,
.login__scan_wp, .login__pwd_wp,
.profile__operates {
    display: flex;
    flex-direction: column;
}

.profile__text_area {
    margin-right: auto;
}

.profile, .login {
    position: relative;
    border-radius: var(--block-radius);
    background: var(--section-color);
    border: #333333 solid 1px;
    height: 240px;
}

.login {
    display: flex;
    width: 820px;
    height: 430px;
    padding: 52px 65px 29px 92px;
    background-image: url("../assets/img/22_open.png"),
                      url("../assets/img/33_open.png");
    background-position: 0 100%, 100% 100%;
    background-repeat: no-repeat, no-repeat;
    background-size: 14%;
}

.profile__top_photo, .profile__top_photo img, .profile::after {
    width: 912.75px;
    height: 142.6171875px;
    border-radius: var(--block-radius);
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    transition: opacity 0.5s;
}

.profile::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    border-bottom: #333333 solid 1px;
    background: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.13) 25%, rgba(0,0,0,0.26) 50%, rgba(0,0,0,0.4) 75%, rgba(0,0,0,0.66) 100%);
}

.profile__details {
    position: absolute;
    bottom: 0;
    width: 100%;
    padding: 0 30px 15px 30px;
    display: flex;
}

.profile__avatar_cont, .profile__avatar {
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

.profile__name, .profile__exit_login {
    display: flex;
    margin-top: auto;
    align-items: center;
}

.profile__name span,
.profile__desc {
    display: inline-block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.profile__name span {
    font-size: 20px;
    font-weight: 700;
    max-width: 40%;
    margin-top: auto;
}

.profile__name img {
    margin-left: 12px;
}

.profile__level {
    height: 15px;
}

.profile__vip_label {
    height: 18px;
}

.profile__desc, .profile__desc span {
    font-size: 13px;
    line-height: 22px;
    color: var(--desc-color);
}

.profile__desc i, .profile__mid {
    color: rgb(79,82,89);
    font-size: 12px;
}

.profile__desc span {
    margin-left: 8px;
}

.profile__operates {
    font-size: 13px;
}

.profile__operates div {
    padding: 8px;
    transition: color 0.2s;
}

.profile__operates div:hover {
    color: rgb(212,78,125);
    cursor: pointer;
}

.profile__operates i {
    margin-right: 6px;
}

.login__scan_wp, .login__pwd_wp,
.login__scan_box {
    display: flex;
    align-items: center;
}

.login__scan_title {
    font-size: 18px;
    margin-bottom: 26px;
}

.login__scan_box {
    border-radius: var(--block-radius);
    border: solid #444 2px;
    width: 180px;
    height: 180px;
    justify-content: center;
    transition: opacity 0.4s;
}

.login__scan_tips {
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

.login__scan_desc {
    font-size: 13px;
    margin-top: 18px;
    text-align: center;
}

.login__scan_desc a {
    color: #3086bf;
    text-decoration: none;
}

.login__main_split {
    height: 70%;
    width: 1px;
    background: var(--split-color);
    margin: 43px 44px 0 45px;
}
</style>