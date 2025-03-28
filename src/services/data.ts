import { ApplicationError, tryFetch, timestamp, duration, getFileExtension, filename, getRandomInRange } from "@/services/utils";
import { useAppStore, useSettingsStore } from "@/store";
import { checkRefresh } from "@/services/login";
import * as Types from "@/types/data.d";
import * as Backend from "@/services/backend";
import * as dm_v1 from "@/proto/dm_v1";
import pako from 'pako';

export async function getMediaInfo(id: string, type: Types.MediaType): Promise<Types.MediaInfo> {
    let url = "https://api.bilibili.com";
    let params = {} as any;
    const _id = Number(id.match(/\d+/)?.[0]);
    switch(type) {
        case Types.MediaType.Video:
            url += '/x/web-interface/view/detail';
            params = id.toLowerCase().startsWith('bv') ? { bvid: id } : { aid: _id };
            break;
        case Types.MediaType.Bangumi:
            url += '/pgc/view/web/season';
            params = id.toLowerCase().startsWith('ss') ? { season_id: _id } : { ep_id: _id };
            break;
        case Types.MediaType.Lesson:
            url += '/pugv/view/web/season';
            params = id.toLowerCase().startsWith('ss') ? { season_id: _id } : { ep_id: _id };
            break;
        case Types.MediaType.Music:
            url = "https://www.bilibili.com/audio/music-service-c/web/song/info";
            params = { sid: _id };
            break;
        case Types.MediaType.Manga:
            url = "https://manga.bilibili.com/twirp/comic.v1.Comic/ComicDetail";
            params = { device: "pc", platform: "web", nov: 25 };
            break;
    }
    const body = await tryFetch(url, {
        params, handleError: false,
        ...(type === Types.MediaType.Manga && {
            auth: 'ultra_sign',
            post: { type: 'json', body: { comic_id: _id } }
        })
    });
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
                    avatar: data.owner.face.replace("http:", "https:"),
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
                        duration: episode.page.duration,
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
                        duration: page.duration,
                        ss_title: data.title || page.part,
                        index
                    })) : [{
                        title: data.title,
                        cover: data.pic.replace("http:", "https:"),
                        desc: data.desc,
                        id: data.aid,
                        cid: data.aid,
                        eid: data.aid,
                        duration: data.duration,
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
                    avatar: data?.up_info?.avatar.replace("http:", "https:"),
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
                    duration: episode.duration / 1000,
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
                    avatar: data.up_info.avatar.replace("http:", "https:"),
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
                    duration: episode.duration,
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
                    duration: data.duration,
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
                    reply: data.ep_list.length ? data.ep_list.map(episode => episode.comments).reduce((a, b) => a + b) : null,
                    like: data.ep_list.length ? data.ep_list.map(episode => episode.like_count).reduce((a, b) => a + b) : null,
                    coin: null,
                    favorite: null,
                    share: null,
                },
                upper: {
                    avatar: data.authors[0].avatar.replace("http:", "https:"),
                    name: data.authors[0].name,
                    mid: data.authors[0].id,
                },
                list: data.ep_list.length ? data.ep_list.reverse().map((episode, index) => ({
                    title: episode.title.trim() || episode.short_title,
                    cover: episode.cover.replace("http:", "https:"),
                    desc: data.evaluate,
                    id: episode.id,
                    cid: episode.id,
                    eid: episode.id,
                    duration: episode.image_count,
                    ss_title: data.title,
                    index
                })) : [],
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
            url += '/audio/music-service-c/web/url';
            params = {
                sid: info.id, quality: options?.qn, privilege: 2
            }
            break;
    }
    const body = await tryFetch(url, {
        ...(type === Types.MediaType.Video && {
            auth: 'wbi'
        }),
        params
    });
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

