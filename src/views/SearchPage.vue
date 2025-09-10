<template><div>
<div ref="topEl" class="w-full h-full flex flex-col justify-center items-center">
    <div class="flex w-[628px] rounded-full mb-auto p-2 gap-2 bg-(--block-color) border border-(--split-color)">
        <input
			v-model="v.searchInput" class="w-full rounded-2xl"
			type="text" spellcheck="false" @keydown.enter="search()"
			:placeholder="$t('search.input', [$t('bilibili')])"
		/>
		<Dropdown
			:drop="[{ id: 'auto', name: $t('search.autoDetect') },
			...Object.values(Types.MediaType).map(id => ({
				id, name: $t('mediaType.' + id)
			}))]" v-model="v.mediaType"
		/>
		<button @click="search()" :class="[$fa.weight, 'fa-search rounded-full']"></button>
    </div>
	<Transition>
	<Empty
		v-if="!v.listActive && !v.searching"
		class="absolute" :text="$t('search.suggest')"
	/>
	</Transition>
	<Transition>
	<img
		src="@/assets/img/searching.png"
		v-if="v.searching"
		class="absolute"
	/>
	</Transition>
	<Transition>
	<Empty
		v-if="!v.searching && v.listActive && !v.mediaInfo.list?.length"
		class="absolute" :text="$t('empty')"
	/>
	</Transition>
	<Transition>
	<div class="flex flex-col flex-1 mt-3 w-full min-h-0" v-if="v.listActive">
		<MediaInfo :info="v.mediaInfo" />
		<div class="flex mt-3 gap-3 flex-1 min-h-0">
			<Transition name="slide">
			<MediaList
				:list="v.mediaInfo.list" ref="mediaList"
				:stein_gate="v.mediaInfo.stein_gate"
				:update-stein="updateStein"
				v-model="v.checkboxs"
				v-if="!v.searching && v.mediaInfo.list.length"
			/>
			</Transition>
			<div class="flex flex-col gap-3 ml-auto min-w-32 max-w-48 pb-6">
				<button v-for="v in buttons" @click="v.action" class="shrink-0">
					<i :class="[$fa.weight, v.icon]"></i>
					<span>{{ $t(v.text) }}</span>
				</button>
				<template
					v-if="v.mediaInfo.type === 'favorite' || v.mediaInfo.type === 'musicList'"
				>
					<span>{{ $t('page') }}</span>
					<input type="number" v-model="v.pageIndex" @input="handlePage" />
				</template>
				<div class="tab overflow-auto">
					<button v-for="t in v.mediaInfo.sections?.tabs" @click="updateTab(t.id)"
						class="w-full!" :class="{ 'active': v.tab === t.id }"
					>
						<span class="truncate">{{ t.name }}</span>
						<label class="primary-color"></label>
					</button>
				</div>
			</div>
		</div>
	</div>
	</Transition>
</div>
<Popup ref="popup" :fmt="initPopup" :close="() => v.anim.reverse()" :emit />
</div></template>

<script setup lang="ts">
import { MediaInfo, MediaList, Popup } from '@/components/SearchPage';
import { Dropdown, Empty } from '@/components';
import DownPage from './DownPage.vue';

import { inject, nextTick, reactive, Ref, ref, watch } from 'vue';
import * as log from '@tauri-apps/plugin-log';
import { useRouter } from 'vue-router';
import pLimit from 'p-limit';

import { useSettingsStore, useUserStore } from '@/store';
import { AppLog, parseId, strip, waitPage } from '@/services/utils';
import { data, extras } from '@/services/media';
import { save } from '@tauri-apps/plugin-dialog';
import { commands } from '@/services/backend';
import * as queue from '@/services/queue';
import * as Types from '@/types/shared.d';
import i18n from '@/i18n';

const v = reactive({
    anim: {} as Animation,
	mediaInfo: {} as Types.MediaInfo,
	mediaType: 'auto' as Types.MediaType | 'auto',
	checkboxs: [] as number[],
	searchInput: String(),
	listActive: false,
	searching: false,
	pageIndex: 1,
	tab: -1,
});

const buttons = [{
	icon: 'fa-cloud-arrow-down',
	text: 'search.general',
	action: () => initPopup(),
}, {
	icon: 'fa-memo-circle-info',
	text: 'search.extra',
	action: () => AppLog(i18n.global.t('wip'), 'info')
}, {
	icon: 'fa-file-export',
	text: 'search.export',
	action: () => exportData(),
}, {
	icon: 'fa-square-dashed-circle-plus',
	text: 'search.selectAll',
	action: () => v.checkboxs = 
		v.checkboxs.length === v.mediaInfo.list.length 
		? [] : [...Array(v.mediaInfo.list.length).keys()]
}];

const popup = ref<InstanceType<typeof Popup>>();
const downPage = inject<Ref<InstanceType<typeof DownPage>>>('page');
const mediaList = ref<InstanceType<typeof MediaList>>();
const topEl = ref<HTMLElement>();

