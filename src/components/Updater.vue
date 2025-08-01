<template>
<div
    class="absolute page"
    v-if="active"
>

</div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

const active = ref(false);
</script>