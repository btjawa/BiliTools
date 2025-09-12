<template>
  <Transition name="slide">
    <div
      v-if="active && v.update"
      class="absolute page w-[calc(100vw-56px)] right-0 z-99"
    >
      <h1 class="w-full">
        <i :class="[$fa.weight, 'fa-sparkles']"></i>
        <span>{{ $t('updater.title') }}</span>
      </h1>
      <div class="flex flex-col w-full h-full mt-4 pb-6 gap-1 min-h-0">
        <h2 class="text-lg font-semibold">
          <i :class="[$fa.weight, 'fa-up-from-line']"></i>
          <span
            @click="
              openUrl(
                'https://github.com/btjawa/BiliTools/releases/tag/v' +
                  v.update.version,
              )
            "
            >BiliTools <a>v{{ v.update.version }}</a></span
          >
          <div v-if="v.update.date" class="desc ml-4">
            <i :class="[$fa.weight, 'fa-clock']"></i>
            <span>{{ new Date(v.update.date).toLocaleString() }}</span>
          </div>
        </h2>
        <span class="desc">{{ $t('updater.hint') }}</span>
        <vue-markdown
          class="markdown text my-3 overflow-auto"
          :source="v.update.body ?? ''"
          @click="(e: Event) => e.preventDefault()"
        />
        <div class="flex gap-2">
          <button class="primary-color" @click="update">
            <i :class="[$fa.weight, 'fa-circle-down']"></i>
            <span>{{ $t('updater.install') }}</span>
          </button>
          <button @click="close">{{ $t('updater.cancel') }}</button>
          <Transition name="slide">
            <div v-if="v.downloading" class="flex items-center ml-4 gap-4">
              <ProgressBar :progress="v.progress" />
              <span>{{ v.progress.toFixed(2) }}%</span>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import { markRaw, reactive, ref, watch } from 'vue';
import { useSettingsStore } from '@/store';
import { relaunch } from '@tauri-apps/plugin-process';
import { openUrl } from '@tauri-apps/plugin-opener';
import { info } from '@tauri-apps/plugin-log';
import { AppLog } from '@/services/utils';

import * as updater from '@tauri-apps/plugin-updater';
import VueMarkdown from 'vue-markdown-render';
import ProgressBar from './ProgressBar.vue';
import i18n from '@/i18n';

const active = ref(false);

defineExpose({ check, close, active });

const v = reactive({
  anim: {} as Animation,
  update: null as updater.Update | null,
  downloading: false,
  progress: 0,
});

watch(() => useSettingsStore().auto_check_update, check);

async function check(notice?: boolean) {
  const proxy = useSettingsStore().proxyUrl;
  const update = await updater.check({ ...(proxy && { proxy }) });
  console.log('Update:', update);
  info('Update: ' + JSON.stringify(update, null, 2));
  if (update) {
    v.update = markRaw(update);
    v.anim = document
      .querySelector('.page')!
      .animate([{ opacity: '1' }, { opacity: '0' }], {
        duration: 150,
        fill: 'forwards',
      });
    active.value = true;
  } else if (notice) {
    AppLog(i18n.global.t('updater.latest'), 'success');
  }
}

function close() {
  active.value = false;
  v.anim.reverse();
}

async function update() {
  let content = 0;
  let chunk = 0;
  v.downloading = true;
  await v.update?.downloadAndInstall((e) => {
    switch (e.event) {
      case 'Started': {
        content = e.data.contentLength ?? 0;
        break;
      }
      case 'Progress': {
        chunk += e.data.chunkLength;
        v.progress = (chunk / content || 0) * 100;
      }
    }
  });
  await relaunch();
}
</script>
