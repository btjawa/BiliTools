import iziToast from "izitoast";
import router from "../router";
import store from "../store";
import * as shell from "@tauri-apps/plugin-shell";
import * as verify from "./verify";

iziToast.settings({
    closeOnEscape: true,
    transitionIn: 'bounceInLeft',
    transitionOut: 'fadeOutRight',
    position: "bottomRight",
    backgroundColor: '#3b3b3b',
    theme: 'dark'
});

export function iziInfo(message = '') {
    console.log(message)
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: 2, timeout: 4000,
        title: '提示', message
    });
}

export function iziError(message = '') {
    console.error(message);
    iziToast.error({
        icon: 'fa-regular fa-circle-exclamation',
        layout: 2, timeout: 10000,
        title: '警告 / 错误', message
    });
}

export async function bilibili(ts: number | null, input: HTMLInputElement | null) {
    if (router.currentRoute.value.name == "LoginPage") {
        shell.open(`https://space.bilibili.com/${store.state.user.mid}`);
        return null;
    } else {
        if (router.currentRoute.value.name == "HomePage" && input) {
            const data = verify.id(input?.value);
            if (data.type) {
                const path = data.type == "bangumi" ? "bangumi/play" : data.type;
                shell.open(`https://www.bilibili.com/${path}/${data.id}/${typeof ts=="number"?`?t=${ts}`:''}`);
                return null;
            }
        };
    }
}