<template>
  <Transition name="slide">
    <div
      v-if="v.active"
      class="el flex flex-col rounded-t-xl px-6 py-3 overflow-auto"
    >
      <div class="absolute flex items-center right-4 top-4">
        <i :class="[$fa.weight, 'fa-info-circle']"></i>
        <span class="desc">{{ $t('popup.popupLint') }}</span>
        <button class="rounded-full ml-4" @click="cancel">
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
      <div class="flex gap-2 border-2 border-(--primary-color) rounded-xl p-2">
        <template v-for="(i, k) in options" :key="k">
          <button
            v-if="i.data"
            :class="{
              selected: selected('media', k),
            }"
            @click="click('media', k)"
          >
            <i :class="[$fa.weight, i.icon]"></i>
            <span>{{ $t('popup.mediaType.' + k) }}</span>
          </button>
        </template>
        <button class="ml-auto primary-color" @click="confirm">
          <i :class="[$fa.weight, 'fa-arrow-right']"></i>
          <span>{{ $t('popup.nextStep') }}</span>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import * as Types from '@/types/shared.d';
import { computed, reactive } from 'vue';
import { useUserStore } from '@/store';
import { getNfoByItem, getPlayUrl } from '@/services/media/data';
import { getAISummary, getSubtitle } from '@/services/media/extras';
import { getDefaultQuality } from '@/services/utils';
import { openUrl } from '@tauri-apps/plugin-opener';

import Dropdown from '../Dropdown.vue';

const v = reactive({
  active: false,
  promise: {} as {
    resolve: (value: null | Types.PopupSelect) => void;
  },

  subtitle: String(),
  date: String(),
  item: {} as Types.MediaItem,
  prov: {} as Types.PopupProvider,
  select: {} as Types.PopupSelect,
});

function selected(key: keyof typeof extras.value | 'media', id: string) {
  if (key === 'thumb') {
    return v.select.thumb?.includes(id);
  }
  const k = v.select[key] as Record<string, boolean>;
  return k?.[id];
}

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
  // #81
  audioVideo: {
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

defineExpose({ getSelect });
async function getSelect(item: Types.MediaItem, select?: Types.PopupSelect) {
  const promise = new Promise<null | Types.PopupSelect>((res) => {
    v.promise.resolve = res;
  });

  const user = useUserStore();
  const type = item.type;
  const nfo = await getNfoByItem(item);

  v.item = item;
  const p: Types.PopupProvider = {
    misc: {
      opusContent: false,
      opusImages: false,
      aiSummary: false,
      subtitles: [],
    },
    nfo: {
      album: false,
      single: false,
    },
    danmaku: [],
    thumb: nfo?.thumbs.map((v) => v.id) ?? [],
  };

  if (user.isLogin && type === 'video') {
    p.misc.aiSummary = await getAISummary(item, { check: true });
  }

  if (type === 'opus') {
    p.misc.opusContent = true;
    p.misc.opusImages = true;
  } else {
    Object.assign(p, await getPlayUrl(item, type, Types.StreamFormat.Dash));
    p.nfo = {
      album: true,
      single: true,
    };
  }

  if (type !== 'music' && type !== 'opus') {
    if (user.isLogin) {
      p.misc.subtitles = (await getSubtitle(item)).map((v) => ({
        id: v.lan,
        name: v.lan_doc,
      }));
      p.danmaku = ['live', 'history'];
    } else {
      p.danmaku = ['live'];
    }
  }

  v.prov = p;
  if (select) {
    Object.assign(v.select, select);
  } else {
    (['res', 'abr', 'enc'] as const).forEach((i) => {
      v.select[i] = getDefaultQuality([...quality.value[i].data], i);
    });
    Object.assign(v.select, {
      fmt: p.codec ?? Types.StreamFormat.Dash,
      misc: {
        opusContent: false,
        opusImages: false,
        aiSummary: false,
        subtitles: false,
      },
      nfo: {
        album: false,
        single: false,
      },
      danmaku: {
        live: false,
        history: false,
      },
      thumb: [],
      media: {
        video: false,
        audio: false,
        audioVideo: false,
      },
    });
  }

  v.subtitle = p.misc.subtitles[0]?.id ?? '';
  v.date = new Intl.DateTimeFormat('en-CA').format(new Date());

  document.querySelector('.page')?.classList.add('hide');

  v.active = true;
  return promise;
}

function exit() {
  document.querySelector('.page')?.classList.remove('hide');
  v.active = false;
}

function cancel() {
  exit();
  v.promise.resolve(null);
}

function confirm() {
  exit();
  v.promise.resolve(v.select);
}

async function qualityClick<K extends keyof typeof quality.value>(
  key: K,
  value: Types.PopupSelect[K],
) {
  v.select[key] = value;
  if (key === 'res') {
    v.select.enc = getDefaultQuality([...quality.value.enc.data], 'enc');
  } else if (key === 'fmt') {
    v.active = false;
    Object.assign(
      v.prov,
      await getPlayUrl(v.item, v.item.type, value as Types.StreamFormat),
    );
    v.active = true;
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
</script>

<style scoped>
@reference 'tailwindcss';

.el {
  @apply absolute inset-0 mx-6 bg-(--block-color) mt-[30px];
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
