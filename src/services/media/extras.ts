import { tryFetch, timestamp, getRandomInRange, duration } from "../utils";
import { useUserStore } from "@/store";
import { AppError } from "../error";
import * as Types from '@/types/shared.d';
import * as Resps from '@/types/media/extras.d';
import * as dm_v1 from "@/proto/dm_v1";

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

export async function getAISummary(item: Types.MediaItem): Promise<Uint8Array<ArrayBuffer>>;
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
    return new TextEncoder().encode(text);
}

export async function getSubtitle(item: Types.MediaItem): Promise<Resps.Subtitle[]>;
export async function getSubtitle(item: Types.MediaItem, options: { name: false | string }): Promise<Uint8Array<ArrayBuffer>>;
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
    return new TextEncoder().encode(subtitle.body.map((l, i) => `${i + 1}\n${getTime(l.from)} --> ${getTime(l.to)}\n${l.content}`).join('\n\n'));
}

export async function getNfo(item: Types.MediaItem, nfo: Types.MediaNfo, type: 'album' | 'nfo') {
    const mode = type === 'album' ? 'album'
        : (item.type === 'video' ? 'movie'
            : (item.type === 'bangumi' || item.type === 'lesson')
                ? 'episodedetails' : 'movie'
        );
    const doc = document.implementation.createDocument('', mode, null);
    const root = doc.documentElement;
    const add = (k: string, v?: string | number | null, node: Node = root) => {
        const el = doc.createElement(k);
        el.textContent = String(v);
        node.appendChild(el);
        return el;
    };
    const addAttr = (el: Element, attrs: Record<string, string | number | boolean>) => {
        for (const [k, v] of Object.entries(attrs)) {
            el.setAttribute(k, String(v));
        }
    };
    if (mode === 'album') {
        add('title', nfo.showtitle);
    } else if (mode === 'movie'){
        add('title', item.title);
        add('originaltitle', nfo.showtitle);
    } else {
        add('title', item.title);
    }
    let aiSummary = '';
    try {
        aiSummary = new TextDecoder().decode(await getAISummary(item)) + '\n';
    } catch(_) {}
    add('plot', aiSummary + item.desc);
    if (mode === 'album') {
        const el = add('thumb', 'poster.jpg');
        addAttr(el, { preview: 'poster.jpg' });
    } else nfo.thumbs.forEach(v => {
        const el = add('thumb', v.url);
        addAttr(el, { preview: v.url });
    })
    add('runtime', Math.round(item.duration / 60));
    add('premiered', timestamp(item.pubtime, 'Asia/Shanghai').split('\u0020')[0]);
    if (nfo.upper?.name) {
        add('director', nfo.upper.name);
    }
    new Set(nfo.tags ?? []).forEach(v => {
        add('genre', v);
        add('tag', v);
    });
    Array.from(nfo.actors.entries()).forEach(([i, v]) => {
        const node = add('actor', '');
        add('name', v.name, node);
        add('role', v.role, node);
        add('order', i + 1, node);
    })
    nfo.staff.forEach(v => {
        add('credits', v)
    });
    (['aid', 'sid', 'fid', 'cid', 'bvid', 'epid', 'ssid'] as const).forEach(v => {
        if (item[v]) add('bili:' + v, item[v]);
    })
    const xml = new XMLSerializer().serializeToString(doc);
    return new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + xml);
}

export async function getDanmaku(cb: (content: number, chunk: number) => void, item: Types.MediaItem, date?: false | string) {
    if (!item.aid || !item.cid) throw new AppError('No aid or cid found');
    const oid = item.cid;
    if (date) {
        const params = { type: 1, oid, date };
        const buffer = await tryFetch('https://api.bilibili.com/x/v2/dm/web/history/seg.so', { type: 'binary', params });
        const xml = dm_v1.DmSegMobileReplyToXML(new Uint8Array(buffer));
        return new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?>' + xml);    
    }
    const doc = document.implementation.createDocument('', 'i', null);
    const user = useUserStore();
    const url = user.isLogin ? 'https://api.bilibili.com/x/v2/dm/wbi/web/seg.so' : 'https://api.bilibili.com/x/v2/dm/web/seg.so';
    const content = Math.ceil((item.duration ?? 0) / 360);
    cb(content + 1, 1);
    for (let i = 1; i <= content; i++) {
        cb(content + 1, i)
        const params = {
            type: 1, oid, pid: item.aid, segment_index: i,
        }
        const buffer = await tryFetch(url, { type: 'binary', params, ...(user.isLogin && { auth: 'wbi' }) });
        dm_v1.DmSegMobileReplyToXML(new Uint8Array(buffer), { inputXml: doc });
        await new Promise(resolve => setTimeout(resolve, getRandomInRange(100, 500)));
    }
    const xml = new XMLSerializer().serializeToString(doc);
    return new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?>' + xml);
}

export async function getHistoryCursor() {
    const response = await tryFetch('https://api.bilibili.com/x/web-interface/history/cursor', { params: {
        ps: 1, view_at: 0
    }});
    const body = response as Resps.HistoryCursorInfo;
    return body.data;
}

export async function getHistorySearch(params: {
    pn: number, keyword: string,
    business: string,
    add_time_start: number,
    add_time_end: number,
    arc_max_duration: number,
    arc_min_duration: number,
    device_type: number,
}) {
    const response = await tryFetch('https://api.bilibili.com/x/web-interface/history/search', { params });
    const body = response as Resps.HistorySearchInfo;
    return body.data.list;
}