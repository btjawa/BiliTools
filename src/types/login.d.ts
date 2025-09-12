export interface QrcodeInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    url: string;
    qrcode_key: string;
  };
}

export interface PwdLoginKeyInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    hash: string;
    key: string;
  };
}

export interface CountryListInfo {
  code: number;
  data: {
    common: {
      id: number;
      cname: string;
      country_id: string;
    }[];
    others: {
      id: number;
      cname: string;
      country_id: string;
    }[];
  };
}

export interface ZoneInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    addr: string;
    country: string;
    province: string;
    city: string;
    isp: string;
    latitude: number;
    longitude: number;
    zone_id: number;
    country_code: number;
  };
}

export interface CaptchaInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    token: string;
    type: string;
    geetest: {
      gt: string;
      challenge: string;
    };
  };
}

export interface Captcha {
  challenge: string;
  validate: string;
  seccode: string;
}

export interface SendSmsInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    captcha_key: string;
  };
}

export interface WebTicketInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    created_at: number;
    ttl: number;
    ticket: string;
    nav: {
      img: string;
      sub: string;
    };
  };
}

export interface CookieInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    refresh: boolean;
    timestamp: number;
  };
}

export interface UserInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    mid: number;
    name: string;
    sex: string;
    face: string;
    sign: string;
    level: number;
    coins: number;
    vip: {
      type: number;
      status: number;
      label: {
        img_label_uri_hans_static: string;
        img_label_uri_hant_static: string;
      };
    };
    top_photo_v2: {
      l_200h_img: string;
      l_img: string;
    };
    is_senior_member: number;
  };
}

export interface NavInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    wbi_img: {
      img_url: string;
      sub_url: string;
    };
  };
}

export interface UserStatResp {
  code: number;
  message: string;
  ttl: number;
  data: {
    following: number;
    follower: number;
    dynamic_count: number;
  };
}
