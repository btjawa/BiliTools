<template>
  <section>
    <h3>
      <i :class="[$fa.weight, 'fa-file-import']"></i>
      <span>{{ $t('settings.add_metadata.name') }}</span>
    </h3>
    <Switch v-model="settings.add_metadata" />
    <span class="desc">{{ $t('settings.add_metadata.desc') }}</span>
  </section>
  <section>
    <h3>
      <i :class="[$fa.weight, 'fa-block-brick-fire']"></i>
      <span>{{ $t('settings.block_pcdn.name') }}</span>
    </h3>
    <Switch v-model="settings.block_pcdn" />
    <span class="desc">{{ $t('settings.block_pcdn.desc') }}</span>
  </section>
  <hr />
  <section>
    <h2>
      <i :class="[$fa.weight, 'fa-rotate']"></i>
      <span>{{ $t('settings.convert.name') }}</span>
    </h2>
    <div v-for="v in ['danmaku', 'mp3'] as const">
      <h3>{{ $t(`settings.convert.${v}.name`) }}</h3>
      <Switch v-model="settings.convert[v]" />
      <span class="desc">{{ $t(`settings.convert.${v}.desc`) }}</span>
    </div>
  </section>
  <hr />
  <section>
    <h2>
      <i :class="[$fa.weight, 'fa-inboxes']"></i>
      <span>{{ $t('settings.organize.name') }}</span>
      <i
        @click="openUrl('https://btjawa.top/bilitools/organize')"
        class="question fa-light fa-circle-question"
      ></i>
    </h2>
    <div v-for="v in ['auto_rename', 'top_folder', 'sub_folder'] as const">
      <h3>{{ $t(`settings.organize.${v}.name`) }}</h3>
      <Switch v-model="settings.organize[v]" />
    </div>
  </section>
</template>

<script lang="ts" setup>
import { useSettingsStore } from '@/store';
import Switch from '../Switch.vue';
import { openUrl } from '@tauri-apps/plugin-opener';

const settings = useSettingsStore();
</script>
