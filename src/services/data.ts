import { ApplicationError, tryFetch, timestamp, duration, getFileExtension, getRandomInRange, getFormat, getPublicImages } from "@/services/utils";
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
        let stein_gate = undefined;
        if (data.rights.is_stein_gate) {
            const playerInfo = await getPlayerInfo(data.aid, data.cid);
            const steinInfo = await getSteinInfo(data.aid, playerInfo.interaction.graph_version);
            stein_gate = {
                edge_id: 1,
                grapth_version: playerInfo.interaction.graph_version,
                story_list: steinInfo.story_list,
                choices: steinInfo.edges.questions[0].choices,
                hidden_vars: steinInfo.hidden_vars,
            };
        }
        const tagsResp = await tryFetch('https://api.bilibili.com/x/tag/archive/tags', { params });
        return {
            type,
            id: data.aid,
            cover: data.pic,
            desc: data.desc,
            stein_gate,
            nfo: {
                tags: (tagsResp as Types.VideoTags).data.map(v => v.tag_name),
                thumbs: [
                    ...getPublicImages(data, 'png'),
                    ...getPublicImages(data?.ugc_season, 'jpg')
                ],
                showtitle: data.ugc_season?.title ?? data.title,
                premiered: timestamp(data.pubdate * 1000),
                upper: {
                    name: data.owner.name,
                    mid: data.owner.mid,
                    avatar: data.owner.face,
                },
                actors: [],
                staff: [],
            },
            stat: {
                play: data.stat.view,
                danmaku: data.stat.danmaku,
                reply: data.stat.reply,
                like: data.stat.like,
                coin: data.stat.coin,
                favorite: data.stat.favorite,
                share: data.stat.share,
            },
            list: data.ugc_season?.sections.find(v => v.type)?.episodes.map((episode, index) => ({
                title: episode.title,
                cover: episode.arc.pic,
                desc: episode.arc.desc,
                aid: episode.aid,
                bvid: episode.bvid,
                cid: episode.cid,
                duration: episode.page.duration,
                pubtime: episode.arc.pubdate,
                isTarget: data.aid === episode.aid,
                index
            })) ?? data.pages?.map((page, index) => ({
                title: page.part || data.title,
                cover: data.pic,
                desc: data.desc,
                aid: data.aid,
                bvid: data.bvid,
                cid: page.cid,
                duration: page.duration,
                pubtime: data.pubdate,
                isTarget: index === 0,
                index
            })) ?? [{
                title: data.title,
                cover: data.pic,
                desc: data.desc,
                aid: data.aid,
                bvid: data.bvid,
                cid: data.cid,
                duration: data.duration,
                pubtime: data.pubdate,
                isTarget: true,
                index: 0,
            }]
        };
    } else if (type === Types.MediaType.Bangumi) {
        const data = (body as Types.BangumiInfo).result;
        const season = data.seasons.find(v => v.season_id === data.season_id);
        return {
            type,
            id: data.season_id,
            cover: data.cover,
            desc: data.evaluate,
            nfo: {
                tags: data.styles,
                thumbs: [
                    ...getPublicImages(data, 'png'),
                    ...getPublicImages(season ?? {}, 'png')
                ],
                showtitle: data.season_title,
                premiered: data.publish.pub_time.split(' ')[0],
                upper: data.up_info ? {
                    name: data.up_info.uname,
                    mid: data.up_info.mid,
                    avatar: data.up_info.avatar,
                } : null,
                actors: data.actors.split('\n').map(actor => {
                    const [name, role] = actor.split('\uFF1A');
                    return { name, role: role ?? '' };
                }),
                staff: data.staff.split('\n')
            },
            stat: {
                play: data.stat.views,
                danmaku: data.stat.danmakus,
                reply: data.stat.reply,
                like: data.stat.likes,
                coin: data.stat.coins,
                favorite: data.stat.favorite,
                share: data.stat.share,
            },
            list: data.episodes.map((episode, index) => ({
                title: episode.show_title,
                cover: episode.cover,
                desc: data.evaluate,
                aid: episode.aid,
                bvid: episode.bvid,
                cid: episode.cid,
                epid: episode.ep_id,
                ssid: data.season_id,
                duration: episode.duration / 1000,
                pubtime: episode.pub_time,
                isTarget: _id === episode.id,
                index
            }))
        };
    } else if (type === Types.MediaType.Lesson) {
        const data = (body as Types.LessonInfo).data;
        return {
            type,
            id: data.season_id,
            cover: data.cover,
            desc: `${data.subtitle}\n${data.faq.title}\n${data.faq.content}`,
            nfo: {
                tags: [],
                thumbs: [
                    ...getPublicImages(data, 'jpg'),
                    ...data.brief.img.map((v, i) => ({ id: 'brief' + (i+1), url: v.url }))
                ],
                showtitle: data.title,
                premiered: timestamp(data.episodes[0].release_date * 1000),
                upper: {
                    avatar: data.up_info.avatar,
                    name: data.up_info.uname,
                    mid: data.up_info.mid,
                },
                actors: [],
                staff: [],
            },
            stat: {
                play: data.stat.play,
            },
            list: data.episodes.map((episode, index) => ({
                title: episode.title,
                cover: episode.cover,
                desc: data.subtitle,
                aid: episode.aid,
                cid: episode.cid,
                epid: episode.id,
                ssid: data.season_id,
                duration: episode.duration,
                pubtime: episode.release_date,
                isTarget: index === 0,
                index
            }))
        };
    } else if (type === Types.MediaType.Music) {
        const data = (body as Types.MusicInfo).data;
        const tagsResp = await tryFetch('https://www.bilibili.com/audio/music-service-c/web/tag/song', { params });
        const upperResp = await tryFetch('https://www.bilibili.com/audio/music-service-c/web/user/info', { params: { uid: data.uid } });
        const membersResp = await tryFetch('https://www.bilibili.com/audio/music-service-c/web/member/song', { params });
        const members = (membersResp as Types.MusicMembersInfo).data;
        const upper = (upperResp as Types.MusicUpperInfo).data;
        return {
            type,
            id: data.aid,
            cover: data.cover,
            desc: data.intro,
            nfo: {
                tags: (tagsResp as Types.MusicTagsInfo).data.map(v => v.info),
                thumbs: [{ id: 'cover', url: data.cover }],
                showtitle: data.title,
                premiered: timestamp(data.passtime * 1000),
                upper: {
                    name: upper.uname,
                    mid: upper.uid,
                    avatar: upper.avater, // Note: typo in API response, wtf
                },
                actors: [],
                staff: [...new Set(members.map(v => (v.list[0].name.trim())))],
            },
            stat: {
                play: data.statistic.play,
                reply: data.statistic.comment,
                favorite: data.statistic.collect,
                share: data.statistic.share,
            },
            list: [{
                title: data.title,
                cover: data.cover,
                desc: data.intro,
                aid: data.aid,
                sid: data.id,
                bvid: data.bvid,
                cid: data.cid,
                duration: data.duration,
                pubtime: data.passtime,
                isTarget: true,
                index: 0,
            }]
        };
    } else if (type === Types.MediaType.MusicList) {
        const data = (body as Types.MusicListInfo).data;
        const listInfo = await tryFetch('https://www.bilibili.com/audio/music-service-c/web/song/of-menu', {
            params: { pn: options?.pn ?? 1, ps: 20, sid: data.menuId }
        }) as Types.MusicListDetailInfo;
        return {
            type,
            id: data.menuId,
            cover: data.cover,
            desc: data.intro,
            nfo: {
                tags: [],
                thumbs: [{ id: 'cover', url: data.cover }],
                showtitle: data.title,
                premiered: timestamp(data.ctime * 1000),
                upper: {
                    name: data.uname,
                    mid: data.uid,
                    avatar: String(),
                },
                actors: [],
                staff: [],
            },
            stat: {
                play: data.statistic.play,
                reply: data.statistic.comment,
                favorite: data.statistic.collect,
                share: data.statistic.share,
            },
            list: listInfo.data.data.map((item, index) => ({
                title: item.title,
                cover: item.cover,
                desc: data.intro,
                aid: item.aid,
                sid: item.id,
                bvid: item.bvid,
                cid: item.cid,
                duration: item.duration,
                pubtime: item.passtime,
                type: Types.MediaType.Music,
                isTarget: index === 0,
                index
            }))
        }
    } else if (type === Types.MediaType.Favorite) {
        const { info, medias } = (body as Types.FavoriteInfo).data;
        const typeMap: Record<number, Types.MediaType> = {
            2: Types.MediaType.Video,
            12: Types.MediaType.Music,
            24: Types.MediaType.Bangumi,
        };
        return {
            type,
            id: info.id,
            cover: info.cover,
            desc: info.intro,
            nfo: {
                tags: [],
                thumbs: [{ id: 'cover', url: info.cover }],
                showtitle: info.title,
                premiered: timestamp(info.ctime * 1000),
                upper: {
                    avatar: info.upper.face,
                    name: info.upper.name,
                    mid: info.upper.mid,
                },
                actors: [],
                staff: [],
            },
            stat: {
                play: info.cnt_info.play,
                like: info.cnt_info.thumb_up,
                favorite: info.cnt_info.collect,
                share: info.cnt_info.share,
            },
            list: medias.map((item, index) => ({
                title: item.title,
                cover: item.cover,
                desc: info.intro,
                aid: item.id,
                fid: info.id,
                bvid: item.bvid,
                duration: item.duration,
                pubtime: item.pubtime,
                type: typeMap[item.type],
                isTarget: index === 0,
                index
            }))
        }
    } else throw 'No type named ' + type;
}

