<template>
<section>
    <h3>
        <i :class="[$fa.weight, 'fa-file-import']"></i>
        <span>{{ $t('settings.add_metadata.name') }}</span>
    </h3>
    <Switch v-model="settings.add_metadata"/>
    <span class="desc">{{ $t('settings.add_metadata.desc') }}</span>
</section>
<section>
    <h3>
        <i :class="[$fa.weight, 'fa-block-brick-fire']"></i>
        <span>{{ $t('settings.block_pcdn.name') }}</span>
    </h3>
    <Switch v-model="settings.block_pcdn"/>
    <span class="desc">{{ $t('settings.block_pcdn.desc') }}</span>
</section>
<hr />
<section>
    <h2>
        <i :class="[$fa.weight, 'fa-rotate']"></i>
        <span>{{ $t('settings.convert.name') }}</span>
    </h2>
    <div v-for="v in convertList">
        <h3>{{ $t(`settings.convert.${v}.name`) }}</h3>
        <Switch v-model="settings.convert[v]" />
        <span class="desc">{{ $t(`settings.convert.${v}.desc`) }}</span>
    </div>
</section>
</template>

<script lang="ts" setup>
import { useSettingsStore } from '@/store';
import Switch from '../Switch.vue';

const settings = useSettingsStore();
const convertList = ['danmaku', 'mp3'] as const;

</script>