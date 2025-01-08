import { fetch } from "@tauri-apps/plugin-http";
import { Channel } from "@tauri-apps/api/core";
import { commands } from "@/services/backend";
import { ApplicationError, formatProxyUrl, tryFetch } from "@/services/utils";
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
        store.commit('updateState', { 'user.isLogin': false, 'data.inited': true });
        return null;
    }
    const userInfo = await tryFetch('https://api.bilibili.com/x/space/wbi/acc/info', { wbi: true, params: { mid } }) as UserTypes.UserInfoResp;
    const userStatResp = await fetch('https://api.bilibili.com/x/web-interface/nav/stat', {
        headers: store.state.data.headers,
        ...(store.state.settings.proxy.addr && {
            proxy: { all: formatProxyUrl(store.state.settings.proxy) }
        })
    });
    if (!userStatResp.ok) {
        throw new ApplicationError(userStatResp.statusText, { code: userStatResp.status });
    }
    const userStat = await userStatResp.json() as UserTypes.UserStatResp;
    if (userStat.code !== 0) {
        throw new ApplicationError(userStat.message, { code: userStat.code });
    }
    const topPhotoResp = await fetch(userInfo.data.top_photo.replace('http:', 'https:'), {
        headers: store.state.data.headers,
        ...(store.state.settings.proxy.addr && {
            proxy: { all: formatProxyUrl(store.state.settings.proxy) }
        })
    });
    if (!topPhotoResp.ok) {
        throw new ApplicationError(topPhotoResp.statusText, { code: topPhotoResp.status });
    }
    const topPhotoBase64 = btoa(new Uint8Array(await topPhotoResp.arrayBuffer()).reduce((data, byte) => data + String.fromCharCode(byte), ''));
    store.commit('updateState', { 'user': {
        avatar: userInfo.data.face, name: userInfo.data.name, desc: userInfo.data.sign,
        mid: userInfo.data.mid, level: userInfo.data.level,
        vipLabel: (userInfo.data?.vip?.label?.img_label_uri_hans_static).replace('http:', 'https:'),
        topPhoto: `data:image/jpeg;base64,${topPhotoBase64}`,
        isLogin: true,
        stat: {
            coins: userInfo.data.coins,
            following: userStat.data.following,
            follower: userStat.data.follower,
            dynamic: userStat.data.dynamic_count,
        }
    }});
}

async function getCaptchaParams() {
    const response = await fetch('https://passport.bilibili.com/x/passport-login/captcha?source=main-fe-header', {
        headers: store.state.data.headers,
        ...(store.state.settings.proxy.addr && {
            proxy: { all: formatProxyUrl(store.state.settings.proxy) }
        })
    });
    if (!response.ok) {
        throw new ApplicationError(response.statusText, { code: response.status });
    }
    const captchaBody = await response.json() as LoginTypes.GenCaptchaResp;
    if (captchaBody?.code !== 0) {
        throw new ApplicationError(captchaBody?.message, { code: captchaBody?.code });
    }
    const { token, geetest: { gt = '', challenge = '' } = {} } = captchaBody.data;
    return { token, gt, challenge };
}

export async function getCountryList() {
    const response = await fetch('https://passport.bilibili.com/web/generic/country/list', {
        headers: store.state.data.headers,
        ...(store.state.settings.proxy.addr && {
            proxy: { all: formatProxyUrl(store.state.settings.proxy) }
        })
    });
    if (!response.ok) {
        throw new ApplicationError(response.statusText, { code: response.status });
    }
    const body = await response.json() as LoginTypes.GetCountryListResp;
    if (body?.code !== 0) {
        throw new ApplicationError(t('error.countryListFailed'), { code: body?.code });
    }
    return [...body?.data?.common, ...body?.data?.others];
}

export async function getZoneCode() {
    const response = await fetch('https://api.bilibili.com/x/web-interface/zone', {
        headers: store.state.data.headers,
        ...(store.state.settings.proxy.addr && {
            proxy: { all: formatProxyUrl(store.state.settings.proxy) }
        })
    });
    if (!response.ok) {
        throw new ApplicationError(response.statusText, { code: response.status });
    }
    const body = await response.json() as LoginTypes.GetZoneResp;
    if (body?.code !== 0) {
        throw new ApplicationError(body?.message, { code: body?.code });
    }
    return body.data.country_code;
}