export async function getPlayUrl(
    info: Types.MediaInfo["list"][0],
    type: Types.MediaType,
    codec: Types.StreamFormat,
) : Promise<Types.PlayUrlProvider> {
    let url = "https://api.bilibili.com";
    const user = useUserStore();
    let params = { qn: user.isLogin ? 127 : 64, fnver: 0, fnval: 16, fourk: 1 } as {
        qn: number, fnver: number, fnval: number, fourk: number, quality?: number,
        avid?: number, cid?: number, ep_id?: number, season_id?: number,
    };
    switch (codec) {
        case Types.StreamFormat.Flv: params.fnval = 0; break;
        case Types.StreamFormat.Mp4: params.fnval = 1; break;
        case Types.StreamFormat.Dash: params.fnval = user.isLogin ? 4048 : 16; break;
    }
    switch(type) {
        case Types.MediaType.Favorite:
        case Types.MediaType.Video:
            url += user.isLogin ? '/x/player/wbi/playurl' : '/x/player/playurl';
            params.avid = info.aid;
            params.cid = info.cid;
            break;
        case Types.MediaType.Bangumi:
            url += '/pgc/player/web/v2/playurl';
            params.ep_id = info.epid;
            params.season_id = info.ssid;
            break;
        case Types.MediaType.Lesson:
            url += '/pugv/player/web/playurl';
            params.avid = info.aid;
            params.cid = info.cid;
            params.ep_id = info.epid;
            params.season_id = info.ssid;
            break;
        case Types.MediaType.MusicList:
        case Types.MediaType.Music:
            url = 'https://www.bilibili.com/audio/music-service-c/web/url';
            params = { sid: info.sid, privilege: 2, quality: 0 } as any;
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
        const codec = Types.StreamFormat.Dash;
        return { audio, audioQualities: audio.map(v => v.id), codec }
    } else {
        const data = (body.result?.video_info ?? body?.result ?? body?.data) as Types.VideoPlayUrlInfo['data'];
        if (data.durls?.length) {
            const video = data.durls.map(v => ({
                id: v.quality,
                baseUrl: v.durl[0].url,
                backupUrl: v.durl[0].backup_url,
                size: v.durl[0].size
            }));
            const codec = Types.StreamFormat.Mp4;
            return { video, videoQualities: video.map(v => v.id), codec };
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
            const codec = data.accept_format.includes('flv') ? Types.StreamFormat.Flv : Types.StreamFormat.Mp4;
            return { video, videoQualities: data.accept_quality, codec }
        } else if (data.dash) {
            const audio = [
                ...data.dash.audio,
                ...(data.dash.dolby?.audio?.length ? [data.dash.dolby.audio[0]] : []),
                ...(data.dash.flac?.audio ? [data.dash.flac.audio] : []),
            ];
            const codec = Types.StreamFormat.Dash;
            return {
                video: data.dash.video, audio,
                videoQualities: [...new Set(data.dash.video.map(v => v.id))],
                audioQualities: audio.map(v => v.id), codec
            }
        } else throw new ApplicationError(body.message, { code: body.code });
    }
}

