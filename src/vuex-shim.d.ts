import { ComponentCustomProperties } from 'vue'
import { Store } from 'vuex'
import store from '@/store'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $store: Store<typeof store.state>
  }
}