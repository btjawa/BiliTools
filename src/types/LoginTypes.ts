export interface GenQrcodeResp {
    code: number;
    message: string;
    ttl: number;
    data: {
        url: string,
        qrcode_key: string
    };
}

export interface GetPwdLoginKeyResp {
    code: number;
    message: string;
    ttl: number;
    data: {
        hash: string,
        key: string
    };
}

export interface GetCountryListResp {
    code: number;
    data: {
        common: Array<{
            id: number;
            cname: string;
            country_id: string;
        }>;
        others: Array<{
            id: number;
            cname: string;
            country_id: string;
        }>;
    };
}

export interface GetZoneResp {
    code: number;
    message: string;
    ttl: number;
    data: {
        addr: string,
        country: string,
        province: string,
        city: string,
        isp: string,
        latitude: number,
        longitude: number,
        zone_id: number,
        country_code: number,
    };
}

export interface GenCaptchaResp {
    code: number;
    message: string;
    ttl: number;
    data: {
        tencent: any,
        token: string,
        type: string,
        geetest: {
            gt: string,
            challenge: string,
        },
    };
}

export interface Captcha {
    token: string,
    challenge: string,
    validate: string,
    seccode: string;
}

export interface SendSmsResp {
    code: 0 | -400 | 1002 | 86203 | 1003 | 1025 | 2400 | 2406;
    message: string;
    ttl: number;
    data: {
        captcha_key: string;
    };
}

export interface GenWebTicketResp {
    code: number;
    message: string;
    ttl: number;
    data: {
        created_at: number,
        ttl: number,
        context: any,
        ticket: string,
        nav: {
            img: string,
            sub: string
        }
    };
}

export interface CookieInfoResp {
    code: number;
    message: string;
    ttl: number;
    data: {
        refresh: boolean,
        timestamp: number,
    };
}