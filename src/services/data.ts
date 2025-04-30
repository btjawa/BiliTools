import { ApplicationError, tryFetch, timestamp, duration, getFileExtension, filename, getRandomInRange } from "@/services/utils";
import { useSettingsStore, useUserStore } from "@/store";
import * as Types from "@/types/data.d";
import * as Backend from "@/services/backend";
import * as dm_v1 from "@/proto/dm_v1";
import pako from 'pako';

export async function getMediaInfo(id: string, type: Types.MediaType, options?: { pn?: number }): Promise<Types.MediaInfo> {
    let url = "https://api.bilibili.com";
    let params = {} as any;
    const _id = Number(id.match(/\d+/)?.[0]);
    switch(type) {
        case Types.MediaType.Video:
            url += '/x/web-interface/view';
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
        case Types.MediaType.MusicList:
            url = "https://www.bilibili.com/audio/music-service-c/web/menu/info";
            params = { sid: _id };
            break;
        case Types.MediaType.Favorite:
            url += "/x/v3/fav/resource/list";
            params = { media_id: _id, ps: 36, pn: options?.pn ?? 1, platform: 'web' };
    }
    const body = await tryFetch(url, { params });
    if (type === Types.MediaType.Video) {
        const data = (body as Types.VideoInfo).data;
        return {
            id: data.aid,
            title: data.title,
            cover: data.pic.replace("http:", "https:"),
            covers: [{ id: 'ugc_cover', url: data?.ugc_season?.cover }]
            .filter(v => v.url?.length).map(v => ({ id: v.id, url: v.url.replace('http:', 'https:') })),
            desc: data.desc,
            type,
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
    } else if (type === Types.MediaType.Bangumi) {
        const data = (body as Types.BangumiInfo).result;
        const season = data.seasons.find(v => v.season_id === data.season_id);
        const covers = [{ id: 'square_cover', url: data.square_cover }];
        if (season) {
            covers.push({ id: 'horizontal_cover_169', url: season.horizontal_cover_169 });
            covers.push({ id: 'horizontal_cover_1610', url: season.horizontal_cover_1610 });
        }
        return {
            id: data.season_id,
            title: data.title,
            cover: data.cover.replace("http:", "https:"),
            covers: covers.filter(v => v.url.length).map(v => ({ id: v.id, url: v.url.replace('http:', 'https:') })),
            desc: data.evaluate,
            type,
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
                title: episode?.show_title ?? episode.share_copy,
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
    } else if (type === Types.MediaType.Lesson) {
        const data = (body as Types.LessonInfo).data;
        return {
            id: data.season_id,
            title: data.title,
            cover: data.cover.replace("http:", "https:"),
            covers: data.brief.img.map((v, i) => ({ id: 'brief_' + i, url: v.url.replace('http:', 'https:') })),
            desc: `${data.subtitle}\n${data.faq.title}\n${data.faq.content}`,
            type,
            stat: {
                play: data.stat.play,
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
    } else if (type === Types.MediaType.Music) {
        const data = (body as Types.MusicInfo).data;
        return {
            id: data.aid,
            title: data.title,
            cover: data.cover.replace("http:", "https:"),
            covers: [],
            desc: data.intro,
            type,
            stat: {
                play: data.statistic.play,
                reply: data.statistic.comment,
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
    } else if (type === Types.MediaType.MusicList) {
        const data = (body as Types.MusicListInfo).data;
        const listInfo = await tryFetch('https://www.bilibili.com/audio/music-service-c/web/song/of-menu?pn=1&ps=100&sid=' + _id) as Types.MusicListDetailInfo;
        return {
            id: data.menuId,
            title: data.title,
            cover: data.cover.replace("http:", "https:"),
            covers: [],
            desc: data.intro,
            type: Types.MediaType.Music,
            stat: {
                play: data.statistic.play,
                reply: data.statistic.comment,
                favorite: data.statistic.collect,
                share: data.statistic.share,
            },
            upper: {
                avatar: null,
                name: data.uname,
                mid: data.uid,
            },
            list: listInfo.data.data.map((item, index) => ({
                title: item.title,
                cover: item.cover.replace("http:", "https:"),
                desc: data.intro,
                id: item.id,
                cid: item.cid,
                eid: item.id,
                duration: item.duration,
                ss_title: data.title,
                index
            }))
        }
    } else if (type === Types.MediaType.Favorite) {
        const data = (body as Types.FavoriteInfo).data;
        const info = data.info;
        const list = data.medias;
        return {
            id: info.id,
            title: info.title,
            cover: info.cover.replace("http:", "https:"),
            covers: [],
            desc: info.intro,
            type: Types.MediaType.Video,
            stat: {
                play: info.cnt_info.play,
                like: info.cnt_info.thumb_up,
                favorite: info.cnt_info.collect,
                share: info.cnt_info.share,
            },
            upper: {
                avatar: info.upper.face.replace("http:", "https:"),
                name: info.upper.name,
                mid: info.upper.mid,
            },
            list: list.map((item, index) => ({
                title: item.title,
                cover: item.cover.replace("http:", "https:"),
                desc: info.intro,
                id: item.id,
                cid: -1,
                eid: item.id,
                duration: item.duration,
                ss_title: info.title,
                index
            }))
        }
    } else throw 'No type named ' + type;
}

export async function getPlayUrl(
    info: Types.MediaInfo["list"][0],
    type: Types.MediaType,
    codec: Types.StreamCodecType,
) : Promise<Types.PlayUrlProvider> {
    let url = "https://api.bilibili.com";
    const user = useUserStore();
    let params = { qn: user.isLogin ? 127 : 64, fnver: 0, fnval: 16, fourk: 1 } as {
        qn: number, fnver: number, fnval: number, fourk: number,
        avid?: number, cid?: number, ep_id?: number, quality?: number
    };
    switch (codec) {
        case Types.StreamCodecType.Flv: params.fnval = 0; break;
        case Types.StreamCodecType.Mp4: params.fnval = 1; break;
        case Types.StreamCodecType.Dash: params.fnval = user.isLogin ? 4048 : 16; break;
    }
    switch(type) {
        case Types.MediaType.Video:
            url += user.isLogin ? '/x/player/wbi/playurl' : '/x/player/playurl';
            params.avid = info.id;
            params.cid = info.cid === -1 ? await getCid(info.id) : info.cid;
            break;
        case Types.MediaType.Bangumi:
            url += '/pgc/player/web/v2/playurl';
            params.ep_id = info.eid;
            break;
        case Types.MediaType.Lesson:
            url += '/pugv/player/web/playurl';
            params.avid = info.id;
            params.cid = info.cid;
            params.ep_id = info.eid;
            break;
        case Types.MediaType.Music:
            url = 'https://www.bilibili.com/audio/music-service-c/web/url';
            params = { sid: info.id, privilege: 2, quality: 0 } as any;
            break;
    }
    const body = await tryFetch(url, {
        ...(type === Types.MediaType.Video && user.isLogin && { auth: 'wbi' }),
        params
    });
    if (type === Types.MediaType.Music) {
        const info = body as Types.MusicPlayUrlInfo;
        const data = info.data;
        const audio = [{
            id: { 0: 30228, 1: 30280, 2: 30380, 3: 30252 }[data.type] ?? -1,
            baseUrl: data.cdns[0],
            backupUrl: data.cdns
        }];
        const codec = Types.StreamCodecType.Dash;
        const codecid = Types.ReverseStreamCodecMap[codec];
        return { audio, audioQualities: audio.map(v => v.id), codec, codecid }
    } else {
        const data = (body.result?.video_info ?? body?.result ?? body?.data) as Types.VideoPlayUrlInfo['data'];
        if (data.durls?.length) {
            const video = data.durls.map(v => ({
                id: v.quality,
                baseUrl: v.durl[0].url,
                backupUrl: v.durl[0].backup_url,
                size: v.durl[0].size
            }));
            const codec = Types.StreamCodecType.Mp4;
            const codecid = Types.ReverseStreamCodecMap[codec];
            return { video, videoQualities: video.map(v => v.id), codec, codecid };
        } else if (data.durl?.length) {
            const video = (await Promise.all(data.accept_quality.map(async qn => {
                params.qn = qn;
                const info = qn === data.quality ? body : await tryFetch(url, { params }) as Types.VideoPlayUrlInfo;
                const result = info.result?.video_info ?? info?.result ?? info?.data;
                const durl = result.durl?.[0];
                if (durl) return {
                    id: result.quality,
                    baseUrl: durl.url,
                    backupUrl: durl.backup_url,
                    size: durl.size
                };
            }))).filter(Boolean) as Types.PlayUrlResult[];
            const codec = data.accept_format.includes('flv') ? Types.StreamCodecType.Flv : Types.StreamCodecType.Mp4;
            const codecid = Types.ReverseStreamCodecMap[codec];
            return { video, videoQualities: data.accept_quality, codec, codecid }
        } else if (data.dash) {
            const audio = [
                ...data.dash.audio,
                ...(data.dash.dolby?.audio?.length ? [data.dash.dolby.audio[0]] : []),
                ...(data.dash.flac?.audio ? [data.dash.flac.audio] : []),
            ];
            const codec = Types.StreamCodecType.Dash;
            const codecid = Types.ReverseStreamCodecMap[codec];    
            return {
                video: data.dash.video, audio,
                videoQualities: [...new Set(data.dash.video.map(v => v.id))], audioQualities: audio.map(v => v.id), codec, codecid
            }
        } else throw new ApplicationError(body.message, { code: body.code });
    }
}

export async function pushBackQueue(params: {
    info: Types.MediaInfo['list'][0],
    video?: Types.PlayUrlResult,
    audio?: Types.PlayUrlResult,
    select: Backend.CurrentSelect,
    mediaType: string,
    output?: string,
}) {
    if (!params.video && !params.audio) throw new ApplicationError('No videos or audios found');
    const select = params.select;
    const newSelect = { dms: select.dms ?? -1, cdc: select.cdc ?? -1, ads: select.ads ?? -1, fmt: select.fmt ?? -1 };
    const ext = getFileExtension(newSelect);
    const info = params.info;
    const archiveInfo = {
        title: info.title,
        cover: info.cover,
        id: info.id,
        ts: {
            millis: Date.now(),
            string: timestamp(Date.now(), { file: true })
        },
        output_dir: filename({
            mediaType: params.mediaType, aid: info.id, title: info.ss_title
        }),
        output_filename: info.title + '.' + ext,
    };
    const tasks = [
        params.video && {
            urls: [params.video.baseUrl, ...(Array.isArray(params.video.backupUrl) ? params.video.backupUrl : [])],
            taskType: 'video'
        },
        params.audio && {
            urls: [params.audio.baseUrl, ...(Array.isArray(params.audio.backupUrl) ? params.audio.backupUrl : [])],
            taskType: 'audio'
        },
        (params.video && params.audio) && {
            taskType: 'merge'
        },
        ext === 'flac' && {
            taskType: 'flac'
        }
    ].filter(Boolean) as any[];
    const result = await Backend.commands.pushBackQueue(
        archiveInfo, newSelect, tasks, params.output ?? null,
    );
    if (result.status === 'error') throw result.error;
    return result.data;
}

export async function getBinary(url: string | URL) {
    return await tryFetch(url, { type: 'binary' });
}

export async function getCid(aid: number) {
    const body = await tryFetch('https://api.bilibili.com/x/player/pagelist', { params: { aid } });
    return body.data[0].cid as number;
}

export async function getAISummary(info: Types.MediaInfo["list"][0], mid: number, options?: { check?: boolean }) {
    const params = {
        aid: info.id, cid: info.cid === -1 ? await getCid(info.id) : info.cid, up_mid: mid
    };
    const response = await tryFetch("https://api.bilibili.com/x/web-interface/view/conclusion/get", { auth: 'wbi', params });
    const body = response as Types.AISummaryInfo;
    const model_result = body.data.model_result;
    if (options?.check) return model_result.result_type;
    if (!model_result.result_type) {
        throw new ApplicationError('No summary', { code: body.code });
    }
    let text = `# ${info.title} - av${info.id}\n\n${model_result.summary}\n\n`;
    if (model_result.result_type === 2) {
        model_result.outline.forEach(section => {
            text += `## ${section.title} - [${duration(section.timestamp, 'video')}](https://www.bilibili.com/video/av${info.id}?t=${section.timestamp})\n\n`;
            section.part_outline.forEach(part => {
                text += `- ${part.content} - [${duration(part.timestamp, 'video')}](https://www.bilibili.com/video/av${info.id}?t=${part.timestamp})\n\n`;
            });
        })
    }
    return text;
}

export async function getLiveDanmaku(id: number, cid: number, duration: number) {
    const oid = cid === -1 ? await getCid(id) : cid;
    if (useSettingsStore().advanced.prefer_pb_danmaku) {
        let xmlDoc = new DOMParser().parseFromString('<?xml version="1.0" encoding="UTF-8"?><i></i>', "application/xml");
        for (let i = 0; i < Math.ceil(duration / 360); i++) {
            const params = {
                type: 1, oid, pid: id, segment_index: i + 1,
            }
            const buffer = await tryFetch('https://api.bilibili.com/x/v2/dm/wbi/web/seg.so', { type: 'binary', auth: 'wbi', params });
            dm_v1.DmSegMobileReplyToXML(new Uint8Array(buffer), { inputXml: xmlDoc });
            await new Promise(resolve => setTimeout(resolve, getRandomInRange(100, 500)));
        }
        return new TextEncoder().encode(new XMLSerializer().serializeToString(xmlDoc));
    } else {
        const buffer = await tryFetch('https://api.bilibili.com/x/v1/dm/list.so', { type: 'binary', params: { oid } });
        return pako.inflateRaw(buffer);
    }
}

export async function getHistoryDanmaku(id: number, oid: number, date: string) {
    const params = { type: 1, oid: oid === -1 ? await getCid(id) : oid, date };
    const buffer = await tryFetch('https://api.bilibili.com/x/v2/dm/web/history/seg.so', { type: 'binary', params });
    const xml = dm_v1.DmSegMobileReplyToXML(new Uint8Array(buffer));
    return new TextEncoder().encode(xml);
}

export async function getPlayerInfo(id: number, cid: number) {
    const params = { aid: id, cid: cid === -1 ? await getCid(id) : cid };
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

export async function getSubtitles(id: number, cid: number): Promise<Types.Subtitle[]> {
    const playerInfo = await getPlayerInfo(id, cid === -1 ? await getCid(id) : cid);
    return playerInfo.subtitle?.subtitles;
}

export async function getSubtitle(input: string) {
    const url = input.startsWith('//') ? 'https:' + input : input;
    const subtitles = await tryFetch(url) as Types.SubtitleInfo;
    const getTime = (s: number) => { // Only works for input < 24 hour
        return new Date(s * 1000).toISOString().slice(11, 23).replace('.', ',');
    };
    return subtitles.body.map((l, i) => `${i + 1}\n${getTime(l.from)} --> ${getTime(l.to)}\n${l.content}`).join('\n\n');
}