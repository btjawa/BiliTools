import { ComponentCustomProperties } from 'vue';
import { Store } from 'vuex'
import { I18n } from 'vue-i18n';
import store from '@/store'

import type {
  ComponentCustomOptions as _ComponentCustomOptions,
  ComponentCustomProperties as _ComponentCustomProperties,
} from 'vue';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $i18n: I18n['global'];
    $t: (key: string, ...args: any[]) => string;
    $store: Store<typeof store.state>
  }
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties extends _ComponentCustomProperties {}
  interface ComponentCustomOptions extends _ComponentCustomOptions {}
}
