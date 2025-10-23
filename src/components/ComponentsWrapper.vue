<template>
  <Teleport to="#main" defer>
    <component
      :is="Comp"
      v-for="(Comp, key) in componentMap"
      :key="key"
      :ref="(el) => store.regComponent(key, shallowRef(el as any))"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import { useComponentsStore, componentMap } from '@/store/components';
import { shallowRef } from 'vue';

const store = useComponentsStore();
</script>
