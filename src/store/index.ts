import { createStore } from 'vuex';
import { MediaInfo, QueueInfo } from '../types/DataTypes';

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
                cache: {
                    log: 0,
                    temp: 0,
                    webview: 0,
                    database: 0,
                },
                mediaMap: {
                    dms: [
                        { id: 16, label: '360P 流畅', login: false },
                        { id: 32, label: '480P 清晰', login: false },
                        { id: 64, label: '720P 高清', login: true },
                        { id: 80, label: '1080P 高清', login: true },
                        { id: 112, label: '1080P+ 高码率', login: true },
                        { id: 116, label: '1080P60 高帧率', login: true },
                        { id: 120, label: '4K 超清', login: true },
                        { id: 125, label: 'HDR 真彩', login: true },
                        { id: 126, label: '杜比视界', login: true },
                        { id: 127, label: '8K 超高清', login: true }
                    ],
                    ads: [
                        { id: 30216, label: '64K', login: false },
                        { id: 30232, label: '132K', login: false },
                        { id: 30280, label: '192K', login: false },
                        { id: 30250, label: '杜比全景声', login: true },
                        { id: 30251, label: 'Hi-Res无损', login: true }
                    ],
                    cdc: [
                        { id: 7, label: 'AVC 编码', login: false },
                        { id: 12, label: 'HEVC 编码', login: false },
                        { id: 13, label: 'AV1 编码', login: false },
                    ],        
                },
                mediaProfile: {
                    dms: [16],
                    ads: [30216],
                    cdc: [7],
                }
            },
            queue: {
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
