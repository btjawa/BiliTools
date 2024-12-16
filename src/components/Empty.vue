<template><div class="flex mx-auto my-auto flex-col items-center" v-if="expression">
    <img src="/src/assets/img/empty.png" class="w-64" draggable="false" />
    <span class="desc">{{ $t(text) }}</span>
</div></template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

export default defineComponent({
    props: {
        expression: {
            type: Boolean as PropType<boolean>,
            required: true,
        },
        text: {
            type: String as PropType<string>,
            required: true,
        },
    }
});
</script>