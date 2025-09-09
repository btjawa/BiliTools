import { defineStore } from "pinia";
import { HeadersData } from "@/services/backend";

export const useAppStore = defineStore('app', {
    state: () => ({
        version: String(),
        hash: String(),
        inited: false,
        isAlwaysOnTop: false,
        headers: {} as HeadersData,
        cache: {
            log: Number(),
            temp: Number(),
            webview: Number(),
            database: Number(),
        }
    })
});