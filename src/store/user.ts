import { defineStore } from "pinia";

interface State {
    avatar: string,
    name: string,
    desc: string,
    mid: number,
    level: number,
    vipLabel: string,
    topPhoto: string,
    stat: {
        coins: number,
        following: number,
        follower: number,
        dynamic: number,
    },
}

export const useUserStore = defineStore('user', {
    state: (): State => ({
        avatar: String(),
        name: String(),
        desc: String(),
        mid: Number(),
        level: Number(),
        vipLabel: String(),
        topPhoto: String(),
        stat: {
            coins: Number(),
            following: Number(),
            follower: Number(),
            dynamic: Number(),
        }
    }),
    getters: {
        isLogin: (s) => !!s.mid,
        getAvatar(s): string {
            return this.isLogin ? s.avatar : new URL('@/assets/img/profile/default-avatar.jpg', import.meta.url).href;
        }
    }
});