export async function sendSmsCode(cid: number, tel: string): Promise<string> {
    const { token, gt, challenge } = await getCaptchaParams();
    const captcha = await auth.captcha(gt, challenge);
    const params = new URLSearchParams({
        cid: cid.toString(), tel, token,
        source: 'main-fe-header', ...captcha
    }).toString();
    const response = await fetch('https://passport.bilibili.com/x/passport-login/web/sms/send?' + params, {
        headers: store.state.data.headers,
        method: 'POST',
        ...(store.state.settings.proxy.addr && {
            proxy: { all: formatProxyUrl(store.state.settings.proxy) }
        })
    });
    if (!response.ok) {
        throw new ApplicationError(response.statusText, { code: response.status });
    }
    const body = await response.json() as LoginTypes.SendSmsCodeResp;
    const captcha_key = body?.data?.captcha_key;
    if (body?.code !== 0 || !captcha_key) {
        throw new ApplicationError(body?.message, { code: body?.code });
    }
    return captcha_key;
}

export async function smsLogin(cid: number, tel: string, code: string, captcha_key: string): Promise<number> {
    try {
        const sms_login = await commands.smsLogin(cid, tel, code, captcha_key);
        if (sms_login.status === 'error') throw sms_login.status;
        return sms_login.data;
    } catch(err) {
        if (typeof err === 'string') throw err;
        const error = err as { code: number, message: string };
        throw new ApplicationError(error.message, { code: error.code });
    }
}

export async function pwdLogin(username: string, pwd: string): Promise<number> {
    const response = await fetch('https://passport.bilibili.com/x/passport-login/web/key', {
        headers: store.state.data.headers,
        ...(store.state.settings.proxy.addr && {
            proxy: { all: formatProxyUrl(store.state.settings.proxy) }
        })
    });
    if (!response.ok) {
        throw new ApplicationError(response.statusText, { code: response.status });
    }
    const key_body = await response.json() as LoginTypes.GetPwdLoginKeyResp;
    if (key_body?.code !== 0) {
        throw new ApplicationError(key_body?.message, { code: key_body?.code });
    }
    const { hash, key } = key_body.data;
    try {
        const enc = new JSEncrypt();
        enc.setPublicKey(key.replace(/\n/g, ''));
        const encoded_pwd = enc.encrypt(hash + pwd);
        const { token, gt, challenge } = await getCaptchaParams();
        const captcha = await auth.captcha(gt, challenge);
        const pwd_login = await commands.pwdLogin(username, encoded_pwd || "", token, captcha.challenge, captcha.validate, captcha.seccode);
        if (pwd_login.status === 'error') throw pwd_login.error;
        return pwd_login.data;
    } catch(err) {
        if (typeof err === 'string') throw err;
        const error = err as { code: number, message: string, tmp_code?: string };
        if (error.code === 2 || error.tmp_code) {
            throw error;
        }
        throw new ApplicationError(error.message, { code: error.code });
    }
}

export async function verifyTelSendSmsCode(tmp_code: string): Promise<string> {
    const captcha_resp = await fetch('https://passport.bilibili.com/x/safecenter/captcha/pre', {
        headers: store.state.data.headers,
        method: 'POST',
        ...(store.state.settings.proxy.addr && {
            proxy: { all: formatProxyUrl(store.state.settings.proxy) }
        })
    });
    if (!captcha_resp.ok) {
        throw new ApplicationError(captcha_resp.statusText, { code: captcha_resp.status });
    }
    const captcha_body = await captcha_resp.json() as LoginTypes.VerifyTelCaptchaResp;
    if (captcha_body?.code !== 0) {
        throw new ApplicationError(captcha_body?.message, { code: captcha_body?.code });
    }
    const { recaptcha_token, gee_gt, gee_challenge } = captcha_body.data;

    const { validate: gee_validate, seccode: gee_seccode } = await auth.captcha(gee_gt, gee_challenge);
    const send_code_params = new URLSearchParams({
        tmp_code, sms_type: "loginTelCheck",
        recaptcha_token, gee_challenge, gee_validate, gee_seccode
    }).toString();
    const send_code_resp = await fetch('https://passport.bilibili.com/x/safecenter/common/sms/send?' + send_code_params, {
        headers: store.state.data.headers,
        method: 'POST',
        ...(store.state.settings.proxy.addr && {
            proxy: { all: formatProxyUrl(store.state.settings.proxy) }
        })
    });
    if (!send_code_resp.ok) {
        throw new ApplicationError(send_code_resp.statusText, { code: send_code_resp.status });
    }
    const send_code_body = await send_code_resp.json() as LoginTypes.VerifyTelSendSmsCodeResp;
    if (send_code_body?.code !== 0) {
        throw new ApplicationError(send_code_body?.message, { code: send_code_body?.code });
    }
    return send_code_body.data.captcha_key;
}

