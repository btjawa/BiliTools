import { fetch } from '@tauri-apps/plugin-http';
import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';

import { JSEncrypt } from "jsencrypt";
import store from "../store";
import * as LoginTypes from '../types/LoginTypes';
import * as verify from "./auth";
import qrcode from 'qrcode-generator';

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
    const response = await (await fetch('https://passport.bilibili.com/x/passport-login/web/qrcode/generate',
    { method: "GET", headers: store.state.data.headers })).json() as LoginTypes.GenQrcodeResp;
    const { qrcode_key, url } = response.data;
    createQrcode(canvas, url);
    return Number(await invoke('scan_login', { qrcodeKey: qrcode_key }))
}

export async function pwdLogin(username: string, password: string) {
    const rsaKeys = await (await fetch('https://passport.bilibili.com/x/passport-login/web/key',
    { method: "GET", headers: store.state.data.headers })).json() as LoginTypes.GetPwdLoginKeyResp;
    const { hash, key } = rsaKeys.data;
    const enc = new JSEncrypt();
    enc.setPublicKey(key);
    const encedPwd = enc.encrypt(hash + password);
    const {token, challenge, validate, seccode} = await verify.captcha() as LoginTypes.VerifiedCaptchaResp;
    return (await invoke('pwd_login', { username, password: encedPwd, token, challenge, validate, seccode }));
}

export async function sendSms(tel: string, cid: string) {
    const {token, challenge, validate, seccode} = await verify.captcha() as LoginTypes.VerifiedCaptchaResp;
    const params = new URLSearchParams({
        cid, tel, source: 'main-fe-header',
        token, challenge, validate, seccode
    });
    const response = await (await fetch(`https://passport.bilibili.com/x/passport-login/web/sms/send?${params.toString()}`,
    { method: "POST", headers: store.state.data.headers })).json() as LoginTypes.SendSmsResp;
    return response;
}
