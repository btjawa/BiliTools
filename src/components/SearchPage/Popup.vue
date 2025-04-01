<template>
  <div class="popup_container absolute flex items-center justify-center w-full h-full" :class="{ active }">
    <div class="min-w-[calc(100%-269px)] relative h-fit p-4 rounded-xl bg-[color:var(--solid-block-color)]">
      <button class="absolute right-4 top-4 rounded-full w-8 h-8 p-0 z-30" @click="close">
        <i class="fa-solid fa-close"></i>
      </button>
      <div v-for="(item, key, index) in optionsProvider" class="relative">
        <template v-if="item.data.length">
          <h3>{{ $t(item.title) }}</h3>
          <div class="flex gap-1 mt-2 items-center">
            <button v-for="btn in item.data"
              :class="{ 'selected': select[key as keyof CurrentSelect] === btn }"
              @click="handleClick(key, btn?.id ?? btn)">
                <i :class="[settings.dynFa, btn?.icon ?? item.icon]"></i>
                <span>{{ key === 'covers' ? item.getText(key, btn?.id ?? btn): $t(item.getText(key, btn?.id ?? btn)) }}</span>
            </button>
            <VueDatePicker v-if="key === 'danmaku' && item.data.find(i => i.id === 'historyDanmaku')"
              v-model="date" :dark="settings.isDark"
              model-type="format" format="yyyy-MM-dd"
              id="historyDanmakuDate" />
            <div v-if="key === 'others' && item.data.find(i => i.id === 'subtitles')">
              <select @change="(e) => subtitle = Number((e.target as HTMLSelectElement).value)">
                <option v-for="opt in othersProvider.subtitles" :key="opt.id" :value="opt.id">
                  {{ opt.lan_doc + `(${opt.lan})` }}
                </option>
              </select>
              <i class="fa-solid fa-triangle -translate-x-6 rotate-180 text-[10px]"></i>
            </div>
          </div>
          <button class="absolute right-4 primary-color"
            :class="[key === 'fmt' ? 'bottom-0' : 'bottom-4']"
            v-if="isOthers ? (key === 'dms' || key === 'ads') : key === 'fmt'"
            @click="confirm(key)">
              <i :class="[settings.dynFa, 'fa-right']"></i>
              <span>{{ $t('common.confirm') }}</span>
          </button>
          <hr v-if="index < Object.keys(optionsProvider).length - 1" />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSettingsStore, useInfoStore } from '@/store';
import { MediaType, PlayUrlProvider, OthersProvider, StreamCodecType, StreamCodecMap } from '@/types/data.d';
import { CurrentSelect } from '@/services/backend';

const props = defineProps<{
  handleClose: (select: CurrentSelect, options?: { others?: { key: string, data: any }, multi?: boolean }) => void,
  codecChange: (codec: StreamCodecType, others?: boolean, multi?: boolean) => void
}>();

const settings = useSettingsStore();

const active = ref(false);
const playUrlProvider = ref<PlayUrlProvider>({} as any);
const othersProvider = ref<OthersProvider>({} as any);
const mediaType = ref<MediaType>(MediaType.Video);
const select = ref<CurrentSelect>({ dms: -1, cdc: -1, ads: -1, fmt: -1 });
const subtitle = ref(-1);
const date = ref(new Intl.DateTimeFormat('en-CA').format(new Date()));
const optionsProvider = ref<Record<string, { data: any[], icon: string; title: string; getText: Function }>>({});

const isMulti = ref(false);
const isOthers = computed(() => Object.keys(othersProvider.value).length > 0);

