<template><div>
    <div ref="searchInput" :style="{ 'top': searchActive ? '13px' : 'calc(50% - 13px)' }"
		class="search_input absolute flex h-[52px] w-[calc(100%-397px)] rounded-[26px] p-2.5 bg-[color:var(--block-color)]"
	>
        <input
			type="text" :placeholder="$t('home.inputPlaceholder', [$t('common.bilibili')])"
			@keydown.enter="search" @keydown.esc.stop="searchActive = false; mediaRootActive = false"
			autocomplete="off" spellcheck="false"
			@input="searchInput=searchInput.replace(/[^a-zA-Z0-9-._~:/?#@!$&'()*+,;=%]/g, '')"
			v-model="searchInput" class="w-full mr-2.5 rounded-2xl"
		/>
        <button @click="search"
			:class="[fa_dyn, 'fa-search rounded-[50%]']"
		></button>
    </div>
	<div :style="{ 'opacity': mediaRootActive ? 1 : 0, 'pointerEvents': mediaRootActive ? 'all' : 'none' }"
		class="media_root absolute top-[78px] w-[calc(100%-269px)] h-[calc(100%-93px)]"
	>
		<MediaInfo class="media_info mb-[13px]" :info="mediaInfo" :open="openPath" />
        <Empty v-if="mediaInfo.list" :expression="mediaInfo.list.length === 0" text="home.empty" />
		<RecycleScroller
			v-if="mediaInfo.list" class="h-[calc(100%-158px)]"
			:items="mediaInfo.list" :item-size="50"
			key-field="cid" v-slot="{ item, index }"
		>
			<MediaListItem :index="index" :title="item.title" :actions="[() => updateStream(index, 0), () => checkOthers(index)]" :media-type="mediaInfo.type" />
		</RecycleScroller>
	</div>
	<Popup :style="{ 'opacity': popupActive ? 1 : 0, 'pointerEvents': popupActive ? 'all' : 'none' }"
		@click="popupActive = 0" @confirm="pushBackQueue" :open="openPath"
		:get-others="getOthers" :others-reqs="othersReqs" :others-map="othersMap"
		:popup-active="popupActive" :play-url-info="playUrlInfo"
	/>
</div></template>

<script lang="ts">
import { ApplicationError, stat, formatBytes, parseId, filename, timestamp } from '@/services/utils';
import { DashInfo, DurlInfo, StreamCodecType, MediaInfo as MediaInfoType, MediaType, MusicUrlInfo } from '@/types/data.d';
import { join as pathJoin } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';
import { transformImage } from '@tauri-apps/api/image';
import { MediaInfo, MediaListItem, Popup } from '@/components/HomePage';
import { Empty } from '@/components';
import * as data from '@/services/data';
import * as shell from '@tauri-apps/plugin-shell';
import * as dialog from '@tauri-apps/plugin-dialog';

