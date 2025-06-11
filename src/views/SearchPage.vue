<template><div>
    <div ref="searchInput" :style="{ 'top': v.searchActive ? '13px' : 'calc(50% - 13px)' }"
		class="search_input absolute flex w-[calc(100%-397px)] rounded-[26px] p-2.5 gap-2 bg-[color:var(--block-color)]"
	>
        <input
			type="text" :placeholder="$t('home.inputPlaceholder', [$t('common.bilibili')])" @keydown.enter="search()"
			v-model="v.searchInput" class="w-full !rounded-2xl" autocomplete="off" spellcheck="false"
			@input="v.searchInput = v.searchInput.replace(/[^a-zA-Z0-9-._~:/?#@!$&'()*+,;=%]/g, '')"
		/>
		<Dropdown class="float-left media_type"
			:drop="[{ id: 'auto', name: i18n.global.t('home.label.autoDetect') },
			...Object.values(Types.MediaType).map(id => ({
				id, name: i18n.global.t('downloads.media_type.' + id)
			}))]" :emit="i => v.searchMediaType = i"
			:id="v.searchMediaType"
		/>
		<button @click="search()" :class="[settings.dynFa, 'fa-search rounded-full float-right']"></button>
    </div>
	<div :style="{ 'opacity': v.listActive ? 1 : 0, 'pointerEvents': v.listActive ? 'all' : 'none' }"
		class="media_root absolute top-[78px] w-[calc(100%-269px)] h-[calc(100%-93px)]"
	>
		<MediaInfo class="media_info" :info="v.mediaInfo" :open="openUrl" />
        <Empty v-if="v.mediaInfo.list.length === 0" text="home.empty" />
		<div class="my-2 flex justify-center gap-[5px] max-w-full overflow-auto stein-nodes" v-if="v.mediaInfo?.stein_gate">
			<button v-for="story in v.mediaInfo.stein_gate.story_list"
				class="w-9 h-9 rounded-full relative p-0 flex-shrink-0"
				@click="updateStein(story.edge_id)">
				<i :class="[settings.dynFa, story.is_current ? 'fa-check' : 'fa-location-dot']"></i>
			</button>
		</div>
		<div class="mt-3" v-if="v.mediaInfo.type === Types.MediaType.Favorite">
			<span>Page</span>
			<input type="number" v-model="v.pageIndex" class="ml-2" />
		</div>
		<RecycleScroller
			class="scrollList mt-3"
			:class="v.mediaInfo.type === Types.MediaType.Favorite ? 'h-[calc(100%-202px)]' : 'h-[calc(100%-158px)]'"
			:items="v.mediaInfo.list" :item-size="50"
			key-field="index" v-slot="{ item, index }"
			v-if="v.mediaInfo.list.length"
		>
			<MediaInfoItem :index :item :checkbox="v.useCheckbox" v-model="v.checkboxs" :options="downloadOptions"
				:class="{ 'border-2 border-solid border-[var(--primary-color)]': index === v.searchTarget }"
			/>
		</RecycleScroller>
		<div class="my-2 flex justify-center gap-[5px] absolute w-full"
			v-if="v.mediaInfo?.stein_gate" :style="{ 'top': 216 + v.mediaInfo.list.length * 50 + 'px' }"
		>
			<template v-for="(question, index) in v.mediaInfo.stein_gate.choices"><button
				v-if="getSteinCondition(v.mediaInfo.stein_gate, index)"
				@click="updateStein(question.id)"
			>{{ question.option }}</button></template>
		</div>
		<div class="fixed bottom-6 left-[73px] flex flex-col gap-3 multi-select">
			<button v-if="v.useCheckbox"
				@click="v.checkboxs = v.checkboxs.length === v.mediaInfo.list.length 
					? [] : Array.from({ length: v.mediaInfo.list.length }, (_, i) => i)
				"
			>
				<i :class="[settings.dynFa, 'fa-check-double']"></i>
				<span>{{ $t('home.label.selectAll') }}</span>
			</button>
			<button @click="v.useCheckbox = !v.useCheckbox" :class="{ 'active': v.useCheckbox }">
				<i :class="[settings.dynFa, 'fa-square-check']"></i>
				<span>{{ $t('home.label.multiSelect') }}</span>
			</button>
		</div>
		<div class="fixed bottom-6 right-4 flex flex-col gap-3" v-if="v.useCheckbox">
			<button v-for="item in downloadOptions" @click="item.action(v.checkboxs[0], true)" class="primary-color">
				<i :class="[settings.dynFa, item.icon]"></i>
				<span>{{ $t(item.text) }}</span>
			</button>
		</div>
	</div>
	<Popup ref="popup" :process="processGeneral" :codec-change="(codec, others, multi) => initPopup(v.index, true, { codec, others, multi })" />
	<PackagePopup ref="packagePopup" :process="processPackage" />
