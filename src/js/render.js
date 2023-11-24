const { invoke } = window.__TAURI__.tauri;
const { listen } = window.__TAURI__.event;
const { open } = window.__TAURI__.shell;

const searchBtn = $('.search-btn');
const searchInput = $('input[name="search-input"]');
const searchElm = $('.search');
const videoList = $('.video-list');
const infoBlock = $('.info');
const videoListTabHead = $('.video-list-tab-head');
const loadingBox = $('.loading');
const loginElm = $('.login');
const downPageElm = $('.down-page');
let getDetailUrl, currentElm, currentFocus = null;
let downVideos = 0;
let downAudios = 0;

const viewIcon = `<svg class="icon-small" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 20 20" width="20" height="20">
<path d="M10 4.040041666666666C7.897383333333334 4.040041666666666 6.061606666666667 4.147 4.765636666666667 4.252088333333334C3.806826666666667 4.32984 3.061106666666667 5.0637316666666665 2.9755000000000003 6.015921666666667C2.8803183333333333 7.074671666666667 2.791666666666667 8.471183333333332 2.791666666666667 9.998333333333333C2.791666666666667 11.525566666666668 2.8803183333333333 12.922083333333333 2.9755000000000003 13.9808C3.061106666666667 14.932983333333334 3.806826666666667 15.666916666666667 4.765636666666667 15.744683333333336C6.061611666666668 15.849716666666666 7.897383333333334 15.956666666666667 10 15.956666666666667C12.10285 15.956666666666667 13.93871666666667 15.849716666666666 15.234766666666667 15.74461666666667C16.193416666666668 15.66685 16.939000000000004 14.933216666666667 17.024583333333336 13.981216666666668C17.11975 12.922916666666667 17.208333333333332 11.526666666666666 17.208333333333332 9.998333333333333C17.208333333333332 8.470083333333333 17.11975 7.073818333333334 17.024583333333336 6.015513333333334C16.939000000000004 5.063538333333333 16.193416666666668 4.329865000000001 15.234766666666667 4.252118333333334C13.93871666666667 4.147016666666667 12.10285 4.040041666666666 10 4.040041666666666zM4.684808333333334 3.255365C6.001155 3.14862 7.864583333333334 3.0400416666666668 10 3.0400416666666668C12.13565 3.0400416666666668 13.999199999999998 3.148636666666667 15.315566666666667 3.2553900000000002C16.753416666666666 3.3720016666666672 17.890833333333333 4.483195 18.020583333333335 5.925965000000001C18.11766666666667 7.005906666666667 18.208333333333336 8.433 18.208333333333336 9.998333333333333C18.208333333333336 11.56375 18.11766666666667 12.990833333333335 18.020583333333335 14.0708C17.890833333333333 15.513533333333331 16.753416666666666 16.624733333333335 15.315566666666667 16.74138333333333C13.999199999999998 16.848116666666666 12.13565 16.95666666666667 10 16.95666666666667C7.864583333333334 16.95666666666667 6.001155 16.848116666666666 4.684808333333334 16.7414C3.2467266666666665 16.624750000000002 2.1092383333333338 15.513266666666667 1.9795200000000002 14.070383333333334C1.8823900000000002 12.990000000000002 1.7916666666666667 11.562683333333334 1.7916666666666667 9.998333333333333C1.7916666666666667 8.434066666666666 1.8823900000000002 7.00672 1.9795200000000002 5.926381666666667C2.1092383333333338 4.483463333333334 3.2467266666666665 3.371976666666667 4.684808333333334 3.255365z" fill="currentColor"></path>
<path d="M12.23275 9.1962C12.851516666666667 9.553483333333332 12.851516666666667 10.44665 12.232683333333332 10.803866666666666L9.57975 12.335600000000001C8.960983333333335 12.692816666666667 8.1875 12.246250000000002 8.187503333333334 11.531733333333333L8.187503333333334 8.4684C8.187503333333334 7.753871666666667 8.960983333333335 7.307296666666667 9.57975 7.66456L12.23275 9.1962z" fill="currentColor" data-darkreader-inline-fill="" style="--darkreader-inline-fill: currentColor;"></path>
</svg>`;
const danmakuIcon = `<svg class="icon-small" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 20 20" width="20" height="20">
<path d="M10 4.040041666666666C7.897383333333334 4.040041666666666 6.061606666666667 4.147 4.765636666666667 4.252088333333334C3.806826666666667 4.32984 3.061106666666667 5.0637316666666665 2.9755000000000003 6.015921666666667C2.8803183333333333 7.074671666666667 2.791666666666667 8.471183333333332 2.791666666666667 9.998333333333333C2.791666666666667 11.525566666666668 2.8803183333333333 12.922083333333333 2.9755000000000003 13.9808C3.061106666666667 14.932983333333334 3.806826666666667 15.666916666666667 4.765636666666667 15.744683333333336C6.061611666666668 15.849716666666666 7.897383333333334 15.956666666666667 10 15.956666666666667C12.10285 15.956666666666667 13.93871666666667 15.849716666666666 15.234766666666667 15.74461666666667C16.193416666666668 15.66685 16.939000000000004 14.933216666666667 17.024583333333336 13.981216666666668C17.11975 12.922916666666667 17.208333333333332 11.526666666666666 17.208333333333332 9.998333333333333C17.208333333333332 8.470083333333333 17.11975 7.073818333333334 17.024583333333336 6.015513333333334C16.939000000000004 5.063538333333333 16.193416666666668 4.329865000000001 15.234766666666667 4.252118333333334C13.93871666666667 4.147016666666667 12.10285 4.040041666666666 10 4.040041666666666zM4.684808333333334 3.255365C6.001155 3.14862 7.864583333333334 3.0400416666666668 10 3.0400416666666668C12.13565 3.0400416666666668 13.999199999999998 3.148636666666667 15.315566666666667 3.2553900000000002C16.753416666666666 3.3720016666666672 17.890833333333333 4.483195 18.020583333333335 5.925965000000001C18.11766666666667 7.005906666666667 18.208333333333336 8.433 18.208333333333336 9.998333333333333C18.208333333333336 11.56375 18.11766666666667 12.990833333333335 18.020583333333335 14.0708C17.890833333333333 15.513533333333331 16.753416666666666 16.624733333333335 15.315566666666667 16.74138333333333C13.999199999999998 16.848116666666666 12.13565 16.95666666666667 10 16.95666666666667C7.864583333333334 16.95666666666667 6.001155 16.848116666666666 4.684808333333334 16.7414C3.2467266666666665 16.624750000000002 2.1092383333333338 15.513266666666667 1.9795200000000002 14.070383333333334C1.8823900000000002 12.990000000000002 1.7916666666666667 11.562683333333334 1.7916666666666667 9.998333333333333C1.7916666666666667 8.434066666666666 1.8823900000000002 7.00672 1.9795200000000002 5.926381666666667C2.1092383333333338 4.483463333333334 3.2467266666666665 3.371976666666667 4.684808333333334 3.255365z" fill="currentColor"></path>
<path d="M13.291666666666666 8.833333333333334L8.166666666666668 8.833333333333334C7.890526666666666 8.833333333333334 7.666666666666666 8.609449999999999 7.666666666666666 8.333333333333334C7.666666666666666 8.057193333333334 7.890526666666666 7.833333333333334 8.166666666666668 7.833333333333334L13.291666666666666 7.833333333333334C13.567783333333335 7.833333333333334 13.791666666666668 8.057193333333334 13.791666666666668 8.333333333333334C13.791666666666668 8.609449999999999 13.567783333333335 8.833333333333334 13.291666666666666 8.833333333333334z" fill="currentColor" data-darkreader-inline-fill="" style="--darkreader-inline-fill: currentColor;"></path><path d="M14.541666666666666 12.166666666666666L9.416666666666668 12.166666666666666C9.140550000000001 12.166666666666666 8.916666666666666 11.942783333333333 8.916666666666666 11.666666666666668C8.916666666666666 11.390550000000001 9.140550000000001 11.166666666666668 9.416666666666668 11.166666666666668L14.541666666666666 11.166666666666668C14.817783333333335 11.166666666666668 15.041666666666668 11.390550000000001 15.041666666666668 11.666666666666668C15.041666666666668 11.942783333333333 14.817783333333335 12.166666666666666 14.541666666666666 12.166666666666666z" fill="currentColor" data-darkreader-inline-fill="" style="--darkreader-inline-fill: currentColor;"></path><path d="M6.5 8.333333333333334C6.5 8.609449999999999 6.27614 8.833333333333334 6 8.833333333333334L5.458333333333333 8.833333333333334C5.182193333333334 8.833333333333334 4.958333333333334 8.609449999999999 4.958333333333334 8.333333333333334C4.958333333333334 8.057193333333334 5.182193333333334 7.833333333333334 5.458333333333333 7.833333333333334L6 7.833333333333334C6.27614 7.833333333333334 6.5 8.057193333333334 6.5 8.333333333333334z" fill="currentColor" data-darkreader-inline-fill="" style="--darkreader-inline-fill: currentColor;"></path><path d="M7.750000000000001 11.666666666666668C7.750000000000001 11.942783333333333 7.526140000000001 12.166666666666666 7.25 12.166666666666666L6.708333333333334 12.166666666666666C6.432193333333334 12.166666666666666 6.208333333333334 11.942783333333333 6.208333333333334 11.666666666666668C6.208333333333334 11.390550000000001 6.432193333333334 11.166666666666668 6.708333333333334 11.166666666666668L7.25 11.166666666666668C7.526140000000001 11.166666666666668 7.750000000000001 11.390550000000001 7.750000000000001 11.666666666666668z" fill="currentColor"></path>
</svg>`;
const replyIcon = `<i style="margin-right:8px;" class="fa-regular fa-message-dots"></i>`
const likeIcon = `<svg class="icon-small" width="20" height="20" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M9.77234 30.8573V11.7471H7.54573C5.50932 11.7471 3.85742 13.3931 3.85742 15.425V27.1794C3.85742 29.2112 5.50932 30.8573 7.54573 30.8573H9.77234ZM11.9902 30.8573V11.7054C14.9897 10.627 16.6942 7.8853 17.1055 3.33591C17.2666 1.55463 18.9633 0.814421 20.5803 1.59505C22.1847 2.36964 23.243 4.32583 23.243 6.93947C23.243 8.50265 23.0478 10.1054 22.6582 11.7471H29.7324C31.7739 11.7471 33.4289 13.402 33.4289 15.4435C33.4289 15.7416 33.3928 16.0386 33.3215 16.328L30.9883 25.7957C30.2558 28.7683 27.5894 30.8573 24.528 30.8573H11.9911H11.9902Z" fill="currentColor" data-darkreader-inline-fill="" style="--darkreader-inline-fill: currentColor;"></path>
</svg>`;
const coinIcon = `<svg class="icon-small" width="20" height="20" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" >
<path fill-rule="evenodd" clip-rule="evenodd" d="M14.045 25.5454C7.69377 25.5454 2.54504 20.3967 2.54504 14.0454C2.54504 7.69413 7.69377 2.54541 14.045 2.54541C20.3963 2.54541 25.545 7.69413 25.545 14.0454C25.545 17.0954 24.3334 20.0205 22.1768 22.1771C20.0201 24.3338 17.095 25.5454 14.045 25.5454ZM9.66202 6.81624H18.2761C18.825 6.81624 19.27 7.22183 19.27 7.72216C19.27 8.22248 18.825 8.62807 18.2761 8.62807H14.95V10.2903C17.989 10.4444 20.3766 12.9487 20.3855 15.9916V17.1995C20.3854 17.6997 19.9799 18.1052 19.4796 18.1052C18.9793 18.1052 18.5738 17.6997 18.5737 17.1995V15.9916C18.5667 13.9478 16.9882 12.2535 14.95 12.1022V20.5574C14.95 21.0577 14.5444 21.4633 14.0441 21.4633C13.5437 21.4633 13.1382 21.0577 13.1382 20.5574V12.1022C11.1 12.2535 9.52148 13.9478 9.51448 15.9916V17.1995C9.5144 17.6997 9.10883 18.1052 8.60856 18.1052C8.1083 18.1052 7.70273 17.6997 7.70265 17.1995V15.9916C7.71158 12.9487 10.0992 10.4444 13.1382 10.2903V8.62807H9.66202C9.11309 8.62807 8.66809 8.22248 8.66809 7.72216C8.66809 7.22183 9.11309 6.81624 9.66202 6.81624Z" fill="currentColor"></path>
</svg>`
const favoriteIcon = `<svg class="icon-small" width="20" height="20" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M19.8071 9.26152C18.7438 9.09915 17.7624 8.36846 17.3534 7.39421L15.4723 3.4972C14.8998 2.1982 13.1004 2.1982 12.4461 3.4972L10.6468 7.39421C10.1561 8.36846 9.25639 9.09915 8.19315 9.26152L3.94016 9.91102C2.63155 10.0734 2.05904 11.6972 3.04049 12.6714L6.23023 15.9189C6.96632 16.6496 7.29348 17.705 7.1299 18.7605L6.39381 23.307C6.14844 24.6872 7.62063 25.6614 8.84745 25.0119L12.4461 23.0634C13.4276 22.4951 14.6544 22.4951 15.6359 23.0634L19.2345 25.0119C20.4614 25.6614 21.8518 24.6872 21.6882 23.307L20.8703 18.7605C20.7051 17.705 21.0339 16.6496 21.77 15.9189L24.9597 12.6714C25.9412 11.6972 25.3687 10.0734 24.06 9.91102L19.8071 9.26152Z" fill="currentColor"></path>
</svg>`
const shareIcon = `<svg class="icon-small" width="20" height="20" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
<path d="M12.6058 10.3326V5.44359C12.6058 4.64632 13.2718 4 14.0934 4C14.4423 4 14.78 4.11895 15.0476 4.33606L25.3847 12.7221C26.112 13.3121 26.2087 14.3626 25.6007 15.0684C25.5352 15.1443 25.463 15.2144 25.3847 15.2779L15.0476 23.6639C14.4173 24.1753 13.4791 24.094 12.9521 23.4823C12.7283 23.2226 12.6058 22.8949 12.6058 22.5564V18.053C7.59502 18.053 5.37116 19.9116 2.57197 23.5251C2.47607 23.6489 2.00031 23.7769 2.00031 23.2122C2.00031 16.2165 3.90102 10.3326 12.6058 10.3326Z" fill="currentColor"></path>
</svg>`
const bigVipIcon = `<svg class="user-vip-icon" width="16" height="16" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
<path d="M32.0002 61.3333C15.7986 61.3333 2.66667 48.2013 2.66667 32.0002C2.66667 15.7986 15.7986 2.66667 32.0002 2.66667C48.2013 2.66667 61.3333 15.7986 61.3333 32.0002C61.3333 48.2014 48.2014 61.3333 32.0002 61.3333Z" fill="#FF6699" stroke="white" stroke-width="5.33333"/>
<path d="M46.6262 22.731V22.7199H35.8032C35.8734 21.8558 35.914 20.9807 35.914 20.0982C35.914 19.1122 35.866 18.1337 35.7774 17.1699C35.7811 17.1072 35.7885 17.0444 35.7885 16.9779V16.9669C35.7885 14.9581 34.16 13.3333 32.1549 13.3333C30.1462 13.3333 28.5214 14.9618 28.5214 16.9669V16.9779C28.5214 17.2253 28.5473 17.469 28.5953 17.7017L28.5436 17.7091C28.6174 18.4956 28.6581 19.2895 28.6581 20.0945C28.6581 20.9807 28.6101 21.8558 28.5214 22.7162H17.392V22.731C15.4977 22.8528 13.9948 24.4259 13.9948 26.3534V26.3645C13.9948 28.3733 15.5346 29.9832 17.5397 29.9832C17.6948 29.9832 17.8535 29.9906 18.1046 29.9869L26.6124 29.9685C24.4559 34.9535 20.7153 39.0892 16.0294 41.7441C16.0072 41.7552 15.9888 41.7663 15.9666 41.7811C15.9149 41.8106 15.8669 41.8401 15.8152 41.8697L15.8189 41.8734C14.7961 42.5159 14.1129 43.6532 14.1129 44.9493V44.9604C14.1129 46.9692 15.7414 48.5939 17.7465 48.5939C18.5256 48.5939 19.242 48.3465 19.8328 47.9329C26.6604 43.9892 31.9002 37.6047 34.3631 29.9759H46.0428C46.2311 29.9795 46.5117 29.9685 46.5117 29.9685C48.6941 29.9242 50.1268 28.3807 50.1268 26.3756V26.3645C50.1305 24.3963 48.5722 22.8011 46.6262 22.731Z" fill="white"/>
<path d="M49.5283 43.2251C49.5209 43.2104 49.5098 43.1993 49.5024 43.1882C49.3769 42.963 49.2292 42.7562 49.063 42.5642C46.7182 39.2408 43.7678 36.3791 40.3596 34.1524L40.3559 34.1561C39.7614 33.7278 39.0302 33.473 38.2437 33.473C36.2349 33.473 34.6102 35.1014 34.6102 37.1065V37.1176C34.6102 38.4912 35.3746 39.6876 36.5008 40.3043C39.418 42.2318 41.7997 44.44 43.6829 47.3904L43.8786 47.6378C44.5248 48.2286 45.3815 48.5942 46.3268 48.5942C48.3356 48.5942 49.9603 46.9657 49.9603 44.9606V44.9496C49.9566 44.3255 49.8015 43.7384 49.5283 43.2251Z" fill="white"/>
</svg>`

