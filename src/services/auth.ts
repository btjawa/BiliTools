import { useSettingsStore } from '@/store';
import { tryFetch } from './utils';
import { AppError } from './error';
import * as Types from '@/types/login';
import md5 from 'md5';

declare global {
  interface Navigator {
    deviceMemory?: number;
    cpuClass?: number;
  }
  interface Window {
    initGeetest: (
      config: GeetestOptions,
      callback: (captchaObj: CaptchaInstance) => void,
    ) => void;
  }
}

export interface GeetestOptions {
  gt: string;
  challenge: string;
  offline: boolean;
  new_captcha: boolean;
  product?: 'float' | 'popup' | 'custom' | 'bind';
  width?: string;
  lang?: string;
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

// Reference https://github.com/SocialSisterYi/bilibili-API-collect/issues/933#issue-2073916390
export function getFingerPrint(_uuid: string) {
  return {
    '3064': 1,
    '5062': Date.now(),
    '03bf': 'https%3A%2F%2Fwww.bilibili.com%2F',
    '39c8': '333.1007.fp.risk',
    '34f1': '',
    d402: '',
    '654a': '',
    '6e7c': window.innerWidth + 'x' + window.innerHeight,
    '3c43': {
      '2673': 0,
      '641c': 0,
      '6527': 0,
      '7003': 1,
      '807e': 1,
      '5766': window.screen.colorDepth || 24,
      b8ce: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
      '07a4': navigator.language,
      '1c57': navigator.deviceMemory || 8,
      '0bd0': navigator.hardwareConcurrency,
      '748e': [screen.width, screen.height],
      d61f: [screen.availWidth, screen.availHeight],
      fc9d: new Date().getTimezoneOffset(),
      '6aa9': Intl.DateTimeFormat().resolvedOptions().timeZone,
      '75b8': 1,
      '3b21': 1,
      '8a1c': 0,
      d52f: navigator.cpuClass || 'not available',
      adca: navigator.platform || 'Win32',
      '80c9': [
        [
          'Chrome PDF Plugin',
          'Portable Document Format',
          [['application/x-google-chrome-pdf', 'pdf']],
        ],
        ['Chrome PDF Viewer', '', [['application/pdf', 'pdf']]],
      ],
      '13ab': '',
      bfe9: '',
      a3c1: [],
      '6bc5': (() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') as
          | WebGLRenderingContext
          | undefined;
        const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
        return debugInfo && gl
          ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) +
              '~' +
              gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
          : 'not available';
      })(),
      ed31: 0,
      '72bd': 0,
      '097b': 0,
      '52cd': [0, 0, 0],
      d02f: '124.04347527516074',
      a658: [
        'Arial',
        'Verdana',
        'Times New Roman',
        'Courier New',
        'Georgia',
        'Tahoma',
        'Trebuchet MS',
        'Helvetica',
        'Impact',
      ],
    },
    '54ef':
      '{"b_ut":null,"home_version":"V8","in_new_ab":true,"ab_version":{"for_ai_home_version":"V8","enable_web_push":"DISABLE","ad_style_version":"DEFAULT","enable_feed_channel":"DISABLE"},"ab_split_num":{"for_ai_home_version":54,"enable_web_push":10,"ad_style_version":54,"enable_feed_channel":54},"uniq_page_id":"509597991467","is_modern":true}',
    '8b94': 'https%3A%2F%2Fwww.bilibili.com%2F',
    df35: _uuid,
    '07a4': navigator.language,
    '5f45': null,
    db46: 0,
  };
}

// Reference https://github.com/SocialSisterYi/bilibili-API-collect/issues/951#issue-2099503271
function getWebGLFingerPrint() {
  let dm_img_str = 'bm8gd2ViZ2',
    dm_cover_img_str = 'bm8gd2ViZ2wgZXh0ZW5zaW';
  const gl = document.createElement('canvas').getContext('webgl');
  if (gl) {
    const version = gl.getParameter(gl.VERSION);
    dm_img_str = version ? btoa(version).slice(0, -2) : dm_img_str;
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      if (renderer && vendor) {
        dm_cover_img_str = btoa(renderer + vendor).slice(0, -2);
      }
    }
  }
  return { dm_img_str, dm_cover_img_str };
}

// Reference https://github.com/SocialSisterYi/bilibili-API-collect/issues/1107
export async function wbi(params: { [key: string]: string | number | object }) {
  const mixinKeyEncTab = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
    33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
    61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
    36, 20, 34, 44, 52,
  ];
  const body = (await tryFetch(
    'https://api.bilibili.com/x/web-interface/nav',
  )) as Types.NavInfo;
  const { img_url, sub_url } = body.data.wbi_img;
  const imgKey = img_url.slice(
    img_url.lastIndexOf('/') + 1,
    img_url.lastIndexOf('.'),
  );
  const subKey = sub_url.slice(
    sub_url.lastIndexOf('/') + 1,
    sub_url.lastIndexOf('.'),
  );
  const mixinKey = mixinKeyEncTab
      .map((n) => (imgKey + subKey)[n])
      .join('')
      .slice(0, 32),
    curr_time = Math.round(Date.now() / 1000),
    chr_filter = /[!'()*]/g;
  const { dm_img_str, dm_cover_img_str } = getWebGLFingerPrint();
  Object.assign(params, {
    wts: curr_time,
    dm_img_str,
    dm_cover_img_str,
    dm_img_list: '[]',
  });
  const query = Object.keys(params)
    .sort()
    .map((key) => {
      const value = params[key].toString().replace(chr_filter, '');
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');
  const wbiSign = md5(query + mixinKey);
  return query + '&w_rid=' + wbiSign;
}

export async function captcha(
  gt: string,
  challenge: string,
): Promise<Types.Captcha> {
  const lang = useSettingsStore().language;
  return new Promise((resolve, reject) => {
    window.initGeetest(
      {
        gt,
        challenge,
        offline: false,
        new_captcha: true,
        product: 'bind',
        width: '300px',
        lang: lang.startsWith('zh') ? lang : lang.slice(0, 2),
        https: true,
      },
      function (captchaObj) {
        captchaObj
          .onReady(function () {
            captchaObj.verify();
          })
          .onSuccess(function () {
            const result = captchaObj.getValidate();
            const validate = result.geetest_validate;
            const seccode = result.geetest_seccode;
            return resolve({ challenge, validate, seccode });
          })
          .onError(function (err) {
            return reject(new AppError(err.msg, { code: err.error_code }));
          });
      },
    );
  });
}

// Reference https://github.com/SocialSisterYi/bilibili-API-collect/issues/524
export async function correspondPath(timestamp: number) {
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'RSA',
      n: 'y4HdjgJHBlbaBN04VERG4qNBIFHP6a3GozCl75AihQloSWCXC5HDNgyinEnhaQ_4-gaMud_GF50elYXLlCToR9se9Z8z433U3KjM-3Yx7ptKkmQNAMggQwAVKgq3zYAoidNEWuxpkY_mAitTSRLnsJW-NCTa0bqBFF6Wm1MxgfE',
      e: 'AQAB',
    },
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt'],
  );
  const data = new TextEncoder().encode(`refresh_${timestamp}`);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, data),
  );
  return encrypted.reduce(
    (str, c) => str + c.toString(16).padStart(2, '0'),
    '',
  );
}
