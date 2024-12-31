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
		<MediaInfo class="media_info mb-[13px]" :info="mediaInfo" :open="open" />
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
		<RecycleScroller v-if="mediaInfo.list"
			class="h-[calc(100%-158px)]"
			:items="mediaInfo.list" :item-size="50"
			key-field="index" v-slot="{ item, index }"
		>
			<div class="flex items-center rounded-lg h-12 text-sm p-4 bg-[color:var(--block-color)] w-full">
				<div class="checkbox" v-if="checkbox">
					<input type="checkbox" :value="index" v-model="multiSelect"/>
					<i class="fa-solid fa-check"></i>
				</div>
				<span class="min-w-6">{{ index + 1 }}</span>
				<div class="w-px h-full bg-[color:var(--split-color)] mx-4"></div>
				<span class="flex flex-1 ellipsis text">{{ item.title }}</span>
				<div class="w-px h-full bg-[color:var(--split-color)] mx-4"></div>
				<div class="flex gap-2">
					<button v-for="(item, _index) in options" @click="options[_index].action(index)">
						<i :class="[fa_dyn, item.icon]"></i>
						<span>{{ recycleI18n[_index] }}</span>
					</button>
				</div>
			</div>
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
		<button
			class="fixed bottom-6 left-[73px] multi-select"
			:class="{ 'active': checkbox }" @click="checkbox = !checkbox"
		>
			<i :class="[fa_dyn, 'fa-square-check']"></i>
			<span>{{ $t('home.label.multiSelect') }}</span>
		</button>
		<div class="fixed bottom-6 right-4 flex flex-col gap-3" v-if="checkbox">
			<button v-for="(item, _index) in options" @click="options[_index].multi" class="primary-color">
				<i :class="[fa_dyn, item.icon]"></i>
				<span>{{ recycleI18n[_index] }}</span>
			</button>
		</div>
	</div>
	<Popup ref="popup" :get-others="checkbox ? pushBackMulti : getOthers" :push-back="checkbox ? pushBackMulti : pushBackQueue" :open="open" />
</div></template>

<script lang="ts">
import { ApplicationError, stat, formatBytes, parseId, filename, timestamp } from '@/services/utils';
import { DashInfo, DurlInfo, StreamCodecType, MediaInfo as MediaInfoType, MediaType, MusicUrlInfo, CurrentSelect } from '@/types/data.d';
import { join as pathJoin, dirname as pathDirname } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';
import { transformImage } from '@tauri-apps/api/image';
import { MediaInfo, Popup } from '@/components/SearchPage';
import { Empty } from '@/components';
import { open } from '@tauri-apps/plugin-shell';
import * as data from '@/services/data';
import * as dialog from '@tauri-apps/plugin-dialog';

