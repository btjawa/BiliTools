import { TauriError, commands, events } from '@/services/backend';
import { useSettingsStore, useAppStore, useQueueStore } from "@/store";
import { TYPE, useToast } from "vue-toastification";
import { MediaInfo, MediaType, CurrentSelect } from '@/types/data.d';
import { fetch } from '@tauri-apps/plugin-http';
import * as log from '@tauri-apps/plugin-log';
import * as auth from '@/services/auth';
import StackTrace from "stacktrace-js";
import i18n from '@/i18n';

export class ApplicationError extends Error {
    stackFrames?: StackTrace.StackFrame[];
    constructor(input: unknown, options?: { code?: number | string, name?: string }) {
        super();
        if (input instanceof ApplicationError) return input;
        else if (input instanceof Error) {
            this.message = input.message;
            this.name = input.name;
            this.stack = input.stack;
        } else if (typeof input === 'string') {
            this.message = input + (options?.code ? ` (${options.code})` : '');
        } else {
            const err = input as TauriError;
            if (!err.message) return;
            this.message = err.message + (err.code ? ` (${err.code})` : '');
        }
        if (options?.name) this.name = options.name;
        this.stackFrames = StackTrace.getSync();
    }
    async handleError() {
        const stack = this.stackFrames?.map(f => {
            const funcName = f.functionName ?? '<anonymous>';
            const filename = f.fileName?.match(/https?:\/\/[^/]+(\/[^\s?#]*)/)?.[1] ?? '<anonymous>';
            if (filename.startsWith('/node_modules')) return false;
            return `    at ${funcName} (${filename}:${f.lineNumber}:${f.columnNumber})`;
        }).filter(Boolean).join('\n');
        AppLog(`${this.name}: ${this.message}\n` + stack, TYPE.ERROR);
    }
}

export function AppLog(message: string, type?: TYPE) {
    switch(type) {
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
        default:
        case TYPE.INFO:
        case TYPE.SUCCESS:
        case TYPE.DEFAULT: {
            log.info(message);
            console.log(message);
            break;
        }
    }
    (useToast())(message, {
        type, timeout: 10000,
    })
}

export function setEventHook() {
    const app = useAppStore();
    const queue = useQueueStore();
    events.headers.listen(e => {
        app.headers = e.payload;
    })
    events.settings.listen(async e => {
        const settings = useSettingsStore();
        settings.$patch(e.payload);
		await commands.setTheme(e.payload.theme, false);
        i18n.global.locale.value = settings.language;
    });
    events.queueEvent.listen(e => {
        const type = e.payload.type.toLowerCase() as keyof typeof queue.$state;
        queue[type] = e.payload.data;
    })
    events.sidecarError.listen(e => {
        const err = e.payload;
        new ApplicationError(i18n.global.t('error.errorProvider', [err.name]) + ':\n' + err.error, { name: 'SidecarError' }).handleError();
    });
}

export async function tryFetch(url: string | URL, options?: {
    auth?: 'wbi',
    params?: Record<string, string | number | Object>,
    post?: {
        type: 'json' | 'form',
        body?: Record<string, string | number | Object>
    },
    type?: 'text' | 'binary' | 'blob' | 'url',
    times?: number,
    handleError?: boolean
}) {
    let grisk_id: string = '';
    for (let i = 0; i < (options?.times ?? 3); i++) {
        try {
        const rawParams = {
            ...options?.params, 
            ...(grisk_id && { gaia_vtoken: grisk_id })
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
            headers: app.headers,
            proxy: { all: settings.proxyConfig },
            method: 'GET',
            body: undefined as string | undefined
        };
        if (options?.post) {
            fetchOptions.method = 'POST';
            fetchOptions.headers['Content-Type'] = (() => {
                switch(options.post.type) {
                    case 'json': return 'application/json';
                    case 'form': return 'application/x-www-form-urlencoded';
                }
            })();
            if (options.post.body) {
                fetchOptions.body = JSON.stringify(options.post.body);
            }
        }
        const response = await fetch(url + params, fetchOptions);
        if (options?.type) {
            if (!response.ok) {
                throw new ApplicationError(response.statusText, { code: response.status });
            }
            switch(options?.type) {
                case 'text': return await response.text();
                case 'binary': return await response.arrayBuffer();
                case 'blob': return await response.blob();
            }
        }
        let body = {} as any;
        try {
            body = await response.json();
        } catch(_) {
            if (options?.type === 'url') return response.url;
            throw new ApplicationError(response.statusText, { code: response.status });
        }
        if (body.code !== 0 && body.code) {
            if (body.code === -352 && body.data.v_voucher && i < (options?.times ?? 3)) {
                const csrf = new Headers(app.headers).get('Cookie')?.match(/bili_jct=([^;]+);/)?.[1] || '';
                const captchaParams = new URLSearchParams({
                    v_voucher: body.data.v_voucher, ...(csrf && { csrf })
                }).toString();
                const captchaResp = await fetch('https://api.bilibili.com/x/gaia-vgate/v1/register?' + captchaParams, {
                    headers: app.headers,
                    proxy: { all: settings.proxyConfig },
                    method: 'POST',
                });
                const captchaBody = await captchaResp.json();
                if (captchaBody.code !== 0) {
                    throw new ApplicationError(captchaBody.message, { code: captchaBody.code });
                }
                const { token, geetest: { gt = '', challenge = '' } } = captchaBody.data;
                if (!token || !gt || !challenge) {
                    throw new ApplicationError(body.message || body.msg, { code: body.code });
                }
                AppLog(i18n.global.t('error.risk'));
                const captcha = await auth.captcha(gt, challenge);
                const validateParams = new URLSearchParams({
                    token, ...captcha, ...(csrf && { csrf })
                }).toString();
                const validateResp = await fetch('https://api.bilibili.com/x/gaia-vgate/v1/validate?' + validateParams, {
                    headers: app.headers,
                    proxy: { all: settings.proxyConfig },
                    method: 'POST',
                });
                const validateBody = await validateResp.json();
                if (validateBody.code !== 0 || !validateBody.data?.is_valid) {
                    throw new ApplicationError(validateBody.message, { code: validateBody.code });
                }
                grisk_id = validateBody.data.grisk_id;
                await new Promise(resolve => setTimeout(resolve, getRandomInRange(100, 500)));
                continue;
            } else {
                console.error(body)
                if (options?.handleError !== false) {
                    throw new ApplicationError(body.message || body.msg, { code: body.code });
                }
            }
        }
        return body;
        } catch(e) { throw e }
    }
}

export async function parseId(input: string) {
    const err = i18n.global.t('error.invalidInput');
    try {
        const url = new URL(input);
        const segs = url.pathname.split('/');
        if (url.hostname === 'b23.tv') {
            return await parseId(await tryFetch(url, { type: 'url' }));
        } else if (!url.hostname.endsWith('bilibili.com')) throw err;
        let match;
        if (segs[2] === 'favlist') {
            match = input.match(/fid=(\d+)/i);
            if (match) return { id: match[1], type: MediaType.Favorite };
        }
        switch (segs[1]) {
            case 'video':
                match = input.match(/BV[a-zA-Z0-9]+|av(\d+)/i);
                if (match) return { id: match[1] || match[0], type: MediaType.Video }; break;
            case 'cheese':
                match = input.match(/ep(\d+)|ss(\d+)/i);
                if (match) return { id: match[0], type: MediaType.Lesson }; break;
            case 'bangumi':
                match = input.match(/ep(\d+)|ss(\d+)/i);
                if (match) return { id: match[0], type: MediaType.Bangumi }; break;
            case 'audio':
                match = input.match(/au(\d+)/i);
                if (match) return { id: match[0], type: MediaType.Music };
                match = input.match(/am(\d+)/i);
                if (match) return { id: match[0], type: MediaType.MusicList }; break;
        }
        throw err;
    } catch(_) { // NOT URL
        if (!/^(av\d+$|ep\d+$|ss\d+$|au\d+$|am\d+$|bv(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9]{10}$)/i.test(input)) {
            throw new ApplicationError(err);
        }
        const map = {
            'av': MediaType.Video,
            'bv': MediaType.Video,
            'ep': MediaType.Bangumi,
            'ss': MediaType.Bangumi,
            'au': MediaType.Music,
            'am': MediaType.MusicList,
        };
        const prefix = input.slice(0, 2).toLowerCase() as keyof typeof map;
        return { id: input, type: map[prefix] || null };
    }
}

export function debounce(fn: Function, wait: number) {
    let bouncing = false;
    return function(this: any, ...args: any[]) {
        if (bouncing) return null;
        bouncing = true;
        setTimeout(() => {
            bouncing = false;
        }, wait);
        fn.apply(this, args);
    };
}

export function stat(num: number | string): string {
    const locale = useSettingsStore().language;
    if (typeof num == "string") return num;
    if (locale === 'zh-CN') {
        if (num >= 100000000) {
            return (num / 100000000).toFixed(1) + '亿';
        } else if (num >= 10000) {
            return (num / 10000).toFixed(1) + '万';
        } else {
            return num.toString();
        }
    }
    if (locale === 'en-US') {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        } else {
            return num.toString();
        }
    }
    if (locale === 'ja-JP') {
        if (num >= 100000000) {
            return (num / 100000000).toFixed(1) + '億';
        } else if (num >= 10000) {
            return (num / 10000).toFixed(1) + '万';
        } else {
            return num.toString();
        }
    }
    return num.toString();
}

export function duration(n: number|string, type: string): string {
    if (typeof n === "string") return n;
    const num = parseFloat(type === "bangumi" ? Math.round(n / 1000).toString() : n.toString());
    const hs = Math.floor(num / 3600);
    const mins = Math.floor((num % 3600) / 60);
    const secs = Math.round(num % 60);
    const finalHs = hs > 0 ? hs.toString().padStart(2, '0') + ':' : '';
    const finalMins = mins.toString().padStart(2, '0');
    const finalSecs = secs.toString().padStart(2, '0');
    return finalHs + finalMins + ':' + finalSecs;
}

export function timestamp(ts: number, options?: { file?: boolean }): string {
    const date = new Date(ts);
    const formatter = new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });
    const formattedDate = formatter.format(date).replace(/\//g, '-');
    return options?.file ? formattedDate.replace(/:/g, '-').replace(/\s/g, '_'): formattedDate;
}

export function getFormat(type: 'filename' | 'folder', data: { title?: string, item?: MediaInfo['list'][0], upper: MediaInfo['upper'], select?: CurrentSelect, index?: number }) {
    const format = useSettingsStore().advanced[`${type}_format`];
    const quality = (k: string, v: number) => {
        return v === -1 ? -1 : i18n.global.t(`common.default.${k}.${v}`)
    }
    return format.replace(/{(\w+)}/g, (_, key) => {
        switch (key) {
            case 'title': return data.title ?? data.item?.title;
            case 'index': return data.index;
            case 'upper': return data.upper.name;
            case 'upperid': return data.upper.mid;
            case 'date_sec': return timestamp(Date.now(), { file: true });
            case 'ts_sec': return Math.floor(Date.now() / 1000);
            case 'ts_ms': return Date.now();
            case 'dms': return quality('dms', data.select?.dms ?? -1);
            case 'cdc': return quality('cdc', data.select?.cdc ?? -1);
            case 'ads': return quality('ads', data.select?.ads ?? -1);
            case 'fmt': return quality('fmt', data.select?.fmt ?? -1);
            default: return (data.item as any)?.[key] ?? -1;
        }
    }).replace(/[\\/:*?"<>|]/g, '_');
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + ' KB';
    } else if (bytes < 1024 * 1024 * 1024) {
        return (bytes / 1024 / 1024).toFixed(2) + ' MB'; 
    } else {
        return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
    }
}

export function getFileExtension(options: CurrentSelect) {
    let videoExt = 'mp4';
    let audioExt = 'aac';
    if (options.dms > 120 || options.cdc > 7) {
        videoExt = 'mkv';
    }
    if (options.ads >= 30250 && options.ads <= 30252 || options.ads === 30380) {
        videoExt = 'mkv';
    }
    if (options.ads >= 30216 && options.ads <= 30232 || options.ads === 30280 || options.ads === 30380) {
        audioExt = 'm4a';
    }
    if (options.ads === 30250) {
        audioExt = 'eac3';
    }
    if (options.ads >= 30251 && options.ads <= 30252) {
        audioExt = 'flac';
    }
    if (options.fmt === 2) {
        videoExt = 'flv';
    }
    if (options.dms === 126) {
        videoExt = 'mp4';
    }
    return options.dms >= 0 ? videoExt : audioExt;
}

export function getRandomInRange(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min);
}

export async function getImageBlob(url: string | URL) {
    const blob = await tryFetch(url, { type: 'blob' })
    return URL.createObjectURL(blob);
}