const downCoverIcon = `<i class="fa-solid fa-image icon-small"></i>`;
const downVideoIcon = `<i class="fa-solid fa-file-video icon-small"></i>`;
const downAudioIcon = `<i class="fa-solid fa-file-audio icon-small"></i>`;

iziToast.settings({
    timeout: 2500,
    icon: 'Fontawesome',
    closeOnEscape: 'true',
    transitionIn: 'bounceInLeft',
    transitionOut: 'fadeOutRight',
    displayMode: 'replace',
    position: 'topCenter',
    backgroundColor: '#3b3b3b',
    theme: 'dark'
});

async function getVideoDmstion(aid, cid, type, videoData) {
    if (type != "bangumi") {
        getDetailUrl = `http://127.0.0.1:50808/api/x/player/wbi/playurl?avid=${aid}&cid=${cid}&fnval=2000&fnver=0&fourk=1`
    } else {
        getDetailUrl = `http://127.0.0.1:50808/api/pgc/player/web/playurl?avid=${aid}&cid=${cid}&fnval=2000&fnver=0&fourk=1`;
    }
    const detailData = await fetch(getDetailUrl);
    if (detailData.ok) {
        const dmstions = await detailData.json();
        // if (dmstions.data && dmstions.data.support_formats)
        applyDimensionList(JSON.stringify(dmstions, null, 2), type, videoData);
    }
}
  
