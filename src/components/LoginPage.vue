<template>
<div class="login-page">
    <div class="user-profile" v-if="store.state.user.isLogin">
        <div class="user-profile__top_photo" :style="{ opacity: base64Img ? 1 : 0 }"><img :src=base64Img draggable="false" /></div>
        <div class="user-profile__details">
            <div class="user-profile__avatar_cont">
                <img :src="store.state.user.avatar" draggable="false" class="user-profile__avatar" />
                <img src="../assets/big-vip.svg" draggable="false" class="user-profile__big_vip" v-if="store.state.user.vip_status" />
            </div>
            <div class="user-profile__text_area">
                <div class="user-profile__name">
                    <span>{{ store.state.user.name }}</span>
                    <img :src="levelIcon" draggable="false" class="user-profile__level" />
                    <img :src="store.state.user.vip" draggable="false" class="user-profile__vip_label" />
                </div>
                <span class="user-profile__desc"><div>{{ store.state.user.desc }}</div>
                    <i :class="'fa-regular fa-' + sexDesc"></i>
                    <span class="user-profile__mid">
                        <i class="fa-regular fa-id-card"></i>
                        {{ store.state.user.mid }}
                    </span>
                    <span class="user-profile__coin">
                        <i class="fa-regular fa-coin-front"></i>
                        {{ store.state.user.coins }}
                    </span>
                </span>
            </div>
            <div class="user-profile__data">
                
            </div>
        </div>
    </div>
    <div class="user-login" v-if="!store.state.user.isLogin">
    </div>
</div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useStore } from 'vuex';
import { http } from '@tauri-apps/api';

export default defineComponent({
    setup() {
        const store = useStore();
        const base64Img = ref('');
        const levelIcon = new URL(`../assets/level/level${store.state.user.level}.svg`, import.meta.url).href;
        const sex = store.state.user.sex;
        const sexDesc = sex=='男'?'mars':sex=='女'?'venus':'question';
        http.fetch(store.state.user.top_photo, {
            headers: store.state.headers, method: 'GET',
            responseType: http.ResponseType.Binary
        }).then(resp => {
            const binary = resp.data;
            const arrayBuffer = new Uint8Array(binary as any).buffer;
            const blob = new Blob([arrayBuffer]);
            const reader = new FileReader();
            reader.onloadend = function() {
                base64Img.value = reader.result as string;
            };
            reader.readAsDataURL(blob);
        });
        return { store, base64Img, levelIcon, sexDesc }
    }
});
</script>

<style>
.user-profile .user-profile__text_area {
    display: flex;
    flex-direction: column;
}

.user-profile {
    position: relative;
    border-radius: 20px;
    background: var(--block-color);
    height: 240px;
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

.user-profile__name {
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
</style>