import { defineStore } from "pinia";

export const useUserStore = defineStore('user', {
    state: () => ({
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