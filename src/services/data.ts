import { utils } from '@/services';
import { fetch } from '@tauri-apps/plugin-http';
import * as types from '@/types';
import store from '@/store';

export async function getMediaInfo<T extends types.data.MediaType>(rawId: string, type: T) {
    const id = rawId.toLowerCase() as any;
    let basicUrl: string;
    if (type == types.data.MediaType.Video) {
        basicUrl = `https://api.bilibili.com/x/web-interface/view/detail?${id.startsWith('bv') ? `bvid=${rawId}` : `aid=${id.match(/\d+/)[0]}`}`;
    } else if (type == types.data.MediaType.Bangumi) {
        basicUrl = `https://api.bilibili.com/pgc/view/web/season?${id.startsWith('ep') ? 'ep_id' : 'season_id'}=${id.match(/\d+/)[0]}`;
    } else if (type == types.data.MediaType.Music) {
        basicUrl = `https://www.bilibili.com/audio/music-service-c/web/song/info?sid=${id.match(/\d+/)[0]}`;
    } else if (type == types.data.MediaType.Lesson) {
        basicUrl = `https://api.bilibili.com/pugv/view/web/season?${id.startsWith('ep') ? 'ep_id' : 'season_id'}=${id.match(/\d+/)[0]}`;
    } else throw new Error(`No type named '${type}'.`);
    const basicResp = await (await fetch(basicUrl, { headers: store.state.data.headers })).json();
    if (basicResp?.code !== 0) {
        if (basicResp?.code === -404 && type === types.data.MediaType.Bangumi) {
            return getMediaInfo(id, types.data.MediaType.Lesson);
        }
        throw new Error(basicResp?.code + ', ' + (basicResp?.message || basicResp?.msg));
    }
    if (type == types.data.MediaType.Video) {
        const info = (basicResp as types.data.VideoInfo).data.View;
        store.commit('updateState', { 'data.mediaInfo': {
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
                ss_title:  info.title
            })) :
            info.pages.map(page => ({
                title: page.part || info.title,
                desc: info.desc,
                cover: info.pic.replace("http:", "https:"),
                duration: page.duration,
                id: info.aid,
                cid: page.cid,
                ss_title: page.part || info.title
            }))
        }});
    } else if (type == types.data.MediaType.Bangumi) {
        const info = (basicResp as types.data.BangumiInfo).result;
        store.commit('updateState', { 'data.mediaInfo': {
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
                ss_title: info.season_title
            }))
        }});
    } else if (type == types.data.MediaType.Music) {
        const info = (basicResp as types.data.MusicInfo).data;
        store.commit('updateState', { 'data.mediaInfo': {
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
        }});
    } else if (type == types.data.MediaType.Lesson) {
        const info = (basicResp as types.data.LessonInfo).data;
        store.commit('updateState', { 'data.mediaInfo': {
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
            list: []
        }});
    } else throw new Error(`No type named '${type}'.`);
}