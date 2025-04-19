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
			:drop="getMediaType()" :emit="i => v.searchMediaType = i"
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
				<span>{{ item.text }}</span>
			</button>
		</div>
	</div>
	<Popup ref="popup" :handle-close="handlePopupClose" :codec-change="(codec, others, multi) => initPopup(v.index, { codec, others, multi })" />
</div></template>

<script setup lang="ts">
import { ApplicationError, AppLog, filename, getImageBlob, getRandomInRange, parseId } from '@/services/utils';
import { useInfoStore, useSettingsStore, useUserStore } from '@/store';
import { reactive, ref, computed, nextTick, inject, watch } from 'vue';
import { MediaInfo, MediaInfoItem, Popup } from '@/components/SearchPage';
import { dirname, join as pathJoin } from '@tauri-apps/api/path';
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

function getMediaType() {
	return [
		{ id: 'auto', name: i18n.global.t('home.label.autoDetect') },
		...Object.values(Types.MediaType).map(id => ({
			id, name: i18n.global.t('downloads.media_type.' + id)
		}))
	];
}

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
	playUrlProvider: {} as Types.PlayUrlProvider,
	othersProvider: {} as Types.OthersProvider,
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

const downloadOptions = computed(() => [
...(v.mediaInfo.type !== Types.MediaType.Music ? [{
	id: 'audioVideo',
	icon: 'fa-file-video',
	text: i18n.global.t('home.downloadOptions.audioVideo'),
	action: (i: number, multi?: boolean) => initPopup(i, { multi }),
}] : []), {
	id: 'others',
	icon: 'fa-file-export',
	text: i18n.global.t('home.downloadOptions.others'),
	action: (i: number, multi?: boolean) => initPopup(i, { others: true, multi }),
}]);

const popup = ref<InstanceType<typeof Popup>>();
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
		v.searchTarget = info.list.findIndex(v => v.id === info.id);
		info.cover = await getImageBlob(info.cover);
		info.upper.avatar = info.upper.avatar ? await getImageBlob(info.upper.avatar + '@128h') : null;
		v.mediaInfo = info;
		v.listActive = true;
		const scrollList = document.querySelector('.scrollList') as HTMLElement;
		nextTick(() => scrollList.scrollTo({ top: v.searchTarget * 50, behavior: 'smooth' }));
	} catch(err) {
		new ApplicationError(err).handleError();
		reset();
	}
}

async function initPopup(index: number, options?: { codec?: Types.StreamCodecType, others?: boolean, multi?: boolean }) {
	try {
		const info = v.mediaInfo.list[index];
		v.index = index;
		v.playUrlProvider = await getPlayUrl(info, v.mediaInfo.type, options?.codec ?? Types.StreamCodecType.Dash);
		if (options?.others) {
			const othersProvider: Types.OthersProvider = {
				aiSummary: false,
				danmaku: false,
				covers: [],
				subtitles: [],
			};
			if (v.mediaInfo.covers.length) {
				othersProvider.covers = v.mediaInfo.covers;
			}
			if (v.mediaInfo.type !== Types.MediaType.Music) {
				othersProvider.danmaku = true;
			}
			if (v.mediaInfo.type === Types.MediaType.Video && useUserStore().isLogin) {
				const status = await data.getAISummary(info, v.mediaInfo.upper.mid ?? 0, { check: true });
				othersProvider.aiSummary = Boolean(status);
				const subtitles = await data.getSubtitles(info.id, info.cid);
				othersProvider.subtitles = subtitles;
			}
			popup.value?.init(v.playUrlProvider, v.mediaInfo.type, { others: othersProvider, multi: options?.multi });
			v.othersProvider = othersProvider;
		} else {
			popup.value?.init(v.playUrlProvider, v.mediaInfo.type, { multi: options?.multi });
		}
	} catch(err) {
		new ApplicationError(err).handleError();
	}
}

async function handleGeneral(select: CurrentSelect, info: Types.MediaInfo['list'][0], playurl: Types.PlayUrlProvider, options?: { output?: string, others?: { key: string, data: any } }) {
	const params: {
		video?: Types.PlayUrlResult,
		audio?: Types.PlayUrlResult,
	} = {};
	const others = options?.others;
	if (!others || others?.key === 'ads') params.audio = playurl.audio?.find(v => v.id === select.ads);
	if (!others || others?.key !== 'ads') params.video = playurl.video?.find(v => v.id === select.dms && v.codecid === select.cdc);
	if (!params.video) select.cdc = -1, select.dms = -1;
	if (!params.audio) select.ads = -1;
	return await data.pushBackQueue({
		mediaType: i18n.global.t('downloads.media_type.' + v.mediaInfo.type),
		select, info, ...params, output: options?.output
	});
}

