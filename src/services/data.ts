import { utils, auth } from '@/services';
import { fetch } from '@tauri-apps/plugin-http';
import * as types from '@/types';
import store from '@/store';

export async function getMediaInfo<T extends types.data.MediaType>(rawId: string, type: T): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const id = rawId.toLowerCase() as any;
        let basicUrl = '';
        if (type == types.data.MediaType.Video) {
            basicUrl = `https://api.bilibili.com/x/web-interface/view/detail?${id.startsWith('bv') ? `bvid=${rawId}` : `aid=${id.match(/\d+/)[0]}`}`;
        } else if (type == types.data.MediaType.Bangumi) {
            basicUrl = `https://api.bilibili.com/pgc/view/web/season?${id.startsWith('ep') ? 'ep_id' : 'season_id'}=${id.match(/\d+/)[0]}`;
        } else if (type == types.data.MediaType.Music) {
            basicUrl = `https://www.bilibili.com/audio/music-service-c/web/song/info?sid=${id.match(/\d+/)[0]}`;
        } else if (type == types.data.MediaType.Lesson) {
            basicUrl = `https://api.bilibili.com/pugv/view/web/season?${id.startsWith('ep') ? 'ep_id' : 'season_id'}=${id.match(/\d+/)[0]}`;
        } else reject(new Error(`No type named '${type}'.`));
        const resp = await fetch(basicUrl, { headers: store.state.data.headers });
        const basicResp = await resp.json();
        if (basicResp?.code !== 0) {
            if (basicResp?.code === -404 && type === types.data.MediaType.Bangumi) {
                await getMediaInfo(id, types.data.MediaType.Lesson);
                resolve();
            }
            reject(basicResp?.code + ', ' + (basicResp?.message || basicResp?.msg));
        }
        if (type == types.data.MediaType.Video) {
            const info = (basicResp as types.data.VideoInfo).data.View;
            const mediaInfo: types.data.MediaInfo = {
                cover: info.pic.replace("http:", "https:"),
                title: info.title,
                desc: info.desc,
                type,
                tags: [utils.partition(info.tid), info.tname],
                stat: {
                    play: info.stat.view,
                    danmaku: info.stat.danmaku,
                    reply: utils.stat(info.stat.reply),
                    like: info.stat.like,
                    coin: info.stat.coin,
                    favorite: info.stat.favorite,
                    share: info.stat.share,
                    pubdate: utils.pubdate(info.pubdate)
                },
                upper: {
                    avatar: info.owner.face,
                    name: info.owner.name,
                    mid: info.owner.mid
                },
                list: info?.ugc_season ? 
                info.ugc_season.sections[0].episodes.map(episode => ({
                    title: episode.title,
                    desc: episode.arc.desc,
                    cover: episode.arc.pic.replace("http:", "https:"),
                    duration: episode.arc.duration,
                    id: episode.aid,
                    cid: episode.cid,
                    eid: episode.id,
                    ss_title: info.title
                })) :
                info.pages.map(page => ({
                    title: page.part || info.title,
                    desc: info.desc,
                    cover: info.pic.replace("http:", "https:"),
                    duration: page.duration,
                    id: info.aid,
                    cid: page.cid,
                    eid: page.page,
                    ss_title: page.part || info.title
                }))
            };
            store.commit('updateState', { 'data.mediaInfo': mediaInfo });
            resolve();
        } else if (type == types.data.MediaType.Bangumi) {
            const info = (basicResp as types.data.BangumiInfo).result
            const mediaInfo: types.data.MediaInfo = {
                cover: info.cover.replace("http:", "https:"),
                title: info.title,
                desc: info.evaluate,
                type,
                tags: info.styles,
                stat: {
                    play: info.stat.views,
                    danmaku: info.stat.danmakus,
                    reply: info.stat.reply,
                    like: info.stat.likes,
                    coin: info.stat.coins,
                    favorite: info.stat.favorite,
                    share: info.stat.share,
                    pubdate: info.publish.pub_time
                },
                upper: {
                    avatar: info.up_info.avatar,
                    name: info.up_info.uname,
                    mid: info.up_info.mid
                },
                list: info.episodes.map(episode => ({
                    title: episode.share_copy,
                    desc: info.evaluate,
                    cover: episode.cover.replace("http:", "https:"),
                    duration: episode.duration,
                    id: episode.aid,
                    cid: episode.cid,
                    eid: episode.ep_id,
                    ss_title: info.season_title
                }))
            };
            store.commit('updateState', { 'data.mediaInfo': mediaInfo });
            resolve();
        } else if (type == types.data.MediaType.Music) {
            const info = (basicResp as types.data.MusicInfo).data;
            const mediaInfo: types.data.MediaInfo = {
                cover: info.cover.replace("http:", "https:"),
                title: info.title,
                desc: info.intro,
                tags: (await (await fetch(`https://www.bilibili.com/audio/music-service-c/web/tag/song?sid=${id.match(/\d+/)[0]}`,
                { headers: store.state.data.headers })).json() as types.data.MusicTagsInfo).data.map(item => item.info),
                type,
                stat: {
                    play: info.statistic.play,
                    danmaku: null,
                    reply: info.statistic.comment,
                    like: null,
                    coin: null,
                    favorite: info.statistic.collect,
                    share: info.statistic.share,
                    pubdate: info.passtime
                },
                upper: {
                    avatar: null,
                    name: info.uname,
                    mid: info.uid
                },
                list: []
            };
            store.commit('updateState', { 'data.mediaInfo': mediaInfo });
            resolve();
        } else if (type == types.data.MediaType.Lesson) {
            const info = (basicResp as types.data.LessonInfo).data;
            const mediaInfo: types.data.MediaInfo = {
                cover: info.cover.replace("http:", "https:"),
                title: info.title,
                desc: `${info.subtitle}<br>${info.faq.title}<br>${info.faq.content}`,
                tags: [],
                type,
                stat: {
                    play: info.stat.play,
                    danmaku: null,
                    reply: info.release_info,
                    like: null,
                    coin: null,
                    favorite: null,
                    share: null,
                    pubdate: null
                },
                upper: {
                    avatar: info.up_info.avatar,
                    name: info.up_info.uname,
                    mid: info.up_info.mid
                },
                list: info.episodes.map(episode => ({
                    title: episode.title,
                    desc: info.subtitle,
                    cover: episode.cover.replace("http:", "https:"),
                    duration: episode.duration,
                    id: episode.aid,
                    cid: episode.cid,
                    eid: episode.id,
                    ss_title: info.title
                }))
            };
            store.commit('updateState', { 'data.mediaInfo': mediaInfo });
            resolve();
        }
        reject(new Error(`No type named '${type}'.`));
    });
}

