<template>
  <div>
    <h1 class="w-full mt-1.5 mb-auto">
      <i :class="[$fa.weight, 'fa-clock']"></i>
      <span>{{ $t('history.title') }}</span>
    </h1>
    <div class="flex w-full h-full mt-[22px] flex-1 gap-3 min-h-0">
      <Transition name="slide">
        <VList
          v-if="v.listActive"
          v-slot="{ item }"
          :data="v.list?.length ? v.list : ['empty']"
        >
          <div>
            <Empty v-if="item === 'empty'" :text="$t('empty')" />
            <div
              v-else
              class="flex gap-4 p-3 rounded-lg my-px bg-(--block-color) text-sm h-[120px]"
            >
              <div class="relative flex rounded-lg min-w-40 overflow-hidden">
                <Image
                  v-model="coverCache"
                  :src="item.covers?.[0] ?? item.cover"
                  :height="96"
                  :width="160"
                  :ratio="5 / 3"
                />
                <div
                  class="absolute w-full h-full z-10 bg-linear-to-b from-transparent to-black/50"
                ></div>
                <ProgressBar
                  :progress="
                    item.progress === -1
                      ? 100
                      : (item.progress / item.duration || 0) * 100
                  "
                  class="absolute! h-1! w-full z-20 bottom-0"
                />
              </div>
              <div class="w-full flex flex-col gap-1 min-w-0">
                <h2 class="text-base truncate">{{ item.title }}</h2>
                <div class="desc">
                  <i :class="[$fa.weight, 'fa-clock']"></i>
                  <span>{{ timestamp(item.view_at) }}</span>
                </div>
                <div v-if="item.duration" class="desc">
                  <i :class="[$fa.weight, 'fa-marker']"></i>
                  <span
                    >{{
                      duration(
                        item.progress === -1 ? item.duration : item.progress,
                      )
                    }}/{{ duration(item.duration) }}</span
                  >
                </div>
              </div>
              <a
                class="text-xs text-nowrap mb-auto"
                @click="
                  openUrl('https://space.bilibili.com/' + item.author_mid)
                "
                >{{ item.author_name }}</a
              >
              <button
                v-if="item.videos"
                class="absolute right-3 bottom-3"
                @click="search(item)"
              >
                <i :class="[$fa.weight, 'fa-download']"></i>
                <span>{{ $t('history.download') }}</span>
              </button>
            </div>
          </div>
        </VList>
      </Transition>
      <div class="flex flex-col w-32 gap-2 ml-auto">
        <div class="tab">
          <button
            v-for="(t, i) in tabs"
            :key="i"
            :class="{ active: p.business === t.type }"
            @click="p.business = t.type"
          >
            <span>{{ t.name }}</span>
            <label class="primary-color"></label>
          </button>
        </div>
        <span>{{ $t('page') }}</span>
        <input v-model="p.pn" type="number" @input="update" />
        <button @click="refresh()">
          <i :class="[$fa.weight, 'fa-rotate-right']"></i>
          <span>{{ $t('history.refresh') }}</span>
        </button>
        <button @click="getFilter">
          <i :class="[$fa.weight, 'fa-filter-list']"></i>
          <span>{{ $t('history.moreFilters') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { getHistoryCursor, getHistorySearch } from '@/services/media/extras';
import { HistoryItem, HistoryTab } from '@/types/media/extras.d';
import { openUrl } from '@tauri-apps/plugin-opener';
import { timestamp, duration } from '@/services/utils';
import { AppError } from '@/services/error';

import { onActivated, reactive, ref, watch } from 'vue';
import { Empty, Image, ProgressBar } from '@/components';
import { VList } from 'virtua/vue';
import { useComponentsStore } from '@/store';

const components = useComponentsStore();

const tabs = ref<HistoryTab[]>([]);
const v = reactive({
  listActive: false,
  filter: false,
  list: [] as HistoryItem[],
});

const p = reactive({
  pn: 1,
  keyword: String(),
  business: 'archive',
  add_time_start: 0,
  add_time_end: 0,
  arc_max_duration: 0,
  arc_min_duration: 0,
  device_type: 0,
});

const coverCache = ref<Record<string, string>>({});

watch(
  () => p.business,
  () => {
    p.pn = 1;
    update();
  },
);

async function search(item: HistoryItem) {
  const page = await components.navigate('searchPage');
  page.search(item.history.bvid);
}

async function update() {
  if (p.pn < 1) p.pn = 1;
  v.listActive = false;
  try {
    v.list = await getHistorySearch(p);
  } catch (err) {
    new AppError(err).handle();
  } finally {
    v.listActive = true;
  }
}

async function refresh() {
  for (const k in coverCache.value) {
    delete coverCache.value[k];
  }
  p.pn = 1;
  const cursor = await getHistoryCursor();
  tabs.value = cursor.tab;
  p.business = cursor.tab[0].type;
  update();
}

async function getFilter() {
  const filter = await components.c.historyFilter?.getFilter();
  if (!filter) return;
  Object.assign(p, filter);
  update();
}

onActivated(refresh);
</script>

<style scoped>
@reference 'tailwindcss';

.tab button {
  @apply w-32;
}
</style>
