import * as DataTypes from "@/types/DataTypes";
import { fetch } from "@tauri-apps/plugin-http";
import { ApplicationError, formatProxyUrl, tryFetch } from "@/services/utils";
import store from "@/store";

export async function getMediaInfo(id: string, type: DataTypes.MediaType): Promise<DataTypes.MediaInfo> {
    let url = "https://api.bilibili.com";
    switch(type) {
        case DataTypes.MediaType.Video:
            url += `/x/web-interface/view/detail?${isNaN(+id) ? 'bv' : 'a'}id=${id}`;
            break;
        case DataTypes.MediaType.Bangumi:
            url += `/pgc/view/web/season?${id.toLowerCase().startsWith('ss') ? 'season' : 'ep'}_id=${id.match(/\d+/)?.[0]}`;
            break;
        case DataTypes.MediaType.Lesson:
            url += `/pugv/view/web/season?${id.toLowerCase().startsWith('ss') ? 'season' : 'ep'}_id=${id.match(/\d+/)?.[0]}`;
            break;
        case DataTypes.MediaType.Music:
            url = "https://www.bilibili.com/audio/music-service-c/web/song/info?sid=" + id;
            break;
    }
    const response = await fetch(url, {
        headers: store.state.data.headers,
        ...(store.state.settings.proxy.addr && {
            proxy: { all: formatProxyUrl(store.state.settings.proxy) }
        })
    });
    const body = await response.json();
    switch(type) {
        case DataTypes.MediaType.Video: {
            const info = body as DataTypes.VideoInfo;
            if (info.code !== 0) {
                throw new ApplicationError(info.message, { code: info.code });
            }
            const data = info.data.View;
            return {
                title: data.title,
                cover: data.pic.replace("http:", "https:"),
                desc: data.desc.replace("\n", "<br>"),
                type,
                tags: info.data.Tags.map(item => item.tag_name),
                stat: {
                    play: data.stat.view,
                    danmaku: data.stat.danmaku,
                    reply: data.stat.reply,
                    like: data.stat.like,
                    coin: data.stat.coin,
                    favorite: data.stat.favorite,
                    share: data.stat.share,
                },
                upper: {
                    avatar: data.owner.face,
                    name: data.owner.name,
                    mid: data.owner.mid,
                },
                list: data?.ugc_season ?
                    data.ugc_season.sections[0].episodes.map(episode => ({
                        title: episode.title,
                        cover: episode.arc.pic.replace("http:", "https:"),
                        desc: episode.arc.desc,
                        duration: episode.arc.duration,
                        id: episode.aid,
                        cid: episode.cid,
                        eid: episode.id,
                        ss_title: data.ugc_season.title,
                    })) :
                    data.pages.map(page => ({
                        title: page.part ?? data.title,
                        cover: data.pic.replace("http:", "https:"),
                        desc: data.desc,
                        duration: page.duration,
                        id: data.aid,
                        cid: page.cid,
                        eid: page.page,
                        ss_title: data.title ?? page.part,
                    }))
            };
        }
        case DataTypes.MediaType.Bangumi: {
            const info = body as DataTypes.BangumiInfo;
            if (info.code !== 0) {
                if (info.code === -404) { // TRY LESSON
                    return await getMediaInfo(id, DataTypes.MediaType.Lesson);
                }
                throw new ApplicationError(info.message, { code: info.code });
            }
            const data = info.result;
            return {
                title: data.title,
                cover: data.cover.replace("http:", "https:"),
                desc: data.evaluate.replace("\n", "<br>"),
                type,
                tags: data.styles,
                stat: {
                    play: data.stat.views,
                    danmaku: data.stat.danmakus,
                    reply: data.stat.reply,
                    like: data.stat.likes,
                    coin: data.stat.coins,
                    favorite: data.stat.favorite,
                    share: data.stat.share,
                },
                upper: {
                    avatar: data?.up_info?.avatar,
                    name: data?.up_info?.uname,
                    mid: data?.up_info?.mid,
                },
                list: data.episodes.map(episode => ({
                    title: episode.share_copy,
                    cover: episode.cover.replace("http:", "https:"),
                    desc: data.evaluate,
                    duration: episode.duration,
                    id: episode.aid,
                    cid: episode.cid,
                    eid: episode.ep_id,
                    ss_title: data.season_title,
                }))
            };
        }
        case DataTypes.MediaType.Lesson: {
            const info = body as DataTypes.LessonInfo;
            if (info.code !== 0) {
                throw new ApplicationError(info.message, { code: info.code });
            }
            const data = info.data;
            return {
                title: data.title,
                cover: data.cover.replace("http:", "https:"),
                desc: `${data.subtitle ?? ''}<br>${data.faq.title ?? ''}<br>${data.faq.content ?? ''}`,
                type,
                tags: [],
                stat: {
                    play: data.stat.play,
                    danmaku: null,
                    reply: null,
                    like: null,
                    coin: null,
                    favorite: null,
                    share: null,
                },
                upper: {
                    avatar: data.up_info.avatar,
                    name: data.up_info.uname,
                    mid: data.up_info.mid,
                },
                list: data.episodes.map(episode => ({
                    title: episode.title,
                    cover: episode.cover.replace("http:", "https:"),
                    desc: data.subtitle,
                    duration: episode.duration,
                    id: episode.aid,
                    cid: episode.cid,
                    eid: episode.id,
                    ss_title: data.title,
                }))
            };
        }
        case DataTypes.MediaType.Music: {
            const info = body as DataTypes.MusicInfo;
            if (info.code !== 0) {
                throw new ApplicationError(info.msg, { code: info.code });
            }
            const tagsResp = await fetch(`https://www.bilibili.com/audio/music-service-c/web/tag/song?sid=` + id.match(/\d+/)?.[0], {
                headers: store.state.data.headers,
                ...(store.state.settings.proxy.addr && {
                    proxy: { all: formatProxyUrl(store.state.settings.proxy) }
                })
            });
            const tagsBody = await tagsResp.json() as DataTypes.MusicTagsInfo;
            if (tagsBody.code !== 0) {
                throw new ApplicationError(tagsBody.msg, { code: tagsBody.code });
            }
            const data = info.data;
            return {
                title: data.title,
                cover: data.cover.replace("http:", "https:"),
                desc: data.intro.replace("\n", "<br>"),
                type,
                tags: [],
                stat: {
                    play: data.statistic.play,
                    danmaku: null,
                    reply: data.statistic.comment,
                    like: null,
                    coin: null,
                    favorite: data.statistic.collect,
                    share: data.statistic.share,
                },
                upper: {
                    avatar: null,
                    name: data.uname,
                    mid: data.uid,
                },
                list: [] // TODO
            };
        }
            
    }
}

