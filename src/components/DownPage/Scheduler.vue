<template>
  <div class="sche min-h-0 max-h-[calc(100vh-92px)]">
    <div class="flex mb-2.5 mx-[14px] text items-center">
      <i :class="[$fa.weight, 'fa-id-badge']"></i>
      <span class="mr-auto">{{
        sche.sid === '__waiting__' ? $t('down.ordering') : sche.sid
      }}</span>
      <div class="flex gap-2 items-center">
        <button
          v-if="sche.sid === '__waiting__' && sche.list.length"
          class="ml-auto w-fit primary-color"
          @click="
            processQueue();
            tab = 'doing';
          "
        >
          <i :class="[$fa.weight, 'fa-download']"></i>
          <span>{{ $t('down.processQueue') }}</span>
        </button>
        <template v-if="sche.sid !== '__waiting__'">
          <span class="mr-2 ml-auto">{{ timestamp(sche.ts / 1000) }}</span>
          <button v-for="(v, k) in buttons" :key="k" @click="event(k)">
            <i :class="[$fa.weight, v]"></i>
          </button>
        </template>
      </div>
    </div>
    <Empty v-if="!sche.list.length" :text="$t('down.empty')" />
    <VList
      v-slot="{ item }"
      :data="sche.list.map((v) => queue.tasks[v])"
      class="contain-paint!"
    >
      <SchedulerTask :sche :task="item" />
    </VList>
  </div>
</template>

<script lang="ts" setup>
import { commands, CtrlEvent } from '@/services/backend';
import { Scheduler } from '@/types/shared.d';
import { processQueue } from '@/services/queue';
import { timestamp } from '@/services/utils';
import { useQueueStore } from '@/store';
import { computed } from 'vue';

import { VList } from 'virtua/vue';
import { Empty } from '@/components';
import SchedulerTask from './SchedulerTask.vue';

const props = defineProps<{
  sche: Scheduler;
}>();

const queue = useQueueStore();
const tab = defineModel<'waiting' | 'doing' | 'complete'>();

const buttons = computed(() => ({
  ...(tab.value === 'doing' && {
    pause: 'fa-pause',
    resume: 'fa-play',
  }),
  ...(tab.value !== 'waiting' && {
    openFolder: 'fa-folder-open',
  }),
  cancel: 'fa-trash',
}));

async function event(event: CtrlEvent | 'openFolder') {
  const sid = props.sche.sid;
  const sch = queue.schedulers[sid];
  const result =
    event === 'openFolder'
      ? await commands.openFolder(sid, null)
      : await commands.ctrlEvent(event, sid, sch.list);
  if (result.status === 'error') throw result.error;
}
</script>

<style scoped>
@reference 'tailwindcss';

.sche {
  @apply flex flex-col p-3 rounded-lg text-sm bg-(--block-color);
  @apply gap-0.5 my-px border border-(--split-color);
}
</style>