</div></template>

<script setup lang="ts">
import { ApplicationError, AppLog, getFormat, getImageBlob, getRandomInRange, parseId, tryFetch } from '@/services/utils';
import { MediaInfo, MediaInfoItem, Popup, PackagePopup } from '@/components/SearchPage';
import { useAppStore, useSettingsStore, useUserStore } from '@/store';
import { dirname, join as pathJoin } from '@tauri-apps/api/path';
import { reactive, ref, computed, inject, watch } from 'vue';
import { getMediaInfo, getPlayUrl } from '@/services/data';
import { save as dialogSave } from '@tauri-apps/plugin-dialog';
import { info as LogInfo } from '@tauri-apps/plugin-log';
import { transformImage } from '@tauri-apps/api/image';
import { openUrl } from '@tauri-apps/plugin-opener';
import { commands } from '@/services/backend';
import { Empty } from '@/components';
import { TYPE } from 'vue-toastification';
import * as data from '@/services/data';
import * as Types from '@/types/data.d';
import Dropdown from '@/components/Dropdown.vue';
import i18n from '@/i18n';
import router from '@/router';

const settings = useSettingsStore();
const v = reactive({
	searchInput: String(),
	searchActive: false,
	listActive: false,
	searchMediaType: 'auto' as Types.MediaType | 'auto',
	pageIndex: 1,
	mediaInfo: { nfo: {}, list: [] } as unknown as Types.MediaInfo,
	searchTarget: 0,
	useCheckbox: false,
	checkboxs: [] as number[],
	index: -1,
});

const othersMap = {
	'covers': { suffix: 'jpg', desc: 'JPG Image' },
	'albumNfo': { suffix: 'nfo', desc: 'NFO File' },
	'singleNfo': { suffix: 'nfo', desc: 'NFO File' },
	'aiSummary': { suffix: 'md', desc: 'Markdown Document' },
	'subtitles': { suffix: 'srt', desc: 'SRT Subtitle File' },
	'liveDanmaku': { suffix: 'ass', desc: 'ASS Subtitle File' },
	'historyDanmaku': { suffix: 'ass', desc: 'ASS Subtitle File' },
}

const downloadOptions = computed(() => [{
	icon: 'fa-cloud-arrow-down',
	text: 'home.button.general',
	action: (i: number, multi?: boolean) => initPopup(i, true, { multi }),
}, {
	icon: 'fa-folder-plus',
	text: 'home.button.package',
	action: (i: number, multi?: boolean) => initPopup(i, false, { multi }),
}]);

const popup = ref<InstanceType<typeof Popup>>();
const packagePopup = ref<InstanceType<typeof PackagePopup>>();
const queuePage = inject('queuePage', ref(0));
const processQueue = inject('processQueue', () => {});

watch(() => v.checkboxs, (v, old) => {
	if (v.length > old.length && v.length > 30)
	return AppLog(i18n.global.t('error.multiSelectLimit'), TYPE.WARNING);
});

watch(() => v.pageIndex, async (pn) => {
    if (pn < 1) return v.pageIndex = 1;
	try {
		const info = await getMediaInfo(String(v.mediaInfo.id), Types.MediaType.Favorite, { pn });
		v.mediaInfo.list = info.list;
	} catch(err) {
		new ApplicationError(err).handleError();
	}
})

defineExpose({ search });
async function search(overrideInput?: string) {
	function reset() {
		v.mediaInfo = { nfo: {}, list: [] } as any;
		v.searchActive = false;
		v.listActive = false;
		v.useCheckbox = false;
		v.checkboxs = [];
	};
	const input = overrideInput ?? v.searchInput;
	v.searchInput = input;
	if (!input.trim().length) return;
	reset();
	v.searchActive = true;
	try {
		const parsed = v.searchMediaType === Types.MediaType.Favorite ? { id: input, type: v.searchMediaType } : await parseId(input);
		const type = v.searchMediaType === 'auto' ? parsed.type : v.searchMediaType;
		LogInfo('Parsed input: ' + JSON.stringify(parsed));
		const info = await getMediaInfo(parsed.id, type);
		console.log(info)
		v.searchTarget = info.list.findIndex(v => v.aid === info.id);
		info.cover = await getImageBlob(info.cover);
		if (info.nfo.upper.avatar) {
			info.nfo.upper.avatar = await getImageBlob(info.nfo.upper.avatar + '@64h');
		}
		v.mediaInfo = info;
		v.listActive = true;
		await new Promise(resolve => setTimeout(resolve, 0)); // Wait for v-if to be applied
		const scrollList = document.querySelector('.scrollList') as HTMLElement;
		scrollList.scrollTo({ top: v.searchTarget * 50, behavior: 'smooth' });
	} catch(err) {
		new ApplicationError(err).handleError();
		reset();
	}
}

