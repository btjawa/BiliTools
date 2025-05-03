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
		<div class="mt-3" v-if="v.searchMediaType === Types.MediaType.Favorite">
			<span>Page</span>
			<input type="number" v-model="v.pageIndex" class="ml-2" />
		</div>
		<RecycleScroller
			class="scrollList mt-3"
			:class="v.searchMediaType === Types.MediaType.Favorite ? 'h-[calc(100%-202px)]' : 'h-[calc(100%-158px)]'"
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
	<Popup ref="popup" :process="processGeneral" :codec-change="(codec, others, multi) => initGeneral(v.index, { codec, others, multi })" />
	<PackagePopup ref="packagePopup" :process="processPackage" />
</div></template>

<script setup lang="ts">
import { ApplicationError, AppLog, filename, getImageBlob, getRandomInRange, parseId } from '@/services/utils';
import { MediaInfo, MediaInfoItem, Popup, PackagePopup } from '@/components/SearchPage';
import { useAppStore, useSettingsStore, useUserStore } from '@/store';
import { dirname, join as pathJoin } from '@tauri-apps/api/path';
import { reactive, ref, computed, inject, watch } from 'vue';
import { getMediaInfo, getPlayUrl } from '@/services/data';
import { commands, CurrentSelect } from '@/services/backend';
import { save as dialogSave } from '@tauri-apps/plugin-dialog';
import { transformImage } from '@tauri-apps/api/image';
import { openUrl } from '@tauri-apps/plugin-opener';
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
	mediaInfo: { list: [] } as unknown as Types.MediaInfo,
	searchTarget: 0,
	useCheckbox: false,
	checkboxs: [] as number[],
	index: -1,
});

const othersMap = {
	'covers': { suffix: 'jpg', desc: 'JPG Image' },
	'aiSummary': { suffix: 'md', desc: 'Markdown Document' },
	'metaSnapshot': { suffix: 'md', desc: 'Markdown Document' },
	'liveDanmaku': { suffix: 'ass', desc: 'ASS Subtitle File' },
	'historyDanmaku': { suffix: 'ass', desc: 'ASS Subtitle File' },
	'subtitles': { suffix: 'srt', desc: 'SRT Subtitle File' },
}

const downloadOptions = computed(() => [{
	icon: 'fa-cloud-arrow-down',
	text: 'home.button.general',
	action: (i: number, multi?: boolean) => initGeneral(i, { multi }),
}, {
	icon: 'fa-folder-plus',
	text: 'home.button.package',
	action: (i: number, multi?: boolean) => initPackage(i, { multi }),
}]);

const popup = ref<InstanceType<typeof Popup>>();
const packagePopup = ref<InstanceType<typeof PackagePopup>>();
const queuePage = inject('queuePage', ref(0));

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
		v.mediaInfo = { list: [] } as any;
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
		const info = await getMediaInfo(parsed.id, type);
		v.searchTarget = info.list.findIndex(v => v.aid === info.id);
		info.cover = await getImageBlob(info.cover);
		if (info.upper.avatar) {
			info.upper.avatar = await getImageBlob(info.upper.avatar + '@128h');
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
	if (v.mediaInfo.covers.length) {
		others.covers = v.mediaInfo.covers;
	}
	if (v.mediaInfo.type !== Types.MediaType.Music) {
		others.danmaku = true;
	}
	if (v.mediaInfo.type === Types.MediaType.Video && useUserStore().isLogin) {
		const status = await data.getAISummary(info, v.mediaInfo.upper.mid ?? 0, { check: true });
		others.aiSummary = Boolean(status);
		const subtitles = await data.getSubtitles(info);
		others.subtitles = subtitles;
	}
	return others;
}

async function initGeneral(index: number, options?: { codec?: Types.StreamCodecType, others?: Types.OthersProvider, multi?: boolean }) {
	try {
		v.index = index;
		const info = v.mediaInfo.list[v.index];
		const playUrl = await getPlayUrl(info, v.mediaInfo.type, options?.codec ?? Types.StreamCodecType.Dash);
		const others = options?.others ?? await initOthers(info);
		popup.value?.init(playUrl, others, options?.multi);
	} catch(err) {
		new ApplicationError(err).handleError();
	}
}

async function initPackage(index: number, options?: { multi?: boolean }) {
	try {
		v.index = index;
		const info = v.mediaInfo.list[v.index];
		const playUrl = await getPlayUrl(info, v.mediaInfo.type, Types.StreamCodecType.Dash);
		const others = await initOthers(info);
		packagePopup.value?.init(playUrl, others, options?.multi);
	} catch(err) {
		new ApplicationError(err).handleError();
	}
}

