<template><div>
    <div ref="searchInput" :style="{ 'top': searchActive ? '13px' : 'calc(50% - 13px)' }"
		class="search_input absolute flex h-[52px] w-[640px] rounded-[26px] p-2.5 bg-[color:var(--block-color)]"
	>
        <input
			type="text" placeholder="哔哩哔哩链接/AV/BV/SS/EP/AU号..."
			@keydown.enter="search" @keydown.esc.stop="searchActive = false; mediaRootActive = false"
			autocomplete="off" spellcheck="false"
			@input="searchInput=searchInput.replace(/[^a-zA-Z0-9-._~:/?#@!$&'()*+,;=%]/g, '')"
			v-model="searchInput" class="w-full mr-2.5 rounded-2xl"
		/>
        <button @click="search"
			class="fa-solid fa-search bg-[color:var(--desc-color)] rounded-[50%] text-[var(--block-color)]"
		></button>
    </div>
	<div :style="{ 'opacity': mediaRootActive ? 1 : 0, 'pointerEvents': mediaRootActive ? 'all' : 'none' }"
		class="media_root absolute top-[78px] w-[768px] h-[calc(100%-93px)]"
	>
		<div class="media_info flex w-full h-40 bg-[color:var(--block-color)] mb-[13px] rounded-lg p-4 gap-4">
			<img :src="mediaInfo.cover" draggable="false" class="object-cover rounded-lg" />
			<div class="info__details text h-full w-full">
				<h3 class="w-[calc(100%-64px)] text-lg">{{ mediaInfo.title }}</h3>
				<div v-if="mediaInfo.upper && mediaInfo.upper.avatar" @click="shell.open('https://space.bilibili.com/' + mediaInfo.upper.mid)"
					class="user absolute flex flex-col items-center top-4 right-4 cursor-pointer"
				>
					<img :src="mediaInfo.upper?.avatar" class="w-9 rounded-[50%]" />
					<span class="text-xs ellipsis max-w-16 mt-1">{{ mediaInfo.upper.name }}</span>
				</div>
				<div class="stat text-xs flex gap-3 mt-1.5 text-[var(--desc-color)]">
					<div v-if="mediaInfo.stat" class="stat_item flex" v-for="([key, value]) in Object.entries(mediaInfo.stat)">
						<i class="bcc-iconfont mr-1" :class="iconMap[key as keyof typeof iconMap]"></i>
						<span>{{ stat(value ?? '') }}</span>
					</div>
				</div>
				<span class="w-[calc(100%-64px)] text-sm block mt-2" v-html="mediaInfo.desc"></span>
			</div>
		</div>
		<div class="media_list flex flex-col gap-0.5 overflow-auto max-h-[468px]"
			:style="{ 'transform': mediaRootActive ? 'translateY(0)' : 'translateY(24px)' }"
		>
			<div v-for="(item, index) in mediaInfo.list"
				class="list__item flex items-center rounded-lg h-12 text-sm p-4 bg-[color:var(--block-color)]"
			>
				<span class="min-w-6">{{ index + 1 }}</span>
				<div class="w-px h-full bg-[color:var(--split-color)] mx-4"></div>
				<span class="flex flex-1 ellipsis">{{ item.title }}</span>
				<div class="w-px h-full bg-[color:var(--split-color)] mx-4"></div>
				<div class="flex gap-2">
					<button @click="updateDash(index).then(_ => popupActive = 1)">
						<i class="fa-solid fa-file-arrow-down"></i>
						<span>下载音视频</span>
					</button>
					<button @click=""> 
						<i class="fa-solid fa-file-export"></i>
						<span>下载其他</span>
					</button>
				</div>
			</div>
		</div>
	</div>
	<div @click="popupActive = 0" :style="{ 'opacity': popupActive ? 1 : 0, 'pointerEvents': popupActive ? 'all' : 'none' }"
		class="popup_container absolute flex items-center justify-center w-full h-full bg-opacity-50 bg-black cursor-pointer"
	>
		<div @click.stop
			class="popup min-w-[768px] relative h-96 p-4 rounded-xl bg-[color:var(--block-color)] cursor-default"
		>
			<template v-if="playUrlInfo.video">
				<h3 class="block mb-2">分辨率/画质</h3>
				<div class="flex gap-1">
					<button v-for="id in [...(new Set(playUrlInfo.video.map(item => item.id)))]"
						:class="{ 'selected': currentSelect.video_quality === id }"
						@click="currentSelect.video_quality = id"
					>
						<!-- <i :class="[ 'fa-solid', id >= 64 ? 'fa-high-definition' : 'fa-standard-definition' ]"></i> -->
						<i class="fa-solid fa-file-video"></i>
						<span>{{ mediaMap.dms.find(map => map.id === id)?.label }}</span>
					</button>
				</div>
				<hr class="my-[15px]" />
			</template>
			<template v-if="'audio' in playUrlInfo && playUrlInfo.audio">
				<h3 class="block mb-2">比特率/音质</h3>
				<div class="flex gap-1">
					<button v-for="id in playUrlInfo.audio.map(item => item.id)"
						:class="{ 'selected': currentSelect.audio_quality === id }"
						@click="currentSelect.audio_quality = id"
					>
						<i class="fa-solid fa-file-audio"></i>
						<span>{{ mediaMap.ads.find(map => map.id === id)?.label }}</span>
					</button>
				</div>
				<hr class="my-[15px]" />
			</template>
			<template v-if="playUrlInfo.video">
				<h3 class="block mb-2">编码格式</h3>
				<div class="flex gap-1">
					<button v-for="item in playUrlInfo.video.filter(item => item.id === currentSelect.video_quality)"
						:class="{ 'selected': currentSelect.video_codec === item.codecid }"
						@click="currentSelect.video_codec = item.codecid"
					>
						<i class="fa-solid fa-file-code"></i>
						<span>{{ mediaMap.cdc.find(map => map.id === item.codecid)?.label }}</span>
					</button>
				</div>
				<hr class="my-[15px]" />
			</template>
			<h3 class="block mb-2">
				流媒体格式
				<i @click="shell.open('https://www.btjawa.top/bilitools#关于-DASH-FLV-MP4')"
					class="fa-regular fa-circle-question question"
				></i>
			</h3>
			<div class="flex gap-1">
				<button
					:class="{ 'selected': stream_codec === 0 }"
					@click="stream_codec = 0"
				>
					<i class="fa-solid fa-file-code"></i>
					<span>DASH 格式</span>
				</button>
				<button
					:class="{ 'selected': stream_codec === 1 }"
					@click="stream_codec = 1"
				>
					<i class="fa-solid fa-file-code"></i>
					<span>MP4 格式</span>
				</button>
			</div>
			<span v-if="typeof getSize() === 'number'"
				class="absolute bottom-4 right-[100px] leading-8 desc"
			>
				~ {{ formatBytes(getSize() as number) }}
			</span>
			<button @click="pushBackQueue()"
				class="absolute bottom-4 right-4 bg-[color:var(--primary-color)]"
			>
				<i class="fa-solid fa-right"></i>
				<span>确认</span>
			</button>
		</div>
	</div>
