<template>
<div class="home-page" @keydown.esc="searchElm.isActive = false;">
    <div class="search" :class="{ 'active': searchElm.isActive }">
        <input class="search__input" type="text" placeholder="链接/AV/BV/SS/EP/AU号..."
        @keydown.enter="search" autocomplete="off" spellcheck="false" v-model="searchElm.input">
        <i class="fa-solid fa-search search__btn" @click="search"></i>
    </div>
</div>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';
import * as verify from "../scripts/verify";
export default defineComponent({
    setup() {
        const searchElm = reactive({
            input: '',
            isActive: false,
        });
        function search() {
            if (verify.id(searchElm.input).type) {
                searchElm.isActive = true;
            } else searchElm.isActive = false;
        }
        return { searchElm, search }
    },
});
</script>

<style scoped>
.search,
.search__input,
.search__btn {
    color: var(--content-color);
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    border-radius: 30px;
    background: none;
    outline: none;
    border: none;
    margin: 0;
    transition: background 0.4s, font-size 0.4s, color 0.4s, box-shadow 0.4s, margin-top 0.5s cubic-bezier(0,1,.6,1);
}

.search {
    background: #3B3B3B;
    width: 680px;
    height: 43px;
    box-shadow: 0 0 3px 3px #2a2a2a;
}

.search.active {
    margin-top: -49%;
}

.search__input {
    width: 100%;
    height: 40px;
    font-size: 14px;
    user-select: none;
}

.search__input:hover {
    font-size: 15px;
}

.search__btn {
    color: #757575;
    width: 50px;
    height: 100%;
    padding: 10px;
    cursor: pointer;
}

.search__btn:hover {
    background: #5c5c5c9d;
}

.search:focus-within {
    background: var(--content-color);
}

.search:focus-within .search__input {
    color: #3b3b3b;
}
</style>