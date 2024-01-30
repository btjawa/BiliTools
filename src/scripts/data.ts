import $ from "jquery";

export const sidebar = {
    downPage: $('.down-page-bar-background'),
    settings: $('.settings-page-bar-background'),
    userProfile: $('.user-avatar-placeholder')
}

export let headers: Object = {};

export let currentElm: string[] = [];

export let secret: string = "";

export const set = {
    headers(p: Object) { headers = p; },
    secret(p: string) { secret = p; }
}

export const app: AppPlatforms = {
    android_1: {
        appkey: "1d8b6e7d45233436",
        appsec: "560c52ccd288fed045859ed18bffd973"
    },
    ios_1: {
        appkey: "4ebafd7c4951b366",
        appsec: "8cb98205e9b2ad3669aad0fce12a4c13"
    }
}

export interface GeneralResponse<T> {
    code: number,
    message: string,
    data: T;
}

export interface AppPlatforms {
    android_1: { appkey: string; appsec: string; };
    ios_1: { appkey: string; appsec: string; };
}

export interface CaptchaResponse {
    token: string, challenge: string,
    validate: string, seccode: string;
}