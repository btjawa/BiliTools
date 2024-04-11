<template>
<div class="home-page" @keydown.esc="elmState.allInActive = true;">
    <div class="search" :class="{ 'active': elmState.searchActive && !elmState.allInActive }">
        <input class="search__input" type="text" placeholder="链接/AV/BV/SS/EP/AU号..."
        @keydown.enter="search" autocomplete="off" spellcheck="false" v-model="elmState.searchInput">
        <i class="fa-solid fa-search search__btn" @click="search"></i>
    </div>
    <div class="media-root" :class="{ 'active': elmState.mediaRootActive && !elmState.allInActive }">
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
        <div class="media-list"></div>
    </div>
</div>
</template>

<script lang="ts">
import { computed, defineComponent, reactive, ref } from 'vue';
import * as verify from "../scripts/verify";
import * as sdk from "../scripts/sdk";
import * as utils from "../scripts/utils";
import * as SdkTypes from '../types/Sdk.type';
import * as shell from "@tauri-apps/plugin-shell";

export default defineComponent({
    setup() {
        const mediaInfo = ref({} as SdkTypes.MediaList);
        const elmState = reactive({
            searchInput: '',
            searchActive: false,
            mediaRootActive: false,
            allInActive: false,
            dataWidth: ''
        });
        const dataWidth = (e: Event) => elmState.dataWidth = `calc(100% - ${(e.target as HTMLElement).offsetWidth}px - 68px)`;
        const openUpperSpace = (mid: number) => shell.open('https://space.bilibili.com/' + mid);
        const statItems = computed(() => {
            return [
                { key: 'play', label: '播放', icon: 'bcc-iconfont bcc-icon-icon_list_player_x1', value: mediaInfo.value?.stat?.play },
                { key: 'danmaku', label: '弹幕', icon: 'bcc-iconfont bcc-icon-danmuguanli', value: mediaInfo.value?.stat?.danmaku },
                { key: 'reply', label: '评论', icon: 'bcc-iconfont bcc-icon-pinglunguanli', value: mediaInfo.value?.stat?.reply },
                { key: 'like', label: '点赞', icon: 'bcc-iconfont bcc-icon-ic_Likesx', value: mediaInfo.value?.stat?.like },
                { key: 'coin', label: '硬币', icon: 'bcc-iconfont bcc-icon-icon_action_reward_n_x', value: mediaInfo.value?.stat?.coin },
                { key: 'favorite', label: '收藏', icon: 'bcc-iconfont bcc-icon-icon_action_collection_n_x', value: mediaInfo.value?.stat?.favorite },
                { key: 'share', label: '分享', icon: 'bcc-iconfont bcc-icon-icon_action_share_n_x', value: mediaInfo.value?.stat?.share },
            ];
        })
        async function search() {
            const v = verify.id(elmState.searchInput);
            if (v.type) {
                elmState.allInActive = false;
                elmState.searchActive = true;
                const data = await sdk.getMediaInfo(v.id, v.type);
                if (data) {
                    elmState.mediaRootActive = true;
                    data.stat.reply = data.stat?.reply ? utils.stat(data.stat?.reply) : null;
                    data.stat.pubdate = data.stat?.pubdate ? utils.pubdate(data.stat?.pubdate, false) : null;
                    mediaInfo.value = data;
                } else elmState.allInActive = true;
            } else elmState.allInActive = true;
        }
        return { elmState, search, mediaInfo, utils, SdkTypes, statItems, dataWidth, openUpperSpace }
    },
});
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
    background: #3B3B3B;
    width: 680px;
    height: 43px;
    box-shadow: 0 0 3px 3px #2a2a2a;
    position: absolute;
    padding-left: 20px;
    top: calc(50% - 21.5px);
    z-index: 8;
}

.search.active {
    top: 20px;
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
    color: #3b3b3b;
}

.media-root {
    display: flex;
    width: 80%;
    flex-direction: column;
    align-items: center;
    position: absolute;
    opacity: 0;
    top: 83px;
    transition: opacity 0.2s;
}

.media-root.active {
    opacity: 1;
}

.media-info {
    height: 170px;
    width: 100%;
    background-color: #3b3b3bc0;
    border: none;
    border-radius: 8px;
    align-items: center;
    display: flex;
    padding: 16px;
}

.media-info__cover {
    border-radius: 8px;
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

</style>