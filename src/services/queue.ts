import { useQueueStore, useSettingsStore } from "@/store";
import { getDefaultQuality, randomString } from "./utils";
import { getMediaInfo, getPlayUrl } from "./media/data";
import { AppError } from "./error";

import * as Types from "@/types/shared.d";
import * as Queues from "@/types/queue.d";
import * as extras from "./media/extras";
import Bottleneck from "bottleneck";
import { watch } from "vue";

let limiter: Bottleneck = null as any;

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
    const { select, info } = task;
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
        video = _video;
    }
    if (select.media.audio || select.media.audioVideo) {
        if (!playUrl.audio) throw new AppError('No audios found');
        const abr = getDefaultQuality(playUrl.audio.map(v => v.id), 'abr', select);
        const _audio = playUrl.audio.find(v => v.id === abr);
        if (!_audio) throw new AppError('No audio found');
        audio = _audio;
    }

    let videoUrls = [
        video.baseUrl ?? video.base_url,
        ...(video.backupUrl ?? video.backup_url ?? [])
    ].filter(Boolean) as string[];
    if (!videoUrls.length) throw new AppError('No video urls found');
    let audioUrls = [
        audio.baseUrl ?? audio.base_url,
        ...(audio.backupUrl ?? audio.backup_url ?? [])
    ].filter(Boolean) as string[];
    if (!videoUrls.length) throw new AppError('No video urls found');

    if (true) {
        videoUrls = urlFilter(videoUrls);
        audioUrls = urlFilter(audioUrls);
    }

    console.log(videoUrls, audioUrls)

    // 向后端提交aria2c任务
}

async function handleDanmaku(task: Queues.GeneralTask) {
    const { select, info } = task;
    const result = await extras.getDanmaku(info.item, select.danmaku.history);

    // 向后端提交写入文件任务
}

async function handleThumb(task: Queues.GeneralTask) {
    const { select, info } = task;
    const result = info.nfo.thumbs.filter(v => select.thumb.includes(v.id));

    // 向后端提交下载图像任务
}

async function handleNfo(task: Queues.GeneralTask) {
    const { select, info } = task;
    if (select.nfo.album) {
        throw new AppError('Album NFO is unimplemented yet')
    }
    const result = await extras.getSingleNfo(info.item, info.nfo);

    // 向后端提交写入文件任务
}

async function handleSubtitle(task: Queues.GeneralTask) {
    const { select, info } = task;
    const result = await extras.getSubtitle(info.item, { name: select.misc.subtitles });

    // 向后端提交写入文件任务
}

async function handleAISummary(task: Queues.GeneralTask) {
    const { select, info } = task;
    const result = await extras.getAISummary(info.item);

    // 向后端提交写入文件任务
}

async function handleTask(task: Queues.GeneralTask) {
    let { select, info } = task;
    if (info.type === Types.MediaType.Favorite || info.type === Types.MediaType.MusicList) {
        const item = info.item;
        const id = item.sid ?? item.aid ?? item.epid ?? item.ssid;
        if (!id) throw new AppError('No sid or aid or epid or ssid found');
        const mediaInfo = await getMediaInfo(id.toString(), item.type);
        info.nfo = mediaInfo.nfo;
    }

    const tasks: (() => Promise<any>)[] = [];

    if (select.misc.subtitles) tasks.push(() => handleSubtitle(task));
    if (select.misc.aiSummary) tasks.push(() => handleAISummary(task));
    if (select.nfo.album) tasks.push(() => handleNfo(task));
    if (select.nfo.single) tasks.push(() => handleNfo(task));
    if (select.danmaku.live) tasks.push(() => handleDanmaku(task));
    if (select.danmaku.history) tasks.push(() => handleDanmaku(task));
    if (select.thumb.length){
        tasks.push(() => handleThumb(task));
    }
    if (Object.entries(select.media).some(([_, v]) => v)) {
        tasks.push(() => handleMedia(task));
    }

    const scheduled = tasks.map(v => limiter.schedule(v));
    await Promise.allSettled(scheduled);
}

export async function processQueue() {
    const queue = useQueueStore();
    const tasks = queue.waiting.map(v => v.id);
    const map = Object.fromEntries(queue.waiting.map(t => [t.id, t]));
    if (!limiter) {
        const settings = useSettingsStore();
        limiter = new Bottleneck({
            maxConcurrent: settings.max_conc,
        });
        watch(() => settings.max_conc, (v) => {
            limiter?.updateSettings({ maxConcurrent: v });
        });
    }
    for (const id of tasks) {
        const task = map[id];
        if (!task) continue;
        const idx = queue.waiting.findIndex(v => v.id === id);
        if (idx !== -1) queue.waiting.splice(idx, 1);
        handleTask(task);
    }
}

export function submit(info: Types.MediaInfo, select: Types.PopupSelect, checkboxs: number[]) {
    const queue = useQueueStore();
    checkboxs.forEach((i, index) => queue.waiting.push({
        id: randomString(8),
        ts: Math.floor(Date.now() / 1000),
        index,
        select,
        info: {
            item: info.list[i],
            type: info.type,
            nfo: info.nfo,
        }
    }));
    processQueue();
}