async function getVideoAudio(aid, cid, type, videoData) {
    if (type != "bangumi") {
        getDetailUrl = `http://127.0.0.1:50808/api/x/player/wbi/playurl?avid=${aid}&cid=${cid}&fnval=2000&fnver=0&fourk=1`
    } else {
        getDetailUrl = `http://127.0.0.1:50808/api/pgc/player/web/playurl?avid=${aid}&cid=${cid}&fnval=2000&fnver=0&fourk=1`;
    }
    const detailData = await fetch(getDetailUrl);
    if (detailData.ok) {
        const audios = await detailData.json();
        // if (audios.data && audios.data.dash.audio)
        getAudioList(JSON.stringify(audios, null, 2), type, videoData);
    }
}

async function parseVideo(videoId) {
    if (videoId.includes('BV') || videoId.includes('bv')) {
        getDetailUrl = `http://127.0.0.1:50808/api/x/web-interface/view?bvid=${videoId}`;
    } else if (videoId.includes('AV') || videoId.includes('av')) {
        getDetailUrl = `http://127.0.0.1:50808/api/x/web-interface/view?aid=${videoId.match(/\d+/)[0]}`;
    } else {
        console.error(`Error: ${videoId}不是AV/BV号`); applyVideoList(`Error: ${videoId}不是AV/BV号`);
    }
    const detailData = await fetch(getDetailUrl);
    if (detailData.ok) {
        const details = await detailData.json();
        // if (details.data && details.data.pages)
        applyVideoList(JSON.stringify(details, null, 2));
    }
}
  
  
async function parseBangumi(videoId) {
    if (videoId.includes('ep') || videoId.includes('EP')) {
        getDetailUrl = `http://127.0.0.1:50808/api/pgc/view/web/season?ep_id=${videoId.match(/\d+/)[0]}`;
    } else if (videoId.includes('ss') || videoId.includes('SS')) {
        getDetailUrl = `http://127.0.0.1:50808/api/pgc/view/web/season?season_id=${videoId.match(/\d+/)[0]}`;
    } else {
        console.error(`Error: ${videoId}不是EP/SS号`);  applyVideoList(`Error: ${videoId}不是EP/SS号`);
    }
    const detailData = await fetch(getDetailUrl);
    if (detailData.ok) {
        const details = await detailData.json();
        // if (details.data && details.data.pages)
        applyVideoList(JSON.stringify(details, null, 2));
    }
}


