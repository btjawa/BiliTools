import { defineStore } from "pinia";

interface State {
    version: string,
    hash: string,
    secret: string,
    resources_path: string,
    mediaMap: {
        dms: { id: number }[],
        ads: { id: number }[],
        cdc: { id: number }[],
        fmt: { id: number }[],
    }
}

export const useInfoStore = defineStore('info', {
    state: (): State => ({
        version: String(),
        hash: String(),
        secret: String(),
        resources_path: String(),
        mediaMap: {
            dms: [
                { id: 6 }, { id: 16 }, { id: 32 }, { id: 64 },
                { id: 80 }, { id: 112 }, { id: 116 }, { id: 120 },
                { id: 125 }, { id: 126 }, { id: 127 },
            ],
            ads: [
                { id: 30216 }, { id: 30228 }, { id: 30232 }, { id: 30280 },
                { id: 30250 }, { id: 30380 }, { id: 30251 }, { id: 30252 },
            ],
            cdc: [
                { id: 7 }, { id: 12 }, { id: 13 },
            ],
            fmt: [
                { id: 0 }, { id: 1 }, { id: 2 }
            ]
        }
    })
});