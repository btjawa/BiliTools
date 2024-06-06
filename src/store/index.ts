import { createStore } from 'vuex';
import { invoke } from '@tauri-apps/api/core';
import { iziError } from '@/services/utils';
import { fetch } from '@tauri-apps/plugin-http';
import * as types from '@/types';
import * as verify from "../services/auth";
import { MediaInfo } from '../types/DataTypes';

export default createStore({
    state() {
        return {
            user: {
                avatar: "", name: "", desc: "",
                mid: 0, coins: 0, level: 0,
                vip: "", sex: "", vip_status: false,
                top_photo: "", isLogin: false,
            },
            settings: {
                down_dir: '加载中...',
                temp_dir: '加载中...',
                max_conc: -1,
                df_dms: 32,
                df_ads: 30280,
                df_cdc: 7
            },
            data: {
                inited: false,
                secret: '',
                tempCount: '加载中...',
                headers: {},
                mediaInfo: {} as MediaInfo,
            }
        };
    },
    mutations: {
        updateState(state, payload) {
            Object.entries(payload).forEach(([key, value]) => {
                if (key.includes('.')) {
                    const keys = key.split('.');
                    let current = state;
                    for (let i = 0; i < keys.length - 1; i++) {
                        current = (current as any)[keys[i]];
                    }
                    (current as any)[keys[keys.length - 1]] = value;
                } else (state as any)[key] = value;
            });
        }
    },
    actions: {
        async init({ commit, state }) {
            commit('updateState', { 'data.secret': await invoke('ready') });
            await this.dispatch('fetchUser', await invoke('init', { secret: state.data.secret }));
        },
        async fetchUser({ commit, state }, mid: number) {
            if (mid != 0) {
                const signature = await verify.wbi({ mid });
                const details = await (await fetch('https://api.bilibili.com/x/space/wbi/acc/info?'
                + signature, { headers: state.data.headers })).json() as types.userInfo.UserInfoResp;
                if (details.code == 0) {
                    const userData = {
                        avatar: details.data.face, name: details.data.name, desc: details.data.sign,
                        top_photo: (details.data.top_photo).replace('http:', 'https:'),
                        vip: (details.data.vip.label.img_label_uri_hans_static).replace('http:', 'https:'),
                        vip_status: Boolean(details.data.vip.status), coins: details.data.coins,
                        sex: details.data.sex, level: details.data.level, mid, isLogin: true
                    };
                    commit('updateState', { 'user': userData, 'data.inited': true });
                } else iziError(details.code + ", " + details.message);
            } else commit('updateState', { 'user.isLogin': false, 'data.inited': true });
        },
    },
});
