<template><div>
    <div ref="searchInput" :style="{ 'top': s.searchActive ? '13px' : 'calc(50% - 13px)' }"
		class="search_input absolute flex h-[52px] w-[calc(100%-397px)] rounded-[26px] p-2.5 bg-[color:var(--block-color)]"
	>
        <input
			type="text" :placeholder="$t('home.inputPlaceholder', [$t('common.bilibili')])"
			@keydown.enter="search()" @keydown.esc.stop="s.searchActive = false; s.mediaRootActive = false"
			autocomplete="off" spellcheck="false"
			@input="s.searchInput=s.searchInput.replace(/[^a-zA-Z0-9-._~:/?#@!$&'()*+,;=%]/g, '')"
			v-model="s.searchInput" class="w-full mr-2.5 !rounded-2xl"
		/>
        <button @click="search()"
			:class="[settings.dynFa, 'fa-search rounded-[50%]']"
		></button>
    </div>
	<div :style="{ 'opacity': s.mediaRootActive ? 1 : 0, 'pointerEvents': s.mediaRootActive ? 'all' : 'none' }"
		class="media_root absolute top-[78px] w-[calc(100%-269px)] h-[calc(100%-93px)]"
	>
		<MediaInfo class="media_info mb-[13px]" :info="s.mediaInfo" :open />
        <Empty v-if="s.mediaInfo.list" :exp="s.mediaInfo.list.length === 0" text="home.empty" />
		<div class="my-2 flex justify-center gap-[5px] max-w-full overflow-auto stein-nodes" v-if="s.mediaInfo?.stein_gate">
			<template v-for="story in s.mediaInfo.stein_gate.story_list">
			<button class="w-9 h-9 rounded-full relative p-0 flex-shrink-0"
				@click="updateStein(story.edge_id)"
			>
				<i :class="[settings.dynFa, story.is_current ? 'fa-check' : 'fa-location-dot']"></i>
			</button>
			</template>
		</div>
		<div v-if="s.mediaInfo.list && osType() === 'linux'" class="scrollList flex flex-col h-[calc(100%-158px)] overflow-auto gap-0.5">
			<template v-for="(item, index) in s.mediaInfo.list">
				<MediaInfoItem :index :target="s.target" :item :checkbox="s.checkbox" :options v-model="s.multiSelect" />
			</template>
		</div>
		<RecycleScroller v-else v-if="s.mediaInfo.list"
			class="scrollList h-[calc(100%-158px)]"
			:items="s.mediaInfo.list" :item-size="50"
			key-field="index" v-slot="{ item, index }"
		>
			<MediaInfoItem :index :target="s.target" :item :checkbox="s.checkbox" :options v-model="s.multiSelect" />
		</RecycleScroller>
		<div class="my-2 flex justify-center gap-[5px] absolute w-full"
			v-if="s.mediaInfo?.stein_gate" :style="{ 'top': 216 + s.mediaInfo.list.length * 50 + 'px' }"
		>
			<template v-for="(quesion, index) in s.mediaInfo.stein_gate.choices">
				<button
					v-if="getSteinCondition(s.mediaInfo.stein_gate, index)"
					@click="updateStein(quesion.id)"
				>{{ quesion.option }}</button>
			</template>
		</div>
		<div class="fixed bottom-6 left-[73px] flex flex-col gap-3 multi-select">
			<button v-if="s.checkbox"
				@click=" s.multiSelect = s.multiSelect.length === s.mediaInfo.list.length 
					? [] : Array.from({ length: s.mediaInfo.list.length }, (_, i) => i)
				"
			>
				<i :class="[settings.dynFa, 'fa-check-double']"></i>
				<span>{{ $t('home.label.selectAll') }}</span>
			</button>
			<button v-if="s.mediaInfo.type !== 'manga'" @click="s.checkbox = !s.checkbox" :class="{ 'active': s.checkbox }">
				<i :class="[settings.dynFa, 'fa-square-check']"></i>
				<span>{{ $t('home.label.multiSelect') }}</span>
			</button>
		</div>
		<div class="fixed bottom-6 right-4 flex flex-col gap-3" v-if="s.checkbox">
			<button v-for="(item, _index) in options" @click="options[_index].multi" class="primary-color">
				<i :class="[settings.dynFa, item.icon]"></i>
				<span>{{ options[_index].text }}</span>
			</button>
		</div>
	</div>
	<Popup ref="popup" :get-others="s.checkbox ? pushBackMulti : getOthers" :push-back="s.checkbox ? pushBackMulti : pushBackQueue" :open="open" />
</div></template>

