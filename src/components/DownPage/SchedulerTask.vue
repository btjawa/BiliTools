<template>
  <div
    :key="task.id"
    class="flex flex-col p-3 rounded-lg text-sm bg-(--block-color) gap-1.5 px-4 border-2"
    :style="{ 'border-color': getBorder(task.id) }"
  >
    <div class="flex w-full text">
      <span class="w-full truncate">{{ task.item.title }}</span>
      <span class="flex-shrink-0">{{ timestamp(task.ts) }}</span>
    </div>
    <div class="flex gap-2 desc w-full text items-center justify-center">
      <div
        class="flex gap-2 max-w-full overflow-auto whitespace-nowrap *:shrink-0"
      >
        <template
          v-if="task.select.media.video || task.select.media.audioVideo"
        >
          <Dropdown
            v-if="task.state === 'pending'"
            v-model="queue.tasks[task.id].select.res"
            class="flat min-w-0! mr-1"
            :drop="
              cache.res.map((id) => ({
                id,
                name: $t(`quality.res.${id}`),
              }))
            "
            @click.once="dropdown(task)"
            @click="commands.updateSelect(task.id, task.select)"
          />
          <span v-else>{{ $t(`quality.res.${task.select.res}`) }}</span>
          <span>{{ $t(`quality.enc.${task.select.enc}`) }}</span>
        </template>
        <template
          v-if="task.select.media.audio || task.select.media.audioVideo"
        >
          <Dropdown
            v-if="task.state === 'pending'"
            v-model="queue.tasks[task.id].select.abr"
            class="flat min-w-0! mr-1"
            :drop="
              cache.abr.map((id) => ({
                id,
                name: $t(`quality.abr.${id}`),
              }))
            "
            @click.once="dropdown(task)"
            @click="commands.updateSelect(task.id, task.select)"
          />
          <span v-else>{{ $t(`quality.abr.${task.select.abr}`) }}</span>
        </template>
        <span v-if="Object.entries(task.select.media).some(([_, k]) => k)">
          {{ $t(`quality.fmt.${task.select.fmt}`) }}
        </span>
        <span v-if="task.select.danmaku.live">
          {{ $t('taskType.liveDanmaku') }}
        </span>
        <span v-if="task.select.danmaku.history">
          {{ $t('taskType.historyDanmaku') }}
        </span>
        <span v-if="task.select.thumb.length">
          {{ $t('popup.thumb.name') }}
        </span>
        <span v-if="task.select.misc.subtitles">
          {{ task.select.misc.subtitles }}
        </span>
        <span v-if="task.select.misc.aiSummary">
          {{ $t('taskType.aiSummary') }}
        </span>
        <span v-if="task.select.misc.opusContent">
          {{ $t('taskType.opusContent') }}
        </span>
        <span v-if="task.select.misc.opusImages">
          {{ $t('taskType.opusImages') }}
        </span>
      </div>
      <div class="flex gap-1 ml-auto flex-shrink-0 items-center">
        <i :class="[$fa.weight, 'fa-id-badge ml-auto']"></i>
        {{ task.id }}
        <i :class="[$fa.weight, 'fa-hashtag']"></i>
        {{ String(task.seq + 1).padStart(2, '0') }}
      </div>
    </div>
    <div class="flex w-full gap-4 *:shrink-0 items-center">
      <button @click="props.popup(task)">
        <i :class="[$fa.weight, 'fa-list']"></i>
        <span>{{ $t('down.taskInfo') }}</span>
      </button>
      <ProgressBar :progress="getProgress(task)" />
      <span class="w-14">{{ getProgress(task).toFixed(2) }}%</span>
      <div class="flex gap-2 text-sm">
        <button v-for="(v, k) in buttons" :key="k" @click="event(k)">
          <i :class="[$fa.weight, v]"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Task, Scheduler } from '@/types/shared.d';
import { getPlayUrl } from '@/services/media/data';
import { useQueueStore } from '@/store';
import { computed, reactive } from 'vue';

import { commands, CtrlEvent } from '@/services/backend';
import { timestamp } from '@/services/utils';
import { ProgressBar, Dropdown } from '..';

const queue = useQueueStore();

const props = defineProps<{
  sche: Scheduler;
  task: Task;
  popup: (task: Task) => void;
}>();

const cache = reactive({
  res: [props.task.select.res],
  abr: [props.task.select.abr],
});

function getProgress(task: Task) {
  const subtasks = task.subtasks;
  const content = subtasks.length;
  let chunk = 0;
  for (const v of Object.values(queue.tasks[task.id].status)) {
    chunk += v.chunk / v.content || 0;
  }
  return (chunk / content || 0) * 100;
}

function getBorder(id: string) {
  switch (queue.tasks[id]?.state) {
    case 'active':
      return 'var(--primary-color)';
    case 'paused':
      return '#ffc107';
    case 'failed':
      return '#ff5252';
    case 'completed':
      return '#4caf50';
    default:
      return 'var(--split-color)';
  }
}

async function dropdown(task: Task) {
  const { item, select } = task;
  const playurl = await getPlayUrl(item, item.type, select.fmt);
  cache.res = [...new Set(playurl.video?.map((v) => v.id) ?? [])];
  cache.abr = [...new Set(playurl.audio?.map((v) => v.id) ?? [])];
}

const buttons = computed(() => ({
  ...(props.task.state !== 'pending' &&
    props.task.state !== 'completed' && {
      retry: 'fa-rotate-right',
    }),
  ...(props.task.state !== 'pending' && {
    openFolder: 'fa-folder-open',
  }),
  ...(props.task.state === 'active' && {
    pause: 'fa-pause',
  }),
  ...(props.task.state === 'paused' && {
    resume: 'fa-play',
  }),
  cancel: 'fa-trash',
}));

async function event(event: CtrlEvent | 'openFolder') {
  const sid = props.sche.sid;
  const id = props.task.id;
  const result =
    event === 'openFolder'
      ? await commands.openFolder(sid, id)
      : await commands.ctrlEvent(event, sid, [id]);
  if (result.status === 'error') throw result.error;
}
</script>
