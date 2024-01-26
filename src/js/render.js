const { invoke } = window.__TAURI__.tauri;
const { emit, listen, once } = window.__TAURI__.event;
const { shell, dialog, http, app, os, clipboard } = window.__TAURI__;

const searchInput = $('#search-input');
const videoListTabHead = $('.video-list-tab-head');
const loadingBox = $('.loading');
const videoList = $('.video-list');
const infoBlock = $('.info');
const multiSelectBtn = $('.multi-select-btn');
const multiSelectNext = $('.multi-select-next-btn');
const downDirPath = $('#down-dir-path');
const tempDirPath = $('#temp-dir-path');
const waitingList = $('.down-page-child.waiting');
const doingList = $('.down-page-child.doing');
const completeList = $('.down-page-child.complete');

const sidebar = {
    downPage: $('.down-page-bar-background'),
    settings: $('.settings-page-bar-background'),
    userProfile: $('.user-avatar-placeholder')
}

let currentElm = [], currentSel = [];
let userData = { mid: null, coins: null, isLogin: false }
let totalDown = 0;
let headers = {};

let mediaData = [];
let selectedMedia = [];

const viewIcon = `<div class="bcc-iconfont bcc-icon-icon_list_player_x1 icon-small"></div>`;
const danmakuIcon = `<div class="bcc-iconfont bcc-icon-danmuguanli icon-small"></div>`;
const replyIcon = `<div class="bcc-iconfont bcc-icon-pinglunguanli icon-small"></div>`;
const likeIcon = `<div class="bcc-iconfont bcc-icon-ic_Likesx icon-small"></div>`;
const coinIcon = `<div class="bcc-iconfont bcc-icon-icon_action_reward_n_x icon-small"></div>`;
const favoriteIcon = `<div class="bcc-iconfont bcc-icon-icon_action_collection_n_x icon-small"></div>`;
const shareIcon = `<div class="bcc-iconfont bcc-icon-icon_action_share_n_x icon-small"></div>`;
const bigVipIcon = `<svg class="user-vip-icon" width="16" height="16" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
<path d="M32.0002 61.3333C15.7986 61.3333 2.66667 48.2013 2.66667 32.0002C2.66667 15.7986 15.7986 2.66667 32.0002 2.66667C48.2013 2.66667 61.3333 15.7986 61.3333 32.0002C61.3333 48.2014 48.2014 61.3333 32.0002 61.3333Z" fill="#FF6699" stroke="white" stroke-width="5.33333"/>
<path d="M46.6262 22.731V22.7199H35.8032C35.8734 21.8558 35.914 20.9807 35.914 20.0982C35.914 19.1122 35.866 18.1337 35.7774 17.1699C35.7811 17.1072 35.7885 17.0444 35.7885 16.9779V16.9669C35.7885 14.9581 34.16 13.3333 32.1549 13.3333C30.1462 13.3333 28.5214 14.9618 28.5214 16.9669V16.9779C28.5214 17.2253 28.5473 17.469 28.5953 17.7017L28.5436 17.7091C28.6174 18.4956 28.6581 19.2895 28.6581 20.0945C28.6581 20.9807 28.6101 21.8558 28.5214 22.7162H17.392V22.731C15.4977 22.8528 13.9948 24.4259 13.9948 26.3534V26.3645C13.9948 28.3733 15.5346 29.9832 17.5397 29.9832C17.6948 29.9832 17.8535 29.9906 18.1046 29.9869L26.6124 29.9685C24.4559 34.9535 20.7153 39.0892 16.0294 41.7441C16.0072 41.7552 15.9888 41.7663 15.9666 41.7811C15.9149 41.8106 15.8669 41.8401 15.8152 41.8697L15.8189 41.8734C14.7961 42.5159 14.1129 43.6532 14.1129 44.9493V44.9604C14.1129 46.9692 15.7414 48.5939 17.7465 48.5939C18.5256 48.5939 19.242 48.3465 19.8328 47.9329C26.6604 43.9892 31.9002 37.6047 34.3631 29.9759H46.0428C46.2311 29.9795 46.5117 29.9685 46.5117 29.9685C48.6941 29.9242 50.1268 28.3807 50.1268 26.3756V26.3645C50.1305 24.3963 48.5722 22.8011 46.6262 22.731Z" fill="white"/>
<path d="M49.5283 43.2251C49.5209 43.2104 49.5098 43.1993 49.5024 43.1882C49.3769 42.963 49.2292 42.7562 49.063 42.5642C46.7182 39.2408 43.7678 36.3791 40.3596 34.1524L40.3559 34.1561C39.7614 33.7278 39.0302 33.473 38.2437 33.473C36.2349 33.473 34.6102 35.1014 34.6102 37.1065V37.1176C34.6102 38.4912 35.3746 39.6876 36.5008 40.3043C39.418 42.2318 41.7997 44.44 43.6829 47.3904L43.8786 47.6378C44.5248 48.2286 45.3815 48.5942 46.3268 48.5942C48.3356 48.5942 49.9603 46.9657 49.9603 44.9606V44.9496C49.9566 44.3255 49.8015 43.7384 49.5283 43.2251Z" fill="white"/>
</svg>`

iziToast.settings({
    timeout: 4000,
    icon: 'Fontawesome',
    closeOnEscape: 'true',
    transitionIn: 'bounceInLeft',
    transitionOut: 'fadeOutRight',
    displayMode: 'replace',
    position: 'topCenter',
    backgroundColor: '#3b3b3b',
    theme: 'dark'
});

class MediaData {
    constructor(title, desc, pic, duration, id, cid, type, rank, ss_title, display_name, badge) {
        this.title = title;
        this.desc = desc;
        this.pic = pic;
        this.duration = duration;
        this.id = id;
        this.cid = cid;
        this.type = type;
        this.rank = rank;
        this.ss_title = ss_title;
        this.display_name = display_name;
        this.badge = badge;
    }
}

class CurrentSel {
    constructor(dms_id, dms_desc, codec_id, codec_desc, ads_id, ads_desc) {
        this.dms_id = dms_id;
        this.dms_desc = dms_desc;
        this.codec_id = codec_id;
        this.codec_desc = codec_desc;
        this.ads_id = ads_id;
        this.ads_desc = ads_desc;
    }
}

const verify = {
    app: {
        android_1: {
            appkey: "1d8b6e7d45233436",
            appsec: "560c52ccd288fed045859ed18bffd973"
        }
    },
    wbi: async function(params) {
        const mixinKeyEncTab = [
            46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
            33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
            61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
            36, 20, 34, 44, 52
        ];
        const getMixinKey = (orig) => {
            return mixinKeyEncTab.map(n => orig[n]).join('').slice(0, 32);
        };
        const res = (await http.fetch('https://api.bilibili.com/x/web-interface/nav',
        { headers })).data;
        const { img_url, sub_url } = res.data.wbi_img;
        const imgKey = img_url.slice(img_url.lastIndexOf('/') + 1, img_url.lastIndexOf('.'));
        const subKey = sub_url.slice(sub_url.lastIndexOf('/') + 1, sub_url.lastIndexOf('.'));
        const mixinKey = getMixinKey(imgKey + subKey);
        const currTime = Math.round(Date.now() / 1000);
        const chrFilter = /[!'()*]/g;
        Object.assign(params, { wts: currTime });
        const query = Object.keys(params).sort().map(key => {
            const value = params[key].toString().replace(chrFilter, '');
            return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        }).join('&');
        const wbiSign = md5(query + mixinKey);
        return query + '&w_rid=' + wbiSign;
    },
    uuid: function() {
        function a(e) {
            let t = "";
            for (let r = 0; r < e; r++) {
                t += o(Math.random() * 16);
            }
            return s(t, e);
        }
        function s(e, t) {
            let r = "";
            if (e.length < t) {
                for (let n = 0; n < t - e.length; n++) {
                    r += "0";
                }
            }
            return r + e;
        }
        function o(e) { return Math.ceil(e).toString(16).toUpperCase(); }
        let e = a(8);
        let t = a(4);
        let r = a(4);
        let n = a(4);
        let i = a(12);
        let currentTime = (new Date()).getTime();
        return e + "-" + t + "-" + r + "-" + n + "-" + i + s((currentTime % 100000).toString(), 5) + "infoc";    
    },
    bili_ticket: async function() {
        const key = "XgwSnGZ1p";
        const message = "ts" + Math.floor(Date.now() / 1000);
        const encoder = new TextEncoder();
        const keyBytes = encoder.encode(key);
        const messageBytes = encoder.encode(message);
        const cryptoKey = await crypto.subtle.importKey(
            "raw", keyBytes, 
            { name: "HMAC", hash: "SHA-256" }, 
            false, ["sign"]
        );
        const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageBytes);
        const hexSignature =  Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
        const params = new URLSearchParams({
            key_id: "ec02",
            hexsign: hexSignature,
            "context[ts]": Math.floor(Date.now() / 1000),
            csrf: ""
        })
        return (await http.fetch(`https://api.bilibili.com/bapis/bilibili.api.ticket.v1.Ticket/GenWebTicket?${params.toString()}`,
        { method: 'POST' })).data;
    },
    correspondPath: async function(timestamp) {
        const publicKey = await crypto.subtle.importKey(
            "jwk", {
              kty: "RSA",
              n: "y4HdjgJHBlbaBN04VERG4qNBIFHP6a3GozCl75AihQloSWCXC5HDNgyinEnhaQ_4-gaMud_GF50elYXLlCToR9se9Z8z433U3KjM-3Yx7ptKkmQNAMggQwAVKgq3zYAoidNEWuxpkY_mAitTSRLnsJW-NCTa0bqBFF6Wm1MxgfE",
              e: "AQAB",
            }, { name: "RSA-OAEP", hash: "SHA-256" },
            true,
            ["encrypt"],
        )
        const data = new TextEncoder().encode(`refresh_${timestamp}`);
        const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, data))
        return encrypted.reduce((str, c) => str + c.toString(16).padStart(2, "0"), "")
    },
    appSign: function(params, platform) {
        params.appkey = platform.appkey;
        const searchParams = new URLSearchParams(params);
        searchParams.sort();
        const sign = md5(searchParams.toString() + platform.appsec);
        return searchParams.toString() + '&sign=' + sign;
    }
}