async function search(input) {
    try {
        infoBlock.removeClass('active');
        videoList.removeClass('active');
        videoListTabHead.removeClass('active');
        let match = input.match(/BV[a-zA-Z0-9]+|av(\d+)/i);
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
        iziToast.error({
            icon: 'fa-regular fa-circle-exclamation',
            layout: '2',
            title: `警告`,
            message: input ? `输入不合法！请检查格式` : "请输入链接/AV/BV/SS/EP号"
        });
        loadingBox.removeClass('active');
        if (searchElm.attr('class').includes('active')) searchElm.removeClass('active').addClass('back');
        throw new Error(`${input?input:"input"} is not valid`);
    } catch (err) {
        console.error(err);
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

function formatDuration(num) {
    const hs = Math.floor(num / 3600);
    const mins = Math.floor((num % 3600) / 60);
    const finalHs = hs > 0 ? String(hs).padStart(2, '0') + ':' : '';
    const finalMins = String(mins).padStart(2, '0');
    const finalSecs = String(num % 60).padStart(2, '0');
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

async function paste() {
    await navigator.clipboard.readText()
    .then((text) => {
        if (currentFocus && (currentFocus.tagName === 'INPUT' || currentFocus.tagName === 'TEXTAREA')) {
            currentFocus.value = text;
        }
    })
    $('.context-menu').css({ opacity: 0, display: "none" });
}

async function cutText() {
    if (currentFocus && (currentFocus.tagName === 'INPUT' || currentFocus.tagName === 'TEXTAREA')) {
        const selectedText = currentFocus.value.substring(currentFocus.selectionStart, currentFocus.selectionEnd);
        if (selectedText) {
            navigator.clipboard.writeText(selectedText);
            const start = currentFocus.value.substring(0, currentFocus.selectionStart);
            const end = currentFocus.value.substring(currentFocus.selectionEnd);
            currentFocus.value = start + end;
            currentFocus.setSelectionRange(currentFocus.selectionStart, currentFocus.selectionStart);
        }
    }
    $('.context-menu').css({ opacity: 0, display: "none" });
}

async function bilibili() {
    if (searchInput.val()){
        if ($('.info').hasClass('active')) {
            const input = searchInput.val();
            let match = input.match(/BV[a-zA-Z0-9]+|av(\d+)/i);
            if (match) {
                let url = 'https://www.bilibili.com/video/' + match[0];
                open(url);
                $('.context-menu').css({ opacity: 0, display: "none" });
            }
            match = input.match(/ep(\d+)|ss(\d+)/i);
            if (match) {
                let url = 'https://www.bilibili.com/bangumi/play/' + match[0];
                open(url);
                $('.context-menu').css({ opacity: 0, display: "none" });
            }
            iziToast.error({
                icon: 'fa-regular fa-circle-exclamation',
                layout: '2',
                title: `警告`,
                message: `输入不合法！请检查格式`
            });
            throw new Error(`${input?input:"input"} is not valid`);
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
            message: "请输入链接/AV/BV/SS/EP号"
        });
    }
}

async function backward() {
    if (currentElm == '.login') {
        loginElm.removeClass('active').addClass('back');
        invoke('stop_login');
    } else if (currentElm == '.down-page') {
        downPageElm.removeClass('active').addClass('back');
    } else {
        infoBlock.removeClass('active');
        videoList.removeClass('active');
        videoListTabHead.removeClass('active');
        if (searchElm.attr('class').includes('active')) searchElm.removeClass('active').addClass('back');
        loadingBox.removeClass('active').addClass('back');
    }
    currentElm = undefined;
}

$(document).ready(function () {
    invoke('init_sessdata');
    $('.user-avatar-placeholder').append(bigVipIcon);
    searchBtn.on('click', async () => {
        await search(searchInput.val());
    });
    $('.user-avatar-placeholder').on('click', async () => {
        // if ($('.user-name').text() == "游客")
        login();
    });
    $('.down-page-bar-background').on('click', () => {
        currentElm = '.down-page';
        downPageElm.addClass('active').removeClass('back');
    })
    searchInput.on('keydown', async (e) => {
        if (e.keyCode === 13) await search(searchInput.val());;
    });
    $('.cut').on('click', () => cutText());
    $('.copy').on('click', () => copy());
    $('.paste').on('click', () => paste());
    $('.bilibili').on('click', () => bilibili());
    $('.backward').on('click', () => backward());
    $(document).on('keydown', async (e) => {
        if (e.keyCode === 116 || (e.ctrlKey && e.keyCode === 82)) {
            e.preventDefault();
        }
        if (e.keyCode === 27) {
            if (!$('.context-menu').is(e.target) && $('.context-menu').has(e.target).length === 0)
            $('.context-menu').removeClass('active');
            backward();
        }
    });
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
        });
        void $('.context-menu')[0].offsetHeight;
        $('.context-menu').css('animation', 'fadeInAnimation 0.2s');
    });
    $(document).on('click', async (e) => {
        if (!$('.context-menu').is(e.target) && $('.context-menu').has(e.target).length === 0)
        $('.context-menu').css({ opacity: 0, display: "none" });
    });
    $(document).on('focusin', function(event) {
        currentFocus = event.target;
    });
});

