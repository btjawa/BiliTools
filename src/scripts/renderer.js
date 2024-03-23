import { invoke } from '@tauri-apps/api/tauri';
import { emit, listen } from '@tauri-apps/api/event';
import { shell, dialog, http, app, os, clipboard } from '@tauri-apps/api';

import $ from "jquery";
import iziToast from "izitoast";
import Swal from "sweetalert2";
import protobuf from "protobufjs";

import * as tdata from "./data.ts";
import * as format from './format.ts';
import { login, verify } from './sdk.ts';

const searchInput = $('#search-input');
const videoListTabHead = $('.video-list-tab-head');
const loadingBox = $('.loading');
const videoList = $('.video-list');
const infoBlock = $('.info');
const multiSelectBtn = $('.multi-select-btn');
const multiSelectNext = $('.multi-select-next-btn');
const waitingList = $('.down-page-child.waiting');
const doingList = $('.down-page-child.doing');
const completeList = $('.down-page-child.complete');

const sidebar = tdata.sidebar;
const currentElm = tdata.currentElm;

let currentSel = [];
let userData = { mid: null, coins: null, isLogin: false };

let mediaData = [];
let selectedMedia = [];

const viewIcon = `<div class="bcc-iconfont bcc-icon-icon_list_player_x1 space"></div>`;
const danmakuIcon = `<div class="bcc-iconfont bcc-icon-danmuguanli space"></div>`;
const replyIcon = `<div class="bcc-iconfont bcc-icon-pinglunguanli space"></div>`;
const likeIcon = `<div class="bcc-iconfont bcc-icon-ic_Likesx space"></div>`;
const coinIcon = `<div class="bcc-iconfont bcc-icon-icon_action_reward_n_x space"></div>`;
const favoriteIcon = `<div class="bcc-iconfont bcc-icon-icon_action_collection_n_x space"></div>`;
const shareIcon = `<div class="bcc-iconfont bcc-icon-icon_action_share_n_x space"></div>`;
const bigVipIcon = `<svg class="user-vip-icon" width="16" height="16" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
<path d="M32.0002 61.3333C15.7986 61.3333 2.66667 48.2013 2.66667 32.0002C2.66667 15.7986 15.7986 2.66667 32.0002 2.66667C48.2013 2.66667 61.3333 15.7986 61.3333 32.0002C61.3333 48.2014 48.2014 61.3333 32.0002 61.3333Z" fill="#FF6699" stroke="white" stroke-width="5.33333"/>
<path d="M46.6262 22.731V22.7199H35.8032C35.8734 21.8558 35.914 20.9807 35.914 20.0982C35.914 19.1122 35.866 18.1337 35.7774 17.1699C35.7811 17.1072 35.7885 17.0444 35.7885 16.9779V16.9669C35.7885 14.9581 34.16 13.3333 32.1549 13.3333C30.1462 13.3333 28.5214 14.9618 28.5214 16.9669V16.9779C28.5214 17.2253 28.5473 17.469 28.5953 17.7017L28.5436 17.7091C28.6174 18.4956 28.6581 19.2895 28.6581 20.0945C28.6581 20.9807 28.6101 21.8558 28.5214 22.7162H17.392V22.731C15.4977 22.8528 13.9948 24.4259 13.9948 26.3534V26.3645C13.9948 28.3733 15.5346 29.9832 17.5397 29.9832C17.6948 29.9832 17.8535 29.9906 18.1046 29.9869L26.6124 29.9685C24.4559 34.9535 20.7153 39.0892 16.0294 41.7441C16.0072 41.7552 15.9888 41.7663 15.9666 41.7811C15.9149 41.8106 15.8669 41.8401 15.8152 41.8697L15.8189 41.8734C14.7961 42.5159 14.1129 43.6532 14.1129 44.9493V44.9604C14.1129 46.9692 15.7414 48.5939 17.7465 48.5939C18.5256 48.5939 19.242 48.3465 19.8328 47.9329C26.6604 43.9892 31.9002 37.6047 34.3631 29.9759H46.0428C46.2311 29.9795 46.5117 29.9685 46.5117 29.9685C48.6941 29.9242 50.1268 28.3807 50.1268 26.3756V26.3645C50.1305 24.3963 48.5722 22.8011 46.6262 22.731Z" fill="white"/>
<path d="M49.5283 43.2251C49.5209 43.2104 49.5098 43.1993 49.5024 43.1882C49.3769 42.963 49.2292 42.7562 49.063 42.5642C46.7182 39.2408 43.7678 36.3791 40.3596 34.1524L40.3559 34.1561C39.7614 33.7278 39.0302 33.473 38.2437 33.473C36.2349 33.473 34.6102 35.1014 34.6102 37.1065V37.1176C34.6102 38.4912 35.3746 39.6876 36.5008 40.3043C39.418 42.2318 41.7997 44.44 43.6829 47.3904L43.8786 47.6378C44.5248 48.2286 45.3815 48.5942 46.3268 48.5942C48.3356 48.5942 49.9603 46.9657 49.9603 44.9606V44.9496C49.9566 44.3255 49.8015 43.7384 49.5283 43.2251Z" fill="white"/>
</svg>`

