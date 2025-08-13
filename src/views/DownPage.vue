<template><div>
<h1 class="w-full my-1.5">
    <i :class="[$fa.weight, 'fa-download']"></i>
    <span>{{ $t('down.title') }}</span>
</h1>
<div class="flex w-full h-full mt-4 flex-1 gap-3 min-h-0">
    <Transition mode="out-in">
    <RecycleScroller class="w-full"
        key-field="id" :key="tab"
        :items="queueData" :item-size="112"
    >
        <template #before v-if="!queue[tab].length">
            <Empty :text="$t('down.empty')" />
        </template>
        <template v-slot="{ item }">
            <div class="flex flex-col text-sm p-4 py-3 gap-1.5 rounded-lg bg-[var(--block-color)]">
                <div class="flex w-full text">
                    <span class="w-full ellipsis">{{ item.info.item.title }}</span>
                    <span class="flex-shrink-0">{{ timestamp(item.ts * 1000) }}</span>
                </div>
                <div class="!flex desc items-center gap-2 text">
                    <span
                        v-if="item.select.media.video || item.select.media.audioVideo"
                        v-for="k in (['res', 'enc'] as const)"
                    >
                        {{ $t(`quality.${k}.${item.select[k]}`) }}
                    </span>
                    <span v-if="item.select.media.audio || item.select.media.audioVideo">
						{{ $t(`quality.abr.${item.select['abr']}`) }}
                    </span>
                    <span v-if="Object.entries(item.select.media).some(([_, k]) => k)">
                        {{ $t(`quality.fmt.${item.select['fmt']}`) }}
                    </span>
                    <span v-if="item.select.misc.subtitles">
                        {{ item.select.misc.subtitles }}
                    </span>
                    <span v-if="item.select.thumb.length">
                        {{ $t('popup.thumb.name') }}
                    </span>
                    <i :class="[$fa.weight, 'fa-id-badge ml-auto']"></i>
                    {{ item.id }}
                    <i :class="[$fa.weight, 'fa-hashtag']"></i>
                    {{ String(item.index + 1).padStart(2, '0') }}
                </div>
                <div class="flex w-full gap-4 *:flex-shrink-0 items-center">
                    <button @click="popup?.init(item.status)">
                        <i :class="[$fa.weight, 'fa-list']"></i>
                        <span>任务列表</span>
                    </button>
                    <ProgressBar :progress="getProgress(item.status)" />
                    <span class="w-14">{{ getProgress(item.status).toFixed(2) }}%</span>
                    <div class="flex gap-2 text-sm">
                        <button><i :class="[$fa.weight, item.state === 'paused' ? 'fa-play' : 'fa-pause']"></i></button>
                        <button><i :class="[$fa.weight, 'fa-folder-open']"></i></button>
                        <button><i :class="[$fa.weight, 'fa-trash']"></i></button>
                    </div>
                </div>
            </div>
        </template>
    </RecycleScroller>
    </Transition>
    <div class="tab">
    <button v-for="(v, k) in tabs" @click="tab = k" :class="{ 'active': tab === k }">
        <span>{{ $t(`down.${k}`) }}</span>
        <i :class="[tab === k ? 'fa-solid' : 'fa-light', v]"></i>
        <label class="primary-color"></label>
    </button>
    </div>
    <Popup ref="popup" />
</div>
</div></template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Empty, ProgressBar } from '@/components';
import { useQueueStore } from '@/store';
import { RecycleScroller } from 'vue-virtual-scroller';
import { timestamp } from '@/services/utils';
import { Popup } from '@/components/DownPage';
import { Progress } from '@/types/queue.d';

const tabs = {
    waiting: 'fa-stopwatch',
    doing: 'fa-hourglass-half',
    complete: 'fa-check'
};
type Key = keyof typeof tabs;

const queueData = computed(() => queue.tasks.filter(v => queue[tab.value].includes(v.id)));

const tab = ref<Key>('waiting');
const queue = useQueueStore();
const popup = ref<InstanceType<typeof Popup>>();

function getProgress(status: Progress[]) {
    const content = status.length;
    let chunk = 0;
    for (let i = 0; i < content; i++) {
        const v = status[i];
        chunk += (v.chunkLength / v.contentLength || 0);
    }
    return ((chunk / content || 0) * 100);
}

defineExpose({ tab });
</script>