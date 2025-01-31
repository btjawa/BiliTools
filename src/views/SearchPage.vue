<template><div>
    <div ref="searchInput" :style="{ 'top': searchActive ? '13px' : 'calc(50% - 13px)' }"
		class="search_input absolute flex h-[52px] w-[calc(100%-397px)] rounded-[26px] p-2.5 bg-[color:var(--block-color)]"
	>
        <input
			type="text" :placeholder="$t('home.inputPlaceholder', [$t('common.bilibili')])"
			@keydown.enter="search()" @keydown.esc.stop="searchActive = false; mediaRootActive = false"
			autocomplete="off" spellcheck="false"
			@input="searchInput=searchInput.replace(/[^a-zA-Z0-9-._~:/?#@!$&'()*+,;=%]/g, '')"
			v-model="searchInput" class="w-full mr-2.5 !rounded-2xl"
		/>
        <button @click="search()"
			:class="[fa_dyn, 'fa-search rounded-[50%]']"
		></button>
    </div>
	<div :style="{ 'opacity': mediaRootActive ? 1 : 0, 'pointerEvents': mediaRootActive ? 'all' : 'none' }"
		class="media_root absolute top-[78px] w-[calc(100%-269px)] h-[calc(100%-93px)]"
	>
		<MediaInfo class="media_info mb-[13px]" :info="mediaInfo" :open />
        <Empty v-if="mediaInfo.list" :expression="mediaInfo.list.length === 0" text="home.empty" />
		<div class="my-2 flex justify-center gap-[5px] max-w-full overflow-auto stein-nodes" v-if="mediaInfo?.stein_gate">
			<template v-for="story in mediaInfo.stein_gate.story_list">
			<button class="w-9 h-9 rounded-full relative p-0 flex-shrink-0"
				@click="updateStein(story.edge_id)"
			>
				<i :class="[fa_dyn, story.is_current ? 'fa-check' : 'fa-location-dot']"></i>
			</button>
			</template>
		</div>
		<div v-if="mediaInfo.list && osType === 'linux'" class="scrollList flex flex-col h-[calc(100%-158px)] overflow-auto gap-0.5">
			<template v-for="(item, index) in mediaInfo.list">
				<MediaInfoItem :index :target :item :checkbox :options v-model="multiSelect" />
			</template>
		</div>
		<RecycleScroller v-else v-if="mediaInfo.list"
			class="scrollList h-[calc(100%-158px)]"
			:items="mediaInfo.list" :item-size="50"
			key-field="index" v-slot="{ item, index }"
		>
			<MediaInfoItem :index :target :item :checkbox :options v-model="multiSelect" />
		</RecycleScroller>
		<div class="my-2 flex justify-center gap-[5px] absolute w-full"
			v-if="mediaInfo?.stein_gate" :style="{ 'top': 216 + mediaInfo.list.length * 50 + 'px' }"
		>
			<template v-for="(quesion, index) in mediaInfo.stein_gate.choices">
				<button
					v-if="getSteinCondition(mediaInfo.stein_gate, index)"
					@click="updateStein(quesion.id)"
				>{{ quesion.option }}</button>
			</template>
		</div>
		<div class="fixed bottom-6 left-[73px] flex flex-col gap-3 multi-select">
			<button v-if="checkbox"
				@click=" multiSelect = multiSelect.length === mediaInfo.list.length 
					? [] : Array.from({ length: mediaInfo.list.length }, (_, i) => i)
				"
			>
				<i :class="[fa_dyn, 'fa-check-double']"></i>
				<span>{{ $t('home.label.selectAll') }}</span>
			</button>
			<button v-if="mediaInfo.type !== 'manga'" @click="checkbox = !checkbox" :class="{ 'active': checkbox }">
				<i :class="[fa_dyn, 'fa-square-check']"></i>
				<span>{{ $t('home.label.multiSelect') }}</span>
			</button>
		</div>
		<div class="fixed bottom-6 right-4 flex flex-col gap-3" v-if="checkbox">
			<button v-for="(item, _index) in options" @click="options[_index].multi" class="primary-color">
				<i :class="[fa_dyn, item.icon]"></i>
				<span>{{ options[_index].text }}</span>
			</button>
		</div>
	</div>
	<Popup ref="popup" :get-others="checkbox ? pushBackMulti : getOthers" :push-back="checkbox ? pushBackMulti : pushBackQueue" :open="open" />