const format = {
    id: function(input) {
        let match = input.match(/BV[a-zA-Z0-9]+|av(\d+)/i);
        if (match) return [match[0], "video"];
        match = input.match(/ep(\d+)|ss(\d+)/i);
        if (match) return [match[0], "bangumi"]; 
        match = input.match(/au(\d+)/i);
        if (match) return [match[0], "audio"]; 
        else if (!input || !input.match(/a-zA-Z0-9/g) || true) {
            iziToast.error({
                icon: 'fa-regular fa-circle-exclamation',
                layout: '2', title: `警告`,
                message: !input ? "请输入链接/AV/BV/SS/EP/AU号" : "输入不合法！请检查格式"
            });
            return [input, null];
        }
    },
    stat: function(num) {
        if (num >= 100000000) {
            return (num / 100000000).toFixed(1) + '亿';
        } else if (num >= 10000) {
            return (num / 10000).toFixed(1) + '万';
        } else return num.toString();
    },
    duration: function(n, type) {
        if (isNaN(parseFloat(n))) return n;
        const num = parseFloat(type == "bangumi" ? Math.round(n / 1000) : n);
        const hs = Math.floor(num / 3600);
        const mins = Math.floor((num % 3600) / 60);
        const secs = Math.round(num % 60);
        const finalHs = hs > 0 ? hs.toString().padStart(2, '0') + ':' : '';
        const finalMins = mins.toString().padStart(2, '0');
        const finalSecs = secs.toString().padStart(2, '0');
        return finalHs + finalMins + ':' + finalSecs;
    },
    partition: function(cid) {
        switch(cid) {case 1:return'动画';case 24:return'动画';case 25:return'动画';case 47:return'动画';case 210:return'动画';case 86:return'动画';case 253:return'动画';case 27:return'动画';case 13:return'番剧';case 51:return'番剧';case 152:return'番剧';case 32:return'番剧';case 33:return'番剧';case 167:return'国创';case 153:return'国创';case 168:return'国创';case 169:return'国创';case 170:return'国创';case 195:return'国创';case 3:return'音乐';case 28:return'音乐';case 31:return'音乐';case 30:return'音乐';case 59:return'音乐';case 193:return'音乐';case 29:return'音乐';case 130:return'音乐';case 243:return'音乐';case 244:return'音乐';case 129:return'舞蹈';case 20:return'舞蹈';case 154:return'舞蹈';case 156:return'舞蹈';case 198:return'舞蹈';case 199:return'舞蹈';case 200:return'舞蹈';case 4:return'游戏';case 17:return'游戏';case 171:return'游戏';case 172:return'游戏';case 65:return'游戏';case 173:return'游戏';case 121:return'游戏';case 136:return'游戏';case 19:return'游戏';case 36:return'知识';case 201:return'知识';case 124:return'知识';case 228:return'知识';case 207:return'知识';case 208:return'知识';case 209:return'知识';case 229:return'知识';case 122:return'知识';case 188:return'科技';case 95:return'科技';case 230:return'科技';case 231:return'科技';case 232:return'科技';case 233:return'科技';case 234:return'运动';case 235:return'运动';case 249:return'运动';case 164:return'运动';case 236:return'运动';case 237:return'运动';case 238:return'运动';case 223:return'汽车';case 245:return'汽车';case 246:return'汽车';case 247:return'汽车';case 248:return'汽车';case 240:return'汽车';case 227:return'汽车';case 176:return'汽车';case 160:return'生活';case 138:return'生活';case 250:return'生活';case 251:return'生活';case 239:return'生活';case 161:return'生活';case 162:return'生活';case 21:return'生活';case 211:return'美食';case 76:return'美食';case 212:return'美食';case 213:return'美食';case 214:return'美食';case 215:return'美食';case 217:return'动物圈';case 218:return'动物圈';case 219:return'动物圈';case 220:return'动物圈';case 221:return'动物圈';case 222:return'动物圈';case 75:return'动物圈';case 119:return'鬼畜';case 22:return'鬼畜';case 26:return'鬼畜';case 126:return'鬼畜';case 216:return'鬼畜';case 127:return'鬼畜';case 155:return'时尚';case 157:return'时尚';case 252:return'时尚';case 158:return'时尚';case 159:return'时尚';case 202:return'资讯';case 203:return'资讯';case 204:return'资讯';case 205:return'资讯';case 206:return'资讯';case 5:return'娱乐';case 71:return'娱乐';case 241:return'娱乐';case 242:return'娱乐';case 137:return'娱乐';case 181:return'影视';case 182:return'影视';case 183:return'影视';case 85:return'影视';case 184:return'影视';case 177:return'纪录片';case 37:return'纪录片';case 178:return'纪录片';case 179:return'纪录片';case 180:return'纪录片';case 23:return'电影';case 147:return'电影';case 145:return'电影';case 146:return'电影';case 83:return'电影';case 11:return'电视剧';case 185:return'电视剧';case 187:return'电视剧';default:return'未知分区'}
    },
    pubdate: function(timestamp, f) {
        const date = f ? timestamp : new Date(timestamp * 1000);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}${f?'_':' '}` + 
        `${hours.toString().padStart(2, '0')}${f?'-':':'}${minutes.toString().padStart(2, '0')}${f?'-':':'}${seconds.toString().padStart(2, '0')}`;
    },
    filename: function(filename) {
        return filename.replace(/[\\/:*?"<>|\r\n]+/g, '_');
    },
    codec: function(codec) {
        const parts = codec.split('.');
        const codecType = parts[0];
        let profileDesc;
        let levelDesc;
        if (codecType === 'hev1' || codecType === 'hvc1') {
            const profilePart = parts[1];
            const levelPart = parts[3].slice(1);
            if (profilePart == '1') profileDesc = 'Main';
            else if (profilePart == '2') profileDesc = 'Main 10';
            else if (profilePart == '3') profileDesc = 'Main Still Picture';
            else profileDesc = 'Unknown';
            const levelNumber = parseFloat(levelPart);
            if (!isNaN(levelNumber)) {
                levelDesc = `Level ${levelNumber / 30.0}`;
            } else levelDesc = "Unknown Level";
            return `HEVC/H.265 ${profileDesc} ${levelDesc}`;
        } else if (codecType === 'avc' || codecType === 'avc1') {
            const profileAndLevel = parts[1];
            if (profileAndLevel.startsWith('42')) {
                profileDesc = 'Baseline';
            } else if (profileAndLevel.startsWith('4D')) {
                profileDesc = 'Main';
            } else if (profileAndLevel.startsWith('58')) {
                profileDesc = 'Extended';
            } else if (profileAndLevel.startsWith('64')) {
                profileDesc = 'High';
            } else profileDesc = 'Unknown';
            const levelPart = profileAndLevel.substring(2);
            const levelNumber = parseInt(levelPart, 16);
            if (!isNaN(levelNumber)) {
                levelDesc = `Level ${levelNumber / 10.0}`;
            } else levelDesc = "Unknown Level";
            return `AVC/H.264 ${profileDesc} ${levelDesc}`;
        } else if (codecType === 'av01') {
            profileDesc = parts[2];
            return `AV1 ${profileDesc}`;
        }
        return '未知编码格式';    
    }
}

function debounce(fn, wait) {
    let bouncing = false;
    return function(...args) {
        if (bouncing) {
            iziToast.error({
                icon: 'fa-regular fa-circle-exclamation',
                layout: '2', title: '警告',
                message: `请等待${wait / 1000}秒后再进行请求`
            });
            return null;
        }
        bouncing = true;
        setTimeout(() => {
            bouncing = false;
        }, wait);
        fn.apply(this, args);
    };
}

async function openFile(options = {}) {
    return new Promise(async (resolve, reject) => {
        try {
            const selected = await dialog.open(options);
            resolve(selected);
        } catch (err) {
            console.error(err)
            reject(null);
        }
    });
}

async function saveFile(options = {}) {
    return new Promise(async (resolve, reject) => {
        try {
            const selected = await dialog.save(options);
            resolve(selected);
        } catch(err) {
            console.error(err);
            reject(null);
        }
    });
}

async function getMediaInfo(rawId, type) {
    $('.search').addClass('active');
    let basicUrl, info, tags;
    const id = rawId.toLowerCase();
    if (type == "video") {
        basicUrl = `https://api.bilibili.com/x/web-interface/view/detail?${id.startsWith('bv') ? `bvid=${rawId}` : `aid=${id.match(/\d+/)[0]}`}`;
    } else if (type == "bangumi") {
        basicUrl = `https://api.bilibili.com/pgc/view/web/season?${id.startsWith('ep') ? 'ep_id' : 'season_id'}=${id.match(/\d+/)[0]}`;
    } else if (type == "audio") {
        basicUrl = `https://www.bilibili.com/audio/music-service-c/web/song/info?sid=${id.match(/\d+/)[0]}`;
    }
    loadingBox.addClass('active');
    const basicResp = (await http.fetch(basicUrl, { headers })).data;
    loadingBox.removeClass('active');
    if (basicResp.code === 0) {
        if (type == "video") {
            info = basicResp.data.View;
            tags = basicResp.data.Tags;
        } else if (type == "bangumi") {
            info = basicResp.result;
            tags = basicResp.result.styles;
        } else if (type == "audio") {
            info = basicResp.data;
            tags = (await http.fetch(`https://www.bilibili.com/audio/music-service-c/web/tag/song?sid=${id.match(/\d+/)[0]}`,
            { headers })).data.data.map(item => item.info);
        }
        handleMediaList ({ info, tags }, type)
    } else {
        handleErr(basicResp, null);
        backward();
        return null;
    }
}

