<template><div class="pb-0">
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
		<button @click="search()" :class="[settings.dynFa, 'fa-search rounded-full']"></button>
    </div>
	<Transition>
	<Empty
		v-if="!v.listActive && !v.searching"
		class="absolute" text="search.suggest"
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
	<div class="flex flex-col flex-1 mt-3 w-full min-h-0" v-if="v.listActive">
		<MediaInfo :info="v.mediaInfo" :open="openUrl" />
		<div class="flex mt-3 gap-3 min-h-0">
			<MediaList
				class="w-full"
				:info="v.mediaInfo"
				:update-stein="updateStein"
				v-model="v.checkboxs"
			/>
			<div class="flex flex-col gap-3 w-32">
				<button v-for="v in buttons" @click="v.action">
					<i :class="[settings.dynFa, v.icon]"></i>
					<span>{{ $t(v.text) }}</span>
				</button>
				<input type="number" min="1" v-model="v.pageIndex" />
			</div>
		</div>
	</div>
	</Transition>
	<Popup ref="popup" />
</div></template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { TYPE } from 'vue-toastification';

import { openUrl } from '@tauri-apps/plugin-opener';
import * as log from '@tauri-apps/plugin-log';
import { MediaInfo, MediaList, Popup } from '@/components/SearchPage';
import Dropdown from '@/components/Dropdown.vue';
import Empty from '@/components/Empty.vue';

import { ApplicationError, AppLog, parseId } from '@/services/utils';
import { useSettingsStore } from '@/store';
import * as Types from '@/types/data.d';
import * as data from '@/services/data';
import i18n from '@/i18n';

const settings = useSettingsStore();
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
	action: () => initPopup(false),
}, {
	icon: 'fa-folder-plus',
	text: 'search.package',
	action: () => initPopup(true),
}, {
	icon: 'fa-check-double',
	text: 'search.selectAll',
	action: () => v.checkboxs = 
		v.checkboxs.length === v.mediaInfo.list.length 
		? [] : [...Array(v.mediaInfo.list.length).keys()]
}];

const popup = ref<InstanceType<typeof Popup>>();

watch(() => v.checkboxs, (a, b) => {
	if (a.length > b.length && a.length > 30)
	AppLog(i18n.global.t('error.selectLimit'), TYPE.WARNING);
});

watch(() => v.pageIndex, async (pn) => {
	v.checkboxs = [0];
	try {
		const result = await data.getMediaInfo(String(v.mediaInfo.id), v.mediaInfo.type, { pn });
		Object.assign(v.mediaInfo, result);
	} catch(err) {
		new ApplicationError(err).handleError();
	}
})

defineExpose({ search });
async function search(overrideInput?: string) {
	const input = (overrideInput ?? v.searchInput).trim();
	v.searchInput = input;
	v.listActive = false;
	v.searching = false;
	v.checkboxs = [];
	if (!input.length || /[^a-zA-Z0-9-._~:/?#@!$&'()*+,;=%]/g.test(input)) return;
	v.searching = true;
	try {
		const query = v.mediaType === 'auto'
			? await parseId(input)
			: { id: input, type: v.mediaType };
		log.info('Query: ' + JSON.stringify(query));
		const info = await data.getMediaInfo(query.id, query.type);
		const target = info.list.findIndex(v => v.isTarget);
		v.checkboxs.push(target);
		v.mediaInfo = info;
		v.listActive = true;
	} catch(err) {
		new ApplicationError(err).handleError();
	}
	v.searching = false;
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

async function initPopup(isPackage: boolean, fmt: Types.StreamFormat = Types.StreamFormat.Dash) {
	try {
		if (!v.checkboxs.length) return;
		const info = v.mediaInfo.list[v.checkboxs[0]];
		const playUrl = await data.getPlayUrl(info, v.mediaInfo.type, fmt);
		popup.value?.init(playUrl, isPackage, playUrl.codec);
	} catch(err) {
		new ApplicationError(err).handleError();
	}
}
</script>