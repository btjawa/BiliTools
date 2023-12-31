const { invoke } = window.__TAURI__.tauri;
const { listen, once } = window.__TAURI__.event;
const { shell, dialog, http, app, os } = window.__TAURI__;

const searchBtn = $('.search-btn');
const searchInput = $('#search-input');
const searchElm = $('.search');
const videoList = $('.video-list');
const infoBlock = $('.info');
const loadingBox = $('.loading');
const loginElm = $('.login');
const userProfileElm = $('.user-profile');
const downPageElm = $('.down-page');
const settingsElm = $('.settings');
const multiNextPage = $('.video-multi-next');
const multiSelect = $('.multi-select-btn');
const multiSelectNext = $('.multi-select-next-btn');
const multiSelectDown = $('.multi-select-next-down-btn');
const downDirPath = $('#down-dir-path');
const tempDirPath = $('#temp-dir-path');

let currentFocus = null, currentVideoBlock, currentElm = [], currentSel = [];
let lastChecked = -1;
let userData = [], totalDown = 0;

window.videoData = [];
window.audioData = [];
window.selectedVideos = [];
window.downUrls = [];

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
const videoListTabHead = $('<div>').addClass('video-list-tab-head active').html(
    `<div class="multi-select-box-tab">选中</div>
    <div class="video-block-page">编号</div>
    <div class="video-block-split"></div>
    <div class="video-block-name">标题</div>
    <div class="video-block-split"></div>
    <div class="video-block-duration">时长</div>
    <div class="video-block-split"></div>
    <div class="video-block-operates">下载选项</div>`
);

const downCoverIcon = `<i class="fa-solid fa-image icon-small"></i>`;
const downVideoIcon = `<i class="fa-solid fa-file-video icon-small"></i>`;
const downAudioIcon = `<i class="fa-solid fa-file-audio icon-small"></i>`;

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

class VideoData {
    constructor(title, desc, pic, duration, aid, cid, type, index, ss_title) {
        this.title = title;
        this.desc = desc;
        this.pic = pic;
        this.duration = duration;
        this.aid = aid;
        this.cid = cid;
        this.type = type;
        this.index = index;
        this.ss_title = ss_title;
    }
}