function initVideoInfo(type, details) {
    console.log(details)
    const isVideo = type === "video";
    $('.info-cover').attr("src", (isVideo ? details.data.pic : details.result.cover).replace(/http:/g, 'https:'));
    $('.info-title').html(isVideo ? details.data.title : details.result.season_title);
    $('.info-desc').html((isVideo ? details.data.desc : details.result.evaluate).replace(/\n/g, '<br>'));
    $('.info-owner-face').attr("src", (isVideo ? details.data.owner.face : details.result.up_info.avatar).replace(/http:/g, 'https:'));
    $('.info-owner-name').html(isVideo ? details.data.owner.name : details.result.up_info.uname);
    $('.info-title').css('max-width', `calc(100% - ${parseInt($('.info-owner').outerWidth(true))}px)`);
    $('.info-stat').html(
        `<div class="info-stat-item">${viewIcon + formatStat(isVideo ? details.data.stat.view : details.result.stat.views)}</div>
        <div class="info-stat-item">${danmakuIcon + formatStat(isVideo ? details.data.stat.danmaku : details.result.stat.danmakus)}</div>
        <div class="info-stat-item" style="bottom:4px;position:relative;">${replyIcon + formatStat(isVideo ? details.data.stat.reply : details.result.stat.reply)}</div>
        <div class="info-stat-item">${likeIcon + formatStat(isVideo ? details.data.stat.like : details.result.stat.likes)}</div>
        <div class="info-stat-item">${coinIcon + formatStat(isVideo ? details.data.stat.coin : details.result.stat.coins)}</div>
        <div class="info-stat-item">${favoriteIcon + formatStat(isVideo ? details.data.stat.favorite : parseInt(details.result.stat.favorites) + parseInt(details.result.stat.favorite))}</div>
        <div class="info-stat-item">${shareIcon + formatStat(isVideo ? details.data.stat.share : details.result.stat.share)}</div>`
        );
        let stylesText = '';
        if (isVideo) stylesText = `${getPartition(details.data.tid)}&nbsp;·&nbsp;${details.data.tname}`;
        else {
            for (let i = 0; i < details.result.styles.length; i++) {
                stylesText += details.result.styles[i];
                if (i < details.result.styles.length - 1) stylesText += " · ";
            }
        }
        if (isVideo ? details.data.actors : details.result.actors) {
            stylesText += ('<p>声优：'+details.result.actors+'</p>').replace(/\n/g, '&nbsp;');
        }
        $('.info-styles').html('<p>'+stylesText+'</p>');
    }
    
    let currentVideoBlock;
    
    function appendVideoBlock(data, type, index, extra) {
        let videoPage, videoName, videoDuration;
        if (type == "ugc_season") {
            videoPage = $('<div>').addClass('video-block-page').text(index);
            videoName = $('<div>').addClass('video-block-name').text(data.title);
            videoDuration = $('<div>').addClass('video-block-duration').text(formatDuration(data.arc.duration));
        } else if (type == "video") {
            videoPage = $('<div>').addClass('video-block-page').text(data.page);
            videoName = $('<div>').addClass('video-block-name').text(data.part);
            videoDuration = $('<div>').addClass('video-block-duration').text(formatDuration(data.duration));
        } else if (type == "bangumi") {
            videoPage = $('<div>').addClass('video-block-page').text(index);
            videoName = $('<div>').addClass('video-block-name').html(`第${index}话&nbsp;${data.long_title}`);
            videoDuration = $('<div>').addClass('video-block-duration').text(formatDuration(data.duration / 1000));
        }
        const videoBlock = $('<div>').addClass('video-block');
    const videoOperates = $('<div>').addClass('video-block-operates');
    const videoSplit1 = $('<div>').addClass('video-block-split');
    const videoSplit2 = $('<div>').addClass('video-block-split');
    const videoSplit3 = $('<div>').addClass('video-block-split');
    const getCoverBtn = $('<div>').addClass('video-block-getcover-btn video-block-operates-item').html(`${downCoverIcon}解析封面`);
    const getVideoBtn = $('<div>').addClass('video-block-getvideo-btn video-block-operates-item').html(`${downVideoIcon}解析视频`);
    const getAudioBtn = $('<div>').addClass('video-block-getaudio-btn video-block-operates-item').html(`${downAudioIcon}解析音频`);
    const videoBlockDimension = $('<div>').addClass('video-block-dimension');
    const videoBlockAudio = $('<div>').addClass('video-block-audio');
    videoBlock.append(videoPage, videoSplit1, videoName, videoSplit2, videoDuration, videoSplit3, videoOperates).appendTo(videoList);
    videoOperates.append(getCoverBtn, getVideoBtn, getAudioBtn).appendTo(videoBlock);
    getCoverBtn.on('click', function() {
        let options = {
            title: '选择下载线路',
            background: "#2b2b2b",
            color: "#c4c4c4",
            html: `<button class="swal2-cancel swal2-styled swal-btn-main">主线路</button>`,
            showConfirmButton: false,
        };
        Swal.fire(options);
        $('.swal-btn-main').on('click', () => {
            let coverUrl;
            if (type == "video") {
                coverUrl = extra[1];
            } else if (type == "ugc_season") {
                coverUrl = data.arc.pic;
            } else if (type == "bangumi") {
                coverUrl = data.cover;
            }
            open(coverUrl.replace(/http/g, 'https'));
            Swal.close();
        })
    });
    getVideoBtn.on('click', function() {
        currentVideoBlock = $(this).closest('.video-block');
        currentVideoBlock.next('.video-block-dimension').empty();
        currentVideoBlock.after(videoBlockDimension);
        videoBlockDimension.addClass('active').append($('<div>').addClass('loading-dimension active'));
        if (type == "video") {
            getVideoDmstion(index, data.cid, type, [data.part, extra[0], extra[1], data.cid]);
        } else if (type == "ugc_season") {
            getVideoDmstion(data.aid, data.cid, type, [data.title, data.arc.desc, data.arc.pic, data.cid]);
        } else if (type == "bangumi") {
            getVideoDmstion(data.aid, data.cid, type, [data.share_copy, data.share_copy, data.cover, data.cid]);
        }
    });
    getAudioBtn.on('click', function() {
        currentVideoBlock = $(this).closest('.video-block');
        currentVideoBlock.next('.video-block-audio').empty();
        currentVideoBlock.after(videoBlockAudio);
        videoBlockAudio.addClass('active').append($('<div>').addClass('loading-audio active'));
        if (type == "video") {
            getVideoAudio(index, data.cid, type, [data.part, extra[0], extra[1], data.cid]);
        } else if (type == "ugc_season") {
            getVideoAudio(data.aid, data.cid, type, [data.title, data.arc.desc, data.arc.pic, data.cid]);
        } else if (type == "bangumi") {
            getVideoAudio(data.aid, data.cid, type, [data.share_copy, data.share_copy, data.cover, data.cid]);
        }
        getAudioBtn.off('click');
    });
}