async function getPlayUrl(aid, cid, type, block) {
    const params = {
        avid: aid, cid, fourk: 1,
        fnval: 4048, fnver: 0
    }
    const signature = await verify.wbi(params);
    let getDetailUrl = type !== "bangumi" 
        ? `https://api.bilibili.com/x/player/wbi/playurl?${signature}`
        : `https://api.bilibili.com/pgc/player/web/playurl?${signature}`;
    loadingBox.addClass('active');
    const details = (await http.fetch(getDetailUrl,
    { headers })).data;
    loadingBox.removeClass('active');
    if (handleErr(details, type)) block.remove();
    return details;
}

async function getMusicUrl(songid, quality) {
    const params = {
        songid, quality, privilege: 2,
        mid: userData.mid || 0, platform: 'web',
    };
    const signature = await verify.wbi(params);
    loadingBox.addClass('active');
    const details = (await http.fetch(`https://api.bilibili.com/audio/music-service-c/url?${signature}`,
    { headers })).data;
    loadingBox.removeClass('active');
    if (handleErr(details, "music")) return null;
    else return details;
}

function matchDownUrl(details, quality, action, fileType) {
    let downUrl = [];
    const isVideo = fileType === "video";
    for (const file of isVideo ? details.dash.video : details.dash.audio) {
        if (action == "music") downUrl[1] = details.dash.audio
        else if (file.id == isVideo ? quality.dms_id : quality.ads_id
        && !isVideo || file.codecs == quality.codec_id) {
            if (isVideo) {
                downUrl[0] = [file.baseUrl];
                if (file.backupUrl) downUrl[0].push(...file.backupUrl)
            } else {
                downUrl[1] = [file.baseUrl, ...file.backupUrl.slice(0, 2)];
                if (file.backupUrl) downUrl[1].push(...file.backupUrl)
            }
            break;
        }
    }
    if (action == "multi") {
        const target = quality.ads_id == 30250 ? details.dash.dolby.audio
        : (quality.ads_id == 30251 ? details.dash.flac.audio : details.dash.audio);
        if (Array.isArray(target)) {
            for (const audio of target) {
                if (audio.id == quality.ads_id) {
                    downUrl[1] = [audio.baseUrl];
                    if (audio.backupUrl) downUrl[1].push(...audio.backupUrl);
                    break;
                }
            }
        } else {
            downUrl[1] = [target.baseUrl];
            if (target.backupUrl) downUrl[1].push(...target.backupUrl);
        }
    }
    return [isVideo, downUrl, quality, action]
}

function handleDown(isVideo, downUrl, quality, action, data) {
    if ((action == "multi" && downUrl[0] && downUrl[1]) ||
    (action == "only" && (isVideo ? downUrl[0] : downUrl[1])) || action == "music") {
        let qualityStr, displayName;
        const ext = isVideo ? "mp4" : "mp3";
        const safeTitle = format.filename(data.title);
        if (action == "only") {
            qualityStr = isVideo ? quality.dms_desc : quality.ads_desc;
            displayName = `${safeTitle} (${qualityStr}).${ext}`;
        } else if (action == "multi") {
            qualityStr = `${quality.dms_desc}-${quality.ads_desc}`;
            displayName = `${safeTitle} (${qualityStr}).mp4`;
        } else if (action == "music") {
            const ext = downUrl[1][0].split('.').pop().split('?')[0].split('#')[0];
            displayName = `${safeTitle} (${quality}).${ext}`;
        }
        data.display_name = displayName;
        totalDown++;
        invoke('push_back_queue', {
            videoUrl: downUrl[0] || null,
            audioUrl: downUrl[1] || null,
            action, indexId: totalDown, mediaData: data
        });
    } else emit('error', "未找到符合条件的下载地址＞﹏＜");
}

function handleErr(err, type) {
    let errMsg = '';
    if (err.code === 0) {
        const root = type != "bangumi" ? err.data : err.result;
        if (root.is_preview === 1) {
            if (root.durls && root.durl) {
                errMsg = '没有本片权限, 只有试看权限<br>可能是没有大会员/没有购买本片<br>或是地区受限';
            }
        } else if (root.v_voucher) errMsg = '目前请求次数过多, 已被风控, 请等待5分钟或更久后重新尝试请求';
    } else if (err.code === -404) {
        errMsg = `${err.message || err.msg}<br>错误代码: ${err.code}<br>可能是没有大会员/没有购买本片<br>或是地区受限<br>或是真的没有该资源`;
    } else {
        errMsg = `${err.message || err.msg || err}<br>错误代码: ${err.code}`;
    }
    if (errMsg) {
        console.error(err, errMsg);
        emit('error', errMsg);
        return true;
    } else {
        return false;
    }
}

async function bilibili(ts) {
    if (currentElm.at(-1) == ".user-profile") {
        shell.open(`https://space.bilibili.com/${userData.mid}`);
        return null;
    } else {
        if ($('.info').hasClass('active')) {
            const input = searchInput.val();
            const data = format.id(input);
            if (data[1]) {
                const path = data[1] == "bangumi" ? "bangumi/play" : data[1];
                shell.open(`https://www.bilibili.com/${path}/${data[0]}/${ts?`ts=${ts}`:''}`);
                return null;
            }
        } else {
            iziToast.error({
                icon: 'fa-regular fa-circle-exclamation',
                layout: '2', title: `警告`,
                message: `请先点击搜索按钮或返回到搜索结果页面`
            });
        }
    }
}

async function backward() {
    const last = currentElm.at(-1);
    if (last == '.login') {
        invoke('stop_login');
        $('.login').removeClass('active');
    } else if (last == '.down-page') {
        $('.down-page').removeClass('active');
        $('.down-page-child').removeClass('active');
    } else if (last == '.user-profile') {
        $('.user-profile').removeClass('active');
    } else if (last == '.video-root') {
        if ($('.search').hasClass('active')) $('.search').removeClass('active');
        infoBlock.removeClass('active');
        videoList.removeClass('active');
        if (multiSelectBtn.hasClass('checked')) multiSelectBtn.click();
        multiSelectBtn.removeClass('active');
        multiSelectNext.removeClass('active');
        loadingBox.removeClass('active');
        videoListTabHead.removeClass('active');
        $('.stein-tree').removeClass('active').find('.stein-tree-node').remove()
        $('.video-list').empty();
    } else if (last == '.settings') {
        $('.settings').removeClass('active');
        $('.settings-page').removeClass('active');
    }
    currentElm.pop();
}

function contextMenu() {
    function handleTextUpdate(element, text = '') {
        if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
            const start = element.selectionStart;
            const end = element.selectionEnd;
            const selectedText = element.value.substring(start, end);
            element.value = element.value.substring(0, start) + text + element.value.substring(end);
            const pos = start + text.length;
            element.setSelectionRange(pos, pos);
            return selectedText;
        } else return text;
    }    
    $(document).on('contextmenu', async (e) => {
        e.preventDefault();
        const menuWidth = parseInt($('.context-menu').css("width"));
        const menuHeight = parseInt($('.context-menu').css("height"));
        let clientWidth = document.body.clientWidth;
        let clientHeight = document.body.clientHeight;
        let left, top;
        if (e.clientX + menuWidth > clientWidth) {
            left = e.clientX - menuWidth - 1 + 'px';
        } else left = e.clientX + 1 + 'px'
        if (e.clientY > (clientHeight / 2)) {
            top = e.clientY - menuHeight - 1 + 'px';
        } else top = e.clientY + 1 + 'px';
        $('.context-menu').css({
            top: top,
            left: left,
            animation: '',
            opacity: 1,
            display: "flex"
        }).off('mousedown').on('mousedown', function(e) {
            e.preventDefault();
        });
        void $('.context-menu')[0].offsetHeight;
        $('.context-menu').css('animation', 'fadeInAnimation 0.2s');
    }).on('click', async (e) => {
        const target = $(e.target);
        if (!target.hasClass('context-menu') && !target.hasClass('context-menu-split')) $('.context-menu').css({ opacity: 0, display: "none" });
        if (target.hasClass('cut')) clipboard.writeText(handleTextUpdate(document.activeElement));
        if (target.hasClass('copy')) clipboard.writeText(window.getSelection().toString());
        if (target.hasClass('paste')) handleTextUpdate(document.activeElement, await clipboard.readText());
        if (target.hasClass('bilibili')) bilibili();
    })
}

