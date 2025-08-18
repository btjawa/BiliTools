import { useQueueStore, useSettingsStore } from "@/store";
import { filename, getDefaultQuality, randomString, timestamp } from "./utils";
import { getMediaInfo, getPlayUrl } from "./media/data";
import { AppError } from "./error";

import * as Types from "@/types/shared.d";
import * as extras from "./media/extras";
import * as backend from "./backend";
import { Channel } from "@tauri-apps/api/core";
import i18n from "@/i18n";
import { getCurrentWindow } from "@tauri-apps/api/window";

// Reference https://linux.do/t/topic/642419
function urlFilter(urls: string[]) {
    const mirror: URL[] = [];
    const upos: URL[] = [];
    const bcache: URL[] = [];
    const others: URL[] = [];
    for (const v of urls) {
        const url = new URL(v);
        const search = url.searchParams;
        const host = url.hostname.slice();
        const os = (search.get('os') ?? '').slice();
        if (host.includes('mirror') && os.endsWith('bv')) {
            mirror.push(url);
        } else if (os === 'upos') {
            upos.push(url);
        } else if (host.startsWith('cn') && os === 'bcache') {
            bcache.push(url);
        } else others.push(url)
    }
    if (mirror.length) {
        return (mirror.length < 2 ? [...mirror, ...upos] : mirror).map(v => v.toString());
    }
    if (upos.length || bcache.length) {
        const mirrorList = ['upos-sz-mirrorali.bilivideo.com', 'upos-sz-mirrorcos.bilivideo.com'];
        return (upos.length ? upos : bcache).map((v, i) => {
            v.hostname = mirrorList[i] ?? v.hostname;
            return v.toString()
        });
    }
    return others.map(v => v.toString());
}

async function handleMedia(task: Types.GeneralTask) {
    const { select, item, type } = task;
    const playUrl = await getPlayUrl(item, type, select.fmt);
    let video: Types.PlayUrlResult = null as any;
    let audio: Types.PlayUrlResult = null as any;

    if (select.media.video || select.media.audioVideo) {
        if (!playUrl.video) throw new AppError('No videos found');
        const res = getDefaultQuality(playUrl.video.map(v => v.id), 'res', select);
        const videos = playUrl.video.filter(v => v.id === res);
        const enc = getDefaultQuality(playUrl.video.map(v => v.codecid).filter(Boolean) as number[], 'enc', select);
        const _video = videos.find(v => v.codecid === enc);
        if (!_video) throw new AppError('No video found');
        select.res = res;
        select.enc = enc;
        video = _video;
    }
    if (select.media.audio || select.media.audioVideo) {
        if (!playUrl.audio) throw new AppError('No audios found');
        const abr = getDefaultQuality(playUrl.audio.map(v => v.id), 'abr', select);
        const _audio = playUrl.audio.find(v => v.id === abr);
        if (!_audio) throw new AppError('No audio found');
        select.abr = abr;
        audio = _audio;
    }

    let videoUrls = (video ? [
        video.baseUrl ?? video.base_url,
        ...(video.backupUrl ?? video.backup_url ?? [])
    ].filter(Boolean) : []) as string[];

    let audioUrls = (audio ? [
        audio.baseUrl ?? audio.base_url,
        ...(audio.backupUrl ?? audio.backup_url ?? [])
    ].filter(Boolean) : []) as string[];

    if (useSettingsStore().block_pcdn) {
        videoUrls = urlFilter(videoUrls);
        audioUrls = urlFilter(audioUrls);
    }
    const folder = buildPaths(task, 'folder');

    task.select = select;
    task.folder = folder;
    return { videoUrls, audioUrls, select, folder };
}

