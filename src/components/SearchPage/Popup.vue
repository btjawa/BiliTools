<template>
  <Transition name="slide">
    <div
      v-if="v.active"
      class="el flex flex-col rounded-t-xl px-6 py-3 overflow-auto"
    >
      <div class="absolute flex items-center right-4 top-4">
        <i :class="[$fa.weight, 'fa-info-circle']"></i>
        <span class="desc">{{ $t('popup.popupLint') }}</span>
        <button class="rounded-full ml-4" @click="exit">
          <i class="fa-solid fa-close"></i>
        </button>
      </div>
      <template v-for="(i, k) in extras" :key="k">
        <div v-if="i.data.length">
          <h2>
            <i :class="[$fa.weight, i.icon]"></i>
            <span>{{ $t(`popup.${k}.name`) }}</span>
          </h2>
          <div class="flex gap-2 overflow-x-auto mt-2">
            <template v-for="id in i.data" :key="id">
              <button
                :class="{ selected: selected(k, id) }"
                @click="click(k, id)"
              >
                {{
                  id.includes('-')
                    ? $t(`popup.${k}.${id.split('-')[0]}`, {
                        num: id.split('-')[1],
                      })
                    : $t(`popup.${k}.${id}`)
                }}
              </button>
              <Dropdown
                v-if="id === 'subtitles'"
                v-model="v.subtitle"
                :drop="v.prov.misc.subtitles"
              />
              <VueDatePicker
                v-if="id === 'history'"
                v-model="v.date"
                format="yyyy-MM-dd"
                :teleport="true"
                :max-date="new Date()"
                :locale="$i18n.locale"
                :dark="$fa.isDark"
              />
            </template>
          </div>
          <hr />
        </div>
      </template>
      <template v-for="(i, k) in quality" :key="k">
        <div v-if="i.data.size">
          <h2>
            <i :class="[$fa.weight, i.icon]"></i>
            <span>{{ $t('format.' + k) }}</span>
          </h2>
          <i18n-t
            v-if="k === 'fmt'"
            keypath="popup.dashHint.desc"
            tag="span"
            class="desc"
            scope="global"
          >
            <a @click="openUrl('https://btjawa.top/bilitools/stream')">{{
              $t('popup.dashHint.name')
            }}</a>
          </i18n-t>
          <span v-if="k === 'abr'" class="desc">{{ $t('popup.abrHint') }}</span>
          <div class="flex gap-2 overflow-x-auto mt-2">
            <button
              v-for="id in i.data"
              :key="id"
              :class="{ selected: v.select[k] === id }"
              @click="qualityClick(k, id)"
            >
              {{ $t(`quality.${k}.${id}`) }}
            </button>
          </div>
          <hr />
        </div>
      </template>
      <div class="flex gap-2">
        <template v-for="(i, k) in options" :key="k">
          <button
            v-if="i.data"
            :class="{ selected: selected('media', k) }"
            @click="click('media', k)"
          >
            <i :class="[$fa.weight, i.icon]"></i>
            <span>{{ $t('popup.mediaType.' + k) }}</span>
          </button>
        </template>
        <button class="ml-auto primary-color" @click="submit">
          <i :class="[$fa.weight, 'fa-arrow-right']"></i>
          <span>{{ $t('popup.nextStep') }}</span>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import { computed, reactive } from 'vue';
import { openUrl } from '@tauri-apps/plugin-opener';
import VueDatePicker from '@vuepic/vue-datepicker';

import { getDefaultQuality } from '@/services/utils';
import * as Types from '@/types/shared.d';
import Dropdown from '../Dropdown.vue';

const props = defineProps<{
  fmt: (fmt?: Types.StreamFormat) => void;
  close: () => void;
  emit: (select: Types.PopupSelect) => void;
}>();

const v = reactive({
  active: false,
  subtitle: String(),
  date: String(),
  prov: {} as Types.PopupProvider,
  select: {} as Types.PopupSelect,
});

