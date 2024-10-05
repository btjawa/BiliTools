import { utils, auth } from '@/services';
import { fetch } from '@tauri-apps/plugin-http';
import { invoke } from '@tauri-apps/api/core';
import * as types from '@/types';
import store from '@/store';
import { formatProxyUrl } from '@/services/utils';

async function getResponse(baseURL: string, type: types.data.MediaType) {
    const response = await fetch(baseURL, {
        headers: store.state.data.headers,
        ...(store.state.settings.proxy.addr && {
            proxy: { all: formatProxyUrl(store.state.settings.proxy) }
        })
    });
    const data = await response.json();
    if (data?.code !== 0) throw data;
    const typeMappings = {
        [types.data.MediaType.Video]: (data as types.data.VideoInfo)?.data?.View,
        [types.data.MediaType.Bangumi]: (data as types.data.BangumiInfo)?.result,
        [types.data.MediaType.Music]: (data as types.data.MusicInfo)?.data,
        [types.data.MediaType.Lesson]: (data as types.data.LessonInfo)?.data,
    };
    const result = typeMappings[type];
    if (!result) throw new Error(`No type named '${type}'.`);
    return result;
}

export async function getMediaInfo<T extends types.data.MediaType>(rawId: string, type: T): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const id = rawId.toLowerCase() as any;
        const urls = {
            [types.data.MediaType.Video]: `https://api.bilibili.com/x/web-interface/view/detail?${id.startsWith('bv') ? `bvid=${rawId}` : `aid=${id.match(/\d+/)[0]}`}`,
            [types.data.MediaType.Bangumi]: `https://api.bilibili.com/pgc/view/web/season?${id.startsWith('ep') ? 'ep_id' : 'season_id'}=${id.match(/\d+/)[0]}`,
            [types.data.MediaType.Music]: `https://www.bilibili.com/audio/music-service-c/web/song/info?sid=${id.match(/\d+/)[0]}`,
            [types.data.MediaType.Lesson]: `https://api.bilibili.com/pugv/view/web/season?${id.startsWith('ep') ? 'ep_id' : 'season_id'}=${id.match(/\d+/)[0]}`,
        };
        const baseURL = urls[type];
        if (!baseURL) return reject(new Error(`No type named '${type}'.`));    
        try {
            const response = await getResponse(baseURL, type);
            switch(type) {
                default: return reject(new Error(`No type named '${type}'.`));
                case types.data.MediaType.Video: {
                    const info = response as types.data.VideoInfo["data"]["View"];
                    const mediaInfo: types.data.MediaInfo = {
                        cover: info?.pic?.replace("http:", "https:"),
                        title: info?.title,
                        desc: info?.desc,
                        type,
                        tags: [utils.partition(info?.tid), info?.tname],
                        stat: {
                            play: info?.stat?.view,
                            danmaku: info?.stat?.danmaku,
                            reply: utils.stat(info?.stat?.reply),
                            like: info?.stat?.like,
                            coin: info?.stat?.coin,
                            favorite: info?.stat?.favorite,
                            share: info?.stat?.share,
                            pubdate: utils.pubdate(info?.pubdate)
                        },
                        upper: {
                            avatar: info?.owner?.face,
                            name: info?.owner?.name,
                            mid: info?.owner?.mid
                        },
                        list: info?.ugc_season ? 
                            info?.ugc_season?.sections[0]?.episodes?.map(episode => ({
                                title: episode?.title,
                                desc: episode?.arc?.desc,
                                cover: episode?.arc?.pic?.replace("http:", "https:"),
                                duration: episode?.arc?.duration,
                                id: episode?.aid,
                                cid: episode?.cid,
                                eid: episode?.id,
                                ss_title: info?.ugc_season?.title
                            })) :
                            info?.pages?.map(page => ({
                                title: page?.part || info?.title,
                                desc: info?.desc,
                                cover: info?.pic?.replace("http:", "https:"),
                                duration: page.duration,
                                id: info?.aid,
                                cid: page?.cid,
                                eid: page?.page,
                                ss_title: info?.title || page?.part
                            }))
                    };
                    store.commit('updateState', { 'data.mediaInfo': mediaInfo });
                    return resolve();    
                }
                case types.data.MediaType.Bangumi: {
                    const info = response as types.data.BangumiInfo["result"];
                    const mediaInfo: types.data.MediaInfo = {
                        cover: info?.cover?.replace("http:", "https:"),
                        title: info?.title,
                        desc: info?.evaluate,
                        type,
                        tags: info?.styles,
                        stat: {
                            play: info?.stat?.views,
                            danmaku: info?.stat?.danmakus,
                            reply: info?.stat?.reply,
                            like: info?.stat?.likes,
                            coin: info?.stat?.coins,
                            favorite: info?.stat?.favorite,
                            share: info?.stat?.share,
                            pubdate: info?.publish?.pub_time
                        },
                        upper: {
                            avatar: info?.up_info?.avatar,
                            name: info?.up_info?.uname,
                            mid: info?.up_info?.mid
                        },
                        list: info?.episodes?.map(episode => ({
                            title: episode.share_copy,
                            desc: info?.evaluate,
                            cover: episode.cover?.replace("http:", "https:"),
                            duration: episode.duration,
                            id: episode.aid,
                            cid: episode.cid,
                            eid: episode.ep_id,
                            ss_title: info?.season_title
                        }))
                    };
                    store.commit('updateState', { 'data.mediaInfo': mediaInfo });
                    return resolve();    
                }
                case types.data.MediaType.Music: {
                    const info = response as types.data.MusicInfo["data"];
                    const tagsResp = await fetch(`https://www.bilibili.com/audio/music-service-c/web/tag/song?sid=${id.match(/\d+/)[0]}`, {
                        headers: store.state.data.headers,
                        ...(store.state.settings.proxy.addr && {
                            proxy: { all: formatProxyUrl(store.state.settings.proxy) }
                        })
                    });
                    const rawTags = await tagsResp.json() as types.data.MusicTagsInfo;
                    const mediaInfo: types.data.MediaInfo = {
                        cover: info?.cover?.replace("http:", "https:"),
                        title: info?.title,
                        desc: info?.intro,
                        tags: rawTags.data?.map(item => item.info),
                        type,
                        stat: {
                            play: info?.statistic?.play,
                            danmaku: null,
                            reply: info?.statistic?.comment,
                            like: null,
                            coin: null,
                            favorite: info?.statistic?.collect,
                            share: info?.statistic?.share,
                            pubdate: info?.passtime
                        },
                        upper: {
                            avatar: null,
                            name: info?.uname,
                            mid: info?.uid
                        },
                        list: [] // TODO!
                    };
                    store.commit('updateState', { 'data.mediaInfo': mediaInfo });
                    return resolve();
                }
                case types.data.MediaType.Lesson: {
                    const info = response as types.data.LessonInfo["data"];
                    const mediaInfo: types.data.MediaInfo = {
                        cover: info?.cover?.replace("http:", "https:"),
                        title: info?.title,
                        desc: `${info?.subtitle ?? ''}<br>${info?.faq?.title ?? ''}<br>${info?.faq?.content ?? ''}`,
                        tags: [],
                        type,
                        stat: {
                            play: info?.stat?.play,
                            danmaku: null,
                            reply: info?.release_info,
                            like: null,
                            coin: null,
                            favorite: null,
                            share: null,
                            pubdate: null
                        },
                        upper: {
                            avatar: info?.up_info?.avatar,
                            name: info?.up_info?.uname,
                            mid: info?.up_info?.mid
                        },
                        list: info?.episodes?.map(episode => ({
                            title: episode.title,
                            desc: info?.subtitle,
                            cover: episode.cover?.replace("http:", "https:"),
                            duration: episode.duration,
                            id: episode.aid,
                            cid: episode.cid,
                            eid: episode.id,
                            ss_title: info?.title
                        }))
                    };
                    store.commit('updateState', { 'data.mediaInfo': mediaInfo });
                    resolve();
                }
            }            
        } catch(err) {
            if ((err as types.data.VideoInfo)?.code === -404 && type === types.data.MediaType.Bangumi) {
                await getMediaInfo(id, types.data.MediaType.Lesson);
                return resolve();
            }
            return reject(err);
        }
    });
}