$(document).ready(function () {
    contextMenu();
    invoke('init');
    app.getVersion().then(ver => $('#version').html(ver));
    os.platform().then(type => $('#platform').html(type));
    os.arch().then(arch => $('#arch').html(arch));
    $('#year').html((new Date()).getFullYear())
    sidebar.userProfile.append(bigVipIcon);
    async function search() {
        backward();
        currentElm.push(".video-root");
        const data = format.id(searchInput.val());
        if (data[1]) {
            getMediaInfo(data[0], data[1]);
            return null;
        }
    };
    const dbc = debounce(search, 250);
    $('.search-btn').on('click', dbc);
    searchInput.on('keydown', (e) => {if (e.keyCode === 13) dbc()});
    sidebar.downPage.one('click', () => downPage());
    sidebar.downPage.on('click', () => {
        currentElm.push(".down-page");
        $('.down-page').addClass('active');
        $('.down-page-sel').first().click();
    });
    sidebar.settings.one('click', () => settings());
    sidebar.settings.on('click', () => {
        $('.settings').addClass('active');
        currentElm.push('.settings');    
        $('.settings-side-bar-background.general').click();
    });
    $('.backward').on('click', () => backward());
    $(".login, .settings, .down-page, .user-profile").append(`<button class="help link"t="https://blog.btjawa.top/posts/bilitools/#qa"><span>遇到问题?&nbsp;前往文档</span>&nbsp;<a class="fa-solid fa-arrow-up-right-from-square"></a></button>`);
    $('.link').on('click', function() {shell.open($(this).attr("t"))});
    $(document).on('keydown', async function(e) {
        if (e.keyCode === 116 || (e.ctrlKey && e.keyCode === 82) || (e.ctrlKey && e.shiftKey && e.keyCode === 80)) {
            e.preventDefault();
        }
        if (e.keyCode === 27) backward();
        if (e.ctrlKey && e.keyCode === 65) {
            if (multiSelectBtn.hasClass('checked') && !(document.activeElement &&
            (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA'))) {
                e.preventDefault();
                const checkbox = $('.multi-select-box-org');
                const isChecked = checkbox.first().prop('checked');
                checkbox.prop('checked', !isChecked).trigger('change');
                return null;
            }
        }
    })
});

async function checkRefresh() {
    const response = (await http.fetch('https://passport.bilibili.com/x/passport-login/web/cookie/info',
    { headers })).data;
    const { refresh, timestamp } = response.data;
    if (refresh) {
        const correspondPath = await verify.correspondPath(timestamp);
        const csrfHtmlResp = await http.fetch(`https://www.bilibili.com/correspond/1/${correspondPath}`,
        { headers, responseType: http.ResponseType.Text });
        const parser = new DOMParser();
        const doc = parser.parseFromString(csrfHtmlResp.data, 'text/html');
        const refreshCsrf = (doc.evaluate('//div[@id="1-name"]/text()', doc, null, XPathResult.STRING_TYPE, null)).stringValue;
        invoke("refresh_cookie", { refreshCsrf });
    } else return refresh;
}

function ShowMediaInfo(details, type) {
    const isV = (type == "video" || type == "ugc_season");
    const isA = type == "audio";
    const root = details.info;
    $('.info-cover').attr("src", "").attr("src", 
    (isV ? root.pic : root.cover) + '@256h');
    $('.info-title').html(isV || isA ? root.title : root.season_title);
    $('.info-desc').html((isV ? root.desc : (isA ? root.intro : root.evaluate)).replace(/\n/g, '<br>'));
    if (isV ? root.owner : (isA ? root.uname : root.up_info)) {
        if (!isA) $('.info-owner-face').attr("src", (isV ? root.owner.face : root.up_info.avatar) + '@128h');
        $('.info-owner-name').html(isV ? root.owner.name : (isA ? root.uname : root.up_info.uname));
    } else {
        $('.info-owner-face').css("display", "none");
        $('.info-owner-name').css("display", "none");
    }
    $('.info-title').css('max-width', `calc(100% - ${parseInt($('.info-owner').outerWidth(true))}px)`);
    $('.info-stat').html(`<div class="info-stat-item">${viewIcon + format.stat(isV ? root.stat.view : (isA ? root.statistic.play : root.stat.views))}</div>`)
    .append(!isA ? `<div class="info-stat-item">${danmakuIcon + format.stat(isV ? root.stat.danmaku : root.stat.danmakus)}</div>` : '')
    .append(`<div class="info-stat-item">${replyIcon + format.stat(isA ? root.statistic.comment : root.stat.reply)}</div>`)
    .append(!isA ? `<div class="info-stat-item">${likeIcon + format.stat(isV ? root.stat.like : root.stat.likes)}</div>` : '')
    $('.info-stat').append(
        `<div class="info-stat-item">${coinIcon + format.stat(isV ? root.stat.coin : (isA ? root.coin_num : root.stat.coins))}</div>
        <div class="info-stat-item">${favoriteIcon + format.stat(isV ? root.stat.favorite : (isA ? root.statistic.collect : (root.stat.favorites + root.stat.favorite)))}</div>
        <div class="info-stat-item">${shareIcon + format.stat(isA ? root.statistic.share : root.stat.share)}</div>`
    );
    let stylesText = '';
    const tagsRoot = details.tags;
    if (isV) stylesText = `${format.partition(root.tid)}&nbsp;·&nbsp;${root.tname}`;
    else {
        for (let i = 0; i < tagsRoot.length; i++) {
            stylesText += tagsRoot[i];
            if (i < tagsRoot.length - 1) stylesText += "&nbsp;·&nbsp;";
        }
    }
    const contrElm = $('<a>').addClass('bcc-iconfont bcc-icon-ic_contributionx icon-small');
    const pubdateElm = $('<a>').addClass('bcc-iconfont bcc-icon-icon_into_history_gray_ icon-small');
    const pubdate = isV ? format.pubdate(root.pubdate) : (isA ? format.pubdate(root.passtime) : root.publish.pub_time);
    $('.info-styles').empty().append(contrElm, stylesText).append("&emsp;|&emsp;").append(pubdateElm, pubdate);
}

function handleMediaList(details, type) {
    videoList.empty();
    let actualSearch = 0;
    mediaData = [], selectedMedia = [];
    const root = details.info;
    function date(title) { return format.filename(title) + "_" + format.pubdate(new Date(), true) }
    if (Object.values(root).length) {
        infoBlock.addClass('active');
        videoList.addClass('active');
        multiSelectBtn.addClass('active');
        videoListTabHead.addClass('active')
        .find('.video-block-name').text('标题')
        .find('.video-block-page').text('编号');
        ShowMediaInfo(details, type);
        handleMultiSelect();
        const match = searchInput.val().match(/(\d+)|(BV[A-Za-z0-9]+)/i);
        const val = [match[1] ? parseInt(match[1]) : null, match[2] ? match[2] : null];
        if (type == "video") {
            if (root.ugc_season) {
                const ugc_root = root.ugc_season;
                ugc_root.sections[0].episodes.forEach((episode, rank) => {
                    mediaData[rank] = new MediaData(
                        episode.title, episode.arc.desc, 
                        episode.arc.pic, episode.arc.duration, 
                        episode.aid, episode.cid, type, rank + 1,
                        date(ugc_root.title), null, null
                    );
                    appendMediaBlock(mediaData[rank]);
                    Object.values(episode).forEach(id => {
                        if (val.includes(id)) actualSearch = rank;
                    });
                });
            } else {
                if (root.rights.is_stein_gate) {
                    loadingBox.addClass('active');
                    http.fetch(`https://api.bilibili.com/x/player.so?id=cid:1&aid=${encodeURIComponent(root.aid)}`,
                    { headers, responseType: http.ResponseType.Text }).then(async player => {
                        const match = player.data.match(/<interaction>(.*?)<\/interaction>/);
                        const graph_version = JSON.parse(match[1]).graph_version;
                        appendSteinNode(root, graph_version, 1, type);
                        loadingBox.removeClass('active');
                    });
                } else {
                    root.pages.forEach((page, rank) => {
                        const title = page.part || root.title;
                        mediaData[rank] = new MediaData(
                            title, root.desc, root.pic, page.duration,
                            root.aid, page.cid, type, rank + 1,
                            date(root.title), null, null
                        );
                        appendMediaBlock(mediaData[rank])
                        Object.values(page).forEach(id => {
                            if (val.includes(id)) actualSearch = rank;
                        });
                    });
                };
            }
        } else if (type == "bangumi") {
            root.episodes.forEach((episode, rank) => {
                mediaData[rank] = new MediaData(
                    episode.share_copy, episode.share_copy,
                    episode.cover, episode.duration,
                    episode.aid, episode.cid, type,
                    rank + 1, date(root.season_title), null,
                    episode.badge_info
                );
                appendMediaBlock(mediaData[rank])
                Object.values(episode).forEach(id => {
                    if (val.includes(id)) actualSearch = rank;
                });
            });
        } else if (type == "audio") {
            multiSelectBtn.removeClass('active');
            videoListTabHead.find('.video-block-name').text('音质')
            .find('.video-block-page').text('等级');
            mediaData[0] = new MediaData(
                root.title, root.intro, 
                root.cover, root.duration, 
                root.id, root.cod, type,
                0, root.title, null
            );
            getMusicUrl(root.id, 3).then(async response => {
                response.data.qualities.reverse().forEach(quality => {
                    appendMediaBlock(mediaData[0], quality);
                });
            });    
        }
        const target = videoList.find('.video-block').eq(actualSearch);
        videoList.attr("last", actualSearch);
        setTimeout(() => {
            if (target.length) {
                videoList.animate({
                    scrollTop: target.offset().top - videoList.offset().top + videoList.scrollTop() - (videoList.height() - target.height())/2
                }, 1000, 'easeOutQuint');
                target.find('.multi-select-box-org').prop('checked', true).trigger('change');
            }
        }, 100);
        $('.down-page-start-process').off('click').on('click', () => {
            invoke('process_queue');
            $('.down-page-sel.doing').click();
        });
    } else {
        handleErr(root);
        backward();
        return null;
    }
}

function handleMultiSelect() {
    multiSelectBtn.off('click').on('click', () => {
        multiSelectBtn.find('i').toggleClass('fa-regular fa-solid');
        multiSelectBtn.toggleClass('checked');
        multiSelectNext.toggleClass('active');
        videoList.find('.video-block-only, .video-block-multi').remove();
        $('.video-block, .video-list-tab-head').toggleClass('multi-select');
    });
    multiSelectNext.off('click').on('click', async () => {
        if (selectedMedia.length > 50 || selectedMedia.length < 1) {
            iziToast.error({
                icon: 'fa-regular fa-circle-exclamation',
                layout: '2', title: `警告`,
                message: selectedMedia.length < 1 ?
                "请至少选择一个视频" : 
                "单次最多只能下载50个视频, 超出将很大可能触发风控"
            })
            return;
        }
        for (let i = 0; i < selectedMedia.length; i++) {
            const data = selectedMedia[i];
            const details = await getPlayUrl(data.id, data.cid, data.type, null);
            const dms = appendDimensionList(details, data.type, "multi", true, null);
            const ads = appendAudioList(details, data.type, "multi", true, null);
            const quality = new CurrentSel(...dms, ...ads);
            const res = matchDownUrl(details.data || details.result, quality, "multi", "video");
            handleDown(...res, data);
            if (i === 0) sidebar.downPage.click();
        }
    });
}

async function appendSteinNode(info, graph_version, edge_id, type) {
    videoList.removeClass('active');
    const params = new URLSearchParams({
        aid: info.aid, graph_version, edge_id
    });
    loadingBox.addClass('active');
    const response = (await http.fetch(`https://api.bilibili.com/x/stein/edgeinfo_v2?${params.toString()}`,
    { headers })).data;
    loadingBox.removeClass('active');
    videoList.find('.stein-option, .video-block, .video-block-only, .video-block-multi')
    .removeClass('active').remove().end().addClass('active');
    $('.stein-tree').addClass('active').find('.stein-tree-node').remove();
    const current = response.data.story_list.find(item => item.edge_id === edge_id) || response.data;
    mediaData.push(new MediaData(
        current.title, info.desc, 
        info.pic, "未知", info.aid,
        current.cid, type,
        mediaData.length + 1, info.title,
        null
    ));
    appendMediaBlock(mediaData.at(-1));
    for (const story of response.data.story_list) {
        const nodeElm = $('<div>').addClass('stein-tree-node').html($('<i>').addClass('fa-regular'));
        if (story.is_current) {
            nodeElm.addClass('checked');
            nodeElm.find('i').addClass('fa-check');
        } else nodeElm.find('i').addClass('fa-location-dot');
        $('.stein-tree').append(nodeElm);
        nodeElm.on('click', () => {
            appendSteinNode(info, graph_version, story.edge_id);
            return null;
        })
    }
    videoList.append($('<div>').addClass('stein-option'));
    const questions = response.data.edges.questions;
    const choices_root = questions ? questions[0].choices : null;
    if (!choices_root) return null;
    for (const choice of choices_root) {
        const btn = $('<button>').addClass('stein-option-btn').html(choice.option);
        if (choice.condition) {
            let vari = response.data.hidden_vars.reduce((acc, item) => {
                acc[item.id_v2] = item.value;
                return acc;
            }, {});
            let condition = choice.condition.replace(/\$[\w]+/g, (match) => {
                return vari.hasOwnProperty(match) ? vari[match] : match;
            });
            if (eval(condition)) $('.stein-option').append(btn);
        } else $('.stein-option').append(btn);
        btn.on('click', () => {
            appendSteinNode(info, graph_version, choice.id, type);
            return null;
        })
    }
}

async function initActionBlock(action, block, data) {
    const videoBlockTitle = $('<div>').addClass('video-block-title').text(action=="multi"?"解析音视频":"更多解析");
    const videoBlockAction = $('<div>').addClass(`video-block-${action} active`).append(videoBlockTitle);
    const crossSplit = $('<div>').addClass('video-block-cross-split');
    if (block.next(`.video-block-multi`).length || block.next(`.video-block-only`).length) {
        block.next().remove();
    }
    if (multiSelectBtn.hasClass('checked')) {
        iziToast.error({
            icon: 'fa-regular fa-circle-exclamation',
            layout: '2', title: `警告`,
            message: "多选状态下请点击右下角 “确认/结算” 结算"
        });
        return null;    
    }
    block.after(videoBlockAction);
    loadingBox.addClass('active');
    const details = await getPlayUrl(data.id, data.cid, data.type, videoBlockAction);
    loadingBox.removeClass('active');
    if (details.code !== 0) return null;
    if (action == "only") {
        appendMoreList(data, videoBlockAction);
        videoBlockAction.append(crossSplit.clone());
    }
    appendDimensionList(details, data.type, action, false, videoBlockAction);
    if (action == "only") videoBlockAction.append(crossSplit);
    appendAudioList(details, data.type, action, false, videoBlockAction);
    async function down(fileType) {
        const quality = new CurrentSel(...currentSel);
        const res = matchDownUrl(details.data || details.result, quality, action, fileType, data);
        handleDown(...res, data);
        sidebar.downPage.click();
    }
    const videoDownBtn = videoBlockAction.find(`.video-block-video-down-btn.${action}`);
    const audioDownBtn = videoBlockAction.find(`.video-block-vaudio-down-btn.${action}`);
    audioDownBtn.on('click', () => down("audio"));
    videoDownBtn.on('click', () => down("video"));
};

function appendMediaBlock(root, audio) { // 填充视频块
    const isVideo = root.type != "audio";
    const page = $('<div>').addClass('video-block-page').text(isVideo ? root.rank : audio.type + 1);
    const badge = root.badge?.text ? $('<div>').addClass('video-block-badge').html(root.badge.text).css("background", root.badge.bg_color_night) : ""; 
    const name = $('<div>').addClass('video-block-name').html(isVideo ? root.title : audio.desc + "&emsp;|&emsp;" + audio.bps).append(badge);
    const duration = $('<div>').addClass('video-block-duration').text(format.duration(root.duration, root.type));
    const block = $('<div>').addClass('video-block');
    const checkLabel = $('<label>').addClass('multi-select-box');
    const checkBox = $('<input>').attr('type', 'checkbox').addClass('multi-select-box-org');
    const checkBoxMark = $('<span>').addClass('multi-select-box-checkmark');
    checkLabel.append(checkBox, checkBoxMark);
    const operates = $('<div>').addClass('video-block-operates');
    const split = $('<div>').addClass('video-block-split');
    const getCoverBtn = $('<button>').addClass('video-block-getcover-btn video-block-operates-item')
    .html(`<i class="fa-solid fa-image icon-small"></i>解析封面`);
    const getMultiBtn = $('<button>').addClass('video-block-getvideo-btn video-block-operates-item')
    .html(`<i class="fa-solid fa-file-video icon-small"></i>解析音视频`);
    const getAudioBtn = $('<button>').addClass('video-block-getaudio-btn video-block-operates-item')
    .html(`<i class="fa-solid fa-file-audio icon-small"></i>解析音频`);
    const getMoreBtn = $('<button>').addClass('video-block-getmore-btn video-block-operates-item')
    .html(`<i class="fa-solid fa-anchor icon-small"></i>更多解析`);
    operates.append(getCoverBtn);
    isVideo ? operates.append(getMultiBtn, getMoreBtn) : operates.append(getAudioBtn);
    block.append(checkLabel, page, split, name, split.clone(), duration, split.clone(), operates).appendTo(videoList);
    checkBox.on('change', function() {
        const isChecked = $(this).prop('checked');
        handleSelect(isChecked ? "add" : "remove");
        block.css("background-color", isChecked ? "#414141" : "#3b3b3b9b");
    });
    block.on('click', function(e) {
        if (multiSelectBtn.hasClass('checked') && !$(e.target).hasClass('video-block-operates-item')) {
            const current = parseInt(block.find('.video-block-page').text()) - 1;
            const index = parseInt(videoList.attr("last"));
            if (e.shiftKey && !isNaN(index)) {
                const start = Math.min(index, current);
                const end = Math.max(index, current);
                $('.multi-select-box-org').slice(start, end + 1).prop('checked', true).trigger('change');
            } else {
                checkBox.prop('checked', !checkBox.prop('checked')).trigger('change');
            }
            videoList.attr("last", current);
        }
    });
    function handleSelect(action) {
        if (action === "add") {
            if (!selectedMedia.some(video => video.rank == root.rank)) {
                selectedMedia.push(root);
            }
        } else if (action === "remove") {
            selectedMedia = selectedMedia.filter(video => video.rank !== root.rank);
        }
    }
    getCoverBtn.on('click', () => shell.open(root.pic.replace(/http/g, 'https')));
    getMultiBtn.on('click', () => initActionBlock("multi", block, root));
    getMoreBtn.on('click', () => initActionBlock("only", block, root));
    getAudioBtn.on('click', async () => {
        const details = await getMusicUrl(root.id, audio.type);
        const res = matchDownUrl({dash:{audio:details.data.cdns}}, audio.bps.replace("kbit/s", "K"), "music", "audio");
        handleDown(...res, root);
        sidebar.downPage.click();
});
}

async function appendDownPageBlock(data, indexId, target, action) { // 填充下载块
    const desc = data.desc;
    const pic = data.pic;
    const displayName = data.title;
    const infoBlock = $('<div>').attr("id", indexId).addClass('down-page-info');
    const infoCover = $('<img>').addClass('down-page-info-cover').attr("src", pic.replace("http:", "https:") + '@256h')
    .attr("referrerPolicy", "no-referrer").attr("draggable", false);
    const infoData = $('<div>').addClass('down-page-info-data');
    const infoDesc = $('<div>').addClass('down-page-info-desc').html(desc.replace(/\n/g, '<br>'));
    const infoTitle = $('<div>').addClass('down-page-info-title').html(displayName).css('max-width', `100%`);
    const infoProgCont = $('<div>').addClass('down-page-info-progress-cont');
    const infoProgText = $('<div>').addClass('down-page-info-progress-text').html(function() {
        switch(action) { case "doing": return "等待同步"; case "complete": return "下载完毕"; default: return "等待下载"; }
    });
    const openDirBtn = $('<button>').addClass('down-page-info-btn').html(`<i class="fa-solid fa-file-${displayName.includes("mp3")?'audio':'video'} icon-small"></i>定位文件`);
    const stopBtn = $('<button>').addClass('down-page-info-btn').html(`<i class="fa-solid fa-circle-stop icon-small"></i>暂停`);
    const playBtn = $('<button>').addClass('down-page-info-btn').html(`<i class="fa-solid fa-play icon-small"></i>继续`);
    infoProgCont.append(openDirBtn, stopBtn, playBtn, infoProgText);
    const infoProgressBar = $('<div>').addClass('down-page-info-progress-bar').css("width", action == "complete" ? "100%" : 0);
    const infoProgress = $('<div>').addClass('down-page-info-progress').html(infoProgressBar);
    infoBlock.append(infoCover, infoData.append(infoTitle, infoDesc, infoProgCont, infoProgress)).appendTo(target);
    openDirBtn.on('click', () => {
        if (action == "complete") {
            invoke('open_select', { indexId: infoBlock.attr("id") });
        } else iziToast.error({
            icon: 'fa-regular fa-circle-exclamation',
            layout: '2', title: `下载`,
            message: `请等待下载完毕`
        });
    });
    function handleAction(type) {
        if (action == "doing" && infoBlock.attr("gid")) {
            invoke(`handle_download`, { gid: infoBlock.attr("gid"), indexId, action: type })
        }
    }
    stopBtn.on('click', () => handleAction("stop"));
    playBtn.on('click', () => handleAction("start"));
}

function appendMoreList(data, block) { // 填充更多解析
    const dms = $('<div>').addClass("video-block-opt-cont more");
    const text = $('<div>').addClass("video-block-opt-text").text("更多解析");
    const split = $('<div>').addClass("video-block-split");
    const opt = $('<div>').addClass("video-block-opt more");
    const dmhk = $('<button>').addClass("video-block-opt-item history-danmaku").html("<i class='fa-solid fa-meteor icon-small'></i>历史弹幕");
    const aism = $('<button>').addClass("video-block-opt-item ai-summary").html("<i class='fa-solid fa-microchip-ai icon-small'></i>视频AI总结");
    dms.append(text, split, opt).appendTo(block);
    opt.append(dmhk, aism);
    async function dm(url) {
        return new Promise(async (resolve, reject) => {
            try {
                // https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/grpc_api/bilibili/community/service/dm/v1/dm.proto
                protobuf.load('../proto/dm.proto', async function(err, root) {
                    const DmSegMobileReply = root.lookupType("bilibili.community.service.dm.v1.DmSegMobileReply");
                    loadingBox.addClass('active');
                    const response = await http.fetch(url,{ headers, responseType: http.ResponseType.Binary });
                    loadingBox.removeClass('active');
                    const message = DmSegMobileReply.decode(new Uint8Array(response.data));
                    resolve(message.elems)
                });
            } catch(err) {
                console.error(err);
                reject(err)
            }
        })
    }
    function noLogin() {
        if (!userData.isLogin) {
            iziToast.error({
                icon: 'fa-solid fa-circle-info',
                layout: '2', title: '解析',
                message: '该模块需要登录',
            });
            return true;
        } else return false;
    }
    function saved() {
        Swal.fire({
            title: '<strong>数据结构</strong>',
            icon: 'info',
            html: '有关数据结构请查看 <a href="https://blog.btjawa.top/posts/bilitools#danmakuelem" target="_blank">BiliTools#DanmakuElem</a>',
        })
        iziToast.info({
            icon: 'fa-solid fa-circle-info',
            layout: '2', title: '弹幕',
            message: 'JSON保存成功~',
        });
        return null;
    }
    async function refresh(month) {
        const params0 = new URLSearchParams({
            type: 1, oid: data.cid, month
        });
        loadingBox.addClass('active');
        const dateList = (await http.fetch(`https://api.bilibili.com/x/v2/dm/history/index?${params0.toString()}`, { headers })).data;
        loadingBox.removeClass('active');
        dms.find('.history-date-cont').remove();
        const dateCont = $('<div>').addClass('history-date-cont active');
        const dtm = month.split("-");
        const dateHeader = $('<div>').addClass('history-date-header')
        .append(`<i class="fa-solid fa-chevron-left"></i>
        <span>${dtm[0]}年&nbsp;${dtm[1]}月</span>
        <i class="fa-solid fa-chevron-right"></i>`);
        const split = $('<div>').addClass('video-block-cross-split');
        const dateBody = $('<div>').addClass('history-date-body');
        dateCont.empty().append(dateHeader, split, dateBody).appendTo(dms);
        let lastRow;
        let year = parseInt(dtm[0]);
        let monthIndex = parseInt(dtm[1]);
        function update(dir) {
            const l = dir === "left";
            if (monthIndex === (l ? 1 : 12)) {
                year += l ? -1 : 1;
                monthIndex = l ? 12 : 1;
            } else { monthIndex += l ? -1 : 1; }
            refresh(`${year}-${String(monthIndex).padStart(2, '0')}`);
        }
        dateHeader.find('.fa-chevron-left').on('click', () => update("left"));
        dateHeader.find('.fa-chevron-right').on('click', () => update("right"));
        if (dateList.data) {
            dateList.data.forEach((date, index) => {
                if (index % 7 === 0) {
                    lastRow = $('<div>').addClass('history-date-body-row');
                    dateBody.append(lastRow);
                }
                const col = $('<div>').addClass('history-date-body-col').html(date.split("-")[2]);
                lastRow.append(col);
                col.on('click', async () => {
                    const params1 = new URLSearchParams({
                        type: 1, oid: data.cid, date
                    });
                    loadingBox.addClass('active');
                    const url = `https://api.bilibili.com/x/v2/dm/web/history/seg.so?${params1.toString()}`;
                    loadingBox.removeClass('active');
                    const content = JSON.stringify(await dm(url), null, 2);
                    const selected = await saveFile({
                        filters: [{ name: 'JSON 文件', extensions: ['json'] }],
                        defaultPath: date + '_' + format.filename(data.title)
                    });
                    if (selected) {
                        invoke('save_file', { content, path: selected });
                        saved();
                    }
                })
            });
        }
    }
    dmhk.on('click', async function() {
        if (noLogin()) return null;
        const date = new Date();
        let month = date.getMonth() + 1;
        let day = date.getDate();
        month = month < 10 ? '0' + month : month;
        day = day < 10 ? '0' + day : day;
        const dateParts = [date.getFullYear(), month, day];
        refresh(dateParts[0] + '-' + dateParts[1]);
        $(document).off('click').on('click', (e) => {
            if (!$(e.target).closest(".history-date-cont").length && !$(e.target).hasClass('swal2-confirm')) dms.find('.history-date-cont').removeClass('active');
        });
    });
    aism.on('click', async function() {
        const params = ({
            aid: data.id, cid: data.cid, up_mid: userData.mid || 0, 
        });
        const signature = await verify.wbi(params);
        loadingBox.addClass('active');
        const response = await http.fetch(`https://api.bilibili.com/x/web-interface/view/conclusion/get?${signature}`, { headers });
        loadingBox.removeClass('active');
        const root = response.data;
        if (root.data.code !== 0) {
            emit("error", `${root.data.code === 1 ? "未找到可用无摘要" : "本视频不支持AI摘要"}`)
            return null;
        }
        const summary = $('<div>').addClass('ai-summary-cont');
        const summaryHeader = $('<div>').addClass('ai-summary-header').html(
        '<img src="../assets/ai-summary-icon.svg" class="icon-small" draggable=false>' + '<span>已为你生成视频总结</span>')
        .append('<i class="fa-regular fa-xmark"></i>');
        const summaryBody = $('<div>').addClass('ai-summary-body');
        const abs = $('<div>').addClass('ai-child-abs').html(root.data.model_result.summary);
        const outl = $('<div>').addClass('ai-child-outline');
        const split = $('<div>').addClass('video-block-cross-split');
        summary.append(summaryHeader, split, summaryBody.append(abs, outl)).appendTo(dms);
        summaryHeader.find('i').on('click', () => summary.remove());
        for (const outline of root.data.model_result.outline) {
            const title = $('<div>').addClass('ai-child-title').html(outline.title);
            const section = $('<div>').addClass('ai-child-section').append(title);
            title.on('click', () => bilibili(outline.timestamp));
            for (const part of outline.part_outline) {
                const bullet = $('<div>').addClass('ai-child-section-bullet')
                .append($('<span>').html(format.duration(part.timestamp))).append(part.content);
                section.append(bullet);
                bullet.on('click', () => bilibili(part.timestamp))
            }
            outl.append(section);
        }
    })
}

function appendDimensionList(details, type, action, ms, block) { // 填充分辨率
    const root = type == "bangumi" ? details.result : details.data;
    const dms = $('<div>').addClass("video-block-opt-cont dimension");
    const text = $('<div>').addClass("video-block-opt-text").text("分辨率/画质");
    const split = $('<div>').addClass("video-block-split");
    const opt = $('<div>').addClass("video-block-opt dimension");
    dms.append(text, split, opt).appendTo(block);
    const maxQuality = Math.max(...root.dash.video.map(v => v.id));
    const qualityList = root.accept_quality.filter(quality => quality <= maxQuality);
    for (const quality of qualityList) {
        const qualityItem = root.support_formats.find(format => format.quality === quality);
        const description = qualityItem.display_desc + (qualityItem.superscript ? `-${qualityItem.superscript}` : '');
        const currentBtn = $('<button>').addClass(`video-block-opt-item dimension`);
        const currentIcon = $('<i>').addClass(`fa-solid fa-${quality <= 32 ? 'standard':'high'}-definition icon-small`);
        currentBtn.append(currentIcon, qualityItem.new_description);
        opt.append(currentBtn);
        if (quality == maxQuality) {
            currentBtn.addClass('checked');
            currentSel[0] = quality;
            currentSel[1] = description;
            const codec = appendCodecList(qualityItem, "init", action, ms, block);
            if (ms) return [quality, description, ...codec];
        }
        currentBtn.on('click', function() {
            block.find('.video-block-opt-item.dimension').removeClass('checked');
            $(this).addClass('checked');
            currentSel[0] = quality;
            currentSel[1] = qualityItem.display_desc;
            appendCodecList(qualityItem, "update", action, ms, block);
        });
    }
};

function appendCodecList(details, type, action, ms, block) { // 填充编码格式
    if (!details.codecs) return null;
    const dms = $('<div>').addClass("video-block-opt-cont codec");
    const text = $('<div>').addClass("video-block-opt-text").text("编码格式");
    const split = $('<div>').addClass("video-block-split");
    const opt = $('<div>').addClass("video-block-opt codec");
    const downBtn = $('<button>').addClass(`video-block-video-down-btn ${action}`).text('下一步');
    if (!ms) block.find('.video-block-opt.codec').remove();
    if (type == "init" && !ms) dms.append(text, split, opt).appendTo(block);
    else $('.video-block-opt-cont.codec').append(opt)
    const codecsList = details.codecs.map(codec => ({
        codec, 
        priority: (codec.includes('avc') ? 1 : codec.includes('hev') ? 2 : 3)
    }))
    .sort((a, b) => a.priority - b.priority);
    for (let i = 0; i < codecsList.length; i++) {
        const codec = codecsList[i].codec;
        const description = format.codec(codec);
        const currentBtn = $('<button>').addClass(`video-block-opt-item codec`);
        const currentIcon = $('<i>').addClass(`fa-solid fa-rectangle-code icon-small`);
        currentBtn.append(currentIcon, description);
        opt.append(currentBtn);
        if (codec == 0) continue;
        if (i === 0) {
            currentBtn.addClass('checked');
            currentSel[2] = codec;
            currentSel[3] = description;
            if (ms) return [codec, description];
        }
        currentBtn.on('click', function() {
            block.find('.video-block-opt-item.codec').removeClass('checked');
            $(this).addClass('checked');
            currentSel[2] = codec;
            currentSel[3] = description
        });
    }
    if (action == "only") opt.append(downBtn)
}

function appendAudioList(details, type, action, ms, block) { // 填充音频
    const root = type == "bangumi" ? details.result : details.data;
    const dms = $('<div>').addClass("video-block-opt-cont audio");
    const text = $('<div>').addClass("video-block-opt-text").text("分辨率/画质");
    const split = $('<div>').addClass("video-block-split");
    const opt = $('<div>').addClass("video-block-opt audio");
    const downBtn = $('<button>').addClass(`video-block-${action=="multi"?'video':'vaudio'}-down-btn ${action}`).text('下一步');
    dms.append(text, split, opt).appendTo(block);
    const qualityDesc = {
        30216: "64K",
        30232: "132K",
        30280: "192K",
        30250: "杜比全景声",
        30251: "Hi-Res无损",
    }
    const qualityList = root.dash.audio.map(audioItem => audioItem.id).sort((a, b) => b - a);
    if (root.dash.dolby?.audio) {
        qualityList.unshift(...root.dash.dolby.audio.map(audioItem => audioItem.id).sort((a, b) => b - a))
    }
    if (root.dash.flac && root.dash.flac.display) {
        if (!root.dash.flac.audio) qualityList.unshift(0);
        else qualityList.unshift(root.dash.flac.audio.id);
    }
    for (let i = 0; i < qualityList.length; i++) {
        const quality = qualityList[i];
        const description = qualityDesc[quality];
        const currentBtn = $('<button>').addClass(`video-block-opt-item audio`);
        const currentIcon = $('<i>').addClass(`fa-solid fa-${quality==0?'music-note-slash':'audio-description'} icon-small`);
        currentBtn.append(currentIcon, description);
        opt.append(currentBtn);
        if (quality == 0) {
            currentBtn.css('cursor', 'not-allowed');
            continue;
        } else if (ms || !block.find('.video-block-opt-item.audio').hasClass('checked')) {
            currentBtn.addClass('checked');
            currentSel[4] = quality;
            currentSel[5] = description;
            if (ms) return [quality, description];
        };
        currentBtn.on('click', function() {
            item.removeClass('checked');
            $(this).addClass('checked');
            currentSel[4] = quality;
            currentSel[5] = description;
        });
    }
    opt.append(downBtn)
}

async function userProfile() {
    if (!userData.isLogin) { login(); return null; }
    currentElm.push(".user-profile");
    $('.user-profile').addClass('active');
    const detailData = await http.fetch(`https://api.bilibili.com/x/web-interface/card?mid=${userData.mid}&photo=true`,
    { headers });
    if (detailData.ok) {
        const details = detailData.data;
        $('.user-profile-img').attr("src", details.data.space.l_img.replace("http:", "https:") + '@200h');
        $('.user-profile-avatar').attr("src", details.data.card.face + '@256h');
        $('.user-profile-name').html(details.data.card.name);
        $('.user-profile-desc').html(details.data.card.sign);
        $('.user-profile-sex').attr("src", `./assets/${details.data.card.sex=="男"?'male':'female'}.png`);
        $('.user-profile-level').attr("src", `./assets/level/level${details.data.card.level_info.current_level}${details.data.card.is_senior_member?'_hardcore':''}.svg`);
        if (details.data.card.vip) {
            $('.user-profile-bigvip').css("display", "block");
            $('.user-profile-bigvip').attr("src", details.data.card.vip.label.img_label_uri_hans_static);
        }
        $('.user-profile-coins').html('<a>硬币</a><br>' + userData.coins);
        $('.user-profile-subs').html('<a>关注数</a><br>' + format.stat(details.data.card.friend));
        $('.user-profile-fans').html('<a>粉丝数</a><br>' + format.stat(details.data.card.fans));
        $('.user-profile-likes').html('<a>获赞数</a><br>' + format.stat(details.data.like_num));
        $('.user-profile-exit').off('click').on('click', async () => {
            loadingBox.addClass('active');
            await invoke('exit').then(() => loadingBox.removeClass('active'));
        });
    }
}

async function scanLogin() {
    invoke('stop_login');
    $('.login-qrcode-tips').removeClass('active');
    $('.login-scan-loading').addClass('active');
    const response = (await http.fetch('https://passport.bilibili.com/x/passport-login/web/qrcode/generate', { headers })).data;
    $('.login-scan-loading').removeClass('active');
    const { qrcode_key, url } = response.data;
    $('#login-qrcode').empty();
    new QRCode("login-qrcode", {
        text: url,
        width: 180,
        height: 180,
        colorDark: "#c4c4c4",
        colorLight: "#3b3b3b9b",
        correctLevel: QRCode.CorrectLevel.H,
    });
    $('#login-qrcode').removeAttr("title");
    $('.login-qrcode-box').off('mouseenter').on('mouseenter', function() {
        if (!$('.login-qrcode-tips').hasClass('active')) {
            $('.login-scan-tips').css('opacity', '1');
            $(this).css('opacity', '0');
        }
    });
    $('.login-qrcode-box').off('mouseleave').on('mouseleave', function() {
        if (!$('.login-qrcode-tips').hasClass('active')) {
            $('.login-scan-tips').css('opacity', '0');
            $(this).css('opacity', '1');
        }
    });
    try {
        await invoke('scan_login', {qrcodeKey: qrcode_key});
    } catch(err) {
        $('.login-qrcode-box').off('click').on('click', () => {
            scanLogin();
            return null;
        });
    }
}

async function pwdLogin() {
    const toggleEye = $('.login-pwd-item-eye');
    const loginBtn = $('.login-pwd-login-btn');
    const pwdInput = $('#password-input');
    toggleEye.off('click').on('click', function() {
        const e = toggleEye.hasClass('fa-eye');
        toggleEye.css("margin", e ? "0": "0 1px");
        toggleEye.toggleClass('fa-eye fa-eye-slash');
        pwdInput.attr("type", e ? "text" : "password");
    });
    loginBtn.off('click').on('click', async function() {
        try {
            const username = $('#username-input').val().toString();
            const password = $('#password-input').val().toString();
            if (!username || !password) throw new Error('请输入账号与密码');
            const rsaKeys = (await http.fetch('https://passport.bilibili.com/x/passport-login/web/key', { headers })).data;
            const { hash, key } = rsaKeys.data;
            const enc = new JSEncrypt();
            enc.setPublicKey(key);
            const encedPwd = enc.encrypt(hash + password);
            loadingBox.addClass('active');
            const {token, challenge, validate, seccode} = await captcha();
            await invoke('pwd_login', { username, password: encedPwd, token, challenge, validate, seccode });
            loadingBox.removeClass('active');
        } catch(err) {
            console.error(err);
            iziToast.error({
                icon: 'fa-solid fa-circle-info',
                layout: '2', title: '登录',
                message: err
            });
        }
    });
    pwdInput.off('keydown').on('keydown', (e) => {
        if (e.keyCode === 13) loginBtn.click();
    });
}

async function smsLogin() {
    const prefix = (await http.fetch('https://api.bilibili.com/x/web-interface/zone', { headers })).data.data.country_code || 86;
    const areaCodes = (await http.fetch('https://passport.bilibili.com/web/generic/country/list')).data;
    const allCodes = [...areaCodes.data.common, ...areaCodes.data.others];
    allCodes.sort((a, b) => a.id - b.id);
    const codeList = $('.login-sms-area-code-list');
    allCodes.forEach(code => {
        const codeElement = $('<div>').addClass('login-sms-item-code-item checked')
            .html(`<span style="float:left">${code.cname}</span>
            <span style="float:right">+${code.country_id}</span>`);
        codeList.append(codeElement);
        codeElement.on('click', () => {
            codeList.prev().find('.login-sms-item-text').html(codeElement.find('span').last().text()
            + '&nbsp;<i class="fa-solid fa-chevron-down"></i>');
            codeList.find('.login-sms-item-code-item').removeClass('checked');
            codeList.removeClass('active');
        });
        if (code.country_id == prefix) codeElement.click();
    });
    codeList.prev().find('.login-sms-item-text').on('click', (e) => {
        codeList.addClass('active');
        e.stopPropagation();
    });
    $(document).off('click').on('click', (e) => {
        if (!$(e.target).closest(".login-sms-area-code-list").length) codeList.removeClass('active');
    });
    function handleMsg(msg) { iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2', title: '登录',
        message: msg })}
    try {
        let key, canSend = true;
        $('.login-sms-getcode-btn').off('click').on('click', async function() {
            if (!canSend) return null;
            const tel = $('#tel-input').val().toString();
            if (!tel) { handleMsg("请输入手机号"); return null;}
            else if ((tel.match(/^1[3456789]\d{9}$/) && $('.login-sms-item-text').text().includes('+86'))
            || (!$('.login-sms-item-text').text().includes('+86') && tel)) {
                const {token, challenge, validate, seccode} = await captcha();
                const params = new URLSearchParams({
                    cid: $('.login-sms-item-text').text().replace(/[^0-9]/g, ''),
                    tel, source: 'main-fe-header', token,
                    challenge, validate, seccode
                });
                const response = (await http.fetch(`https://passport.bilibili.com/x/passport-login/web/sms/send?${params.toString()}`,
                { headers, method: 'POST' })).data;
                if (response.code !== 0) { handleMsg(response.message); return null; }
                canSend = false;
                key = response.data.captcha_key;
                let timeout = 60;
                $('.login-sms-getcode-btn').text(`重新发送(${timeout})`).addClass("disabled");
                const timer = setInterval(() => {
                    $('.login-sms-getcode-btn').text(`重新发送(${--timeout})`);
                    if (timeout === 0) {
                        clearInterval(timer);
                        $('.login-sms-getcode-btn').text('重新发送').removeClass("disabled");
                        canSend = true;
                    }
                }, 1000);
            }
        });
        $('.login-sms-login-btn').off('click').on('click', async function() {
            const tel = $('#tel-input').val().toString();
            const code = $('#sms-input').val().toString();
            if (!tel || !code || !key) handleMsg(!tel || !code ? "请输入手机号与验证码" : "请先获取验证码")
            loadingBox.addClass('active');
            await invoke('sms_login', { tel, code, key, cid: $('.login-sms-item-text').text().replace(/[^0-9]/g, '') });
            loadingBox.removeClass('active');
        });
    } catch(err) {
        emit("error", err);
        console.error(err);
    }
}

