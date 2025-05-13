import { defineStore } from "pinia";
import { commands, Settings } from "@/services/backend";
import { useAppStore } from "./app";
import { ProxyConfig } from "@tauri-apps/plugin-http";

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
        auto_download: false,
        proxy: {
            addr: String(),
            username: String(),
            password: String(),
        },
        advanced: {
            prefer_pb_danmaku: true,
            add_metadata: true,
            filename_format: String(),
        }
    }),
    getters: {
        isDark(s) { return s.theme === 'auto' ? window.matchMedia('(prefers-color-scheme: dark)').matches : s.theme === 'dark' },
        dynFa(): string {
            return this.isDark ? 'fa-solid' : 'fa-light';
        },
        proxyUrl: (s) => {
            if (!s.proxy.addr.length) return null;
            const url = new URL(s.proxy.addr);
            url.username = s.proxy.username || '';
            url.password = s.proxy.password || '';
            return url.toString();
        },
        proxyConfig(): ProxyConfig { return {
            url: this.proxy.addr || '*',
            basicAuth: {
                username: this.proxy.username,
                password: this.proxy.password,
            },
            noProxy: this.proxy.addr ? undefined : '*',
        }},
    },
    actions: {
        value(key: string) {
            return key.split('.').reduce((acc, part) => acc?.[part], this.$state as any);
        },
        async updateNest(key: string, value: string | number | Object) {
            const keys = key.split('.');
            let current = this.$state as any;
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            const secret = useAppStore().secret;
            const result = await commands.rwConfig('write', { [keys[0]]: (this.$state as any)[keys[0]] }, secret);
            if (result.status === 'error') throw result.error;
        },
    }
});