function getVideoDownUrl(data, quality, videoData) {
    let found;
    let downUrl = new Array(3);
    for (let video of data.dash.video) {
        if (video.id == quality) {
            found = true;
            downUrl = [video.baseUrl, video.backupUrl[0], video.backupUrl[1]];
            break;
        }
    }
    if (found) {
        downVideos++;
        const quality = videoData[videoData.length-1].slice(3);
        const handelDown = async() => {
            Swal.close();
            $('.swal-btn-main').off('click');
            $('.swal-btn-backup1').off('click');
            $('.swal-btn-backup2').off('click');
            iziToast.info({
                icon: 'fa-solid fa-circle-info',
                layout: '2',
                title: '下载',
                message: `已添加《${downVideos}_${videoData[0]}_${quality}》至下载页~`,
            });
            appendDownPageBlock(videoData, 'mp4', quality);
        }
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
        Swal.fire(options);
        $('.swal-btn-main').on('click', () => {
            console.log(downUrl[0]);
            invoke('download_file', {url: downUrl[0], filename: `${downVideos}_${videoData[0]}_${quality}.mp4`, cid: videoData[3].toString()});
            handelDown();
        })
        $('.swal-btn-backup1').on('click', () => {
            console.log(downUrl[1]);
            invoke('download_file', {url: downUrl[1], filename: `${downVideos}_${videoData[0]}_${quality}.mp4`, cid: videoData[3].toString()});
            handelDown();
        })
        $('.swal-btn-backup2').on('click', () => {
            console.log(downUrl[1]);
            invoke('download_file', {url: downUrl[1], filename: `${downVideos}_${videoData[0]}_${quality}.mp4`, cid: videoData[3].toString()});
            handelDown();
        })
    } else {

    }
}

