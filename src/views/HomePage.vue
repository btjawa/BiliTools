<template>
<div class="home-page" @keydown.esc="elmState.active = false;">
    <div class="search" :class="{ 'active': elmState.active }">
        <input class="search__input" type="text" placeholder="链接/AV/BV/SS/EP/AU号..."
        @keydown.enter="search" autocomplete="off" spellcheck="false" v-model="elmState.searchInput">
        <i class="fa-solid fa-search search__btn" @click="search"></i>
    </div>
    <div class="media-root" :class="{ 'active': elmState.active && elmState.rootActive }">
        <div class="media-info">
            <img class="media-info__cover" :src="mediaInfo?.cover" @load="dataWidth" draggable="false" />
            <div class="media-info__data" :style="{ width: !mediaInfo?.upper?.avatar ? '100%' : elmState.dataWidth }" >
                <div class="media-info__title">{{ mediaInfo?.title }}</div>
                <div class="media-info__meta">
                    <div class="media-info__meta_item">
                        <div class="media-info__meta_stat" v-for="item in statItems" :key="item.key">
                            <div v-if="item.value"><span :class="item.icon"></span>{{ utils.stat(item.value) }}</div>
                        </div>
                    </div>
                    <div class="media-info__meta_item" v-if="mediaInfo?.tags?.length">
                        <span class="bcc-iconfont bcc-icon-ic_contributionx"></span>
                        <span v-for="(item, index) in mediaInfo?.tags" :key="index">
                            {{ item }}<span v-if="index < mediaInfo?.tags.length - 1">&nbsp;·&nbsp;</span>
                        </span>
                        <span class="media-info__split">&emsp;|&emsp;</span>
                        <span class="bcc-iconfont bcc-icon-icon_into_history_gray_"></span>
                        <span>{{ mediaInfo?.stat?.pubdate }}</span>
                    </div>
                </div>
                <div class="media-info__desc" v-html="mediaInfo?.desc?.replace(/\n/g, '<br>')"></div>
            </div>
            <div class="media-info__upper" v-if="mediaInfo?.upper?.avatar" @click="openUpperSpace(mediaInfo?.upper?.mid!)">
                <img :src="mediaInfo?.upper?.avatar"/>
            </div>
            <template v-else="elmState.dataWidth = '100%'"></template>
        </div>
        <div class="media-thead">
            <div class="media-thead__item rank">编号</div>
            <div class="media-thead__split"></div>
            <div class="media-thead__item title">标题</div>
            <div class="media-thead__split"></div>
            <div class="media-thead__item time">时长</div>
            <div class="media-thead__split"></div>
            <div class="media-thead__item">解析选项</div>
        </div>
        <div class="media-list">
            <div class="media-list__item" v-for="(item, index) in mediaInfo.list" :key="index">
                <div class="media-thead__item rank">{{ index + 1 }}</div>
                <div class="media-thead__split"></div>
                <div class="media-thead__item title">{{ item.title }}</div>
                <div class="media-thead__split"></div>
                <div class="media-thead__item time">{{ utils.duration(item.duration, mediaInfo.type) }}</div>
                <div class="media-thead__split"></div>
                <div class="media-thead__item options">
                    
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<script lang="ts">
import { auth, data, utils } from "@/services";
import * as types from "@/types";
import * as shell from "@tauri-apps/plugin-shell";

export default {
    methods: {
        openUpperSpace(mid: number) { shell.open('https://space.bilibili.com/' + mid) },
        dataWidth(e: Event) { this.elmState.dataWidth = `calc(100% - ${(e.target as HTMLElement).offsetWidth}px - 68px)` },
        async search() {
            const v = auth.id(this.elmState.searchInput);
            if (v.type) {
                this.elmState.active = true;
                try {
                    await data.getMediaInfo(v.id, v.type);
                    this.elmState.rootActive = true;
                } catch(err: any) {
                    this.elmState.active = false;
                    utils.iziError(err.message);
                    return null;
                }
            }
        },
    },
    computed: {
        statItems() {
            return [
                { key: 'play', label: '播放', icon: 'bcc-iconfont bcc-icon-icon_list_player_x1', value: this.mediaInfo.stat?.play },
                { key: 'danmaku', label: '弹幕', icon: 'bcc-iconfont bcc-icon-danmuguanli', value: this.mediaInfo.stat?.danmaku },
                { key: 'reply', label: '评论', icon: 'bcc-iconfont bcc-icon-pinglunguanli', value: this.mediaInfo.stat?.reply },
                { key: 'like', label: '点赞', icon: 'bcc-iconfont bcc-icon-ic_Likesx', value: this.mediaInfo.stat?.like },
                { key: 'coin', label: '硬币', icon: 'bcc-iconfont bcc-icon-icon_action_reward_n_x', value: this.mediaInfo.stat?.coin },
                { key: 'favorite', label: '收藏', icon: 'bcc-iconfont bcc-icon-icon_action_collection_n_x', value: this.mediaInfo.stat?.favorite },
                { key: 'share', label: '分享', icon: 'bcc-iconfont bcc-icon-icon_action_share_n_x', value: this.mediaInfo.stat?.share },
            ];
        },
        mediaInfo() { return this.$store.state.mediaInfo as types.data.MediaInfo },
    },
    data() {
        return {
            elmState: {
                active: false,
                searchActive: false,
                rootActive: false,
                searchInput: '',
                dataWidth: ''
            },
            utils,
        }
    }
};
</script>

