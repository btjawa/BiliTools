import { useQueueStore, useSettingsStore } from "@/store";
import { getDefaultQuality, randomString, timestamp } from "./utils";
import { getMediaInfo, getPlayUrl } from "./media/data";
import { AppError } from "./error";

import * as Types from "@/types/shared.d";
import * as Queues from "@/types/queue.d";
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

async function handleMedia(task: Queues.GeneralTask) {
    let { select, info } = task;
    const playUrl = await getPlayUrl(info.item, info.type, select.fmt);
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

    if (true) {
        videoUrls = urlFilter(videoUrls);
        audioUrls = urlFilter(audioUrls);
    }

    return { videoUrls, audioUrls, select };
}

async function handleDanmaku(task: Queues.GeneralTask) {
    const { select, info } = task;
    return await extras.getDanmaku(info.item, select.danmaku.history);
}
async function handleThumbs(task: Queues.GeneralTask) {
    const { select, info } = task;
    return info.nfo.thumbs.filter(v => select.thumb.includes(v.id)).map(v => ({
        id: i18n.global.t('popup.thumb.' + v.id),
        url: v.url.replace('http:', 'https:')
    }));
}
async function handleNfo(task: Queues.GeneralTask) {
    const { select, info } = task;
    if (select.nfo.album) {
        throw new AppError('Album NFO is unimplemented yet')
    }
    return await extras.getSingleNfo(info.item, info.nfo);
}
async function handleSubtitle(task: Queues.GeneralTask) {
    const { select, info } = task;
    return await extras.getSubtitle(info.item, { name: select.misc.subtitles });
}
async function handleAISummary(task: Queues.GeneralTask) {
    const { info } = task;
    return await extras.getAISummary(info.item);
}

function buildPaths(task: Queues.GeneralTask, key: 'folder' | 'filename', taskType?: string) {
    const { info, select } = task;
    const settings = useSettingsStore();
    const placeholders = [
        ...Types.FormatPlaceholders.basic,
        ...Types.FormatPlaceholders.id,
        ...Types.FormatPlaceholders.down,
    ]
    const replace = (k: typeof placeholders[number]) => {
        switch (k) {
            case 'showtitle': return info.nfo.showtitle;
            case 'title': return info.item.title;
            case 'upper': return info.nfo.upper?.name;
            case 'upperid': return info.nfo.upper?.mid;
            case 'pubtime': return info.nfo.premiered;
            case 'pubts': return info.item.pubtime;
            case 'res': return i18n.global.t('quality.res.' + select.res);
            case 'abr': return i18n.global.t('quality.abr.' + select.abr);
            case 'enc': return i18n.global.t('quality.enc.' + select.enc);
            case 'fmt': return i18n.global.t('quality.fmt.' + select.fmt);
            case 'mediaType': return i18n.global.t('mediaType.' + (key === 'folder' ? info.type : info.item.type));
            case 'taskType': return i18n.global.t('taskType.' + taskType);
            case 'aid': return info.item.aid;
            case 'sid': return info.item.sid;
            case 'fid': return info.item.fid;
            case 'cid': return info.item.cid;
            case 'bvid': return info.item.bvid;
            case 'epid': return info.item.epid;
            case 'ssid': return info.item.ssid;
            case 'index': return task.index + 1;
            case 'downtime': return timestamp(task.ts, { file: true });
            case 'downts': return task.ts;
            default: return -1;
        }
    }
    return settings.format[key].replace(/\{(\w+)\}/g, (_, k) => (replace(k) ?? -1).toString());
}

async function handleTask(task: Queues.GeneralTask, type: backend.RequestType, status?: Queues.Progress) {
    const { info } = task;
    if (type === 'getPreInfo') {
        const item = info.item;
        const id = item.sid ?? item.aid ?? item.epid ?? item.ssid;
        if (!id) throw new AppError('No sid or aid or epid or ssid found');
        const media = await handleMedia(task);
        const result = await getMediaInfo(id.toString(), item.type);
        return {
            ...media,
            nfo: result.nfo
        };
    } else if (type === 'getFolder') {
        return buildPaths(task, 'folder');
    } else if (type === 'getFilename') {
        return buildPaths(task, 'filename', status?.taskType);
    } else if (type === 'getNfo') {
        return await handleNfo(task);
    } else if (type === 'getThumbs') {
        return await handleThumbs(task);
    } else if (type === 'getDanmaku') {
        return await handleDanmaku(task);
    } else if (type === 'getSubtitle') {
        return await handleSubtitle(task);
    } else if (type === 'getAISummary') {
        return await handleAISummary(task);
    }
}

async function handleEvent(event: backend.ProcessEvent) {
    const { type, id } = event;
    const app = getCurrentWindow();
    const queue = useQueueStore();
    if (type === 'request') {
        const task = event.task as Queues.GeneralTask;
        const status = event.status as Queues.Progress;
        const result = await handleTask(task, event.namespace, status);
        app.emit(`${event.namespace}_${id}`, result);
    } else if (type === 'progress') {
        const target = queue.tasks
            .find(v => event.id.startsWith(v.id))?.status
            .find(v => v.id === event.id);

        if (target) {
            target.chunkLength = event.chunkLength;
            target.contentLength = event.contentLength;
        }

        console.log(target)
    } else if (type === 'error') {
        new AppError(event.message, { code: event.code as number }).handle();
    }
}

export async function processQueue() {
    try {
        const queue = useQueueStore();
        const event = new Channel<backend.ProcessEvent>();
        event.onmessage = handleEvent;
        const result = await backend.commands.processQueue(event, queue.waiting);
        if (result.status === 'error') throw new AppError(result.error);
    } catch(err) {
        new AppError(err).handle();
    }
}

function selectToStatus(id: string, select: Types.PopupSelect) {
    const status: Queues.Progress[] = [];
    const push = (taskType: Types.TaskType) => {
        status.push({
            parent: id,
            id: id + randomString(8),
            taskType,
            contentLength: 0,
            chunkLength: 0
        });
    };
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
    return status;
}

export async function submit(info: Types.MediaInfo, select: Types.PopupSelect, checkboxs: number[]) {
    const queue = useQueueStore();
    const settings = useSettingsStore();
    for (const [index, v] of checkboxs.entries()) {
        const id = randomString(8);
        const task: Queues.GeneralTask = {
            id,
            ts: Math.floor(Date.now() / 1000),
            index,
            state: 'waiting',
            select: select,
            info: {
                item: info.list[v],
                type: info.type,
                nfo: info.nfo,
            },
            status: selectToStatus(id, select),
        };
        queue.$patch(v => {
            v.tasks = [...v.tasks, task];
            v.waiting = [...v.waiting, id];
        });
        const result = await backend.commands.submitTask(task);
        if (result.status === 'error') throw new AppError(result.error);
    }
    if (settings.auto_download) processQueue();
}