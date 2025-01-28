/* Reference
    https://docs.geetest.com/sensebot/apirefer/api/web
    https://docs.geetest.com/sensebot/deploy/client/web
*/

export interface GeetestOptions {
    gt: string;
    challenge: string;
    offline: boolean;
    new_captcha: boolean;
    product?: 'float' | 'popup' | 'custom' | 'bind';
    width?: string;
    lang?: 'zh-cn' | 'zh-hk' | 'zh-tw' | 'en' | 'ja' | 'ko' | 'id' | 'ru' | 'ar' | 'es' | 'pt-pt' | 'fr' | 'de' | 'th' | 'tr' | 'vi' | 'ta' | 'it' | 'bn' | 'mr';
    https?: boolean;
    timeout?: number;
    remUnit?: number;
    zoomEle?: string;
    hideSuccess?: boolean;
    hideClose?: boolean;
    hideRefresh?: boolean;
    api_server?: string;
    api_server_v3?: string[];
}

export interface CaptchaInstance {
    appendTo(position: string | HTMLElement): this;
    bindForm(position: string | HTMLElement): this;
    getValidate(): {
        geetest_challenge: string;
        geetest_validate: string;
        geetest_seccode: string;
    };
    reset(): this;
    verify(): this;
    onReady(callback: () => void): this;
    onSuccess(callback: () => void): this;
    onError(callback: (error: { error_code: number; msg: string }) => void): this;
    onClose(callback: () => void): this;
    destroy(): this;
}

export function initGeetest(config: ConfigOptions, callback: (captchaObj: CaptchaInstance) => void): void;