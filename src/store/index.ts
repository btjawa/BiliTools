import { createStore } from 'vuex';
import { DashInfo, DurlInfo, MediaInfo, QueueInfo } from '../types/DataTypes';
import i18n from '@/i18n';
const t = i18n.global.t;

export default createStore({
    state() {
        return {
            user: {
                avatar: '', name: '', desc: '',
                mid: 0, level: 0,
                vipLabel: '',
                topPhoto: '',
                isLogin: false,
                stat: {
                    coins: 0,
                    following: 0,
                    follower: 0,
                    dynamic_count: 0,
                }
            },
            settings: {
                down_dir: null,
                temp_dir: null,
                max_conc: -1,
                df_dms: 32,
                df_ads: 30280,
                df_cdc: 7,
                language: window.navigator.language,
                auto_check_update: false,
                proxy: {
                    addr: '',
                    username: '',
                    password: '',
                },
            },
            data: {
                inited: false,
                secret: '',
                headers: {},
                mediaInfo: {} as MediaInfo,
                dashInfo: {} as DashInfo,
                durlInfo: {} as DurlInfo,
                cache: {
                    log: '',
                    temp: '',
                    webview: '',
                    database: '',
                },
                mediaMap: {
                    dms: [
                        { id: 6 }, { id: 16 }, { id: 32 }, { id: 64 },
                        { id: 80 }, { id: 112 }, { id: 116 }, { id: 120 },
                        { id: 125 }, { id: 126 }, { id: 127 },
                    ],
                    ads: [
                        { id: 30216 }, { id: 30232 }, { id: 30280 },
                        { id: 30250 }, { id: 30251 },
                    ],
                    cdc: [
                        { id: 7 }, { id: 12 }, { id: 13 }, { id: -1 },
                    ],
                    fmt: [
                        // { id: -1 }, { id: 0 }, { id: 1 }
                        { id: 0 }, { id: 1 }
                    ]
                },
            },
            queue: {
                // waiting: [
                //     {
                //         tasks: [
                //             {
                //                 urls: ["url1", "url2"],
                //                 path: "path",
                //                 gid: "gid0",
                //                 media_type: "video"
                //             },
                //         ],
                //         output: "output",
                //         info: {
                //             title: "标题",
                //             cover: "/src/assets/img/empty.png",
                //             desc: "简介",
                //             id: 114514,
                //             cid: 114514,
                //             eid: 114514,
                //             ss_title: "ss_title"
                //         }
                //     }
                // ] as QueueInfo[],
                waiting: [] as QueueInfo[],
                doing: [] as QueueInfo[],
                complete: [] as QueueInfo[],
            }
        };
    },
    mutations: {
        updateState(state, payload) {
            Object.entries(payload).forEach(([key, value]) => {
                if (key.includes('.')) {
                    const keys = key.split('.');
                    let current = state as any;
                    for (let i = 0; i < keys.length - 1; i++) {
                        current = current[keys[i]];
                    }
                    current[keys[keys.length - 1]] = value;
                } else (state as any)[key] = value;
            });
        },
        pushToArray(state, payload) {
            Object.entries(payload).forEach(([key, value]) => {
                if (key.includes('.')) {
                    const keys = key.split('.');
                    let current = state as any;
                    for (let i = 0; i < keys.length - 1; i++) {
                        current = current[keys[i]];
                    }
                    const lastKey = keys[keys.length - 1];
                    if (Array.isArray(current[lastKey])) {
                        current[lastKey].push(value);
                    } else console.warn(`Attempt to push to a non-array property ${key}`);
                } else if (Array.isArray((state as any)[key])) {
                    (state as any)[key].push(value);
                } else console.warn(`Attempt to push to a non-array property ${key}`);
            });
        }
    },
});
