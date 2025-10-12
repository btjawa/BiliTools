<template>
  <Transition name="slide">
    <div v-if="v.active" class="popup">
      <button class="close" @click="v.active = false">
        <i :class="[$fa.weight, 'fa-close']"></i>
      </button>
      <div class="flex flex-col gap-2 desc text flex-wrap [&_span]:mr-2">
        <div>
          <span
            >{{ $t('format.mediaType') }}:
            {{ $t('mediaType.' + v.task.item.type) }}</span
          >
          <span
            >{{ $t('format.container') }}:
            {{ $t('mediaType.' + v.task.type) }}</span
          >
        </div>
        <span
          >{{ $t('format.pubtime') }}:
          {{ timestamp(v.task.item.pubtime) }}</span
        >
        <div>
          <span v-for="(i, k) in idList" :key="k">{{ i }}</span>
        </div>
      </div>
      <div
        v-for="t of v.task?.subtasks"
        :key="t.id"
        class="flex w-full gap-4 items-center"
      >
        <span class="flex-shrink-0 min-w-28">{{
          $t('taskType.' + t.type)
        }}</span>
        <span class="w-16">{{ stat(t.id).toFixed(2) }}%</span>
        <ProgressBar :progress="stat(t.id)" />
      </div>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import { timestamp } from '@/services/utils';
import { Task } from '@/types/shared.d';
import { computed, reactive } from 'vue';
import ProgressBar from '../ProgressBar.vue';

const v = reactive({
  active: false,
  task: {} as Task,
});

const idList = computed(() => {
  const result: string[] = [];
  const { item } = v.task;
  if (item.aid) result.push('av' + item.aid);
  if (item.bvid) result.push(item.bvid);
  if (item.ssid) result.push('ss' + item.ssid);
  if (item.epid) result.push('ep' + item.epid);
  if (item.opid) result.push('op:' + item.opid);
  if (item.sid) result.push('au' + item.sid);
  if (item.cid) result.push('cid:' + item.cid);
  if (item.fid) result.push('fid:' + item.fid);
  return result;
});

defineExpose({ init });

function init(task: Task) {
  v.task = task;
  v.active = true;
}

const stat = (id: string) => {
  const stat = v.task?.status[id];
  return (stat ? stat?.chunk / stat?.content || 0 : 0) * 100;
};
</script>
