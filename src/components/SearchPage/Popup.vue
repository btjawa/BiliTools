<template><div class="popup absolute flex items-center w-full h-full" :class="{ active }">
<div class="container flex flex-col relative h-fit p-4 rounded-xl">
  <button class="absolute right-4 top-4 rounded-full w-8 h-8 p-0 z-30" @click="close">
    <i class="fa-solid fa-close"></i>
  </button>
  <div class="overflow-auto">
  <template v-for="(item, key) in provider.options" class="relative">
  <div v-if="item.data.length">
    <h3>{{ $t(item.title ?? `home.class.${key}`) }}</h3>
    <i18n-t keypath="home.dash.desc" tag="span" class="desc" scope="global" v-if="key === 'fmt'">
      <template v-slot:title>
        <a @click="openUrl('https://btjawa.top/bilitools#关于-DASH-FLV-MP4')">{{ $t('home.dash.title') }}</a>
      </template>
    </i18n-t>
    <div class="flex gap-1 mt-2 items-center overflow-x-auto overflow-y-hidden">
      <button v-for="btn in item.data"
        :class="{
          'selected': select[key as keyof CurrentSelect] === btn,
          'line-through desc': (key === 'fmt' && btn /* non-dash */) || btn.id === 'albumNfo' /* wip */,
          'whitespace-nowrap': 1
        }"
        @click="handleClick(key, btn?.id ?? btn)">
          <i :class="[settings.dynFa, btn?.icon ?? item.icon]"></i>
          <span>{{ $t(item.getText?.(key, btn?.id ?? btn) ?? `home.label.${btn?.id}`) }}</span>
      </button>
      <VueDatePicker v-if="key === 'danmaku' && item.data.find(i => i.id === 'historyDanmaku')"
        v-model="date" :dark="settings.isDark"
        model-type="format" format="yyyy-MM-dd"
        id="historyDanmakuDate" />
      <Dropdown v-if="key === 'others' && item.data.find(i => i.id === 'subtitles')"
        :drop="provider.others.subtitles.map(v => ({
          id: v.lan, name: v.lan_doc + `(${v.lan})`
        }))" :emit="(v) => subtitle = v"
        :id="subtitle" :icon="'fa-earth-americas'"
      ></Dropdown>
    </div>
    <hr />
  </div></template></div>
  <div class="flex gap-1 float-left">
    <button v-for="(icon, key) in provider.buttons" class="primary-color" @click="confirm(key)">
      <i :class="[settings.dynFa, icon]"></i>
      <span>{{ $t(`home.button.${key}`) }}</span>
    </button>
  </div>
</div></div></template>

<script setup lang="ts">
import { openUrl } from '@tauri-apps/plugin-opener';
import { ref, reactive } from 'vue';
import { useSettingsStore } from '@/store';
import { QualityMap, PlayUrlProvider, OthersProvider, StreamCodecType, StreamCodecMap, CurrentSelect } from '@/types/data.d';
import Dropdown from '../Dropdown.vue';

const props = defineProps<{
  process: (select: CurrentSelect, ref: { key: string, data: any }, options?: { multi?: boolean }) => void,
  codecChange: (codec: StreamCodecType, others?: OthersProvider, multi?: boolean) => void
}>();

const settings = useSettingsStore();

const active = ref(false);
const select = ref<CurrentSelect>({ dms: -1, cdc: -1, ads: -1, fmt: -1 });
const subtitle = ref(String());
const date = ref(new Intl.DateTimeFormat('en-CA').format(new Date()));

const provider = reactive({
  playUrl: {} as PlayUrlProvider,
  others: {} as OthersProvider,
  options: {} as Record<string, { data: any[], icon?: string; title?: string; getText?: Function }>,
  buttons: {} as Record<string, string>
})

const isMulti = ref(false);

