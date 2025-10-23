<template>
  <div class="w-full h-full flex flex-col justify-center items-center">
    <div
      class="flex w-[628px] rounded-full mb-auto p-2 gap-2 bg-(--block-color) border border-(--split-color)"
    >
      <input
        v-model="v.searchInput"
        class="w-full rounded-2xl"
        type="text"
        spellcheck="false"
        :placeholder="$t('search.input', [$t('bilibili')])"
        @keydown.enter="search()"
      />
      <Dropdown
        v-model="v.mediaType"
        :drop="[
          { id: 'auto', name: $t('search.autoDetect') },
          ...Object.values(Types.MediaType).map((id) => ({
            id,
            name: $t('mediaType.' + id),
          })),
        ]"
      />
      <button
        :class="[$fa.weight, 'fa-search rounded-full']"
        @click="search()"
      ></button>
    </div>
    <Transition>
      <Empty
        v-if="!v.listActive && !v.searching"
        class="absolute"
        :text="$t('search.suggest')"
      />
    </Transition>
    <Transition>
      <img
        v-if="v.searching"
        src="@/assets/img/searching.png"
        class="absolute"
      />
    </Transition>
    <Transition>
      <Empty
        v-if="!v.searching && v.listActive && !v.mediaInfo.list?.length"
        class="absolute"
        :text="$t('empty')"
      />
    </Transition>
    <Transition>
      <div v-if="v.listActive" class="flex flex-col flex-1 mt-3 w-full min-h-0">
        <MediaInfo :info="v.mediaInfo" />
        <div class="flex mt-3 gap-3 flex-1 min-h-0">
          <Transition name="slide">
            <MediaList
              v-if="!v.searching && v.mediaInfo.list.length"
              ref="mediaList"
              v-model="v.checkboxs"
              :list="v.mediaInfo.list"
              :edge="v.mediaInfo.edge"
              :update-edge="updateEdge"
            />
          </Transition>
          <div class="flex flex-col gap-3 ml-auto min-w-32 max-w-48 pb-6 h-6">
            <button
              v-for="(i, k) in buttons"
              :key="k"
              class="shrink-0"
              @click="i.action"
            >
              <i :class="[$fa.weight, i.icon]"></i>
              <span>{{ $t(i.text) }}</span>
            </button>
            <template v-if="v.mediaInfo.pn">
              <span>{{ $t('page') }}</span>
              <input v-model="v.pageIndex" type="number" @input="handlePage" />
            </template>
            <div class="tab overflow-auto">
              <button
                v-for="(t, k) in v.mediaInfo.sections?.tabs"
                :key="k"
                class="w-full!"
                :class="{ active: v.tab === t.id }"
                @click="updateTab(t.id)"
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
</template>

<script setup lang="ts">
import { MediaInfo, MediaList } from '@/components/SearchPage';
import { Dropdown, Empty } from '@/components';

import { nextTick, onActivated, reactive, ref, watch } from 'vue';
import * as log from '@tauri-apps/plugin-log';
import pLimit from 'p-limit';

import { useSettingsStore, useComponentsStore } from '@/store';
import { AppLog, parseId, strip } from '@/services/utils';
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
  offsetMap: new Map<number, string>(),
});

const buttons = [
  {
    icon: 'fa-cloud-arrow-down',
    text: 'search.general',
    action: () => initPopup(),
  },
  {
    icon: 'fa-file-export',
    text: 'search.export',
    action: () => exportData(),
  },
  {
    icon: 'fa-square-dashed-circle-plus',
    text: 'search.selectAll',
    action: () =>
      (v.checkboxs =
        v.checkboxs.length === v.mediaInfo.list.length
          ? []
          : [...Array(v.mediaInfo.list.length).keys()]),
  },
];

const mediaList = ref<InstanceType<typeof MediaList>>();

const settings = useSettingsStore();
const components = useComponentsStore();

function updateIndex() {
  const raw = v.mediaInfo.list.findIndex((v) => v.isTarget);
  const target = raw >= 0 ? raw : (v.mediaInfo.list[0]?.index ?? 0);
  v.checkboxs = [target];
  requestAnimationFrame(() => {
    mediaList.value?.vlist?.scrollToIndex(target);
  });
}

