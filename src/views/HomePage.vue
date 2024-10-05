<template><div @keydown.esc.stop="elmState.active = false;">
	<PopUp ref="popup" />
    <div class="search" :class="{ 'active': elmState.active }">
        <input class="search__input" type="text" placeholder="链接/AV/BV/SS/EP/AU号..."
        @keydown.enter="search" autocomplete="off" spellcheck="false" ref="searchInput">
        <button class="fa-solid fa-search search__btn" @click="search"></button>
    </div>
    <div class="media-root" :class="{ 'active': elmState.active && elmState.rootActive }">
        <div class="media-info">
            <img class="media-info__cover" :src="mediaInfo?.cover" @load="dataWidth" draggable="false" />
            <div class="media-info__data text" :style="{ width: !mediaInfo?.upper?.avatar ? '100%' : elmState.dataWidth }" >
                <div class="media-info__title ellipsis">{{ mediaInfo?.title }}</div>
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
                <span class="ellipsis">{{ mediaInfo?.upper?.name }}</span>
            </div>
            <template v-else="elmState.dataWidth = '100%'"></template>
        </div>
        <div class="media-thead">
            <div :class="['media-thead__item text', header.id]" v-for="header in headers" :key="header.id">
                {{ header.label }}
            </div>
        </div>
        <div class="media-list">
            <div class="media-list__item" v-for="(info, index) in mediaInfo.list" :key="index">
                <div :class="['media-thead__item text', header.id]" v-for="header in headers" :key="header.id">
                    <template v-if="header.id === 'rank'">{{ index + 1 }}</template>
                    <template v-else-if="header.id === 'title'">{{ info.title }}</template>
                    <template v-else-if="header.id === 'time'">{{ utils.duration(info.duration, mediaInfo.type) }}</template>
                    <template v-else-if="header.id === 'options'">
                        <button v-for="option in options" :key="option.id" @click="handleOptions(option.id, index, info)"
                        :class="['media-thead__item options__item', option.id]">
                            <i :class="option.icon"></i>{{ option.label }}
                        </button>
                    </template>
                </div>
            </div>
        </div>
    </div>
</div></template>

<script lang="ts">
import { auth, data, utils } from "@/services";
import * as types from "@/types";
import * as shell from "@tauri-apps/plugin-shell";
import { BaseDirectory, writeFile } from "@tauri-apps/plugin-fs";
import { fetch } from "@tauri-apps/plugin-http";
import PopUp from "@/components/PopUp.vue";
import store from "@/store";
import { ApplicationError, formatProxyUrl } from "@/services/utils";

export default {
	components: {
		PopUp
	},
    methods: {
        openUpperSpace(mid: number) { shell.open('https://space.bilibili.com/' + mid) },
        dataWidth(e: Event) { this.elmState.dataWidth = `calc(100% - ${(e.target as HTMLElement).offsetWidth}px - 68px)` },
        async search() {
            const v = auth.id((this.$refs.searchInput as HTMLInputElement).value);
            if (v.type) {
                this.elmState.active = true;
                this.elmState.rootActive = false;
				const start = Date.now();
                try {
                    await data.getMediaInfo(v.id, v.type);
                    this.elmState.rootActive = true;
                } catch(err) {
					const elapsed = Date.now() - start;
					if (elapsed < 310) await new Promise(resolve => setTimeout(resolve, 310 - elapsed))
                    this.elmState.active = false;
					(new ApplicationError(
						new Error(typeof err == 'string' ? err : (err as any).message),
						{ code: (err as any).code || -101 }
					)).handleError();
                }
            }
        },
        async handleOptions(type: string, index: number, info: types.data.MediaInfoListItem) {
            if (type === "cover") {
				const response = await fetch(this.mediaInfo.cover, {
					headers: this.store.data.headers,
					...(this.store.settings.proxy.addr && {
						proxy: { all: formatProxyUrl(this.store.settings.proxy) }
					})
				});
				const filename = `封面_${this.mediaInfo.title}_${utils.pubdate(new Date(), true)}.${this.mediaInfo.cover.slice(-3)}`;
				const cover = new Uint8Array(await response.arrayBuffer());
				await writeFile(filename, cover, {
					baseDir: BaseDirectory.Desktop
				});
                    // invoke('save_file', { content: transformImage(cover), path, secret: this.store.data.secret });
            } else if (type === "media") {
				function getUrls(type: 'video' | 'audio') {
					let base = finalDash[type].filter(item => item?.id == result?.[type == 'audio' ? 'ads' : 'dms']);
					if (type === 'video') base.filter(item => item?.codecid == result?.cdc);
					return [base[0]?.base_url, ...base[0]?.backup_url];
				}
				const getPlayUrl = () => data.getPlayUrl(this.mediaInfo.list[index], this.mediaInfo.type);
				const start = Date.now();
                const firstDash = await getPlayUrl();
				const result = await (this.$refs.popup as InstanceType<typeof PopUp>).newPopup();
				const finalDash = (Date.now() - start >= (60 * 15 * 1000) ? await getPlayUrl() : firstDash); // URLs expire after 15 mins
				await data.pushBackQueue({
					...info,
					urls: {
						video: getUrls('video'),
						audio: getUrls('audio'),
					},
					display_name: this.mediaInfo.title,
					time: utils.pubdate(new Date(), true)
				});
            } else if (type === "more") {
                
            }
        }
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
        mediaInfo() { return this.store.data.mediaInfo as types.data.MediaInfo },
    },
    data() {
        return {
            elmState: {
                active: false,
                searchActive: false,
                rootActive: false,
                dataWidth: ''
            },
            utils,
            headers: [
                { id: 'rank', label: '编号' },
                { id: 'title', label: '标题' },
                { id: 'time', label: '时长' },
                { id: 'options', label: '解析选项' }
            ],
            options: [
                { id: 'cover', icon: 'fa-solid fa-image space', label: '下载封面' },
                { id: 'media', icon: 'fa-solid fa-file-video space', label: '解析音视频' },
                { id: 'more', icon: 'fa-solid fa-anchor space', label: '更多解析' }
            ],
            store: store.state
        }
    }
};
</script>

