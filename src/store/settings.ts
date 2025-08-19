import { defineStore } from "pinia";
import { Settings } from "@/services/backend";
import { computed, reactive, ref, toRefs } from "vue";

export const useSettingsStore = defineStore('settings', () => {
    const s = reactive<Settings>({
        add_metadata: true,
        auto_check_update: false, // for watch() to take effet when enabled
        auto_download: false,
        block_pcdn: true,
        check_update: true,
        clipboard: true,
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
        notify: true,
        task_folder: true,
        temp_dir: String(),
        theme: 'auto',
        proxy: {
            address: String(),
            username: String(),
            password: String(),
        },
        convert: {
            danmaku: true,
            mp3: false,
        }
    });

    const isDark = ref(window.matchMedia('(prefers-color-scheme: dark)').matches);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        isDark.value = e.matches;
    });

    const proxyUrl = computed(() => {
        if (!s.proxy.address.length) return null;
        const url = new URL(s.proxy.address);
        url.username = s.proxy.username || '';
        url.password = s.proxy.password || '';
        return url.toString();
    });

    const proxyConfig = computed(() => ({
        url: s.proxy.address || '*',
        basicAuth: {
            username: s.proxy.username,
            password: s.proxy.password,
        },
        noProxy: s.proxy.address ? undefined : '*',
    }));

    return { ...toRefs(s), isDark, proxyUrl, proxyConfig };
})