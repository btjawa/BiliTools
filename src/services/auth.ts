import { ApplicationError, formatProxyUrl } from "@/services/utils";
import { GeetestOptions, initGeetest } from '@/lib/geetest';
import { fetch } from '@tauri-apps/plugin-http';
import { Go } from "@/lib/wasm_exec";
import * as login from "@/types/login";
import * as user from "@/types/user";
import store from "@/store";
import md5 from "md5";

function getWebGLFingerPrint() {
    let dm_img_str = "bm8gd2ViZ2", dm_cover_img_str = "bm8gd2ViZ2wgZXh0ZW5zaW";
    const gl = document.createElement("canvas").getContext("webgl");
    if (gl) {
        const version = gl.getParameter(gl.VERSION);
        dm_img_str = version ? btoa(version).slice(0, -2) : dm_img_str;
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
            if (renderer && vendor) {
                dm_cover_img_str = btoa(renderer + vendor).slice(0, -2);
            }
        }
    }
    return { dm_img_str, dm_cover_img_str };
}

export async function wbi(params: { [key: string]: string | number | object }) {
    const mixinKeyEncTab = [
        46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
        33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
        61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
        36, 20, 34, 44, 52
    ];
    const response = await fetch('https://api.bilibili.com/x/web-interface/nav', {
        headers: store.state.data.headers,
        ...(store.state.settings.proxy.addr && {
            proxy: { all: formatProxyUrl(store.state.settings.proxy) }
        })
    });
    if (!response.ok) {
        throw new ApplicationError(response.statusText, { code: response.status });
    }
    const body = await response.json() as user.NavInfoResp;
    if (body?.code !== 0) {
        throw new ApplicationError(body?.message, { code: body?.code });
    }
    const { img_url, sub_url } = body.data.wbi_img;
    const imgKey = img_url.slice(img_url.lastIndexOf('/') + 1, img_url.lastIndexOf('.'));
    const subKey = sub_url.slice(sub_url.lastIndexOf('/') + 1, sub_url.lastIndexOf('.'));
    const mixinKey = mixinKeyEncTab.map(n => (imgKey + subKey)[n]).join('').slice(0, 32),
        curr_time = Math.round(Date.now() / 1000),
        chr_filter = /[!'()*]/g;
    const { dm_img_str, dm_cover_img_str } = getWebGLFingerPrint();
    Object.assign(params, { wts: curr_time, dm_img_str, dm_cover_img_str, dm_img_list: '[]' });
    const query = Object.keys(params).sort().map((key) => {
        const value = params[key].toString().replace(chr_filter, '');
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    }).join('&');
    const wbiSign = md5(query + mixinKey);
    return query + '&w_rid=' + wbiSign;
}

export async function captcha(gt: string, challenge: string): Promise<login.Captcha> {
    const settings_lang = store.state.settings.language;
    return new Promise(async (resolve, reject) => {
        initGeetest({
            gt,
            challenge,
            offline: false,
            new_captcha: true,
            product: "bind",
            width: "300px",
            lang: (() => { if (settings_lang.startsWith('zh')) {
                return settings_lang;
            } else {
                return settings_lang.slice(0, 2);
            }})() as GeetestOptions['lang'],
            https: true,
        }, function (captchaObj) {
            captchaObj.onReady(function () {
                captchaObj.verify();
            }).onSuccess(function () {
                const result = captchaObj.getValidate();
                const validate = result.geetest_validate;
                const seccode = result.geetest_seccode;
                return resolve({ challenge, validate, seccode });
            }).onError(function (err) {
                return reject(new ApplicationError(err.msg, { code: err.error_code }));
            })
        });
    })
}

export async function correspondPath(timestamp: number) {
    const publicKey = await crypto.subtle.importKey(
        "jwk", {
            kty: "RSA",
            n: "y4HdjgJHBlbaBN04VERG4qNBIFHP6a3GozCl75AihQloSWCXC5HDNgyinEnhaQ_4-gaMud_GF50elYXLlCToR9se9Z8z433U3KjM-3Yx7ptKkmQNAMggQwAVKgq3zYAoidNEWuxpkY_mAitTSRLnsJW-NCTa0bqBFF6Wm1MxgfE",
            e: "AQAB",
        }, { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt"],
    );
    const data = new TextEncoder().encode(`refresh_${timestamp}`);
    const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, data))
    return encrypted.reduce((str, c) => str + c.toString(16).padStart(2, "0"), "")
}

export async function getM1AndKey() {
    const keyPair = await crypto.subtle.generateKey({
        name: 'ECDH',
        namedCurve: 'P-256'
    }, true, ['deriveKey', 'deriveBits']);
    const raw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
    const jwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    const jwkString = JSON.stringify(jwk);
    return { m1: btoa(jwkString), key: btoa(String.fromCharCode.apply(null, new Uint8Array(raw) as any)) };
}

export async function genReqSign(query: string | URLSearchParams, params: { [key: string]: string | number | object }) {
    if (!store.state.data.goInstance) {
        const go = new Go();
        const url = new URL('@/lib/manga.wasm', import.meta.url).href;
        const wasm = await globalThis.fetch(url);
        const buffer = await wasm.arrayBuffer();
        const result = await WebAssembly.compile(buffer);
        const instance = await WebAssembly.instantiate(result, go.importObject);    
        go.run(instance);
        store.state.data.goInstance = instance;
    }
    const genReqSign = (globalThis as any).genReqSign as (query: string, params: string, timestamp: number) => {
        error?: string;
        sign?: string
    };
    if (!genReqSign) {
        throw new ApplicationError("Failed to load WASM module");
    }
    const result = genReqSign(
        query.toString(),
        JSON.stringify(params),
        Date.now()
    );
    if (result.error) {
        throw new ApplicationError(result.error);
    }
    console.log(result)
    return result.sign;
}

export function getDecryptedDataIndex(binary: Uint8Array, epid: number, mcid: number) {
    const BILICOMIC = [...'BILICOMIC'].map(char => char.charCodeAt(0));
    if (binary.subarray(0, 9).every((v, i) => v === BILICOMIC[i])) {
        const data = binary.subarray(9);
        const key = new Uint8Array([
            ...new Uint8Array(new Uint32Array([epid]).buffer),
            ...new Uint8Array(new Uint32Array([mcid]).buffer)
        ]);
        const decrypted = data.map((byte, i) => byte ^ key[i % 8]);
        if (decrypted[0] === 0x50 && decrypted[1] === 0x4B) {
            return decrypted.buffer;
        }
    }
    throw new ApplicationError("Invalid data index file");
}