async function handleDanmaku(task: Types.GeneralTask, subtask: Types.SubTask) {
    const { select, item } = task;
    return await extras.getDanmaku(item, subtask.type === 'liveDanmaku' ? false : select.danmaku.history);
}
async function handleThumbs(task: Types.GeneralTask) {
    const { select, nfo } = task;
    return nfo.thumbs.filter(v => select.thumb.includes(v.id)).map(v => ({
        id: i18n.global.t('popup.thumb.' + v.id),
        url: v.url.replace('http:', 'https:')
    }));
}
async function handleNfo(task: Types.GeneralTask, subtask: Types.SubTask) {
    const { item, nfo } = task;
    return await extras.getNfo(item, nfo, subtask.type === 'albumNfo' ? 'album' : 'nfo');
}
async function handleSubtitle(task: Types.GeneralTask) {
    const { select, item } = task;
    return await extras.getSubtitle(item, { name: select.misc.subtitles });
}
async function handleAISummary(task: Types.GeneralTask) {
    const { item } = task;
    return await extras.getAISummary(item);
}

function buildPaths(task: Types.GeneralTask, key: 'folder' | 'filename', subtask?: Types.SubTask) {
    const { select, item, type, nfo } = task;
    const settings = useSettingsStore();
    const placeholders = [
        ...Types.FormatPlaceholders.basic,
        ...Types.FormatPlaceholders.id,
        ...Types.FormatPlaceholders.down,
    ]
    const replace = (k: typeof placeholders[number]) => {
        switch (k) {
            case 'showtitle': return nfo.showtitle;
            case 'title': return item.title;
            case 'upper': return nfo.upper?.name;
            case 'upperid': return nfo.upper?.mid;
            case 'pubtime': return nfo.premiered;
            case 'pubts': return item.pubtime;
            case 'res': return i18n.global.t('quality.res.' + select.res);
            case 'abr': return i18n.global.t('quality.abr.' + select.abr);
            case 'enc': return i18n.global.t('quality.enc.' + select.enc);
            case 'fmt': return i18n.global.t('quality.fmt.' + select.fmt);
            case 'mediaType': return i18n.global.t('mediaType.' + (key === 'folder' ? type : item.type));
            case 'taskType': return i18n.global.t('taskType.' + subtask?.type);
            case 'aid': return item.aid;
            case 'sid': return item.sid;
            case 'fid': return item.fid;
            case 'cid': return item.cid;
            case 'bvid': return item.bvid;
            case 'epid': return item.epid;
            case 'ssid': return item.ssid;
            case 'index': return ((key === 'folder' ? task : subtask)?.index ?? 0) + 1;
            case 'downtime': return timestamp(task.ts, { file: true });
            case 'downts': return task.ts;
            default: return -1;
        }
    }
    return filename(settings.format[key]
        .replace(/\{(\w+)\}/g, (_, k) => (replace(k) ?? -1).toString()));
}

async function handleTask(task: Types.GeneralTask, type: backend.RequestAction, subtask?: Types.SubTask) {
    if (type === 'getStatus') {
        return useQueueStore().status[task.id];
    } else if (type === 'refreshNfo') {
        const item = task.item;
        const id = item.epid ?? item.ssid ?? item.sid ?? item.aid;
        if (!id) throw new AppError('No sid or aid or epid or ssid found');
        const info = await getMediaInfo(id.toString(), item.type);
        return info.nfo;
    } else if (type === 'refreshUrls') {
        return await handleMedia(task);
    } else if (type === 'getFilename') {
        if (!subtask) throw new AppError('No subtask for building paths found');
        return buildPaths(task, 'filename', subtask);
    } else if (type === 'getNfo') {
        if (!subtask) throw new AppError('No subtask for handling nfo found');
        return await handleNfo(task, subtask);
    } else if (type === 'getThumbs') {
        return await handleThumbs(task);
    } else if (type === 'getDanmaku') {
        if (!subtask) throw new AppError('No subtask for danmaku found');
        return await handleDanmaku(task, subtask);
    } else if (type === 'getSubtitle') {
        return await handleSubtitle(task);
    } else if (type === 'getAISummary') {
        return await handleAISummary(task);
    }
}

