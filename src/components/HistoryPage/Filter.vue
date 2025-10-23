<template>
  <Transition name="slide">
    <div v-if="v.active" class="popup">
      <button class="close" @click="cancel">
        <i :class="[$fa.weight, 'fa-close']"></i>
      </button>
      <div
        v-for="(val, k) in filters"
        :key="k"
        class="flex gap-2 *:flex-shrink-0"
      >
        <button
          v-for="i in val"
          :key="i"
          class="border-2 border-transparent"
          :class="{ 'border-(--primary-color)!': v.select[k] === i }"
          @click="v.select[k] = i as any"
        >
          {{ $t(`history.filter.${k}.${i}`) }}
        </button>
        <VueDatePicker
          v-if="k === 'time'"
          v-model="v.select.range"
          range
          class="w-60!"
          :placeholder="$t('history.placeholder')"
          format="yyyy/MM/dd"
          :max-date="new Date()"
          :locale="$i18n.locale"
          :dark="$fa.isDark"
        />
      </div>
      <hr class="m-0" />
      <div class="flex gap-4 items-center">
        <span>{{ $t('history.keyword') }}</span>
        <input v-model="p.keyword" type="text" />
      </div>
      <hr class="m-0" />
      <button class="primary-color w-fit" @click="confirm">
        <i :class="[$fa.weight, 'fa-filter']"></i>
        <span>{{ $t('history.filter.apply') }}</span>
      </button>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import { reactive, watch } from 'vue';
import VueDatePicker from '@vuepic/vue-datepicker';

const filters = {
  duration: ['all', 'under10', '10to30', '30to60', 'over60'] as const,
  time: ['all', 'today', 'yesterday', 'week', 'custom'] as const,
  device: ['all', 'pc', 'phone', 'pad', 'tv'] as const,
};

const v = reactive({
  active: false,
  promise: {} as {
    resolve: (value: null | typeof p) => void;
  },
  select: {
    duration: 'all' as (typeof filters.duration)[number],
    time: 'all' as (typeof filters.time)[number],
    device: 'all' as (typeof filters.device)[number],
    range: [] as Date[],
  },
});

const p = reactive({
  keyword: String(),
  business: 'archive',
  add_time_start: 0,
  add_time_end: 0,
  arc_max_duration: 0,
  arc_min_duration: 0,
  device_type: 0,
});

watch(
  () => v.select.range,
  () => (v.select.time = 'custom'),
);

defineExpose({ getFilter });
async function getFilter() {
  const promise = new Promise<null | typeof p>((res) => {
    v.promise.resolve = res;
  });

  return promise;
}

function confirm() {
  const duration = {
    all: [0, 0],
    under10: [0, 599],
    '10to30': [600, 1800],
    '30to60': [1800, 3600],
    over60: [3601, 0],
  }[v.select.duration];
  p.arc_min_duration = duration[0];
  p.arc_max_duration = duration[1];

  const time = {
    all: [0, 0],
    today: [new Date().setHours(0, 0, 0, 0) / 1000, 0],
    yesterday: [
      new Date().setHours(-24, 0, 0, 0) / 1000,
      new Date().setHours(0, 0, 0, 0) / 1000 - 1,
    ],
    week: [
      new Date().setHours(-((new Date().getDay() + 1) * 24), 0, 0, 0) / 1000,
      0,
    ],
    custom: [
      v.select.range?.[0] ? v.select.range[0].setHours(0, 0, 0, 0) / 1000 : 0,
      v.select.range?.[1]
        ? v.select.range[1].setHours(24, 0, 0, 0) / 1000 - 1
        : 0,
    ],
  }[v.select.time];
  p.add_time_start = time[0];
  p.add_time_end = time[1];
  p.device_type = filters.device.indexOf(v.select.device);

  v.active = false;
  v.promise.resolve(p);
}

function cancel() {
  v.active = false;
  v.promise.resolve(null);
}
</script>
