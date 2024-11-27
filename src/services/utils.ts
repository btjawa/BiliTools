import * as log from '@tauri-apps/plugin-log';
import * as auth from '@/services/auth';
import { fetch } from '@tauri-apps/plugin-http';
import iziToast from "izitoast";
import store from "@/store";
import { MediaType } from '@/types/DataTypes';

iziToast.settings({
    transitionIn: 'fadeInLeft',
    transitionOut: 'fadeOutRight',
    position: "topRight",
    backgroundColor: '#3b3b3b',
    theme: 'dark'
});

export class ApplicationError extends Error {
    code?: number | string;
    noStack?: boolean;
    constructor(message: string, options?: { code?: number | string | undefined, noStack?: boolean }) {
        super(message);
        this.code = options?.code;
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
        log.error(msg);
        iziError(msg);
        return msg;
    }
}

export function iziInfo(message: string) {
    console.log(message)
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: 2, timeout: 4000,
        title: '提示', message
    });
}

function iziError(message: string) {
    console.error(message);
    iziToast.error({
        icon: 'fa-regular fa-circle-exclamation',
        layout: 2, timeout: 10000,
        title: '警告 / 错误', message: message.replace(/\n/g, '<br>')
    });
}

export async function tryFetch(url: string, options?: { wbi?: boolean, params?: { [key: string]: string | number | object }, times?: number }) {
    let grisk_id: string = '';
    for (let i = 0; i < (options?.times ?? 3); i++) {
        const rawParams = {
            ...options?.params, 
            ...(grisk_id && { gaia_vtoken: grisk_id })
        };
        let params;
        if (options?.wbi) {
            params = '?' + await auth.wbi(rawParams);  
        } else if (options?.params) {
            params = '?' + new URLSearchParams(rawParams).toString();
        } else params = '';
        const response = await fetch(url + params, {
            headers: store.state.data.headers,
            ...(store.state.settings.proxy.addr && {
                proxy: { all: formatProxyUrl(store.state.settings.proxy) }
            })
        });
        if (!response.ok) {
            throw new ApplicationError(response.statusText, { code: response.status });
        }
        const body = await response.json();
        if (body.code !== 0) {
            if (body.code === -352 && body.data.v_voucher && i < (options?.times ?? 3)) {
                const csrf = new Headers(store.state.data.headers).get('Cookie')?.match(/bili_jct=([^;]+);/)?.[1] || '';
                console.log(csrf.slice(0, 7))
                const captchaParams = new URLSearchParams({
                    v_voucher: body.data.v_voucher, ...(csrf && { csrf })
                }).toString();
                const captchaResp = await fetch('https://api.bilibili.com/x/gaia-vgate/v1/register?' + captchaParams, {
                    headers: store.state.data.headers,
                    method: 'POST',
                    ...(store.state.settings.proxy.addr && {
                        proxy: { all: formatProxyUrl(store.state.settings.proxy) }
                    })
                });
                const captchaBody = await captchaResp.json();
                console.log(captchaBody);
                if (captchaBody.code !== 0) {
                    throw new ApplicationError(captchaBody.message, { code: captchaBody.code });
                }
                const { token, geetest: { gt = '', challenge = '' } } = captchaBody.data;
                if (!token || !gt || !challenge) {
                    throw new ApplicationError(body.message || body.msg, { code: body.code });
                }
                iziInfo('触发风控，请进行验证');
                const captcha = await auth.captcha(gt, challenge);

                const validateParams = new URLSearchParams({
                    token, ...captcha, ...(csrf && { csrf })
                }).toString();
                const validateResp = await fetch('https://api.bilibili.com/x/gaia-vgate/v1/validate?' + validateParams, {
                    headers: store.state.data.headers,
                    method: 'POST',
                    ...(store.state.settings.proxy.addr && {
                        proxy: { all: formatProxyUrl(store.state.settings.proxy) }
                    })
                });
                const validateBody = await validateResp.json();
                console.log(validateBody)
                if (validateBody.code !== 0 || !validateBody.data?.is_valid) {
                    throw new ApplicationError(validateBody.message, { code: validateBody.code });
                }
                grisk_id = validateBody.data.grisk_id;
                await new Promise(resolve => setTimeout(resolve, 250));
                continue;
            } else {
                throw new ApplicationError(body.message || body.msg, { code: body.code });
            };
        }
        return body;
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
        throw new ApplicationError("无法解析输入", { noStack: true });
    } catch(_) { // NOT URL
        if (!/^(av\d+$|ep\d+$|ss\d+$|au\d+$|bv(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9]{9}$)/i.test(input)) {
            throw new ApplicationError("无法解析输入", { noStack: true });
        }
        const map = {
            'av': MediaType.Video,
            'bv': MediaType.Video,
            'ep': MediaType.Bangumi,
            'ss': MediaType.Bangumi,
            'au': MediaType.Music
        };
        const prefix = input.slice(0, 2).toLowerCase();
        const id = prefix === 'av' || prefix === 'au' ? input.slice(2) : input;
        return { id: id, type: (map as any)[prefix] || null };
    }
}

export function debounce(fn: any, wait: number) {
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

export function stat(num: number|string): string {
    if (typeof num == "string") return num;
    if (num >= 100000000) {
        return (num / 100000000).toFixed(1) + '亿';
    } else if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    } else return num.toString();
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

export function formatEscape(str: string): string {
    return str
        .replace(/\n/g, '<br>')
        .replace(/ /g, '&nbsp;');
}

export function formatBytes(bytes: number | bigint): string {
    const KB = 1024n;
    const MB = KB * 1024n;
    const GB = MB * 1024n;
    if (bytes < MB) {
        return (Number(bytes) / Number(KB)).toFixed(2) + ' KB';
    } else if (bytes < GB) {
        return (Number(bytes) / Number(MB)).toFixed(2) + ' MB';
    } else {
        return (Number(bytes) / Number(GB)).toFixed(2) + ' GB';
    }
}

export function formatProxyUrl(proxy: { addr: string, username?: string, password?: string }): string {
    const url = new URL(proxy.addr);
    url.username = proxy.username || '';
    url.password = proxy.password || '';
    return url.toString();
}
