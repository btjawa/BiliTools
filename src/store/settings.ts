import { defineStore } from "pinia";
import { Settings } from "@/services/backend";

export const useSettingsStore = defineStore('settings', {
    state: (): Settings => ({
        down_dir: String(),
        temp_dir: String(),
        max_conc: Number(),
        df_dms: Number(),
        df_ads: Number(),
        df_cdc: Number(),
        language: String(),
        theme: 'dark',
        auto_check_update: false,
        filename: String(),
        proxy: {
            addr: String(),
            username: String(),
            password: String(),
        },
        advanced: {
            auto_convert_flac: true,
            prefer_pb_danmaku: true,
        }
    }),
    getters: {
        isDark: (s) => s.theme === 'dark',
        dynFa(): string {
            return this.isDark ? 'fa-solid' : 'fa-light';
        },
        proxyUrl: (s) => {
            if (!s.proxy.addr.length) return null;
            const url = new URL(s.proxy.addr);
            url.username = s.proxy.username || '';
            url.password = s.proxy.password || '';
            return url.toString();
        }
    }
});