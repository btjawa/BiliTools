import * as http from "../scripts/http";
import { invoke } from "@tauri-apps/api/core";
import store from "../store/index";
import * as LoginTypes from "../types/Login.type";
import { NavInfoResp } from "../types/UserInfo.type";
import md5 from "md5";
import { iziError } from "./utils";

interface AppPlatforms {
    android_1: { appkey: string; appsec: string; };
    ios_1: { appkey: string; appsec: string; };
}

export const appPlatforms: AppPlatforms = {
    android_1: {
        appkey: "1d8b6e7d45233436",
        appsec: "560c52ccd288fed045859ed18bffd973"
    },
    ios_1: {
        appkey: "4ebafd7c4951b366",
        appsec: "8cb98205e9b2ad3669aad0fce12a4c13"
    }
}

export function id(input: string): { id: string, type: string | null } {
    let match = input.match(/BV[a-zA-Z0-9]+|av(\d+)/i);
    if (match) return { id: match[0], type: "video" };
    match = input.match(/ep(\d+)|ss(\d+)/i);
    if (match) return { id: match[0], type: "bangumi" }; 
    match = input.match(/au(\d+)/i);
    if (match) return { id: match[0], type: "audio" }; 
    else if (!input || !input.match(/a-zA-Z0-9/g) || true) {
        iziError(!input ? "输入不能为空" : "输入不合法！请检查格式");
        return { id: input, type: null };
    }
}

declare function initGeetest(params: any, callback: (captchaObj: any) => void): void;

export async function wbi(params: any) {
    const mixinKeyEncTab = [
        46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
        33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
        61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
        36, 20, 34, 44, 52
    ];
    const getMixinKey = (orig: String) => {
        return mixinKeyEncTab.map(n => orig[n]).join('').slice(0, 32);
    };
    const res = await (await http.fetch('https://api.bilibili.com/x/web-interface/nav', { headers: store.state.headers })).json() as NavInfoResp;
    const { img_url, sub_url } = res.data.wbi_img;
    const imgKey = img_url.slice(img_url.lastIndexOf('/') + 1, img_url.lastIndexOf('.'));
    const subKey = sub_url.slice(sub_url.lastIndexOf('/') + 1, sub_url.lastIndexOf('.'));
    const mixinKey = getMixinKey(imgKey + subKey);
    const currTime = Math.round(Date.now() / 1000);
    const chrFilter = /[!'()*]/g;
    Object.assign(params, { wts: currTime });
    const query = Object.keys(params).sort().map(key => {
        const value = params[key].toString().replace(chrFilter, '');
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    }).join('&');
    const wbiSign = md5(query + mixinKey);
    return query + '&w_rid=' + wbiSign;
}

export function uuid() {
    function a(e: number) {
        let t = "";
        for (let r = 0; r < e; r++) {
            t += o(Math.random() * 16);
        }
        return s(t, e);
    }
    function s(e: string, t: number) {
        let r = "";
        if (e.length < t) {
            for (let n = 0; n < t - e.length; n++) {
                r += "0";
            }
        }
        return r + e;
    }
    function o(e: number) { return Math.ceil(e).toString(16).toUpperCase(); }
    let e = a(8);
    let t = a(4);
    let r = a(4);
    let n = a(4);
    let i = a(12);
    let currentTime = (new Date()).getTime();
    return e + "-" + t + "-" + r + "-" + n + "-" + i + s((currentTime % 100000).toString(), 5) + "infoc";    
}

export async function bili_ticket() {
    const key = "XgwSnGZ1p";
    const message = "ts" + Math.floor(Date.now() / 1000);
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(key);
    const messageBytes = encoder.encode(message);
    const cryptoKey = await crypto.subtle.importKey(
        "raw", keyBytes, 
        { name: "HMAC", hash: "SHA-256" }, 
        false, ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageBytes);
    const hexSignature =  Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
    const params = new URLSearchParams({
        key_id: "ec02",
        hexsign: hexSignature,
        "context[ts]": Math.floor(Date.now() / 1000).toString(),
        csrf: ""
    });    
    return await (await http.fetch(`https://api.bilibili.com/bapis/bilibili.api.ticket.v1.Ticket/GenWebTicket?${params.toString()}`,
    { method: "POST" })).json() as LoginTypes.GenWebTicketResp;
}

export function appSign(params: any, key: keyof AppPlatforms) {
    const platform = appPlatforms[key];
    params.appkey = platform.appkey;
    const searchParams = new URLSearchParams(params);
    searchParams.sort();
    const sign = md5(searchParams.toString() + platform.appsec);
    return searchParams.toString() + '&sign=' + sign;
}

export async function captcha() {
    return new Promise(async resolve => {
        const response = await (await http.fetch('https://passport.bilibili.com/x/passport-login/captcha?source=main-fe-header',
        { method: "GET", headers: store.state.headers })).json() as LoginTypes.GenCaptchaResp
        const { token, geetest: { challenge, gt } } = response.data;
        // 更多前端接口说明请参见：http://docs.geetest.com/install/client/web-front/
        await initGeetest({
            gt: gt,
            challenge: challenge,
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
                return resolve({token, challenge, validate, seccode} as LoginTypes.VerifiedCaptchaResp);
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
    )
    const data = new TextEncoder().encode(`refresh_${timestamp}`);
    const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, data))
    return encrypted.reduce((str, c) => str + c.toString(16).padStart(2, "0"), "")
}

export async function checkRefresh() {
    const response = await (await http.fetch('https://passport.bilibili.com/x/passport-login/web/cookie/info',
    { method: "GET", headers: store.state.headers })).json() as LoginTypes.CookieInfoResp;
    const { refresh, timestamp } = response.data;
    if (refresh) {
        const path = await correspondPath(timestamp);
        const csrfHtml = await (await http.fetch(`https://www.bilibili.com/correspond/1/${path}`,
        { method: "GET", headers: store.state.headers })).text() as string;
        const parser = new DOMParser();
        const doc = parser.parseFromString(csrfHtml, 'text/html');
        const refreshCsrf = (doc.evaluate('//div[@id="1-name"]/text()', doc, null, XPathResult.STRING_TYPE, null)).stringValue;
        invoke("refresh_cookie", { refreshCsrf });
    } else return refresh;
}
