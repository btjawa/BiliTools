import { defineStore } from "pinia";
import { Settings } from "@/services/backend";
import { ProxyConfig } from "@tauri-apps/plugin-http";

export const useSettingsStore = defineStore('settings', {
    state: (): Settings => ({
        add_metadata: true,
        auto_download: false,
        check_update: true,
        default: {
            res: Number(),
            abr: Number(),
            enc: Number(),
        },
        down_dir: String(),
        format: {
            filename: String(),
            folder: String(),
            favorite: String(),
        },
        language: String(),
        max_conc: Number(),
        temp_dir: String(),
        theme: 'dark',
        protobuf_danmaku: true,
        proxy: {
            address: String(),
            username: String(),
            password: String(),
        }
    }),
    getters: {
        isDark(s) { return s.theme === 'auto' ? window.matchMedia('(prefers-color-scheme: dark)').matches : s.theme === 'dark' },
        dynFa(): string {
            return this.isDark ? 'fa-solid' : 'fa-light';
        },
        proxyUrl: (s) => {
            if (!s.proxy.address.length) return null;
            const url = new URL(s.proxy.address);
            url.username = s.proxy.username || '';
            url.password = s.proxy.password || '';
            return url.toString();
        },
        proxyConfig(): ProxyConfig { return {
            url: this.proxy.address || '*',
            basicAuth: {
                username: this.proxy.username,
                password: this.proxy.password,
            },
            noProxy: this.proxy.address ? undefined : '*',
        }},
    },
});