export async function getPlayUrl(data: DataTypes.MediaInfo["list"][0], type: DataTypes.MediaType): Promise<DataTypes.DashInfo> {
    let url = "https://api.bilibili.com";
    let params = {
        fnval: 4048, fnver: 0, fourk: 1, qn: 127,
        avid: data.id, cid: data.cid, ep_id: data.eid,
    };
    switch(type) {
        case DataTypes.MediaType.Video:
            url += '/x/player/wbi/playurl';
            break;
        case DataTypes.MediaType.Bangumi:
            url += '/pgc/player/web/playurl';
            break;
        case DataTypes.MediaType.Lesson:
            url += '/pugv/player/web/playurl';
            break;
        case DataTypes.MediaType.Music:
            url += '/audio/music-service-c/url';
            // TODO
            break;
    }
    const body = await tryFetch(url, { wbi: type === DataTypes.MediaType.Video, params });
    switch(type) {
        case DataTypes.MediaType.Video: {
            const info = body as DataTypes.VideoPlayUrlInfo;
            const data = info.data;
            return {
                duration: data.dash.duration,
                video: data.dash.video,
                audio: [
                    ...data.dash.audio, 
                    ...(data.dash.dolby?.audio ? [data.dash.dolby.audio[0]] : []),
                    ...(data.dash.flac ? [data.dash.flac.audio] : []),
                ],
            }
        }
        case DataTypes.MediaType.Bangumi: {
            const info = body as DataTypes.BangumiPlayUrlInfo;
            break;
        }
        case DataTypes.MediaType.Lesson: {
            const info = body as DataTypes.LessonPlayUrlInfo;
            break;
        }
        case DataTypes.MediaType.Music: {
            // TODO
        }
    }
    throw ''; // TODO
}