<style scoped>
.search,
.search__input,
.search__btn {
    color: var(--content-color);
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    border-radius: 30px;
    background: none;
    outline: none;
    border: none;
    margin: 0;
    transition: background 0.4s, font-size 0.4s, color 0.4s, box-shadow 0.4s, top 0.5s cubic-bezier(0,1,.6,1);
}

.search {
    background: var(--block-color);
    width: 680px;
    height: 40px;
    box-shadow: 0 0 3px 3px #2a2a2a;
    position: absolute;
    padding-left: 20px;
    top: calc(50% - 20px);
    z-index: 8;
}

.search.active {
    top: 16px;
}

.search__input {
    width: 100%;
    height: 40px;
    font-size: 14px;
    user-select: none;
}

.search__input:hover {
    font-size: 15px;
}

.search__btn {
    color: #757575;
    width: 50px;
    height: 100%;
    padding: 10px;
    cursor: pointer;
}

.search__btn:hover {
    background: #5c5c5c9d;
}

.search:focus-within {
    background: var(--content-color);
}

.search:focus-within .search__input {
    color: var(--block-color);
}

.media-root {
    display: flex;
    width: 80%;
    flex-direction: column;
    align-items: center;
    position: absolute;
    opacity: 0;
    top: 72px;
    transition: opacity 0.2s;
}

.media-root.active {
    opacity: 1;
}

.media-info {
    height: 170px;
    width: 100%;
    background-color: var(--block-color);
    border: none;
    border-radius: var(--block-radius);
    align-items: center;
    display: flex;
    padding: 16px;
    border: 1px solid #2a2a2a;
}

.media-info__cover {
    border-radius: var(--block-radius);
    height: 138px;
    user-select: none;
    margin-right: 16px;
}

.media-info__data,
.media-info__meta {
    display: flex;
    flex-direction: column;
}

.media-info__data {
    height: 100%;
}

.media-info__title,
.media-info__meta {
    display: flex;
    margin-bottom: 6px;
}

.media-info__title {
    font-size: 18px;
    display: inline-block;
    text-overflow: ellipsis;
    overflow: hidden;
    word-break: break-all;
    white-space: nowrap;
    width: 100%;
}

.media-info__meta {
    color: #9e9e9e;
}

.media-info__meta_item {
    display: flex;
    line-height: 22px;
}

.media-info__meta_stat *:not(span) {
    margin-right: 16px;
}

.media-info span.bcc-iconfont {
    margin-right: 4px;
}

.media-info__meta_stat span,
.media-info__meta,
.media-info__desc {
    font-size: 14px;
}

.media-info__desc {
    flex: 1;
    overflow: auto;
}

.media-info__upper {
    position: sticky;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0 0 auto auto;
}

.media-info__upper:hover {
    cursor: pointer;
}

.media-info__upper img {
    height: 36px;
    border-radius: 50%;
    margin-bottom: 4px;
}

.media-info__upper span {
    font-size: 11px;
    word-break: keep-all;
    white-space: nowrap;
}

.media-thead,
.media-list__item {
    border-radius: var(--block-radius);
    width: 100%;
    background: var(--block-color);
    border: 1px solid #2a2a2a;
    display: flex;
}

.media-thead {
    padding: 4px 8px;
    margin: 5px;
}

.media-list__item {
    padding: 12px 8px;
}

.media-thead__item {
    font-size: 14px;
    min-width: 38px;
    margin-left: 10px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.media-thead__split {
    background: var(--split-color);
    width: 2px;
    border-radius: var(--block-radius);
    margin: 0 10px;
}

.media-thead__item.title {
    width: 40%;
}

.media-thead__item.time {
    width: 65px;
}

.media-list {
    width: 100%;
    max-height: calc(100vh - 320px);
    overflow: auto;
    border-radius: var(--block-radius);
}
</style>