iziToast.settings({
    closeOnEscape: 'true',
    transitionIn: 'bounceInLeft',
    transitionOut: 'fadeOutRight',
    displayMode: 'replace',
    position: 'topCenter',
    backgroundColor: '#3b3b3b',
    theme: 'dark'
});

function iziInfo(message = '') {
    console.log(message)
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: 2, timeout: 4000,
        title: '提示', message
    });
}

function iziError(message = '') {
    console.error(message);
    iziToast.error({
        icon: 'fa-regular fa-circle-exclamation',
        layout: 2, timeout: 10000,
        title: '警告 / 错误', message
    });
}

// https://github.com/gdsmith/jquery.easing
$.easing.easeOutQuint = function(x) {
    return 1 - Math.pow(1 - x, 5);
};

class MediaData {
    constructor(title, desc, pic, duration, id, cid, eid, type, rank, ss_title, display_name, badge, ext) {
        this.title = title;
        this.desc = desc;
        this.pic = pic;
        this.duration = duration;
        this.id = id;
        this.cid = cid;
        this.eid = eid;
        this.type = type;
        this.rank = rank;
        this.ss_title = ss_title || null;
        this.display_name = display_name || null;
        this.badge = badge || null;
        this.ext = ext || null;
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

function debounce(fn, wait) {
    let bouncing = false;
    return function(...args) {
        if (bouncing) {
            iziError(`请等待${wait / 1000}秒后再进行请求`);
            return null;
        }
        bouncing = true;
        setTimeout(() => {
            bouncing = false;
        }, wait);
        fn.apply(this, args);
    };
}

async function saveFile(options = {}) {
    return new Promise(async (resolve, reject) => {
        try {
            const selected = await dialog.save(options);
            resolve(selected);
        } catch(err) {
            iziError(err);
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
    const basicResp = (await http.fetch(basicUrl, { headers: tdata.headers })).data;
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
            { headers: tdata.headers })).data.data.map(item => item.info);
        }
        handleMediaList({ info, tags }, type);
        return basicResp;
    } else {
        if (basicResp.code == -404 && type == "bangumi") {
            basicUrl = `https://api.bilibili.com/pugv/view/web/season?${id.startsWith('ep') ? 'ep_id' : 'season_id'}=${id.match(/\d+/)[0]}`;
            const lssnResp = (await http.fetch(basicUrl, { headers: tdata.headers })).data;
            if (lssnResp.code === 0) {
                handleMediaList({ info: lssnResp.data }, "lesson");
                return lssnResp;
            }
        }
        handleErr(basicResp);
        backward();
        return null;
    }
}

async function getPlayUrl(data) {
    const params = {
        avid: data.id, cid: data.cid, fourk: 1,
        fnval: 4048, fnver: 0
    }
    const signature = await verify.wbi(params);
    const key = data.type == "bangumi" ? "pgc/player/web" : (data.type == "lesson" ? "pugv/player/web" : "x/player/wbi");
    loadingBox.addClass('active');
    const details = (await http.fetch(`https://api.bilibili.com/${key}/playurl?${signature}${data.type == "lesson" ? `&ep_id=${data.eid}` : ""}`,
    { headers: tdata.headers })).data;
    loadingBox.removeClass('active');
    if(handleErr(details)) return null;
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
    { headers: tdata.headers })).data;
    loadingBox.removeClass('active');
    if (handleErr(details)) return null;
    else return details;
}

function matchDownUrl(details, quality, action, fileType) {
    let downUrl = [];
    const isV = fileType === "video";
    for (const file of isV ? (details?.dash?.video || details?.durl) : details.dash.audio) {
        if (action == "music") downUrl[1] = details.dash.audio
        else if ((file.id == isV ? quality.dms_id : quality.ads_id
        && !isV || file.codecs == quality.codec_id) || details?.durl) {
            downUrl[isV ? 0 : 1] = [file.base_url || file.url];
            if (file.backup_url) downUrl[isV ? 0 : 1].push(...file.backup_url)
            break;
        }
    }
    if (action == "multi" && details?.dash) {
        const target = quality.ads_id == 30250 ? details.dash.dolby.audio
        : (quality.ads_id == 30251 ? details.dash.flac.audio : details.dash.audio);
        if (Array.isArray(target)) {
            for (const audio of target) {
                if (audio.id == quality.ads_id) {
                    downUrl[1] = [audio.base_url];
                    if (audio.backup_url) downUrl[1].push(...audio.backup_url);
                    break;
                }
            }
        } else {
            downUrl[1] = [target.base_url];
            if (target.backup_url) downUrl[1].push(...target.backup_url);
        }
    }
    return [isV, downUrl, quality, quality.ads_id=="flv" ? "only" : action]
}

