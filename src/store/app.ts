import { defineStore } from "pinia";
import { CurrentSelect, Headers } from "@/services/backend";
import { DashInfo, DurlInfo, MusicUrlInfo } from '@/types/data.d';

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
    playUrlInfo: DashInfo | DurlInfo | MusicUrlInfo,
    currentSelect: CurrentSelect,
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
        playUrlInfo: {} as DashInfo,
        currentSelect: {
            dms: -1,
            ads: -1,
            cdc: -1,
            fmt: -1,
        }
    })
});