<template>
  <section>
    <h2>
      <i :class="[$fa.weight, 'fa-user']"></i>
      <span>{{ $t('settings.default.name') }}</span>
    </h2>
    <span class="desc">{{ $t('settings.default.desc') }}</span>
    <div v-for="v in ['res', 'abr', 'enc'] as const" :key="v">
      <h3>{{ $t('format.' + v) }}</h3>
      <Dropdown
        v-model="settings.default[v]"
        :drop="
          QualityMap[v].map((id) => ({ id, name: $t(`quality.${v}.${id}`) }))
        "
      />
    </div>
  </section>
  <hr />
  <section>
    <h3>
      <i :class="[$fa.weight, 'fa-angles-down']"></i>
      <span>{{ $t('settings.max_conc.name') }}</span>
    </h3>
    <Dropdown
      v-model="settings.max_conc"
      :drop="Array.from({ length: 5 }, (_, i) => ({ id: i + 1, name: i + 1 }))"
    />
    <span class="desc">{{ $t('settings.max_conc.desc') }}</span>
  </section>
  <hr />
  <section>
    <h2>
      <i :class="[$fa.weight, 'fa-globe']"></i>
      <span>{{ $t('settings.proxy.name') }}</span>
    </h2>
    <div v-for="v in ['address', 'username', 'password'] as const" :key="v">
      <h3>{{ $t('settings.proxy.' + v) }}</h3>
      <input
        v-model="settings.proxy[v]"
        type="text"
        :placeholder="
          v === 'address' ? $t('settings.proxy.placeholder') : $t('optional')
        "
      />
    </div>
  </section>
</template>

<script lang="ts" setup>
import { QualityMap } from '@/types/shared.d';
import { useSettingsStore } from '@/store';
import { Dropdown } from '@/components';

const settings = useSettingsStore();
</script>
