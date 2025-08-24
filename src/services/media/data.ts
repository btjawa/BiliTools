import { tryFetch, getPublicImages } from "../utils";
import { getSteinInfo, getPlayerInfo } from "./extras";
import { useUserStore } from "@/store";
import { AppError } from "../error";
import * as Resps from "@/types/media/data.d";
import * as Types from "@/types/shared.d";

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
        const data = (body as Resps.VideoInfo).data;
        const map = (ep: Resps.UgcInfo, index: number) => ({
            title: ep.title,
            cover: ep.arc.pic,
            desc: ep.arc.desc,
            aid: ep.aid,
            bvid: ep.bvid,
            cid: ep.cid,
            duration: ep.page.duration,
            pubtime: ep.arc.pubdate,
            type: Types.MediaType.Video,
            isTarget: ep.aid === data.aid,
            index
        });
        let sections: Types.MediaInfo['sections'] = undefined;
        let stein_gate: Types.MediaInfo['stein_gate'] = undefined;
        let list: Types.MediaInfo['list'] = [{
            title: data.title,
            cover: data.pic,
            desc: data.desc,
            aid: data.aid,
            bvid: data.bvid,
            cid: data.cid,
            duration: data.duration,
            pubtime: data.pubdate,
            type: Types.MediaType.Video,
            isTarget: true,
            index: 0,
        }];
        if (data.pages?.length > 1) {
            list = data.pages.map((page, index) => ({
                title: page.part || data.title,
                cover: data.pic,
                desc: data.desc,
                aid: data.aid,
                bvid: data.bvid,
                cid: page.cid,
                duration: page.duration,
                pubtime: data.pubdate,
                type: Types.MediaType.Video,
                isTarget: index === 0,
                index
            }))
        }
        if (data.ugc_season) {
            const target = data.ugc_season.sections.find(v => v.episodes.some(v => v.aid === data.aid));
            if (target) list = target.episodes.map(map);
            sections = {
                target: target?.id ?? data.ugc_season.sections[0].id,
                tabs: data.ugc_season.sections.map(v => ({
                    id: v.id, name: v.title
                })),
                data: data.ugc_season.sections?.reduce<Record<number, Types.MediaItem[]>>((acc, { id, episodes }) => {
                    if (!acc[id]) acc[id]= [];
                    acc[id].push(...episodes.map(map));
                    return acc;
                }, {})
            }
        }
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
            desc: data.desc,
            nfo: {
                tags: (tagsResp as Resps.VideoTags).data.map(v => v.tag_name),
                thumbs: [
                    ...getPublicImages(data),
                    ...getPublicImages(data.ugc_season, 'ugc_season'),
                ],
                showtitle: data.ugc_season?.title ?? data.title,
                premiered: data.pubdate,
                upper: {
                    name: data.owner.name,
                    mid: data.owner.mid,
                    avatar: data.owner.face,
                },
                actors: [],
                staff: [],
            },
            stein_gate, 
            stat: {
                play: data.stat.view,
                danmaku: data.stat.danmaku,
                reply: data.stat.reply,
                like: data.stat.like,
                coin: data.stat.coin,
                favorite: data.stat.favorite,
                share: data.stat.share,
            },
            sections,
            list
        };
    } else if (type === Types.MediaType.Bangumi) {
        const data = (body as Resps.BangumiInfo).result;
        const season = data.seasons.find(v => v.season_id === data.season_id);
        const map = (ep: Resps.EpisodeInfo, index: number) => ({
            title: ep.show_title ?? ep.title ?? String(),
            cover: ep.cover,
            desc: data.evaluate,
            section: data.positive.id,
            aid: ep.aid,
            bvid: ep.bvid,
            cid: ep.cid,
            epid: ep.ep_id,
            ssid: data.season_id,
            duration: ep.duration / 1000,
            pubtime: ep.pub_time,
            type: Types.MediaType.Bangumi,
            isTarget: _id === ep.id,
            index
        });
        return {
            type,
            id: data.season_id,
            desc: data.evaluate,
            nfo: {
                tags: data.styles,
                thumbs: [
                    ...getPublicImages(data),
                    ...getPublicImages(season, 'season')
                ],
                showtitle: data.season_title,
                premiered: data.episodes[0].pub_time,
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
            sections: {
                target: data.positive.id,
                tabs: [{
                    id: data.positive.id,
                    name: data.positive.title
                }, ...(data.section ? data.section.map(v => ({
                    id: v.id, name: v.title
                })) : [])],
                data: {
                    [data.positive.id]: data.episodes.map(map),
                    ...data.section?.reduce<Record<number, Types.MediaItem[]>>((acc, { id, episodes }) => {
                        if (!acc[id]) acc[id]= [];
                        acc[id].push(...episodes.map(map));
                        return acc;
                    }, {}) ?? {}
                }
            },
            list: data.episodes.map(map)
        };
    } else if (type === Types.MediaType.Lesson) {
        const data = (body as Resps.LessonInfo).data;
        return {
            type,
            id: data.season_id,
            desc: `${data.subtitle}\n${data.faq.title}\n${data.faq.content}`,
            nfo: {
                tags: [],
                thumbs: [
                    ...getPublicImages(data),
                    ...data.brief.img.map((v, i) => ({ id: 'brief-' + (i+1), url: v.url }))
                ],
                showtitle: data.title,
                premiered: data.episodes[0].release_date,
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
            list: data.episodes.map((ep, index) => ({
                title: ep.title,
                cover: ep.cover,
                desc: data.subtitle,
                aid: ep.aid,
                cid: ep.cid,
                epid: ep.id,
                ssid: data.season_id,
                duration: ep.duration,
                pubtime: ep.release_date,
                type: Types.MediaType.Lesson,
                isTarget: index === 0,
                index
            }))
        };
    } else if (type === Types.MediaType.Music) {
        const data = (body as Resps.MusicInfo).data;
        const tagsResp = await tryFetch('https://www.bilibili.com/audio/music-service-c/web/tag/song', { params });
        const upperResp = await tryFetch('https://www.bilibili.com/audio/music-service-c/web/user/info', { params: { uid: data.uid } });
        const membersResp = await tryFetch('https://www.bilibili.com/audio/music-service-c/web/member/song', { params });
        const members = (membersResp as Resps.MusicMembersInfo).data;
        const upper = (upperResp as Resps.MusicUpperInfo).data;
        return {
            type,
            id: data.aid,
            desc: data.intro,
            nfo: {
                tags: (tagsResp as Resps.MusicTagsInfo).data.map(v => v.info),
                thumbs: getPublicImages(data),
                showtitle: data.title,
                premiered: data.passtime,
                upper: {
                    name: upper.uname,
                    mid: upper.uid,
                    avatar: upper.avater, // Note: typo in API response, wtf this should be *avatar
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
                type: Types.MediaType.Music,
                isTarget: true,
                index: 0,
            }]
        };
    } else if (type === Types.MediaType.MusicList) {
        const data = (body as Resps.MusicListInfo).data;
        const listInfo = await tryFetch('https://www.bilibili.com/audio/music-service-c/web/song/of-menu', {
            params: { pn: options?.pn ?? 1, ps: 20, sid: data.menuId }
        }) as Resps.MusicListDetailInfo;
        return {
            type,
            id: data.menuId,
            desc: data.intro,
            nfo: {
                tags: [],
                thumbs: getPublicImages(data),
                showtitle: data.title,
                premiered: data.ctime * 1000,
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
        const { info, medias } = (body as Resps.FavoriteInfo).data;
        const typeMap: Record<number, Types.MediaType> = {
            2: Types.MediaType.Video,
            12: Types.MediaType.Music,
            24: Types.MediaType.Bangumi,
        };
        return {
            type,
            id: info.id,
            desc: info.intro,
            nfo: {
                tags: [],
                thumbs: getPublicImages(info),
                showtitle: info.title,
                premiered: info.ctime * 1000,
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
    } else throw new AppError('No type named ' + type);
}

export async function getPlayUrl(
    item: Types.MediaItem,
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
        case Types.MediaType.Video:
            url += user.isLogin ? '/x/player/wbi/playurl' : '/x/player/playurl';
            params.avid = item.aid;
            params.cid = item.cid;
            break;
        case Types.MediaType.Bangumi:
            url += '/pgc/player/web/v2/playurl';
            params.ep_id = item.epid;
            params.season_id = item.ssid;
            break;
        case Types.MediaType.Lesson:
            url += '/pugv/player/web/playurl';
            params.avid = item.aid;
            params.cid = item.cid;
            params.ep_id = item.epid;
            params.season_id = item.ssid;
            break;
        case Types.MediaType.Music:
            url = 'https://www.bilibili.com/audio/music-service-c/web/url';
            params = { sid: item.sid, privilege: 2, quality: 0 } as any;
            break;
    }
    const body = await tryFetch(url, {
        ...(type === Types.MediaType.Video && user.isLogin && { auth: 'wbi' }),
        params
    });
    if (type === Types.MediaType.Music) {
        const info = body as Resps.MusicPlayUrlInfo;
        const data = info.data;
        const audio = [{
            id: { 0: 30228, 1: 30280, 2: 30380, 3: 30252 }[data.type] ?? -1,
            baseUrl: data.cdns[0],
            backupUrl: data.cdns
        }];
        const codec = Types.StreamFormat.Dash;
        return { audio, codec, ts: Date.now() }
    } else {
        const data = (body.result?.video_info ?? body?.result ?? body?.data) as Resps.VideoPlayUrlInfo['data'];
        if (data.durls?.length) {
            const video = data.durls.map(v => ({
                id: v.quality,
                baseUrl: v.durl[0].url,
                backupUrl: v.durl[0].backup_url,
                size: v.durl[0].size
            }));
            const codec = Types.StreamFormat.Mp4;
            return { video, codec, ts: Date.now() };
        } else if (data.durl?.length) {
            const video = (await Promise.all(data.accept_quality.map(async qn => {
                params.qn = qn;
                const info = qn === data.quality ? body : await tryFetch(url, { params }) as Resps.VideoPlayUrlInfo;
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
            return { video, codec, ts: Date.now() }
        } else if (data.dash) {
            const video = data.dash.video;
            const audio = [
                ...data.dash.audio,
                ...(data.dash.dolby?.audio?.length ? [data.dash.dolby.audio[0]] : []),
                ...(data.dash.flac?.audio ? [data.dash.flac.audio] : []),
            ];
            const codec = Types.StreamFormat.Dash;
            return { video, audio, codec, ts: Date.now() }
        } else throw new AppError(body.message, { code: body.code });
    }
}

export async function getCid(aid: number) {
    const body = await tryFetch('https://api.bilibili.com/x/player/pagelist', { params: { aid } });
    return body.data[0].cid as number;
}