export async function pushBackQueue( params: {
    info: Backend.MediaInfoListItem,
    video?: Types.CommonDashData | Types.CommonDurlData,
    audio?: Types.CommonDashData | Types.MusicUrlData,
    output?: string, media_type: string
}) {
    if (!params.video && !params.audio) throw new ApplicationError('No videos or audios found');
    const _currentSelect = useAppStore().currentSelect;
    const currentSelect: Backend.CurrentSelect = {
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
        } as Backend.Task] : []),
        ...(params.audio ? [{
            urls: [params.audio.base_url, ...params.audio.backup_url],
            media_type: "audio",
        } as Backend.Task] : []),
        ...(params.video && params.audio ? [{
            urls: [""],
            media_type: "merge"
        } as Backend.Task] : []),
        ...(ext === "flac" ? [{
            urls: [""],
            media_type: "flac"
        } as Backend.Task] : [])
    ];
    const ts: Backend.Timestamp = {
        millis: Date.now(),
        string: timestamp(Date.now(), { file: true })
    }
    const ss_title = filename({
        mediaType: params.media_type, aid: params.info.id, title: params.info.ss_title
    });
    const result = await Backend.commands.pushBackQueue(
        params.info, currentSelect,
        tasks, ts, ext,
        params.output ?? null, ss_title
    );
    if (result.status === 'error') throw new ApplicationError(result.error);
    return result.data;
}

export async function getBinary(url: string | URL) {
    return await tryFetch(url, { type: 'binary' });
}

export async function getAISummary(info: Types.MediaInfo["list"][0], mid: number, options?: { check?: boolean }) {
    const params = {
        aid: info.id, cid: info.cid, up_mid: mid
    };
    const response = await tryFetch("https://api.bilibili.com/x/web-interface/view/conclusion/get", { auth: 'wbi', params });
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

export async function getLiveDanmaku(id: number, cid: number, duration: number) {
    if (useSettingsStore().advanced.prefer_pb_danmaku) {
        let xmlDoc = new DOMParser().parseFromString('<?xml version="1.0" encoding="UTF-8"?><i></i>', "application/xml");
        for (let i = 0; i < Math.ceil(duration / 360); i++) {
            const params = {
                type: 1, oid: cid, pid: id, segment_index: i + 1,
            }
            const buffer = await tryFetch('https://api.bilibili.com/x/v2/dm/wbi/web/seg.so', { type: 'binary', auth: 'wbi', params });
            dm_v1.DmSegMobileReplyToXML(new Uint8Array(buffer), { inputXml: xmlDoc });
            await new Promise(resolve => setTimeout(resolve, getRandomInRange(100, 500)));
        }
        return new TextEncoder().encode(new XMLSerializer().serializeToString(xmlDoc));
    } else {
        const buffer = await tryFetch('https://api.bilibili.com/x/v1/dm/list.so', { type: 'binary', params: { oid: cid } });
        return pako.inflateRaw(buffer);
    }
}

export async function getHistoryDanmaku(oid: number, date: string) {
    const params = { type: 1, oid, date };
    const buffer = await tryFetch('https://api.bilibili.com/x/v2/dm/web/history/seg.so', { type: 'binary', params });
    const xml = dm_v1.DmSegMobileReplyToXML(new Uint8Array(buffer));
    return new TextEncoder().encode(xml);
}

export async function getPlayerInfo(id: number, cid: number) {
    const params = { aid: id, cid };
    const response = await tryFetch('https://api.bilibili.com/x/player/wbi/v2', { auth: 'wbi', params });
    const body = response as Types.PlayerInfo;
    return body.data;
}

export async function getSteinInfo(id: number, graph_version: number, edge_id?: number) {
    const params = { aid: id, graph_version, ...(edge_id && { edge_id }) };
    const response = await tryFetch('https://api.bilibili.com/x/stein/edgeinfo_v2', { auth: 'wbi', params });
    const body = response as Types.SteinInfo;
    return body.data;
}

export async function getFavoriteList() {
    const result = await checkRefresh();
    const up_mid = useAppStore().headers.Cookie.match(/DedeUserID=(\d+)(?=;|$)/)?.[1];
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

export async function getSubtitles(id: number, cid: number): Promise<Types.SubtitleList[]> {
    const playerInfo = await getPlayerInfo(id, cid);
    return playerInfo.subtitle.subtitles;
}

export async function getSubtitle(input: string) {
    const url = input.startsWith('//') ? 'https:' + input : input;
    const subtitles = await tryFetch(url) as Types.SubtitleInfo;
    const getTime = (s: number) => { // Only works for input < 24 hour
        return new Date(s * 1000).toISOString().slice(11, 23).replace('.', ',');
    };
    return subtitles.body.map((l, i) => `${i + 1}\n${getTime(l.from)} --> ${getTime(l.to)}\n${l.content}`).join('\n\n');
}