export async function getPlayUrl(data: types.data.MediaInfo["list"][0], type: types.data.MediaType): Promise<types.data.CommonDash> {
    return new Promise(async (resolve, reject) => {
        const params = {
            avid: data.id, cid: data.cid, fourk: 1,
            fnval: 4048, fnver: 0, ep_id: data.eid
        }
        const key = type == "bangumi" ? "pgc/player/web" : (type == "lesson" ? "pugv/player/web" : "x/player/wbi");
        const basicUrl = `https://api.bilibili.com/${key}/playurl?${await auth.wbi(params)}`;
        const resp = await fetch(basicUrl, {
            headers: store.state.data.headers,
            ...(store.state.settings.proxy.addr && {
                proxy: { all: formatProxyUrl(store.state.settings.proxy) }
            })
        });
        const basicResp = await resp.json();
        if (basicResp?.code !== 0) {
            return reject(basicResp?.code + ', ' + (basicResp?.message || basicResp?.msg));
        }
        const dashData = basicResp?.[type == "bangumi" ? "result" : "data"]?.dash as types.data.CommonDash;
        function getId(name: 'dms' | 'ads' | 'cdc') {
            const mediaType = name === 'ads' ? 'audio' : 'video';
            const idType = name === 'cdc' ? 'codecid' : 'id';
            return dashData[mediaType].map(p => p[idType]);
        }
        // use Set to deduplication
        const dms = [...new Set(getId('dms'))].sort((a, b) => a - b);
        const ads = [...new Set(getId('ads'))].sort((a, b) => a - b);
        const cdc = [...new Set(getId('cdc'))].sort((a, b) => a - b);
        store.commit('updateState', { 'data.mediaProfile': {
            dms, ads, cdc
        }})
        return resolve(dashData);
    });
}

export async function pushBackQueue(queueInfo: types.data.QueueInfo): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            const gids = await invoke('push_back_queue', { queueInfo }) as types.data.QueueInfo["gids"];
            console.log({ ...queueInfo, gids })
            store.commit('pushToArray', { 'queue.waiting': { ...queueInfo, gids } });
            return resolve();
        } catch(err) {
            return reject(err);
        }
    });
}