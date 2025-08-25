import { defineStore } from "pinia";
import { HeadersData } from "@/services/backend";

export const useAppStore = defineStore('app', {
    state: () => ({
        version: String(),
        hash: String(),
        secret: String(),
        inited: false,
        headers: {} as HeadersData,
        cache: {
            log: Number(),
            temp: Number(),
            webview: Number(),
            database: Number(),
        },
        paths: {
            log: String(),
            temp: String(),
            webview: String(),
            database: String(),
        }
    })
});