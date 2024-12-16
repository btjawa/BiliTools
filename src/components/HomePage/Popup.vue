<template><div class="popup_container absolute flex items-center justify-center w-full h-full bg-opacity-50 bg-black cursor-pointer">
    <div @click.stop class="popup min-w-[768px] relative h-fit p-4 rounded-xl bg-[color:var(--solid-block-color)] cursor-default">
        <template v-if="popupActive === 1">
            <template v-for="(option, index) in [...Object.keys(currentSelect) as (keyof typeof currentSelect)[]]">
            <div v-if="showOption(option)">
                <h3>{{ $t(`common.default.${option}.name`) }}
                    <i v-if="option === 'fmt'" class="fa-light fa-circle-question question"
                        @click="open('https://www.btjawa.top/bilitools#关于-DASH-FLV-MP4')"
                    ></i>
                </h3>
                <div class="flex gap-1 mt-2">
                    <button v-for="id in getButtons(option)"
                        :class="{ 'selected': currentSelect[option] === id }"
                        @click="currentSelect[option] = (id as number)"
                    >
                        <i :class="[fa_dyn, 'fa-file-' + getButtons(option, { icon: true })]"></i>
                        <span>{{ $t(`common.default.${option}.data.` + id) }}</span>
                    </button>
                </div>
                <hr v-if="(index < Object.keys(currentSelect).length - 1) && currentSelect.fmt !== -1" class="my-[15px]" />
            </div>
            </template>
            <span v-if="getSize()" class="absolute bottom-4 right-[120px] leading-8 desc">
                ~ {{ formatBytes(getSize() as number) }}
            </span>
            <button @click="$emit('confirm')" class="absolute bottom-4 right-4 bg-[color:var(--primary-color)]">
                <i :class="[fa_dyn, 'fa-right']"></i>
                <span>{{ $t('common.confirm') }}</span>
            </button>
        </template>
        <template v-if="popupActive === 2" v-for="(option, index) in others">
            <h3>{{$t(option.title)}}</h3>
            <div class="flex gap-1 mt-2" v-if="typeof option.req === 'number' || othersReqs[option.req]">
                <template v-for="(item, index) in option.data">
                <button @click="getOthers(item, item === 'historyDanmaku' ? date : null)" v-if="(index !== option.req) || othersReqs[item] === 0">
                    <i :class="[fa_dyn, othersMap[item].icon]"></i>
                    <span>{{$t('home.label.' + item)}}</span>
                </button>
                <VueDatePicker v-if="item === 'historyDanmaku'"
                    v-model="date" :dark="dark"
                    model-type="format" format="yyyy-MM-dd"
                    id="historyDanmakuDate"
                />
                </template>
            </div>
            <hr v-if="index < others.length - 1" class="my-[15px]" />
        </template>
    </div>
</div></template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { DashInfo, DurlInfo, MusicUrlInfo } from '@/types/data.d';
import { formatBytes } from '@/services/utils';

export default defineComponent({
    props: {
        popupActive: {
            type: Number as PropType<number>,
            required: true
        },
        othersMap: {
            type: Object,
            required: true,
        },
        othersReqs: {
            type: Object,
            required: true,
        },
        playUrlInfo: {
            type: Object as PropType<DashInfo | DurlInfo | MusicUrlInfo>,
            required: true
        },
        open: {
            type: Function as PropType<(path: string) => void>,
            required: true,
        },
        getOthers: {
            type: Function as PropType<Function>,
            required: true,
        }
    },
    data() {
        return {
            date: new Intl.DateTimeFormat('en-CA').format(new Date()),
        }
    },
    computed: {
        fa_dyn() {
			return this.dark ? 'fa-solid' : 'fa-light';
		},
        dark() {
            return this.$store.state.settings.theme === 'dark';
        },
        currentSelect() {
            return this.$store.state.data.currentSelect;
        },
        others() {
            return [{
                title: 'home.label.danmaku',
                req: 'danmaku',
                data: [ 'liveDanmaku', 'historyDanmaku' ]
            }, {
                title: 'home.downloadOptions.others',
                req: 1,
                data: [ 'cover', 'aiSummary' ]
            }];
        }
    },
    methods: {
        getSize() {
            const playUrlInfo = this.playUrlInfo as DashInfo;
            if (playUrlInfo?.video && playUrlInfo.video) {
                const info = playUrlInfo.video.find(item => item.id === this.currentSelect.dms);
                return (info && 'size' in info) ? info.size : null;
            } else if (playUrlInfo?.audio && playUrlInfo.audio) {
                const info = playUrlInfo.audio.find(item => item.id === this.currentSelect.ads);
                return (info && 'size' in info) ? info.size : null;
            }
		},
        getButtons(option: keyof typeof this.currentSelect, options?: { icon?: boolean }) {
            if (this.currentSelect.fmt === -1) {
                const playUrlInfo = this.playUrlInfo as MusicUrlInfo;
                switch (option) {
                    case 'dms': return options?.icon ? 'video' : [];
                    case 'ads': return options?.icon ? 'audio' : playUrlInfo.audio.map(item => item.id);
                    case 'cdc': return options?.icon ? 'code' : [];
                    case 'fmt': return options?.icon ? 'code' : [];
                }
            } else {
                const playUrlInfo = this.playUrlInfo as DashInfo;
                switch (option) {
                    case 'dms': return options?.icon ? 'video' : playUrlInfo.video ? [...new Set(playUrlInfo.video.map(item => item.id))] : [];
                    case 'ads': return options?.icon ? 'audio' : playUrlInfo.audio ? playUrlInfo.audio.map(item => item.id) : [];
                    case 'cdc': return options?.icon ? 'code' : playUrlInfo.video ? playUrlInfo.video.filter(item => item.id === this.currentSelect.dms).map(item => item.codecid) : [];
                    case 'fmt': return options?.icon ? 'code' : this.$store.state.data.mediaMap.fmt.map(item => item.id);
                }
            }
        },
        showOption(option: string) {
            switch (option) {
                case 'dms': return 'video' in this.playUrlInfo;
                case 'ads': return 'audio' in this.playUrlInfo;
                case 'cdc': return 'video' in this.playUrlInfo;
                case 'fmt': return this.currentSelect.fmt !== -1;
            }
        },
        formatBytes,
    }
});
</script>

<style lang="scss">
#historyDanmakuDate {
    @apply max-w-36;
    .dp__input {
        @apply text-sm;
    }
    .dp__menu_inner + div {
        display: none;
    }
}
</style>