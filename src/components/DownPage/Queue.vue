<template>
  <div
    v-if="model === 'backlog'"
    class="wrapper"
    :style="{
      height: getHeight(queue[model].length),
    }"
  >
    <div class="flex mb-2.5 mx-[14px] text items-center">
      <i class="fa-solid fa-books-medical"></i>
      <span>{{ $t('down.backlog') }} ({{ queue.backlog.length }})</span>
      <button
        v-if="queue[model].length"
        class="ml-auto w-fit primary-color"
        @click="dispatch"
      >
        <i :class="[$fa.weight, 'fa-download']"></i>
        <span>{{ $t('down.processQueue') }}</span>
      </button>
    </div>
    <VList
      v-if="queue[model].length"
      v-slot="{ item }"
      :data="queue[model].map((v) => queue.tasks[v])"
    >
      <Task :task="item" />
    </VList>
    <Empty v-else :text="$t('down.backlogEmpty')" />
  </div>
  <VList
    v-else-if="model && queue[model].length"
    v-slot="{ item }"
    :data="queue[model].map((v) => queue.schedulers[v])"
  >
    <Scheduler
      :sche="item"
      :dispatch
      :style="{
        height: getHeight(item.list.length),
      }"
    />
  </VList>
  <Empty v-else class="mt-0" :text="$t('down.empty')" />
</template>

<script lang="ts" setup>
import { useQueueStore } from '@/store';
import { VList } from 'virtua/vue';
import { processQueue } from '@/services/queue';

import { Empty } from '@/components';
import { Scheduler, Task } from '.';
import { ref } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';

const model = defineModel<'backlog' | 'pending' | 'doing' | 'complete'>();

const queue = useQueueStore();

const windowHeight = ref(window.innerHeight);

getCurrentWindow().onResized((e) => {
  windowHeight.value = e.payload.height;
});

function dispatch() {
  model.value = 'doing';
  processQueue();
}

function getHeight(len: number) {
  const pad = 66;
  const unit = 116;
  const raw = pad + unit * (len || 2);
  const maxHeight = windowHeight.value - 92;
  return (raw > maxHeight ? maxHeight : raw) + 'px';
}
</script>
