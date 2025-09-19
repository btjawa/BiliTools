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
        <button @click="v.filter = true">
          <i :class="[$fa.weight, 'fa-filter-list']"></i>
          <span>{{ $t('history.moreFilters') }}</span>
        </button>
      </div>
    </div>
    <div class="popup" :class="{ active: v.filter }">
      <Transition name="slide">
        <div v-if="v.filter" class="gap-4 pr-16">
          <button class="close" @click="v.filter = false">
            <i :class="[$fa.weight, 'fa-close']"></i>
          </button>
          <div
            v-for="(val, k) in filters"
            :key="k"
            class="flex gap-2 *:flex-shrink-0"
          >
            <button
              v-for="i in val"
              :key="i"
              class="border-2 border-transparent"
              :class="{ 'border-(--primary-color)!': v.select[k] === i }"
              @click="v.select[k] = i as any"
            >
              {{ $t(`history.filter.${k}.${i}`) }}
            </button>
            <VueDatePicker
              v-if="k === 'time'"
              v-model="v.range"
              range
              class="w-60!"
              :placeholder="$t('history.placeholder')"
              format="yyyy/MM/dd"
              :max-date="new Date()"
              :locale="$i18n.locale"
              :dark="$fa.isDark"
            />
          </div>
          <hr class="m-0" />
          <div class="flex gap-4 items-center">
            <span>{{ $t('history.keyword') }}</span>
            <input v-model="p.keyword" type="text" />
          </div>
          <hr class="m-0" />
          <button class="primary-color w-fit" @click="apply">
            <i :class="[$fa.weight, 'fa-filter']"></i>
            <span>{{ $t('history.filter.apply') }}</span>
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { inject, onActivated, reactive, Ref, ref, watch } from 'vue';
import { getHistoryCursor, getHistorySearch } from '@/services/media/extras';
import { HistoryItem, HistoryTab } from '@/types/media/extras.d';
import { openUrl } from '@tauri-apps/plugin-opener';
import { timestamp, duration, waitPage } from '@/services/utils';
import { AppError } from '@/services/error';

import { Empty, Image, ProgressBar } from '@/components';
import VueDatePicker from '@vuepic/vue-datepicker';
import { VList } from 'virtua/vue';
import SearchPage from './SearchPage.vue';
import router from '@/router';

const searchPage = inject<Ref<InstanceType<typeof SearchPage>>>('page');

const tabs = ref<HistoryTab[]>([]);
const v = reactive({
  listActive: false,
  filter: false,
  range: [] as Date[],
  select: {
    duration: 'all' as (typeof filters.duration)[number],
    time: 'all' as (typeof filters.time)[number],
    device: 'all' as (typeof filters.device)[number],
  },
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

const filters = {
  duration: ['all', 'under10', '10to30', '30to60', 'over60'] as const,
  time: ['all', 'today', 'yesterday', 'week', 'custom'] as const,
  device: ['all', 'pc', 'phone', 'pad', 'tv'] as const,
};

watch(
  () => p.business,
  () => {
    p.pn = 1;
    update();
  },
);

watch(
  () => v.range,
  () => (v.select.time = 'custom'),
);

async function search(item: HistoryItem) {
  router.push('/');
  const page = await waitPage(searchPage, 'search');
  page.value?.search(item.history.bvid);
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
  Object.assign(v.select, {
    duration: 'all',
    time: 'all',
    device: 'all',
  });
  p.pn = 1;
  const cursor = await getHistoryCursor();
  tabs.value = cursor.tab;
  p.business = cursor.tab[0].type;
  update();
}

function apply() {
  const duration = {
    all: [0, 0],
    under10: [0, 599],
    '10to30': [600, 1800],
    '30to60': [1800, 3600],
    over60: [3601, 0],
  }[v.select.duration];
  p.arc_min_duration = duration[0];
  p.arc_max_duration = duration[1];
  const time = {
    all: [0, 0],
    today: [new Date().setHours(0, 0, 0, 0) / 1000, 0],
    yesterday: [
      new Date().setHours(-24, 0, 0, 0) / 1000,
      new Date().setHours(0, 0, 0, 0) / 1000 - 1,
    ],
    week: [
      new Date().setHours(-((new Date().getDay() + 1) * 24), 0, 0, 0) / 1000,
      0,
    ],
    custom: [
      v.range?.[0] ? v.range[0].setHours(0, 0, 0, 0) / 1000 : 0,
      v.range?.[1] ? v.range[1].setHours(24, 0, 0, 0) / 1000 - 1 : 0,
    ],
  }[v.select.time];
  p.add_time_start = time[0];
  p.add_time_end = time[1];
  p.device_type = filters.device.indexOf(v.select.device);
  v.filter = false;
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