function getAudioDownUrl(data, quality, videoData) {
    let found;
    let downUrl;
    for (let audio of data.dash.audio) {
        if (audio.id == quality) {
            found = true;
            downUrl = [audio.baseUrl, audio.backupUrl[0], audio.backupUrl[1]];
            break;
        }
    }
    if (found) {
        downAudios++;
        const quality = videoData[videoData.length-1];
        const handelDown = async() => {
            Swal.close();
            $('.swal-btn-main').off('click');
            $('.swal-btn-backup1').off('click');
            $('.swal-btn-backup2').off('click');
            iziToast.info({
                icon: 'fa-solid fa-circle-info',
                layout: '2',
                title: '下载',
                message: `已添加《${downVideos}_${videoData[0]}_${quality}》至下载页~`,
            });
            appendDownPageBlock(videoData, 'mp3', quality);
        }
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
        Swal.fire(options);
        $('.swal-btn-main').on('click', () => {
            console.log(downUrl[0]);
            invoke('download_file', {url: downUrl[0], filename: `${downVideos}_${videoData[0]}_${quality}.mp3`, cid: videoData[3].toString()});
            handelDown();
        })
        $('.swal-btn-backup1').on('click', () => {
            console.log(downUrl[1]);
            invoke('download_file', {url: downUrl[1], filename: `${downVideos}_${videoData[0]}_${quality}.mp3`, cid: videoData[3].toString()});
            handelDown();
        })
        $('.swal-btn-backup2').on('click', () => {
            console.log(downUrl[1]);
            invoke('download_file', {url: downUrl[1], filename: `${downVideos}_${videoData[0]}_${quality}.mp3`, cid: videoData[3].toString()});
            handelDown();
        })
    } else {

    }
}

async function appendDownPageBlock(videoData, type, quality) {
    const title = videoData[0];
    const desc = videoData[1];
    const pic = videoData[2];
    const cid = videoData[3];
    const downPage = $('.down-page');
    if (downPage.find('.down-page-empty-text').length) {
        downPage.find('.down-page-empty-text').remove();
    }
    let dupl;
    if (downPage.find('.down-page-info').length) {
        downPage.children().each(function() {
            const infoId = $(this).find('.down-page-info-id');
            const infoTitle = $(this).find('.down-page-info-title');
            if (infoId.text() == `cid: ${cid}` && infoTitle.text() == `${downVideos}_${title}_${quality}.${type}`)
            dupl = true;
        });
    }
    if (dupl) return;
    const infoBlock = $('<div>').addClass('down-page-info')
    const infoCover = $('<img>').addClass('down-page-info-cover').attr("src", pic.replace(/http:/g, 'https:'))
    .attr("referrerPolicy", "no-referrer").attr("draggable", false);
    const infoData = $('<div>').addClass('down-page-info-data');
    const infoId = $('<i>').addClass('down-page-info-id').text(`cid: ${cid}`);
    const infoDesc = $('<div>').addClass('down-page-info-desc').html(desc.replace(/\n/g, '<br>'));
    const infoTitle = $('<div>').addClass('down-page-info-title').html(`${downVideos}_${title}_${quality}.${type}`).css('max-width', `100%`);
    const infoProgressText = $('<div>').addClass('down-page-info-progress-text');
    const infoProgress = $('<div>').addClass('down-page-info-progress').html($('<div>').addClass('down-page-info-progress-bar'));
    infoBlock.append(infoCover, infoData.append(infoId, infoTitle, infoDesc, infoProgressText, infoProgress)).appendTo(downPage);
}

async function login() {
    try {
        currentElm = '.login';
        $('.login-status').html('当前状态：正在与服务器通信...');
        loginElm.addClass('active').removeClass('back');
        const response = await fetch('http://127.0.0.1:50808/passport/x/passport-login/web/qrcode/generate');
        const qrData = await response.json();
        if (qrData.code !== 0) {
            throw new Error('Failed to get QR Code');
        }
        const { qrcode_key, url } = qrData.data;
        $('#login-qrcode').empty();
        new QRCode("login-qrcode", {
            text: url,
            width: 200,
            height: 200,
            colorDark: "#c4c4c4",
            colorLight: "#1F1F1F",
            correctLevel: QRCode.CorrectLevel.H
        });
        invoke('login', {qrcodeKey: qrcode_key});
    } catch (error) {
        console.error('Error during login:', error);
    }
}
  
function applyVideoList(detailData) {
    const details = JSON.parse(detailData);
    videoList.empty();
    loadingBox.removeClass('active');
    if (details.code == 0) {
        infoBlock.addClass('active');
        videoList.addClass('active');
        videoListTabHead.addClass('active');
        if (details.data) {
            initVideoInfo("video", details);
            if (details.data.ugc_season) {
                let index = 1;
                for (let episode of details.data.ugc_season.sections[0].episodes) {
                    appendVideoBlock(episode, "ugc_season", index);
                    index++;
                }
            } else if (details.data.videos >= 1) {
                for (let page of details.data.pages) {
                    appendVideoBlock(page, "video", details.data.aid, [details.data.desc, details.data.pic]);
                }
            }
        } else if (details.result) {
            initVideoInfo("bangumi", details);
            let index = 1;
            for (let episode of details.result.episodes) {
                appendVideoBlock(episode, "bangumi", index);
                index++;
            }
        }
    } else {
        console.error(details);
        iziToast.error({
            icon: 'fa-regular fa-circle-exclamation',
            layout: '2',
            title: "警告",
            message: `遇到错误：${details.message}<br>错误代码：${details.code}`,
        });
        loadingBox.removeClass('active');
        if (searchElm.attr('class').includes('active')) searchElm.removeClass('active').addClass('back');
    }
};

