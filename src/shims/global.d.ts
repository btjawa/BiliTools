import { Reactive } from 'vue';

// @ts-ignore: works on Vue 3, fails in Vue 2
declare module 'vue' {
  // This seems to be needed to not break auto import types based on the order
  // https://github.com/vuejs/pinia/pull/2730
  interface GlobalComponents {}
  interface ComponentCustomProperties {
    $fa: Reactive<{
      /**
       * Gets dynamic weight for font-awesome
       */
      weight: string;
      /**
       * Gets the current dark state
       */
      isDark: boolean;
    }>
  }
}

// normally this is only needed in .d.ts files
export {}