export async function pushBackQueue(params: {
    item: Types.MediaInfo['list'][0],
    nfo: Types.MediaInfo['nfo'],
    video?: Types.PlayUrlResult,
    audio?: Types.PlayUrlResult,
    select: Types.CurrentSelect,
    index: number,
    output?: string,
}) {
    const select = params.select;
    const { item, nfo, index } = params;
    const ext = getFileExtension(select);
    const archiveInfo = {
        title: item.title,
        cover: item.cover,
        desc: item.desc,
        nfo,
        pubtime: new Date(item.pubtime * 1000).toISOString(),
        ts: {
            millis: Date.now(),
            string: timestamp(Date.now(), { file: true })
        },
        folder: getFormat({ isFolder: true, item, nfo, select }),
        filename: `${getFormat({ item, nfo, select, index })}.${ext}`,
    };
    const tasks = [
        params.video && {
            urls: [
                params.video.baseUrl ?? params.video.base_url,
                ...(params.video.backupUrl ?? params.video.backup_url ?? [])
            ],
            taskType: 'video'
        },
        params.audio && {
            urls: [
                params.audio.baseUrl ?? params.audio.base_url,
                ...(params.audio.backupUrl ?? params.audio.backup_url ?? [])
            ],
            taskType: 'audio'
        },
        (params.video && params.audio) && {
            taskType: 'merge'
        },
        {
            taskType: 'metadata'
        }
    ].filter(Boolean) as any[];
    const result = await Backend.commands.pushBackQueue(
        archiveInfo, tasks, params.output ?? null,
    );
    if (result.status === 'error') throw result.error;
    return result.data;
}

