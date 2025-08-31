<template>
<Transition name="fade">
<div v-if="isVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
  <div class="bg-[var(--solid-block-color)] rounded-lg shadow-xl max-w-2xl w-full mx-4 min-h-[280px] overflow-hidden" @click.stop>
    <!-- Header -->
    <div class="flex items-center justify-between p-5 border-b border-[var(--split-color)]">
      <div class="flex items-center">
        <i :class="[$fa.weight, 'fa-clipboard-list text-lg']" style="color: var(--primary-color)"></i>
        <span class="ml-3 font-semibold text-lg text-[var(--content-color)]">{{ t('settings.clipboard.dialog.title') }}</span>
      </div>
      <button 
        @click="close"
        class="p-2 rounded-full hover:bg-[var(--button-color)] transition-colors text-[var(--content-color)]"
        :title="t('settings.clipboard.dialog.cancel')"
      >
        <i class="fa-solid fa-times"></i>
      </button>
    </div>

    <!-- Content -->
    <div v-if="clipboardInfo" class="p-4">
      <p class="text-sm text-[var(--desc-color)] mb-4 text-center">
        {{ t('settings.clipboard.dialog.detected') }}
      </p>
      
      <!-- Media Info  -->
       <div class="flex w-full min-h-36 h-36 bg-[color:var(--block-color)] rounded-lg p-4 gap-4 text-[color:var(--content-color)]">
        <img 
          v-if="cover"
          :src="cover" 
          :alt="getTitle()"
          class="object-cover rounded-lg"
        />
        <div 
          v-else
          class="w-32 h-28 bg-[var(--button-color)] rounded-lg flex items-center justify-center"
        >
          <i :class="[$fa.weight, 'fa-image text-2xl']" style="color: var(--desc-color)"></i>
        </div>
        
                 <div class="text flex flex-col flex-1 min-w-0">
           <h2 class="text-lg ellipsis">{{ getTitle() }}</h2>
          
          <!-- Statistics -->
          <div v-if="hasStats()" class="text-xs flex flex-wrap gap-3 mt-1.5 text-[var(--desc-color)]">
            <div v-if="getStat('play')" class="flex flex-nowrap gap-1">
              <i class="bcc-iconfont bcc-icon-icon_list_player_x1"></i>
              {{ getStat('play') }}
            </div>
            <div v-if="getStat('danmaku')" class="flex flex-nowrap gap-1">
              <i class="bcc-iconfont bcc-icon-danmuguanli"></i>
              {{ getStat('danmaku') }}
            </div>
            <div v-if="getStat('reply')" class="flex flex-nowrap gap-1">
              <i class="bcc-iconfont bcc-icon-pinglunguanli"></i>
              {{ getStat('reply') }}
            </div>
            <div v-if="getStat('like')" class="flex flex-nowrap gap-1">
              <i class="bcc-iconfont bcc-icon-ic_Likesx"></i>
              {{ getStat('like') }}
            </div>
            <div v-if="getStat('coin')" class="flex flex-nowrap gap-1">
              <i class="bcc-iconfont bcc-icon-icon_action_reward_n_x"></i>
              {{ getStat('coin') }}
            </div>
            <div v-if="getStat('favorite')" class="flex flex-nowrap gap-1">
              <i class="bcc-iconfont bcc-icon-icon_action_collection_n_x"></i>
              {{ getStat('favorite') }}
            </div>
            <div v-if="getStat('share')" class="flex flex-nowrap gap-1">
              <i class="bcc-iconfont bcc-icon-icon_action_share_n_x"></i>
              {{ getStat('share') }}
            </div>
          </div>
          
          <!-- Media type indicator -->
          <div v-else class="text-xs flex gap-2 mt-1.5 text-[var(--desc-color)]">
            <div class="flex flex-nowrap gap-1">
              <i :class="[$fa.weight, getMediaTypeIcon()]"></i>
              {{ t('mediaType.' + clipboardInfo.mediaInfo.type) }}
            </div>
          </div>
          
                     <!-- Description or URL -->
           <span v-if="getDescription()" class="text-sm line-clamp-3 mt-1.5 ellipsis">{{ getDescription() }}</span>
           <span v-else class="text-xs text-[var(--desc-color)] mt-1.5 break-all line-clamp-2">{{ clipboardInfo.originalUrl }}</span>
        </div>
        
        <!-- User info -->
        <div v-if="getUploader()" class="flex flex-col items-center cursor-pointer">
          <img 
            v-if="avatar"
            :src="avatar" 
            class="w-9 rounded-full"
          />
          <div 
            v-else
            class="w-9 h-9 bg-[var(--button-color)] rounded-full flex items-center justify-center"
          >
            <i :class="[$fa.weight, 'fa-user text-sm']" style="color: var(--desc-color)"></i>
          </div>
                     <span class="text-xs ellipsis max-w-16 mt-1">{{ getUploader()?.name || 'UP主' }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 mt-4">
        <button 
          @click="handleSearch"
          class="flex-1 px-6 py-3 bg-[var(--primary-color)] text-white rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 font-medium"
        >
          <i :class="[$fa.weight, 'fa-search']"></i>
          <span>{{ t('settings.clipboard.dialog.search') }}</span>
        </button>
        <button 
          @click="close"
          class="px-6 py-3 bg-[var(--button-color)] text-[var(--content-color)] rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
        >
          <i :class="[$fa.weight, 'fa-times']"></i>
          <span>{{ t('settings.clipboard.dialog.cancel') }}</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else class="p-12 text-center">
      <div class="animate-spin w-10 h-10 border-3 border-[var(--primary-color)] border-t-transparent rounded-full mx-auto mb-6"></div>
      <p class="text-[var(--desc-color)] text-lg">{{ t('settings.clipboard.dialog.loading') }}</p>
      <p class="text-[var(--desc-color)] text-sm mt-2 opacity-75">{{ t('settings.clipboard.dialog.patience') }}</p>
    </div>
  </div>
</div>
</Transition>
</template>

<script lang="ts" setup>
import { ref, inject, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getBlob, stat } from '@/services/utils';
import type { ClipboardDetection } from '@/services/clipboard';
import type * as Types from '@/types/shared.d';

// Define props
interface Props {
  modelValue?: boolean;
}

// Define emits
interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'search', info: ClipboardDetection): void;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false
});

