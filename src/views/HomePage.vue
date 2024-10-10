<template><div>
    <div class="search_input flex">
        <input
			type="text" placeholder="链接/AV/BV/SS/EP/AU号..."
			@keydown.enter="search" autocomplete="off" spellcheck="false"
			v-model="searchInput"
		/>
        <button class="fa-solid fa-search" @click="search"></button>
    </div>
</div></template>

<script lang="ts">
export default {
	methods: {
		async search() {
			console.log(this.searchInput)
		}
	},
	data() {
		return {
			searchInput: '',
		}
	}
}
</script>

<style lang="scss">
.search_input {
	height: 52px;
	width: 768px;
	border-radius: 26px;
	padding: 10px;
	background-color: var(--block-color);
	input {
		width: 100%;
		margin-right: 10px;
		border-radius: 16px;
	}
	button {
		background-color: var(--desc-color);
		border-radius: 50%;
		color: var(--block-color);
	}
}
</style>