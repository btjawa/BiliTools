<template>
  <section>
    <h2>
      <i :class="[$fa.weight, 'fa-folder']"></i>
      <span>{{ $t('settings.paths.name') }}</span>
    </h2>
    <span class="desc">{{ $t('settings.paths.desc') }}</span>
    <div v-for="v in pathList" :key="v" class="io">
      <h3>{{ $t('settings.paths.' + v) }}</h3>
      <button @click="openPath(settings[v])">{{ settings[v] }}</button>
      <button @click="newPath(v)">
        <i class="fa-light fa-folder-open"></i>
      </button>
    </div>
  </section>
  <hr />
  <section>
    <h2>
      <i :class="[$fa.weight, 'fa-binary-circle-check']"></i>
      <span>{{ $t('settings.sidecar.name') }}</span>
    </h2>
    <span class="desc">{{ $t('settings.sidecar.desc') }}</span>
    <div v-for="v in sidecarList" :key="v" class="io">
      <h3>{{ $t('settings.sidecar.' + v) }}</h3>
      <button @click="openPath(settings.sidecar[v])">
        {{ settings.sidecar[v] }}
      </button>
      <button @click="newSidecar(v)">
        <i class="fa-light fa-folder-open"></i>
      </button>
    </div>
  </section>
  <hr />
  <section>
    <h2>
      <i :class="[$fa.weight, 'fa-database']"></i>
      <span>{{ $t('settings.cache.name') }}</span>
    </h2>
    <span class="desc">{{ $t('settings.cache.desc') }}</span>
    <div v-for="v in cacheList" :key="v" class="io">
      <h3>{{ $t('settings.cache.' + v) }}</h3>
      <button @click="openCache(v)">{{ formatBytes(app.cache[v]) }}</button>
      <button @click="cleanCache(v)">
        <i class="fa-light fa-broom-wide"></i>
      </button>
    </div>
  </section>
  <hr />
  <section>
    <h2>
      <i :class="[$fa.weight, 'fa-box-taped']"></i>
      <span>{{ $t('settings.database.name') }}</span>
    </h2>
    <span class="desc">{{ $t('settings.database.desc') }}</span>
    <div class="db flex gap-2">
      <button @click="importDb">
        <i :class="[$fa.weight, 'fa-file-import']"></i>
        <span>{{ $t('settings.database.import') }}</span>
      </button>
      <button @click="exportDb">
        <i :class="[$fa.weight, 'fa-file-export']"></i>
        <span>{{ $t('settings.database.export') }}</span>
      </button>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import i18n from '@/i18n';

import { openPath } from '@tauri-apps/plugin-opener';
import { Channel } from '@tauri-apps/api/core';
import * as dialog from '@tauri-apps/plugin-dialog';

import { useAppStore, useSettingsStore } from '@/store';
import { commands } from '@/services/backend';
import { AppLog, formatBytes } from '@/services/utils';

const settings = useSettingsStore();
const app = useAppStore();

const pathList = ['down_dir', 'temp_dir'] as const;
const sidecarList = ['aria2c', 'ffmpeg', 'danmakufactory'] as const;
const cacheList = ['log', 'temp', 'webview', 'database'] as const;
type CacheKey = keyof typeof app.cache;

onMounted(() => cacheList.forEach((k) => getSize(k)));

async function getSize(type: CacheKey) {
  const event = new Channel<number>();
  event.onmessage = (v) => (app.cache[type] = v);
  await commands.getSize(type, event);
}

async function cleanCache(type: CacheKey) {
  const result = await dialog.ask(i18n.global.t('settings.confirm'), {
    kind: 'warning',
  });
  if (!result) return;
  await commands.cleanCache(type);
  await getSize(type);
}

async function openCache(type: CacheKey) {
  await commands.openCache(type);
}

async function newPath(type: (typeof pathList)[number]) {
  const path = await dialog.open({
    directory: true,
    defaultPath: settings[type],
  });
  if (!path) return;
  settings[type] = path;
}

async function newSidecar(type: (typeof sidecarList)[number]) {
  const path = await dialog.open({
    filters: [{ name: 'Executable File', extensions: ['exe'] }],
    defaultPath: settings.sidecar[type],
  });
  if (!path) return;
  settings.sidecar[type] = path;
}

async function importDb() {
  const path = await dialog.open({
    defaultPath: settings.down_dir,
  });
  if (!path) return;
  const result = await commands.dbImport(path);
  if (result.status === 'error') throw result.error;
}

async function exportDb() {
  const path = await dialog.save({
    defaultPath: `${settings.down_dir}/Storage_${Date.now()}`,
  });
  if (!path) return;
  const result = await commands.dbExport(path);
  if (result.status === 'error') throw result.error;
  AppLog(i18n.global.t('settings.database.exported', [path]), 'success');
}
</script>

<style scoped>
@reference 'tailwindcss';

.io button {
  @apply m-0 truncate;
  &:nth-of-type(1) {
    @apply min-w-24 max-w-[420px] rounded-r-none;
  }
  &:nth-of-type(2) {
    @apply bg-(--primary-color) text-(--primary-text) rounded-l-none;
  }
}
.db button {
  @apply w-40;
}
</style>