async function login() {
    if (userData.isLogin) return null;
    currentElm.push(".login");
    $('.login').addClass('active');
    scanLogin();
    $('.login-tab-pwd').off('click').on('click', async () => {
        $('.login-sms, .login-tab-sms').removeClass('active');
        $('.login-pwd, .login-tab-pwd').addClass('active');
    });
    $('.login-tab-sms').off('click').on('click', async () => {
        $('.login-sms, .login-tab-sms').addClass('active');
        $('.login-pwd, .login-tab-pwd').removeClass('active');
    });
    $('.login-tab-pwd').click();
    pwdLogin();
    smsLogin();
}

async function captcha() {
    return new Promise(async resolve => {
        const response = (await http.fetch('https://passport.bilibili.com/x/passport-login/captcha?source=main-fe-header', { headers })).data;
        const { token, geetest: { challenge, gt } } = response.data;
        // 更多前端接口说明请参见：http://docs.geetest.com/install/client/web-front/
        await initGeetest({
            gt: gt,
            challenge: challenge,
            offline: false,
            new_captcha: true,
            product: "bind",
            width: "300px",
            https: true
        }, function (captchaObj) {
            captchaObj.onReady(function () {
                captchaObj.verify();
            }).onSuccess(function () {
                const result = captchaObj.getValidate();
                const validate = result.geetest_validate;
                const seccode = result.geetest_seccode;
                return resolve({token, challenge, validate, seccode});
            })
        });
    })
        
}

