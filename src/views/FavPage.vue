<template><div class="flex-col pb-0">
    <h1 class="self-start">
        <i :class="[settings.dynFa, 'fa-bookmark mr-2']"></i>
        {{ $t('favorites.title') }}
    </h1>
    <hr />
    <Empty :exp="favorateList.length === 0" text="home.empty" class="absolute"/>
    <div class="setting-page__sub flex w-full h-[calc(100%-74px)]" :class="{ 'active': favorateActive }">
        <div class="flex flex-col flex-1 mr-6" ref="subPage">
            <div class="mb-4">
                <span>{{ $t('favorites.label.page') }}</span>
                <input type="number" v-model="page" class="ml-4"
                    @input="page<1?page=1:page>maxPage?page=maxPage:page"
                />
            </div>
            <div v-if="favorateContent[media_id]" class="flex flex-col overflow-auto gap-0.5">
                <div v-for="(item, index) in favorateContent[media_id]" class="flex items-center rounded-lg h-12 text-sm p-4 bg-[color:var(--block-color)] w-full">
                    <span class="min-w-6">{{ index + 1 }}</span>
                    <div class="w-px h-full bg-[color:var(--split-color)] mx-4"></div>
                    <span class="flex flex-1 ellipsis text">{{ item.title }}</span>
                    <div class="w-px h-full bg-[color:var(--split-color)] mx-4"></div>
                    <button @click="trySearch(item.bvid)">
                        <i :class="[settings.dynFa, 'fa-download']"></i>
                        <span>{{ $t('downloads.label.download') }}</span>
                    </button>
                </div>
            </div>
        </div>
        <div class="setting-page__sub-tab flex flex-col items-start gap-1">
            <button v-for="item in favorateList" @click="media_id = item.id" :class="media_id !== item.id || 'active'"
                class="p-[8px_0] w-60 flex items-center justify-end bg-[color:unset] gap-3 hover:bg-[color:var(--button-color)]"
            >
                <span class="text-base">{{ item.title }}</span>
                <label class="w-[3px] rounded-md h-4 bg-[color:var(--primary-color)] invisible"></label>
            </button>
            <button class="self-end mt-2" @click="getList">
                <i :class="[settings.dynFa, 'fa-rotate-right']"></i>
                <span>{{ $t('common.refresh') }}</span>
            </button>
        </div>
    </div>
</div></template>
<script setup lang="ts">
import { inject, ref, computed, watch, nextTick, onActivated } from 'vue';
import { getFavoriteContent, getFavoriteList } from '@/services/data';
import { FavoriteList, FavoriteContent } from '@/types/data.d';
import { useSettingsStore } from '@/store';
import { ApplicationError } from '@/services/utils';
import { Empty } from '@/components';

const media_id = ref(Number());
const page = ref(1);
const medias = ref(Number());
const favorateList = ref<FavoriteList["data"]["list"]>([]);
const favorateActive = ref(false);
const favorateContent = ref<{ [id: number]: FavoriteContent['data']['medias'] }>({});

const subPage = ref<HTMLElement>();

const settings = useSettingsStore();
const maxPage = computed(() => Math.ceil(medias.value / 20));

watch(media_id, (newVal, oldVal) => {
    if (oldVal !== newVal && newVal && subPage.value) {
        subPage.value.style.transition = 'none';
        subPage.value.style.opacity = '0';
        nextTick(() => requestAnimationFrame(() => {
            if (!subPage.value) return;
            subPage.value.style.transition = 'opacity 0.3s';
            subPage.value.style.opacity = '1';
        }));
        getContent(newVal, 1);
    }
})

watch(page, (newVal) => getContent(media_id.value, newVal))

onActivated(() => !favorateList.value.length && getList())

const trySearch = inject<(input?: string) => void>('trySearch') || (() => {});

async function getContent(media_id: number, pn: number) {
    try {
        const body = await getFavoriteContent(media_id, pn);
        favorateContent.value[media_id] = body.medias;
        medias.value = body.info.media_count;
    } catch(err) {
        err instanceof ApplicationError ? err.handleError() :
        new ApplicationError(err as string).handleError();
    }
}

async function getList() {
    try {
        favorateActive.value = false;
        media_id.value = Number();
        const list = await getFavoriteList() || [];
        favorateList.value = list;
        media_id.value = list[0].id;
        favorateActive.value = true;
        page.value = 1;
    } catch(err) {
        err instanceof ApplicationError ? err.handleError() :
        new ApplicationError(err as string).handleError();
    }
}
</script>
<style lang="scss" scoped>
hr {
    @apply w-full my-4;
}
.page span.desc {
    @apply text-sm;
}
.setting-page__sub {
    @apply transform translate-y-8 opacity-0;
    transition: opacity .2s, transform .5s cubic-bezier(0,1,.6,1);
    &.active {
        @apply transform translate-y-0 opacity-100;
    }
}
.setting-page__sub-tab button.active {
    @apply bg-[color:var(--button-color)];
    label {
        @apply visible;
    }
}
</style>