import { useSettingsStore, useAppStore } from '@/store';
import { TYPE, useToast } from 'vue-toastification';
import { MediaType } from '@/types/shared.d';
import { watch } from 'vue';
import i18n from '@/i18n';

import { fetch } from '@tauri-apps/plugin-http';
import * as log from '@tauri-apps/plugin-log';

import { commands, events } from './backend';
import { handleEvent } from './queue';
import { AppError } from './error';
import * as auth from './auth';

export function AppLog(message: string, _type?: `${TYPE}`) {
  const type = Object.values(TYPE).includes(_type as TYPE)
    ? (_type as TYPE)
    : TYPE.INFO;
  switch (type) {
    case TYPE.ERROR: {
      log.error(message);
      console.error(message);
      break;
    }
    case TYPE.WARNING: {
      log.warn(message);
      console.warn(message);
      break;
    }
    case TYPE.INFO:
    case TYPE.SUCCESS:
    case TYPE.DEFAULT: {
      log.info(message);
      console.log(message);
      break;
    }
  }
  useToast()(message, {
    type,
    timeout: type === TYPE.ERROR ? false : 3000,
  });
}

export function setEventHook() {
  const app = useAppStore();
  const settings = useSettingsStore();
  watch(
    settings.$state,
    async (v) => {
      i18n.global.locale.value = v.language;
      const result = await Promise.all([
        commands.setWindow(v.theme, v.window_effect),
        commands.configWrite(v),
      ]);
      for (const r of result) {
        if (r.status === 'error') new AppError(r.error).handle();
      }
      if (result[0].status !== 'ok') return;
      const [dark, color] = result[0].data;
      const list = document.documentElement.classList;
      list.toggle('light', !dark);
      list.toggle('dark', dark);
      document.documentElement.style.backgroundColor = color ?? 'transparent';
    },
    { deep: true },
  );
  events.headersData.listen((e) =>
    app.$patch({
      headers: e.payload,
    }),
  );
  events.queueEvent.listen((e) => handleEvent(e.payload));
  events.processError.listen((e) => {
    const err = e.payload;
    new AppError(err.error, { name: `ProcessError (${err.name})` }).handle();
  });
}

export async function tryFetch(
  url: string,
  options?: {
    auth?: 'wbi';
    params?: Record<string, string | number | undefined>;
    post?: {
      type: 'json' | 'form';
      body?: Record<string, string | number | undefined>;
    };
    type?: 'text' | 'binary' | 'blob' | 'url';
    times?: number;
    ignoreErr?: boolean;
  },
) {
  let grisk_id: string = '';
  const loadingBox = document.querySelector('.loading');
  for (let i = 0; i < (options?.times ?? 3); i++) {
    try {
      const rawParams = {
        ...options?.params,
        ...(grisk_id && { gaia_vtoken: grisk_id }),
      };
      let params = '?';
      if (options?.auth === 'wbi' && options.params) {
        params += await auth.wbi(rawParams);
      } else if (options?.params) {
        params += new URLSearchParams(rawParams).toString();
      } else params = String();
      const settings = useSettingsStore();
      const app = useAppStore();
      const fetchOptions = {
        headers: app.headers as Record<string, string>,
        proxy: { all: settings.proxyConfig },
        method: 'GET',
        body: undefined as string | undefined,
      };
      if (options?.post) {
        fetchOptions.method = 'POST';
        fetchOptions.headers['Content-Type'] = (() => {
          switch (options.post.type) {
            case 'json':
              return 'application/json';
            case 'form':
              return 'application/x-www-form-urlencoded';
          }
        })();
        if (options.post.body) {
          fetchOptions.body = JSON.stringify(options.post.body);
        }
      }
      loadingBox?.classList.add('active');
      const response = await fetch(
        url.replace('http:', 'https:') + params,
        fetchOptions,
      );
      if (options?.type) {
        if (!response.ok) {
          throw new AppError(response.statusText, { code: response.status });
        }
        switch (options?.type) {
          case 'text':
            return await response.text();
          case 'binary':
            return await response.arrayBuffer();
          case 'blob':
            return await response.blob();
          case 'url':
            return response.url;
        }
      }
      const body = await response.json();
      if (body.code === 0) {
        return body;
      }
      if (body.code === -352 && body.data && i < (options?.times ?? 3)) {
        const csrf =
          new Headers(app.headers)
            .get('Cookie')
            ?.match(/bili_jct=([^;]+);/)?.[1] || '';
        const captchaParams = new URLSearchParams({
          v_voucher: body.data.v_voucher,
          ...(csrf && { csrf }),
        }).toString();
        const captchaResp = await fetch(
          'https://api.bilibili.com/x/gaia-vgate/v1/register?' + captchaParams,
          {
            headers: app.headers,
            proxy: { all: settings.proxyConfig },
            method: 'POST',
          },
        );
        const captchaBody = await captchaResp.json();
        if (captchaBody.code !== 0) {
          throw new AppError(captchaBody.message, { code: captchaBody.code });
        }
        const {
          token,
          geetest: { gt = '', challenge = '' },
        } = captchaBody.data;
        if (!token || !gt || !challenge) {
          throw new AppError(body.message || body.msg, { code: body.code });
        }
        AppLog(i18n.global.t('error.risk'), 'warning');
        const captcha = await auth.captcha(gt, challenge);
        const validateParams = new URLSearchParams({
          token,
          ...captcha,
          ...(csrf && { csrf }),
        }).toString();
        const validateResp = await fetch(
          'https://api.bilibili.com/x/gaia-vgate/v1/validate?' + validateParams,
          {
            headers: app.headers,
            proxy: { all: settings.proxyConfig },
            method: 'POST',
          },
        );
        const validateBody = await validateResp.json();
        if (validateBody.code !== 0 || !validateBody.data?.is_valid) {
          throw new AppError(validateBody.message, {
            code: validateBody.code,
          });
        }
        grisk_id = validateBody.data.grisk_id;
        await new Promise((resolve) =>
          setTimeout(resolve, getRandomInRange(100, 500)),
        );
        continue;
      } else {
        if (options?.ignoreErr) {
          return body;
        } else {
          throw new AppError(body.message || body.msg, { code: body.code });
        }
      }
    } finally {
      loadingBox?.classList.remove('active');
    }
  }
}

