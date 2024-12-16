<template><div>
    <Empty :expression="true" text="common.wip" />
</div></template>

<script lang="ts">
import Empty from '@/components/Empty.vue';

export default {
    components: {
        Empty
    }
}
</script>