async function download(select: CurrentSelect, info: Types.MediaInfo['list'][0], playurl: Types.PlayUrlProvider, ref: { key: string, data: any }, index: number, output?: string) {
	const params: {
		video?: Types.PlayUrlResult,
		audio?: Types.PlayUrlResult,
	} = {};
	if (ref.key === 'video' || ref.key === 'audioVideo') {
		params.video = playurl.video?.find(v => v.id === select.dms && v.codecid === select.cdc);
	} else select.cdc = -1, select.dms = -1;
	if (ref.key === 'audio' || ref.key === 'audioVideo') {
		params.audio = playurl.audio?.find(v => v.id === select.ads);
	} else select.ads = -1;
	const upper = v.mediaInfo.upper;
	let title = info.title;
	let body;
	switch (ref.key) {
		case 'video': case 'audio': case 'audioVideo':
			return await data.pushBackQueue({
				info, upper, ...params, select,
				sstitle: v.mediaInfo.title,
				index, output,
			});
		case 'liveDanmaku': body = await data.getLiveDanmaku(info); break;
		case 'historyDanmaku':
			body = await data.getHistoryDanmaku(info, ref.data);
			title += ('_' + ref.data);
			break;
		case 'aiSummary': body = await data.getAISummary(info, upper.mid ?? 0); break;
		case 'subtitles':
			const subtitles = await data.getSubtitles(info);
			const subtitle = subtitles.find(v => v.lan === ref.data);
			if (!subtitle) throw 'subtitle url not found';
			body = await data.getSubtitle(subtitle.subtitle_url);
			title += ('_' + subtitle.lan_doc);
			break;
		case 'covers':
			body = await data.getBinary(v.mediaInfo.covers.find(v => v.id === ref.data)?.url ?? info.cover);
			title += ('_' +( v.mediaInfo.covers.find(v => v.id === ref.data)?.id ?? 'cover'));
			break;
	}
	const map = othersMap[ref.key as keyof typeof othersMap];
	const file = `${filename(info, upper, index)}.${map.suffix}`;
	const path = output ?
		await pathJoin(output, file) :
		await dialogSave({
		filters: [{ name: map.desc, extensions: [map.suffix] }],
		defaultPath: await pathJoin(settings.down_dir, file)
	});
	if (!path) return;
	const secret = useAppStore().secret;
	let result;
	switch (ref.key) {
		case 'liveDanmaku': case 'historyDanmaku': result = await commands.xmlToAss(secret, path, body); break;
		case 'aiSummary': case 'subtitles': result = await commands.writeBinary(secret, path, new TextEncoder().encode(body) as any); break;
		case 'covers': result = await commands.writeBinary(secret, path, transformImage(body)); break;
	}
	if (result?.status === 'error') throw result.error;
	return await dirname(path);
}

async function processGeneral(select: CurrentSelect, target: { key: string, data: any }, options?: { multi?: boolean, index?: number, output?: string }) {
	const conc = settings.max_conc;
	const chunks = [[options?.multi ? v.checkboxs[0] : (options?.index ?? v.index)]];
	if (options?.multi) for (let i = 1; i < v.checkboxs.length; i += conc) {
		chunks.push(v.checkboxs.slice(i, i + conc));
	}
	if (target.key === 'video' || target.key === 'audio' || target.key === 'audioVideo') {
		queuePage.value = 0;
		router.push('/down-page');
	}
	let output: string | undefined = options?.output;
	let index = 0;
	for (const chunk of chunks) {
		await Promise.all(chunk.map(async item => {
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
				const result = await download(newSelect, info, playurl, target, index, output);
				if (result) output = result;
			} catch(err) {
				new ApplicationError(err).handleError();
			}
		}));
		await new Promise(resolve => setTimeout(resolve, getRandomInRange(100, 500)));
	}
	return output;
}

async function processPackage(select: Types.PackageSelect, options?: { multi?: boolean }) {
	const chunks = [options?.multi ? v.checkboxs[0] : v.index];
	for (let i = 1; i < v.checkboxs.length; i++) {
		chunks.push(v.checkboxs[i]);
	}
	const keys = Object.keys(select);
	if (keys.includes('video') || keys.includes('audio') || keys.includes('audioVideo')) {
		queuePage.value = 0;
		router.push('/down-page');
	}
	const entries = Object.entries(select);
	for (const [index, chunk] of chunks.entries()) {
		let output = await pathJoin(settings.down_dir, filename(v.mediaInfo.list[chunk], v.mediaInfo.upper, index));
		const secret = useAppStore().secret;
		await commands.newFolder(secret, output);
		await Promise.all(entries.map(async ([key, data]) => {
			const newSelect = {
				dms: settings.df_dms,
				ads: settings.df_ads,
				cdc: settings.df_cdc,
				fmt: settings.df_cdc,
			}
			await processGeneral(newSelect, { key, data }, { index: chunk, output });
		}));
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
	const current = stein_info.story_list.find(story => story.edge_id === edge_id)!;
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