function downPage() {
    const sel = $('.down-page-sel');
    sel.on('click', (event) => {
        const target = $(event.target).closest('.down-page-sel');
        const type = target.attr('class').split(/\s+/)[1];
        sel.removeClass('active');
        $('.down-page-child').removeClass('active');
        target.addClass('active');
        $(`.down-page-child.${type}`).addClass('active');
    });
}

function settings() {
    async function handleSave(set, input) {
        if (input) {
            const selected = await openFile({ directory: true });
            if (selected) {
                input.val(selected)
                iziToast.info({
                    icon: 'fa-solid fa-circle-info',
                    layout: '2', title: '设置',
                    message: `已保存设置 - ${set}`,
                });
            };
        }
        invoke('rw_config', {action: "save", sets: {
            max_conc: parseInt($('.settings-page-options input[name="max-conc"]:checked').attr('id').replace(/[^\d]/g, "")),
            default_dms: 0,
            default_ads: 0,    
            temp_dir: tempDirPath.val(),
            down_dir: downDirPath.val()
        }});
    }
    $('.settings-side-bar-background').on('click', (event) => {
        const target = $(event.target).closest('.settings-side-bar-background');
        const type = target.attr('class').split(/\s+/)[1];
        $('.settings-side-bar-background').removeClass('checked');
        $('.settings-page').removeClass('active');
        target.addClass('checked');
        $(`.settings-page.${type}`).addClass('active');
        if (type === "_info") {
            const svg = $('.settings-page._info').find('svg').css('display', 'none');
            setTimeout(() => svg.append(svg.find('style').detach()).css('display', 'block'), 1);
        }
    });
    $('.settings-page-options input[name="max-conc"]').on('click', () => {
        handleSave("最大并发下载数");
    });
    $('.down-dir-path-openbtn').on('click', () => handleSave("存储路径", downDirPath));
    $('.temp-dir-path-openbtn').on('click', () => handleSave("临时文件存储路径", tempDirPath));
}

