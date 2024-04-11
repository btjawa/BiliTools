import * as http from '../scripts/http';
import { iziError } from './utils';
import store from '../store';
import * as types from "../types/Sdk.type";
import * as utils from "../scripts/utils";
// import * as verify from '../scripts/verify';

export async function getMediaInfo<T extends types.MediaType>(rawId: string, type: T): Promise<types.MediaList | null> {
    const id = rawId.toLowerCase() as any;
    let basicUrl: string;
    if (type == types.MediaType.Video) {
        basicUrl = `https://api.bilibili.com/x/web-interface/view/detail?${id.startsWith('bv') ? `bvid=${rawId}` : `aid=${id.match(/\d+/)[0]}`}`;
    } else if (type == types.MediaType.Bangumi) {
        basicUrl = `https://api.bilibili.com/pgc/view/web/season?${id.startsWith('ep') ? 'ep_id' : 'season_id'}=${id.match(/\d+/)[0]}`;
    } else if (type == types.MediaType.Music) {
        basicUrl = `https://www.bilibili.com/audio/music-service-c/web/song/info?sid=${id.match(/\d+/)[0]}`;
    } else if (type == types.MediaType.Lesson) {
        basicUrl = `https://api.bilibili.com/pugv/view/web/season?${id.startsWith('ep') ? 'ep_id' : 'season_id'}=${id.match(/\d+/)[0]}`;
    } else throw new Error(`No type named '${type}'.`);
    try {
        const basicResp = await (await http.fetch(basicUrl, { headers: store.state.headers })).json();
        if (basicResp.code !== 0) {
            if (basicResp.code === -404 && type === types.MediaType.Bangumi) {
                return getMediaInfo(id, types.MediaType.Lesson);
            }
            throw new Error(`${rawId}: ${basicResp.code}, ${basicResp.message}`);
        }
        if (type == types.MediaType.Video) {
            const info = (basicResp as types.VideoInfo).data.View;
            const tags = [utils.partition(info.tid), info.tname];
            const stat: types.MediaList["stat"] = {
                play: info.stat.view,
                danmaku: info.stat.danmaku,
                reply: info.stat.reply,
                like: info.stat.like,
                coin: info.stat.coin,
                favorite: info.stat.favorite,
                share: info.stat.share,
                pubdate: info.pubdate
            };
            const upper: types.MediaList["upper"] = {
                avatar: info.owner.face,
                name: info.owner.name,
                mid: info.owner.mid
            }
            return { cover: info.pic, title: info.title, desc: info.desc, type, tags, stat, upper };
        } else if (type == types.MediaType.Bangumi) {
            const info = (basicResp as types.BangumiInfo).result;
            const tags = info.styles;
            const stat: types.MediaList["stat"] = {
                play: info.stat.views,
                danmaku: info.stat.danmakus,
                reply: info.stat.reply,
                like: info.stat.likes,
                coin: info.stat.coins,
                favorite: info.stat.favorite,
                share: info.stat.share,
                pubdate: info.publish.pub_time
            }
            const upper: types.MediaList["upper"] = {
                avatar: info.up_info.avatar,
                name: info.up_info.uname,
                mid: info.up_info.mid
            }
            return { cover: info.cover, title: info.title, desc: info.evaluate, type, tags, stat, upper };
        } else if (type == types.MediaType.Music) {
            const info = (basicResp as types.MusicInfo).data;
            const tags = (await (await http.fetch(`https://www.bilibili.com/audio/music-service-c/web/tag/song?sid=${id.match(/\d+/)[0]}`,
            { headers: store.state.headers })).json() as types.MusicTagsInfo).data.map(item => item.info);
            const stat: types.MediaList["stat"] = {
                play: info.statistic.play,
                danmaku: null,
                reply: info.statistic.comment,
                like: null,
                coin: null,
                favorite: info.statistic.collect,
                share: info.statistic.share,
                pubdate: info.passtime
            }
            const upper: types.MediaList["upper"] = {
                avatar: null,
                name: info.uname,
                mid: info.uid
            }
            return { cover: info.cover, title: info.title, desc: info.intro, type, tags, stat, upper };
        } else if (type == types.MediaType.Lesson) {
            const info = (basicResp as types.LessonInfo).data;
            const stat: types.MediaList["stat"] = {
                play: info.stat.play,
                danmaku: null,
                reply: info.release_info,
                like: null,
                coin: null,
                favorite: null,
                share: null,
                pubdate: null
            }
            const upper: types.MediaList["upper"] = {
                avatar: info.up_info.avatar,
                name: info.up_info.uname,
                mid: info.up_info.mid
            }
            return { cover: info.cover, title: info.title, type, tags: [], stat,
            desc: `${info.subtitle}<br>${info.faq.title}<br>${info.faq.content}`, upper };
        } else throw new Error(`No type named '${type}'.`);
    } catch (err: any) {
        iziError(err.message);
        return null;
    }
}