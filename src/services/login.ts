import { ApplicationError, tryFetch, getImageBlob } from "@/services/utils";
import { Channel } from "@tauri-apps/api/core";
import { commands } from "@/services/backend";
import store from "@/store";
import qrcode from "qrcode-generator";
import JSEncrypt from "jsencrypt";
import i18n from "@/i18n";
import * as LoginTypes from "@/types/login";
import * as UserTypes from "@/types/user";
import * as auth from "@/services/auth";

const t = i18n.global.t;

export async function fetchUser() {
    const mid = store.state.data.headers.Cookie.match(/DedeUserID=(\d+)(?=;|$)/)?.[1];
    if (!mid) {
        store.state.user.isLogin = false;
        return;
    }
    const userInfo = await tryFetch('https://api.bilibili.com/x/space/wbi/acc/info', {
        auth: 'wbi', params: { mid }
    }) as UserTypes.UserInfoResp;
    const userStat = await tryFetch('https://api.bilibili.com/x/web-interface/nav/stat') as UserTypes.UserStatResp;
    store.state.user = {
        avatar: await getImageBlob(userInfo.data.face.replace('http:', 'https:') + '@100w_100h'),
        name: userInfo.data.name, desc: userInfo.data.sign,
        mid: userInfo.data.mid, level: userInfo.data.level,
        vipLabel: await getImageBlob(userInfo.data?.vip?.label?.img_label_uri_hans_static.replace('http:', 'https:')),
        topPhoto: await getImageBlob(userInfo.data.top_photo.replace('http:', 'https:') + '@170h'),
        isLogin: true,
        stat: {
            coins: userInfo.data.coins,
            following: userStat.data.following,
            follower: userStat.data.follower,
            dynamic: userStat.data.dynamic_count,
        }
    };
}

export async function activateCookies() {
    const _uuid = store.state.data.headers.Cookie.match(/_uuid=([A-F0-9-]+infoc)(?=;|$)/i)?.[1];
    if (!_uuid) return;
    const payload = auth.getFingerPrint(_uuid);
    console.log(payload)
    await tryFetch('https://api.bilibili.com/x/internal/gaia-gateway/ExClimbWuzhi', {
        post: { type: 'json', body: { payload: JSON.stringify(payload) } }
    })
};

async function getCaptchaParams() {
    const body = await tryFetch('https://passport.bilibili.com/x/passport-login/captcha', {
        params: { source: 'main-fe-header' }
    }) as LoginTypes.GenCaptchaResp;
    const { token, geetest: { gt = '', challenge = '' } = {} } = body.data;
    return { token, gt, challenge };
}

export async function getCountryList() {
    const body = await tryFetch('https://passport.bilibili.com/web/generic/country/list') as LoginTypes.GetCountryListResp;
    return [...body?.data?.common, ...body?.data?.others];
}

export async function getZoneCode() {
    const body = await tryFetch('https://api.bilibili.com/x/web-interface/zone') as LoginTypes.GetZoneResp;
    return body.data.country_code;
}

export async function sendSmsCode(cid: number, tel: string): Promise<string> {
    const { token, gt, challenge } = await getCaptchaParams();
    const captcha = await auth.captcha(gt, challenge);
    const body = await tryFetch('https://passport.bilibili.com/x/passport-login/web/sms/send', {
        post: { type: 'form' }, params: {
            cid: cid.toString(), tel, token,
            source: 'main-fe-header', ...captcha
        }
    }) as LoginTypes.SendSmsCodeResp;
    return body?.data?.captcha_key;
}

export async function smsLogin(cid: number, tel: string, code: string, captcha_key: string): Promise<number> {
    const result = await commands.smsLogin(cid, tel, code, captcha_key);
    if (result.status === 'error') throw new ApplicationError(result.error);
    return result.data;
}

export async function pwdLogin(username: string, pwd: string): Promise<number> {
    const { token, gt, challenge } = await getCaptchaParams();
    const body = await tryFetch('https://passport.bilibili.com/x/passport-login/web/key') as LoginTypes.GetPwdLoginKeyResp;
    const { hash, key } = body.data;
    const enc = new JSEncrypt();
    enc.setPublicKey(key);
    const encoded_pwd = enc.encrypt(hash + pwd) || "";
    const captcha = await auth.captcha(gt, challenge);
    const result = await commands.pwdLogin(username, encoded_pwd, token, captcha.challenge, captcha.validate, captcha.seccode);
    if (result.status === 'error') throw new ApplicationError(result.error);
    return result.data;
}

export async function genQrcode(canvas: HTMLCanvasElement): Promise<string> {
    const body = await tryFetch('https://passport.bilibili.com/x/passport-login/web/qrcode/generate') as LoginTypes.GenQrcodeResp;
    const options = {
        text: body.data.url,
        width: 160,
        height: 160,
        background: "#fff",
        foreground: "#000"
    };
    const qr = qrcode(0, 'Q');
    qr.addData(body.data.url);
    qr.make();
    canvas.width = options.width;
    canvas.height = options.height;
    let context = canvas.getContext('2d') as CanvasRenderingContext2D;
    let moduleSize = options.width / qr.getModuleCount();
    let moduleHeight = options.height / qr.getModuleCount();
    for (var row = 0; row < qr.getModuleCount(); row++) {
        for (var col = 0; col < qr.getModuleCount(); col++) {
            context.fillStyle = qr.isDark(row, col) ? options.foreground : options.background;
            var width = Math.ceil((col + 1) * moduleSize) - Math.floor(col * moduleSize);
            var height = Math.ceil((row + 1) * moduleSize) - Math.floor(row * moduleSize);
            context.fillRect(Math.round(col * moduleSize), Math.round(row * moduleHeight), width, height);
        }
    }
    return body.data.qrcode_key;
}

export async function scanLogin(qrcode_key: string, onEvent: (event: { code: number }) => void): Promise<number> {
    const event = new Channel<number>();
    event.onmessage = (code) => {
        onEvent({ code });
    }
    const result = await commands.scanLogin(qrcode_key, event);
    if (result.status === 'error') throw new ApplicationError(result.error);
    return result.data;
}

export async function exitLogin(): Promise<number> {
    const result = await commands.exit();
    if (result.status === 'error') throw new ApplicationError(result.error);
    return result.data;
}

export async function checkRefresh(): Promise<number> {
    const cookie_info_body = await tryFetch('https://passport.bilibili.com/x/passport-login/web/cookie/info', {
        handleError: false
    }) as LoginTypes.CookieInfoResp;
    console.log('Refresh status', cookie_info_body)
    if (cookie_info_body?.code !== 0) {
        throw new ApplicationError(
            cookie_info_body?.message + (cookie_info_body?.code === -101 ? ' / ' + t('error.loginExpired') : ''),
            { code: cookie_info_body?.code });
    }
    if (!cookie_info_body.data.refresh) return 0;
    const correspondPath = await auth.correspondPath(cookie_info_body.data.timestamp);
    const refresh_csrf_body = await tryFetch('https://www.bilibili.com/correspond/1/' + correspondPath, { type: 'text' });
    const parser = new DOMParser();
    const doc = parser.parseFromString(refresh_csrf_body, 'text/html');
    const refresh_csrf = doc.getElementById('1-name')?.textContent?.trim();
    if (!refresh_csrf) {
        throw "Failed to get refresh_csrf";
    }
    console.log('Got refresh_csrf', refresh_csrf?.slice(0, 7))
    const result = await commands.refreshCookie(refresh_csrf);
    if (result.status === 'error') throw new ApplicationError(result.error);
    return result.data;
}