<template><div class="popup absolute flex items-center w-full h-full" :class="{ active }">
<div class="container relative h-fit p-4 rounded-xl">
  <button class="absolute right-4 top-4 rounded-full w-8 h-8 p-0 z-30" @click="close">
    <i class="fa-solid fa-close"></i>
  </button>
  <h3>{{ $t('home.packagePopup.title') }}</h3>
  <span class="desc">{{ $t('home.packagePopup.desc') }}</span>
  <div class="flex gap-1 mt-2 items-center">
    <button v-for="(item, key) in provider.options"
      @click="handleClick(key)" :class="{ 'selected': select[key] }"
    >
      <i :class="[settings.dynFa, item?.icon]"></i>
      <span>{{ $t(`home.label.${key}`) }}</span>
    </button>
  </div>
  <hr />
  <template v-if="Object.keys(provider.options).includes('subtitles')">
  <h3>{{ $t('home.label.subtitles') }}</h3>
  <div class="flex gap-1 mt-2 items-center">
    <Dropdown
      :drop="provider.others.subtitles.map(v => ({
        id: v.lan, name: v.lan_doc + `(${v.lan})`
      }))" :emit="(v) => subtitle = v"
      :id="subtitle" :icon="'fa-earth-americas'"
    ></Dropdown>
  </div>
  <hr />
  </template>
  <button class="primary-color float-left" @click="props.process(select, { multi: isMulti }); close()">
    <i :class="[settings.dynFa, 'fa-right']"></i>
    <span>{{ $t('downloads.nextStep') }}</span>
  </button>
</div>
</div></template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { PlayUrlProvider, OthersProvider, PackageSelect } from '@/types/data.d';
import { useSettingsStore } from '@/store';
import Dropdown from '../Dropdown.vue';

const props = defineProps<{
  process: (select: PackageSelect, options?: { multi?: boolean }) => void,
}>();

const settings = useSettingsStore();

const active = ref(false);
const subtitle = ref(String());
const select = reactive<PackageSelect>({});

const provider = reactive({
  playUrl: {} as PlayUrlProvider,
  others: {} as OthersProvider,
  options: {} as { [K in keyof PackageSelect]?: { icon: string, type?: any } }
})

const isMulti = ref(false);

defineExpose({ init });
function init(playUrl: PlayUrlProvider, others: OthersProvider, multi?: boolean) {
  cleanState();
  isMulti.value = multi ?? false;
  provider.playUrl = playUrl;
  provider.others = others;
  active.value = true;
  subtitle.value = others.subtitles?.[0]?.lan;
  provider.options = {
    singleNfo: { icon: 'fa-memo-circle-info' },
    ...(playUrl.video && { video: { icon: 'fa-video', type: 'queue' } }),
    ...(playUrl.audio && { audio: { icon: 'fa-volume-high', type: 'queue' } }),
    ...(playUrl.video && playUrl.audio && { audioVideo: { icon: 'fa-video-plus', type: 'queue' } }),
    ...(others.aiSummary && { aiSummary: { icon: 'fa-microchip-ai' } }),
    ...(others.danmaku && { liveDanmaku: { icon: 'fa-clock' } }),
    ...(others.subtitles.length && { subtitles: { icon: 'fa-closed-captioning' } }),
    covers: { icon: 'fa-image' },
  }
}

function close() {
  active.value = false;
  setTimeout(() => cleanState(), 100);
}

function handleClick(key: keyof typeof select) {
  if (key === 'subtitles') {
    select[key] = select[key] ? undefined : subtitle.value;
  } else {
    select[key] ? delete select[key] : select[key] = provider.options[key]?.type ?? true;
  }
}

function cleanState() {
  subtitle.value = [] as any;
  for (const v in provider) (provider as any)[v] = {};
  for (const v in select) delete (select as any)[v];
}
</script>

<style lang="scss">
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