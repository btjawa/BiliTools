<template>
  <Transition name="slide">
    <div v-if="v.active" class="popup">
      <div class="inner flex flex-col items-center">
        <i class="fa-solid fa-download"></i>
        <h1>{{ $t('drag.title') }}</h1>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import { useComponentsStore, useSettingsStore } from '@/store';
import { reactive } from 'vue';
import { parseId } from '@/services/utils';

const components = useComponentsStore();
const settings = useSettingsStore();
const v = reactive({
  active: false,
});

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
  const page = await components.navigate('searchPage');
  page.search(text);
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
