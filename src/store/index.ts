import { createStore } from 'vuex';
import { invoke } from '@tauri-apps/api/core';
import { iziError } from '@/services/utils';
import { fetch } from '@tauri-apps/plugin-http';
import * as types from '@/types';
import * as auth from "@/services/auth";
import { checkUpdate } from '@/services/updater';
import { MediaInfo, QueueInfo } from '../types/DataTypes';
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
                down_dir: '',
                temp_dir: '',
                max_conc: -1,
                df_dms: 32,
                df_ads: 30280,
                df_cdc: 7
            },
            data: {
                inited: false,
                secret: '',
                tempCount: '',
                headers: {},
                mediaInfo: {} as MediaInfo,
                mediaMap: {
                    dms: [
                        { id: 16, label: '360P 流畅', login: false },
                        { id: 32, label: '480P 清晰', login: false },
                        { id: 64, label: '720P 高清', login: true },
                        { id: 80, label: '1080P 高清', login: true },
                        { id: 112, label: '1080P+ 高码率', login: true },
                        { id: 116, label: '1080P60 高帧率', login: true },
                        { id: 120, label: '4K 超清', login: true },
                        { id: 125, label: 'HDR 真彩', login: true },
                        { id: 126, label: '杜比视界', login: true },
                        { id: 127, label: '8K 超高清', login: true }
                    ],
                    ads: [
                        { id: 30216, label: '64K', login: false },
                        { id: 30232, label: '132K', login: false },
                        { id: 30280, label: '192K', login: false },
                        { id: 30250, label: '杜比全景声', login: true },
                        { id: 30251, label: 'Hi-Res无损', login: true }
                    ],
                    cdc: [
                        { id: 7, label: 'AVC 编码', login: false },
                        { id: 12, label: 'HEVC 编码', login: false },
                        { id: 13, label: 'AV1 编码', login: false },
                    ],        
                },
                mediaProfile: {
                    dms: [16],
                    ads: [30216],
                    cdc: [7],
                }
            },
            queue: {
                waiting: [] as QueueInfo[],
                doing: [] as QueueInfo[],
                complete: [] as QueueInfo[],
            }
        };
    },
    mutations: {
        updateState(state, payload) {
            Object.entries(payload).forEach(([key, value]) => {
                if (key.includes('.')) {
                    const keys = key.split('.');
                    let current = state as any;
                    for (let i = 0; i < keys.length - 1; i++) {
                        current = current[keys[i]];
                    }
                    current[keys[keys.length - 1]] = value;
                } else (state as any)[key] = value;
            });
        },
        pushToArray(state, payload) {
            Object.entries(payload).forEach(([key, value]) => {
                if (key.includes('.')) {
                    const keys = key.split('.');
                    let current = state as any;
                    for (let i = 0; i < keys.length - 1; i++) {
                        current = current[keys[i]];
                    }
                    const lastKey = keys[keys.length - 1];
                    if (Array.isArray(current[lastKey])) {
                        current[lastKey].push(value);
                    } else console.warn(`Attempt to push to a non-array property ${key}`);
                } else if (Array.isArray((state as any)[key])) {
                    (state as any)[key].push(value);
                } else console.warn(`Attempt to push to a non-array property ${key}`);
            });
        }
    },
    actions: {
        async init({ commit, state }) {
            try {
                checkUpdate();
                commit('updateState', { 'data.secret': await invoke('ready') });
                await invoke('init', { secret: state.data.secret });
                await this.dispatch('fetchUser');
                emit('stop_login');
            } catch(err) {
                iziError(err);
                return null;
            }
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
                await auth.checkRefresh();
            } else {
                iziError(details.code + ", " + details.message)
            };
        },
    },
});
