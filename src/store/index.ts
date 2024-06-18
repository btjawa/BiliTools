import { createStore } from 'vuex';
import { invoke } from '@tauri-apps/api/core';
import { iziError } from '@/services/utils';
import { fetch } from '@tauri-apps/plugin-http';
import * as types from '@/types';
import * as auth from "../services/auth";
import { MediaInfo } from '../types/DataTypes';
import { emit } from '@tauri-apps/api/event';

interface Headers {
    "User-Agent": string,
    Referer: string,
    Origin: string,
    Cookie: string
}

export default createStore({
    state() {
        return {
            user: {
                avatar: "", name: "", desc: "",
                mid: 0, coins: 0, level: 0,
                vip: "", sex: "", vipStatus: false,
                topPhoto: "", isLogin: false
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
                mediaProfile: {
                    dms: [16],
                    ads: [30216],
                    cdc: [7],
                    currSel: {
                        dms: 16,
                        ads: 30216,
                        cdc: 7,
                    }
                }
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
            await invoke('init', { secret: state.data.secret });
            await auth.checkRefresh();
            await this.dispatch('fetchUser');
            emit('stop_login');
        },
        async fetchUser({ commit, state }, login: Boolean) {
            const mid = await new Promise(resolve => {
                let interval: NodeJS.Timeout;
                const check = () => { const mid = (state.data.headers as Headers).Cookie?.match(/DedeUserID=(\d+);/)?.[1]; if (mid) { clearInterval(interval); resolve(mid) } };
                if (login) interval = setInterval(check, 100); else resolve((state.data.headers as Headers).Cookie?.match(/DedeUserID=(\d+);/)?.[1] || 0);
            });
            if (mid == 0) {
                commit('updateState', { 'user.isLogin': false, 'data.inited': true });
                return null;
            }
            const signature = await auth.wbi({ mid });
            const details = await (await fetch('https://api.bilibili.com/x/space/wbi/acc/info?'
            + signature, { headers: state.data.headers })).json() as types.userInfo.UserInfoResp;
            if (details.code == 0) {
                const arrayBuffer = await (await fetch((details.data.top_photo).replace('http:', 'https:'),
                { headers: state.data.headers })).arrayBuffer();
                const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                const userData = {
                    avatar: details.data.face, name: details.data.name, desc: details.data.sign,
                    topPhoto: `data:image/jpeg;base64,${base64}`,
                    vip: (details.data.vip.label.img_label_uri_hans_static).replace('http:', 'https:'),
                    vipStatus: Boolean(details.data.vip.status), coins: details.data.coins,
                    sex: details.data.sex, level: details.data.level, mid, isLogin: true
                };
                commit('updateState', { 'user': userData, 'data.inited': true });
            } else {
                iziError(details.code + ", " + details.message)
            };
        },
    },
});