function handleDown(isV, downUrl, quality, action, mediaData) {
    if (isV ? downUrl[0][0] : downUrl[1][0] && action == "multi" ? downUrl[1][0] : true) {
        let qualityStr, displayName, ext;
        const f_ext = (url) => url.split('.').pop().split('?')[0].split('#')[0];
        const safeTitle = format.filename(mediaData.title);
        if (action == "multi") {
            qualityStr = `${quality.dms_desc}-${quality.ads_desc}`;
            ext = "mp4";
        } else {
            if (quality.ads_id == "flv") {
                qualityStr = quality.dms_desc;
                ext = f_ext(downUrl[0][0]);
            } else {                
                qualityStr = action == "only" ? `${quality.dms_desc}-${quality.ads_desc}` : quality;
                ext = action == "only" ? isV ? "mp4" : "mp3" : f_ext(downUrl[1][0]);
            }
        }
        displayName = `${safeTitle} (${qualityStr}).${ext}`;
        mediaData.ss_title = format.filename(mediaData.ss_title);
        mediaData.display_name = displayName;
        return invoke('push_back_queue', {
            videoUrl: downUrl[0] || null,
            audioUrl: downUrl[1] || null,
            action, mediaData, date: format.pubdate(new Date(), true)
        });
    } else emit('error', "未找到符合条件的下载地址＞﹏＜");
}

function handleErr(err) {
    let errMsg = '';
    if (err.code === 0) {
        if ((err.data || err.result).v_voucher) errMsg = '目前请求次数过多, 已被风控, 请等待5分钟或更久后重新尝试请求';
    } else if (err.code === -404) {
        errMsg = `${err.message || err.msg}<br>\n错误代码: ${err.code}<br>\n可能是没有大会员/没有购买本片<br>\n或是地区受限<br>\n或是真的没有该资源`;
    } else errMsg = `${err.message || err.msg || err}<br>\n错误代码: ${err.code}`;
    if (errMsg) {
        console.error(err);
        emit('error', errMsg);
    }
    return errMsg;
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
                shell.open(`https://www.bilibili.com/${path}/${data[0]}/${ts?`?ts=${ts}`:''}`);
                return null;
            }
        } else iziError('请先点击搜索按钮或返回到搜索结果页面');
    }
}

