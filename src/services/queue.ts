import { useQueueStore, useSettingsStore } from '@/store';
import { AppLog, getDefaultQuality, randomString, strip } from './utils';
import { getMediaInfo, getPlayUrl } from './media/data';
import { AppError } from './error';

import * as Types from '@/types/shared.d';
import * as opus from './media/opus';
import * as extras from './media/extras';
import * as backend from './backend';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { toRaw } from 'vue';
import i18n from '@/i18n';
import dayjs from 'dayjs';

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
    } else others.push(url);
  }
  if (mirror.length) {
    return (mirror.length < 2 ? [...mirror, ...upos] : mirror).map((v) =>
      v.toString(),
    );
  }
  if (upos.length || bcache.length) {
    const mirrorList = [
      'upos-sz-mirrorali.bilivideo.com',
      'upos-sz-mirrorcos.bilivideo.com',
    ];
    return (upos.length ? upos : bcache).map((v, i) => {
      v.hostname = mirrorList[i] ?? v.hostname;
      return v.toString();
    });
  }
  return others.map((v) => v.toString());
}

async function handleMedia(task: Types.Task) {
  const { select, item } = task;
  const playUrl = await getPlayUrl(item, item.type, select.fmt);
  let video = null as Types.PlayUrlResult | null;
  let audio = null as Types.PlayUrlResult | null;
  let videoUrls: string[] = [];
  let audioUrls: string[] = [];

  const settings = useSettingsStore();

  if (playUrl.codec !== select.fmt) {
    select.fmt = playUrl.codec;
  }
  if (select.media.video || select.media.audioVideo) {
    if (!playUrl.video) throw new AppError('No videos found');
    const resArr = playUrl.video.map((v) => v.id);
    const res = getDefaultQuality(resArr, 'res', select);
    const videos = playUrl.video.filter((v) => v.id === res);
    const encArr = playUrl.video
      .map((v) => v.codecid)
      .filter(Boolean) as number[];
    let enc = getDefaultQuality(encArr, 'enc', select);
    let _video = videos.find((v) => v.codecid === enc);
    if (!_video)
      for (const e of encArr) {
        _video = videos.find((v) => v.codecid === e);
        if (!_video) continue;
        enc = e;
        break;
      }
    if (!_video) throw new AppError('No video found');
    select.res = res;
    select.enc = enc;
    video = _video;
  }
  if (
    (select.media.audio || select.media.audioVideo) &&
    select.fmt === 'dash'
  ) {
    if (!playUrl.audio) throw new AppError('No audios found');
    const abr = getDefaultQuality(
      playUrl.audio.map((v) => v.id),
      'abr',
      select,
    );
    const _audio = playUrl.audio.find((v) => v.id === abr);
    if (!_audio) throw new AppError('No audio found');
    select.abr = abr;
    audio = _audio;
  }
  if (select.fmt !== 'dash') {
    select.abr = undefined;
    select.enc = undefined;
    const audioVideo = task.subtasks.find((v) => v.type === 'audioVideo')?.id;
    const hasVideo = task.subtasks.some((v) => v.type === 'video');
    task.subtasks = task.subtasks.filter(
      (v) => v.type !== 'audio' && v.type !== 'audioVideo',
    );
    if (!hasVideo && audioVideo)
      task.subtasks.unshift({
        id: audioVideo,
        type: Types.TaskType.Video,
      });
    task.status = task.subtasks.reduce<Record<string, Types.SubTaskStatus>>(
      (acc, item) => {
        acc[item.id] = task.status[item.id];
        return acc;
      },
      {},
    );
  }

  videoUrls = (
    video
      ? [
          video.baseUrl ?? video.base_url,
          ...(video.backupUrl ?? video.backup_url ?? []),
        ].filter(Boolean)
      : []
  ) as string[];
  audioUrls = (
    audio
      ? [
          audio.baseUrl ?? audio.base_url,
          ...(audio.backupUrl ?? audio.backup_url ?? []),
        ].filter(Boolean)
      : []
  ) as string[];

  if (settings.block_pcdn) {
    videoUrls = urlFilter(videoUrls);
    audioUrls = urlFilter(audioUrls);
  }

  return {
    videoUrls,
    audioUrls,
    select,
    subtasks: task.subtasks,
  };
}

async function handleDanmaku(task: Types.Task, subtask: Types.SubTask) {
  const { select, item } = task;
  const type = subtask.type === 'liveDanmaku' ? false : select.danmaku.history;
  return await extras.getDanmaku(
    (content, chunk) =>
      handleEvent({
        type: 'progress',
        task: task.id,
        subtask: subtask.id,
        content,
        chunk,
      }),
    item,
    type,
  );
}

