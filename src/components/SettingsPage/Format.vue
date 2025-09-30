<template>
  <section>
    <h2>
      <i :class="[$fa.weight, 'fa-file-signature']"></i>
      <span>{{ $t('settings.naming.name') }}</span>
      <i
        class="question fa-light fa-circle-question"
        @click="openUrl('https://btjawa.top/bilitools/naming')"
      ></i>
    </h2>
    <i18n-t
      keypath="settings.naming.desc"
      tag="span"
      scope="global"
      class="desc text"
    >
      <template #format>
        <a>{var:&lt;ISO8601&gt;}</a>
      </template>
      <template #example>
        <a>{pubtime:YYYY-MM-DD_HH-mm-ss}</a>
      </template>
    </i18n-t>
    <template v-for="(val, key, idx) in placeholders" :key>
      <hr v-if="idx" />
      <div>
        <i :class="[$fa.weight, val.icon]"></i>
        <span>{{ $t('settings.naming.' + key) }}</span>
      </div>
      <template v-for="(v, k) in val.data" :key="k">
        <div>{{ $t('settings.naming.' + k) }}</div>
        <div class="flex flex-wrap gap-2 w-full">
          <button v-for="i in v" :key="i" @click="click(i, key)">
            {{ $t('format.' + i) }}
          </button>
        </div>
      </template>
      <input v-model="settings.format[key]" type="text" spellcheck="false" />
    </template>
  </section>
</template>

<script lang="ts" setup>
import { useSettingsStore } from '@/store';
import { NamingTemplates as n } from '@/types/shared.d';
import { openUrl } from '@tauri-apps/plugin-opener';

const settings = useSettingsStore();

const placeholders = {
  series: {
    icon: 'fa-folder-bookmark',
    data: n.series,
  },
  item: {
    icon: 'fa-folder-closed',
    data: n.item,
  },
  file: {
    icon: 'fa-files',
    data: n.file,
  },
};

function click(v: string, k: keyof typeof settings.format) {
  const id = `{${v}}`;
  let val = settings.format[k];
  if (!val.includes(id)) val += id;
  settings.format[k] = val;
}
</script>

<style scoped>
@reference 'tailwindcss';

h2 {
  @apply mb-2;
}
input {
  @apply mt-2 w-full;
}
</style>
