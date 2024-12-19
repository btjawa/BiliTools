import { fetch } from "@tauri-apps/plugin-http";
import { ApplicationError, formatProxyUrl, tryFetch, timestamp, duration } from "@/services/utils";
import { invoke } from "@tauri-apps/api/core";
import * as DataTypes from "@/types/data.d";
import * as dm_v1 from "@/proto/dm_v1";
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
    if (!response.ok) {
        throw new ApplicationError(response.statusText, { code: response.status });
    }
    const body = await response.json();
    console.log(body)
    switch(type) {
        case DataTypes.MediaType.Video: {
            const info = body as DataTypes.VideoInfo;
            if (info.code !== 0) {
                throw new ApplicationError(info.message, { code: info.code });
            }
            const data = info.data.View;
            return {
                id: data.aid,
                title: data.title,
                cover: data.pic.replace("http:", "https:"),
                desc: data.desc.replace("\n", "<br>"),
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
                    data.ugc_season.sections[0].episodes.map(episode => ({
                        title: episode.title,
                        cover: episode.arc.pic.replace("http:", "https:"),
                        desc: episode.arc.desc,
                        id: episode.aid,
                        cid: episode.cid,
                        eid: episode.id,
                        ss_title: data.ugc_season.title,
                    })) :
                    data.pages.map(page => ({
                        title: page.part || data.title,
                        cover: data.pic.replace("http:", "https:"),
                        desc: data.desc,
                        id: data.aid,
                        cid: page.cid,
                        eid: page.page,
                        ss_title: data.title || page.part,
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
                id: data.season_id,
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
                id: data.season_id,
                title: data.title,
                cover: data.cover.replace("http:", "https:"),
                desc: `${data.subtitle || ''}<br>${data.faq.title || ''}<br>${data.faq.content || ''}`,
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
            if (!tagsResp.ok) {
                throw new ApplicationError(tagsResp.statusText, { code: tagsResp.status });
            }        
            const tagsBody = await tagsResp.json() as DataTypes.MusicTagsInfo;
            if (tagsBody.code !== 0) {
                throw new ApplicationError(tagsBody.msg, { code: tagsBody.code });
            }
            const data = info.data;
            return {
                id: data.aid,
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
                list: [{
                    title: data.title,
                    cover: data.cover.replace("http:", "https:"),
                    desc: data.intro.replace("\n", "<br>"),
                    id: data.id,
                    cid: data.cid,
                    eid: data.id,
                    ss_title: data.title,
                }]
            };
        }
        default: throw 'No type named ' + type;
    }
}

export async function getPlayUrl(info: DataTypes.MediaInfo["list"][0], type: DataTypes.MediaType, options?: { codec?: DataTypes.StreamCodecType, qn?: number })
: Promise<DataTypes.DashInfo | DataTypes.DurlInfo | DataTypes.MusicUrlInfo | DataTypes.CommonDurlData | DataTypes.MusicUrlData> {
    let url = "https://api.bilibili.com";
    let fnval;
    switch (options?.codec) {
        case DataTypes.StreamCodecType.Dash:
            fnval = 4048;
            break;
        case DataTypes.StreamCodecType.Mp4:
            fnval = 1;
            break;
        case DataTypes.StreamCodecType.Flv:
            fnval = 0;
            break;
    }
    let params = {
        fnval, fnver: 0, fourk: 1, qn: options?.qn || 127,
        avid: info.id, cid: info.cid, ep_id: info.eid,
    } as any;
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
            params = {
                songid: info.id, quality: options?.qn, privilege: 2,
                mid: store.state.user.mid, platform: 'web'
            }
            break;
    }
    const body = await tryFetch(url, { wbi: type === DataTypes.MediaType.Video, params });
    switch(type) {
        case DataTypes.MediaType.Video: {
            const data = (body as DataTypes.VideoPlayUrlInfo).data;
            if (options?.codec === DataTypes.StreamCodecType.Dash) {
                return {
                    video: data.dash.video,
                    audio: [
                        ...data.dash.audio, 
                        ...(data.dash.dolby?.audio ? [data.dash.dolby.audio[0]] : []),
                        ...(data.dash.flac?.audio ? [data.dash.flac.audio] : []),
                    ],
                }
            } else if (options?.codec === DataTypes.StreamCodecType.Mp4) {
                if (options?.qn) {
                    return {
                        id: options.qn,
                        codecid: 7,
                        size: data.durl[0].size,
                        base_url: data.durl[0].url,
                        backup_url: data.durl[0].backup_url
                    }
                }
                return {
                    video: await Promise.all(
                        data.accept_quality.map(id => getPlayUrl(info, type, { codec: options?.codec, qn: id }))
                    ) as any
                }
            } else throw 'No such codec: ' + options?.codec;
        }
        case DataTypes.MediaType.Bangumi: {
            const info = body as DataTypes.BangumiPlayUrlInfo;
            const data = info.result;
            return {
                video: data.dash.video,
                audio: data.dash.audio,
            }
        }
        case DataTypes.MediaType.Lesson: {
            const info = body as DataTypes.LessonPlayUrlInfo;
            const data = info.data;
            return {
                video: data.dash.video,
                audio: data.dash.audio,
            }
        }
        case DataTypes.MediaType.Music: {
            const _info = body as DataTypes.MusicPlayUrlInfo;
            const data = _info.data;
            const id = (() => {switch (options?.qn) {
                case 0: return 30228;
                case 1: return 30280;
                case 2: return 30380;
                case 3: return 30252;
                default: throw 'No qn named ' + options?.qn
            }})();
            if (options?.qn !== 0) {
                return {
                    id,
                    size: data.size,
                    base_url: data.cdns[0],
                    backup_url: data.cdns
                }
            }
            return {
                audio: await Promise.all(data.qualities.map(async (quality) => {
                    if (quality.type === options.qn) return {
                        id,
                        size: data.size,
                        base_url: data.cdns[0],
                        backup_url: data.cdns
                    };
                    return await getPlayUrl(info, type, { qn: quality.type });
                }))
            } as any;
        }
        default: throw 'No type named ' + type;
    }
}

export async function pushBackQueue(params: { info: DataTypes.MediaInfoListItem, video?: DataTypes.CommonDashData | DataTypes.CommonDurlData, audio?: DataTypes.CommonDashData | DataTypes.MusicUrlData }) {
    if (!params.video && !params.audio) throw new ApplicationError('No videos or audios found');
    const tasks = [
        ...(params.video ? [{
            urls: [params.video.base_url, ...params.video.backup_url],
            media_type: "video",
        }] : []),
        ...(params.audio ? [{
            urls: [params.audio.base_url, ...params.audio.backup_url],
            media_type: "audio",
        }] : []),
        ...(params.video && params.audio ? [{ urls: [], media_type: "merge" }] : [])
    ];
    const ts = {
        millis: Date.now(),
        string: timestamp(Date.now(), { file: true })
    }
    const currentSelect = store.state.data.currentSelect;
    const ext = (() => {
        if (params.video) return 'mp4';
        else if (params.audio) {
            return currentSelect.ads === 30252 ? 'flac' : 'aac';
        }
    })()
    const queueInfo: DataTypes.QueueInfo = await invoke('push_back_queue', { info: params.info, currentSelect, tasks, ts, ext });
    store.commit('pushToArray', { 'queue.waiting': queueInfo});
    console.log(store.state.queue)
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

export async function getAISummary(info: DataTypes.MediaInfo["list"][0], mid: number, options?: { check?: boolean }) {
    const params = {
        aid: info.id, cid: info.cid, up_mid: mid
    };
    const response = await tryFetch("https://api.bilibili.com/x/web-interface/view/conclusion/get", { wbi: true, params });
    const body = response as DataTypes.AISummaryInfo;
    console.log(body)
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

export async function getLiveDanmaku(info: DataTypes.MediaInfo["list"][0], type?: DataTypes.MediaType) {
    const params = {
        type: type === DataTypes.MediaType.Manga ? 2 : 1,
        oid: info.cid, pid: info.id, segment_index: 1, // Segment INOP,  
    }
    const buffer = await tryFetch('https://api.bilibili.com/x/v2/dm/wbi/web/seg.so', { type: 'binary', wbi: true, params });
    const xml = dm_v1.DmSegMobileReplyToXML(new Uint8Array(buffer));
    return new TextEncoder().encode(xml);
}

export async function getHistoryDanmaku(info: DataTypes.MediaInfo["list"][0], date: string) {
    const params = { type: 1, oid: info.cid, date };
    const buffer = await tryFetch('https://api.bilibili.com/x/v2/dm/web/history/seg.so', { type: 'binary', params });
    const xml = dm_v1.DmSegMobileReplyToXML(new Uint8Array(buffer));
    return new TextEncoder().encode(xml);
}

export async function getPlayerInfo(id: number, cid: number) {
    const params = { aid: id, cid };
    const response = await tryFetch('https://api.bilibili.com/x/player/wbi/v2', { wbi: true, params });
    const body = response as DataTypes.PlayerInfo;
    return body.data;
}

export async function getSteinInfo(id: number, graph_version: number, edge_id?: number) {
    const params = { aid: id, graph_version, ...(edge_id && { edge_id }) };
    const response = await tryFetch('https://api.bilibili.com/x/stein/edgeinfo_v2', { wbi: true, params });
    const body = response as DataTypes.SteinInfo;
    return body.data;
}