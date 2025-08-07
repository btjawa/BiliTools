<template><div class="pb-0">
<h1 class="w-full mb-auto">
	<i :class="[$fa.weight, 'fa-clock']"></i>
	<span>{{ $t('history.title') }}</span>
</h1>
<div class="flex w-full h-full mt-4 flex-1 gap-3 min-h-0">
	<Transition name="slide">
	<RecycleScroller
		v-if="v.listActive" class="w-full"
        key-field="view_at" :key="tab"
        :items="v.info.list" :item-size="50"
	>
		<template #before v-if="!v.info.list?.length">
            <Empty :text="$t('empty')" />
        </template>
		<template v-slot="{ item }">
            <div class="px-4 py-2 rounded-lg bg-[var(--block-color)] text-sm">
                <span>{{ item.title }}</span>
            </div>
        </template>
	</RecycleScroller>
	</Transition>
	<div class="flex flex-col w-32 gap-2">
		<div class="tab">
		<button v-for="v in tabs" @click="tab = v.type" :class="{ 'active': tab === v.type }">
			<span>{{ v.name }}</span>
			<label class="primary-color"></label>
		</button>
		</div>
    <span>{{ $t('page') }}</span>
    <input type="number" min="1" v-model="v.pageIndex" />
    <button @click="refresh">
		<i :class="[$fa.weight, 'fa-rotate-right']"></i>
		<span>{{ $t('history.refresh') }}</span>
    </button>
</div>
</div>
</div></template>

<script lang="ts" setup>
import { computed, onActivated, reactive, ref, Transition, watch } from 'vue';
import { RecycleScroller } from 'vue-virtual-scroller';
import { getHistory } from '@/services/media/extras';
import { HistoryInfo } from '@/types/media/extras.d';
import Empty from '@/components/Empty.vue';

const tab = ref('all');
const v = reactive({
	listActive: false,
	info: {} as HistoryInfo['data'],
	pageIndex: 1,
})

watch(() => v.pageIndex, () => refresh().then(i => Object.assign(v.info, i)))

const tabs = computed(() => ([
	{ type: 'all', name: '综合' }, // i think this should be returned from API
	...v.info?.tab ?? []
]));

async function refresh() {
	v.listActive = false;
	v.info = await getHistory(v.info.cursor?.view_at ?? 0);
	console.log(v.info)
	v.listActive = true;
}

onActivated(() => refresh());
</script>

<style lang="scss" scoped>
.tab button {
  @apply w-32;
}
</style>