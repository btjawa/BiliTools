<template>
<section>
    <h3>
        <i :class="[settings.dynFa, 'fa-earth-america']"></i>
        <span>{{ $t('settings.language.name') }}</span>
    </h3>
    <Dropdown
        :drop="locales"
        v-model="settings.language"
    />
</section>
<section>
    <h3>
        <i class="fa-solid fa-circle-half-stroke"></i>
        <span>{{ $t('settings.theme.name') }}</span>
    </h3>
    <Dropdown
        :drop="['dark', 'light', 'auto'].map(id => ({
            id, name: $t('settings.theme.' + id)
        }))"
        v-model="settings.theme"
    />
</section>
<hr />
</template>

<script lang="ts" setup>
import { locales } from '@/i18n';
import { useSettingsStore } from '@/store';
import Dropdown from '../Dropdown.vue';

const settings = useSettingsStore();
</script>