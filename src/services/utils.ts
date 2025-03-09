import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { useSettingsStore, useAppStore, useQueueStore } from "@/store";
import { TauriError, commands, events } from '@/services/backend';
import { TYPE, useToast } from "vue-toastification";
import { MediaType } from '@/types/data.d';
import { fetch } from '@tauri-apps/plugin-http';
import * as log from '@tauri-apps/plugin-log';
import * as auth from '@/services/auth';
import i18n from '@/i18n';

const t = i18n.global.t;

export class ApplicationError extends Error {
    code?: number | string;
    noStack?: boolean;
    constructor(message: string | TauriError, options?: { code?: number | string | undefined, noStack?: boolean }) {
        if (typeof (message as TauriError).message === 'string') {
            const error = message as TauriError;
            super(error.message);
            this.code = error.code ?? undefined;
        } else {
            super(message as any)
            this.code = options?.code;
        }
        this.noStack = options?.noStack;
        (Error as any).captureStackTrace(this, this.constructor);
        this.stack = this.cleanStack(this.stack);
    }
    private cleanStack(stack?: string): string {
        return stack ? stack
            .split('\n')
            .map(line => line.replace(/(https?:\/\/[^\s]+?)(\/[^)]+)(:\d+:\d+)/g, '$2$3'))
            .filter(line => line.includes('src/') && !line.includes('node_modules'))
            .join('\n') : "Unkown stack trace";
    }
    handleError() {
        const msg = this.noStack ? this.message : `${this.message} ${this.code ? `(${this.code})` : ''}\n${this.stack}`;
        AppLog(msg, TYPE.ERROR);
        return msg;
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
    events.notification.listen(async e => {
        let permissionGranted = await isPermissionGranted();

        // If not we need to request it
        if (!permissionGranted) {
            const permission = await requestPermission();
            permissionGranted = permission === 'granted';
        }

        // Once permission has been granted we can send the notification
        if (permissionGranted) {
            const info = e.payload.info;
            sendNotification({
                title: 'BiliTools',
                body: `${info.ss_title}\nDownload Complete.`
            });
        }
    });
}

export async function tryFetch(url: string | URL, options?: {
    auth?: 'wbi' | 'ultra_sign',
    params?: Record<string, string | number | Object>,
    post?: {
        type: 'json' | 'form',
        body?: Record<string, string | number | Object>
    },
    type?: 'text' | 'binary' | 'blob',
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
        } else if (options?.auth === 'ultra_sign' && options.params && options.post?.body) {
            const _params = new URLSearchParams(options.params as any);
            const ultra_sign = await auth.genReqSign(
                _params,
                options.post.body
            );
            _params.set('ultra_sign', ultra_sign);
            params += _params.toString();
        } else if (options?.params) {
            params += new URLSearchParams(rawParams).toString();
        } else params = String();
        const settings = useSettingsStore();
        const app = useAppStore();
        const fetchOptions = {
            headers: app.headers,
            ...(settings.proxyUrl && { proxy: { all: settings.proxyUrl }}),
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
            throw new ApplicationError(response.statusText, { code: response.status });
        }
        if (body.code !== 0) {
            if (body.code === -352 && body.data.v_voucher && i < (options?.times ?? 3)) {
                const csrf = new Headers(app.headers).get('Cookie')?.match(/bili_jct=([^;]+);/)?.[1] || '';
                const captchaParams = new URLSearchParams({
                    v_voucher: body.data.v_voucher, ...(csrf && { csrf })
                }).toString();
                const captchaResp = await fetch('https://api.bilibili.com/x/gaia-vgate/v1/register?' + captchaParams, {
                    headers: app.headers,
                    method: 'POST',
                    ...(settings.proxyUrl && { proxy: { all: settings.proxyUrl }}),
                });
                const captchaBody = await captchaResp.json();
                if (captchaBody.code !== 0) {
                    throw new ApplicationError(captchaBody.message, { code: captchaBody.code });
                }
                const { token, geetest: { gt = '', challenge = '' } } = captchaBody.data;
                if (!token || !gt || !challenge) {
                    throw new ApplicationError(body.message || body.msg, { code: body.code });
                }
                AppLog(t('error.risk'));
                const captcha = await auth.captcha(gt, challenge);
                const validateParams = new URLSearchParams({
                    token, ...captcha, ...(csrf && { csrf })
                }).toString();
                const validateResp = await fetch('https://api.bilibili.com/x/gaia-vgate/v1/validate?' + validateParams, {
                    headers: app.headers,
                    method: 'POST',
                    ...(settings.proxyUrl && { proxy: { all: settings.proxyUrl }}),
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
    try {
        const url = new URL(input);
        if (url.pathname) {
            let match = input.match(/BV[a-zA-Z0-9]+|av(\d+)/i);
            if (match) return { id: match[1] || match[0], type: MediaType.Video };
            match = input.match(/ep(\d+)|ss(\d+)/i);
            if (match) return { id: match[0], type: MediaType.Bangumi }; 
            match = input.match(/au(\d+)/i);
            if (match) return { id: match[0], type: MediaType.Music }; 
            match = input.match(/mc(\d+)/i);
            if (match) return { id: match[0], type: MediaType.Manga };
            if (url.hostname === 'b23.tv') {
                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new ApplicationError(response.statusText, { code: response.status });
                    }
                    if (response.url) {
                        return await parseId(response.url);
                    }
                } catch(err) {
                    throw new ApplicationError(err as string).handleError();
                }
            }
        }
        throw new ApplicationError(t('error.invalidInput'), { noStack: true });
    } catch(_) { // NOT URL
        if (!/^(av\d+$|ep\d+$|ss\d+$|au\d+$|bv(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9]{10}$)|mc\d+$/i.test(input)) {
            throw new ApplicationError(t('error.invalidInput'), { noStack: true });
        }
        const map = {
            'av': MediaType.Video,
            'bv': MediaType.Video,
            'ep': MediaType.Bangumi,
            'ss': MediaType.Bangumi,
            'au': MediaType.Music,
            'mc': MediaType.Manga
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

export function filename(options: { mediaType: string, aid: number, title: string }): string {
    return useSettingsStore().filename.replace(/{(\w+)}/g, (_, key) => {
        switch(key) {
            case 'date': return timestamp(Date.now(), { file: true });
            case 'timestamp': return Date.now().toString();
            case 'title': return options.title.replace(/[\\/:*?"<>|]/g, "_");
            default: return key in options ? String(options[key as keyof typeof options]) : "";
        }
    });
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

export function getFileExtension(options: { dms: number, ads: number, cdc: number, fmt: number }) {
    let videoExt = 'mp4';
    let audioExt = 'aac';
    if (options.dms > 120 || options.cdc > 7) {
        videoExt = 'mkv';
    }
    if (options.ads >= 30250 && options.ads <= 30252 || options.ads === 30380) {
        videoExt = 'mkv';
    }
    if (options.ads >= 30216 && options.ads <= 30232 || options.ads === 30280 || options.ads === 30380) {
        audioExt = 'aac';
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
    return options.dms >= 0 ? videoExt : audioExt;
}

export function getRandomInRange(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min);
}

export async function getImageBlob(url: string | URL) {
    const blob = await tryFetch(url, { type: 'blob' })
    return URL.createObjectURL(blob);
}