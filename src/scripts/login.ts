import { http } from '@tauri-apps/api';
import { invoke } from '@tauri-apps/api/tauri';
import { emit } from '@tauri-apps/api/event';

import QRCode from "qrcode";
import { JSEncrypt } from "jsencrypt";
import store from "../store/index";
import * as LoginTypes from '../types/Login.type';
import * as verify from "./verify";

export async function scanLogin(box: HTMLElement) {
    emit('stop_login');
    box.innerHTML = "";
    const response = (await http.fetch('https://passport.bilibili.com/x/passport-login/web/qrcode/generate',
    { method: "GET", headers: store.state.headers })).data as LoginTypes.GenQrcodeResp;
    const { qrcode_key, url } = response.data;
    QRCode.toCanvas(box, url, {
        width: 180, margin: 0, errorCorrectionLevel: 'H',
        color: {
            dark: "#c4c4c4",
            light: "#3b3b3b9b"
        }
    });
    box.removeAttribute("title");
    try { await invoke('scan_login', {qrcodeKey: qrcode_key}); }
    catch(err) { emit("error", err) }
}

export async function pwdLogin(username: string, password: string) {
    const rsaKeys = (await http.fetch('https://passport.bilibili.com/x/passport-login/web/key',
    { method: "GET", headers: store.state.headers })).data as LoginTypes.GetPwdLoginKeyResp;
    const { hash, key } = rsaKeys.data;
    const enc = new JSEncrypt();
    enc.setPublicKey(key);
    const encedPwd = enc.encrypt(hash + password);
    const {token, challenge, validate, seccode} = await verify.captcha() as LoginTypes.VerifiedCaptchaResp;
    return (await invoke('pwd_login', { username, password: encedPwd, token, challenge, validate, seccode }));
}

export async function codeList() {
    const prefix = ((await http.fetch('https://api.bilibili.com/x/web-interface/zone',
    { method: "GET", headers: store.state.headers })).data as LoginTypes.GetZoneResp).data.country_code || 86;
    const areaCodes = (await http.fetch('https://passport.bilibili.com/web/generic/country/list',
    { method: "GET", headers: store.state.headers })).data as LoginTypes.GetCountryListResp;
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
        if (code.country_id == prefix.toString()) codeElement.click();
    });
    codeList.prev().find('.login-sms-item-text').on('click', (e) => {
        codeList.addClass('active');
        e.stopPropagation();
    });
    $(document).off('click').on('click', (e) => {
        if (!$(e.target).closest(".login-sms-area-code-list").length) codeList.removeClass('active');
    });
}

export async function sendSms(tel: string, cid: string) {
    const {token, challenge, validate, seccode} = await verify.captcha() as LoginTypes.VerifiedCaptchaResp;
    const params = new URLSearchParams({
        cid, tel, source: 'main-fe-header',
        token, challenge, validate, seccode
    });
    const response = (await http.fetch(`https://passport.bilibili.com/x/passport-login/web/sms/send?${params.toString()}`,
    { method: "POST", headers: store.state.headers })).data as LoginTypes.SendSmsResp;
    return response;
}