function applyDimensionList(detailData, type, videoData) {
    const details = JSON.parse(detailData);
    $(currentVideoBlock.next('.video-block-dimension').children('.loading-dimension')).removeClass('active');
    if (details.code == 0) {
        const dms = $('<div>').addClass("video-block-dimension-dms");
        const dm = $('<div>').addClass("video-block-dimension-dm").text("分辨率/画质");
        const split = $('<div>').addClass("video-block-dimension-split");
        const dmsOpt = $('<div>').addClass("video-block-dimension-dms-opt");
        dms.append(dm, split, dmsOpt);
        currentVideoBlock.next('.video-block-dimension').append(dms);
        const qualityIcon = {
            16: 'fa-standard-definition',
            32: 'fa-standard-definition',
            64: 'fa-high-definition',
            80: 'fa-high-definition',
            112: 'fa-high-definition',
            116: 'fa-high-definition',
            120: 'fa-high-definition',
            127: 'fa-high-definition'
        };
        const length = type!="bangumi" ? details.data.accept_quality.length : details.result.accept_quality.length;
        for (let i = 0; i < length; i++) {
            const quality = type!="bangumi" ? details.data.accept_quality[i] : details.result.accept_quality[i];
            const description = type!="bangumi" ? details.data.accept_description[i] : details.result.accept_description[i];
            const iconClass = qualityIcon[quality] || 'fa-standard-definition';
            const currentBtn = $('<div>').addClass(`video-block-dimension-dms-${quality} video-block-dimension-dms-item`);
            const currentIcon = $('<i>').addClass(`fa-solid ${iconClass} icon-small`);
            currentBtn.append(currentIcon, description);
            dmsOpt.append(currentBtn);
            currentBtn.on('click', function(){
                const updatedVideoData = [...videoData, description];
                getVideoDownUrl(type!="bangumi" ? details.data : details.result, quality, updatedVideoData);
            })
        }
    } else {
        console.error(details);
        iziToast.error({
            icon: 'fa-regular fa-circle-exclamation',
            layout: '2',
            title: "警告",
            message: `遇到错误：${details.message}<br>错误代码：${details.code}`,
        });
    }
};

async function getAudioList(detailData, type, videoData) {
    const details = JSON.parse(detailData);
    $(currentVideoBlock.next('.video-block-audio').children('.loading-audio')).removeClass('active');
    if (details.code == 0) {
        const ads = $('<div>').addClass("video-block-audio-ads");
        const ad = $('<div>').addClass("video-block-audio-ad").text("比特率/音质");
        const split = $('<div>').addClass("video-block-audio-split");
        const adsOpt = $('<div>').addClass("video-block-audio-ads-opt");
        ads.append(ad, split, adsOpt);
        currentVideoBlock.next('.video-block-audio').append(ads);
        const qualityDesc = {
            30216: "64K",
            30232: "132K",
            30280: "192K"
        }
        const length = type!="bangumi" ? details.data.dash.audio.length : details.result.dash.audio.length;
        for (let i = 0; i < length; i++) {
            const quality = type!="bangumi" ? details.data.dash.audio[i].id : details.result.dash.audio[i].id;
            const description = qualityDesc[quality];
            const currentBtn = $('<div>').addClass(`video-block-audio-ads-${quality} video-block-audio-ads-item`);
            const currentIcon = $('<i>').addClass(`fa-solid fa-audio-description icon-small`);
            currentBtn.append(currentIcon, description);
            adsOpt.append(currentBtn);
            currentBtn.on('click', function(){
                const updatedVideoData = [...videoData, description];
                getAudioDownUrl(type!="bangumi" ? details.data : details.result, quality, updatedVideoData);
            })
        }
    } else {
        console.error(details);
        iziToast.error({
            icon: 'fa-regular fa-circle-exclamation',
            layout: '2',
            title: "警告",
            message: `遇到错误：${details.message}<br>错误代码：${details.code}`,
        });
    }
}

async function getUserProfile(mid, action) {
    const getDetailUrl = `http://127.0.0.1:50808/api/x/space/wbi/acc/info?mid=${mid}`;
    const detailData = await fetch(getDetailUrl);
    if (detailData.ok) {
        const details = await detailData.json();
        if (details.code != "0"){
            console.error(details);
            return;
        } else if (action == "init") {
            $('.user-avatar').attr('src', details.data.face);
            $('.user-name').text(details.data.name);
            if (details.data.vip.type != 0 && details.data.vip.avatar_subscript == 1) {
                $('.user-vip-icon').css('display', 'block');
            }
        } else if (action == "login") {
            $('.login-status').html(`当前状态：成功同步数据<br><i>将在3秒后跳转至首页</i>`);
            let i = 2;
            const countdown = setInterval(() => {
                $('.login-status').html(`当前状态：成功同步数据<br><i>将在${i}秒后跳转至首页</i>`);
                i--;
                if (i < 0) {
                    clearInterval(countdown);
                    loginElm.removeClass('active').addClass('back');
                }
            }, 1000);
            $('.user-avatar').attr('src', details.data.face);
            $('.user-name').text(details.data.name);
            if (details.data.vip.type != 0 && details.data.vip.avatar_subscript == 1) {
                $('.user-vip-icon').css('display', 'block');
            }
        }
    }
}

listen("user-mid", async (event) => {
    getUserProfile(event.payload[0], event.payload[1]);
})

listen("login-status", async (event) => {
    $('.login-status').html(`当前状态：${event.payload}`);
})

listen("download-progress", async (event) => {
    const infoBlock = $('.down-page-info');
    infoBlock.children().each(function() {
        const id = $(this).find('.down-page-info-id');
        const title = $(this).find('.down-page-info-title');
        if (id.text() == `cid: ${event.payload[0]}` && title.text() == event.payload[6]) {
            $(this).find('.down-page-info-progress-bar').css('width', event.payload[1]);
            $(this).find('.down-page-info-progress-text')
            .html(`总进度: ${event.payload[1]}&emsp;剩余时间: ${event.payload[2]}&emsp;当前速度: ${event.payload[4]}`);
        }
    });
})

listen("download-complete", async (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '下载',
        message: `《${event.payload[1]}》已下载至桌面~`,
    });
    const infoBlock = $('.down-page-info');
    infoBlock.children().each(function() {
        const id = $(this).find('.down-page-info-id');
        const title = $(this).find('.down-page-info-title');
        if (id.text() == `cid: ${event.payload[0]}` && title.text() == event.payload[1]) {
            $(this).find('.down-page-info-progress-text').html(`已下载至桌面`);
        }
    });
})