const router = useRouter()
const user = useUserStore();
const settings = useSettingsStore();

function updateIndex() {
	const raw = v.mediaInfo.list.findIndex(v => v.isTarget);
	const target = raw >= 0 ? raw : v.mediaInfo.list[0]?.index ?? 0;
	v.checkboxs = [target];
	requestAnimationFrame(() => {
		mediaList.value?.vlist?.scrollToIndex(target);
	})
}

async function updateTab(t: number) {
	v.tab = t;
	v.searching = true;
	if (!v.mediaInfo.sections) return;
	const list = v.mediaInfo.sections.data[t];
	if (list) {
		v.mediaInfo.list = list;
	} else {
		const info = await data.getMediaInfo(`av${t}`, v.mediaInfo.type);
		const target = info.sections?.target ?? 0;
		const list = info.sections?.data[target];
		if (target && list) {
			v.mediaInfo.sections.data[target] = list
		}
	}
	await nextTick(); // trigger v-if
	v.searching = false;
	updateIndex();
}

watch(() => v.checkboxs.length, (len) => {
	if (len > 30) AppLog(i18n.global.t('error.selectLimit'), 'warning');
});

defineExpose({ search });
async function search(overrideInput?: string) {
	if (overrideInput) try {
		await parseId(overrideInput)
	} catch(_) { return }
	try {
		const input = (overrideInput ?? v.searchInput).trim();
		v.searchInput = input;
		v.listActive = false;
		v.searching = false;
		v.checkboxs.length = 0;
		v.pageIndex = 1;
		v.tab = -1;
		if (!input.length) return;
		v.searching = true;
		const raw = await parseId(input, v.mediaType !== 'auto');
		const query = {
			id: raw.id,
			type: v.mediaType === 'auto' ? raw.type! : v.mediaType,
		};
		log.info('Query: ' + JSON.stringify(query));
		const info = await data.getMediaInfo(query.id, query.type);
		v.mediaInfo = info;
		v.listActive = true;
		if (info.sections) v.tab = info.sections.target;
		updateIndex();
	} catch(e) {
		throw e;
	} finally {
		await nextTick();
		v.searching = false;
	}
}

async function handlePage() {
	if (v.pageIndex < 1) {
		v.pageIndex = 1;
	}
	const pn = v.pageIndex;
	v.searching = true;
	const result = await data.getMediaInfo(String(v.mediaInfo.id), v.mediaInfo.type, { pn });
	Object.assign(v.mediaInfo, result);
	v.searching = false;
	updateIndex();
}

async function updateStein(edge_id: number) {
	const info = v.mediaInfo;
	const stein = info.stein_gate!;
	const stein_info = await extras.getSteinInfo(info.id, stein.grapth_version, edge_id);
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

async function initPopup(fmt: Types.StreamFormat = Types.StreamFormat.Dash) {
	if (!v.checkboxs.length) return;
	v.checkboxs = v.checkboxs.filter(i => i >= 0 && i < v.mediaInfo.list.length);
	v.checkboxs.sort((a, b) => a - b);
	const limit = pLimit(settings.max_conc);
	const tasks = v.checkboxs.map(i => limit(async () => {
		const info = v.mediaInfo.list[i];
		if (!info.cid && info.aid) {
			info.cid = await data.getCid(info.aid);
		}
	}));
	await Promise.all(tasks);
	const info = v.mediaInfo.list[v.checkboxs[0]];
	const nfo = v.mediaInfo.nfo;
	const type = info.type ?? v.mediaInfo.type;
	const playUrl = await data.getPlayUrl(info, type, fmt);
	const provider = {
		misc: {
			aiSummary: type === 'video' && user.isLogin ? await extras.getAISummary(info, { check: true }) : false,
			subtitles: type !== 'music' && user.isLogin ? (await extras.getSubtitle(info)).map(v => ({ id: v.lan, name: v.lan_doc })) : [],
		},
		nfo: true,
		danmaku: type !== 'music' ? user.isLogin ? ['live', 'history'] : ['live'] : [],
		thumb: nfo.thumbs.map(v => v.id)
	}
	v.anim = topEl.value!.animate([
		{ opacity: '1' },
		{ opacity: '0' },
	], {
		duration: 150,
		fill: 'forwards'
	});
	popup.value?.init(playUrl, provider);
}

async function emit(select: Types.PopupSelect) {
	queue.submit(v.mediaInfo, select, v.checkboxs);
	router.push('/down-page');
	const page = await waitPage(downPage, 'tab');
	page.value.tab = 'waiting';
}

async function exportData() {
	const path = await save({
        defaultPath: `${settings.down_dir}/${strip(v.mediaInfo.nfo.showtitle)}_${Date.now()}.json`
    });
    if (!path) return;
	const result = await commands.exportData(path, v.mediaInfo as any);
	if (result.status === 'error') throw result;
    AppLog(i18n.global.t('search.exported', [path]), 'success');
}
</script>