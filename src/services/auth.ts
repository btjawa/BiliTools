import { fetch } from '@tauri-apps/plugin-http';
import store from "@/store";
import * as user from "@/types/user";
import * as login from "@/types/login";
import { ApplicationError, formatProxyUrl } from "./utils";
import md5 from "md5";

declare function initGeetest(params: any, callback: (captchaObj: any) => void): Promise<void>;

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
    return new Promise(async (resolve) => {
        // 更多前端接口说明请参见：http://docs.geetest.com/install/client/web-front/
        await initGeetest({
            gt,
            challenge,
            offline: false,
            new_captcha: true,
            product: "bind",
            width: "300px",
            https: true
        }, function (captchaObj) {
            captchaObj.onReady(function () {
                captchaObj.verify();
            }).onSuccess(function () {
                const result = captchaObj.getValidate();
                const validate = result.geetest_validate;
                const seccode = result.geetest_seccode;
                return resolve({ challenge, validate, seccode });
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