const emit = defineEmits<Emits>();

// Composables
const router = useRouter();
const { t } = useI18n();
const $fa = inject('$fa', { weight: 'fa-regular', isDark: false });

// Reactive state
const isVisible = ref(props.modelValue);
const clipboardInfo = ref<ClipboardDetection | null>(null);
const cover = ref('');
const avatar = ref('');

// Watch for prop changes
watch(() => props.modelValue, (value) => {
  isVisible.value = value;
});

// Methods
function close() {
  isVisible.value = false;
  emit('update:modelValue', false);
  clipboardInfo.value = null;
  cover.value = '';
  avatar.value = '';
}


function handleSearch() {
  if (clipboardInfo.value) {
    emit('search', clipboardInfo.value);
    // Navigate to search page
    router.push('/').then(() => {
      // The parent component should handle the actual search
      close();
    });
  }
}

function getTitle(): string {
  if (!clipboardInfo.value) return '';
  const mediaInfo = clipboardInfo.value.mediaInfo;
  return mediaInfo.nfo?.showtitle || mediaInfo.list?.[0]?.title || '';
}

function getMediaTypeIcon(): string {
  if (!clipboardInfo.value) return 'fa-video';
  
  const iconMap = {
    'video': 'fa-video',
    'bangumi': 'fa-tv',
    'music': 'fa-music',
    'musicList': 'fa-list-music',
    'lesson': 'fa-graduation-cap',
    'favorite': 'fa-heart'
  };
  
  return iconMap[clipboardInfo.value.mediaInfo.type] || 'fa-video';
}

function getDescription(): string {
  if (!clipboardInfo.value) return '';
  return clipboardInfo.value.mediaInfo.desc || '';
}

function getUploader() {
  if (!clipboardInfo.value) return null;
  return clipboardInfo.value.mediaInfo.nfo?.upper;
}

function hasStats(): boolean {
  if (!clipboardInfo.value) return false;
  const stat = clipboardInfo.value.mediaInfo.stat;
  return !!(stat?.play || stat?.danmaku || stat?.reply || stat?.like || stat?.coin || stat?.favorite || stat?.share);
}

function getStat(key: keyof Types.MediaInfo['stat']): string {
  const statValue = clipboardInfo.value?.mediaInfo.stat?.[key];
  if (!statValue) return '';
  return stat(statValue as number);
}

async function loadCover() {
  if (!clipboardInfo.value?.mediaInfo.nfo?.thumbs?.length) {
    cover.value = '';
    return;
  }
  
  try {
    const thumbUrl = clipboardInfo.value.mediaInfo.nfo.thumbs[0].url;
    cover.value = await getBlob(thumbUrl);
    console.log('[ClipboardDialog] Cover loaded successfully');
  } catch (error) {
    console.warn('[ClipboardDialog] Failed to load cover:', error);
    cover.value = '';
  }
}

async function loadAvatar() {
  const uploader = getUploader();
  if (!uploader?.avatar) {
    avatar.value = '';
    return;
  }
  
  try {
    avatar.value = await getBlob(uploader.avatar + '@64h');
    console.log('[ClipboardDialog] Avatar loaded successfully');
  } catch (error) {
    console.warn('[ClipboardDialog] Failed to load avatar:', error);
    avatar.value = '';
  }
}

// Expose methods
function show(info: ClipboardDetection) {
  console.log('[ClipboardDialog] Showing dialog with info:', info);
  clipboardInfo.value = info;
  cover.value = ''; // Reset cover
  avatar.value = ''; // Reset avatar
  isVisible.value = true;
  emit('update:modelValue', true);
  
  // Load images
  loadCover();
  loadAvatar();
}

defineExpose({
  show,
  close
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-active .bg-\[var\(--solid-block-color\)\],
.fade-leave-active .bg-\[var\(--solid-block-color\)\] {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from .bg-\[var\(--solid-block-color\)\] {
  transform: scale(0.95) translateY(10px);
}

.fade-leave-to .bg-\[var\(--solid-block-color\)\] {
  transform: scale(0.95) translateY(10px);
}

/* MediaInfo styles reuse */
h2 ~ span {
  @apply whitespace-pre-wrap;
  display: -webkit-box;
}
</style> 