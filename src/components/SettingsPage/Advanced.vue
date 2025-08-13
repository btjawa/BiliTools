<template>
<section>
    <h3>
        <i :class="[$fa.weight, 'fa-subtitles']"></i>
        <span>{{ $t('settings.protobuf_danmaku.name') }}</span>
    </h3>
    <Switch v-model="settings.protobuf_danmaku"/>
    <span class="desc">{{ $t('settings.protobuf_danmaku.desc') }}</span>
</section>
<section>
    <h3>
        <i :class="[$fa.weight, 'fa-file-import']"></i>
        <span>{{ $t('settings.add_metadata.name') }}</span>
    </h3>
    <Switch v-model="settings.add_metadata"/>
    <span class="desc">{{ $t('settings.add_metadata.desc') }}</span>
</section>
选择音频后缀
</template>

<script lang="ts" setup>
import { useSettingsStore } from '@/store';
import Switch from '../Switch.vue';

const settings = useSettingsStore();
</script>