export default {
	components: {
		MediaInfo,
		MediaListItem,
		Popup,
		Empty
	},
	data() {
		return {
			searchInput: String(),
			searchActive: false,
			mediaRootActive: false,
			mediaInfo: {} as MediaInfoType,
			popupActive: 0,
			index: 0,
			playUrlInfo: {} as DashInfo | DurlInfo | MusicUrlInfo,
			store: this.$store.state,
			othersReqs: {
				aiSummary: -1,
				danmaku: false,
			},
			othersMap: {
				'cover': { suffix: 'png', desc: 'PNG Image', icon: 'fa-image' },
				'aiSummary': { suffix: 'md', desc: 'Markdown Document', icon: 'fa-microchip-ai' },
				'liveDanmaku': { suffix: 'ass', desc: 'ASS Subtitle File', icon: 'fa-clock' },
				'historyDanmaku': { suffix: 'ass', desc: 'ASS Subtitle File', icon: 'fa-clock-rotate-left' },
			}
		}
	},
	computed: {
		fa_dyn() {
			return this.store.settings.theme === 'dark' ? 'fa-solid' : 'fa-light';
		},
		currentSelect() {
			return this.store.data.currentSelect
		}
	},
	watch: {
		'currentSelect.fmt': function(newFmt, _) {
			if (newFmt === -1) return;
			this.updateStream(this.index, Number(newFmt));
		},
		'currentSelect.dms': function() {
			this.updateCodec();
		}
    },
	methods: {
		async search() {
			if (!this.searchInput) return null;
			this.mediaRootActive = false;
			this.searchActive = false;
			try {
				this.mediaInfo = {} as MediaInfoType;
				this.searchActive = true;
				const { id, type } = await parseId(this.searchInput);
				const info = await data.getMediaInfo(id, type);
				console.log(info)
				this.mediaInfo = info;
				this.mediaRootActive = true;
			} catch(err) {
				err instanceof ApplicationError ? err.handleError() :
				new ApplicationError(err as string).handleError();
				this.mediaRootActive = false;
				this.searchActive = false;
			}
		},
		updateDefault(ids: number[], df: "df_dms" | "df_ads" | "df_cdc", opt: keyof typeof this.currentSelect) {
			this.currentSelect[opt] = ids.includes(this.store.settings[df]) ? this.store.settings[df] : ids.sort((a, b) => b - a)[0];
		},
		async updateStream(index: number, codec: number) {
			try {
				for (const key in this.playUrlInfo) this.playUrlInfo[key as keyof typeof this.playUrlInfo] = null as never;
				this.index = index;
				if (this.mediaInfo.type === MediaType.Music) {
					this.currentSelect.fmt = -1;
					const info = await data.getPlayUrl(this.mediaInfo.list[index], this.mediaInfo.type, { qn: 0 });
					this.playUrlInfo = info as MusicUrlInfo;
					this.updateDefault(this.playUrlInfo.audio.map(item => item.id), "df_ads", "ads");
				} else {
					this.currentSelect.fmt = codec;
					const info = await data.getPlayUrl(this.mediaInfo.list[index], this.mediaInfo.type, { codec: StreamCodecType[codec ? 'Mp4' : 'Dash'] });
					if (codec === 0) {
						this.playUrlInfo = info as DashInfo;
						if (!('video' in this.playUrlInfo)) return;
						this.updateDefault(this.playUrlInfo.video.map(item => item.id), "df_dms", "dms");
						this.updateDefault(this.playUrlInfo.audio.map(item => item.id), "df_ads", "ads");
					} else if (codec === 1) {
						this.playUrlInfo = info as DurlInfo;
						this.updateDefault(this.playUrlInfo.video.map(item => item.id), "df_dms", "dms");
					}
					this.updateCodec();
				}
				this.popupActive = 1;
			} catch(err) {
				if (err instanceof ApplicationError) {
					err.handleError();
					if (err.code === -400 && this.currentSelect.fmt === 1) this.updateStream(index, 0);
				} else new ApplicationError(err as string).handleError();
			}
		},
		updateCodec() {
			if (!('video' in this.playUrlInfo)) return;
			this.updateDefault(
				this.playUrlInfo.video.filter(item => item.id === this.currentSelect.dms).map(item => item.codecid),
			"df_cdc", "cdc");
		},
		async checkOthers(index: number) {
			try {
				this.index = index;
				const info = this.mediaInfo.list[this.index];
				if (this.mediaInfo.type === "music") {
					this.othersReqs.danmaku = false;
				} else {
					this.othersReqs.aiSummary = await data.getAISummary(info, this.mediaInfo.upper.mid || 0, { check: true }) as number;
					this.othersReqs.danmaku = true;
				}
				this.popupActive = 2;
			} catch(err) {
				err instanceof ApplicationError ? err.handleError() :
				new ApplicationError(err as string).handleError();
			}
		},
		async getOthers(type: keyof typeof this.othersMap, date?: string) {
			try {
				const info = this.mediaInfo.list[this.index];
				let name = this.$t(`home.label.${type}`) + '_' + filename(info.title) + '_' + timestamp(Date.now(), { file: true });
				if (type === 'historyDanmaku') name = date + '_' + name;
                const result = await (async () => { switch (type) {
					case 'cover': return await data.getBinary(info.cover);
					case 'aiSummary': return await data.getAISummary(info, this.mediaInfo.upper.mid || 0);
					case 'liveDanmaku': return await data.getLiveDanmaku(info);
					case 'historyDanmaku': return await data.getHistoryDanmaku(info, date as string);
				}})();
				const path = await dialog.save({
					filters: [{
                        name: this.othersMap[type].desc,
                        extensions: [this.othersMap[type].suffix]
                    }],
					defaultPath: await pathJoin(String(this.store.settings.down_dir), name)
				});
				if (!path) return;
				switch (type) {
					case 'cover': return await invoke('write_binary', { secret: this.store.data.secret, path, contents: transformImage(result as ArrayBuffer) });
					case 'aiSummary': return await invoke('write_binary', { secret: this.store.data.secret, path, contents: new TextEncoder().encode(result as string) });
					case 'liveDanmaku': return await invoke('xml_to_ass', { secret: this.store.data.secret, path, filename: name, contents: result })
					case 'historyDanmaku': return await invoke('xml_to_ass', { secret: this.store.data.secret, path, filename: name, contents: result })
				}
			} catch(err) {
				err instanceof ApplicationError ? err.handleError() :
				new ApplicationError(err as string).handleError();
			}
		},
		async pushBackQueue() {
			this.popupActive = 0;
			try {
				const playUrlInfo = this.playUrlInfo as DashInfo;
				const video = playUrlInfo.video ? playUrlInfo.video.find(item => item.id === this.currentSelect.dms && item.codecid === this.currentSelect.cdc) : null;
				const audio = playUrlInfo.audio ? playUrlInfo.audio.find(item => item.id === this.currentSelect.ads) : null;
				await data.pushBackQueue({ info: this.mediaInfo.list[this.index], ...(video && { video }), ...(audio && { audio }) });
				this.$router.push('/down-page');
				this.store.status.queuePage = 0;
			} catch(err) {
				err instanceof ApplicationError ? err.handleError() :
				new ApplicationError(err as string).handleError();
			}
		},
		async openPath(path: string) {
            return shell.open(path);
        },
		stat,
		formatBytes,
	},
}
</script>

<style>
.search_input, .media_root, .media_list, .popup_container {
	transition: top .3s cubic-bezier(0,1,.6,1), opacity .2s, transform .5s cubic-bezier(0,1,.6,1);
}
.info__details {
	h3, & > span {
        @apply overflow-hidden text-ellipsis;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
    }
}
.popup button {
	border: 2px solid transparent;
	&.selected {
		border: 2px solid var(--primary-color)
	}
}
</style>