<script setup lang="ts">
import { ApplicationError, parseId, filename, getRandomInRange, getImageBlob } from '@/services/utils';
import { DashInfo, DurlInfo, StreamCodecType, MediaInfo as MediaInfoType, MediaType, MusicUrlInfo } from '@/types/data.d';
import { commands, CurrentSelect } from '@/services/backend';
import { join as pathJoin, dirname as pathDirname } from '@tauri-apps/api/path';
import { transformImage } from '@tauri-apps/api/image';
import { MediaInfo, MediaInfoItem, Popup } from '@/components/SearchPage';
import { computed, inject, reactive, Ref, ref, watch } from 'vue';
import { type as osType } from '@tauri-apps/plugin-os';
import { useSettingsStore, useAppStore, useInfoStore } from '@/store';
import { useRouter } from 'vue-router';
import { Empty } from '@/components';
import { open } from '@tauri-apps/plugin-shell';
import * as data from '@/services/data';
import * as dialog from '@tauri-apps/plugin-dialog';
import i18n from '@/i18n';

const s = reactive({
	searchInput: ref(String()),
	mediaInfo: ref<MediaInfoType>({} as any),
	searchActive: ref(false),
	mediaRootActive: ref(false),
	checkbox: ref(false),
	index: ref(0),
	target: ref(0),
	multiSelect: ref<number[]>([]),
	currentSelect: computed({
		get: () => app.currentSelect,
		set: (v: any) => app.currentSelect = v
	}),
	playUrlInfo: computed({
		get: () => app.playUrlInfo,
		set: (v: any) => app.playUrlInfo = v
	}),
});

const othersReqs = reactive({
	aiSummary: -1,
	danmaku: false,
	cover: false,
	manga: false,
});

const othersMap = {
	'cover': { suffix: 'jpg', desc: 'JPG Image' },
	'aiSummary': { suffix: 'md', desc: 'Markdown Document' },
	'metaSnapshot': { suffix: 'md', desc: 'Markdown Document' },
	'liveDanmaku': { suffix: 'ass', desc: 'ASS Subtitle File' },
	'historyDanmaku': { suffix: 'ass', desc: 'ASS Subtitle File' },
	'manga': { suffix: 'jpg', desc: 'JPG Image' },
}

const app = useAppStore();
const settings = useSettingsStore();
const options = computed(() => [
	...((s.mediaInfo.type !== MediaType.Music && s.mediaInfo.type !== MediaType.Manga) ? [{
		icon: 'fa-file-arrow-down',
		text: i18n.global.t('home.downloadOptions.audioVideo'),
		action: (index: number) => updateStream(index, 0, { init: true }),
		multi: () => initMulti('audioVideo')
	}] : []),
	{
		icon: 'fa-file-export',
		text: i18n.global.t('home.downloadOptions.others'),
		action: (index: number) => checkOthers(index, { init: true }),
		multi: () => initMulti('others')
	},
]);
const popup = ref<InstanceType<typeof Popup>>();
const router = useRouter();
const queuePage = inject<Ref<number>>('queuePage') as Ref<number>;

watch(() => s.currentSelect.fmt, (newFmt, oldFmt) => {
	if (oldFmt === -1) return;
	updateStream(s.index, Number(newFmt));
}, { deep: true });

watch(() => s.currentSelect.dms, () => updateCodec(), { deep: true });