async function handleThumbs(task: Types.Task) {
  const { select, nfo } = task;
  const alias: Record<string, string> = { pic: 'cover', cover: 'pic' };
  return nfo?.thumbs
    .filter(
      (v) => select.thumb.includes(v.id) || select.thumb.includes(alias[v.id]),
    )
    .map((v) => ({
      id: (v.id.includes('-')
        ? i18n.global.t(`popup.thumb.${v.id.split('-')[0]}`, {
            num: v.id.split('-')[1],
          })
        : i18n.global.t('popup.thumb.' + v.id)
      ).replace(/[/\\:*?"<>|]/g, '_'),
      url: v.url.replace('http:', 'https:'),
    }));
}

async function handleNfo(task: Types.Task, subtask: Types.SubTask) {
  const { item, nfo } = task;
  return await extras.getNfo(
    item,
    nfo,
    subtask.type === 'albumNfo' ? 'album' : 'nfo',
  );
}

async function handleSubtitle(task: Types.Task, subtask: Types.SubTask) {
  const { select, item } = task;
  const result = await extras.getSubtitle(item, {
    name: select.misc.subtitles,
  });
  if (result === -1) {
    AppLog(
      i18n.global.t('error.skipTask', [
        task.id,
        i18n.global.t('taskType.' + subtask.type),
      ]),
      'info',
    );
    return new Uint8Array(0);
  } else return result;
}

async function handleAISummary(task: Types.Task, subtask: Types.SubTask) {
  const { item } = task;
  const result = await extras.getAISummary(item);
  if (result === -1) {
    AppLog(
      i18n.global.t('error.skipTask', [
        task.id,
        i18n.global.t('taskType.' + subtask.type),
      ]),
      'info',
    );
    return new Uint8Array(0);
  } else return result;
}

async function handleOpusContent(task: Types.Task) {
  const { item } = task;
  const opid = task.item.opid;
  if (!opid) return new Uint8Array(0);
  return await opus.getOpusMarkdown(item.title, opid);
}

async function handleOpusImages(task: Types.Task) {
  const opid = task.item.opid;
  if (!opid) return [];
  return await opus.getOpusImages(opid);
}

function buildPaths(
  scope: keyof typeof Types.NamingTemplates,
  task: Types.Task,
  subtask?: Types.SubTask,
) {
  const template = useSettingsStore().format[scope];
  const ctx = new Set(Object.values(Types.NamingTemplates[scope]).flat());

  const { select, item, nfo } = task;
  const t = i18n.global.t;
  const data = {
    showtitle: nfo.showtitle,
    title: item.type === 'opus' ? item.opid : item.title,
    container: t('mediaType.' + task.type),
    mediaType: t('mediaType.' + item.type),
    taskType: subtask ? t('taskType.' + subtask?.type) : null,
    pubtime: nfo?.premiered ?? item.pubtime,
    upper: nfo.upper?.name,
    upperid: nfo.upper?.mid,
    aid: item.aid,
    sid: item.sid,
    fid: item.fid,
    cid: item.cid,
    bvid: item.bvid,
    epid: item.epid,
    ssid: item.ssid,
    opid: item.opid,
    res: select.res ? t('quality.res.' + select.res) : null,
    abr: select.abr ? t('quality.abr.' + select.abr) : null,
    enc: select.enc ? t('quality.enc.' + select.enc) : null,
    fmt: select.fmt ? t('quality.fmt.' + select.fmt) : null,
    index: task.seq + 1,
    downtime: task.ts,
  };

  return strip(
    template.replace(/\{([^{}]+)\}/g, (full, inner) => {
      const result = (inner as string).split(':');
      const k = result?.[0]?.trim();
      const v = result?.[1]?.trim();
      if (!ctx.has(k)) return full;
      if (k === 'pubtime' || k === 'downtime') {
        const t = new Date(data[k] * 1000);
        const pattern = v ?? 'YYYY-MM-DD_HH-mm-ss';
        if (pattern.toLowerCase() === 'ts') return String(data[k]);
        return dayjs(t).format(pattern);
      } else {
        return String(data[k as keyof typeof data] ?? '');
      }
    }),
  )
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\.+$/, ''); // Issue#165
}

async function prepareTask(
  task: Types.Task,
) {
  /* URLS, SUBTASKS */
  const {
    videoUrls,
    audioUrls,
    select,
    subtasks,
  } = await handleMedia(task);

  /* NFO */
  const item = task.item;
  const id = item.opid ?? item.epid ?? item.ssid ?? item.sid ?? item.aid;
  if (!id) throw new AppError(`No id for task#${task.id} found`);
  const { nfo } = await getMediaInfo(id.toString(), item.type);

  /* SUB FOLDER */
  const subFolder = buildPaths('item', task);

  return {
    videoUrls,
    audioUrls,
    select,
    subtasks,
    subFolder,
    nfo,
  }
}

async function handleTask(
  task: Types.Task,
  type: backend.RequestAction,
  subtask?: Types.SubTask,
) {
  if (type === 'prepareTask') {
    return await prepareTask(task);
  }
  if (!subtask) throw new AppError('Subtask missing for action ' + type);
  if (type === 'getFilename') {
    return buildPaths('file', task, subtask);
  } else if (type === 'getNfo') {
    return await handleNfo(task, subtask);
  } else if (type === 'getThumbs') {
    return await handleThumbs(task);
  } else if (type === 'getDanmaku') {
    return await handleDanmaku(task, subtask);
  } else if (type === 'getSubtitle') {
    return await handleSubtitle(task, subtask);
  } else if (type === 'getAISummary') {
    return await handleAISummary(task, subtask);
  } else if (type === 'getOpusContent') {
    return await handleOpusContent(task);
  } else if (type === 'getOpusImages') {
    return await handleOpusImages(task);
  }
}

export async function handleEvent(event: backend.QueueEvent) {
  const { type } = event;
  const queue = useQueueStore();
  if (type === 'taskState') {
    const task = queue.tasks?.[event.task];
    if (task) task.state = event.state;
  } else if (type === 'schedulerState') {
    const scheduler = queue.schedulers?.[event.scheduler];
    if (scheduler) scheduler.state = event.state;
  } else if (type === 'schedulerQueue') {
    const scheduler = queue.schedulers?.[event.scheduler];
    if (scheduler) scheduler.queue = event.queue;
  } else if (type === 'progress') {
    const status = queue.tasks?.[event.task]?.status?.[event.subtask];
  if (status) {
    status.content = event.content;
    status.chunk = event.chunk;
  }
  } else if (type === 'queue') {
    queue[event.name] = event.value;
  } else if (type === 'request') {
    const task = queue.tasks[event.task];
    const subtask = task.subtasks.find((v) => v.id === event.subtask);
    let result: unknown = null;
    try {
      result = await handleTask(task, event.action, subtask);
    } catch (e) {
      new AppError(e).handle();
    }
    const app = getCurrentWindow();
    app.emit(event.endpoint, result);
  } else if (type === 'error') {
    new AppError(event.message, { code: event.code as number }).handle();
  }
  // if (event.init && queue.doing.length) {
  //   AppLog(i18n.global.t('down.restored'), 'info');
  // }
}

export async function processQueue() {
  try {
    const queue = useQueueStore();
    const snapshot = queue.tasks[queue.schedulers[queue.backlog[0]].list[0]];
    const folder = buildPaths('series', snapshot);
    const sid = randomString(8);

    const scheduler = await backend.commands.planScheduler(sid, folder);
    if (scheduler.status === 'error') throw new AppError(scheduler.error);
    queue.schedulers[sid] = scheduler.data;

    const process = await backend.commands.processScheduler(sid);
    if (process.status === 'error') throw new AppError(process.error);
  } catch (err) {
    new AppError(err).handle();
  }
}

function selectToSubTasks(id: string, select: Types.PopupSelect) {
  const tasks: Types.SubTask[] = [];
  const push = (type: Types.TaskType) => {
    tasks.push({
      id: id + randomString(8),
      type,
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
  if (select.misc.opusContent) push(Types.TaskType.OpusContent);
  if (select.misc.opusImages) push(Types.TaskType.OpusImages);
  if (select.misc.aiSummary) push(Types.TaskType.AISummary);
  if (select.misc.subtitles) push(Types.TaskType.Subtitles);
  if (!tasks.length) {
    throw new AppError(i18n.global.t('popup.least'));
  }
  return tasks;
}

export async function submit(
  info: Types.MediaInfo,
  select: Types.PopupSelect,
  checkboxs: number[],
) {
  // avoid reference issues
  const detach = <T>(x: T): T => structuredClone(toRaw(x));
  const queue = useQueueStore();
  const settings = useSettingsStore();
  for (const idx of checkboxs) {
    const id = randomString(8);
    const subtasks = selectToSubTasks(id, select);
    const status = subtasks.reduce<Record<string, Types.SubTaskStatus>>(
      (acc, item) => {
        acc[item.id] = {
          content: 0,
          chunk: 0,
        };
        return acc;
      },
      {},
    );
    const view: backend.TaskView = {
      meta: {
        id,
        ts: Math.floor(Date.now() / 1000),
        seq: queue.backlog[0].length,
        item: detach(info.list[idx]),
        type: detach(info.type),        
      },
      prepare: {
        select: detach(select),
        subtasks,
        nfo: detach(info.nfo),
        folder: String(),
      },
      hot: {
        state: 'backlog',
        status,
      }
    };
    queue.tasks[id] = {
      ...view.meta,
      ...view.prepare,
      ...view.hot,
    } as Types.Task;
    const result = await backend.commands.submitTask(id, view);
    if (result.status === 'error') throw new AppError(result.error);
  }
  if (settings.auto_download) processQueue();
}