async function backward() {
    const last = currentElm.at(-1);
    if (last == '.login') {
        emit('stop_login');
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
            element.value = element.value.substring(0, start) + (text || "") + element.value.substring(end);
            const pos = start + text?.length;
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
    invoke('ready').then(e => {
        tdata.set.secret(e);
        invoke('init', { secret: tdata.secret });
    });
    app.getVersion().then(ver => {
        $('#version').html(ver);
        $('#version-details').attr("t", `https://github.com/btjawa/BiliTools/releases/tag/v${ver}`);
    });
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
    searchInput.on('keydown', (e) => {if (e.key == "Enter") dbc()});
    $('.backward').on('click', () => backward());
    $(".login, .settings, .down-page, .user-profile").append(`<button class="help link"t="https://blog.btjawa.top/posts/bilitools/#Q-A"><span>遇到问题?&nbsp;前往文档</span>&nbsp;<a class="fa-solid fa-arrow-up-right-from-square"></a></button>`);
    $('.link').on('click', function() {shell.open($(this).attr("t"))});
    $(document).on('keydown', async function(e) {
        if (e.key == "F5" || (e.ctrlKey && e.key == "p") || (e.ctrlKey && e.key == "r")) e.preventDefault();
        if (e.key == "Escape") backward();
        if (e.ctrlKey && e.key == "a") {
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

function ShowMediaInfo(details, type) {
    const isV = (type == "video" || type == "ugc_season");
    const isA = type == "audio";
    const isL = type == "lesson";
    const root = details.info;
    $('.info-cover').attr("src", "").attr("src", 
    (isV ? root.pic : root.cover) + '@256h');
    $('.info-title').html(type == "bangumi" ? root.season_title : root.title);
    const desc = (isV ? root.desc : (isA ? root.intro : isL ? `${root.subtitle}<br>${root.faq.title}<br>${root.faq.content}` : root.evaluate));
    $('.info-desc').html(desc.replace(/\n/g, '<br>'));
    if (isV ? root.owner : (isA ? root.uname : root.up_info)) {
        if (!isA) $('.info-owner-face').attr("src", (isV ? root.owner.face : root.up_info.avatar) + '@128h');
        $('.info-owner-name').html(isV ? root.owner.name : (isA ? root.uname : root.up_info.uname));
    } else {
        $('.info-owner-face').css("display", "none");
        $('.info-owner-name').css("display", "none");
    }
    $('.info-title').css('max-width', `calc(100% - ${parseInt($('.info-owner').outerWidth(true))}px)`);
    $('.info-stat').html(`<div class="info-stat-item">${viewIcon + format.stat(isV ? root.stat.view : (isA ? root.statistic.play : root.stat.views || root.stat.play))}</div>`)
    .append(!isA && !isL ? `<div class="info-stat-item">${danmakuIcon + format.stat(isV ? root.stat.danmaku : root.stat.danmakus)}</div>` : '')
    .append(`<div class="info-stat-item">${isL ? root.release_info : (replyIcon + format.stat(isA ? root.statistic.comment : root.stat.reply))}</div>`)
    .append(!isA && !isL ? `<div class="info-stat-item">${likeIcon + format.stat(isV ? root.stat.like : root.stat.likes)}</div>` : '')
    $('.info-stat').append(isL ? '' : 
        `<div class="info-stat-item">${coinIcon + format.stat(isV ? root.stat.coin : (isA ? root.coin_num : root.stat.coins))}</div>
        <div class="info-stat-item">${favoriteIcon + format.stat(isV ? root.stat.favorite : (isA ? root.statistic.collect : (root.stat.favorites + root.stat.favorite)))}</div>
        <div class="info-stat-item">${shareIcon + format.stat(isA ? root.statistic.share : root.stat.share)}</div>`
    );
    let stylesText = '';
    const tagsRoot = details.tags;
    if (isV) stylesText = `${format.partition(root.tid)}&nbsp;·&nbsp;${root.tname}`;
    else if (!isL) {
        for (let i = 0; i < tagsRoot.length; i++) {
            stylesText += tagsRoot[i];
            if (i < tagsRoot.length - 1) stylesText += "&nbsp;·&nbsp;";
        }
    }
    const contrElm = $('<a>').addClass('bcc-iconfont bcc-icon-ic_contributionx space');
    const pubdateElm = $('<a>').addClass('bcc-iconfont bcc-icon-icon_into_history_gray_ space');
    const pubdate = !isL ? (isV ? format.pubdate(root.pubdate) : (isA ? format.pubdate(root.passtime) : root.publish.pub_time)) : "";
    $('.info-styles').empty().append(...(!isL ? [contrElm, stylesText, "&emsp;|&emsp;", pubdateElm, pubdate] : []));
}

function handleMediaList(details, type) {
    videoList.empty();
    let actualSearch = 0;
    mediaData = [], selectedMedia = [];
    const root = details.info;
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
                        episode.aid, episode.cid, episode.id,
                        type, rank + 1, ugc_root.title
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
                    { headers: tdata.headers, responseType: http.ResponseType.Text }).then(async player => {
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
                            root.aid, page.cid, page.bvid, type,
                            rank + 1, root.title
                        );
                        appendMediaBlock(mediaData[rank])
                        Object.values(page).forEach(id => {
                            if (val.includes(id)) actualSearch = rank;
                        });
                    });
                };
            }
        } else if (type == "bangumi" || type == "lesson") {
            const isL = type == "lesson";
            root.episodes.forEach((episode, rank) => {
                mediaData[rank] = new MediaData(
                    isL ? episode.title : episode.share_copy,
                    isL ? root.subtitle : episode.share_copy,
                    episode.cover, episode.duration, episode.aid,
                    episode.cid, episode.id, type, rank + 1,
                    isL ? root.title : root.season_title,
                    null, episode.badge_info || { text: episode.label,
                    bg_color_night: "#0BA395" }
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
                root.id, root.cod, root.uid,
                type, 0, root.title
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
            invoke('process_queue', { date: format.pubdate(new Date(), true) });
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
            iziError(selectedMedia.length < 1 ? "请至少选择一个视频"
            : "单次最多只能下载50个视频, 超出将很大可能触发风控");
            return null;
        }
        for (let i = 0; i < selectedMedia.length; i++) {
            const data = selectedMedia[i];
            const details = await getPlayUrl(data);
            if (details.code !== 0) continue;
            const dms = appendDimensionList(details, data.type, "multi");
            const ads = appendAudioList(details, data.type, "multi");
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
    { headers: tdata.headers })).data;
    loadingBox.removeClass('active');
    videoList.find('.stein-option, .video-block, .video-block-only, .video-block-multi')
    .removeClass('active').remove().end().addClass('active');
    $('.stein-tree').addClass('active').find('.stein-tree-node').remove();
    const current = response.data.story_list.find(item => item.edge_id === edge_id) || response.data;
    mediaData.push(new MediaData(
        current.title, info.desc, 
        info.pic, "未知", info.aid,
        current.cid, edge_id, type,
        mediaData.length + 1, info.title
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
        iziError("多选状态下请点击右下角 “确认/结算” 结算");
        return null;    
    }
    block.after(videoBlockAction);
    loadingBox.addClass('active');
    const details = await getPlayUrl(data);
    loadingBox.removeClass('active');
    if (!details || details.code !== 0) {
        videoBlockAction.remove();
        return null;
    }
    if (action == "only") {
        appendMoreList(data, videoBlockAction);
        videoBlockAction.append(crossSplit.clone());
    }
    appendDimensionList(details, data.type, action, videoBlockAction);
    if (action == "only") videoBlockAction.append(crossSplit);
    appendAudioList(details, data.type, action, videoBlockAction);
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
    const isV = root.type != "audio";
    const page = $('<div>').addClass('video-block-page').text(isV ? root.rank : audio.type + 1);
    const badge = root.badge?.text ? $('<div>').addClass('video-block-badge').html(root.badge.text).css("background", root.badge.bg_color_night) : ""; 
    const name = $('<div>').addClass('video-block-name').html(isV ? root.title : audio.desc + "&emsp;|&emsp;" + audio.bps).append(badge);
    const duration = $('<div>').addClass('video-block-duration').text(format.duration(root.duration, root.type));
    const block = $('<div>').addClass('video-block');
    const checkLabel = $('<label>').addClass('multi-select-box');
    const checkBox = $('<input>').attr('type', 'checkbox').addClass('multi-select-box-org');
    const checkBoxMark = $('<span>').addClass('multi-select-box-checkmark');
    checkLabel.append(checkBox, checkBoxMark);
    const operates = $('<div>').addClass('video-block-operates');
    const split = $('<div>').addClass('video-block-split');
    const getCoverBtn = $('<button>').addClass('video-block-getcover-btn video-block-operates-item')
    .html(`<i class="fa-solid fa-image space"></i>解析封面`);
    const getMultiBtn = $('<button>').addClass('video-block-getvideo-btn video-block-operates-item')
    .html(`<i class="fa-solid fa-file-video space"></i>解析音视频`);
    const getAudioBtn = $('<button>').addClass('video-block-getaudio-btn video-block-operates-item')
    .html(`<i class="fa-solid fa-file-audio space"></i>解析音频`);
    const getMoreBtn = $('<button>').addClass('video-block-getmore-btn video-block-operates-item')
    .html(`<i class="fa-solid fa-anchor space"></i>更多解析`);
    operates.append(getCoverBtn, ...(isV ? [getMultiBtn, getMoreBtn] : [getAudioBtn]));
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
    getCoverBtn.on('click', async () => {
        const content = (await http.fetch(root.pic.replace(/http/g, 'https'), {
            headers: tdata.headers,
            responseType: http.ResponseType.Binary
        })).data;
        const sel = await saveFile({
            filters: [{ name: 'JPG 文件', extensions: ['jpg'] }],
            defaultPath: `封面_${format.filename(isV ? root.title : audio.desc)}.jpg`
        });
        if (sel) invoke('save_file', { content, path: sel, secret: tdata.secret });
    });
    getMultiBtn.on('click', () => initActionBlock("multi", block, root));
    getMoreBtn.on('click', () => initActionBlock("only", block, root));
    getAudioBtn.on('click', async () => {
        const details = await getMusicUrl(root.id, audio.type);
        const res = matchDownUrl({dash:{audio:details.data.cdns}}, audio.bps.replace("kbit/s", "K"), "music", "audio");
        handleDown(...res, root, format);
        sidebar.downPage.click();
});
}

async function appendDownPageBlock(info, target, action) { // 填充下载块
    const displayName = info.media_data.title;
    const infoBlock = $('<div>').attr("vgid", info.gid.vgid).attr("agid", info.gid.agid).addClass('down-page-info');
    const infoCover = $('<img>').addClass('down-page-info-cover').attr("src", info.media_data.pic.replace("http:", "https:") + '@256h')
    .attr("referrerPolicy", "no-referrer").attr("draggable", false);
    const infoData = $('<div>').addClass('down-page-info-data');
    const infoTitle = $('<div>').addClass('down-page-info-title').html(displayName).css('max-width', `100%`);
    const infoProgCont = $('<div>').addClass('down-page-info-progress-cont');
    const infoProgText = $('<div>').addClass('down-page-info-progress-text').html(function() {
        switch(action) { case "doing": return "等待同步"; case "complete": return "下载完毕"; default: return "等待下载"; }
    });
    const openDirBtn = $('<button>').addClass('down-page-info-btn').html(`<i class="fa-solid fa-file-${displayName.includes("mp3")?'audio':'video'} space"></i>定位文件`);
    const stopBtn = $('<button>').addClass('down-page-info-btn').html(`<i class="fa-solid fa-circle-stop space"></i>暂停`);
    const playBtn = $('<button>').addClass('down-page-info-btn').html(`<i class="fa-solid fa-play space"></i>继续`);
    infoProgCont.append(openDirBtn, stopBtn, playBtn, infoProgText);
    const infoProgressBar = $('<div>').addClass('down-page-info-progress-bar').css("width", action == "complete" ? "100%" : 0);
    const infoProgress = $('<div>').addClass('down-page-info-progress').html(infoProgressBar);
    infoBlock.append(infoCover, infoData.append(infoTitle, infoProgCont, infoProgress)).appendTo(target);
    openDirBtn.on('click', () => {
        if (action == "complete") {
            invoke('open_select', { path: info.output_path });
        } else iziError('请等待下载完毕');
    });
    function handleAction(type) {
        if (action == "doing") {
            invoke(`handle_download`, { gid: infoBlock.attr(infoProgText.text().includes("视频") ? "vgid" : "agid") , action: type });
        }
    }
    stopBtn.on('click', () => handleAction("pause"));
    playBtn.on('click', () => handleAction("unpause"));
}

function appendMoreList(data, block) { // 填充更多解析
    const dms = $('<div>').addClass("video-block-opt-cont more");
    const text = $('<div>').addClass("video-block-opt-text").text("更多解析");
    const split = $('<div>').addClass("video-block-split");
    const opt = $('<div>').addClass("video-block-opt more");
    const dmhk = $('<button>').addClass("video-block-opt-item history-danmaku").html("<i class='fa-solid fa-meteor space'></i>历史弹幕");
    const aism = $('<button>').addClass("video-block-opt-item ai-summary").html("<i class='fa-solid fa-microchip-ai space'></i>视频AI总结");
    dms.append(text, split, opt).appendTo(block);
    opt.append(dmhk, aism);
    async function dm(url) {
        return new Promise(async (resolve, reject) => {
            try {
                // https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/grpc_api/bilibili/community/service/dm/v1/dm.proto
                protobuf.load('../proto/dm.proto', async function(err, root) {
                    const DmSegMobileReply = root.lookupType("bilibili.community.service.dm.v1.DmSegMobileReply");
                    loadingBox.addClass('active');
                    const response = await http.fetch(url,{ headers: tdata.headers, responseType: http.ResponseType.Binary });
                    loadingBox.removeClass('active');
                    const message = DmSegMobileReply.decode(new Uint8Array(response.data));
                    resolve(message.elems)
                });
            } catch(err) {
                iziError(err);
                reject(err)
            }
        })
    }
    function noLogin() {
        if (!userData.isLogin) {
            iziError('该模块需要登录');
            return true;
        } else return false;
    }
    function saved() {
        Swal.fire({
            title: '<strong>数据结构</strong>',
            icon: 'info',
            html: '有关数据结构请查看 <a href="https://blog.btjawa.top/posts/bilitools#DanmakuElem" target="_blank">BiliTools#DanmakuElem</a>',
        })
        iziInfo('JSON保存成功~');
        return null;
    }
    async function refresh(month) {
        const params0 = new URLSearchParams({
            type: 1, oid: data.cid, month
        });
        loadingBox.addClass('active');
        const dateList = (await http.fetch(`https://api.bilibili.com/x/v2/dm/history/index?${params0.toString()}`, { headers: tdata.headers })).data;
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
                    const encoder = new TextEncoder();
                    const content = Array.from(encoder.encode(JSON.stringify(await dm(url), null, 2)));
                    const selected = await saveFile({
                        filters: [{ name: 'JSON 文件', extensions: ['json'] }],
                        defaultPath: `弹幕_${date}_${format.filename(data.title)}.json`
                    });
                    if (selected) {
                        invoke('save_file', { content, path: selected, secret: tdata.secret });
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
        const response = await http.fetch(`https://api.bilibili.com/x/web-interface/view/conclusion/get?${signature}`, { headers: tdata.headers });
        loadingBox.removeClass('active');
        const root = response.data;
        if (root.data.code !== 0) {
            iziError(`${root.data.code === 1 ? "未找到可用无摘要" : "本视频不支持AI摘要"}`)
            return null;
        }
        const summary = $('<div>').addClass('ai-summary-cont');
        const summaryHeader = $('<div>').addClass('ai-summary-header').append($('<img>').addClass("space").attr("draggable", false)
        .attr("src", await (await import("../assets/ai-summary-icon.svg")).default)).append('<span>已为你生成视频总结</span>')
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

function appendDimensionList(details, type, action, block = null) { // 填充分辨率
    const root = type == "bangumi" ? details.result : details.data;
    const dms = $('<div>').addClass("video-block-opt-cont dimension");
    const text = $('<div>').addClass("video-block-opt-text").text("分辨率/画质");
    const split = $('<div>').addClass("video-block-split");
    const opt = $('<div>').addClass("video-block-opt dimension");
    dms.append(text, split, opt).appendTo(block);
    const maxQuality = Math.max(...root.accept_quality);
    const qualityList = root.accept_quality.filter(quality => quality <= maxQuality);
    for (const quality of qualityList) {
        const qualityItem = root.support_formats.find(format => format.quality === quality);
        const description = qualityItem.display_desc + (qualityItem.superscript ? `-${qualityItem.superscript}` : '');
        const currentBtn = $('<button>').addClass(`video-block-opt-item dimension`);
        const currentIcon = $('<i>').addClass(`fa-solid fa-${quality <= 32 ? 'standard':'high'}-definition space`);
        currentBtn.append(currentIcon, qualityItem.new_description);
        opt.append(currentBtn);
        if (quality == maxQuality) {
            currentBtn.addClass('checked');
            currentSel[0] = quality;
            currentSel[1] = description;
            const codec = appendCodecList(qualityItem, "init", action, block);
            if (!block) return [quality, description, ...codec];
        }
        currentBtn.on('click', function() {
            block.find('.video-block-opt-item.dimension').removeClass('checked');
            $(this).addClass('checked');
            currentSel[0] = quality;
            currentSel[1] = qualityItem.display_desc;
            appendCodecList(qualityItem, "update", action, block);
        });
    }
};

function appendCodecList(details, type, action, block = null) { // 填充编码格式
    const dms = $('<div>').addClass("video-block-opt-cont codec");
    const text = $('<div>').addClass("video-block-opt-text").text("编码格式");
    const split = $('<div>').addClass("video-block-split");
    const opt = $('<div>').addClass("video-block-opt codec");
    const downBtn = $('<button>').addClass(`video-block-video-down-btn ${action}`).text('下一步');
    if (action == "only") opt.append(downBtn)
    if (block) {
        block.find('.video-block-opt.codec').remove();
        if (type == "init") dms.append(text, split, opt).appendTo(block);
        else block.find('.video-block-opt-cont.codec').append(opt);
    }
    if (!details.codecs) return null;
    const codecsList = details.codecs.map(codec => ({
        codec, 
        priority: (codec.includes('avc') ? 1 : codec.includes('hev') ? 2 : 3)
    }))
    .sort((a, b) => a.priority - b.priority);
    for (let i = 0; i < codecsList.length; i++) {
        const codec = codecsList[i].codec;
        const description = format.codec(codec);
        const currentBtn = $('<button>').addClass(`video-block-opt-item codec`);
        const currentIcon = $('<i>').addClass(`fa-solid fa-rectangle-code space`);
        currentBtn.append(currentIcon, description);
        opt.prepend(currentBtn);
        if (codec == 0) continue;
        if (i === 0) {
            currentBtn.addClass('checked');
            currentSel[2] = codec;
            currentSel[3] = description;
            if (!block) return [codec, description];
        }
        currentBtn.on('click', function() {
            block.find('.video-block-opt-item.codec').removeClass('checked');
            $(this).addClass('checked');
            currentSel[2] = codec;
            currentSel[3] = description
        });
    }
}

function appendAudioList(details, type, action, block = null) { // 填充音频
    const root = type == "bangumi" ? details.result : details.data;
    const dms = $('<div>').addClass("video-block-opt-cont audio");
    const text = $('<div>').addClass("video-block-opt-text").text("比特率/音质");
    const split = $('<div>').addClass("video-block-split");
    const opt = $('<div>').addClass("video-block-opt audio");
    const downBtn = $('<button>').addClass(`video-block-${action=="multi"?'video':'vaudio'}-down-btn ${action}`).text('下一步');
    dms.append(text, split, opt.append(downBtn)).appendTo(block);
    if (!root.accept_format.split(",").includes("mp4") && root.durl && root.durl.length > 0) {
        iziInfo("由于此视频是 FLV 格式，因此我们无法获取音质与编码格式信息。<br>\n此视频已包含音频，因此在下载完成后无需合并音视频。")
        currentSel[4] = "flv";
        return null;
    }
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
        const currentIcon = $('<i>').addClass(`fa-solid fa-${quality==0?'music-note-slash':'audio-description'} space`);
        currentBtn.append(currentIcon, description);
        opt.prepend(currentBtn);
        if (quality == 0) {
            currentBtn.css('cursor', 'not-allowed');
            continue;
        } else if (!block || !block.find('.video-block-opt-item.audio').hasClass('checked')) {
            currentBtn.addClass('checked');
            currentSel[4] = quality;
            currentSel[5] = description;
            if (!block) return [quality, description];
        };
        currentBtn.on('click', function() {
            item.removeClass('checked');
            $(this).addClass('checked');
            currentSel[4] = quality;
            currentSel[5] = description;
        });
    }
}

async function userProfile() {
    if (!userData.isLogin) { handleLogin(); return null; }
    currentElm.push(".user-profile");
    $('.user-profile').addClass('active');
    const detailData = await http.fetch(`https://api.bilibili.com/x/web-interface/card?mid=${userData.mid}&photo=true`,
    { headers: tdata.headers });
    if (detailData.ok) {
        const details = detailData.data;
        $('.user-profile-img').attr("src", details.data.space.l_img.replace("http:", "https:") + '@200h');
        $('.user-profile-avatar').attr("src", details.data.card.face + '@256h');
        $('.user-profile-name').html(details.data.card.name);
        $('.user-profile-desc').html(details.data.card.sign);
        const level = details.data.card.level_info.current_level;
        const senior = details.data.card.is_senior_member;
        $('.user-profile-sex').attr("src", await import(`../assets/${details.data.card.sex == "男" ? "male" : "female"}.png`).default);
        $('.user-profile-level').attr("src", await (await import(`../assets/level/level${level}${senior?"_hardcore":""}.svg`)).default);
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
    login.scanLogin($('#login-qrcode'));
    $('.login-qrcode-tips').removeClass('active');
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
            if (!username || !password) throw '请输入账号与密码'
            loadingBox.addClass('active');
            await login.pwdLogin(username, password);
            loadingBox.removeClass('active');
        } catch(err) { iziError(err); loadingBox.removeClass('active'); }
    });
    pwdInput.off('keydown').on('keydown', (e) => {
        if (e.key == "Enter") loginBtn.click();
    });
}

async function smsLogin() {
    login.codeList();
    let key, canSend = true;
    $('.login-sms-getcode-btn').off('click').on('click', async function() {
        if (!canSend) return null;
        const tel = $('#tel-input').val().toString();
        if (!tel) { iziError("请输入手机号"); return null; }
        else if ((tel.match(/^1[3456789]\d{9}$/) && $('.login-sms-item-text').text().includes('+86'))
        || (!$('.login-sms-item-text').text().includes('+86') && tel)) { try {
            loadingBox.addClass('active');
            const response = await login.sendSms(tel, $('.login-sms-item-text').text().replace(/[^0-9]/g, ''))
            loadingBox.removeClass('active');
            if (response.code !== 0) { iziError(response.message); return null; }
            key = response.data.captcha_key;
            let timeout = 60;
            canSend = false;
            $('.login-sms-getcode-btn').text(`重新发送(${timeout})`).addClass("disabled");
            const timer = setInterval(() => {
                $('.login-sms-getcode-btn').text(`重新发送(${--timeout})`);
                if (timeout === 0) {
                    clearInterval(timer);
                    $('.login-sms-getcode-btn').text('重新发送').removeClass("disabled");
                    canSend = true;
                }
            }, 1000);
        } catch(err) { iziError(err); loadingBox.removeClass('active'); } }
    });
    $('.login-sms-login-btn').off('click').on('click', async function() {
        try {
            const tel = $('#tel-input').val().toString();
            const code = $('#sms-input').val().toString();
            if (!tel || !code || !key) { iziError(!tel || !code ? "请输入手机号与验证码" : "请先获取短信验证码"); return null; }
            loadingBox.addClass('active');
            await invoke('sms_login', { tel, code, key, cid: $('.login-sms-item-text').text().replace(/[^0-9]/g, '') })
            loadingBox.removeClass('active');
        } catch(err) { iziError(err); loadingBox.removeClass('active'); }
    });
}

async function handleLogin() {
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

listen("user-mid", async function(e) {
    const mid = e.payload;
    sidebar.userProfile.attr('data-after', mid=="0" ? "登录" : '主页');
    invoke('insert_cookie', { cookieStr: `_uuid=${verify.uuid()}; Path=/; Domain=bilibili.com` });
    const signature = await verify.wbi({ mid });
    const details = (await http.fetch(`https://api.bilibili.com/x/space/wbi/acc/info?${signature}`, { headers: tdata.headers })).data;
    userData = { mid, coins: null, isLogin: false };
    if (currentElm.at(-1) == ".login" || currentElm.at(-1) == ".user-profile") {
        backward();
    }
    $('.user-avatar').attr('src', mid=="0" ? await (await import("../assets/default.jpg")).default : details.data.face);
    $('.user-name').text( mid=="0" ? "登录" : details.data.name);
    if (details.code === 0 && details.data.vip.type != 0 && details.data.vip.avatar_subscript == 1) {
        $('.user-vip-icon').css('display', 'block');
    } else $('.user-vip-icon').css('display', 'none');
    const dbc = debounce(userProfile, 1000);
    sidebar.userProfile.off('click').on('click', dbc);
    if (mid != "0") {
        userData = { mid, coins: details.data.coins, isLogin: true };
        iziInfo(`登录成功~`);
        invoke('insert_cookie', { cookieStr: `bili_ticket=${(await verify.bili_ticket()).data.ticket}; Path=/; Domain=bilibili.com` });
        verify.checkRefresh();
    }
});

listen("headers", (e) => tdata.set.headers(e.payload));

listen("login-status", async (e) => {
    if (e.payload == 86090 || e.payload == 86038) {
        const ex = e.payload == 86038;
        $('.login-qrcode-tips').addClass('active')
        .html(ex ? `<i class="fa-solid fa-rotate-right"></i><span>二维码已过期</span><span>请点击刷新</span>`
        : `<i class="fa-solid fa-check"></i><span>扫码成功</span><span>请在手机上确认</span>`);
        $('.login-qrcode-box').off('click').on('click', () => {
            if (ex) scanLogin();
            $('.login-qrcode-box').off('click');
        });
    }
});

listen("download-queue", async (e) => {
    const p = e.payload;
    $('.down-page-info').remove();
    p.waiting.forEach(info => appendDownPageBlock(info, waitingList, "waiting"));
    p.doing.forEach(info => appendDownPageBlock(info, doingList, "doing"));
    p.complete.forEach(info => appendDownPageBlock(info, completeList, "complete"));
    [waitingList, doingList, completeList].forEach(elm => {
        const type = elm.attr('class').split(/\s+/)[1];
        const len = elm.find('.down-page-info').length;
        const sel = $(`.down-page-sel.${type} span`).html(len);
        elm.find('.down-page-empty').toggleClass("active", len === 0);
        sel.toggleClass("active", len !== 0);
        if (elm.hasClass('waiting')) $('.down-page-start-process').toggleClass("active", len !== 0);
    });
    if (p.waiting.length === 0 && p.doing.length === 0) $('.down-page-sel.complete').click();
});

listen("progress", async (e) => {
    const p = e.payload;
    doingList.children().each(function() {
        const block = $(this);
        if (block.attr('vgid') === p.gid.vgid && block.attr('agid') === p.gid.agid) {
            block.find('.down-page-info-progress-bar').css('width', p.progress);
            let pt = p.type === "download" 
                ? `${p.file_type === "audio" ? "音频" : "视频"} - 总进度: ${p.progress}&emsp;剩余时间: ${format.duration(p.remaining, "progress")}&emsp;当前速度: ${p.speed}`
                : `合并音视频 - 已合并帧: ${p.frame}&emsp;fps: ${p.fps}&emsp;已合并至: ${p.out_time}&emsp;速度: ${p.speed}`;
            if (p.type === "download" && parseFloat(p.progress) >= 100) {
                pt = `${p.file_type === "audio" ? "音频" : "视频"}下载成功`;
            }
            block.find('.down-page-info-progress-text').html(pt);
        }
    });
});

listen("error", (e) => iziError(`遇到错误：${e.payload}`))
