import { defineStore } from "pinia";
import { Headers } from "@/services/backend";

interface State {
    inited: boolean,
    headers: Headers,
    goInstance?: WebAssembly.Instance | null,
    cache: {
        log: number,
        temp: number,
        webview: number,
        database: number,
    },
}

export const useAppStore = defineStore('app', {
    state: (): State => ({
        inited: false,
        headers: {} as Headers,
        goInstance: null,
        cache: {
            log: Number(),
            temp: Number(),
            webview: Number(),
            database: Number(),
        },
    })
});