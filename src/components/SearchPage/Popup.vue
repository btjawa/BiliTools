<template><div class="popup_container absolute flex items-center justify-center w-full h-full">
<div class="min-w-[calc(100%-269px)] relative h-fit p-4 rounded-xl bg-[color:var(--solid-block-color)]">
    <button class="absolute right-4 top-4 rounded-full w-8 h-8 p-0 z-30" @click="close">
        <i class="fa-solid fa-close"></i>
    </button>
    <div v-for="(item, index) in others" v-if="popupType === 'others'">
        <h3>{{ $t(item.id) }}</h3>
        <div class="flex gap-1 mt-2 items-center">
            <button
                v-for="btn in item.content"
                @click="getOthers(btn.id, date)"
            >
                <i :class="[fa_dyn, btn.icon]"></i>
                <span>{{ $t('home.label.' + btn.id) }}</span>
            </button>
            <VueDatePicker v-if="item.content.find(c => c.id === 'historyDanmaku')"
                v-model="date" :dark="dark"
                model-type="format" format="yyyy-MM-dd"
                id="historyDanmakuDate"
            />
        </div>
        <hr v-if="index < others.length - 1" />
    </div>
    <hr v-if="popupType === 'others'" />
    <div v-for="(item, index) in general" class="relative">
        <h3>{{ $t(`common.default.${item.id}.name`) }}
        <i v-if="item.id === 'fmt'" class="fa-light fa-circle-question question"
            @click="open('https://www.btjawa.top/bilitools#关于-DASH-FLV-MP4')"
        ></i></h3>
        <div class="flex gap-1 mt-2">
            <button v-for="id in item.content"
                :class="{ 'selected': currentSelect[item.id] === id }"
                @click="currentSelect[item.id] = id"
            >
                <i :class="[fa_dyn, item.icon]"></i>
                <span>{{ $t(`common.default.${item.id}.data.${id}`) }}</span>
            </button>
        </div>
        <hr v-if="index < general.length - 1" />
        <button @click="confirm(item.id)" class="absolute right-4 primary-color"
            :class="[index === general.length - 1 ? 'bottom-0' : 'bottom-4']"
            v-if="popupType === 'audioVisual' ? index === general.length - 1
            : (item.id === 'cdc' || item.id === 'ads')"
        >
            <i :class="[fa_dyn, 'fa-right']"></i>
            <span>{{ $t('common.confirm') }}</span>
        </button>
    </div>
</div>
</div></template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { DashInfo, MediaType } from '@/types/data.d';

interface OthersReqs {
    aiSummary: number,
    danmaku: boolean,
}

export default defineComponent({
    props: {
        getOthers: {
            type: Function as PropType<(type: any, options?: any) => any>,
            required: true,
        },
        pushBack: {
            type: Function as PropType<(type: any, options?: any) => any>,
            required: true,
        },
        open: {
            type: Function as PropType<(path: string) => void>,
            required: true,
        },
    },
    data() {
        return {
            othersReqs: {} as OthersReqs,
            popupType: String() as 'audioVisual' | 'others',
            mediaType: MediaType.Video,
            date: new Intl.DateTimeFormat('en-CA').format(new Date()),
        }
    },
    computed: {
        currentSelect: {
            get() { return this.$store.state.data.currentSelect as any },
            set(v: any) { this.$store.state.data.currentSelect = v }
        },
		playUrlInfo: {
            get() { return this.$store.state.data.playUrlInfo },
            set(v: any) { this.$store.state.data.playUrlInfo = v }
		},
        mediaMap() {
            return this.$store.state.data.mediaMap;
        },
        fa_dyn() {
			return this.dark ? 'fa-solid' : 'fa-light';
		},
        dark() {
            return this.$store.state.settings.theme === 'dark';
        },
        general() {
            const info = this.playUrlInfo as DashInfo;
            return [
                ...(info.video ? [{
                    content: [...new Set(info.video.map(item => item.id))],
                    id: 'dms', icon: 'fa-file-video'
                }] : []),
                ...(info.video ? [{
                    content: info.video.filter(item => item.id === this.currentSelect.dms).map(item => item.codecid),
                    id: 'cdc', icon: 'fa-file-code'
                }] : []),
                ...(info.audio ? [{
                    content: info.audio.map(item => item.id),
                    id: 'ads', icon: 'fa-file-audio'
                }] : []),
                ...(this.popupType !== 'others' && this.mediaType === MediaType.Video ? [{
                    content: this.mediaMap.fmt.map(item => item.id),
                    id: 'fmt', icon: 'fa-file-code'
                }] : []),
            ]
        },
        others() {
            return [
                ...(this.othersReqs.danmaku ? [{
                    content: [{
                        id: 'liveDanmaku',
                        icon: 'fa-clock'
                    }, {
                        id: 'historyDanmaku',
                        icon: 'fa-clock-rotate-left'
                    }],
                    id: 'home.label.danmaku'
                }] : []), {
                    content: [{
                        id: 'cover',
                        icon: 'fa-image'
                    },
                    ...(this.othersReqs.aiSummary === 0 ? [{
                        id: 'aiSummary',
                        icon: 'fa-microchip-ai'
                    }] : [])],
                    id: 'home.downloadOptions.others'
                },
            ];
        }
    },
    methods: {
        init(type: 'audioVisual' | 'others', mediaType: MediaType, options: { req: OthersReqs }) {
            this.popupType = type;
            this.othersReqs = options.req;
            this.mediaType = mediaType;
            this.$el.classList.add('active');
        },
        close() {
            this.$el.classList.remove('active');
        },
        confirm(id: string) {
            switch(this.popupType) {
                case 'others': {
                    const type = (() => { switch(id) {
                        case 'cdc': return 'video';
                        case 'ads': return 'audio';
                    } })();
                    this.pushBack(type, { init: true });
                    break;
                };
                case 'audioVisual': {
                    this.pushBack('all', { init: true });
                    break;
                }
            }
            this.close();
        },
    }
});
</script>

<style lang="scss">
.popup_container {
    @apply bg-opacity-50 bg-black transition-opacity duration-200 opacity-0 pointer-events-none;
    & > div {
        @apply transform translate-y-8;
        transition: transform .5s cubic-bezier(0,1,.6,1);
        button {
            border: 2px solid transparent;
            &.selected {
                border: 2px solid var(--primary-color)
            }
        }
    }
    &.active {
        @apply opacity-100;
        pointer-events: all;
        & > div {
            @apply transform translate-y-0;
        }
    }
    hr {
        @apply my-[15px];
    }
}

#historyDanmakuDate {
    @apply max-w-40;
    .dp__input {
        @apply text-sm;
    }
    .dp__menu_inner + div {
        display: none;
    }
}
</style>