async function handleEvent(event: backend.ProcessEvent) {
    const { type } = event;
    const app = getCurrentWindow();
    const queue = useQueueStore();
    if (type === 'request') {
        const task = queue.tasks[event.parent];
        const subtask = task.subtasks.find(v => v.id === event.subtask);
        let result = null as any;
        try {
            result = await handleTask(task, event.action, subtask);
        } catch(e) {
            new AppError(e).handle();
        }
        app.emit(`${event.action}_${event.subtask ?? event.parent}`, result);
    } else if (type === 'progress') {
        const target = queue.status[event.parent]?.subtasks.find(v => v.id === event.id);
        if (target) Object.assign(target, {
            chunk: event.chunk,
            content: event.content,
        });
    } else if (type === 'taskState') {
        queue.status[event.id].state = event.state;
    } else if (type === 'error') {
        new AppError(event.message, { code: event.code as number }).handle();
    }
}

export async function processQueue() {
    try {
        const queue = useQueueStore();
        const event = new Channel<backend.ProcessEvent>();
        event.onmessage = handleEvent;
        const handled = new Set(queue.handled);
        const list = queue.waiting.filter(v => !handled.has(v))
        queue.handled = [...handled, ...list];
        const showtitle = `${queue.tasks[list[0]].nfo.showtitle}_${timestamp(Date.now(), { file: true })}`;
        const result = await backend.commands.processQueue(event, list, showtitle);
        if (result.status === 'error') throw new AppError(result.error);
    } catch(err) {
        new AppError(err).handle();
    }
}

function selectToSubTasks(id: string, select: Types.PopupSelect) {
    const tasks: Types.SubTask[] = [];
    let index = 0;
    const push = (type: Types.TaskType) => {
        tasks.push({
            index,
            id: id + randomString(8),
            type
        });
        if (type !== 'albumNfo') index++; // prevent albumNfo from occupying index
    }
    if (select.media.video || select.media.audioVideo) push(Types.TaskType.Video);
    if (select.media.audio || select.media.audioVideo) push(Types.TaskType.Audio);
    if (select.media.audioVideo) push(Types.TaskType.AudioVideo);
    if (select.thumb.length) push(Types.TaskType.Thumb);
    if (select.danmaku.live) push(Types.TaskType.LiveDanmaku);
    if (select.danmaku.history) push(Types.TaskType.HistoryDanmaku);
    if (select.nfo.album) push(Types.TaskType.AlbumNfo);
    if (select.nfo.single) push(Types.TaskType.SingleNfo);
    if (select.misc.aiSummary) push(Types.TaskType.AISummary);
    if (select.misc.subtitles) push(Types.TaskType.Subtitles);
    if (!tasks.length) {
        throw new AppError(i18n.global.t('popup.least'));
    }
    return tasks;
}

export async function submit(info: Types.MediaInfo, select: Types.PopupSelect, checkboxs: number[]) {
    const queue = useQueueStore();
    const settings = useSettingsStore();
    for (const [index, v] of checkboxs.entries()) {
        const id = randomString(8);
        const task: Types.GeneralTask = {
            id,
            ts: Math.floor(Date.now() / 1000),
            index,
            folder: String(),
            select: select,
            item: info.list[v],
            type: info.type,
            nfo: info.nfo,
            subtasks: selectToSubTasks(id, select),
        };
        task.folder = buildPaths(task, 'folder');
        queue.$patch(v => {
            v.tasks[id] = task;
            v.status[id] = {
                id,
                state: 'pending',
                subtasks: queue.tasks[id].subtasks.map(t => ({
                    ...t,
                    chunk: 0,
                    content: 0,
                }))
            }
            v.waiting = [...v.waiting, id];
        });
        const result = await backend.commands.submitTask(task);
        if (result.status === 'error') throw new AppError(result.error);
    }
    if (settings.auto_download) processQueue();
}