export function strip(input: string, char?: string) {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\u0000-\u001F\u007F-\u009F]/g, char ?? '');
}

export async function getBlob(url: string) {
  const blob = await tryFetch(url, { type: 'blob' });
  return URL.createObjectURL(blob);
}

export async function parseId(
  input: string,
  ignore?: boolean,
): Promise<{
  id: string;
  type?: MediaType;
  target?: number;
}> {
  const raw = input.trim();
  const err = () => new AppError(i18n.global.t('error.invalidInput'));

  if (/^(av\d+|BV\w{10}|ep\d+|ss\d+|md\d+|au\d+|am\d+|cv\d+)$/i.test(raw)) {
    const map: Record<string, MediaType> = {
      av: MediaType.Video,
      bv: MediaType.Video,
      ep: MediaType.Bangumi,
      ss: MediaType.Bangumi,
      md: MediaType.Bangumi,
      au: MediaType.Music,
      am: MediaType.MusicList,
    };
    const prefix = raw.slice(0, 2).toLowerCase();
    return { id: raw, type: map[prefix] ?? null };
  }

  let url: URL;
  try {
    const picked = input
      .split(/\s+/)
      .find(
        (v) =>
          /^(?:https?:\/\/)?(?:[\w-]+\.)*(?:bilibili\.com|b23\.tv)\/.+$/i.test(
            v,
          ) && /^[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/.test(v),
      );
    url = new URL(
      picked
        ? /^https?:\/\//i.test(picked)
          ? picked
          : `https://${picked}`
        : /\.(bilibili\.com|b23\.tv)$/i.test(raw)
          ? `https://${raw}`
          : raw,
    );
  } catch {
    if (ignore)
      return {
        id: raw,
      };
    throw err();
  }
  const host = url.hostname.toLowerCase();
  if (!/^(?:([a-z0-9-]+\.)*bilibili\.com|b23\.tv)$/i.test(host)) {
    throw err();
  }
  const segs = url.pathname.slice(1).split('/');
  const prms = url.searchParams;

  if (host === 'b23.tv') {
    return await parseId(await tryFetch(raw, { type: 'url' }));
  }

  if (host === 'space.bilibili.com') {
    const mid = segs[0];
    const type = segs[1];
    if (type === 'favlist') {
      const fid = url.searchParams.get('fid');
      return {
        id: mid,
        type: MediaType.Favorite,
        target: /^\d+$/.test(fid ?? '') ? Number(fid) : undefined,
      };
    }
    if (
      (segs[2] ?? type) === 'video' ||
      type === 'lists' ||
      segs.length === 1
    ) {
      const id = input.match(/\/lists\/(\d+)/)?.[1];
      return {
        id: mid,
        type: MediaType.UserVideo,
        target: /^\d+$/.test(id ?? '') ? Number(id) : undefined,
      };
    }
    if (segs[2] === 'opus' || type === 'article') {
      return {
        id: mid,
        type: MediaType.UserOpus,
      };
    }
    if (segs[2] === 'audio' || type === 'audio') {
      return {
        id: mid,
        type: MediaType.UserAudio,
      };
    }
    throw err();
  }

  let type = segs[0];
  let id = segs[1];
  if (/^(BV\w{10}|av\d+)$/i.test(id))
    return {
      id,
      type: MediaType.Video,
    };
  if (/(au\d+|am\d+)/i.test(id)) {
    if (id.startsWith('au'))
      return {
        id,
        type: MediaType.Music,
      };
    if (id.startsWith('am'))
      return {
        id,
        type: MediaType.MusicList,
      };
  }

  if (/(cv\d+)/i.test(id) || type === 'opus') {
    return {
      id,
      type: MediaType.Opus,
    };
  }

  if (type === 'watchlater') {
    return {
      id: String(),
      type: MediaType.WatchLater,
    };
  }

  id = segs[2];
  if (/(ep\d+|ss\d+|md\d+)/i.test(id)) {
    if (type === 'bangumi')
      return {
        id,
        type: MediaType.Bangumi,
      };
    if (type === 'cheese')
      return {
        id,
        type: MediaType.Lesson,
      };
  }

  if (/rl\d+/i.test(id)) {
    return {
      id,
      type: MediaType.OpusList,
    };
  }

  type = segs[1];
  if (type === 'watchlater') {
    const id = prms.get('aid') ?? prms.get('oid') ?? prms.get('bvid');
    if (id)
      return {
        id,
        type: MediaType.Video,
      };
  }
  throw err();
}

export function randomString(len: number = 8) {
  if (len <= 0 || len % 2)
    throw new Error('Length must be a unsigned even int.');
  const bytes = new Uint8Array(len / 2);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function stat(num: number | string) {
  const locale = useSettingsStore().language;
  if (typeof num === 'string') return num;
  if (locale === 'zh-CN') {
    if (num >= 100000000) {
      return (num / 100000000).toFixed(1) + '亿';
    } else if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    } else {
      return num.toString();
    }
  } else {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    } else {
      return num.toString();
    }
  }
}

