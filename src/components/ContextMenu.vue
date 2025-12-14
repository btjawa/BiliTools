<template>
  <Transition>
    <ul
      v-if="v.active"
      ref="menu"
      :style="{ top: v.y + 'px', left: v.x + 'px' }"
      class="fixed flex flex-col min-w-36 w-fit shadow-lg rounded-lg"
      @mousedown.prevent
    >
      <button v-for="(t, k) in currentOptions" :key="k" @click="t.action">
        <i :class="['fa-light', t.icon]"></i>
        <span>{{ $t(t.text) }}</span>
      </button>
    </ul>
  </Transition>
</template>

<script lang="ts" setup>
import { readText } from '@tauri-apps/plugin-clipboard-manager';
import { nextTick, onMounted, reactive, ref, computed } from 'vue';

// 文本相关的默认菜单项
const textOptions = [
  {
    icon: 'fa-scissors',
    text: 'contextMenu.cut',
    action: () => document.execCommand('cut'),
  },
  {
    icon: 'fa-copy',
    text: 'contextMenu.copy',
    action: () => document.execCommand('copy'),
  },
  {
    icon: 'fa-paste',
    text: 'contextMenu.paste',
    action: async () => {
      try {
        const elm = document.activeElement as HTMLInputElement;
        const text = await readText();
        if ('selectionStart' in elm && !elm.readOnly && !elm.disabled) {
          const start = elm.selectionStart ?? 0;
          const end = elm.selectionEnd ?? 0;
          elm.value = elm.value.slice(0, start) + text + elm.value.slice(end);
          elm.selectionStart = elm.selectionEnd = start + text.length;
          elm.dispatchEvent(new Event('input'));
        }
      } catch {
        /**/
      }
    },
  },
];

const menu = ref<HTMLElement>();
const v = reactive({
  active: false,
  x: 0,
  y: 0,
});

// 自定义菜单项状态
const customOptions = ref<Array<{
  icon: string;
  text: string;
  action: () => void;
}>>([]);

// 当前显示的菜单项
const currentOptions = computed(() => {
  return customOptions.value.length > 0 ? customOptions.value : textOptions;
});

defineExpose({ init, initWithOptions });

async function init(e: MouseEvent) {
  // 重置为默认文本菜单
  customOptions.value = [];
  await showMenu(e);
}

async function initWithOptions(e: MouseEvent, options: Array<{
  icon: string;
  text: string;
  action: () => void;
}>) {
  // 使用自定义菜单项
  customOptions.value = options;
  await showMenu(e);
}

async function showMenu(e: MouseEvent) {
  close();
  await nextTick();
  v.active = true;
  await nextTick();
  if (!menu.value) return;
  menu.value.animate(
    [{ transform: 'translateY(-50px)' }, { transform: 'translateY(0)' }],
    {
      duration: 200,
      easing: 'cubic-bezier(0.23,0,0,1.32)',
    },
  );
  const w = menu.value.offsetWidth;
  const h = menu.value.offsetHeight;
  v.x = e.clientX + w > window.innerWidth ? e.clientX - w : e.clientX;
  v.y = e.clientY + h > window.innerHeight ? e.clientY - h : e.clientY;
}

function close() {
  v.active = false;
  // 不在这里清除自定义选项，让它们保持到下次设置
}

onMounted(() => document.addEventListener('click', close));
</script>

<style scoped>
@reference 'tailwindcss';

ul {
  @apply overflow-hidden z-10000 bg-(--solid-block-color);
  @apply border border-solid border-(--split-color);
}

button {
  @apply border-none rounded-none text-left;
}
</style>
