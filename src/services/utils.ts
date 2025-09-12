import { useSettingsStore, useAppStore } from '@/store';
import { TYPE, useToast } from 'vue-toastification';
import { MediaType } from '@/types/shared.d';
import { Ref, watch } from 'vue';
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
        commands.updateMaxConc(v.max_conc),
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
    params?: Record<string, string | number | object>;
    post?: {
      type: 'json' | 'form';
      body?: Record<string, string | number | object>;
    };
    type?: 'text' | 'binary' | 'blob' | 'url';
    times?: number;
    handleError?: boolean;
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
        if (options?.handleError !== false) {
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

export async function parseId(input: string, ignore?: boolean) {
  const err = new AppError(i18n.global.t('error.invalidInput'));
  if (/[^a-zA-Z0-9-._~:/?#@!$&'()*+,;=%]/g.test(input)) throw err;
  try {
    const _input =
      input.startsWith('www.bilibili.com') || input.startsWith('bilibili.com')
        ? 'https://' + input
        : input;
    const url = new URL(_input);
    const segs = url.pathname.split('/');
    if (url.hostname === 'b23.tv') {
      return await parseId(await tryFetch(input, { type: 'url' }));
    } else if (!url.hostname.endsWith('bilibili.com')) throw err;
    let match;
    if (segs[2] === 'favlist') {
      match = input.match(/fid=(\d+)/i);
      if (match) return { id: match[1], type: MediaType.Favorite };
    }
    switch (segs[1]) {
      case 'video':
        match = input.match(/BV[a-zA-Z0-9]+|av(\d+)/i);
        if (match) return { id: match[1] || match[0], type: MediaType.Video };
        break;
      case 'cheese':
        match = input.match(/ep(\d+)|ss(\d+)/i);
        if (match) return { id: match[0], type: MediaType.Lesson };
        break;
      case 'bangumi':
        match = input.match(/ep(\d+)|ss(\d+)/i);
        if (match) return { id: match[0], type: MediaType.Bangumi };
        break;
      case 'audio':
        match = input.match(/au(\d+)/i);
        if (match) return { id: match[0], type: MediaType.Music };
        match = input.match(/am(\d+)/i);
        if (match) return { id: match[0], type: MediaType.MusicList };
        break;
      case 'list':
        if (segs[2] === 'watchlater') {
          const params = url.searchParams;
          match = params.get('aid') ?? params.get('bvid');
          if (match) return { id: match, type: MediaType.Video };
        }
    }
    throw err;
  } catch {
    // NOT URL
    if (ignore) return { id: input, type: null };
    if (
      !/^(av\d+$|ep\d+$|ss\d+$|au\d+$|am\d+$|bv(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9]{10}$)/i.test(
        input,
      )
    ) {
      throw err;
    }
    const map = {
      av: MediaType.Video,
      bv: MediaType.Video,
      ep: MediaType.Bangumi,
      ss: MediaType.Bangumi,
      au: MediaType.Music,
      am: MediaType.MusicList,
    };
    const prefix = input.slice(0, 2).toLowerCase() as keyof typeof map;
    return { id: input, type: map[prefix] || null };
  }
}

export function waitPage<T, K extends keyof T>(
  component: Ref<T | undefined> | undefined,
  tag: K,
): Promise<Ref<T>> {
  return new Promise((resolve) => {
    if (component?.value?.[tag]) resolve(component as Ref<T>);
    watch(
      () => component?.value?.[tag],
      (v) => {
        if (v) resolve(component as Ref<T>);
      },
      { once: true },
    );
  });
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
  if (typeof num == 'string') return num;
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