export async function verifyTel(tmp_code: string, captcha_key: string, code: string, request_id: string): Promise<number> {
    const verify_tel_params = new URLSearchParams({
        tmp_code, sms_type: "loginTelCheck",
        captcha_key, code, request_id, source: "risk"
    }).toString();
    const response = await fetch('https://passport.bilibili.com/x/safecenter/login/tel/verify?' + verify_tel_params, {
        headers: store.state.data.headers,
        method: 'POST',
        ...(store.state.settings.proxy.addr && {
            proxy: { all: formatProxyUrl(store.state.settings.proxy) }
        })
    });
    if (!response.ok) {
        throw new ApplicationError(response.statusText, { code: response.status });
    }
    const verify_tel_body = await response.json() as LoginTypes.VerifyTelResp;
    if (verify_tel_body?.code !== 0) {
        throw new ApplicationError(verify_tel_body?.message, { code: verify_tel_body?.code });
    }
    const switch_code = verify_tel_body.data.code;
    try {
        const switch_cookie = await commands.switchCookie(switch_code);
        if (switch_cookie.status === 'error') throw switch_cookie.status;
        return switch_cookie.data;
    } catch(err) {
        if (typeof err === 'string') throw err;
        const error = err as { code: number, message: string };
        throw new ApplicationError(error.message, { code: error.code });
    }
}

export async function genQrcode(canvas: HTMLCanvasElement): Promise<string> {
    const response = await fetch('https://passport.bilibili.com/x/passport-login/web/qrcode/generate', {
        headers: store.state.data.headers,
        ...(store.state.settings.proxy.addr && {
            proxy: { all: formatProxyUrl(store.state.settings.proxy) }
        })
    });
    if (!response.ok) {
        throw new ApplicationError(response.statusText, { code: response.status });
    }
    const body = await response.json() as LoginTypes.GenQrcodeResp;
    if (body?.code !== 0) {
        throw new ApplicationError(body?.message, { code: body?.code });
    }
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
    try {
        const event = new Channel<number>();
        event.onmessage = (code) => {
            onEvent({ code });
        }
        const scan_login = await commands.scanLogin(qrcode_key, event);
        if (scan_login.status === 'error') throw scan_login.error;
        return scan_login.data;
    } catch(err) {
        if (typeof err === 'string') throw err;
        const error = err as { code: number, message: string };
        throw new ApplicationError(error.message, { code: error.code });
    }
}

export async function exitLogin(): Promise<number> {
    try {
        const exit = await commands.exit();
        if (exit.status === 'error') throw exit.error;
        return exit.data;
    } catch(err) {
        if (typeof err === 'string') throw err;
        const error = err as { code: number, message: string };
        throw new ApplicationError(error.message, { code: error.code });
    }
}

export async function checkRefresh(): Promise<number> {
    const cookie_info_resp = await fetch('https://passport.bilibili.com/x/passport-login/web/cookie/info', {
        headers: store.state.data.headers,
        ...(store.state.settings.proxy.addr && {
            proxy: { all: formatProxyUrl(store.state.settings.proxy) }
        })
    });
    if (!cookie_info_resp.ok) {
        throw new ApplicationError(cookie_info_resp.statusText, { code: cookie_info_resp.status });
    }
    const cookie_info_body = await cookie_info_resp.json() as LoginTypes.CookieInfoResp;
    console.log('Refresh status', cookie_info_body)
    if (cookie_info_body?.code !== 0) {
        throw new ApplicationError(
            cookie_info_body?.message + (cookie_info_body?.code === -101 ? ' / ' + t('error.loginExpired') : ''),
            { code: cookie_info_body?.code });
    }
    if (!cookie_info_body.data.refresh) return 0;
    const correspondPath = await auth.correspondPath(cookie_info_body.data.timestamp);
    const refresh_csrf_resp = await fetch('https://www.bilibili.com/correspond/1/' + correspondPath, {
        headers: store.state.data.headers,
        ...(store.state.settings.proxy.addr && {
            proxy: { all: formatProxyUrl(store.state.settings.proxy) }
        })
    });
    if (!refresh_csrf_resp.ok) {
        throw new ApplicationError(refresh_csrf_resp.statusText, { code: refresh_csrf_resp.status });
    }
    const refresh_csrf_body = await refresh_csrf_resp.text();
    if (refresh_csrf_resp.status !== 200) {
        throw new ApplicationError("Failed to fetch refresh_csrf response", { code: refresh_csrf_resp.status });
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(refresh_csrf_body, 'text/html');
    const refresh_csrf = doc.getElementById('1-name')?.textContent?.trim();
    if (!refresh_csrf) {
        throw "Failed to get refresh_csrf";
    }
    console.log('Got refresh_csrf', refresh_csrf?.slice(0, 7))
    try {
        const refresh_cookie = await commands.refreshCookie(refresh_csrf);
        if (refresh_cookie.status === 'error') throw refresh_cookie.error;
        return refresh_cookie.data;
    } catch(err) {
        if (typeof err === 'string') throw err;
        const error = err as { code: number, message: string };
        throw new ApplicationError(error.message, { code: error.code });
    }
}