export async function getCid(aid: number) {
    const body = await tryFetch('https://api.bilibili.com/x/player/pagelist', { params: { aid } });
    return body.data[0].cid as number;
}

export async function getAISummary(info: Types.MediaInfo["list"][0], mid: number, options?: { check?: boolean }) {
    if (!info.aid || !info.cid) throw 'No aid or cid found';
    const params = {
        aid: info.aid, cid: info.cid, up_mid: mid
    };
    const response = await tryFetch("https://api.bilibili.com/x/web-interface/view/conclusion/get", { auth: 'wbi', params });
    const body = response as Types.AISummaryInfo;
    const model_result = body.data.model_result;
    if (options?.check) return model_result.result_type;
    if (!model_result.result_type) {
        throw new ApplicationError('No summary', { code: body.code });
    }
    let text = `# ${info.title} - ${info.bvid}\n\n${model_result.summary}\n\n`;
    if (model_result.result_type === 2) {
        model_result.outline.forEach(section => {
            text += `## ${section.title} - [${duration(section.timestamp, 'video')}](https://www.bilibili.com/video/${info.bvid}?t=${section.timestamp})\n\n`;
            section.part_outline.forEach(part => {
                text += `- ${part.content} - [${duration(part.timestamp, 'video')}](https://www.bilibili.com/video/${info.bvid}?t=${part.timestamp})\n\n`;
            });
        })
    }
    return text;
}

export async function getDanmaku(info: Types.MediaInfo["list"][0], date?: string) {
    if (!info.aid || !info.cid) throw 'No aid or cid found';
    const oid = info.cid;
    if (date) {
        const params = { type: 1, oid, date };
        const buffer = await tryFetch('https://api.bilibili.com/x/v2/dm/web/history/seg.so', { type: 'binary', params });
        const xml = dm_v1.DmSegMobileReplyToXML(new Uint8Array(buffer));
        return new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?>' + xml);    
    }
    if (useSettingsStore().protobuf_danmaku) {
        const doc = document.implementation.createDocument('', 'i', null);
        const user = useUserStore();
        const url = user.isLogin ? 'https://api.bilibili.com/x/v2/dm/wbi/web/seg.so' : 'https://api.bilibili.com/x/v2/dm/web/seg.so';
        for (let i = 0; i < Math.ceil((info.duration ?? 0) / 360); i++) {
            const params = {
                type: 1, oid, pid: info.aid, segment_index: i + 1,
            }
            const buffer = await tryFetch(url, { type: 'binary', params, ...(user.isLogin && { auth: 'wbi' }) });
            dm_v1.DmSegMobileReplyToXML(new Uint8Array(buffer), { inputXml: doc });
            await new Promise(resolve => setTimeout(resolve, getRandomInRange(100, 500)));
        }
        const xml = new XMLSerializer().serializeToString(doc);
        return new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?>' + xml);
    } else {
        const buffer = await tryFetch('https://api.bilibili.com/x/v1/dm/list.so', { type: 'binary', params: { oid } });
        return pako.inflateRaw(buffer);
    }
}