async function getUserProfile(mid) {
    sidebar.userProfile.attr('data-after', mid=="0" ? "登录" : '主页');
    invoke('insert_cookie', { cookieStr: `_uuid=${verify.uuid()}; Path=/; Domain=bilibili.com` });
    const signature = await verify.wbi({ mid });
    const details = (await http.fetch(`https://api.bilibili.com/x/space/wbi/acc/info?${signature}`, { headers })).data;
    userData = { mid, coins: null, isLogin: false };
    if (currentElm.at(-1) == ".login" || currentElm.at(-1) == ".user-profile") {
        backward();
    }
    $('.user-avatar').attr('src', mid=="0" ? "./assets/default.jpg" : details.data.face);
    $('.user-name').text( mid=="0" ? "登录" : details.data.name);
    if (details.code === 0 && details.data.vip.type != 0 && details.data.vip.avatar_subscript == 1) {
        $('.user-vip-icon').css('display', 'block');
    } else $('.user-vip-icon').css('display', 'none');
    const dbc = debounce(userProfile, 1000);
    sidebar.userProfile.off('click').on('click', dbc);
    if (mid != "0") {
        userData = { mid, coins: details.data.coins, isLogin: true };
        iziToast.info({
            icon: 'fa-solid fa-circle-info',
            layout: '2',
            title: '登录',
            message: `登录成功~`,
        });
        invoke('insert_cookie', { cookieStr: `bili_ticket=${(await verify.bili_ticket()).data.ticket}; Path=/; Domain=bilibili.com` });
        checkRefresh();
    }
}