async function handleOthers(others: { key: string, data: any }, info: Types.MediaInfo['list'][0], options?: { output?: string }) {
	let othersData;
	let title = info.title;
	switch (others.key) {
		case 'liveDanmaku': othersData = await data.getLiveDanmaku(info.id, info.cid, info.duration ?? 0); break;
		case 'historyDanmaku':
			othersData = await data.getHistoryDanmaku(info.cid, others.data);
			title += ('_' + others.data);
			break;
		case 'aiSummary': othersData = await data.getAISummary(info, v.mediaInfo.upper.mid ?? 0); break;
		case 'subtitles':
			const subtitles = await data.getSubtitles(info.id, info.cid);
			const subtitle = subtitles.find(v => v.lan === others.data);
			if (!subtitle) throw 'subtitle url not found';
			title += ('_' + subtitle.lan_doc);
			othersData = await data.getSubtitle(subtitle.subtitle_url);
			break;
		case 'covers':
			othersData = await data.getBinary(v.mediaInfo.covers.find(v => v.id === others.data)?.url ?? info.cover);
			title += ('_' +( v.mediaInfo.covers.find(v => v.id === others.data)?.id ?? 'cover'));
			break;
	}
	const name = filename({ title, mediaType: i18n.global.t('home.label.' + others.key), aid: info.id  });
	const map = othersMap[others.key as keyof typeof othersMap];
	const path = options?.output ? await pathJoin(await dirname(options?.output), name) + '.' + map.suffix : await dialogSave({
		filters: [{ name: map.desc, extensions: [map.suffix] }],
		defaultPath: await pathJoin(settings.down_dir, name) + '.' + map.suffix
	});
	if (!path) return;
	const secret = useInfoStore().secret;
	let result;
	switch (others.key) {
		case 'liveDanmaku': case 'historyDanmaku': result = await commands.xmlToAss(secret, path, othersData); break;
		case 'aiSummary': case 'subtitles': result = await commands.writeBinary(secret, path, new TextEncoder().encode(othersData) as any); break;
		case 'covers': result = await commands.writeBinary(secret, path, transformImage(othersData)); break;
	}
	if (result?.status === 'error') throw result.error;
	return path;
}

async function handlePopupClose(select: CurrentSelect, options?: { others?: { key: string, data: any }, multi?: boolean }) {
	const others = options?.others;
	if (!options?.multi) {
		try {
			const info = v.mediaInfo.list[v.index];
			if (!others || ['dms', 'cdc', 'ads'].includes(others.key)) {
				await handleGeneral(select, info, v.playUrlProvider, { others });
				queuePage.value = 0;
				router.push('/down-page');
			} else await handleOthers(others, info);
		} catch(err) {
			new ApplicationError(err).handleError();
		}
		return;
	}
	const conc = settings.max_conc;
	const chunks = [];
	for (let i = 0; i < v.checkboxs.length; i += conc) {
		chunks.push(v.checkboxs.slice(i, i + conc));
	}
	let output = '' as any;
	try {
		const info = v.mediaInfo.list[chunks[0][0]];
		if (!others || ['dms', 'cdc', 'ads'].includes(others.key)) {
			output = await handleGeneral(select, info, v.playUrlProvider, { others });
			queuePage.value = 0;
			router.push('/down-page');
		} else {
			output = await handleOthers(others, info);
			if (!output) return;
		}
	} catch(err) {
		new ApplicationError(err).handleError();
	}
	chunks[0].shift();
	for (const chunk of chunks) {
		await Promise.all(chunk.map(async item => {
			const info = v.mediaInfo.list[item];
			function getDefault(ids: number[], name: 'df_dms' | 'df_cdc' | 'df_ads') {
				return ids.includes(settings[name]) ? settings[name] : ids.sort((a, b) => b - a)[0];
			}
			try {
				const playurl = await getPlayUrl(info, v.mediaInfo.type, v.playUrlProvider.codec);
				const newSelect = {
					dms: getDefault(playurl.videoQualities ?? [], 'df_dms'),
					ads: getDefault(playurl.audioQualities ?? [], 'df_ads'),
					cdc: -1,
					fmt: playurl.codecid,
				}
				newSelect.cdc = getDefault(
					playurl.video?.filter(v => v.id === newSelect.dms).map(v => v.codecid!) ?? [],
					'df_cdc'
				);
				if (!others || ['dms', 'cdc', 'ads'].includes(others.key)) {
					await handleGeneral(newSelect, info, playurl, { output, others });
				} else await handleOthers(others, info, { output });
			} catch(err) {
				new ApplicationError(err).handleError();
			}
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