export function duration(num: number) {
  const hs = Math.floor(num / 3600);
  const mins = Math.floor((num % 3600) / 60);
  const secs = Math.round(num % 60);
  const finalHs = hs > 0 ? hs.toString().padStart(2, '0') + ':' : '';
  const finalMins = mins.toString().padStart(2, '0');
  const finalSecs = secs.toString().padStart(2, '0');
  return finalHs + finalMins + ':' + finalSecs;
}

export function timestamp(ts: number, zone?: string) {
  const date = new Date(ts * 1000);
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: zone,
  });
  return formatter.format(date).replace(/\//g, '-');
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  } else if (bytes < 1024 * 1024 * 1024) {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  } else {
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  }
}

export function getDefaultQuality(
  ids: number[],
  name: 'res' | 'abr' | 'enc',
  _quality?: { res?: number; abr?: number; enc?: number },
) {
  const quality = _quality ?? useSettingsStore().default;
  if (!quality[name]) return undefined;
  return ids.includes(quality[name])
    ? quality[name]
    : ids.sort((a, b) => b - a)[0];
}

export function getRandomInRange(min: number, max: number) {
  return Math.floor(Math.random() * (max - min) + min);
}

export function getPublicImages(data: unknown, prefix?: string) {
  const images: { id: string; url: string }[] = [];
  for (const [id, url] of Object.entries(data ?? {})) {
    if (
      typeof url === 'string' &&
      (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.gif'))
    )
      images.push({ id: prefix ? `${prefix}_${id}` : id, url });
  }
  return images;
}

export function mapBangumiStaffs(staffs: [role: string, names: string][]): {
  role: string;
  name: string;
}[] {
  // i hate converting these semantic things
  const map: Record<string, 'writer' | 'director' | 'studio' | 'credits'> = {
    原作: 'writer',
    剧本统筹: 'writer',
    编剧: 'writer',
    导演: 'director',
    系列导演: 'director',
    动画制作: 'studio',
    出品: 'studio',
    音乐制作: 'studio',
    音响制作: 'studio',
  };
  return staffs.flatMap(([role, names]) => {
    const mapped = map[role.trim()];
    return mapped
      ? names.split(/(?:\u2014\u2014|\u2014|\uFF0F|\u3001)/).map((name) => ({
          role: mapped,
          name: name.trim(),
        }))
      : [];
  });
}

export function mapMusicStaffs(staffs: [type: number, names: string][]): {
  role: string;
  name: string;
}[] {
  const map: Record<number, string> = {
    1: 'artist',
    2: 'lyricist',
    3: 'composer',
    4: 'arranger',
    5: 'mixer',
    9: 'engineer',
    10: 'performer',
    11: 'instrument',
  };
  return staffs.flatMap(([type, names]) => {
    const mapped = map[type];
    return mapped
      ? names.split(/[\uFF0F\u3001]+|\s+/u).map((name) => ({
          role: mapped,
          name: name.trim(),
        }))
      : [];
  });
}