async function handlePage() {
  if (v.pageIndex < 1) {
    v.pageIndex = 1;
  }
  const pn = v.pageIndex;
  const offset = v.offsetMap.get(pn) ?? v.mediaInfo.offset;
  const target = v.mediaInfo.sections ? v.tab : undefined;
  v.searching = true;
  const result = await data.getMediaInfo(v.mediaInfo.id, v.mediaInfo.type, {
    pn,
    target,
    offset,
  });
  if (result.offset) v.offsetMap.set(pn + 1, result.offset);
  Object.assign(v.mediaInfo, result);
  v.searching = false;
  updateIndex();
}

async function updateTab(t: number) {
  v.tab = t;
  v.pageIndex = 1;
  v.searching = true;
  const info = await data.getMediaInfo(v.mediaInfo.id, v.mediaInfo.type, {
    target: t,
  });
  v.mediaInfo = info;
  await nextTick(); // trigger v-if
  v.searching = false;
  updateIndex();
}

watch(
  () => v.checkboxs.length,
  (len) => {
    if (len > 30) AppLog(i18n.global.t('error.selectLimit'), 'warning');
  },
);

onActivated(() => {
  // Force VList to refresh after keep-alive activation. DO NOT DELETE IT.
  mediaList.value?.vlist?.scrollBy(0);
});

defineExpose({ search });
async function search(overrideInput?: string) {
  try {
    const input = (overrideInput ?? v.searchInput).trim();
    v.offsetMap.clear();
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
    const info = await data.getMediaInfo(query.id, query.type, {
      target: raw.target,
    });
    v.mediaInfo = info;
    v.listActive = true;
    if (info.sections) v.tab = info.sections.target;
    if (info.offset) v.offsetMap.set(1, '');
    updateIndex();
  } finally {
    await nextTick();
    v.searching = false;
  }
}

async function updateEdge(edge_id: number) {
  const { edge, list } = v.mediaInfo;
  const id = list[0].aid;
  if (!edge || !id) return;
  const graph_version = edge.graph_version;
  const edgeInfo = await extras.getEdgeInfo(id, graph_version, edge_id);
  v.mediaInfo.edge = {
    graph_version,
    edge_id: edgeInfo.edge_id,
    list: edgeInfo.story_list,
    choices: edgeInfo.edges.questions?.[0].choices,
    vars: edgeInfo.hidden_vars,
  };
  const item = edgeInfo.story_list.find((v) => v.is_current);
  if (!item) return;
  Object.assign(v.mediaInfo.list[0], {
    cid: item.cid,
    title: item.title,
    cover: item.cover,
  });
}

async function initPopup() {
  if (!v.checkboxs.length) return;
  v.checkboxs = v.checkboxs.filter(
    (i) => i >= 0 && i < v.mediaInfo.list.length,
  );
  v.checkboxs.sort((a, b) => a - b);
  const limit = pLimit(settings.max_conc);
  const tasks = v.checkboxs.map((i) =>
    limit(async () => {
      const info = v.mediaInfo.list[i];
      if (!info.cid && info.aid) {
        info.cid = await data.getCid(info.aid);
      }
    }),
  );
  await Promise.all(tasks);
  const item = v.mediaInfo.list[v.checkboxs[0]];
  const select = await components.c.selectPopup?.getSelect(item);
  if (!select) return;
  queue.submit(v.mediaInfo, select, v.checkboxs);
  const page = await components.navigate('downPage');
  page.tab = 'backlog';
}

async function exportData() {
  const title =
    v.mediaInfo.nfo?.showtitle ??
    i18n.global.t(`mediaType.` + v.mediaInfo.type);
  const path = await save({
    defaultPath: `${settings.down_dir}/${strip(title)}_${Date.now()}.json`,
  });
  if (!path) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await commands.exportData(path, v.mediaInfo as any);
  if (result.status === 'error') throw result;
  AppLog(i18n.global.t('search.exported', [path]), 'success');
}
</script>
