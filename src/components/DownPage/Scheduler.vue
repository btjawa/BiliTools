<template>
  <div class="block gap-0.5 my-px border">
    <div class="flex mb-2.5 mx-[14px] text items-center">
      <i :class="[$fa.weight, 'fa-id-badge']"></i>
      <span class="mr-auto">{{
        item.sid === '__waiting__' ? $t('down.ordering') : item.sid
      }}</span>
      <div class="flex gap-2 items-center">
        <button
          v-if="item.sid === '__waiting__' && item.list.length"
          class="ml-auto w-fit primary-color"
          @click="
            processQueue();
            tab = 'doing';
          "
        >
          <i :class="[$fa.weight, 'fa-download']"></i>
          <span>{{ $t('down.processQueue') }}</span>
        </button>
        <template v-if="item.sid !== '__waiting__'">
          <span class="mr-2 ml-auto">{{ timestamp(item.ts / 1000) }}</span>
          <button
            v-for="(v, k) in buttons()"
            :key="k"
            @click="event(k, item.sid, null)"
          >
            <i :class="[$fa.weight, v]"></i>
          </button>
        </template>
      </div>
    </div>
    <Empty v-if="!item.list.length" :text="$t('down.empty')" />
    <div
      v-for="task in item.list.map((v) => queue.tasks[v])"
      :key="task.id"
      class="block gap-1.5 px-4 border-2"
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
              v-if="tab === 'waiting'"
              v-model="queue.tasks[task.id].select.res"
              class="flat min-w-0! mr-1"
              :drop="
                (cache.get(task.id)?.res ?? [task.select.res]).map((id) => ({
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
              v-if="tab === 'waiting'"
              v-model="queue.tasks[task.id].select.abr"
              class="flat min-w-0! mr-1"
              :drop="
                (cache.get(task.id)?.abr ?? [task.select.abr]).map((id) => ({
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
        </div>
        <div class="flex gap-1 ml-auto flex-shrink-0 items-center">
          <i :class="[$fa.weight, 'fa-id-badge ml-auto']"></i>
          {{ task.id }}
          <i :class="[$fa.weight, 'fa-hashtag']"></i>
          {{ String(task.seq + 1).padStart(2, '0') }}
        </div>
      </div>
      <div class="flex w-full gap-4 *:shrink-0 items-center">
        <button @click="popup?.(task)">
          <i :class="[$fa.weight, 'fa-list']"></i>
          <span>{{ $t('down.taskInfo') }}</span>
        </button>
        <ProgressBar :progress="getProgress(task)" />
        <span class="w-14">{{ getProgress(task).toFixed(2) }}%</span>
        <div class="flex gap-2 text-sm">
          <button
            v-for="(v, k) in buttons(task)"
            :key="k"
            @click="event(k, item.sid, task.id)"
          >
            <i :class="[$fa.weight, v]"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { commands, CtrlEvent } from '@/services/backend';
import { Scheduler, Task } from '@/types/shared.d';
import { processQueue } from '@/services/queue';
import { timestamp } from '@/services/utils';
import { useQueueStore } from '@/store';
import { computed, reactive } from 'vue';

import { Dropdown, Empty, ProgressBar } from '@/components';
import { getPlayUrl } from '@/services/media/data';

defineProps<{
  item: Scheduler;
  popup?: (task: Task) => void;
}>();

const queue = useQueueStore();
const tab = defineModel<'waiting' | 'doing' | 'complete'>();

const cache = reactive(
  new Map<
    string,
    {
      res: number[];
      abr: number[];
    }
  >(),
);

const buttons = computed(() => (task?: Task) => ({
  ...(task &&
    task?.state !== 'pending' &&
    task?.state !== 'completed' && {
      retry: 'fa-rotate-right',
    }),
  ...(task?.state === 'active' && {
    pause: 'fa-pause',
  }),
  ...(task?.state === 'paused' && {
    resume: 'fa-play',
  }),
  ...(!task &&
    tab.value === 'doing' && {
      pause: 'fa-pause',
      resume: 'fa-play',
    }),
  ...(task?.state !== 'pending' && {
    openFolder: 'fa-folder-open',
  }),
  cancel: 'fa-trash',
}));

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

async function event(
  event: CtrlEvent | 'openFolder',
  sid: string,
  id: string | null,
) {
  if (event === 'cancel' && id) cache.delete(id);
  const sch = queue.schedulers[sid];
  const result =
    event === 'openFolder'
      ? await commands.openFolder(sid, id)
      : await commands.ctrlEvent(event, sid, id ? [id] : sch.list);
  if (result.status === 'error') throw result.error;
}

async function dropdown(task: Task) {
  const { item, select, id } = task;
  const playurl = await getPlayUrl(item, item.type, select.fmt);
  cache.set(id, {
    res: [...new Set(playurl.video?.map((v) => v.id) ?? [])],
    abr: [...new Set(playurl.audio?.map((v) => v.id) ?? [])],
  });
}
</script>

<style scoped>
@reference 'tailwindcss';

.block {
  @apply flex flex-col p-3 rounded-lg text-sm bg-(--block-color);
  @apply border-(--split-color);
}
</style>
