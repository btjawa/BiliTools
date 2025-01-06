import { fetch } from "@tauri-apps/plugin-http";
import { ApplicationError, formatProxyUrl, tryFetch, timestamp, duration, getFileExtension, filename } from "@/services/utils";
import { invoke } from "@tauri-apps/api/core";
import { checkRefresh } from "@/services/login";
import { getM1AndKey } from "@/services/auth";
import { join as pathJoin } from "@tauri-apps/api/path";
import { transformImage } from "@tauri-apps/api/image";
import * as Types from "@/types/data.d";
import * as dm_v1 from "@/proto/dm_v1";
import * as pako from 'pako';
import store from "@/store";

export async function getMediaInfo(id: string, type: Types.MediaType): Promise<Types.MediaInfo> {
    let url = "https://api.bilibili.com";
    switch(type) {
        case Types.MediaType.Video:
            url += `/x/web-interface/view/detail?${isNaN(+id) ? 'bv' : 'a'}id=` + id;
            break;
        case Types.MediaType.Bangumi:
            url += `/pgc/view/web/season?${id.toLowerCase().startsWith('ss') ? 'season' : 'ep'}_id=` + id.match(/\d+/)?.[0];
            break;
        case Types.MediaType.Lesson:
            url += `/pugv/view/web/season?${id.toLowerCase().startsWith('ss') ? 'season' : 'ep'}_id=` + id.match(/\d+/)?.[0];
            break;
        case Types.MediaType.Music:
            url = "https://www.bilibili.com/audio/music-service-c/web/song/info?sid=" + id;
            break;
        case Types.MediaType.Manga:
            url = "https://manga.bilibili.com/twirp/comic.v1.Comic/ComicDetail?device=pc&platform=web&nov=25&comic_id=" + id.match(/\d+/)?.[0];
    }
    const response = await fetch(url, {
        headers: store.state.data.headers,
        ...(store.state.settings.proxy.addr && {
            proxy: { all: formatProxyUrl(store.state.settings.proxy) }
        }),
        ...(type === Types.MediaType.Manga && { method: 'POST' })
    });
    if (!response.ok) {
        throw new ApplicationError(response.statusText, { code: response.status });
    }
    const body = await response.json();
    switch(type) {
        case Types.MediaType.Video: {
            const info = body as Types.VideoInfo;
            if (info.code !== 0) {
                throw new ApplicationError(info.message, { code: info.code });
            }
            const data = info.data.View;
            return {
                id: data.aid,
                title: data.title,
                cover: data.pic.replace("http:", "https:"),
                desc: data.desc,
                type,
                tags: info.data.Tags.map(item => item.tag_name),
                stein_gate: data.rights.is_stein_gate ? await (async () => {
                    const playerInfo = await getPlayerInfo(data.aid, data.cid);
                    const steinInfo = await getSteinInfo(data.aid, playerInfo.interaction.graph_version);
                    return {
                        edge_id: 1,
                        grapth_version: playerInfo.interaction.graph_version,
                        story_list: steinInfo.story_list,
                        choices: steinInfo.edges.questions[0].choices,
                        hidden_vars: steinInfo.hidden_vars,
                    };
                })() : undefined,
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
                    data.ugc_season.sections[0].episodes.map((episode, index) => ({
                        title: episode.title,
                        cover: episode.arc.pic.replace("http:", "https:"),
                        desc: episode.arc.desc,
                        id: episode.aid,
                        cid: episode.cid,
                        eid: episode.id,
                        ss_title: data.ugc_season.title,
                        index
                    })) :
                    data?.pages ? data.pages.map((page, index) => ({
                        title: page.part || data.title,
                        cover: data.pic.replace("http:", "https:"),
                        desc: data.desc,
                        id: data.aid,
                        cid: page.cid,
                        eid: page.page,
                        ss_title: data.title || page.part,
                        index
                    })) : [{
                        title: data.title,
                        cover: data.pic.replace("http:", "https:"),
                        desc: data.desc,
                        id: data.aid,
                        cid: data.aid,
                        eid: data.aid,
                        ss_title: data.title,
                        index: 0,
                    }]
            };
        }
        case Types.MediaType.Bangumi: {
            const info = body as Types.BangumiInfo;
            if (info.code !== 0) {
                if (info.code === -404) { // TRY LESSON
                    return await getMediaInfo(id, Types.MediaType.Lesson);
                }
                throw new ApplicationError(info.message, { code: info.code });
            }
            const data = info.result;
            return {
                id: data.season_id,
                title: data.title,
                cover: data.cover.replace("http:", "https:"),
                desc: data.evaluate,
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
                list: data.episodes.map((episode, index) => ({
                    title: episode.share_copy,
                    cover: episode.cover.replace("http:", "https:"),
                    desc: data.evaluate,
                    id: episode.aid,
                    cid: episode.cid,
                    eid: episode.ep_id,
                    ss_title: data.season_title,
                    index
                }))
            };
        }
        case Types.MediaType.Lesson: {
            const info = body as Types.LessonInfo;
            if (info.code !== 0) {
                throw new ApplicationError(info.message, { code: info.code });
            }
            const data = info.data;
            return {
                id: data.season_id,
                title: data.title,
                cover: data.cover.replace("http:", "https:"),
                desc: `${data.subtitle || ''}\n${data.faq.title || ''}\n${data.faq.content || ''}`,
                type,
                tags: [],
                stat: {
                    play: data.stat.play,
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
                list: data.episodes.map((episode, index) => ({
                    title: episode.title,
                    cover: episode.cover.replace("http:", "https:"),
                    desc: data.subtitle,
                    id: episode.aid,
                    cid: episode.cid,
                    eid: episode.id,
                    ss_title: data.title,
                    index
                }))
            };
        }
        case Types.MediaType.Music: {
            const info = body as Types.MusicInfo;
            if (info.code !== 0) {
                throw new ApplicationError(info.msg, { code: info.code });
            }
            const tagsResp = await fetch(`https://www.bilibili.com/audio/music-service-c/web/tag/song?sid=` + id.match(/\d+/)?.[0], {
                headers: store.state.data.headers,
                ...(store.state.settings.proxy.addr && {
                    proxy: { all: formatProxyUrl(store.state.settings.proxy) }
                })
            });
            if (!tagsResp.ok) {
                throw new ApplicationError(tagsResp.statusText, { code: tagsResp.status });
            }        
            const tagsBody = await tagsResp.json() as Types.MusicTagsInfo;
            if (tagsBody.code !== 0) {
                throw new ApplicationError(tagsBody.msg, { code: tagsBody.code });
            }
            const data = info.data;
            return {
                id: data.aid,
                title: data.title,
                cover: data.cover.replace("http:", "https:"),
                desc: data.intro,
                type,
                tags: [],
                stat: {
                    play: data.statistic.play,
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
                list: [{
                    title: data.title,
                    cover: data.cover.replace("http:", "https:"),
                    desc: data.intro,
                    id: data.id,
                    cid: data.cid,
                    eid: data.id,
                    ss_title: data.title,
                    index: 0,
                }]
            };
        }
        case Types.MediaType.Manga: {
            const info = body as Types.MangaInfo;
            if (info.code !== 0) {
                throw new ApplicationError(info.msg, { code: info.code });
            }
            const data = info.data;
            return {
                id: data.id,
                title: data.title,
                cover: data.vertical_cover.replace("http:", "https:"),
                desc: data.evaluate,
                type,
                tags: data.tags.map(tag => tag.name),
                stat: {
                    play: null,
                    reply: data.ep_list.map(episode => episode.comments).reduce((a, b) => a + b),
                    like: data.ep_list.map(episode => episode.like_count).reduce((a, b) => a + b),
                    coin: null,
                    favorite: null,
                    share: null,
                },
                upper: {
                    avatar: data.authors[0].avatar.replace("http:", "https:"),
                    name: data.authors[0].name,
                    mid: data.authors[0].id,
                },
                list: data.ep_list.reverse().map((episode, index) => ({
                    title: episode.title.trim() || episode.short_title,
                    cover: episode.cover.replace("http:", "https:"),
                    desc: data.evaluate,
                    id: episode.id,
                    cid: episode.id,
                    eid: episode.id,
                    ss_title: data.title,
                    index
                })),
            }
        }
        default: throw 'No type named ' + type;
    }
}

async function getDashDurl(
    data: Types.VideoPlayUrlInfo["data"] | Types.BangumiPlayUrlInfo["result"] | Types.LessonPlayUrlInfo["data"],
    info: Types.MediaInfo["list"][0],
    type: Types.MediaType,
    options?: { codec?: Types.StreamCodecType, qn?: number }
) : Promise<Types.DashInfo | Types.DurlInfo | Types.CommonDurlData> { 
    if ('dash' in data && data.dash) {
        return {
            type: 'dash',
            video: data.dash.video,
            audio: [
                ...data.dash.audio, 
                ...(data.dash.dolby?.audio?.length ? [data.dash.dolby.audio[0]] : []),
                ...(data.dash.flac?.audio ? [data.dash.flac.audio] : []),
            ],
        }
    } else if ('durl' in data && data.durl.length) {
        const result = {
            codecid: 7,
            size: data.durl[0].size,
            base_url: data.durl[0].url,
            backup_url: data.durl[0].backup_url
        };
        if (options?.qn) {
            return { ...result, id: options.qn };
        }
        return {
            type: data.format === 'mp4' ? 'mp4' : 'flv',
            video: await Promise.all(
                data.accept_quality.map(id => {
                    if (id === data.quality) {
                        return { ...result, id }
                    }
                    return getPlayUrl(info, type, { codec: options?.codec, qn: id })
                })
            ) as Types.CommonDurlData[]
        }
    } else throw 'No such codec: ' + options?.codec;
}

export async function getPlayUrl(
    info: Types.MediaInfo["list"][0],
    type: Types.MediaType,
    options?: { codec?: Types.StreamCodecType, qn?: number }
) : Promise<Types.DashInfo | Types.DurlInfo | Types.MusicUrlInfo | Types.MusicUrlData | Types.CommonDurlData> {
    let url = "https://api.bilibili.com";
    let fnval;
    switch (options?.codec) {
        case Types.StreamCodecType.Dash:
        case Types.StreamCodecType.Flv:
            fnval = 4048;
            break;
        case Types.StreamCodecType.Mp4:
            fnval = 1;
            break;
    }
    let params = {
        fnval, fnver: 0, fourk: 1, qn: options?.qn || 127,
        avid: info.id, cid: info.cid, ep_id: info.eid,
    } as any;
    switch(type) {
        case Types.MediaType.Video:
            url += '/x/player/wbi/playurl';
            break;
        case Types.MediaType.Bangumi:
            url += '/pgc/player/web/playurl';
            break;
        case Types.MediaType.Lesson:
            url += '/pugv/player/web/playurl';
            break;
        case Types.MediaType.Music:
            url += '/audio/music-service-c/url';
            params = {
                songid: info.id, quality: options?.qn, privilege: 2,
                mid: store.state.user.mid, platform: 'web'
            }
            break;
    }
    const body = await tryFetch(url, { wbi: type === Types.MediaType.Video, params });
    switch(type) {
        case Types.MediaType.Video: {
            const data = (body as Types.VideoPlayUrlInfo).data;
            return await getDashDurl(data, info, type, options);
        }
        case Types.MediaType.Bangumi: {
            const data = (body as Types.BangumiPlayUrlInfo).result;
            return await getDashDurl(data, info, type, options);
        }
        case Types.MediaType.Lesson: {
            const data = (body as Types.LessonPlayUrlInfo).data;
            return await getDashDurl(data, info, type, options);
        }
        case Types.MediaType.Music: {
            const data = (body as Types.MusicPlayUrlInfo).data;
            const id = (() => {switch (options?.qn) {
                case 0: return 30228;
                case 1: return 30280;
                case 2: return 30380;
                case 3: return 30252;
                default: throw 'No qn named ' + options?.qn
            }})();
            const result = {
                id,
                size: data.size,
                base_url: data.cdns[0],
                backup_url: data.cdns
            };
            if (options?.qn !== 0) return result;
            return {
                type: 'music',
                audio: await Promise.all(data.qualities.map(async (quality) => {
                    if (quality.type === options.qn) return result;
                    return getPlayUrl(info, type, { qn: quality.type });
                })) as Types.MusicUrlData[]
            };
        }
        default: throw 'No type named ' + type;
    }
}

export async function pushBackQueue(params: { info: Types.MediaInfoListItem, video?: Types.CommonDashData | Types.CommonDurlData, audio?: Types.CommonDashData | Types.MusicUrlData, output?: string, media_type: string }) {
    if (!params.video && !params.audio) throw new ApplicationError('No videos or audios found');
    const _currentSelect = store.state.data.currentSelect;
    const currentSelect: Types.CurrentSelect = {
        dms: params.video ? _currentSelect.dms : -1,
        cdc: params.video ? _currentSelect.cdc : -1,
        ads: params.audio ? _currentSelect.ads : -1,
        fmt: _currentSelect.fmt,
    };
    const ext = getFileExtension(currentSelect);
    const tasks = [
        ...(params.video ? [{
            urls: [params.video.base_url, ...params.video.backup_url],
            media_type: "video",
        }] : []),
        ...(params.audio ? [{
            urls: [params.audio.base_url, ...params.audio.backup_url],
            media_type: "audio",
        }] : []),
        ...(params.video && params.audio ? [{ urls: [], media_type: "merge" }] : []),
        ...(ext === "flac" ? [{ urls: [], media_type: "flac" }] : [])
    ];
    const ts = {
        millis: Date.now(),
        string: timestamp(Date.now(), { file: true })
    }
    const ssTitle = filename({ mediaType: params.media_type, aid: params.info.id, title: params.info.ss_title });
    const queueInfo: Types.QueueInfo = await invoke('push_back_queue', { info: params.info, currentSelect, tasks, ts, ext, output: params.output, ssTitle });
    store.commit('pushToArray', { 'queue.waiting': queueInfo});
    return queueInfo;
}

export async function getBinary(url: string | URL) {
    const response = await fetch(url, {
        headers: store.state.data.headers,
        ...(store.state.settings.proxy.addr && {
            proxy: { all: formatProxyUrl(store.state.settings.proxy) }
        })
    });
    if (!response.ok) {
        throw new ApplicationError(response.statusText, { code: response.status });
    }
    return await response.arrayBuffer();
}

export async function getAISummary(info: Types.MediaInfo["list"][0], mid: number, options?: { check?: boolean }) {
    const params = {
        aid: info.id, cid: info.cid, up_mid: mid
    };
    const response = await tryFetch("https://api.bilibili.com/x/web-interface/view/conclusion/get", { wbi: true, params });
    const body = response as Types.AISummaryInfo;
    if (options?.check) return body.data.code;
    if (!body.data.model_result.result_type) {
        throw new ApplicationError('No summary', { code: body.code });
    }
    let text = `# ${info.title} - av${info.id}\n\n${body.data.model_result.summary}\n\n`;
    if (body.data.model_result.result_type === 2) {
        body.data.model_result.outline.forEach(section => {
            text += `## ${section.title} - [${duration(section.timestamp, 'video')}](https://www.bilibili.com/video/av${info.id}?t=${section.timestamp})\n\n`;
            section.part_outline.forEach(part => {
                text += `- ${part.content} - [${duration(part.timestamp, 'video')}](https://www.bilibili.com/video/av${info.id}?t=${part.timestamp})\n\n`;
            });
        })
    }
    return text;
}

export async function getLiveDanmaku(info: Types.MediaInfo["list"][0]) {
    /* const params = {
        type: 1, oid: info.cid, pid: info.id, segment_index: 1, // Segment INOP,  
    }
    const buffer = await tryFetch('https://api.bilibili.com/x/v2/dm/wbi/web/seg.so', { type: 'binary', wbi: true, params });
    const xml = dm_v1.DmSegMobileReplyToXML(new Uint8Array(buffer));
    return new TextEncoder().encode(xml); */
    const buffer = await tryFetch('https://api.bilibili.com/x/v1/dm/list.so', { type: 'binary', params: { oid: info.cid } });
    return pako.inflateRaw(buffer);
}

export async function getHistoryDanmaku(info: Types.MediaInfo["list"][0], date: string) {
    const params = { type: 1, oid: info.cid, date };
    const buffer = await tryFetch('https://api.bilibili.com/x/v2/dm/web/history/seg.so', { type: 'binary', params });
    const xml = dm_v1.DmSegMobileReplyToXML(new Uint8Array(buffer));
    return new TextEncoder().encode(xml);
}

export async function getPlayerInfo(id: number, cid: number) {
    const params = { aid: id, cid };
    const response = await tryFetch('https://api.bilibili.com/x/player/wbi/v2', { wbi: true, params });
    const body = response as Types.PlayerInfo;
    return body.data;
}

export async function getSteinInfo(id: number, graph_version: number, edge_id?: number) {
    const params = { aid: id, graph_version, ...(edge_id && { edge_id }) };
    const response = await tryFetch('https://api.bilibili.com/x/stein/edgeinfo_v2', { wbi: true, params });
    const body = response as Types.SteinInfo;
    return body.data;
}

export async function getFavoriteList() {
    const result = await checkRefresh();
    const up_mid = store.state.data.headers.Cookie.match(/DedeUserID=(\d+)(?=;|$)/)?.[1];
    if (result !== 0 || !up_mid) return;
    const response = await tryFetch('https://api.bilibili.com/x/v3/fav/folder/created/list-all', { params: { up_mid } });
    const body = response as Types.FavoriteList;
    return body.data.list;
}

export async function getFavoriteContent(media_id: number, pn: number) {
    const response = await tryFetch('https://api.bilibili.com/x/v3/fav/resource/list', { params: { media_id, ps: 20, pn } });
    const body = response as Types.FavoriteContent;
    return body.data;
}

export async function getMangaImages(epid: number, parent: string, name: string) {
    const response = await fetch('https://manga.bilibili.com/twirp/comic.v1.Comic/GetImageIndex?device=pc&platform=web&nov=25', {
        headers: {
            ...store.state.data.headers,
            'Content-Type': 'application/json',
        },
        ...(store.state.settings.proxy.addr && {
            proxy: { all: formatProxyUrl(store.state.settings.proxy) }
        }),
        method: 'POST',
        body: JSON.stringify({ ep_id: epid })
    });
    if (!response.ok) {
        throw new ApplicationError(response.statusText, { code: response.status });
    }
    const body = await response.json() as Types.MangaImageIndex;
    if (body.code !== 0) {
        throw new ApplicationError(body.msg, { code: body.code });
    }
    let images = body.data.images.map(i => i.path);
    for (let [index, image] of images.entries()) {
        const url = await getMangaToken(image);
        const path = await pathJoin(parent, name, index + 1 + '.jpg');
        await invoke('write_binary', { 
            contents: transformImage(await getBinary(url)),
            secret: store.state.data.secret,
            path,
        });
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

async function getMangaToken(path: string) {
    const response = await fetch('https://manga.bilibili.com/twirp/comic.v1.Comic/ImageToken?device=pc&platform=web&nov=25', {
        headers: {
            ...store.state.data.headers,
            'Content-Type': 'application/json',
        },
        ...(store.state.settings.proxy.addr && {
            proxy: { all: formatProxyUrl(store.state.settings.proxy) }
        }),
        method: 'POST',
        body: JSON.stringify({
            urls: `[\"${path}\"]`,
            m1: (await getM1AndKey()).key,
        })
    });
    if (!response.ok) {
        throw new ApplicationError(response.statusText, { code: response.status });
    }
    const body = await response.json() as Types.MangaImageToken;
    return body.data[0].complete_url;
}