</div></template>

<script lang="ts">
import { ApplicationError, stat, formatBytes, parseId, filename, getRandomInRange } from '@/services/utils';
import { DashInfo, DurlInfo, StreamCodecType, MediaInfo as MediaInfoType, MediaType, MusicUrlInfo } from '@/types/data.d';
import { commands, CurrentSelect } from '@/services/backend';
import { join as pathJoin, dirname as pathDirname } from '@tauri-apps/api/path';
import { transformImage } from '@tauri-apps/api/image';
import { MediaInfo, MediaInfoItem, Popup } from '@/components/SearchPage';
import { type as osType } from '@tauri-apps/plugin-os';
import { Empty } from '@/components';
import { open } from '@tauri-apps/plugin-shell';
import * as data from '@/services/data';
import * as dialog from '@tauri-apps/plugin-dialog';

export default {
	components: {
		MediaInfo,
		MediaInfoItem,
		Popup,
		Empty
	},
	data() {
		return {
			searchInput: String(),
			mediaInfo: {} as MediaInfoType,
			searchActive: false,
			mediaRootActive: false,
			index: 0,
			target: 0,
			checkbox: false,
			multiSelect: [] as number[],
			store: this.$store.state,
			othersReqs: {
				aiSummary: -1,
				danmaku: false,
				cover: false,
				manga: false,
			},
			osType: osType(),
			othersMap: {
				'cover': { suffix: 'jpg', desc: 'JPG Image' },
				'aiSummary': { suffix: 'md', desc: 'Markdown Document' },
				'metaSnapshot': { suffix: 'md', desc: 'Markdown Document' },
				'liveDanmaku': { suffix: 'ass', desc: 'ASS Subtitle File' },
				'historyDanmaku': { suffix: 'ass', desc: 'ASS Subtitle File' },
				'manga': { suffix: 'jpg', desc: 'JPG Image' },
			}
		}
	},
	computed: {
		fa_dyn() {
			return this.store.settings.theme === 'dark' ? 'fa-solid' : 'fa-light';
		},
		currentSelect() {
			return this.store.data.currentSelect;
		},
		playUrlInfo: {
            get() { return this.store.data.playUrlInfo },
            set(v: any) { this.store.data.playUrlInfo = v }
		},
		options() {
			return [
				...((this.mediaInfo.type !== MediaType.Music && this.mediaInfo.type !== MediaType.Manga) ? [{
					icon: 'fa-file-arrow-down',
					text: this.$t('home.downloadOptions.audioVisual'),
					action: (index: number) => this.updateStream(index, 0, { init: true }),
					multi: () => this.initMulti('audioVisual')
				}] : []),
				{
					icon: 'fa-file-export',
					text: this.$t('home.downloadOptions.others'),
					action: (index: number) => this.checkOthers(index, { init: true }),
					multi: () => this.initMulti('others')
				},
			];
		}
	},
	watch: {
		'currentSelect.fmt': function(newFmt, oldFmt) {
			if (oldFmt === -1) return;
			this.updateStream(this.index, Number(newFmt));
		},
		'currentSelect.dms': function() {
			this.updateCodec();
		},
    },
	methods: {
		getSteinCondition(stein_gate: typeof this.mediaInfo.stein_gate, index: number) {
			const question = stein_gate?.choices?.[index];
			if (!question) return false;
			const exp = question.condition ? question.condition.replace(/\$[\w]+/g, (match) => {
				const hiddenVar = stein_gate.hidden_vars.find(v => v.id_v2 === match.slice());
				return hiddenVar?.value.toString() || '0';
			}) : '1';
			return /^[\d+\-*/.()=<>\s]+$/.test(exp) ? (new Function('return ' + exp))() : false;
		},
		async search(input?: string) {
			this.searchInput = input ?? this.searchInput;
			if (!this.searchInput) return null;
			this.mediaRootActive = false;
			this.searchActive = false;
			this.checkbox = false;
			this.multiSelect = [];
			try {
				this.mediaInfo = {} as MediaInfoType;
				this.searchActive = true;
				const { id, type } = await parseId(this.searchInput);
				const info = await data.getMediaInfo(id, type);
				this.target = info.list.findIndex(item => item.id === info.id);
				this.mediaInfo = info;
				this.mediaRootActive = true;
				const start = Date.now();
				const checkCondition = () => {
					const scrollList = document.querySelector('.scrollList');
					if (Date.now() - start > 1000) return;
					if (scrollList) {
						scrollList.scrollTo({
							top: this.target * 50,
							behavior: 'smooth'
						});
					} else setTimeout(checkCondition, 50);
				};
				checkCondition();
			} catch(err) {
				err instanceof ApplicationError ? err.handleError() :
				new ApplicationError(err as string).handleError();
				this.mediaRootActive = false;
				this.searchActive = false;
			}
		},
		updateDefault(ids: number[], df: "df_dms" | "df_ads" | "df_cdc", opt: keyof CurrentSelect, currentSelect?: CurrentSelect) {
			this.currentSelect[opt] = ids.includes(
				currentSelect ? currentSelect[opt] : this.store.settings[df]
			) ?(currentSelect ? currentSelect[opt] : this.store.settings[df]) : ids.sort((a, b) => b - a)[0];
		},
		async updateStream(index: number, fmt: number, options?: { init?: boolean, currentSelect?: CurrentSelect }) {
			try {
				for (const key in this.playUrlInfo) this.playUrlInfo[key as keyof typeof this.playUrlInfo] = null as never;
				this.index = index;
				if (this.mediaInfo.type === MediaType.Music) {
					if (options?.init) this.currentSelect.fmt = 0;
					const info = await data.getPlayUrl(this.mediaInfo.list[index], this.mediaInfo.type, { qn: 0 });
					this.playUrlInfo = info as MusicUrlInfo;
					this.updateDefault(this.playUrlInfo.audio.map(item => item.id), "df_ads", "ads", options?.currentSelect);
				} else {
					if (options?.init) this.currentSelect.fmt = fmt;
					const codecMap = {
						0: StreamCodecType.Dash,
						1: StreamCodecType.Mp4,
						2: StreamCodecType.Flv,
					};
					const info = await data.getPlayUrl(this.mediaInfo.list[index], this.mediaInfo.type, { codec: codecMap[fmt as keyof typeof codecMap] });
					if ('type' in info && info.type === 'dash') {
						if (options?.init) this.currentSelect.fmt = 0;
						this.playUrlInfo = info as DashInfo;
						if (!('video' in this.playUrlInfo)) return;
						this.updateDefault(this.playUrlInfo.video.map(item => item.id), "df_dms", "dms", options?.currentSelect);
						this.updateDefault(this.playUrlInfo.audio.map(item => item.id), "df_ads", "ads", options?.currentSelect);
					} else if ('type' in info && (info.type === 'mp4' || info.type === 'flv')) {
						if (options?.init) this.currentSelect.fmt = info.type === 'mp4' ? 1 : 2;
						this.playUrlInfo = info as DurlInfo;
						this.updateDefault(this.playUrlInfo.video.map(item => item.id), "df_dms", "dms", options?.currentSelect);
					}
					this.updateCodec(options?.currentSelect);
				}
				if (options?.init) {
					(this.$refs.popup as InstanceType<typeof Popup>).init("audioVisual", this.mediaInfo.type, { req: this.othersReqs });
				}
			} catch(err) {
				err instanceof ApplicationError ? err.handleError() :
				new ApplicationError(err as string).handleError();
			}
		},
		updateCodec(currentSelect?: CurrentSelect) {
			if (!('video' in this.playUrlInfo) || !this.playUrlInfo.video) return;
			this.updateDefault(
				this.playUrlInfo.video.filter(item => item.id === this.currentSelect.dms).map(item => item.codecid),
			"df_cdc", "cdc", currentSelect);
		},
		async checkOthers(index: number, options?: { init?: boolean }) {
			try {
				this.index = index;
				const info = this.mediaInfo.list[this.index];
				if (this.mediaInfo.type === MediaType.Music) {
					this.othersReqs.danmaku = false;
				} else if (this.mediaInfo.type === MediaType.Manga) {
					this.othersReqs.danmaku = false;
					// this.othersReqs.manga = true;
				} else {
					this.othersReqs.aiSummary = await data.getAISummary(info, this.mediaInfo.upper.mid || 0, { check: true }) as number;
					this.othersReqs.danmaku = true;
				}
				this.othersReqs.cover = true;
				if (options?.init) {
					if (this.mediaInfo.type !== MediaType.Manga) await this.updateStream(index, 0);
					(this.$refs.popup as InstanceType<typeof Popup>).init("others", this.mediaInfo.type, { req: this.othersReqs });
				}
			} catch(err) {
				err instanceof ApplicationError ? err.handleError() :
				new ApplicationError(err as string).handleError();
			}
		},
		async getFolder() {
			const parent = await dialog.open({
				directory: true,
				multiple: false,
			});
			return parent;
		},
		async getOthers(type: keyof typeof this.othersMap, options?: { date?: string, parent?: string }) {
			try {
				const info = this.mediaInfo.list[this.index];
				const name = filename({
					title: info.title + (type === 'historyDanmaku' && options?.date ? `_${options.date}` : ''),
					mediaType: this.$t(`home.label.${type}`),
					aid: info.id,
				});
				if (type === 'manga') {
					const parent = await this.getFolder();
					if (!parent) return;
					const result = await dialog.ask(this.$t('common.unstable'), { 'kind': 'warning' });
					if (!result) return;
					return await data.getMangaImages(info.id, parent, name);
				}
				const _data = await (async () => { switch (type) {
					case 'cover': return await data.getBinary(info.cover);
					case 'aiSummary': return await data.getAISummary(info, this.mediaInfo.upper.mid || 0);
					case 'liveDanmaku': return await data.getLiveDanmaku(info);
					case 'historyDanmaku': return await data.getHistoryDanmaku(info.cid, options?.date || "");
				}})();
				const suffix = this.othersMap[type].suffix;
				const path =
					options?.parent ? `${await pathJoin(options.parent, name)}.${suffix}`
					: await dialog.save({
						filters: [{
							name: this.othersMap[type].desc,
							extensions: [this.othersMap[type].suffix]
						}],
						defaultPath: `${await pathJoin(this.store.settings.down_dir, name)}.${suffix}`
					});
				if (!path) return;
				const result = await (async () => {
					switch (type) {
						case 'cover': return await commands.writeBinary(this.store.data.secret, path, transformImage(_data as ArrayBuffer));
						case 'aiSummary': return await commands.writeBinary(this.store.data.secret, path, new TextEncoder().encode(_data as string) as any);
						case 'liveDanmaku': case 'historyDanmaku': return await commands.xmlToAss(this.store.data.secret, path, name, _data as any);
					}
				})();
                if (result?.status === 'error') throw new ApplicationError(result.error);
			} catch(err) {
				err instanceof ApplicationError ? err.handleError() :
				new ApplicationError(err as string).handleError();
			}
		},
		async updateStein(edge_id: number) {
			const stein_gate = this.mediaInfo.stein_gate;
			if (!stein_gate) return;
			const stein_info = await data.getSteinInfo(this.mediaInfo.id, stein_gate.grapth_version, edge_id);
			this.mediaInfo.stein_gate = {
				edge_id: 1,
				grapth_version: stein_gate.grapth_version,
				story_list: stein_info.story_list,
				choices: stein_info.edges.questions[0].choices,
				hidden_vars: stein_info.hidden_vars,
			};
			const current = stein_info.story_list.find(story => story.edge_id === edge_id);
			if (!current) return;
			this.mediaInfo.list = [{
				id: this.mediaInfo.id,
				cid: current.cid,
				title: current.title,
				cover: current.cover,
				desc: this.mediaInfo.desc,
				eid: this.mediaInfo.list[0].eid,
				duration: this.mediaInfo.list[0].duration,
				ss_title: this.mediaInfo.list[0].ss_title,
				index: 0,
			}];
		},
		async initMulti(type: 'audioVisual' | 'others') {
			if (!this.checkbox) return;
			this.currentSelect.fmt = 0;
			await this.updateStream(this.multiSelect[0], 0);
			await this.checkOthers(this.multiSelect[0]);
			(this.$refs.popup as InstanceType<typeof Popup>).init(type, this.mediaInfo.type, {
				req: this.othersReqs,
				noFmt: this.mediaInfo.type !== MediaType.Video
			});
		},
		async pushBackQueue(type: 'video' | 'audio' | 'all', options?: { output?: string, init?: boolean, index?: number }) {
			try {
				const playUrlInfo = this.playUrlInfo as DashInfo;
				const video = type === 'audio' ? null : 
					playUrlInfo.video ? playUrlInfo.video.find(item => item.id === this.currentSelect.dms && item.codecid === this.currentSelect.cdc) : null;
				const audio = type === 'video' ? null : 
					playUrlInfo.audio ? playUrlInfo.audio.find(item => item.id === this.currentSelect.ads) : null;
				const info = await data.pushBackQueue({
					info: this.mediaInfo.list[options?.index || this.index],
					...(video && { video }),
					...(audio && { audio }),
					output: options?.output,
					media_type: this.$t('downloads.media_type.' + this.mediaInfo.type)
				});
				if (options?.init) {
					this.$router.push('/down-page');
					this.store.status.queuePage = 0;
				}
				return info;
			} catch(err) {
				err instanceof ApplicationError ? err.handleError() :
				new ApplicationError(err as string).handleError();
			}
		},
		async pushBackMulti(type: 'video' | 'audio' | 'all' | keyof typeof this.othersMap, options?: { date?: string }) {
			const currentSelect = { ...this.currentSelect };
			let output = String();
			const othersParent = type in this.othersMap ? await this.getFolder() : '_';
			if (!othersParent) return;
			for (const [_, index] of this.multiSelect.entries()) {
				try {
					if (type in this.othersMap) {
						await this.getOthers(type as any, { ...options, parent: othersParent });
					} else {
						for (const key in this.currentSelect) (this.currentSelect as any)[key] = (currentSelect as any)[key];
						await this.updateStream(index, this.currentSelect.fmt, { currentSelect });
						const result = await this.pushBackQueue(type as any, { ...(output && { output }), init: _ === 0, index });
						output = await pathDirname(result?.output || this.store.settings.down_dir);
					}
				} catch(err) {
					err instanceof ApplicationError ? err.handleError() :
					new ApplicationError(err as string).handleError();
				}
				await new Promise(resolve => setTimeout(resolve, getRandomInRange(100, 300)));
			}
		},
		stat,
		formatBytes,
		open,
	}
}
</script>

<style scoped lang="scss">
.search_input, .media_root {
	transition: top .3s cubic-bezier(0,1,.6,1), opacity .2s;
}
.multi-select .active {
	@apply text-[color:var(--dark-button-color)] bg-[color:var(--primary-color)];;
}
</style>