function getSteinCondition(stein_gate: typeof s.mediaInfo.stein_gate, index: number) {
	const question = stein_gate?.choices?.[index];
	if (!question) return false;
	const exp = question.condition ? question.condition.replace(/\$[\w]+/g, (match) => {
		const hiddenVar = stein_gate.hidden_vars.find(v => v.id_v2 === match.slice());
		return hiddenVar?.value.toString() || '0';
	}) : '1';
	return /^[\d+\-*/.()=<>\s]+$/.test(exp) ? (new Function('return ' + exp))() : false;
}
async function search(input?: string) {
	s.searchInput = input ?? s.searchInput;
	if (!s.searchInput) return null;
	s.mediaRootActive = false;
	s.searchActive = false;
	s.checkbox = false;
	s.multiSelect = [];
	try {
		s.mediaInfo = {} as MediaInfoType;
		s.searchActive = true;
		const { id, type } = await parseId(s.searchInput);
		if (type === MediaType.Manga) return await open("https://btjawa.top/bilitools#关于漫画");
		const info = await data.getMediaInfo(id, type);
		s.target = info.list.findIndex(item => item.id === info.id);
		info.cover = await getImageBlob(info.cover + '@128h');
		if (info.upper.avatar) info.upper.avatar = await getImageBlob(info.upper.avatar + '@36h');
		s.mediaInfo = info;
		s.mediaRootActive = true;
		const start = Date.now();
		await new Promise(resolve => setTimeout(resolve, 100));
		const scrollList = document.querySelector('.scrollList');
		if (Date.now() - start > 1000) return;
		if (scrollList) {
			scrollList.scrollTo({
				top: s.target * 50,
				behavior: 'smooth'
			});
		}
	} catch(err) {
		err instanceof ApplicationError ? err.handleError() :
		new ApplicationError(err as string).handleError();
		s.mediaRootActive = false;
		s.searchActive = false;
	}
}
function updateDefault(ids: number[], df: "df_dms" | "df_ads" | "df_cdc", opt: keyof CurrentSelect, cs?: CurrentSelect) {
	s.currentSelect[opt] = ids.includes(
		cs ? cs[opt] : settings.$state[df]
	) ?(cs ? cs[opt] : settings.$state[df]) : ids.sort((a, b) => b - a)[0];
}
async function updateStream(i: number, fmt: number, options?: { init?: boolean, cs?: CurrentSelect }) {
	try {
		for (const key in s.playUrlInfo) (s.playUrlInfo as any)[key] = null as never;
		s.index = i;
		if (s.mediaInfo.type === MediaType.Music) {
			if (options?.init) s.currentSelect.fmt = 0;
			const info = await data.getPlayUrl(s.mediaInfo.list[i], s.mediaInfo.type, { qn: 0 });
			s.playUrlInfo = info as MusicUrlInfo;
			updateDefault(s.playUrlInfo.audio.map(item => item.id), "df_ads", "ads", options?.cs);
		} else {
			if (options?.init) s.currentSelect.fmt = fmt;
			const codecMap = {
				0: StreamCodecType.Dash,
				1: StreamCodecType.Mp4,
				2: StreamCodecType.Flv,
			};
			const info = await data.getPlayUrl(s.mediaInfo.list[i], s.mediaInfo.type, { codec: codecMap[fmt as keyof typeof codecMap] });
			if ('type' in info && info.type === 'dash') {
				if (options?.init) s.currentSelect.fmt = 0;
				s.playUrlInfo = info as DashInfo;
				if (!('video' in s.playUrlInfo)) return;
				updateDefault(s.playUrlInfo.video.map(item => item.id), "df_dms", "dms", options?.cs);
				updateDefault(s.playUrlInfo.audio.map(item => item.id), "df_ads", "ads", options?.cs);
			} else if ('type' in info && (info.type === 'mp4' || info.type === 'flv')) {
				if (options?.init) s.currentSelect.fmt = info.type === 'mp4' ? 1 : 2;
				s.playUrlInfo = info as DurlInfo;
				updateDefault(s.playUrlInfo.video.map(item => item.id), "df_dms", "dms", options?.cs);
			}
			updateCodec(options?.cs);
		}
		if (options?.init && popup.value) {
			popup.value.init("audioVideo", s.mediaInfo.type, { req: othersReqs });
		}
	} catch(err) {
		err instanceof ApplicationError ? err.handleError() :
		new ApplicationError(err as string).handleError();
	}
}
function updateCodec(cs?: CurrentSelect) {
	if (!('video' in s.playUrlInfo) || !s.playUrlInfo.video) return;
	updateDefault(
		s.playUrlInfo.video.filter(item => item.id === s.currentSelect.dms).map(item => item.codecid),
	"df_cdc", "cdc", cs);
}
async function checkOthers(index: number, options?: { init?: boolean }) {
	try {
		s.index = index;
		const info = s.mediaInfo.list[s.index];
		if (s.mediaInfo.type === MediaType.Music) {
			othersReqs.danmaku = false;
		} else if (s.mediaInfo.type === MediaType.Manga) {
			othersReqs.danmaku = false;
			// othersReqs.manga = true;
			othersReqs.manga = false;
		} else {
			othersReqs.aiSummary = await data.getAISummary(info, s.mediaInfo.upper.mid || 0, { check: true }) as number;
			othersReqs.danmaku = true;
		}
		othersReqs.cover = true;
		if (options?.init && popup.value) {
			if (s.mediaInfo.type !== MediaType.Manga) await updateStream(index, 0);
			popup.value.init("others", s.mediaInfo.type, { req: othersReqs });
		}
	} catch(err) {
		err instanceof ApplicationError ? err.handleError() :
		new ApplicationError(err as string).handleError();
	}
}
async function getFolder() {
	const parent = await dialog.open({
		directory: true,
		multiple: false,
	});
	return parent;
}
async function getOthers(type: keyof typeof othersMap, options?: { date?: string, parent?: string }) {
	try {
		const info = s.mediaInfo.list[s.index];
		const name = filename({
			title: info.title + (type === 'historyDanmaku' && options?.date ? `_${options.date}` : ''),
			mediaType: i18n.global.t(`home.label.${type}`),
			aid: info.id,
		});
		if (type === 'manga') return;
		const _data = await (async () => { switch (type) {
			case 'cover': return await data.getBinary(info.cover);
			case 'aiSummary': return await data.getAISummary(info, s.mediaInfo.upper.mid || 0);
			case 'liveDanmaku': return await data.getLiveDanmaku(info);
			case 'historyDanmaku': return await data.getHistoryDanmaku(info.cid, options?.date || "");
		}})();
		const suffix = othersMap[type].suffix;
		const path =
			options?.parent ? `${await pathJoin(options.parent, name)}.${suffix}`
			: await dialog.save({
				filters: [{
					name: othersMap[type].desc,
					extensions: [othersMap[type].suffix]
				}],
				defaultPath: `${await pathJoin(settings.down_dir, name)}.${suffix}`
			});
		if (!path) return;
		const secret = useInfoStore().secret;
		const result = await (async () => {
			switch (type) {
				case 'cover': return await commands.writeBinary(secret, path, transformImage(_data as ArrayBuffer));
				case 'aiSummary': return await commands.writeBinary(secret, path, new TextEncoder().encode(_data as string) as any);
				case 'liveDanmaku': case 'historyDanmaku': return await commands.xmlToAss(secret, path, name, _data as any);
			}
		})();
		if (result?.status === 'error') throw new ApplicationError(result.error);
	} catch(err) {
		err instanceof ApplicationError ? err.handleError() :
		new ApplicationError(err as string).handleError();
	}
}
async function updateStein(edge_id: number) {
	const info = s.mediaInfo;
	const stein_gate = info.stein_gate;
	if (!stein_gate) return;
	const stein_info = await data.getSteinInfo(info.id, stein_gate.grapth_version, edge_id);
	s.mediaInfo.stein_gate = {
		edge_id: 1,
		grapth_version: stein_gate.grapth_version,
		story_list: stein_info.story_list,
		choices: stein_info.edges.questions[0].choices,
		hidden_vars: stein_info.hidden_vars,
	};
	const current = stein_info.story_list.find(story => story.edge_id === edge_id);
	if (!current) return;
	s.mediaInfo.list = [{
		id: info.id,
		cid: current.cid,
		title: current.title,
		cover: current.cover,
		desc: info.desc,
		eid: info.list[0].eid,
		duration: info.list[0].duration,
		ss_title: info.list[0].ss_title,
		index: 0,
	}];
}
async function initMulti(type: 'audioVideo' | 'others') {
	if (!s.checkbox || !popup.value) return;
	s.currentSelect.fmt = 0;
	await updateStream(s.multiSelect[0], 0);
	await checkOthers(s.multiSelect[0]);
	popup.value.init(type, s.mediaInfo.type, {
		req: othersReqs,
		noFmt: s.mediaInfo.type !== MediaType.Video
	});
}
async function pushBackQueue(type: 'video' | 'audio' | 'all', options?: { output?: string, init?: boolean, i?: number }) {
	try {
		const info = s.playUrlInfo as DashInfo;
		const video = type === 'audio' ? null : 
			info.video ? info.video.find(item => item.id === s.currentSelect.dms && item.codecid === s.currentSelect.cdc) : null;
		const audio = type === 'video' ? null : 
			info.audio ? info.audio.find(item => item.id === s.currentSelect.ads) : null;
		if (options?.init) {
			router.push('/down-page');
			queuePage.value = 0;
		}
		return await data.pushBackQueue({
			info: s.mediaInfo.list[options?.i || s.index],
			...(video && { video }),
			...(audio && { audio }),
			output: options?.output,
			media_type: i18n.global.t('downloads.media_type.' + s.mediaInfo.type)
		});
	} catch(err) {
		err instanceof ApplicationError ? err.handleError() :
		new ApplicationError(err as string).handleError();
	}
}
async function pushBackMulti(type: 'video' | 'audio' | 'all' | keyof typeof othersMap, options?: { date?: string }) {
	const cs = { ...s.currentSelect };
	let output = String();
	const othersParent = type in othersMap ? await getFolder() : '_';
	if (!othersParent) return;
	for (const [_, i] of s.multiSelect.entries()) {
		try {
			if (type in othersMap) {
				await getOthers(type as any, { ...options, parent: othersParent });
			} else {
				for (const key in cs) (s.currentSelect as any)[key] = (cs as any)[key];
				await updateStream(i, s.currentSelect.fmt, { cs });
				const result = await pushBackQueue(type as any, { ...(output && { output }), init: _ === 0, i });
				output = await pathDirname(result?.output || settings.down_dir);
			}
		} catch(err) {
			err instanceof ApplicationError ? err.handleError() :
			new ApplicationError(err as string).handleError();
		}
		await new Promise(resolve => setTimeout(resolve, getRandomInRange(100, 300)));
	}
}
defineExpose({ search });
</script>

<style scoped lang="scss">
.search_input, .media_root {
	transition: top .3s cubic-bezier(0,1,.6,1), opacity .2s;
}
.multi-select .active {
	@apply text-[color:var(--dark-button-color)] bg-[color:var(--primary-color)];;
}
</style>