</div></template>

<script lang="ts">
import * as data from '@/services/data';
import * as shell from '@tauri-apps/plugin-shell';
import { ApplicationError, stat, formatBytes, parseId } from '@/services/utils';
import { DashInfo, DurlInfo, StreamCodecType } from '@/types/DataTypes';
import store from '@/store';

export default {
	data() {
		return {
			searchInput: '',
			searchActive: false,
			mediaRootActive: false,
			popupActive: 0,
			iconMap: {
				'play': 'bcc-icon-icon_list_player_x1',
				'danmaku': 'bcc-icon-danmuguanli',
				'reply': 'bcc-icon-pinglunguanli',
				'like': 'bcc-icon-ic_Likesx',
				'coin': 'bcc-icon-icon_action_reward_n_x',
				'favorite': 'bcc-icon-icon_action_collection_n_x',
				'share': 'bcc-icon-icon_action_share_n_x'
			},
			currentSelect: {
				video_quality: this.$store.state.settings.df_dms,
				video_codec: this.$store.state.settings.df_cdc,
				audio_quality: this.$store.state.settings.df_ads,
			},
			stream_codec: 0,
			index: 0,
			playUrlInfo: {} as DashInfo | DurlInfo,
			shell,
			store: store.state,
		}
	},
	computed: {
		mediaInfo() {
			return this.store.data.mediaInfo;
		},
		mediaMap() {
			return this.store.data.mediaMap;
		},
	},
	watch: {
		stream_codec(newCodec, oldCodec) {
			if (newCodec === oldCodec) return;
			newCodec ? this.updateDurl(this.index) : this.updateDash(this.index);
		}
    },
	methods: {
		async search() {
			if (!this.searchInput) return null;
			this.mediaRootActive = false;
			this.searchActive = false;
			try {
				this.$store.commit('updateState', { 'data.mediaInfo': {} });
				this.searchActive = true;
				const { id, type } = await parseId(this.searchInput);
				const info = await data.getMediaInfo(id, type);
				console.log(info)
				this.$store.commit('updateState', { 'data.mediaInfo': info });
				this.mediaRootActive = true;
			} catch(err) {
				err instanceof ApplicationError ? err.handleError() :
				new ApplicationError(err as string).handleError();
				this.mediaRootActive = false;
				this.searchActive = false;
			}
		},
		updateDefault(ids: number[], df: keyof typeof this.store.settings, opt: keyof typeof this.currentSelect) {
			this.currentSelect[opt] = ids.includes(this.store.settings[df] as number) ? this.store.settings[df] : ids[0];
		},
		async updateDash(index: number) {
			try {
				for (const key in this.playUrlInfo) this.playUrlInfo[key as keyof typeof this.playUrlInfo] = null as any;
				this.stream_codec = 0;
				this.index = index;
				const info = await data.getPlayUrl(this.mediaInfo.list[index], this.mediaInfo.type, StreamCodecType.Dash);
				this.$store.commit('updateState', { 'data.dashInfo': info });
				this.playUrlInfo = info as DashInfo;
				this.updateDefault(this.playUrlInfo.video.map(item => item.id), "df_dms", "video_quality");
				this.updateDefault(this.playUrlInfo.audio.map(item => item.id), "df_ads", "audio_quality");
				this.updateDefault(this.playUrlInfo.video.map(item => item.codecid), "df_cdc", "video_codec");
			} catch(err) {
				err instanceof ApplicationError ? err.handleError() :
				new ApplicationError(err as string).handleError();
			}
		},
		async updateDurl(index: number) {
			try {
				for (const key in this.playUrlInfo) this.playUrlInfo[key as keyof typeof this.playUrlInfo] = null as any;
				this.stream_codec = 1;
				this.index = index;
				const info = await data.getPlayUrl(this.mediaInfo.list[index], this.mediaInfo.type, StreamCodecType.Mp4);
				this.$store.commit('updateState', { 'data.durlInfo': info });
				this.playUrlInfo = info as DurlInfo;
				this.updateDefault(this.playUrlInfo.video.map(item => item.id), "df_dms", "video_quality");
				this.updateDefault(this.playUrlInfo.video.map(item => item.codecid), "df_cdc", "video_codec");
			} catch(err) {
				err instanceof ApplicationError ? err.handleError() :
				new ApplicationError(err as string).handleError();
			}
		},
		async pushBackQueue() {
			this.popupActive = 0;
			try {
				const video = this.playUrlInfo.video.find(item => item.id === this.currentSelect.video_quality && item.codecid === this.currentSelect.video_codec);
				const audio = (this.playUrlInfo as DashInfo).audio ? (this.playUrlInfo as DashInfo).audio.find(item => item.id === this.currentSelect.audio_quality) : null;
				await data.pushBackQueue({ info: this.mediaInfo.list[this.index], video, ...(audio && { audio }) });
				this.$router.push('/down-page');
			} catch(err) {
				err instanceof ApplicationError ? err.handleError() :
				new ApplicationError(err as string).handleError();
			}
		},
		getSize() {
			if (!this.playUrlInfo.video) return null;
			const info = this.playUrlInfo.video.find(item => item.id === this.currentSelect.video_quality);
			if (info && 'size' in info) { return info.size }
			else { return null }
		},
		stat,
		formatBytes,
	},
}
</script>

<style lang="scss">
.search_input, .media_root, .media_list, .popup_container {
	transition: top .3s cubic-bezier(0,1,.6,1), opacity .2s, transform .5s cubic-bezier(0,1,.6,1);
}
.info__details {
	h3, & > span {
        @apply overflow-hidden text-ellipsis;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
    }
}
</style>