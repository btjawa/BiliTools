import iziToast from "izitoast";
import router from "@/router";
import store from "@/store";
import { MediaType } from "../types/DataTypes";
import * as shell from "@tauri-apps/plugin-shell";
import * as log from '@tauri-apps/plugin-log';
import { auth } from "@/services";

iziToast.settings({
    closeOnEscape: true,
    transitionIn: 'bounceInLeft',
    transitionOut: 'fadeOutRight',
    position: "topRight",
    backgroundColor: '#3b3b3b',
    theme: 'dark'
});


export class ApplicationError extends Error {
    code?: number | string;
    constructor(error: Error, options?: { code?: number | string | undefined }) {
        console.log(error.stack)
        super();
        this.message = error.message;
        this.code = options?.code || -108;
        this.name = error.name;
        this.stack = error.stack ? error.stack
            .replace(/\n(?!at)/g, function(_, offset, string) {
                let nextIndex = offset;
                while (!/^at/.test(string.slice(nextIndex))) {
                    nextIndex = string.indexOf('\n', nextIndex + 1);
                    if (nextIndex === -1) break;
                }
                return '';
            })
            .replace(/at\s+[^\s]+\s+\((?:http:\/\/[^)]+)?(src\/[^)]+)\)/g, 'at $1')
            .replace(/^.*?(?=at\s)/gm, '')
        : "Unknown stack trace";
    }
    handleError() {
        const msg = `${this.message} (${this.code})\n${this.stack}`;
        log.error(msg);
        iziError(new Error(msg));
        return msg;
    }
}

export function iziInfo(message = '') {
    console.log(message)
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: 2, timeout: 4000,
        title: '提示', message
    });
}

export function iziError(err: ApplicationError | Error) {
    const msg = err.message;
    console.error(msg);
    iziToast.error({
        icon: 'fa-regular fa-circle-exclamation',
        layout: 2, timeout: 10000,
        title: '警告 / 错误', message: msg.replace(/\n/g, '<br>')
    });
}

export function debounce(fn: any, wait: number) {
    let bouncing = false;
    return function(this: any, ...args: any[]) {
        if (bouncing) return null;
        bouncing = true;
        setTimeout(() => {
            bouncing = false;
        }, wait);
        fn.apply(this, args);
    };
}

export async function bilibili(ts: number | null, input: HTMLInputElement | null) {
    if (router.currentRoute.value.name == "UserPage") {
        shell.open(`https://space.bilibili.com/${store.state.user.mid}`);
        return null;
    } else {
        if (router.currentRoute.value.name == "HomePage" && input) {
            const data = auth.id(input?.value);
            if (data.type) {
                const path = function() {
                    if (data.type == MediaType.Video) return 'video'
                    else if (data.type == MediaType.Bangumi) return 'bangumi/play'
                    else if (data.type == MediaType.Lesson) return 'cheese/play'
                    else if (data.type == MediaType.Music) return 'audio'
                }();
                shell.open(`https://www.bilibili.com/${path}/${data.id}/${typeof ts=="number"?`?t=${ts}`:''}`);
                return null;
            }
        };
    }
}

export function stat(num: number|string): string {
    if (typeof num == "string") return num;
    if (num >= 100000000) {
        return (num / 100000000).toFixed(1) + '亿';
    } else if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    } else return num.toString();
}

export function duration(n: number|string, type: string): string {
    if (typeof n === "string") return n;
    const num = parseFloat(type === "bangumi" ? Math.round(n / 1000).toString() : n.toString());
    const hs = Math.floor(num / 3600);
    const mins = Math.floor((num % 3600) / 60);
    const secs = Math.round(num % 60);
    const finalHs = hs > 0 ? hs.toString().padStart(2, '0') + ':' : '';
    const finalMins = mins.toString().padStart(2, '0');
    const finalSecs = secs.toString().padStart(2, '0');
    return finalHs + finalMins + ':' + finalSecs;
}