export async function getPlayerInfo(id: number, cid: number) {
    const user = useUserStore();
    const params = { aid: id, cid: cid };
    const url = user.isLogin ? 'https://api.bilibili.com/x/player/wbi/v2' : 'https://api.bilibili.com/x/player/v2';
    const response = await tryFetch(url, { params, ...(user.isLogin && { auth: 'wbi' }) });
    const body = response as Types.PlayerInfo;
    return body.data;
}

export async function getSteinInfo(id: number, graph_version: number, edge_id?: number) {
    const params = { aid: id, graph_version, ...(edge_id && { edge_id }) };
    const response = await tryFetch('https://api.bilibili.com/x/stein/edgeinfo_v2', { auth: 'wbi', params });
    const body = response as Types.SteinInfo;
    return body.data;
}

export async function getSubtitles(info: Types.MediaInfo["list"][0]): Promise<Types.Subtitle[]> {
    if (!info.aid || !info.cid) throw 'No aid or cid found';
    const playerInfo = await getPlayerInfo(info.aid, info.cid);
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

export async function getSingleNfo(info: Types.MediaInfo, item: Types.MediaInfo["list"][0]) {
    let nfo: Types.MediaInfo['nfo'];
    let rootTag = 'movie';
    switch (info.type) {
        case Types.MediaType.Favorite:
            const id = item.aid ?? item.epid ?? item.ssid ?? -1;
            nfo = (await getMediaInfo(id.toString(), item.type ?? info.type)).nfo;
            break;
        case Types.MediaType.MusicList:
            const sid = item.sid ?? -1;
            nfo = (await getMediaInfo(sid.toString(), Types.MediaType.Music)).nfo;
            break;
        default: nfo = info.nfo;
    }
    switch (item.type ?? info.type) {
        case Types.MediaType.Video: rootTag = 'movie'; break;
        case Types.MediaType.Bangumi:
        case Types.MediaType.Lesson: rootTag = 'episodedetails'; break;
        default: throw 'No NFO type for ' + item.type;
    }
    const doc = document.implementation.createDocument('', rootTag, null);
    const root = doc.documentElement;
    const append = (k: string, v: string | number, node?: Node) => {
        const tag = doc.createElement(k);
        tag.textContent = v.toString();
        (node ?? root).appendChild(tag);
        return tag;
    }
    append('title', item.title);
    append('originaltitle', nfo.showtitle);
    append('plot', item.desc);
    for (const thumb of nfo.thumbs) {
        append('thumb', thumb.url).setAttribute('preview', thumb.url);
    }
    append('runtime', Math.round(item.duration / 60));
    append('premiered', timestamp(item.pubtime * 1000).split('\u0020')[0]);
    if (nfo.upper) append('director', nfo.upper.name);
    for (const tag of nfo.tags) {
        append('genre', tag);
        append('tag', tag);
    }
    for (const [i, v] of nfo.actors.entries()) {
        const actor = append('actor', '');
        append('name', v.name, actor);
        append('role', v.role, actor);
        append('order', i + 1, actor);
    }
    for (const staff of nfo.staff) {
        append('credits', staff);
    }
    append('uniqueid', item.cid ?? item.epid ?? item.ssid ?? item.sid ?? 0);
    const xml = new XMLSerializer().serializeToString(doc);
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + xml;
}

export async function getHistory(ps: number, view_at: number) {
    const params = { ps, view_at };
    const response = await tryFetch('https://api.bilibili.com/x/web-interface/history/cursor', { params });
    const body = response as Types.HistoryInfo;
    return body.data;
}