async function initOthers(info: Types.MediaInfo['list'][0]) {
	const others: Types.OthersProvider = {
		aiSummary: false,
		danmaku: false,
		covers: [],
		subtitles: [],
	};
	const nfo = v.mediaInfo.nfo;
	others.covers = nfo.thumbs.map(v => v.id);
	others.danmaku = v.mediaInfo.type !== Types.MediaType.Music;
	if (v.mediaInfo.type === Types.MediaType.Video && useUserStore().isLogin) {
		const status = await data.getAISummary(info, nfo.upper.mid ?? 0, { check: true });
		others.aiSummary = Boolean(status);
		const subtitles = await data.getSubtitles(info);
		others.subtitles = subtitles;
	}
	return others;
}

async function initPopup(index: number, general: boolean, options?: { codec?: Types.StreamCodecType, others?: Types.OthersProvider, multi?: boolean }) {
	try {
		v.index = index;
		const type = v.mediaInfo.type;
		const info = v.mediaInfo.list[v.index];
		if (!info.cid && info.aid) {
			v.mediaInfo.list[v.index].cid = await data.getCid(info.aid);
		}
		const playUrl = await getPlayUrl(info, type, options?.codec ?? Types.StreamCodecType.Dash);
		const others = options?.others ?? await initOthers(info);
		(general ? popup : packagePopup).value?.init(playUrl, others, options?.multi);
	} catch(err) {
		new ApplicationError(err).handleError();
	}
}

async function download(select: Types.CurrentSelect, item: Types.MediaInfo['list'][0], playurl: Types.PlayUrlProvider, ref: { key: string, data: any }, index: number, output?: string) {
	if (ref.key === 'albumNfo') return;
	const params: {
		video?: Types.PlayUrlResult,
		audio?: Types.PlayUrlResult,
	} = {};
	if (ref.key === 'video' || ref.key === 'audioVideo') {
		params.video = playurl.video?.find(v => 
			v.codecid ? v.id === select.dms && v.codecid === select.cdc : v.id === select.dms
		);
	} else select.cdc = -1, select.dms = -1;
	if (ref.key === 'audio' || ref.key === 'audioVideo') {
		params.audio = playurl.audio?.find(v => v.id === select.ads);
	} else select.ads = -1;
	const nfo = v.mediaInfo.nfo;
	if (ref.data === 'queue') {
		const result = await data.pushBackQueue({
			item, nfo, ...params, select, index, output
		});
		if (settings.auto_download) processQueue();
		return result;
	}
	const map = othersMap[ref.key as keyof typeof othersMap];
	const file = `${getFormat({ item, nfo, index })}.${map.suffix}`;
	const path = output ?
		await pathJoin(output, file) :
		await dialogSave({
		filters: [{ name: map.desc, extensions: [map.suffix] }],
		defaultPath: await pathJoin(settings.down_dir, file)
	});
	if (!path) return;
	let body;
	switch (ref.key) {
		case 'covers': body = await tryFetch(nfo.thumbs.find(v => v.id === ref.data)?.url ?? item.cover, { type: 'binary' }); break;
		case 'singleNfo': body = await data.getSingleNfo(v.mediaInfo, item); break;
		case 'aiSummary': body = await data.getAISummary(item, nfo.upper.mid ?? 0); break;
		case 'liveDanmaku': body = await data.getDanmaku(item); break;
		case 'historyDanmaku': body = await data.getDanmaku(item, ref.data); break;
		case 'subtitles':
			const subtitles = await data.getSubtitles(item);
			const subtitle = subtitles.find(v => v.lan === ref.data);
			if (!subtitle) throw 'subtitle url not found';
			body = await data.getSubtitle(subtitle.subtitle_url);
			break;
	}
	if (!body) throw 'No data to write';
	const secret = useAppStore().secret;
	let result;
	switch (ref.key) {
		case 'covers': result = await commands.writeBinary(secret, path, transformImage(body)); break;
		case 'liveDanmaku': case 'historyDanmaku': result = await commands.xmlToAss(secret, path, body); break;
		default: result = await commands.writeBinary(secret, path, new TextEncoder().encode(body) as any); break;
	}
	if (result?.status === 'error') throw result.error;
	return await dirname(path);
}

