import { tryFetch, timestamp, getRandomInRange, duration } from "../utils";
import { useSettingsStore, useUserStore } from "@/store";
import { AppError } from "../error";
import * as Types from '@/types/shared.d';
import * as Resps from '@/types/media/extras.d';
import * as dm_v1 from "@/proto/dm_v1";
import pako from 'pako';

export async function getSteinInfo(id: number, graph_version: number, edge_id?: number) {
    const params = { aid: id, graph_version, ...(edge_id && { edge_id }) };
    const response = await tryFetch('https://api.bilibili.com/x/stein/edgeinfo_v2', { auth: 'wbi', params });
    const body = response as Resps.SteinInfo;
    return body.data;
}

export async function getPlayerInfo(id: number, cid: number) {
    const user = useUserStore();
    const params = { aid: id, cid: cid };
    const url = user.isLogin ? 'https://api.bilibili.com/x/player/wbi/v2' : 'https://api.bilibili.com/x/player/v2';
    const response = await tryFetch(url, { params, ...(user.isLogin && { auth: 'wbi' }) });
    const body = response as Resps.PlayerInfo;
    return body.data;
}

export async function getAISummary(item: Types.MediaItem): Promise<string>;
export async function getAISummary(item: Types.MediaItem, options: { check: true }): Promise<boolean>;
export async function getAISummary(item: Types.MediaItem, options?: { check?: boolean }) {
    if (!item.aid || !item.cid) throw 'No aid or cid found';
    const params = { aid: item.aid, cid: item.cid };
    const response = await tryFetch("https://api.bilibili.com/x/web-interface/view/conclusion/get", { auth: 'wbi', params });
    const body = response as Resps.AISummaryInfo;
    const result = body.data.model_result;
    if (options?.check) return Boolean(result.result_type);
    if (!result.result_type) {
        throw new AppError('No summary', { code: body.code });
    }
    let text = `# ${item.title} - ${item.bvid}\n\n${result.summary}\n\n`;
    if (result.result_type === 2) {
        result.outline.forEach(section => {
            text += `## ${section.title} - [${duration(section.timestamp)}](https://www.bilibili.com/video/${item.bvid}?t=${section.timestamp})\n\n`;
            section.part_outline.forEach(part => {
                text += `- ${part.content} - [${duration(part.timestamp)}](https://www.bilibili.com/video/${item.bvid}?t=${part.timestamp})\n\n`;
            });
        })
    }
    return text;
}

export async function getSubtitle(item: Types.MediaItem): Promise<Resps.Subtitle[]>;
export async function getSubtitle(item: Types.MediaItem, options: { name: false | string }): Promise<string>;
export async function getSubtitle(item: Types.MediaItem, options?: { name?: false | string }) {
    if (!item.aid || !item.cid) throw new AppError('No aid or cid found');
    const playerInfo = await getPlayerInfo(item.aid, item.cid);
    const subtitles = playerInfo.subtitle?.subtitles;
    if (!options?.name) return subtitles;
    const _url = subtitles.find(v => v.lan === options.name)?.subtitle_url;
    if (!_url) throw new AppError('No URL found for ' + options.name);
    const url = _url.startsWith('//') ? 'https:' + _url : _url;
    const subtitle = await tryFetch(url) as Resps.SubtitleInfo;
    const getTime = (s: number) => { // Only works for input < 24 hour
        return new Date(s * 1000).toISOString().slice(11, 23).replace('.', ',');
    };
    return subtitle.body.map((l, i) => `${i + 1}\n${getTime(l.from)} --> ${getTime(l.to)}\n${l.content}`).join('\n\n');
}

export async function getSingleNfo(item: Types.MediaItem, nfo: Types.MediaNfo) {
    let rootTag = 'movie';
    switch (item.type) {
        case Types.MediaType.Video: rootTag = 'movie'; break;
        case Types.MediaType.Bangumi:
        case Types.MediaType.Lesson: rootTag = 'episodedetails'; break;
        default: throw new AppError('No NFO type for ' + item.type);
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

export async function getDanmaku(item: Types.MediaItem, date?: false | string) {
    if (!item.aid || !item.cid) throw new AppError('No aid or cid found');
    const oid = item.cid;
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
        for (let i = 0; i < Math.ceil((item.duration ?? 0) / 360); i++) {
            const params = {
                type: 1, oid, pid: item.aid, segment_index: i + 1,
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

export async function getHistory( view_at: number) {
    const params = { ps: 20, view_at };
    const response = await tryFetch('https://api.bilibili.com/x/web-interface/history/cursor', { params });
    const body = response as Resps.HistoryInfo;
    return body.data;
}