export function partition(cid: number): string {
    switch(cid) {case 1:return'动画';case 24:return'动画';case 25:return'动画';case 47:return'动画';case 210:return'动画';case 86:return'动画';case 253:return'动画';case 27:return'动画';case 13:return'番剧';case 51:return'番剧';case 152:return'番剧';case 32:return'番剧';case 33:return'番剧';case 167:return'国创';case 153:return'国创';case 168:return'国创';case 169:return'国创';case 170:return'国创';case 195:return'国创';case 3:return'音乐';case 28:return'音乐';case 31:return'音乐';case 30:return'音乐';case 59:return'音乐';case 193:return'音乐';case 29:return'音乐';case 130:return'音乐';case 243:return'音乐';case 244:return'音乐';case 129:return'舞蹈';case 20:return'舞蹈';case 154:return'舞蹈';case 156:return'舞蹈';case 198:return'舞蹈';case 199:return'舞蹈';case 200:return'舞蹈';case 4:return'游戏';case 17:return'游戏';case 171:return'游戏';case 172:return'游戏';case 65:return'游戏';case 173:return'游戏';case 121:return'游戏';case 136:return'游戏';case 19:return'游戏';case 36:return'知识';case 201:return'知识';case 124:return'知识';case 228:return'知识';case 207:return'知识';case 208:return'知识';case 209:return'知识';case 229:return'知识';case 122:return'知识';case 188:return'科技';case 95:return'科技';case 230:return'科技';case 231:return'科技';case 232:return'科技';case 233:return'科技';case 234:return'运动';case 235:return'运动';case 249:return'运动';case 164:return'运动';case 236:return'运动';case 237:return'运动';case 238:return'运动';case 223:return'汽车';case 245:return'汽车';case 246:return'汽车';case 247:return'汽车';case 248:return'汽车';case 240:return'汽车';case 227:return'汽车';case 176:return'汽车';case 160:return'生活';case 138:return'生活';case 250:return'生活';case 251:return'生活';case 239:return'生活';case 161:return'生活';case 162:return'生活';case 21:return'生活';case 211:return'美食';case 76:return'美食';case 212:return'美食';case 213:return'美食';case 214:return'美食';case 215:return'美食';case 217:return'动物圈';case 218:return'动物圈';case 219:return'动物圈';case 220:return'动物圈';case 221:return'动物圈';case 222:return'动物圈';case 75:return'动物圈';case 119:return'鬼畜';case 22:return'鬼畜';case 26:return'鬼畜';case 126:return'鬼畜';case 216:return'鬼畜';case 127:return'鬼畜';case 155:return'时尚';case 157:return'时尚';case 252:return'时尚';case 158:return'时尚';case 159:return'时尚';case 202:return'资讯';case 203:return'资讯';case 204:return'资讯';case 205:return'资讯';case 206:return'资讯';case 5:return'娱乐';case 71:return'娱乐';case 241:return'娱乐';case 242:return'娱乐';case 137:return'娱乐';case 181:return'影视';case 182:return'影视';case 183:return'影视';case 85:return'影视';case 184:return'影视';case 177:return'纪录片';case 37:return'纪录片';case 178:return'纪录片';case 179:return'纪录片';case 180:return'纪录片';case 23:return'电影';case 147:return'电影';case 145:return'电影';case 146:return'电影';case 83:return'电影';case 11:return'电视剧';case 185:return'电视剧';case 187:return'电视剧';default:return'未知分区'}
}

export function pubdate(timestamp: Date | number, file: boolean = false): string {
    const date = new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    };
    const formatter = new Intl.DateTimeFormat('zh-CN', options);
    const formattedDate = formatter.format(date).replace(/\//g, '-');
    return file ? formattedDate.replace(/:/g, '-').replace(/\s/g, '_'): formattedDate;
}

export function filename(filename: string): string {
    return filename.replace(/[\\/:*?"<>|\r\n]+/g, '_');
}

export function codec(codec: string): string {
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

export function formatEscape(str: string): string {
    return str
        .replace(/\n/g, '<br>')
        .replace(/ /g, '&nbsp;');
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + ' KB';
    } else if (bytes < 1024 * 1024 * 1024) {
        return (bytes / 1024 / 1024).toFixed(2) + ' MB'; 
    } else {
        return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
    }
}

export function formatProxyUrl(proxy: { addr: string, username?: string, password?: string }): string {
    const url = new URL(proxy.addr);
    url.username = proxy.username || '';
    url.password = proxy.password || '';
    return url.toString();
}
