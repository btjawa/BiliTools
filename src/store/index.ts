import { createStore } from 'vuex';
import { DashInfo, DurlInfo, MusicUrlInfo } from '@/types/data.d';
import { CurrentSelect, QueueInfo, Settings } from '@/services/backend';
import { Headers } from '@/types/data.d';

function createSettings(settings: Settings): Settings {
    return settings;
}

export default createStore({
    state() {
        return {
            user: {
                avatar: String(),
                name: String(),
                desc: String(),
                mid: Number(),
                level: Number(),
                vipLabel: String(),
                topPhoto: String(),
                isLogin: false,
                stat: {
                    coins: Number(),
                    following: Number(),
                    follower: Number(),
                    dynamic: Number(),
                }
            },
            settings: createSettings({
                down_dir: String(),
                temp_dir: String(),
                max_conc: Number(),
                df_dms: Number(),
                df_ads: Number(),
                df_cdc: Number(),
                language: String(),
                theme: 'dark',
                auto_check_update: false,
                filename: String(),
                proxy: {
                    addr: String(),
                    username: String(),
                    password: String(),
                },
                advanced: {
                    auto_convert_flac: true,
                    prefer_pb_danmaku: true,
                }
            }),
            data: {
                constant: {                    
                    version: String(),
                    hash: String(),
                    secret: String(),
                    resources_path: String(),
                },
                inited: false,
                headers: {} as Headers,
                currentSelect: {
                    dms: -1,
                    ads: -1,
                    cdc: -1,
                    fmt: -1,
                } as CurrentSelect,
                goInstance: null as WebAssembly.Instance | null,
                playUrlInfo: {} as DashInfo | DurlInfo | MusicUrlInfo,
                cache: {
                    log: Number(),
                    temp: Number(),
                    webview: Number(),
                    database: Number(),
                },
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
                },
            },
            queue: {
                waiting: [] as QueueInfo[],
                doing: [] as QueueInfo[],
                complete: [] as QueueInfo[],
            },
            status: {
                queuePage: 0
            }
        };
    }
});