defineExpose({ init });
function init(playUrl: PlayUrlProvider, type: MediaType, options?: { others?: OthersProvider, multi?: boolean }) {
  cleanState();
  isMulti.value = options?.multi ?? false;
  playUrlProvider.value = playUrl;
  mediaType.value = type;
  select.value.dms = getDefault(playUrl.videoQualities ?? [], 'df_dms');
  select.value.ads = getDefault(playUrl.audioQualities ?? [], 'df_ads');
  select.value.cdc = getDefault(
    playUrl.video?.filter(v => v.id === select.value.dms).map(v => v.codecid!) ?? [],
    'df_cdc'
  );
  select.value.fmt = playUrl.codecid;
  const others = options?.others ?? {} as OthersProvider;
  subtitle.value = others.subtitles?.[0]?.id;
  othersProvider.value = others;
  optionsProvider.value = {
    danmaku: {
      data: others?.danmaku ? [
        { id: 'liveDanmaku', icon: 'fa-clock' },
        { id: 'historyDanmaku', icon: 'fa-clock-rotate-left' }
      ] : [],
      icon: '',
      title: 'home.label.danmaku',
      getText: (_: any, id: any) => `home.label.${id}`
    },
    covers: {
      data: others.covers ? [{ id: 'cover', icon: 'fa-image' }, ...others.covers.map(c => ({ id: c.id, icon: 'fa-image' }))] : [],
      icon: '',
      title: 'home.label.covers',
      getText: (_: any, id: any) => id
    },
    others: {
      data: (others?.aiSummary || others?.subtitles?.length) ? [
        ...(others.aiSummary ? [{ id: 'aiSummary', icon: 'fa-microchip-ai' }] : []),
        ...(others.subtitles?.length ? [{ id: 'subtitles', icon: 'fa-closed-captioning' }] : [])
      ] : [],
      icon: '',
      title: 'home.downloadOptions.others',
      getText: (_: any, id: any) => `home.label.${id}`
    },
    dms: {
      data: playUrl.videoQualities ?? [],
      icon: 'fa-file-video',
      title: 'common.default.dms.name',
      getText: (key: any, id: any) => `common.default.${key}.data.${id}`,
    },
    cdc: {
      data: playUrl.video?.filter(v => v.id === select.value.dms).map(v => v.codecid).filter(Boolean) ?? [],
      icon: 'fa-file-code',
      title: 'common.default.cdc.name',
      getText: (key: any, id: any) => `common.default.${key}.data.${id}`,
    },
    ads: {
      data: playUrl.audioQualities ?? [],
      icon: 'fa-file-audio',
      title: 'common.default.ads.name',
      getText: (key: any, id: any) => `common.default.${key}.data.${id}`,
    },
    fmt: {
      data: useInfoStore().mediaMap.fmt.map(v => v.id),
      icon: 'fa-file-code',
      title: 'common.default.fmt.name',
      getText: (key: any, id: any) => `common.default.${key}.data.${id}`,
    },
  }
  active.value = true;
}

function handleClick(key: string, id: any) {
  if (['danmaku', 'covers', 'others'].includes(key)) {
    const others = { key, data: '' as any };
    if (id === 'subtitles') {
      others.key = id;
      others.data = subtitle.value;
    } else if (key === 'covers') others.data = id;
    else {
      others.key = id;
      others.data = date.value;
    }
    props.handleClose(select.value, { others, multi: isMulti.value });
    return close();
  }
  if (key === 'fmt') {
    if (select.value.fmt === id) return;
    props.codecChange(StreamCodecMap[id], isOthers.value, isMulti.value);
    return close();
  }
  select.value[key as keyof CurrentSelect] = id;
  if (key === 'dms') {
    const cdc = playUrlProvider.value.video?.filter(v => v.id === id).map(v => v.codecid!).filter(Boolean) ?? [];
    optionsProvider.value['cdc'].data = cdc;
    select.value.cdc = getDefault(cdc, 'df_cdc');
  }
}

function confirm(key: string) {
  const others = isOthers.value ? { key, data: select.value[key as keyof CurrentSelect] } : undefined;
  props.handleClose(select.value, { others, multi: isMulti.value });
  close();
}

function getDefault(ids: number[], name: 'df_dms' | 'df_cdc' | 'df_ads') {
  return ids.includes(settings[name]) ? settings[name] : ids.sort((a, b) => b - a)[0];
}

function close() {
  active.value = false;
  setTimeout(() => cleanState(), 100);
}

function cleanState() {
  select.value = { dms: -1, cdc: -1, ads: -1, fmt: -1 };
  subtitle.value = [] as any;
  date.value = new Intl.DateTimeFormat('en-CA').format(new Date());
  playUrlProvider.value = {} as any;
  othersProvider.value = {} as any;
  optionsProvider.value = {} as any;
}
</script>

<style lang="scss">
.popup_container {
  @apply bg-opacity-50 bg-black transition-opacity duration-200 opacity-0 pointer-events-none;
  & > div {
    @apply transform translate-y-8;
    transition: transform .5s cubic-bezier(0,1,.6,1);
    button {
      border: 2px solid transparent;
      &.selected {
        border: 2px solid var(--primary-color)
      }
    }
  }
  &.active {
    @apply opacity-100;
    pointer-events: all;
    & > div {
      @apply transform translate-y-0;
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