<template><div>
    <div class="flex w-[628px] rounded-full mb-auto p-2 gap-2 bg-[var(--block-color)]">
        <input
			v-model="v.searchInput" class="w-full !rounded-2xl"
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
		<MediaInfo :info="v.mediaInfo" :open="openUrl" />
		<div class="flex mt-3 gap-3 flex-1 min-h-0">
			<Transition name="slide">
			<MediaList
				class="w-full"
				:info="v.mediaInfo"
				:update-stein="updateStein"
				v-model="v.checkboxs"
				v-if="!v.searching && v.mediaInfo.list.length"
			/>
			</Transition>
			<div class="flex flex-col gap-3 ml-auto w-32">
				<button v-for="v in buttons" @click="v.action">
					<i :class="[$fa.weight, v.icon]"></i>
					<span>{{ $t(v.text) }}</span>
				</button>
				<template
					v-if="v.mediaInfo.type === 'favorite' || v.mediaInfo.type === 'musicList'"
				>
					<span>{{ $t('page') }}</span>
					<input type="number" min="1" v-model="v.pageIndex" />
				</template>
			</div>
		</div>
	</div>
	</Transition>
	<Popup ref="popup" :fmt="initPopup" :emit />
</div></template>

<script setup lang="ts">
import { MediaInfo, MediaList, Popup } from '@/components/SearchPage';
import { Dropdown, Empty } from '@/components';
import DownPage from './DownPage.vue';

import { inject, reactive, Ref, ref, watch } from 'vue';
import { openUrl } from '@tauri-apps/plugin-opener';
import * as log from '@tauri-apps/plugin-log';
import { useRouter } from 'vue-router';
import pLimit from 'p-limit';

import { useSettingsStore, useUserStore } from '@/store';
import { AppLog, parseId, waitPage } from '@/services/utils';
import { data, extras } from '@/services/media';
import * as queue from '@/services/queue';
import * as Types from '@/types/shared.d';
import i18n from '@/i18n';

const v = reactive({
	mediaInfo: {} as Types.MediaInfo,
	mediaType: 'auto' as Types.MediaType | 'auto',
	checkboxs: [] as number[],
	searchInput: String(),
	listActive: false,
	searching: false,
	pageIndex: 1,
});

const buttons = [{
	icon: 'fa-cloud-arrow-down',
	text: 'search.general',
	action: () => initPopup(),
}, {
	icon: 'fa-bolt',
	text: 'search.advanced',
	action: () => AppLog(i18n.global.t('wip'), 'info')
}, {
	icon: 'fa-check-double',
	text: 'search.selectAll',
	action: () => v.checkboxs = 
		v.checkboxs.length === v.mediaInfo.list.length 
		? [] : [...Array(v.mediaInfo.list.length).keys()]
}];

const popup = ref<InstanceType<typeof Popup>>();
const downPage = inject<Ref<InstanceType<typeof DownPage>>>('page');

const router = useRouter()
const user = useUserStore();
const settings = useSettingsStore();

watch(() => v.checkboxs, (a, b) => {
	if (a.length > b.length && a.length > 30)
	AppLog(i18n.global.t('error.selectLimit'), 'warning');
});

watch(() => v.pageIndex, async (pn) => {
	v.checkboxs = [0];
	v.searching = true;
	const result = await data.getMediaInfo(String(v.mediaInfo.id), v.mediaInfo.type, { pn });
	v.searching = false;
	Object.assign(v.mediaInfo, result);
})

defineExpose({ search });
async function search(overrideInput?: string) {
	try {
	const input = (overrideInput ?? v.searchInput).trim();
	v.searchInput = input;
	v.listActive = false;
	v.searching = false;
	v.checkboxs.length = 0;
	v.pageIndex = 1;
	if (!input.length) return;
	v.searching = true;
	const query = v.mediaType === 'auto'
		? await parseId(input)
		: { id: input, type: v.mediaType };
	log.info('Query: ' + JSON.stringify(query));
	const info = await data.getMediaInfo(query.id, query.type);
	const target = info.list.findIndex(v => v.isTarget);
	v.checkboxs.push(target);
	v.mediaInfo = info;
	v.listActive = true;
	} catch(e) { throw e }
	finally {
		v.searching = false;
	}
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
	popup.value?.init(await data.getPlayUrl(info, type, fmt), {
		misc: {
			aiSummary: type === 'video' && user.isLogin ? await extras.getAISummary(info, { check: true }) : false,
			subtitles: type !== 'music' && user.isLogin ? (await extras.getSubtitle(info)).map(v => ({ id: v.lan, name: v.lan_doc })) : [],
		},
		nfo: true,
		danmaku: type !== 'music' ? user.isLogin ? ['live', 'history'] : ['live'] : [],
		thumb: nfo.thumbs.map(v => v.id)
	});
}

async function emit(select: Types.PopupSelect) {
	queue.submit(v.mediaInfo, select, v.checkboxs);
	router.push('/down-page');
	const page = await waitPage(downPage, 'tab');
	page.value.tab = 'waiting';
}
</script>