<template>
  <!-- 缓存自动刷新设置 -->
  <section>
    <h2>
      <i :class="[$fa.weight, 'fa-rotate']"></i>
      <span>{{ $t('settings.cache_auto_refresh.name') }}</span>
    </h2>
    <div>
      <h3>{{ $t('settings.cache_auto_refresh.interval.name') }}</h3>
      <input
        v-model="settings.cacheAutoRefreshInterval"
        type="number"
        class="min-w-40"
        :min="CACHE_AUTO_REFRESH.DISABLED"
        :max="CACHE_AUTO_REFRESH.MAX_INTERVAL_MINUTES"
      />
      <span class="ml-2">{{
        $t('settings.cache_auto_refresh.interval.unit')
      }}</span>
      <span class="desc">{{
        $t('settings.cache_auto_refresh.interval.desc')
      }}</span>
    </div>
  </section>
  <hr />
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
    <div v-for="v in ['danmaku', 'mp3', 'mp4'] as const" :key="v">
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
        class="question fa-light fa-circle-question"
        @click="openUrl('https://btjawa.top/bilitools/organize')"
      ></i>
    </h2>
    <div
      v-for="v in ['auto_rename', 'top_folder', 'sub_folder'] as const"
      :key="v"
    >
      <h3>{{ $t(`settings.organize.${v}.name`) }}</h3>
      <Switch v-model="settings.organize[v]" />
    </div>
  </section>
</template>

<script lang="ts" setup>
import { useSettingsStore } from '@/store';
import Switch from '../Switch.vue';
import { openUrl } from '@tauri-apps/plugin-opener';
import { CACHE_AUTO_REFRESH } from '@/constants';

const settings = useSettingsStore();
</script>