once("settings", async (e) => {
    const p = e.payload;
    downDirPath.val(p.down_dir);
    tempDirPath.val(p.temp_dir);
    $(`#max-conc-${p.max_conc}`).click();
});

listen("user-mid", async (e) => getUserProfile(e.payload));

listen("headers", async (e) => headers = e.payload);

listen("login-status", async (event) => {
    if (event.payload == 86090) {
        $('.login-qrcode-tips').addClass('active')
        .html(`<i class="fa-solid fa-check"></i>
        <span>扫码成功</span>
        <span>请在手机上确认</span>`);
    } else if (event.payload == 86038) {
        $('.login-qrcode-tips').addClass('active')
        .html(`<i class="fa-solid fa-rotate-right"></i>
        <span>二维码已过期</span>
        <span>请点击刷新</span>`);
    }
})

listen("download-queue", async (event) => {
    const p = event.payload;
    $('.down-page-info').remove();
    p.waiting.forEach(info => appendDownPageBlock(info.media_data, info.index_id, waitingList, "waiting"));
    p.doing.forEach(info => appendDownPageBlock(info.media_data, info.index_id, doingList, "doing"));
    p.complete.forEach(info => appendDownPageBlock(info.media_data, info.index_id, completeList, "complete"));
    [waitingList, doingList, completeList].forEach(elm => {
        const type = elm.attr('class').split(/\s+/)[1];
        const len = elm.find('.down-page-info').length;
        const sel = $(`.down-page-sel.${type} span`).html(len);
        elm.find('.down-page-empty').toggleClass("active", len === 0);
        sel.toggleClass("active", len !== 0);
        if (elm.hasClass('waiting')) $('.down-page-start-process').toggleClass("active", len !== 0);
    });
});

listen("progress", async (event) => {
    const p = event.payload;
    doingList.children().each(function() {
        if ($(this).attr('id') == p.index_id) {
            $(this).find('.down-page-info-progress-bar').css('width', p.progress);
            if (p.type == "download") {
                if (p.gid) $(this).attr('gid', p.gid);
                $(this).find('.down-page-info-progress-text')
                .html(`${p.file_type=="audio"?"音频":"视频"} - 总进度: ${p.progress}&emsp;剩余时间: ${format.duration(p.remaining, "progress")}&emsp;当前速度: ${p.speed}`);
                if (parseFloat(p.progress) >= 100) {
                    $(this).find('.down-page-info-progress-text')
                    .html(`${p.file_type=="audio"?"音频":"视频"}下载成功`);
                }
            } else if (p.type == "merge") {
                $(this).find('.down-page-info-progress-text')
                .html(`合并音视频 - 已合并帧: ${p.frame}&emsp;fps: ${p.fps}&emsp;已合并至: ${p.out_time}&emsp;速度: ${p.speed}`);
            }
        }
    });
});

listen("error", async (event) => {
    iziToast.error({
        icon: 'fa-solid fa-circle-info',
        layout: '2', title: '错误',
        timeout: 10000,
        message: `遇到错误：${event.payload}`,
    });
})