class AudioData {
    constructor(title, desc, pic, duration, sid, ss_title) {
        this.title = title;
        this.desc = desc;
        this.pic = pic;
        this.duration = duration;
        this.sid = sid;
        this.ss_title = ss_title;
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

let headers = {};

function debounce(fn, wait) {
    let bouncing = false;
    return function(...args) {
        if (bouncing) {
            iziToast.error({
                icon: 'fa-regular fa-circle-exclamation',
                layout: '2',
                title: '警告',
                message: `请等待${wait / 1000}秒后再进行请求`
            });
            return;
        }
        bouncing = true;
        setTimeout(() => {
            bouncing = false;
        }, wait);
        fn.apply(this, args);
    };
}

async function selFile(type, multiple = false, filters = []) {
    try {
        const options = {
            multiple,
            directory: type === 'directory'
        };
        if (type !== 'directory') {
            options.filters = filters;
        }
        const selected = await dialog.open(options);
        return selected;
    } catch (error) {
        console.error(error)
        return null;
    }
}

async function getVideoFull(aid, cid, type, action) {
    const params = {
        avid: aid, cid: cid,
        fnval: 4048, fnver: 0,
        fourk: 1
    }
    const signature = await wbiSignature(params);
    let getDetailUrl = type !== "bangumi" 
        ? `https://api.bilibili.com/x/player/wbi/playurl?${signature}`
        : `https://api.bilibili.com/pgc/player/web/playurl?${signature}`;
    const details = (await http.fetch(getDetailUrl,
    { headers })).data;
    if (details.code == 0) {
        if (handleErr(details, type)) {
            currentVideoBlock.next($(`.video-block-${action}`))
            .removeClass('active').remove();
            return;
        }
        return details;
    } else {
        handleErr(details, type);
    }
}

async function getAudioFull(songid, quality, qualityStr, line, index) {
    const params = new URLSearchParams({
        songid, quality, privilege: 2,
        mid: userData[0] || 0, platform: 'web',
    });
    const response = await http.fetch(`https://api.bilibili.com/audio/music-service-c/url?${params.toString()}`,
    { headers })
    if (!response.ok) return;
    const details = response.data;
    const safeTitle = details.data.title.replace(/\s*[\\/:*?"<>|]\s*/g, '_')
    .split('.').pop().split('?')[0].split('#')[0];
    const audioUrl = (details.data.cdns[line] || details.data.cdns[0]) || null;
    const ssDir = `《${safeTitle}》`;
    const ext = audioUrl.split('.').pop().split('?')[0].split('#')[0];
    const displayName = `${safeTitle}_(${qualityStr}).${ext}`;
    totalDown++;
    invoke('push_back_queue', {
        videoUrl: null, audioUrl,
        displayName, action: "only", ssDir,
        index: totalDown,
    });
    appendDownPageBlock(ext, qualityStr, audioData[index], totalDown);
    invoke('process_queue', {initial: true});
    currentElm.push(".down-page");
    downPageElm.addClass('active').removeClass('back');
}

async function parseVideo(videoId) {
    let getDetailUrl;
    if (videoId.includes('BV') || videoId.includes('bv')) {
        getDetailUrl = `https://api.bilibili.com/x/web-interface/view/detail?bvid=${videoId}`;
    } else if (videoId.includes('AV') || videoId.includes('av')) {
        getDetailUrl = `https://api.bilibili.com/x/web-interface/view/detail?aid=${videoId.match(/\d+/)[0]}`;
    }
    const detailData = await http.fetch(getDetailUrl,
    { headers });
    if (detailData.ok) {
        const details = await detailData.data;
        // if (details.data && details.data.pages)
        handleVideoList(details, null, 2);
    }
}
  
async function parseBangumi(videoId) {
    let getDetailUrl;
    if (videoId.includes('ep') || videoId.includes('EP')) {
        getDetailUrl = `https://api.bilibili.com/pgc/view/web/season?ep_id=${videoId.match(/\d+/)[0]}`;
    } else if (videoId.includes('ss') || videoId.includes('SS')) {
        getDetailUrl = `https://api.bilibili.com/pgc/view/web/season?season_id=${videoId.match(/\d+/)[0]}`;
    }
    const detailData = await http.fetch(getDetailUrl,
    { headers });
    if (detailData.ok) {
        const details = detailData.data;
        // if (details.data && details.data.pages)
        handleVideoList(details);
    }
}

async function parseAudio(songId) {
    const infoResponse = await http.fetch(`https://www.bilibili.com/audio/music-service-c/web/song/info?sid=${songId.match(/\d+/)[0]}`,
    { headers, responseType: http.ResponseType.Binary });
    if (infoResponse.ok) {
        const infoDetails = JSON.parse(pako.inflate(infoResponse.data, { to: 'string' }));
        const tagsResponse = await http.fetch(`https://www.bilibili.com/audio/music-service-c/web/tag/song?sid=${songId.match(/\d+/)[0]}`,
        { headers, responseType: http.ResponseType.Binary });
        if (tagsResponse.ok) {
            const tagsDetails = JSON.parse(pako.inflate(tagsResponse.data, { to: 'string' }));
            handleAudioList({info: infoDetails, tags: tagsDetails});
        }
    }
}

async function getDownUrl(details, quality, action, line, fileType, index) {
    return new Promise((resolve) => {
        try {
            let downUrl = [];
            const data = details.data || details.result;
            const isVideo = fileType === "video";
            for (let file of isVideo?data.dash.video:data.dash.audio) {
                if (file.id == isVideo ? quality.dms_id : quality.ads_id
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
                const target = quality.ads_id==30250?data.dash.dolby.audio:(quality.ads_id==30251?data.dash.flac.audio:data.dash.audio);
                if (Array.isArray(target)) {
                    for (let audio of target) {
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
            if ((action == "multi" && downUrl[0] && downUrl[1]) || 
            (action == "only" && (isVideo ? downUrl[0] : downUrl[1]))) {
                let qualityStr, ext, displayName;
                const safeTitle = videoData[index].title.replace(/\s*[\\/:*?"<>|]\s*/g, '_');
                const ssDir = `《${videoData[index].ss_title}》`;
                if (action == "only") {
                    qualityStr = isVideo ? quality.dms_desc : quality.ads_desc;
                    ext = isVideo ? "mp4" : "aac";
                    displayName = `${safeTitle}_(${qualityStr}).${ext}`;
                } else if (action == "multi") {
                    qualityStr = `${quality.dms_desc}-${quality.ads_desc}`;
                    ext = "mp4";
                    displayName = `${safeTitle}_(${qualityStr}).mp4`;
                }
                totalDown++;
                invoke('push_back_queue', {
                    videoUrl: (downUrl[0] && (downUrl[0][line] || downUrl[0][0])) || null,
                    audioUrl: (downUrl[1] && (downUrl[1][line] || downUrl[1][0])) || null,
                    displayName, action, ssDir,
                    index: totalDown,
                });
                appendDownPageBlock(ext, qualityStr, videoData[index], totalDown);
                resolve();
            } else {
                iziToast.error({
                    icon: 'fa-solid fa-circle-info',
                    layout: '2',
                    title: '下载',
                    message: `未找到符合条件的下载地址＞﹏＜`,
                });
            }
        } catch(err) {
            handleErr(err, null);
        }
    })
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
        iziToast.error({
            icon: 'fa-regular fa-circle-exclamation',
            layout: '2',
            title: `警告`,
            message: `遇到错误: ${errMsg}`,
        });
        console.error(err, errMsg);
        return true;
    } else {
        return false;
    }
}

async function search(input) {
    infoBlock.removeClass('active');
    videoList.removeClass('active');
    $('.video-list-tab-head').removeClass('active');
    multiSelect.off('click');
    $('.stein-tree').removeClass('active').find('.stein-tree-node').remove()
    currentElm.push(".video-root");
    if ($('.multi-select-icon').hasClass('checked')) multiSelect.click();
    let match = input.match(/BV[a-zA-Z0-9]+|av(\d+)/i);
    $('.video-block-operates-item').off('click');
    if (match) {
        parseVideo(match[0]);
        searchElm.addClass('active').removeClass('back');
        loadingBox.addClass('active');
        return;
    }
    match = input.match(/ep(\d+)|ss(\d+)/i);
    if (match) {
        parseBangumi(match[0]); 
        searchElm.addClass('active').removeClass('back');
        loadingBox.addClass('active');
        return;
    }
    match = input.match(/au(\d+)/i);
    if (match) {
        parseAudio(match[0]); 
        searchElm.addClass('active').removeClass('back');
        loadingBox.addClass('active');
        return;
    } else if (!input || !input.match(/a-zA-Z0-9/g) || true) {
        iziToast.error({
            icon: 'fa-regular fa-circle-exclamation',
            layout: '2',
            title: `警告`,
            message: !input ? "请输入链接/AV/BV/SS/EP/AU号" : "输入不合法！请检查格式"
        });
        backward();
        return;
    }
}

function formatStat(num) {
    if (num >= 100000000) {
        return (num / 100000000).toFixed(1) + '亿';
    } else if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    } else {
        return num.toString();
    }
}

function formatDuration(int, type) {
    if (typeof int === 'string') return int;
    const num = type == "bangumi" ? Math.round(int / 1000) : int;
    const hs = Math.floor(num / 3600);
    const mins = Math.floor((num % 3600) / 60);
    const secs = Math.round(num % 60);
    const finalHs = hs > 0 ? hs.toString().padStart(2, '0') + ':' : '';
    const finalMins = mins.toString().padStart(2, '0');
    const finalSecs = secs.toString().padStart(2, '0');
    return finalHs + finalMins + ':' + finalSecs;
}

function getPartition(cid){switch(cid){case 1:return'动画';case 24:return'动画';case 25:return'动画';case 47:return'动画';case 210:return'动画';case 86:return'动画';case 253:return'动画';case 27:return'动画';case 13:return'番剧';case 51:return'番剧';case 152:return'番剧';case 32:return'番剧';case 33:return'番剧';case 167:return'国创';case 153:return'国创';case 168:return'国创';case 169:return'国创';case 170:return'国创';case 195:return'国创';case 3:return'音乐';case 28:return'音乐';case 31:return'音乐';case 30:return'音乐';case 59:return'音乐';case 193:return'音乐';case 29:return'音乐';case 130:return'音乐';case 243:return'音乐';case 244:return'音乐';case 129:return'舞蹈';case 20:return'舞蹈';case 154:return'舞蹈';case 156:return'舞蹈';case 198:return'舞蹈';case 199:return'舞蹈';case 200:return'舞蹈';case 4:return'游戏';case 17:return'游戏';case 171:return'游戏';case 172:return'游戏';case 65:return'游戏';case 173:return'游戏';case 121:return'游戏';case 136:return'游戏';case 19:return'游戏';case 36:return'知识';case 201:return'知识';case 124:return'知识';case 228:return'知识';case 207:return'知识';case 208:return'知识';case 209:return'知识';case 229:return'知识';case 122:return'知识';case 188:return'科技';case 95:return'科技';case 230:return'科技';case 231:return'科技';case 232:return'科技';case 233:return'科技';case 234:return'运动';case 235:return'运动';case 249:return'运动';case 164:return'运动';case 236:return'运动';case 237:return'运动';case 238:return'运动';case 223:return'汽车';case 245:return'汽车';case 246:return'汽车';case 247:return'汽车';case 248:return'汽车';case 240:return'汽车';case 227:return'汽车';case 176:return'汽车';case 160:return'生活';case 138:return'生活';case 250:return'生活';case 251:return'生活';case 239:return'生活';case 161:return'生活';case 162:return'生活';case 21:return'生活';case 211:return'美食';case 76:return'美食';case 212:return'美食';case 213:return'美食';case 214:return'美食';case 215:return'美食';case 217:return'动物圈';case 218:return'动物圈';case 219:return'动物圈';case 220:return'动物圈';case 221:return'动物圈';case 222:return'动物圈';case 75:return'动物圈';case 119:return'鬼畜';case 22:return'鬼畜';case 26:return'鬼畜';case 126:return'鬼畜';case 216:return'鬼畜';case 127:return'鬼畜';case 155:return'时尚';case 157:return'时尚';case 252:return'时尚';case 158:return'时尚';case 159:return'时尚';case 202:return'资讯';case 203:return'资讯';case 204:return'资讯';case 205:return'资讯';case 206:return'资讯';case 5:return'娱乐';case 71:return'娱乐';case 241:return'娱乐';case 242:return'娱乐';case 137:return'娱乐';case 181:return'影视';case 182:return'影视';case 183:return'影视';case 85:return'影视';case 184:return'影视';case 177:return'纪录片';case 37:return'纪录片';case 178:return'纪录片';case 179:return'纪录片';case 180:return'纪录片';case 23:return'电影';case 147:return'电影';case 145:return'电影';case 146:return'电影';case 83:return'电影';case 11:return'电视剧';case 185:return'电视剧';case 187:return'电视剧';default:return'未知分区'}}

function copy() {
    const selectedText = window.getSelection().toString();
    if (selectedText) {
        navigator.clipboard.writeText(selectedText);
    }
    $('.context-menu').css({ opacity: 0, display: "none" });
};

function handleTextUpdate(element, newText = '', cut) {
    if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
        const start = element.value.substring(0, element.selectionStart);
        const end = element.value.substring(element.selectionEnd);
        element.value = start + (cut ? '' : newText) + end;
        if (cut) {
            element.setSelectionRange(element.selectionStart, element.selectionStart);
        } else {
            const newCursorPos = element.selectionStart + newText.length;
            element.setSelectionRange(newCursorPos, newCursorPos);
        }
    }
}

async function paste() {
    const text = await navigator.clipboard.readText();
    handleTextUpdate(currentFocus, text);
    $('.context-menu').css({ opacity: 0, display: "none" });
}

async function cutText() {
    if (currentFocus && (currentFocus.tagName === 'INPUT' || currentFocus.tagName === 'TEXTAREA')) {
        const selectedText = currentFocus.value.substring(currentFocus.selectionStart, currentFocus.selectionEnd);
        if (selectedText) {
            await navigator.clipboard.writeText(selectedText);
            handleTextUpdate(currentFocus, '', true);
        }
    }
    $('.context-menu').css({ opacity: 0, display: "none" });
}

async function bilibili() {
    if (currentElm[currentElm.length - 1] == ".user-profile") {
        shell.open(`https://space.bilibili.com/${userData[0]}`);
        $('.context-menu').css({ opacity: 0, display: "none" });
        return;
    } else {
        if (searchInput.val()){
            if ($('.info').hasClass('active')) {
                const input = searchInput.val();
                let match = input.match(/BV[a-zA-Z0-9]+|av(\d+)/i);
                if (match) {
                    shell.open('https://www.bilibili.com/video/' + match[0]);
                    $('.context-menu').css({ opacity: 0, display: "none" });
                    return;
                }
                match = input.match(/ep(\d+)|ss(\d+)/i);
                if (match) {
                    shell.open('https://www.bilibili.com/bangumi/play/' + match[0]);
                    $('.context-menu').css({ opacity: 0, display: "none" });
                    return;
                }
                match = input.match(/au(\d+)/i);
                if (match) {
                    shell.open('https://www.bilibili.com/audio/' + match[0]);
                    $('.context-menu').css({ opacity: 0, display: "none" });
                    return;
                }
                iziToast.error({
                    icon: 'fa-regular fa-circle-exclamation',
                    layout: '2',
                    title: `警告`,
                    message: `输入不合法！请检查格式`
                });
            } else {
                iziToast.error({
                    icon: 'fa-regular fa-circle-exclamation',
                    layout: '2',
                    title: `警告`,
                    message: `请先点击搜索按钮或返回到搜索结果页面`
                });
            }
        } else {
            iziToast.error({
                icon: 'fa-regular fa-circle-exclamation',
                layout: '2',
                title: `警告`,
                message: "请输入链接/AV/BV/SS/EP/AU号"
            });
        }
    }
}

async function backward() {
    const index = currentElm.length - 1;
    if (currentElm[index] == '.login') {
        invoke('stop_login');
        loginElm.removeClass('active').addClass('back');
    } else if (currentElm[index] == '.down-page') {
        downPageElm.removeClass('active').addClass('back');
    } else if (currentElm[index] == '.user-profile') {
        userProfileElm.removeClass('active').addClass('back');
    } else if (currentElm[index] == '.video-multi-next') {
        multiNextPage.removeClass('active').addClass('back');
        multiSelect.addClass('active');
        $('.video-multi-next-list').removeClass('active')
        $('.multi-select-box-org').prop('checked', false).trigger('change');
        lastChecked = -1;
    } else if (currentElm[index] == '.video-root') {
        if (searchElm.hasClass('active')) searchElm.removeClass('active').addClass('back');
        infoBlock.removeClass('active');
        videoList.removeClass('active');
        loadingBox.removeClass('active');
        $('.video-list-tab-head').removeClass('active');
        multiSelect.removeClass('active');
        $('.stein-tree').removeClass('active').find('.stein-tree-node').remove()
        $('.video-list').empty();
    } else if (currentElm[index] == '.settings') {
        settingsElm.removeClass('active').addClass('back');
        $('.settings-page').removeClass('active');
    }
    currentElm.pop();
}

$(document).ready(function () {
    invoke('init');
    app.getVersion().then(ver => $('#version').html(ver));
    os.platform().then(type => $('#platform').html(type));
    os.arch().then(arch => $('#arch').html(arch));
    $('#year').html((new Date()).getFullYear())
    $('.user-avatar-placeholder').append(bigVipIcon);
    async function handleSearch() {
        await search(searchInput.val());
    };
    const debouncedSearch = debounce(handleSearch, 250);
    searchBtn.on('click', debounce(handleSearch, 250));
    searchInput.on('keydown', (e) => {
        if (e.keyCode === 13) debouncedSearch();
    });
    $('.down-page-bar-background').on('click', () => {
        currentElm.push(".down-page");
        downPageElm.addClass('active').removeClass('back');    
    });
    $('.settings-page-bar-background').on('click', () => {
        settings();
    });
    $('.user-profile-exit').on('click', () => invoke('exit'));
    $('.cut').on('click', () => cutText());
    $('.copy').on('click', () => copy());
    $('.paste').on('click', () => paste());
    $('.bilibili').on('click', () => bilibili());
    $('.backward').on('click', () => backward());
    $(document).on('keydown', async function(e) {
        if (e.keyCode === 116 || (e.ctrlKey && e.keyCode === 82)) {
            e.preventDefault();
        }
        if (e.keyCode === 27) {
            if (!$('.context-menu').is(e.target) && $('.context-menu').has(e.target).length === 0)
            $('.context-menu').removeClass('active');
            backward();
        }
        if (e.ctrlKey && e.keyCode === 65) {
            if ($('.multi-select-icon').hasClass('checked') && !currentFocus) {
                e.preventDefault();
                const checkbox = $('.multi-select-box-org');
                const isChecked = checkbox.first().prop('checked');
                checkbox.prop('checked', !isChecked).trigger('change');
                return;
            }
        }
    }).on('contextmenu', async (e) => {
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
        if (!$('.context-menu').is(e.target) && $('.context-menu').has(e.target).length === 0)
        $('.context-menu').css({ opacity: 0, display: "none" });
    }).on('focusin', function (e) {
        currentFocus = e.target;
    }).on('focusout', function () {
        currentFocus = null;
    })
});

function formatPubdate(timestamp) {
    const date = new Date(timestamp * 1000);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

async function getBiliTicket() {
    const key = "XgwSnGZ1p";
    const message = "ts" + Math.floor(Date.now() / 1000);
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(key);
    const messageBytes = encoder.encode(message);
    const cryptoKey = await window.crypto.subtle.importKey(
        "raw", 
        keyBytes, 
        { name: "HMAC", hash: "SHA-256" }, 
        false, 
        ["sign"]
    );
    const signature = await window.crypto.subtle.sign("HMAC", cryptoKey, messageBytes);
    const hexSignature =  Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
    const params = new URLSearchParams({
        key_id: "ec02",
        hexsign: hexSignature,
        "context[ts]": Math.floor(Date.now() / 1000),
        csrf: ""
    })
    return (await http.fetch(`https://api.bilibili.com/bapis/bilibili.api.ticket.v1.Ticket/GenWebTicket?${params.toString()}`,
    { method: 'POST' })).data;
}

async function wbiSignature(params) {
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
}

function getUuid() {
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
    function o(e) {
        return Math.ceil(e).toString(16).toUpperCase();
    }
    let e = a(8);
    let t = a(4);
    let r = a(4);
    let n = a(4);
    let i = a(12);
    let currentTime = (new Date()).getTime();
    return e + "-" + t + "-" + r + "-" + n + "-" + i + s((currentTime % 100000).toString(), 5) + "infoc";
}

async function getCorrespondPath(timestamp) {
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
}

async function checkRefresh() {
    const response = (await http.fetch('https://passport.bilibili.com/x/passport-login/web/cookie/info',
    { headers })).data;
    const { refresh, timestamp } = response.data;
    if (refresh) {
        const correspondPath = await getCorrespondPath(timestamp);
        const csrfHtmlResp = await http.fetch(`https://www.bilibili.com/correspond/1/${correspondPath}`,
        { headers, responseType: http.ResponseType.Binary });
        if (csrfHtmlResp.ok) {
            const infoDetails = pako.inflate(csrfHtmlResp.data, { to: 'string' });
            const parser = new DOMParser();
            const doc = parser.parseFromString(infoDetails, 'text/html');
            const refreshCsrf = (doc.evaluate('//div[@id="1-name"]/text()', doc, null, XPathResult.STRING_TYPE, null)).stringValue;
            invoke("refresh_cookie", { refreshCsrf });
        }
    } else return refresh;
}

function initVideoInfo(type, details) {
    const isVideo = (type == "video" || type == "ugc_season");
    const root = isVideo ? details.data.View : details.result;
    $('.info-cover').attr("src", "").attr("src", 
    (isVideo ? root.pic : root.cover));
    $('.info-title').html(isVideo ? root.title : root.season_title);
    $('.info-desc').html((isVideo ? root.desc : root.evaluate).replace(/\n/g, '<br>'));
    if (isVideo ? root.owner : root.up_info) {
        $('.info-owner-face').attr("src", (isVideo ? root.owner.face : root.up_info.avatar));
        $('.info-owner-name').html(isVideo ? root.owner.name : root.up_info.uname);
    } else {
        $('.info-owner-face').css("display", "none");
        $('.info-owner-name').css("display", "none");
    }
    $('.info-title').css('max-width', `calc(100% - ${parseInt($('.info-owner').outerWidth(true))}px)`);
    $('.info-stat').html(
        `<div class="info-stat-item">${viewIcon + formatStat(isVideo ? root.stat.view : root.stat.views)}</div>
        <div class="info-stat-item">${danmakuIcon + formatStat(isVideo ? root.stat.danmaku : root.stat.danmakus)}</div>
        <div class="info-stat-item">${replyIcon + formatStat(root.stat.reply)}</div>
        <div class="info-stat-item">${likeIcon + formatStat(isVideo ? root.stat.like : root.stat.likes)}</div>
        <div class="info-stat-item">${coinIcon + formatStat(isVideo ? root.stat.coin : root.stat.coins)}</div>
        <div class="info-stat-item">${favoriteIcon + formatStat(isVideo ? root.stat.favorite : parseInt(root.stat.favorites) + parseInt(root.stat.favorite))}</div>
        <div class="info-stat-item">${shareIcon + formatStat(root.stat.share)}</div>`
    );
    let stylesText = '';
    if (isVideo) stylesText = `${getPartition(root.tid)}&nbsp;·&nbsp;${root.tname}`;
    else {
        for (let i = 0; i < root.styles.length; i++) {
            stylesText += root.styles[i];
            if (i < root.styles.length - 1) stylesText += "&nbsp;·&nbsp;";
        }
    }
    const contrElm = $('<a>').addClass('bcc-iconfont bcc-icon-ic_contributionx icon-small');
    const pubdateElm = $('<a>').addClass('bcc-iconfont bcc-icon-icon_into_history_gray_ icon-small');
    const pubdate = isVideo ? formatPubdate(root.pubdate) : root.publish.pub_time;
    $('.info-styles').empty().append(contrElm, stylesText).append("&emsp;|&emsp;").append(pubdateElm, pubdate);
}

function initAudioInfo(details) {
    const root = details.info.data;
    $('.info-cover').attr("src", "").attr("src", root.cover);
    $('.info-title').html(root.title);
    $('.info-desc').html((root.intro).replace(/\n/g, '<br>'));
    if (root.author) {
        $('.info-owner-name').html(root.author);
    } else {
        $('.info-owner-name').css("display", "none");
    }
    $('.info-title').css('max-width', `calc(100% - ${parseInt($('.info-owner').outerWidth(true))}px)`);
    $('.info-stat').html(
        `<div class="info-stat-item">${viewIcon + formatStat(root.statistic.play)}</div>
        <div class="info-stat-item">${replyIcon + formatStat(root.statistic.comment)}</div>
        <div class="info-stat-item">${coinIcon + formatStat(root.coin_num)}</div>
        <div class="info-stat-item">${favoriteIcon + formatStat(parseInt(root.statistic.collect))}</div>
        <div class="info-stat-item">${shareIcon + formatStat(root.statistic.share)}</div>`
    );
    let stylesText = '';
    const tagsRoot = details.tags.data;
    for (let i = 0; i < tagsRoot.length; i++) {
        stylesText += tagsRoot[i].info;
        if (i < tagsRoot.length - 1) stylesText += "&nbsp;·&nbsp;";
    }
    const contrElm = $('<a>').addClass('bcc-iconfont bcc-icon-ic_contributionx icon-small');
    const pubdateElm = $('<a>').addClass('bcc-iconfont bcc-icon-icon_into_history_gray_ icon-small');
    const pubdate = formatPubdate(root.passtime);
    $('.info-styles').empty().append(contrElm, stylesText).append("&emsp;|&emsp;").append(pubdateElm, pubdate);
}

function handleVideoList(details) { // 分类填充视频块
    videoList.empty();
    loadingBox.removeClass('active');
    let actualSearchVideo = [];
    multiSelect.off('click');
    multiSelectNext.off('click');
    multiSelectDown.off('click');
    if (details.code == 0) {
        infoBlock.addClass('active');
        videoList.addClass('active');
        $('.video-list-tab-head').addClass('active');
        infoBlock.after(videoListTabHead);
        multiSelect.addClass('active');
        downUrls = [], videoData = [], selectedVideos = [];
        if (details.data) {
            if (details.data.View.ugc_season) {
                const type = "ugc_season";
                initVideoInfo(type, details);
                const ugc_root = details.data.View.ugc_season;
                for (let i = 0; i < ugc_root.sections[0].episodes.length; i++) {
                    let episode = ugc_root.sections[0].episodes[i];
                    videoData[i] = new VideoData(
                        episode.title, episode.arc.desc, 
                        episode.arc.pic, episode.arc.duration, 
                        episode.aid, episode.cid, 
                        type, i + 1, ugc_root.title
                    );
                    appendVideoBlock(i + 1);
                    if (!actualSearchVideo[0] && (episode.bvid == searchInput.val() || searchInput.val().includes(episode.aid))) {
                        actualSearchVideo = [episode.title, i + 1];
                    }
                }
                if (!actualSearchVideo[0]) {
                    actualSearchVideo = [ugc_root.sections[0].episodes[0].title, 1];
                }
            } else {
                const type = "video";
                initVideoInfo(type, details);
                const data_root = details.data.View;
                if (data_root.rights.is_stein_gate) {
                    multiSelect.removeClass('active');
                    http.fetch(`https://api.bilibili.com/x/player.so?id=cid:1&aid=${encodeURIComponent(data_root.aid)}`,
                    { headers, responseType: http.ResponseType.Text }).then(async player => {
                        const match = player.data.match(/<interaction>(.*?)<\/interaction>/);
                        const graph_version = JSON.parse(match[1]).graph_version;
                        appendSteinNode(data_root, graph_version, 1, type);
                    })
                } else {
                    for (let j = 0; j < data_root.pages.length; j++) {
                        let page = data_root.pages[j];
                        const title = page.part || data_root.title;
                        videoData[j] = new VideoData(
                            title, data_root.desc, 
                            data_root.pic, page.duration, 
                            data_root.aid, page.cid, 
                            type, j + 1, data_root.title
                        );
                        appendVideoBlock(j + 1)
                        if (!actualSearchVideo[0] && title == $('.info-title').text()) {
                            actualSearchVideo = [title, page.page];
                        }
                    }
                    if (!actualSearchVideo[0]) {
                        actualSearchVideo = [data_root.title, 1];
                    }
                };
            }
        } else if (details.result) {
            const type = "bangumi";
            initVideoInfo(type, details);
            const eps_root = details.result.episodes;
            for (let k = 0; k < eps_root.length; k++) {
                let episode = eps_root[k];
                videoData[k] = new VideoData(
                    episode.share_copy, episode.share_copy,
                    episode.cover, episode.duration,
                    episode.aid, episode.cid,
                    type, k + 1, details.result.season_title
                );
                appendVideoBlock(k + 1);
                if (!actualSearchVideo[0] && (episode.bvid == searchInput.val() || searchInput.val().includes(episode.ep_id))) {
                    actualSearchVideo = [episode.share_copy, k + 1];
                }
            }
            if (!actualSearchVideo[0]) {
                actualSearchVideo = [eps_root[0].share_copy, 1];
            }
        }
        const targetVideoBlock = videoList.find('.video-block').filter(function() {
            const nameText = $(this).find('.video-block-name').text().trim().replace("\u00A0", " ");
            const pageText = $(this).find('.video-block-page').text().trim();
            return nameText == actualSearchVideo[0] && pageText == actualSearchVideo[1];
        }).first();
        lastChecked = parseInt(actualSearchVideo[1]) - 1;
        setTimeout(() => {
            if (targetVideoBlock.length) {
                videoList.animate({
                    scrollTop: targetVideoBlock.offset().top - videoList.offset().top + videoList.scrollTop() - (videoList.height() - targetVideoBlock.height())/2
                }, 500, 'swing');
                targetVideoBlock.find('.multi-select-box-org').prop('checked', true).trigger('change');
            }
        }, 100);
        multiSelect.on('click', () => {
            $('.multi-select-icon').toggleClass('fa-regular fa-solid checked');
            const isChecked = $('.multi-select-icon').hasClass('checked');
            $('.multi-select-box, .multi-select-box-tab').css("display", isChecked ? "block" : "none");
            const nameWidth = isChecked ? "calc(32vw - 30px)" : "32vw";
            $('.video-block-name').css({"min-width": nameWidth, "max-width": nameWidth});
            $('.video-block-page').css("margin-left", isChecked ? '10px' : '20px');
            videoList.find('.video-block-only').removeClass('active').addClass('back');
            videoList.find('.video-block-multi').removeClass('active').addClass('back');
            setTimeout(() => {
                videoList.find('.video-block-only').remove();
                videoList.find('.video-block-multi').remove();
            }, 500)
            if (isChecked) {
                $('.video-block').addClass('multi-select');
                $('.video-block').css({
                    "cursor": 'pointer',
                    "user-select": "none"
                });
                multiSelectNext.addClass('active');
            } else {
                $('.video-block').removeClass('multi-select');
                $('.video-block').css({
                    "cursor": 'default',
                    "user-select": "text"
                });
                multiSelectNext.removeClass('active');
            }
        });
        multiSelectNext.on('click', async function() {
            if ($('.multi-select-icon').hasClass('checked')) {
                if (selectedVideos.length > 50) {
                    iziToast.error({
                        icon: 'fa-regular fa-circle-exclamation',
                        layout: '2',
                        title: `警告`,
                        message: "单次最多只能下载50个视频, 超出将很大可能触发风控"
                    })
                    return;
                } else if (selectedVideos.length < 1) {
                    iziToast.error({
                        icon: 'fa-regular fa-circle-exclamation',
                        layout: '2',
                        title: `警告`,
                        message: "请至少选择一个视频"
                    });
                    return;
                }
                multiNextPage.find('.video-multi-next-list').remove();
                videoList.clone().removeClass('video-list').addClass('video-multi-next-list active').appendTo(multiNextPage);
                multiNextPage.find('.video-block').each(function() {
                    if (!$(this).find('.multi-select-box-org').prop('checked')) {
                        $(this).remove();
                    } else {
                        $(this).find('.video-block-operates').remove();
                        $(this).find('.multi-select-box').remove();
                        const qualityBlock = $('<div>').addClass('video-block-multi-select-quality');
                        $(this).append(qualityBlock);
                    }
                });
                multiNextPage.removeClass('back').addClass('active');
                currentElm.push(".video-multi-next");
                multiSelect.click().removeClass('active');
                const videoBlocks = multiNextPage.find('.video-block').toArray();
                let res = [];
                handleDownBtn(null, null, "multi", true).then(async line => {
                    for (let i = 0; i < videoBlocks.length; i++) {
                        $('.video-multi-next-title').text(`正在获取分辨率 - ${i+1} / ${videoBlocks.length}`);
                        res[i] = await handleVideoClick("multi", $(videoBlocks[i]), selectedVideos[i], true);
                        $(videoBlocks[i]).find('.video-block-multi-select-quality').html(`${res[i][0].dms_desc} ｜ ${res[i][0].codec_desc} ｜ ${res[i][0].ads_desc}`);
                        downUrls.push(res[i][1]);
                        const currentSel = new CurrentSel(res[i][0].dms_id, res[i][0].dms_desc, res[i][0].codec_id, res[i][0].codec_desc, res[i][0].ads_id, res[i][0].ads_desc);
                        await getDownUrl(downUrls[i], currentSel, "multi", line, "video", selectedVideos[i].index - 1);
                    }
                    $('.video-multi-next-title').text('本次获取有效期为120分钟, 请确认分辨率等信息, 随后点击“开始下载”');
                    multiSelectDown.addClass('active');
                    multiSelectDown.on('click', () => {
                        invoke('process_queue', {initial: true});
                        currentElm.push(".down-page");
                        downPageElm.addClass('active').removeClass('back');
                    });
                });
            }
        });
    } else {
        handleErr(details);
        backward();
    }
};

function handleAudioList(details) { //填充音频块
    videoList.empty();
    if (details.info.code == 0) {
        infoBlock.addClass('active');
        videoList.addClass('active');
        $('.video-list-tab-head').addClass('active');
        infoBlock.after(videoListTabHead);
        $('.video-list-tab-head').find('.video-block-name').text('音质')
        .find('.video-block-page').text('等级');
        multiSelect.removeClass('active');
        downUrls = [], audioData = [], selectedVideos = [];
        initAudioInfo(details);
        const root = details.info.data;
        audioData.push(new AudioData(
            root.title, root.intro, 
            root.cover, root.duration, 
            root.id, root.title
        ));
        const params = new URLSearchParams({
            songid: root.id, quality: 3,
            privilege: 2, mid: userData[0] || 0,
            platform: 'web',
        });
        http.fetch(`https://api.bilibili.com/audio/music-service-c/url?${params.toString()}`,
        { headers }).then(async response => {
            if (!response.ok) return;
            loadingBox.removeClass('active');
            const details = response.data;
            details.data.qualities.reverse().forEach(quality => {
                appendAudioBlock(quality);
            });
        });
    } else {
        handleErr(details.info);
        backward();
    }
};

async function appendSteinNode(info, graph_version, edge_id, type) {
    videoList.removeClass('active');
    const params = new URLSearchParams({
        aid: info.aid, graph_version, edge_id
    });
    const response = (await http.fetch(`https://api.bilibili.com/x/stein/edgeinfo_v2?${params.toString()}`,
    { headers })).data;
    videoList.find('.stein-option').remove();
    videoList.find('.video-block').remove();
    videoList.addClass('active');
    videoList.find('.video-block-only').removeClass('active').remove();
    videoList.find('.video-block-multi').removeClass('active').remove();
    $('.stein-tree').addClass('active').find('.stein-tree-node').remove()
    videoData = [];
    const current = response.data.story_list.find(item => item.edge_id === edge_id);
    videoData.push(new VideoData(
        current.title, info.desc, 
        info.pic, "未知", 
        info.aid, current.cid, type,
        videoData.length + 1, info.title
    ));
    appendVideoBlock(videoData.length);
    for (let story of response.data.story_list) {
        const nodeElm = $('<div>').addClass('stein-tree-node').html($('<i>').addClass('fa-regular'));
        if (story.is_current) {
            nodeElm.addClass('checked');
            nodeElm.find('i').addClass('fa-check');
        } else nodeElm.find('i').addClass('fa-location-dot');
        $('.stein-tree').append(nodeElm);
        nodeElm.on('click', () => {
            appendSteinNode(info, graph_version, story.edge_id);
            return;
        })
    }
    videoList.append($('<div>').addClass('stein-option'));
    const questions = response.data.edges.questions;
    const choices_root = questions ? questions[0].choices : null;
    if (!choices_root) return;
    for (let choice of choices_root) {
        const btn = $('<div>').addClass('stein-option-btn').html(choice.option);
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
            return;
        })
    }
}

async function handleVideoClick(action, click, data, ms) {
    if (!$('.multi-select-icon').hasClass('checked')) {
        const videoBlockAction = $('<div>').addClass(`video-block-${action}`);
        const videoBlockTitle = $('<div>').addClass('video-block-title').text(action=="multi"?'解析音视频':'仅解析选项');
        videoBlockAction.addClass('active').append(videoBlockTitle, $('<div>').addClass(`loading-action active`));
        currentVideoBlock = ms ? click : click.closest('.video-block');
        if (currentVideoBlock.next(`.video-block-multi`).length || currentVideoBlock.next(`.video-block-only`).length) {
            currentVideoBlock.next().remove();
        }
        if (!ms) {
            currentVideoBlock.after(videoBlockAction);
            const videoDownBtn = $('<div>').addClass(`video-block-${action}-video-down-btn`).text('下载');
            const AudioDownBtn = action=="only"?$('<div>').addClass(`video-block-${action}-vaudio-down-btn`).text('下载'):'';
            currentVideoBlock.next($(`.video-block-${action}`)).append(videoDownBtn, AudioDownBtn);
        }
        const details = await getVideoFull(data.aid, data.cid, data.type, action);
        currentVideoBlock.next($(`.video-block-${action}`)).find(`.loading-action`).removeClass('active');
        const dms = appendDimensionList(details, data.type, action, ms);
        const ads = appendAudioList(details, data.type, action, ms);
        if (ms) {
            return [new CurrentSel(...dms, ...ads), details];
        } else {
            handleDownBtn(details, data, action, false)
        };
    } else {
        iziToast.error({
            icon: 'fa-regular fa-circle-exclamation',
            layout: '2',
            title: `警告`,
            message: "多选状态下请点击右下角 “确认/结算” 结算"
        })
    }
};

function appendVideoBlock(index) { // 填充视频块
    const data_root = videoData[index - 1];
    const videoPage = $('<div>').addClass('video-block-page').text(index);
    const videoName = $('<div>').addClass('video-block-name').text(data_root.title);
    const videoDuration = $('<div>').addClass('video-block-duration').text(formatDuration(data_root.duration, data_root.type));
    const videoBlock = $('<div>').addClass('video-block');
    const videoMultiSelect = $('<label>').addClass('multi-select-box');
    const checkBoxLabel = $('<input>').attr('type', 'checkbox').addClass('multi-select-box-org');
    const checkBoxMark = $('<span>').addClass('multi-select-box-checkmark');
    videoMultiSelect.append(checkBoxLabel, checkBoxMark);
    const videoOperates = $('<div>').addClass('video-block-operates');
    const videoSplit = $('<div>').addClass('video-block-split');
    const getCoverBtn = $('<div>').addClass('video-block-getcover-btn video-block-operates-item').html(`${downCoverIcon}解析封面`);
    const getMultiBtn = $('<div>').addClass('video-block-getvideo-btn video-block-operates-item').html(`${downVideoIcon}解析音视频`);
    const getOnlyBtn = $('<div>').addClass('video-block-getaudio-btn video-block-operates-item').html(`${downAudioIcon}仅解析选项`);
    videoBlock.append(videoMultiSelect, videoPage, videoSplit, videoName, videoSplit.clone(), videoDuration, videoSplit.clone(), videoOperates).appendTo(videoList);
    videoOperates.append(getCoverBtn, getMultiBtn, getOnlyBtn).appendTo(videoBlock);
    checkBoxLabel.on('change', function() {
        const isChecked = $(this).prop('checked');
        handleSelect(isChecked ? "add" : "remove");
        videoBlock.css("background-color", isChecked ? "#414141" : "#3b3b3b9b");
    });
    videoBlock.on('click', function(e) {
        if ($('.multi-select-icon').hasClass('checked')) {
            const checkBoxes = $('.multi-select-box-org');
            const currentIndex = parseInt(videoBlock.find('.video-block-page').text()) - 1;
            if (e.shiftKey && lastChecked !== -1) {
                const start = Math.min(currentIndex, lastChecked);
                const end = Math.max(currentIndex, lastChecked);
                checkBoxes.slice(start, end + 1).prop('checked', true).trigger('change');
            } else {
                const isChecked = $(this).find('.multi-select-box-org').prop('checked');
                $(this).find('.multi-select-box-org').prop('checked', !isChecked).trigger('change');
            }
            lastChecked = currentIndex;
        }
    });
    function handleSelect(action) {
        if (action === "add") {
            if (!selectedVideos.some(video => video.cid === data_root.cid)) {
                selectedVideos.push(data_root);
            }
        } else if (action === "remove") {
            selectedVideos = selectedVideos.filter(video => video.aid !== data_root.aid);
        }
    }
    getCoverBtn.on('click', () => {
        if (!$('.multi-select-icon').hasClass('checked')) {
            shell.open(data_root.pic.replace(/http/g, 'https'));
        } else {
            iziToast.error({
                icon: 'fa-regular fa-circle-exclamation',
                layout: '2',
                title: `警告`,
                message: "多选状态下请点击右下角 “确认/结算” 结算"
            })
        }
    });
    getMultiBtn.on('click', (e) => handleVideoClick("multi", $(e.currentTarget), data_root, false));
    getOnlyBtn.on('click', (e) => handleVideoClick("only", $(e.currentTarget), data_root, false));
}

function appendAudioBlock(details) { // 填充音频块
    const index = audioData.length - 1;
    const data_root = audioData[index];
    const videoPage = $('<div>').addClass('video-block-page').text(details.type + 1);
    const videoName = $('<div>').addClass('video-block-name').html(details.desc + "&emsp;|&emsp;" + details.bps);
    const videoDuration = $('<div>').addClass('video-block-duration').text(formatDuration(data_root.duration, null));
    const videoBlock = $('<div>').addClass('video-block');
    const videoMultiSelect = $('<label>').addClass('multi-select-box');
    const checkBoxLabel = $('<input>').attr('type', 'checkbox').addClass('multi-select-box-org');
    const checkBoxMark = $('<span>').addClass('multi-select-box-checkmark');
    videoMultiSelect.append(checkBoxLabel, checkBoxMark);
    const videoOperates = $('<div>').addClass('video-block-operates');
    const videoSplit = $('<div>').addClass('video-block-split');
    const getCoverBtn = $('<div>').addClass('video-block-getcover-btn video-block-operates-item').html(`${downCoverIcon}解析封面`);
    const getAudioBtn = $('<div>').addClass('video-block-getaudio-btn video-block-operates-item').html(`${downAudioIcon}解析音频`);
    videoBlock.append(videoMultiSelect, videoPage, videoSplit, videoName, videoSplit.clone(), videoDuration, videoSplit.clone(), videoOperates).appendTo(videoList);
    videoOperates.append(getCoverBtn, getAudioBtn).appendTo(videoBlock);
    getCoverBtn.on('click', () => shell.open(data_root.pic.replace(/http/g, 'https')));
    getAudioBtn.on('click', () => {
        let options = {
            title: '选择下载线路',
            background: "#2b2b2b",
            color: "#c4c4c4",
            html: `
            <button class="swal2-cancel swal2-styled swal-btn-main">主线路</button>
            <button class="swal2-cancel swal2-styled swal-btn-backup1">备用线路</button>
            `,
            showConfirmButton: false,
        };
        Swal.fire(options);
        $('.swal-btn-main').on('click', () => {
            const line = $(this).hasClass('swal-btn-backup1') ? 1 : 0;
            Swal.close();
            getAudioFull(data_root.sid, details.type, details.bps.replace("kbit/s", "K"), line, index)
        })
    });
}

async function appendDownPageBlock(type, quality, data, index) { // 填充下载块
    const title = data.title.replace(/\s*[\\/:*?"<>|]\s*/g, '_');
    const desc = data.desc;
    const pic = data.pic;
    const finalTitle = `${title}_(${quality}).${type}`;
    const downPage = $('.down-page');
    if (downPage.find('.down-page-empty-text')) {
        downPage.find('.down-page-empty-text').remove();
    }
    downPage.css("justify-content", `${downPage.children().length < 5 ? "center" : "flex-start"}`);
    const infoBlock = $(`<div id="${totalDown}">`).addClass('down-page-info')
    const infoCover = $('<img>').addClass('down-page-info-cover').attr("src", pic.replace("http:", "https:"))
    .attr("referrerPolicy", "no-referrer").attr("draggable", false);
    const infoData = $('<div>').addClass('down-page-info-data');
    const infoDesc = $('<div>').addClass('down-page-info-desc').html(desc.replace(/\n/g, '<br>'));
    const infoTitle = $('<div>').addClass('down-page-info-title').html(finalTitle).css('max-width', `100%`);
    const infoProgressText = $('<div>').addClass('down-page-info-progress-text').html(`等待下载`);
    const infoProgressBar = $('<div>').addClass('down-page-info-progress-bar');
    const infoProgress = $('<div>').addClass('down-page-info-progress').html(infoProgressBar);
    const openDirBtn = $('<div>').addClass('down-page-open-dir-btn').html(`<i class="fa-solid fa-file-${type=="aac"?'audio':'video'} icon-small"></i>定位文件`);
    infoBlock.append(infoCover, infoData.append(infoTitle, infoDesc, openDirBtn, infoProgressText, infoProgress)).appendTo(downPage);
    openDirBtn.on('click', () => {
        if (parseFloat(infoProgressBar.css('width')) / parseFloat(infoProgress.css('width')) < 1) {
            iziToast.error({
                icon: 'fa-regular fa-circle-exclamation',
                layout: '2',
                title: `下载`,
                message: `请等待下载完毕`
            });
        } else {
            invoke('open_select', { displayName: finalTitle, index });
        } 
    });
}

function appendDimensionList(details, type, action, ms) { // 填充分辨率
    if (details.code == 0) {
        const root = type == "bangumi" ? details.result : details.data;
        const dms = $('<div>').addClass("video-block-dimension-dms");
        const dm = $('<div>').addClass("video-block-dimension-dm").text("分辨率/画质");
        const split = $('<div>').addClass("video-block-dimension-split");
        const dmsOpt = $('<div>').addClass("video-block-dimension-dms-opt");
        dms.append(dm, split, dmsOpt);
        if (currentVideoBlock.next(`.video-block-${action}`).length) {
            currentVideoBlock.next(`.video-block-${action}`).find('.video-block-dimension-dms').remove();
        } else {
            currentVideoBlock.next().next(`.video-block-${action}`).find('.video-block-dimension-dms').remove();
        }
        currentVideoBlock.next(`.video-block-${action}`).append(dms);
        const maxQuality = Math.max(...root.dash.video.map(v => v.id));
        const qualityList = root.accept_quality.filter(quality => quality <= maxQuality);
        for (let i = 0; i < qualityList.length; i++) {
            const quality = qualityList[i];
            const qualityItem = root.support_formats.find(format => format.quality === quality);
            const description = qualityItem.display_desc + (qualityItem.superscript ? `-${qualityItem.superscript}` : '');
            const currentBtn = $('<div>').addClass(`video-block-dimension-dms-${quality} video-block-dimension-dms-item`);
            const currentIcon = $('<i>').addClass(`fa-solid fa-${quality <= 32 ? 'standard':'high'}-definition icon-small`);
            currentBtn.append(currentIcon, qualityItem.new_description);
            dmsOpt.append(currentBtn);
            if (quality == maxQuality) {
                currentBtn.addClass('checked');
                currentSel[0] = quality;
                currentSel[1] = description;
                const codec = appendCodecList(qualityItem, type, action, "init", ms);
                if (ms) return [quality, description, ...codec];
            }
            currentBtn.on('click', function() {
                if (currentVideoBlock.next(`.video-block-${action}`).length) {
                    currentVideoBlock.next(`.video-block-${action}`).find('.video-block-dimension-dms-item').removeClass('checked');
                } else {
                    currentVideoBlock.next().next(`.video-block-${action}`).find('.video-block-dimension-dms-item').removeClass('checked');
                }
                $(this).addClass('checked');
                currentSel[0] = quality;
                currentSel[1] = qualityItem.display_desc;
                appendCodecList(qualityItem, type, action, "update", ms);
            });
        }
    } else {
        handleErr(details, type);
    }
};

function appendCodecList(details, type, action, extra, ms) { // 填充编码格式
    if (details.codecs) {
        const cds = $('<div>').addClass("video-block-codec-cds");
        const cd = $('<div>').addClass("video-block-codec-cd").text("编码格式");
        const split = $('<div>').addClass("video-block-codec-split");
        const cdsOpt = $('<div>').addClass("video-block-codec-cds-opt");
        const crossSplit = $('<div>').addClass('video-block-cross-split');
        if (extra == "init") {
            cds.append(cd, split, cdsOpt);
            if (currentVideoBlock.next(`.video-block-${action}`).length) {
                currentVideoBlock.next(`.video-block-${action}`).find('.video-block-codec-cds').remove();
                currentVideoBlock.next(`.video-block-${action}`).find('.video-block-cross-split').remove();
            } else {
                currentVideoBlock.next().next(`.video-block-${action}`).find('.video-block-codec-cds').remove();
                currentVideoBlock.next().next(`.video-block-${action}`).find('.video-block-cross-split').remove();
            }
            currentVideoBlock.next(`.video-block-${action}`).append(cds).append(action=="only"?crossSplit:'');
        } else $('.video-block-codec-cds-opt').empty();
        const codecsList = details.codecs.map(codec => ({
            codec, 
            priority: (codec.includes('avc') ? 1 : codec.includes('hev') ? 2 : 3)
        }))
        .sort((a, b) => a.priority - b.priority);
        for (let i = 0; i < codecsList.length; i++) {
            const codec = codecsList[i].codec;
            const description = describeCodec(codec);
            const currentBtn = $('<div>').addClass(`video-block-codec-cds-${codec} video-block-codec-cds-item`);
            const currentIcon = $('<i>').addClass(`fa-solid fa-rectangle-code icon-small`);
            currentBtn.append(currentIcon, description);
            if (extra == "init") cdsOpt.append(currentBtn);
            else $('.video-block-codec-cds-opt').append(currentBtn)
            if (codec == 0) continue;
            if (!$('.video-block-codec-cds-item').hasClass('checked')) {
                currentBtn.addClass('checked');
                currentSel[2] = codec;
                currentSel[3] = description;
                if (ms) return [codec, description];
            }
            currentBtn.on('click', function() {
                if (currentVideoBlock.next(`.video-block-${action}`).length) {
                    currentVideoBlock.next(`.video-block-${action}`).find('.video-block-codec-cds-item').removeClass('checked');
                } else {
                    currentVideoBlock.next().next(`.video-block-${action}`).find('.video-block-codec-cds-item').removeClass('checked');
                }
                $(this).addClass('checked');
                currentSel[2] = codec;
                currentSel[3] = description
            });
        }

    } else {
        handleErr(details, type);
    }
}

function appendAudioList(details, type, action, ms) { // 填充音频
    if (details.code == 0) {
        const root = type == "bangumi" ? details.result : details.data;
        const ads = $('<div>').addClass("video-block-vaudio-ads");
        const ad = $('<div>').addClass("video-block-vaudio-ad").text("比特率/音质");
        const split = $('<div>').addClass("video-block-vaudio-split");
        const adsOpt = $('<div>').addClass("video-block-vaudio-ads-opt");
        ads.append(ad, split, adsOpt);
        const qualityDesc = {
            30216: "64K",
            30232: "132K",
            30280: "192K",
            30250: "杜比全景声",
            30251: "Hi-Res无损",
        }
        if (currentVideoBlock.next(`.video-block-${action}`).length) {
            currentVideoBlock.next(`.video-block-${action}`).find('.video-block-vaudio-ads').remove();
        } else {
            currentVideoBlock.next().next(`.video-block-${action}`).find('.video-block-vaudio-ads').remove();
        }
        currentVideoBlock.next(`.video-block-${action}`).append(ads);
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
            const currentBtn = $('<div>').addClass(`video-block-vaudio-ads-${quality} video-block-vaudio-ads-item`);
            const currentIcon = $('<i>').addClass(`fa-solid fa-${quality==0?'music-note-slash':'audio-description'} icon-small`);
            currentBtn.append(currentIcon, description);
            adsOpt.append(currentBtn);
            if (quality == 0) {
                currentBtn.css('cursor', 'not-allowed');
                continue;
            }
            if (!$('.video-block-vaudio-ads-item').hasClass('checked')) {
                currentBtn.addClass('checked');
                currentSel[4] = quality;
                currentSel[5] = description;
                if (ms) return [quality, description];
            };
            currentBtn.on('click', function() {
                if (currentVideoBlock.next(`.video-block-${action}`).length) {
                    currentVideoBlock.next(`.video-block-${action}`).find('.video-block-vaudio-ads-item').removeClass('checked');
                } else {
                    currentVideoBlock.next().next(`.video-block-${action}`).find('.video-block-vaudio-ads-item').removeClass('checked');
                }
                $(this).addClass('checked');
                currentSel[4] = quality;
                currentSel[5] = description;
            });
        }
    } else {
        handleErr(details, type);
    }
}

function handleDownBtn(details, data, action, ms) { // 监听下载按钮
    return new Promise((resolve) => {
        const quality = new CurrentSel(...currentSel);
        let options = {
            title: '选择下载线路',
            background: "#2b2b2b",
            color: "#c4c4c4",
            html: `
            <button class="swal2-cancel swal2-styled swal-btn-main">主线路</button>
            <button class="swal2-cancel swal2-styled swal-btn-backup1">备用线路1</button>
            <button class="swal2-cancel swal2-styled swal-btn-backup1">备用线路2</button>
            `,
            showConfirmButton: false,
        };
        function handleDown(fileType) {
            Swal.fire(options);
            $(document).on('click', '.swal-btn-main, .swal-btn-backup1, .swal-btn-backup2', async function() {
                Swal.close();
                const line = $(this).hasClass('swal-btn-backup1') ? 1 : ($(this).hasClass('swal-btn-backup2') ? 2 : 0);
                if (!ms) {
                    downUrls.push(details);
                    await getDownUrl(details, quality, action, line, fileType, data.index - 1);
                    invoke('process_queue', {initial: true});
                    currentElm.push(".down-page");
                    downPageElm.addClass('active').removeClass('back');
                }
                $(document).off('click', '.swal-btn-main, .swal-btn-backup1, .swal-btn-backup2');
                return resolve(line);
            });
        }
        if (ms) handleDown("video");
        else {
            const videoDownBtn = currentVideoBlock.next(`.video-block-${action}`).find(`.video-block-${action}-video-down-btn`);
            const audioDownBtn = currentVideoBlock.next(`.video-block-${action}`).find(`.video-block-${action}-vaudio-down-btn`);    
            if (action == "only") audioDownBtn.on('click', () => handleDown("audio"));
            else videoDownBtn.on('click', () => handleDown("video"));
        }
    });
}

async function userProfile() {
    if ($('.user-name').text() == "登录") return;
    currentElm.push(".user-profile");
    userProfileElm.addClass('active').removeClass('back');
    const detailData = await http.fetch(`https://api.bilibili.com/x/web-interface/card?mid=${userData[0]}&photo=true`,
    { headers });
    if (detailData.ok) {
        const details = detailData.data;
        $('.user-profile-img').attr("src", details.data.space.l_img.replace("http:", "https:"));
        $('.user-profile-avatar').attr("src", details.data.card.face);
        $('.user-profile-name').html(details.data.card.name);
        $('.user-profile-desc').html(details.data.card.sign);
        $('.user-profile-sex').attr("src", `./assets/${details.data.card.sex=="男"?'male':'female'}.png`);
        $('.user-profile-level').attr("src", `./assets/level/level${details.data.card.level_info.current_level}${details.data.card.is_senior_member?'_hardcore':''}.svg`);
        if (details.data.card.vip) {
            $('.user-profile-bigvip').css("display", "block");
            $('.user-profile-bigvip').attr("src", details.data.card.vip.label.img_label_uri_hans_static);
        }
        $('.user-profile-coins').html('<a>硬币</a><br>' + userData[1]);
        $('.user-profile-subs').html('<a>关注数</a><br>' + formatStat(details.data.card.friend));
        $('.user-profile-fans').html('<a>粉丝数</a><br>' + formatStat(details.data.card.fans));
        $('.user-profile-likes').html('<a>获赞数</a><br>' + formatStat(details.data.like_num));
    }
}

async function scanLogin() {
    $('.login-qrcode-tips').removeClass('active');
    $('.login-scan-loading').addClass('active');
    $('.login-qrcode-box').off('click');
    const response = (await http.fetch('https://passport.bilibili.com/x/passport-login/web/qrcode/generate', { headers })).data;
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
    $('.login-scan-loading').removeClass('active');
    $('#login-qrcode').removeAttr("title");
    $('.login-qrcode-box').on('mouseenter', function() {
        if (!$('.login-qrcode-tips').hasClass('active')) {
            $('.login-scan-tips').css('opacity', '1');
            $(this).css('opacity', '0');
        }
    });
    $('.login-qrcode-box').on('mouseleave', function() {
        if (!$('.login-qrcode-tips').hasClass('active')) {
            $('.login-scan-tips').css('opacity', '0');
            $(this).css('opacity', '1');
        }
    });
    try {
        await invoke('scan_login', {qrcodeKey: qrcode_key});
    } catch(err) {
        $('.login-qrcode-box').on('click', () => {
            scanLogin();
            return;
        });
    }
}

async function pwdLogin() {
    const toggleEye = $('.login-pwd-item-eye');
    const loginBtn = $('.login-pwd-login-btn');
    const pwdInput = $('#password-input');
    toggleEye.off('click');
    loginBtn.off('click');
    pwdInput.off('keydown');
    toggleEye.on('click', function() {
        toggleEye.css("margin", toggleEye.hasClass('fa-eye') ? "0": "0 1px");
        if (toggleEye.hasClass('fa-eye')) {
            toggleEye.removeClass('fa-eye').addClass('fa-eye-slash');
            pwdInput.attr("type", "text");
        } else {
            toggleEye.removeClass('fa-eye-slash').addClass('fa-eye');
            pwdInput.attr("type", "password");
        }
    });
    loginBtn.on('click', async function() {
        try {
            const username = $('#username-input').val().toString();
            const password = $('#password-input').val().toString();
            if (!username || !password) {
                iziToast.info({
                    icon: 'fa-solid fa-circle-info',
                    layout: '2',
                    title: '登录',
                    message: `请输入账号与密码`,
                });
                return;
            }
            const rsaKeys = (await http.fetch('https://passport.bilibili.com/x/passport-login/web/key', { headers })).data;
            const { hash, key } = rsaKeys.data;
            const enc = new JSEncrypt();
            enc.setPublicKey(key);
            const encedPwd = enc.encrypt(hash + password);
            const {token, challenge, validate, seccode} = await captcha();
            await invoke('pwd_login', { username, password: encedPwd, token, challenge, validate, seccode });
        } catch(err) {
            console.error(err);
            iziToast.error({
                icon: 'fa-solid fa-circle-info',
                layout: '2',
                title: '登录',
                message: `登录时出现错误: ${err}<br>推荐使用扫码/短信登录`,
            });
        }
    });
    pwdInput.on('keydown', e => {
        if (e.keyCode === 13) loginBtn.click();
    })
}

async function smsLogin() {
    const loginBtn = $('.login-sms-login-btn');
    const prefix = (await http.fetch('https://api.bilibili.com/x/web-interface/zone', { headers }))
    .data.data.country_code || 86;
    const areaCodes = (await http.fetch('https://passport.bilibili.com/web/generic/country/list')).data;
    const allCodes = [...areaCodes.data.common, ...areaCodes.data.others];
    allCodes.sort((a, b) => a.id - b.id);
    const codeList = $('.login-sms-area-code-list');
    codeList.prev().off('click');
    loginElm.off('click');
    $('.login-sms-getcode-btn').off('click');
    loginBtn.off('click');
    $.each(allCodes, (index, code) => {
        const codeElement = $('<div>').addClass('login-sms-area-code-list-item')
            .html(`<span style="float:left">${code.cname}</span>
            <span style="float:right">+${code.country_id}</span>`);
        codeList.append(codeElement);
        codeElement.on('click', () => {
            codeList.prev().find('.login-sms-item-text').html(codeElement.find('span').last().text()
            + '&nbsp;<i class="fa-solid fa-chevron-down"></i>');
            codeList.find('.login-sms-area-code-list-item').removeClass('checked');
            codeElement.addClass('checked');
            codeList.removeClass('active');
        });
        if (code.country_id == prefix) codeElement.click();
    });
    codeList.prev().on('click', '.login-sms-item-text i', (e) => {
        codeList.addClass('active');
        e.stopPropagation();
    });
    loginElm.on('click', () => codeList.removeClass('active'));
    let key;
    let canSend = true;
    $('.login-sms-getcode-btn').on('click', async function() {
        if (!canSend) return;
        try {
            const tel = $('#tel-input').val().toString();
            if (!tel) {
                iziToast.info({
                    icon: 'fa-solid fa-circle-info',
                    layout: '2',
                    title: '登录',
                    message: `请输入手机号`,
                });
                return;
            }
            if ((tel.match(/^1[3456789]\d{9}$/) && $('.login-sms-item-text').text().includes('+86'))
            || (!$('.login-sms-item-text').text().includes('+86') && tel)) {
                const {token, challenge, validate, seccode} = await captcha();
                const params = new URLSearchParams({
                    cid: $('.login-sms-item-text').text().replace(/[^0-9]/g, ''),
                    tel, source: 'main-fe-header', token,
                    challenge, validate, seccode
                });
                const response = (await http.fetch(`https://passport.bilibili.com/x/passport-login/web/sms/send?${params.toString()}`,
                { headers, method: 'POST' })).data;
                if (response.code !== 0) {
                    throw new Error(response.message);
                } else {
                    canSend = false;
                    key = response.data.captcha_key;
                    let timeout = 60;
                    $('.login-sms-getcode-btn').text("重新发送(60)")
                    .addClass("disabled");
                    const timer = setInterval(() => {
                        timeout--;
                        $('.login-sms-getcode-btn').text(`重新发送(${timeout})`);
                        if (timeout == 0) {
                            clearInterval(timer);
                            $('.login-sms-getcode-btn').text(`重新发送`)
                            .removeClass("disabled");
                            canSend = true;
                        }
                    }, 1000);
                }
            }
        } catch(err) {
            console.error(err);
            iziToast.error({
                icon: 'fa-solid fa-circle-info',
                layout: '2',
                title: '登录',
                message: `登录时出现错误: ${err}`,
            });
        }
    })
    loginBtn.on('click', async function() {
        try {
            const tel = $('#tel-input').val().toString();
            const code = $('#sms-input').val().toString();
            if (!tel || !code) {
                iziToast.info({
                    icon: 'fa-solid fa-circle-info',
                    layout: '2',
                    title: '登录',
                    message: `请输入手机号与验证码`,
                });
                return;
            }
            if (!key) {
                iziToast.info({
                    icon: 'fa-solid fa-circle-info',
                    layout: '2',
                    title: '登录',
                    message: `请先获取验证码`,
                });
                return;
            }
            await invoke('sms_login', { tel, code, key, cid: $('.login-sms-item-text').text().replace(/[^0-9]/g, '') });
        } catch(err) {
            console.error(err);
            iziToast.error({
                icon: 'fa-solid fa-circle-info',
                layout: '2',
                title: '登录',
                message: `登录时出现错误: ${err}<br>推荐使用扫码登录`,
            });
        }
    });
    pwdInput.on('keydown', e => {
        if (e.keyCode === 13) loginBtn.click();
    })
}

async function login() {
    if ($('.user-name').text() != "登录") return;
    currentElm.push(".login");
    $('.login-tab-pwd .login-tab-sms').off('click');
    loginElm.addClass('active').removeClass('back');
    scanLogin();
    $('.login-tab-pwd').on('click', async () => {
        $('.login-tab-sms').removeClass('checked');
        $('.login-tab-pwd').addClass('checked');
        $('.login-sms').removeClass('active');
        $('.login-pwd').addClass('active');
    });
    $('.login-tab-sms').on('click', async () => {
        $('.login-tab-sms').addClass('checked');
        $('.login-tab-pwd').removeClass('checked');
        $('.login-sms').addClass('active');
        $('.login-pwd').removeClass('active');
    });
    $('.login-tab-pwd').click();
    pwdLogin();
    smsLogin();
}

async function captcha() {
    return new Promise(async (resolve, reject) => {
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

function settings() {
    $('.settings-side-bar-background input[name="max-conc"]').off('click');
    settingsElm.removeClass('back').addClass('active');
    currentElm.push('.settings');
    const downDirOpenBtn = $('.down-dir-path-openbtn');
    const tempDirOpenBtn = $('.temp-dir-path-openbtn');
    downDirOpenBtn.off('click');
    tempDirOpenBtn.off('click');
    function handleSave(set) {
        iziToast.info({
            icon: 'fa-solid fa-circle-info',
            layout: '2',
            title: '设置',
            message: `已保存设置 - ${set}`,
        });
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
    $('.settings-side-bar-background.general').click();
    downDirOpenBtn.on('click', async () => {
        const selected = await selFile('directory');
        if (selected) {
            downDirPath.val(selected);
            handleSave("存储路径");
        }
    });
    tempDirOpenBtn.on('click', async () => {
        const selected = await selFile('directory');
        if (selected) {
            tempDirPath.val(selected);
            handleSave("临时文件存储路径");
        }
    });
}

function describeCodec(codecString) {
    const parts = codecString.split('.');
    const codecType = parts[0];
    let profileDesc;
    let levelDesc;
    if (codecType === 'hev1' || codecType === 'hvc1') {
        const profilePart = parts[1];
        const levelPart = parts[3].slice(1); 
        switch (profilePart) {
            case '1':
                profileDesc = 'Main';
                break;
            case '2':
                profileDesc = 'Main 10';
                break;
            case '3':
                profileDesc = 'Main Still Picture';
                break;
            default:
                profileDesc = 'Unknown';
                break;
        }
        const levelNumber = parseFloat(levelPart);
        if (!isNaN(levelNumber)) {
            levelDesc = `Level ${levelNumber / 30.0}`;
        } else {
            levelDesc = "Unknown Level";
        }
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
        } else {
            profileDesc = 'Unknown';
        }
        const levelPart = profileAndLevel.substring(2);
        const levelNumber = parseInt(levelPart, 16);
        if (!isNaN(levelNumber)) {
            levelDesc = `Level ${levelNumber / 10.0}`;
        } else {
            levelDesc = "Unknown Level";
        }
        return `AVC/H.264 ${profileDesc} ${levelDesc}`;
    } else if (codecType === 'av01') {
        profileDesc = parts[2];
        return `AV1 ${profileDesc}`;
    }
    return '未知编码格式';
}

async function getUserProfile(mid) {
    const signature = await wbiSignature({ mid: mid });
    const detailData = await http.fetch(`https://api.bilibili.com/x/space/wbi/acc/info?${signature}`,
    { headers });
    if (detailData.ok) {
        const details = detailData.data;
        userData[0] = mid;
        userData[1] = details.data.coins;
        if (details.code != "0"){
            handleErr(details, null);
            return;
        }
        iziToast.info({
            icon: 'fa-solid fa-circle-info',
            layout: '2',
            title: '登录',
            message: `登录成功~`,
        });
        if (currentElm[currentElm.length - 1] == ".login") {
            backward();
        }
        $('.user-avatar').attr('src', details.data.face);
        $('.user-name').text(details.data.name);
        if (details.data.vip.type != 0 && details.data.vip.avatar_subscript == 1) {
            $('.user-vip-icon').css('display', 'block');
        }
        invoke('insert_cookie', { cookieStr: `_uuid=${getUuid()}; Path=/; Domain=bilibili.com` });
        invoke('insert_cookie', { cookieStr: `bili_ticket=${(await getBiliTicket()).data.ticket}; Path=/; Domain=bilibili.com` });
        checkRefresh();
    }
}

once("settings", async (event) => {
    const p = event.payload;
    downDirPath.val(p.down_dir);
    tempDirPath.val(p.temp_dir);
    $(`#max-conc-${p.max_conc}`).click();
})

listen("user-mid", async (event) => {
    $('.user-avatar-placeholder').off('click');
    if (event.payload != '0') {
        getUserProfile(event.payload);
        $('.user-avatar-placeholder').attr('data-after', '主页');
        $('.user-avatar-placeholder').on('click', debounce(userProfile, 500));
    } else {
        $('.user-avatar-placeholder').attr('data-after', '登录');
        $('.user-avatar-placeholder').on('click', debounce(login, 1000));
        $('.user-name').text('登录');
    }
})

listen("headers", async (event) => headers = event.payload);

listen("exit-success", async (event) => {
    $('.user-avatar-placeholder').off('click');
    backward();
    $('.user-avatar').attr('src', './assets/default.jpg');
    $('.user-name').text("登录");
    $('.user-vip-icon').css("display", "none")
    $('.user-avatar-placeholder').attr('data-after', '登录');
    $('.user-avatar-placeholder').on('click', debounce(login, 1000));
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '登录',
        message: `已退出登录~`,
    });
})

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

listen("download-progress", async (event) => {
    const p = event.payload;
    downPageElm.children().each(function() {
        const title = $(this).find('.down-page-info-title');
        if ($(this).attr('id') == (p.index) && title.text() == p.display_name) {
            $(this).find('.down-page-info-progress-bar').css('width', p.progress);
            $(this).find('.down-page-info-progress-text')
            .html(`${p.file_type=="audio"?"音频":"视频"} - 总进度: ${p.progress}&emsp;剩余时间: ${formatDuration(parseFloat(p.remaining), "progress")}&emsp;当前速度: ${p.speed}`);
            if (parseFloat(p.progress) >= 100) {
                $(this).find('.down-page-info-progress-text')
                .html(`${p.file_type=="audio"?"音频":"视频"}下载成功`);
            }
        }
    });
})

listen("merge-progress", async (event) => {
    const p = event.payload;
    downPageElm.children().each(function() {
        const title = $(this).find('.down-page-info-title');
        if ($(this).attr('id') == (p.index) && title.text() == p.display_name) {
            $(this).find('.down-page-info-progress-bar').addClass('scroll');
            $(this).find('.down-page-info-progress-text')
            .html(`合并音视频 - 已合并帧: ${p.frame}&emsp;fps: ${p.fps}&emsp;已合并至: ${p.out_time}&emsp;速度: ${p.speed}`);
        }
    });
})

listen("merge-success", async (event) => {
    const p = event.payload;
    downPageElm.children().each(function() {
        const title = $(this).find('.down-page-info-title');
        $(this).find('.down-page-info-progress-bar').removeClass('scroll');
        if ($(this).attr('id') == (p.index) && title.text() == p.display_name) {
            $(this).find('.down-page-info-progress-text').html(`合并成功 - 音视频下载成功`);
        }
    });
})

listen("merge-failed", async (event) => {
    const p = event.payload;
    downPageElm.children().each(function() {
        const title = $(this).find('.down-page-info-title');
        $(this).find('.down-page-info-progress-bar').removeClass('scroll');
        if ($(this).attr('id') == (p.index) && title.text() == p.display_name) {
            $(this).find('.down-page-info-progress-text').html(`合并失败 - 音视频下载失败`);
        }
    });
})

listen("download-success", async (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '下载',
        timeout: 10000,
        message: `《${event.payload}》下载成功~<br>可在下载页中点击&nbsp;“定位文件”&nbsp;定位文件`,
    });
})

listen("download-failed", async (event) => {
    iziToast.error({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '下载',
        timeout: 10000,
        message: `《${event.payload[0]}》下载失败<br>错误原因: ${event.payload[1]}`,
    });
})

listen("error", async (event) => {
    iziToast.error({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '错误',
        timeout: 10000,
        message: `遇到错误：${event.payload}`,
    });
})