async function processGeneral(select: Types.CurrentSelect, target: { key: string, data: any }, options?: { multi?: boolean, index?: number, output?: string, noSleep?: boolean }) {
	const conc = settings.max_conc;
	const chunks = [[options?.multi ? v.checkboxs[0] : v.index]];
	if (options?.multi) for (let i = 1; i < v.checkboxs.length; i += conc) {
		chunks.push(v.checkboxs.slice(i, i + conc));
	}
	if (target.data === 'queue') {
		queuePage.value = 0;
		router.push('/down-page');
	}
	let output: string | undefined = options?.output;
	let index = -1;
	for (const chunk of chunks) {
		for (const item of chunk) {
			index++;
			const info = v.mediaInfo.list[item];
			const getId = (ids: number[], ref: number) => ids.includes(ref) ? ref : ids.sort((a, b) => b - a)[0];
			try {
				const playurl = await getPlayUrl(info, v.mediaInfo.type, Types.StreamCodecMap[select.fmt]);
				const dms = getId(playurl.videoQualities ?? [], select.dms);
				const newSelect = {
					ads: getId(playurl.audioQualities ?? [], select.ads),
					cdc: getId(playurl.video?.filter(v => v.id === dms).map(v => v.codecid ?? -1) ?? [], select.cdc),
					dms, fmt: playurl.codecid,
				}
				const result = await download(newSelect, info, playurl, target, (options?.index ?? index) + 1, output);
				if (result) output = result;
			} catch(err) {
				new ApplicationError(err).handleError();
			}
		};
		if (!options?.noSleep) await new Promise(resolve => setTimeout(resolve, getRandomInRange(100, 500)));
	}
	return output;
}

async function processPackage(target: Types.PackageSelect, options?: { multi?: boolean }) {
	const chunks = [options?.multi ? v.checkboxs[0] : v.index];
	if (options?.multi) for (let i = 1; i < v.checkboxs.length; i++) {
		chunks.push(v.checkboxs[i]);
	}
	const keys = Object.keys(target);
	if (keys.includes('video') || keys.includes('audio') || keys.includes('audioVideo')) {
		queuePage.value = 0;
		router.push('/down-page');
	}
	const entries = Object.entries(target);
	const secret = useAppStore().secret;
	for (const chunk of chunks) {
		const item = v.mediaInfo.list[chunk];
		const nfo = v.mediaInfo.nfo;
		const select = {
			dms: settings.df_dms,
			ads: settings.df_ads,
			cdc: settings.df_cdc,
			fmt: settings.df_cdc,
		}
		let output = await pathJoin(
			settings.down_dir,
			getFormat({ isFolder: true, item, nfo, select })
		);
		await commands.newFolder(secret, output);
		v.index = chunk;
		for (const [index, [key, data]] of entries.entries()) {
			await processGeneral(select, { key, data }, { index, output, noSleep: true });
		}
		await new Promise(resolve => setTimeout(resolve, getRandomInRange(100, 500)));
	}
}

function getSteinCondition(stein_gate: typeof v.mediaInfo.stein_gate, index: number) {
	const question = stein_gate?.choices?.[index];
	const exp = question?.condition ? question.condition.replace(/\$[\w]+/g, (match) => {
		const hiddenVar = stein_gate?.hidden_vars.find(v => v.id_v2 === match.slice());
		return hiddenVar?.value.toString() || '0';
	}) : '1';
	return (new Function('return ' + exp.match(/^[\d+\-*/.()=<>\s]+$/)?.[0]))();
}

async function updateStein(edge_id: number) {
	const info = v.mediaInfo;
	const stein = info.stein_gate!;
	const stein_info = await data.getSteinInfo(info.id, stein.grapth_version, edge_id);
	v.mediaInfo.stein_gate = {
		...stein, ...stein_info, edge_id: 1,
		choices: stein_info.edges.questions[0].choices,
	};
	const current = stein_info.story_list.find(story => story.is_current)!;
	Object.assign(v.mediaInfo.list[0], {
		cid: current.cid,
		title: current.title,
		cover: current.cover
	});
}
</script>

<style scoped lang="scss">
.search_input, .media_root {
	transition: top .3s cubic-bezier(0,1,.6,1), opacity .2s;
}
.multi-select .active {
	@apply text-[color:var(--dark-button-color)] bg-[color:var(--primary-color)];;
}
:deep(.media_type > button) {
	@apply rounded-full
}
</style>