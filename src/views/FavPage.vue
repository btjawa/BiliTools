<template><div class="flex-col pb-0">
    <h1 class="self-start">
        <i :class="[fa_dyn, 'fa-bookmark mr-2']"></i>
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
                        <i :class="[fa_dyn, 'fa-download']"></i>
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
                <i :class="[fa_dyn, 'fa-rotate-right']"></i>
                <span>{{ $t('common.refresh') }}</span>
            </button>
        </div>
    </div>
</div></template>
<script lang="ts">
import { getFavoriteContent, getFavoriteList } from '@/services/data';
import { ApplicationError } from '@/services/utils';
import { FavoriteList, FavoriteContent } from '@/types/data.d';
import { Empty } from '@/components';
import { inject } from 'vue';

export default {
    components: {
        Empty,
    },
    data() {
        return {
            media_id: Number(),
            page: 1,
            medias: Number(),
            store: this.$store.state,
            favorateList: [] as FavoriteList["data"]["list"],
            favorateActive: false,
            favorateContent: {} as { [id: number]: FavoriteContent['data']['medias'] },
        }
    },
    computed: {
        fa_dyn() {
            return this.store.settings.theme === 'dark' ? 'fa-solid' : 'fa-light';
        },
        maxPage() {
            return Math.ceil(this.medias / 20);
        },
    },
    watch: {
        media_id(newVal, oldVal) {
            if (oldVal !== newVal && newVal) {
                const subPage = this.$refs.subPage as HTMLElement;
                subPage.style.transition = 'none';
                subPage.style.opacity = '0';
                this.$nextTick(() => requestAnimationFrame(() => {
                    subPage.style.transition = 'opacity 0.3s';
                    subPage.style.opacity = '1';
                }));
                this.getContent(newVal, 1);
            }
        },
        page(newVal, _) {
            this.getContent(this.media_id, newVal);
        }
    },
    methods: {
        async getList() {
            try {
                this.favorateActive = false;
                this.media_id = Number();
                const list = await getFavoriteList() || [];
                this.favorateList = list;
                this.media_id = list[0].id;
                this.favorateActive = true;
                this.page = 1;
            } catch(err) {
				err instanceof ApplicationError ? err.handleError() :
				new ApplicationError(err as string).handleError();
			}
        },
        async getContent(media_id: number, pn: number) {
            try {
                const body = await getFavoriteContent(media_id, pn);
                this.favorateContent[media_id] = body.medias;
                this.medias = body.info.media_count;
            } catch(err) {
				err instanceof ApplicationError ? err.handleError() :
				new ApplicationError(err as string).handleError();
			}
        },
    },
    async activated() {
        if (!this.favorateList.length) this.getList();
    },
    setup() {
        const trySearch = inject<(input?: string) => void>('trySearch') || (() => {});
        return { trySearch };
    },
};
</script>
<style lang="scss" scoped>
$color: red;
hr {
    @apply w-full my-4;
    color: $color;
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