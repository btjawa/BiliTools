import { createStore } from 'vuex';
import { invoke } from '@tauri-apps/api/core';
import * as http from '@tauri-apps/plugin-http';
import { UserInfoResp } from '../types/UserInfo.type';
import * as verify from "../scripts/verify";

interface UserData {
    avatar: string,
    name: string,
    desc: string,
    mid: string,
    sex: string,
    coins: number,
    level: number,
    vip: string,
    vip_status: boolean,
    top_photo: string,
    isLogin: boolean
}

export default createStore({
    state() {
        return {
            user: {
                avatar: "", name: "", desc: "",
                mid: "0", coins: 0, level: 0,
                vip: "", sex: "", vip_status: false,
                top_photo: "", isLogin: false,
            } as UserData,
            secret: "",
            headers: {},
            inited: false,
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
        },
        updateHeaders(state, payload) {
            state.headers = payload;
        }
    },
    actions: {
        async init({ commit, state }) {
            commit('updateState', { secret: await invoke('ready') });
            commit('updateState', { 'user.mid': await invoke('init', { secret: state.secret }) });
            await this.dispatch('fetchUser');
        },
        async fetchUser({ commit, state }) {
            if (state.user.mid != "0") {
                const signature = await verify.wbi({ mid: state.user.mid });
                const details = await (await http.fetch('https://api.bilibili.com/x/space/wbi/acc/info?' + signature, {
                    headers: state.headers, method: 'GET'
                })).json() as UserInfoResp;
                const userData: UserData = {
                    avatar: details.data.face, name: details.data.name, desc: details.data.sign,
                    top_photo: (details.data.top_photo).replace('http:', 'https:'),
                    vip: (details.data.vip.label.img_label_uri_hans_static).replace('http:', 'https:'),
                    vip_status: Boolean(details.data.vip.status), coins: details.data.coins,
                    sex: details.data.sex, level: details.data.level, mid: state.user.mid, isLogin: true
                };
                commit('updateState', { 'user': userData });
                commit('updateState', { 'inited': true });
            }
        },
    },
});
