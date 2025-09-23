<template>
  <div
    ref="dropper"
    :class="{ active: v.active }"
    class="absolute popup w-[calc(100vw-56px)]"
  >
    <Transition name="slide">
      <div v-if="v.active" class="inner flex flex-col items-center">
        <i class="fa-solid fa-download"></i>
        <h1>{{ $t('drag.title') }}</h1>
      </div>
    </Transition>
  </div>
</template>

<script lang="ts" setup>
import { useSettingsStore } from '@/store';
import { inject, reactive, Ref } from 'vue';
import { parseId, waitPage } from '@/services/utils';
import SearchPage from '@/views/SearchPage.vue';
import router from '@/router';

const settings = useSettingsStore();
const v = reactive({
  active: false,
});

const searchPage = inject<Ref<InstanceType<typeof SearchPage>>>('page');

window.addEventListener('dragenter', (e) => {
  e.preventDefault();
  const data = e.dataTransfer;
  if (!data || !settings.drag_search) return;
  if (e.dataTransfer.types.some((v) => v.startsWith('text/'))) {
    v.active = true;
  }
});

window.addEventListener('dragover', (e) => {
  e.preventDefault();
});

window.addEventListener('drop', async (e) => {
  e.preventDefault();
  const data = e.dataTransfer;
  if (!data || !settings.drag_search) return;
  v.active = false;
  let text;
  for (const t of data.types) {
    try {
      const res = e.dataTransfer.getData(t);
      await parseId(res);
      text = res;
      break;
    } catch {
      /**/
    }
  }
  if (!text) return;
  router.push('/');
  const page = await waitPage(searchPage, 'search');
  page.value.search(text);
});

window.addEventListener('dragleave', (e) => {
  const target = e.relatedTarget as HTMLElement;
  if (!target || !document.documentElement.contains(target)) {
    v.active = false;
  }
});
</script>

<style scoped>
@reference 'tailwindcss';
.inner {
  @apply rounded-2xl p-8 border-2 border-dashed border-(--primary-color) text-(--content-color);
  i {
    @apply text-4xl text-(--primary-color) mb-4;
  }
}
</style>