export async function getPlayUrl(data: types.data.MediaInfo["list"][0], type: types.data.MediaType): Promise<void> {
    return new Promise(async(resolve, reject) => {
        const params = {
            avid: data.id, cid: data.cid, fourk: 1,
            fnval: 4048, fnver: 0, ep_id: data.eid
        }
        const signature = await auth.wbi(params);
        const key = type == "bangumi" ? "pgc/player/web" : (type == "lesson" ? "pugv/player/web" : "x/player/wbi");
        const basicUrl = `https://api.bilibili.com/${key}/playurl?${signature}`;
        const resp = await fetch(basicUrl, { headers: store.state.data.headers });
        const basicResp = await resp.json();
        if (basicResp?.code !== 0) {
            reject(basicResp?.code + ', ' + (basicResp?.message || basicResp?.msg));
        }
        function getId(name: 'dms' | 'ads' | 'cdc') {
            const mediaType = name == 'ads' ? 'audio' : 'video';
            const idType = name == 'cdc' ? 'codecid' : 'id';
            if (type == 'video') {
                return (basicResp as types.data.VideoPlayUrlInfo).data.dash[mediaType].map(p => p[idType]);
            } else if (type == 'bangumi') {
                return (basicResp as types.data.BangumiPlayUrlInfo).result.dash[mediaType].map(p => p[idType]);
            } else if (type == 'lesson') {
                return (basicResp as types.data.LessonPlayUrlInfo).data.dash[mediaType].map(p => p[idType]);
            }
        }
        function getCurr(id: number[], df: number) {
            const maxId = Math.max(...id);
            return maxId > df ? df : maxId;
        }
        const dms = [...new Set(getId('dms'))]; // use Set to deduplication
        const ads = [...new Set(getId('ads'))];
        const cdc = [...new Set(getId('cdc'))];
        const currSel = {
            dms: getCurr(dms, store.state.settings.df_dms),
            ads: getCurr(ads, store.state.settings.df_ads),
            cdc: getCurr(cdc, store.state.settings.df_cdc),
        }
        store.commit('updateState', { 'data.mediaProfile': {
            dms, ads, cdc, currSel
        }})
        console.log(store.state.data.mediaProfile)
        resolve();
    });
}