<style scoped lang="scss">
.search,.search__btn,.search__input {
	color: var(--content-color);
	display: flex;
	justify-content: center;
	align-items: center;
	text-align: center;
	border-radius: 30px;
	transition: all .3s cubic-bezier(.23,0,0,1.32);
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
	&.active {
		top: 16px;
	}
	&:focus-within {
		.search__input {
			color: var(--block-color);
		}
	}
}
.search:focus-within,.search:focus-within .search__btn {
	background: var(--content-color);
}
.search__input {
	width: 100%;
	height: 40px;
	font-size: 14px;
	&:hover {
		font-size: 15px;
	}
}
.search__btn {
	color: #757575;
	width: 50px;
	height: 100%;
	padding: 10px;
	cursor: pointer;
	&:hover {
		filter: brightness(150%);
	}
}
.media-root {
	display: flex;
	width: 80%;
	flex-direction: column;
	align-items: center;
	position: absolute;
	opacity: 0;
	gap: 5px;
	top: 72px;
	transition: opacity .1s;
	&.active {
		opacity: 1;
	}
}
.media-info,.media-info__cover {
	border-radius: var(--block-radius);
}
.media-info {
	height: 170px;
	width: 100%;
	background-color: var(--block-color);
	align-items: center;
	display: flex;
	padding: 16px;
	border: 1px solid #2a2a2a;
	span {
		&.bcc-iconfont {
			margin-right: 4px;
		}
	}
}
.media-info__cover {
	height: 138px;
	margin-right: 16px;
}
.media-info__data,.media-info__meta {
	display: flex;
	flex-direction: column;
}
.media-info__data {
	height: 100%;
	gap: 6px;
	flex: 1;
}
.media-info__title {
	font-size: 18px;
	width: calc(100% - 68px);
}
.media-info__meta {
	color: #9e9e9e;
}
.media-info__meta_item {
	display: flex;
	line-height: 22px;
}
.media-info__meta_stat {
	:not(span) {
		margin-right: 16px;
	}
}
.media-info__desc,.media-info__meta,.media-info__meta_stat span {
	font-size: 14px;
}
.media-info__desc {
	flex: 1;
	overflow: auto;
}
.media-info__upper {
	position: absolute;
	display: flex;
	flex-direction: column;
	align-items: center;
	margin: 0 0 auto auto;
	right: 16px;
	top: 16px;
	&:hover {
		cursor: pointer;
	}
	img {
		height: 36px;
		border-radius: 50%;
		margin-bottom: 4px;
	}
	span {
		font-size: 11px;
		max-width: 68px;
	}
}
.media-list__item,.media-thead {
	border-radius: var(--block-radius);
	width: 100%;
	background: var(--block-color);
	border: 1px solid #222;
	display: flex;
}
.media-thead {
	padding: 4px 8px;
}
.media-list__item {
	padding: 8px;
	align-items: center;
	min-height: 32px;
}
.media-thead__item {
	&:not(.options__item) {
		font-size: 14px;
		min-width: 44px;
		margin-left: 10px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		position: relative;
	}
	&:not(.options__item):not(:first-child) {
		margin-left: 16px;
	}
	&.options {
		display: flex;
		flex-grow: 1;
		justify-content: space-between;
		padding-right: 10px;
	}
	&:not(.options__item):not(:last-child)::after {
		display: inline-block;
		content: "";
		position: absolute;
		right: -10px;
		background: var(--split-color);
		width: 2px;
		border-radius: var(--block-radius);
		margin: 0 10px;
		min-height: 18.4px;
	}
	&.title {
		width: 41%;
	}
	&.time {
		width: 65px;
	}
	&.options__item {
		padding: 8px 10px;
		background-color: #2b2b2b;
		border-radius: 8px;
		transition: all .1s;
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 5px;
		i {
			font-size: 13px;
		}
		&:hover {
			filter: brightness(80%);
		}
	}
}
.media-list {
	width: 100%;
	max-height: calc(100vh - 323px);
	overflow: auto;
	border-radius: var(--block-radius);
}
</style>