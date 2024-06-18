import { fetch } from '@tauri-apps/plugin-http';
import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';

import { JSEncrypt } from "jsencrypt";
import store from '@/store';
import * as LoginTypes from '@/types/LoginTypes';
import * as verify from "@/services/auth";
import qrcode from 'qrcode-generator';

let smsKey: string;

function createQrcode(canvas: HTMLCanvasElement, url: string) { // from bilibili
    const options = {
        text: url,
        width: 165,
        height: 165,
        background: "rgb(24, 24, 24)",
        foreground: "rgb(233, 233, 233)"
    };
    const qr = qrcode(0, 'Q');
    qr.addData(url);
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
}

export async function scanLogin(canvas: HTMLCanvasElement) {
    emit('stop_login');
    canvas.width = canvas.width; // clear canvas
    const resp = await fetch('https://passport.bilibili.com/x/passport-login/web/qrcode/generate', {
        headers: store.state.data.headers
    });
    const response = await resp.json() as LoginTypes.GenQrcodeResp;
    if (response.code !== 0) {
        throw new Error(`${response.code}, ${response.message}`);
    }
    const { qrcode_key, url } = response.data;
    createQrcode(canvas, url);
    const mid = await invoke('scan_login', { qrcode_key }) as number
    return mid;
}

export async function pwdLogin(username: string, rawPwd: string) {
    const rsaKeysResp = await fetch('https://passport.bilibili.com/x/passport-login/web/key', {
        headers: store.state.data.headers
    });
    const rsaKeys = await rsaKeysResp.json() as LoginTypes.GetPwdLoginKeyResp;
    if (rsaKeys.code !== 0) {
        throw new Error(`${rsaKeys.code}, ${rsaKeys.message}`);
    }
    const { hash, key } = rsaKeys.data;
    const enc = new JSEncrypt();
    enc.setPublicKey(key);
    const password = enc.encrypt(hash + rawPwd);
    const {token, challenge, validate, seccode} = await verify.captcha() as LoginTypes.Captcha;
    const mid = await invoke('pwd_login', { username, password, token, challenge, validate, seccode }) as number;
    return mid;
}

export async function smsLogin(tel: string, code: string, cid: string) {
    if (!smsKey) {
        throw new Error('验证码已过期');
    }
    const mid = await invoke('sms_login', { tel, code, key: smsKey, cid }) as number;
    return mid;
}

export async function getCountryList() {
    const resp = await fetch('https://passport.bilibili.com/web/generic/country/list', {
        headers: store.state.data.headers
    });
    const response = await resp.json() as LoginTypes.GetCountryListResp;
    if (response.code !== 0) {
        throw new Error(`${response.code.toString()}`);
    }
    const list = [...response.data.common, ...response.data.others].sort((a, b) => a.id - b.id);
    return list;
}

export async function getZoneCode() {
    const resp = await fetch('https://api.bilibili.com/x/web-interface/zone', {
        headers: store.state.data.headers
    });
    const response = await resp.json() as LoginTypes.GetZoneResp;
    if (response.code !== 0) {
        throw new Error(`${response.code.toString()}`);
    }
    return String(response.data.country_code);
}

export async function sendSms(tel: string, cid: string) {
    const {token, challenge, validate, seccode} = await verify.captcha() as LoginTypes.Captcha;
    const params = new URLSearchParams({
        cid, tel, source: 'main-fe-header',
        token, challenge, validate, seccode
    });
    const resp = await fetch('https://passport.bilibili.com/x/passport-login/web/sms/send?' + params, {
        headers: store.state.data.headers, method: "POST"
    });
    const response = await resp.json() as LoginTypes.SendSmsResp;
    if (response.code !== 0) {
        throw new Error(`${response.code}, ${response.message}`);
    }
    smsKey = response.data.captcha_key;
    return response;
}

export async function exitLogin() {
    const loadingBox = document.querySelector('.loading');
    if (loadingBox) loadingBox.classList.add('active');
    const mid = await invoke('exit');
    if (loadingBox) loadingBox.classList.remove('active');
    return mid;
}