export default {
	components: {
		MediaInfo,
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
			checkbox: false,
			multiSelect: [] as number[],
			store: this.$store.state,
			othersReqs: {
				aiSummary: -1,
				danmaku: false,
				cover: false,
			},
			othersMap: {
				'cover': { suffix: 'png', desc: 'PNG Image' },
				'aiSummary': { suffix: 'md', desc: 'Markdown Document' },
				'metaSnapshot': { suffix: 'md', desc: 'Markdown Document' },
				'liveDanmaku': { suffix: 'ass', desc: 'ASS Subtitle File' },
				'historyDanmaku': { suffix: 'ass', desc: 'ASS Subtitle File' },
			},
			options: [
				{
					icon: 'fa-file-arrow-down',
					action: (index: number) => this.updateStream(index, 0, { init: true }),
					multi: () => this.initMulti('audioVisual')
				},
				{
					icon: 'fa-file-export',
					action: (index: number) => this.checkOthers(index, { init: true }),
					multi: () => this.initMulti('others')
				},
			]
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
		recycleI18n() {
			return [
                this.$t(`home.downloadOptions.${this.mediaInfo.type === MediaType.Music ? 'audio' : 'audioVisual'}`),
                this.$t('home.downloadOptions.others')
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
			try {
				this.mediaInfo = {} as MediaInfoType;
				this.searchActive = true;
				const { id, type } = await parseId(this.searchInput);
				const info = await data.getMediaInfo(id, type);
				this.mediaInfo = info;
				this.mediaRootActive = true;
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
					const info = await data.getPlayUrl(this.mediaInfo.list[index], this.mediaInfo.type, { codec: StreamCodecType[fmt ? 'Mp4' : 'Dash'] });
					if (fmt === 0) {
						this.playUrlInfo = info as DashInfo;
						if (!('video' in this.playUrlInfo)) return;
						this.updateDefault(this.playUrlInfo.video.map(item => item.id), "df_dms", "dms", options?.currentSelect);
						this.updateDefault(this.playUrlInfo.audio.map(item => item.id), "df_ads", "ads", options?.currentSelect);
					} else if (fmt === 1) {
						this.playUrlInfo = info as DurlInfo;
						this.updateDefault(this.playUrlInfo.video.map(item => item.id), "df_dms", "dms", options?.currentSelect);
					}
					this.updateCodec(options?.currentSelect);
				}
				if (options?.init) {
					(this.$refs.popup as InstanceType<typeof Popup>).init("audioVisual", this.mediaInfo.type, { req: this.othersReqs });
				}
			} catch(err) {
				if (err instanceof ApplicationError) {
					err.handleError();
					if (err.code === -400 && this.currentSelect.fmt === 1) this.updateStream(index, 0);
				} else new ApplicationError(err as string).handleError();
			}
		},
		updateCodec(currentSelect?: CurrentSelect) {
			if (!('video' in this.playUrlInfo)) return;
			this.updateDefault(
				this.playUrlInfo.video.filter(item => item.id === this.currentSelect.dms).map(item => item.codecid),
			"df_cdc", "cdc", currentSelect);
		},
		async checkOthers(index: number, options?: { init?: boolean }) {
			try {
				this.index = index;
				const info = this.mediaInfo.list[this.index];
				if (this.mediaInfo.type === "music") {
					this.othersReqs.danmaku = false;
				} else {
					this.othersReqs.aiSummary = await data.getAISummary(info, this.mediaInfo.upper.mid || 0, { check: true }) as number;
					this.othersReqs.danmaku = true;
				}
				this.othersReqs.cover = true;
				if (options?.init) {
					await this.updateStream(index, 0);
					(this.$refs.popup as InstanceType<typeof Popup>).init("others", this.mediaInfo.type, { req: this.othersReqs });
				}
			} catch(err) {
				err instanceof ApplicationError ? err.handleError() :
				new ApplicationError(err as string).handleError();
			}
		},
		async getOthers(type: keyof typeof this.othersMap, options?: { date?: string }) {
			try {
				const info = this.mediaInfo.list[this.index];
				let name = this.$t(`home.label.${type}`) + '_' + filename(info.title) + '_' + timestamp(Date.now(), { file: true });
                const result = await (async () => { switch (type) {
					case 'cover': return await data.getBinary(info.cover);
					case 'aiSummary': return await data.getAISummary(info, this.mediaInfo.upper.mid || 0);
					case 'liveDanmaku': return await data.getLiveDanmaku(info);
					case 'historyDanmaku': name = options?.date + '_' + name; return await data.getHistoryDanmaku(info, options?.date || "");
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
				ss_title: this.mediaInfo.list[0].ss_title,
				index: 0,
			}];
		},
		async initMulti(type: 'audioVisual' | 'others') {
			if (!this.checkbox) return;
			await this.updateStream(this.multiSelect[0], 0);
			await this.checkOthers(this.multiSelect[0]);
			(this.$refs.popup as InstanceType<typeof Popup>).init(type, this.mediaInfo.type, {
				req: this.othersReqs,
				noFmt: true
			});
		},
		async pushBackQueue(type: 'video' | 'audio' | 'all', options?: { output?: string, init?: boolean }) {
			try {
				const playUrlInfo = this.playUrlInfo as DashInfo;
				const video = type === 'audio' ? null : 
					playUrlInfo.video ? playUrlInfo.video.find(item => item.id === this.currentSelect.dms && item.codecid === this.currentSelect.cdc) : null;
				const audio = type === 'video' ? null : 
					playUrlInfo.audio ? playUrlInfo.audio.find(item => item.id === this.currentSelect.ads) : null;
				const info = await data.pushBackQueue({ info: this.mediaInfo.list[this.index], ...(video && { video }), ...(audio && { audio }), output: options?.output });
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
			const currentSelect = this.currentSelect;
			let output = String();
				for (const [index, _index] of this.multiSelect.entries()) {
					this.index = index;
					try {
						if (type in this.othersMap) {
							await this.getOthers(type as any, options);
						} else {
							for (const key in this.currentSelect) (this.currentSelect as any)[key] = (currentSelect as any)[key];
							await this.updateStream(index, 0, { currentSelect });
							const result = await this.pushBackQueue(type as any, { ...(output && { output }), init: _index === 0 });
							output = await pathDirname(result?.output || this.store.settings.down_dir);
						}
						await new Promise(resolve => setTimeout(resolve, 100));
					} catch(err) {
						err instanceof ApplicationError ? err.handleError() :
						new ApplicationError(err as string).handleError();
					}
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
.multi-select.active {
	@apply text-[color:var(--dark-button-color)] bg-[color:var(--primary-color)];;
}
</style>