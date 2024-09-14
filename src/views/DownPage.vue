<template><div>
    <div class="down-page__tab_wp">
        <button :class="['down-page__tab_btn', { 'active': tab == Queue.Waiting }]" @click="tab = Queue.Waiting"> 等待中 </button>
        <div class="down-page__small_split"></div>
        <button :class="['down-page__tab_btn', { 'active': tab == Queue.Doing }]" @click="tab = Queue.Doing"> 进行中 </button>
        <div class="down-page__small_split"></div>
        <button :class="['down-page__tab_btn', { 'active': tab == Queue.Complete }]" @click="tab = Queue.Complete"> 完成 </button>
    </div>
    <div class="down-page__main_split"></div>
    <div v-show="tab == cont" class="down-page__container" v-for="cont in [Queue.Waiting, Queue.Doing, Queue.Complete]" :class="cont">
        <img src="@/assets/img/empty.png" draggable="false" v-show="!Object.keys(store.state.queue?.[cont])?.length" />
        <div class="down-page__container_item" v-for="item in queue[cont]">
            {{ item?.title }}
        </div>
    </div>
</div></template>

<script lang="ts">
import store from '@/store';
import { Queue } from '@/types/DataTypes';

export default {
    data() {
        return {
            tab: Queue.Waiting,
            store,
            Queue
        }
    },
    computed: {
        queue() {
            return store.state.queue;
        }
    }
};
</script>

<style lang="scss" scoped>
.page {
    flex-direction: column;
}
button {
	background: 0 0;
	transition: color .2s,background .2s;
}
.down-page__tab_wp {
    display: flex;
    align-items: center;
    margin-bottom: 25px;
}
.down-page__tab_btn {
    font-size: 18px;
    &.active {
        color: var(--primary-color);
    }
}
.down-page__main_split,.down-page__small_split {
	background: var(--split-color);
    width: 70%;
    height: 1px;
}
.down-page__small_split {
    height: 20px;
	margin: 0 21px;
    height: 70%;
	width: 1px;
}
.down-page__container {
    height: 70vh;
    display: flex;
    justify-content: center;
    margin-top: 25px;
    border: 1px white solid;
    img {
        width: 280px;
        height: 200px;
        align-self: center;
    }
}
</style>