<template>
<section>
    <h3>
        <i :class="[$fa.weight, 'fa-earth-america']"></i>
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
<section v-if="false"> <!-- temporarily inop -->
    <h3>
        <i :class="[$fa.weight, 'fa-clipboard-check']"></i>
        <span>{{ $t('settings.clipboard.name') }}</span>
    </h3>
    <Switch v-model="settings.clipboard"/>
</section>
<section v-if="false"> <!-- temporarily inop -->
    <h3>
        <i :class="[$fa.weight, 'fa-bell']"></i>
        <span>{{ $t('settings.notify.name') }}</span>
    </h3>
    <Switch v-model="settings.notify"/>
    <span class="desc">{{ $t('settings.notify.desc') }}</span>
</section>
<section>
    <h3>
        <i :class="[$fa.weight, 'fa-arrow-down-from-arc']"></i>
        <span>{{ $t('settings.auto_download.name') }}</span>
    </h3>
    <Switch v-model="settings.auto_download"/>
    <span class="desc">{{ $t('settings.auto_download.desc') }}</span>
</section>
<hr />
<section>
    <h3>
        <i :class="[$fa.weight, 'fa-up-from-line']"></i>
        <span>{{ $t('settings.auto_check_update.name') }}</span>
    </h3>
    <Switch v-model="settings.auto_check_update"/>
</section>
</template>

<script lang="ts" setup>
import { locales } from '@/i18n';
import { useSettingsStore } from '@/store';
import { Dropdown, Switch } from '@/components';

const settings = useSettingsStore();
</script>