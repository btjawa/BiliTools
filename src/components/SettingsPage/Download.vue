<template>
<section>
    <h2>
        <i :class="[$fa.weight, 'fa-user']"></i>
        <span>{{ $t('settings.default.name') }}</span>
    </h2>
    <span class="desc">{{ $t('settings.default.desc') }}</span>
    <div v-for="v in defaults">
        <h3>{{ $t('format.' + v) }}</h3>
        <Dropdown
            :drop="QualityMap[v].map(id => ({ id, name: $t(`quality.${v}.${id}`) }))"
            v-model="settings.default[v]"
        />
    </div>
</section>
<hr />
<section>
    <h3>
        <i :class="[$fa.weight, 'fa-arrow-down-from-arc']"></i>
        <span>{{ $t('settings.auto_download.name') }}</span>
    </h3>
    <Switch v-model="settings.auto_download"/>
    <span class="desc">{{ $t('settings.auto_download.desc') }}</span>
</section>
<section>
    <h3>
        <i :class="[$fa.weight, 'fa-angles-down']"></i>
        <span>{{ $t('settings.max_conc.name') }}</span>
    </h3>
    <Dropdown
        :drop="Array.from({ length: 5 }, (_, i) => ({ id: i+1, name: i+1 }))"
        v-model="settings.max_conc"
    />
    <span class="desc">{{ $t('settings.max_conc.desc') }}</span>
</section>
<hr />
<section>
    <h2>
        <i :class="[$fa.weight, 'fa-globe']"></i>
        <span>{{ $t('settings.proxy.name') }}</span>
    </h2>
    <div v-for="v in proxys">
        <h3>{{ $t('settings.proxy.' + v) }}</h3>
        <input
            type="text"
            v-model="settings.proxy[v]"
            :placeholder="v === 'address' ? $t('settings.proxy.placeholder') : $t('optional')" />
    </div>
</section>
</template>

<script lang="ts" setup>
import { useSettingsStore } from '@/store';
import { Dropdown, Switch } from '@/components';
import { QualityMap } from '@/types/shared.d';

const defaults = ['res', 'abr', 'enc'] as const;
const proxys = ['address', 'username', 'password'] as const;

const settings = useSettingsStore();
</script>