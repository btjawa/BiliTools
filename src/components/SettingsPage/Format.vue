<template>
  <section>
    <h2>
      <i :class="[$fa.weight, 'fa-file-signature']"></i>
      <span>{{ $t('settings.naming.name') }}</span>
      <i
        @click="openUrl('https://btjawa.top/bilitools/naming')"
        class="question fa-light fa-circle-question"
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
    <template v-for="(val, key) in placeholders">
      <div>
        <i :class="[$fa.weight, val.icon]"></i>
        <span>{{ $t('settings.naming.' + key) }}</span>
      </div>
      <template v-for="(v, k) in val.data">
        <div>{{ $t('settings.naming.' + k) }}</div>
        <div class="flex flex-wrap gap-2 w-full">
          <button v-for="i in v" @click="click(i, key)">
            {{ $t('format.' + i) }}
          </button>
        </div>
      </template>
      <input type="text" spellcheck="false" v-model="settings.format[key]" />
      <hr />
    </template>
  </section>
</template>

<script lang="ts" setup>
import { useSettingsStore } from '@/store';
import { NamingTemplates as v } from '@/types/shared.d';
import { openUrl } from '@tauri-apps/plugin-opener';

const settings = useSettingsStore();

const placeholders = {
  series: {
    icon: 'fa-folder-bookmark',
    data: v.series,
  },
  item: {
    icon: 'fa-folder-closed',
    data: v.item,
  },
  file: {
    icon: 'fa-files',
    data: v.file,
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