const extras = computed(() => ({
  misc: {
    icon: 'fa-file-export',
    data: [
      ...(v.prov.misc.opusContent ? ['opusContent'] : []),
      ...(v.prov.misc.opusImages ? ['opusImages'] : []),
      ...(v.prov.misc.aiSummary ? ['aiSummary'] : []),
      ...(v.prov.misc.subtitles.length ? ['subtitles'] : []),
    ],
  },
  nfo: {
    icon: 'fa-memo-circle-info',
    data: [
      ...(v.prov.nfo.album ? ['album'] : []),
      ...(v.prov.nfo.single ? ['single'] : []),
    ],
  },
  danmaku: {
    icon: 'fa-subtitles',
    data: v.prov.danmaku,
  },
  thumb: {
    icon: 'fa-images',
    data: v.prov.thumb,
  },
}));

const quality = computed(() => ({
  res: {
    icon: 'fa-video',
    data: new Set(v.prov.video?.map((v) => v.id)),
  },
  enc: {
    icon: 'fa-video-plus',
    data: new Set(
      v.prov.video
        ?.filter((i) => i.id === v.select.res)
        ?.map((v) => v.codecid)
        .filter(Boolean),
    ) as Set<number>,
  },
  abr: {
    icon: 'fa-volume',
    data: new Set(v.prov.audio?.map((v) => v.id)),
  },
  fmt: {
    icon: 'fa-code-simple',
    data: new Set(v.prov.video || v.prov.audio ? Types.QualityMap.fmt : []),
  },
}));

const options = computed(() => ({
  audioVideo: {
    // #81
    icon: 'fa-video',
    data: v.prov.video?.length && v.prov.audio?.length,
  },
  video: {
    icon: 'fa-volume-slash',
    data: v.prov.video?.length,
  },
  audio: {
    icon: 'fa-video-slash',
    data: v.prov.audio?.length,
  },
}));

defineExpose({ init });

async function init(provider: Types.PopupProvider) {
  v.active = true;
  v.prov = provider;
  (['res', 'abr', 'enc'] as const).forEach((i) => {
    v.select[i] = getDefaultQuality([...quality.value[i].data], i);
  });
  v.select.fmt = v.prov.codec ?? Types.StreamFormat.Dash;
  v.select.misc = {
    opusContent: false,
    opusImages: false,
    aiSummary: false,
    subtitles: false,
  };
  v.select.nfo = {
    album: false,
    single: false,
  };
  v.select.danmaku = {
    live: false,
    history: false,
  };
  v.select.thumb = [];
  v.subtitle = v.prov.misc.subtitles[0]?.id ?? '';
  v.date = new Intl.DateTimeFormat('en-CA').format(new Date());
  v.select.media = {
    video: false,
    audio: false,
    audioVideo: false,
  };
}

function submit() {
  props.emit(v.select);
  exit();
}

function qualityClick<K extends keyof typeof quality.value>(
  key: K,
  value: Types.PopupSelect[K],
) {
  v.select[key] = value;
  if (key === 'res') {
    v.select.enc = getDefaultQuality([...quality.value.enc.data], 'enc');
  } else if (key === 'fmt') {
    props.fmt(value as Types.StreamFormat);
    exit();
  }
}

function click(key: keyof typeof extras.value | 'media', id: string) {
  if (key === 'thumb') {
    const t = v.select.thumb;
    const i = t.indexOf(id);
    return i === -1 ? t.push(id) : t.splice(i, 1);
  }
  if (key === 'danmaku' && id === 'history') {
    return (v.select.danmaku[id] = v.select.danmaku[id] ? false : v.date);
  }
  if (key === 'misc' && id === 'subtitles') {
    return (v.select.misc[id] = v.select.misc[id] ? false : v.subtitle);
  }
  const k = v.select[key] as Record<string, boolean>;
  k[id] = !k[id];
}

function selected(key: keyof typeof extras.value | 'media', id: string) {
  if (key === 'thumb') {
    return v.select.thumb?.includes(id);
  }
  const k = v.select[key] as Record<string, boolean>;
  return k?.[id];
}

function exit() {
  props.close();
  v.active = false;
}
</script>

<style scoped>
@reference 'tailwindcss';

.el {
  @apply absolute inset-0 mx-6 bg-(--block-color);
}
hr {
  @apply my-2.5;
}
button {
  @apply flex-shrink-0;
  @apply border-2 border-solid border-transparent;
  &.selected {
    @apply border-(--primary-color);
  }
}
</style>
