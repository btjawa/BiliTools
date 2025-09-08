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
            if (this.isLogin) return s.avatar;
            const randomNum = Math.floor(Math.random() * 13) + 1;
            return `/src/assets/img/user/default-avatar/default-avatar-${randomNum}.jpg`;
        }
    }
});