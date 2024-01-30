import { invoke } from '@tauri-apps/api/tauri';
import { emit } from '@tauri-apps/api/event';
import { http } from '@tauri-apps/api';

import $ from "jquery";
import QRCode from "qrcode";
import md5 from "md5";
import { JSEncrypt } from "jsencrypt";
import * as data from "./data.ts";

export const login = {
    scanLogin: async function(box: JQuery<HTMLElement>) {
        emit('stop_login');
        box.empty();
        $('.login-scan-loading').addClass('active');
        const response = (await http.fetch('https://passport.bilibili.com/x/passport-login/web/qrcode/generate',
        { method: "GET", headers: data.headers })).data as data.GeneralResponse<any>;
        $('.login-scan-loading').removeClass('active');
        const { qrcode_key, url } = response.data;
        QRCode.toCanvas(box[0], url, {
            width: 180, margin: 0, errorCorrectionLevel: 'H',
            color: {
                dark: "#c4c4c4",
                light: "#3b3b3b9b"
            }
        });
        box.removeAttr("title");
        try { await invoke('scan_login', {qrcodeKey: qrcode_key}); }
        catch(err) { emit("error", err) }
    },
    pwdLogin: async function(username: string, password: string) {
        const rsaKeys = (await http.fetch('https://passport.bilibili.com/x/passport-login/web/key',
        { method: "GET", headers: data.headers })).data as data.GeneralResponse<any>;
        const { hash, key } = rsaKeys.data;
        const enc = new JSEncrypt();
        enc.setPublicKey(key);
        const encedPwd = enc.encrypt(hash + password);
        const {token, challenge, validate, seccode} = await verify.captcha() as data.CaptchaResponse;
        return (await invoke('pwd_login', { username, password: encedPwd, token, challenge, validate, seccode }));
    },
    codeList: async function() {
        const prefix = ((await http.fetch('https://api.bilibili.com/x/web-interface/zone',
        { method: "GET", headers: data.headers })).data as data.GeneralResponse<any>).data.country_code || 86;
        const areaCodes = (await http.fetch('https://passport.bilibili.com/web/generic/country/list',
        { method: "GET", headers: data.headers })).data as data.GeneralResponse<any>;
        const allCodes = [...areaCodes.data.common, ...areaCodes.data.others];
        allCodes.sort((a, b) => a.id - b.id);
        const codeList = $('.login-sms-area-code-list');
        allCodes.forEach(code => {
            const codeElement = $('<div>').addClass('login-sms-item-code-item')
                .html(`<span style="float:left">${code.cname}</span>
                <span style="float:right">+${code.country_id}</span>`);
            codeList.append(codeElement);
            codeElement.on('click', () => {
                $('.login-sms-item-code-item').removeClass('checked');
                codeElement.addClass('checked');
                codeList.prev().find('.login-sms-item-text').html(codeElement.find('span').last().text()
                + '&nbsp;<i class="fa-solid fa-chevron-down"></i>');
                codeList.removeClass('active');
            });
            if (code.country_id == prefix) codeElement.click();
        });
        codeList.prev().find('.login-sms-item-text').on('click', (e) => {
            codeList.addClass('active');
            e.stopPropagation();
        });
        $(document).off('click').on('click', (e) => {
            if (!$(e.target).closest(".login-sms-area-code-list").length) codeList.removeClass('active');
        });
    },
    sendSms: async function(tel: string, cid: string) {
        const {token, challenge, validate, seccode} = await verify.captcha() as data.CaptchaResponse;
        const params = new URLSearchParams({
            cid, tel, source: 'main-fe-header',
            token, challenge, validate, seccode
        });
        const response = (await http.fetch(`https://passport.bilibili.com/x/passport-login/web/sms/send?${params.toString()}`,
        { method: "POST", headers: data.headers })).data as data.GeneralResponse<any>;
        return response;
    }
}

declare function initGeetest(params: any, callback: (captchaObj: any) => void): void;

export const verify = {
    wbi: async function(params: any) {
        const mixinKeyEncTab = [
            46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
            33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
            61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
            36, 20, 34, 44, 52
        ];
        const getMixinKey = (orig: String) => {
            return mixinKeyEncTab.map(n => orig[n]).join('').slice(0, 32);
        };
        const res = (await http.fetch('https://api.bilibili.com/x/web-interface/nav',
        { method: "GET", headers: data.headers })).data as data.GeneralResponse<any>;
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
    },
    uuid: function() {
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
    },
    bili_ticket: async function() {
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
        return (await http.fetch(`https://api.bilibili.com/bapis/bilibili.api.ticket.v1.Ticket/GenWebTicket?${params.toString()}`,
        { method: "POST" })).data as data.GeneralResponse<any>;
    },
    appSign: function(params: any, key: keyof data.AppPlatforms) {
        const platform = data.app[key];
        params.appkey = platform.appkey;
        const searchParams = new URLSearchParams(params);
        searchParams.sort();
        const sign = md5(searchParams.toString() + platform.appsec);
        return searchParams.toString() + '&sign=' + sign;
    },
    captcha: async function() {
        return new Promise(async resolve => {
            const response = (await http.fetch('https://passport.bilibili.com/x/passport-login/captcha?source=main-fe-header',
            { method: "GET", headers: data.headers })).data as data.GeneralResponse<any>;
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
                    return resolve({token, challenge, validate, seccode} as data.CaptchaResponse);
                })
            });
        })
    },
    correspondPath: async function(timestamp: number) {
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
    },
    checkRefresh: async function() {
        const response = (await http.fetch('https://passport.bilibili.com/x/passport-login/web/cookie/info',
        { method: "GET", headers: data.headers })).data as data.GeneralResponse<any>;
        const { refresh, timestamp } = response.data;
        if (refresh) {
            const path = await verify.correspondPath(timestamp);
            const csrfHtml = (await http.fetch(`https://www.bilibili.com/correspond/1/${path}`,
            { method: "GET", headers: data.headers, responseType: http.ResponseType.Text })).data as string;
            const parser = new DOMParser();
            const doc = parser.parseFromString(csrfHtml, 'text/html');
            const refreshCsrf = (doc.evaluate('//div[@id="1-name"]/text()', doc, null, XPathResult.STRING_TYPE, null)).stringValue;
            invoke("refresh_cookie", { refreshCsrf });
        } else return refresh;
    }
}