defineExpose({ init });
function init(playUrl: PlayUrlProvider, others: OthersProvider, multi?: boolean) {
  select.value = { dms: -1, cdc: -1, ads: -1, fmt: -1 };
  subtitle.value = String();
  date.value = new Intl.DateTimeFormat('en-CA').format(new Date());
  for (const v in provider) (provider as any)[v] = {};
  isMulti.value = multi ?? false;
  provider.playUrl = playUrl;
  provider.others = others;
  select.value.dms = getDefault(playUrl.videoQualities ?? [], 'df_dms');
  select.value.ads = getDefault(playUrl.audioQualities ?? [], 'df_ads');
  select.value.cdc = getDefault(
    playUrl.video?.filter(v => v.id === select.value.dms).map(v => v.codecid ?? -1) ?? [],
    'df_cdc'
  );
  select.value.fmt = playUrl.codecid;
  subtitle.value = others.subtitles?.[0]?.lan;
  provider.options = {
    nfo: {
      data: [
        { id: 'albumNfo', icon: 'fa-memo-circle-info' },
        { id: 'singleNfo', icon: 'fa-file-circle-info' },
      ],
    },
    danmaku: {
      data: others?.danmaku ? [
        { id: 'liveDanmaku', icon: 'fa-clock' },
        { id: 'historyDanmaku', icon: 'fa-clock-rotate-left' }
      ] : [],
    },
    covers: {
      data: others.covers.map(id => ({ id, icon: 'fa-image' })),
      getText: (_: any, id: any) => id,
    },
    others: {
      data: [
        ...(others.aiSummary ? [{ id: 'aiSummary', icon: 'fa-microchip-ai' }] : []),
        ...(others.subtitles?.length ? [{ id: 'subtitles', icon: 'fa-closed-captioning' }] : [])
      ],
    },
    dms: {
      data: playUrl.videoQualities ?? [],
      icon: 'fa-video',
      title: 'common.default.placeholders.dms',
      getText: (key: any, id: any) => `common.default.${key}.${id}`,
    },
    cdc: {
      data: playUrl.video?.filter(v => v.id === select.value.dms).map(v => v.codecid).filter(Boolean) ?? [],
      icon: 'fa-code',
      title: 'common.default.placeholders.cdc',
      getText: (key: any, id: any) => `common.default.${key}.${id}`,
    },
    ads: {
      data: playUrl.audioQualities ?? [],
      icon: 'fa-volume-high',
      title: 'common.default.placeholders.ads',
      getText: (key: any, id: any) => `common.default.${key}.${id}`,
    },
    fmt: {
      data: QualityMap.fmt.map(v => v.id),
      icon: 'fa-code-simple',
      title: 'common.default.placeholders.fmt',
      getText: (key: any, id: any) => `common.default.${key}.${id}`,
    },
  }
  provider.buttons = {
    ...(playUrl.video && { video: 'fa-video' }),
    ...(playUrl.audio && { audio: 'fa-volume-high' }),
    ...(playUrl.video && playUrl.audio && { audioVideo: 'fa-video-plus' }),
  }
  active.value = true;
}

function handleClick(key: string, id: any) {
  if (['nfo', 'danmaku', 'covers', 'others'].includes(key)) {
    const ref = { key, data: null as any };
    if (key !== 'covers') ref.key = id;
    if (id === 'subtitles') ref.data = subtitle.value;
    if (id === 'historyDanmaku') ref.data = date.value;
    if (key === 'covers') ref.data = id;
    props.process(select.value, ref, { multi: isMulti.value });
    return close();
  }
  select.value[key as keyof CurrentSelect] = id;
  if (key === 'dms') {
    const cdc = provider.playUrl.video?.filter(v => v.id === id).map(v => v.codecid ?? -1).filter(Boolean) ?? [];
    provider.options['cdc'].data = cdc;
    select.value.cdc = getDefault(cdc, 'df_cdc');
  }
  if (key === 'fmt') {
    props.codecChange(StreamCodecMap[id], provider.others, isMulti.value);
    close();
  }
}

function confirm(key: string) {
  const ref = { key, data: 'queue' };
  props.process(select.value, ref, { multi: isMulti.value });
  close();
}

function getDefault(ids: number[], name: 'df_dms' | 'df_cdc' | 'df_ads') {
  return ids.includes(settings[name]) ? settings[name] : ids.sort((a, b) => b - a)[0];
}

function close() {
  active.value = false;
}
</script>

<style lang="scss" scoped>
.popup {
  @apply bg-opacity-50 bg-black opacity-0 px-[135px] py-[50px];
  @apply transition-opacity pointer-events-none;
  &.active {
    @apply opacity-100 pointer-events-auto;
    & > div {
      @apply translate-y-0;
    }
  }
}

.container {
  @apply bg-[color:var(--solid-block-color)] max-h-full transform translate-y-8;
  transition: transform .5s cubic-bezier(0,1,.6,1);
  button {
    border: 2px solid transparent;
    &.selected {
      border: 2px solid var(--primary-color)
    }
  }
  hr {
    @apply my-[15px];
  }
}

#historyDanmakuDate {
  @apply max-w-40;
  .dp__input {
    @apply text-sm;
  }
  .dp__menu_inner + div {
    display: none;
  }
}
</style>