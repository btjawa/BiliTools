<template>
    <div class="popup-wrapper" v-show="active" :style="{ opacity }" @click="closePopup(false, $event)">
        <div class="popup" ref="popup">
            <button @click="closePopup(false)" class="close"><i class="fa-regular fa-close"></i></button>
            <span>分辨率/画质</span>
            <hr />
            <section>
                <button v-for="dms of mediaProfile.dms" @click="currSel.dms = dms" :class="{ 'checked': currSel.dms == dms }">
                    <i :class="['fa-solid', dms >= 64 ? 'fa-high-definition' : 'fa-standard-definition']"></i>
                    <span>{{ store.data.mediaMap.dms.find(item => item.id === dms)?.label || dms }}</span>
                </button>
            </section>
            <span>比特率/音质</span>
            <hr />
            <section>
                <button v-for="ads of mediaProfile.ads" @click="currSel.ads = ads" :class="{ 'checked': currSel.ads == ads }">
                    <i class="fa-solid fa-file-audio"></i>
                    <span>{{ store.data.mediaMap.ads.find(item => item.id === ads)?.label || ads }}</span>
                </button>
            </section>
            <span>编码格式</span>
            <hr />
            <section>
                <button v-for="cdc of mediaProfile.cdc" @click="currSel.cdc = cdc" :class="{ 'checked': currSel.cdc == cdc }">
                    <i class="fa-solid fa-file-code"></i>
                    <span>{{ store.data.mediaMap.cdc.find(item => item.id === cdc)?.label || cdc }}</span>
                </button>
            </section>
            <button @click="closePopup(true)" class="confirm">
                <i class="fa-solid fa-right"></i>
                确认
            </button>
            <div class="dis-placeholder">
                当前选择:
                {{ store.data.mediaMap.dms.find(item => item.id === currSel.dms)?.label }},
                {{ store.data.mediaMap.ads.find(item => item.id === currSel.ads)?.label }},
                {{ store.data.mediaMap.cdc.find(item => item.id === currSel.cdc)?.label }}
            </div>
        </div>
    </div>
</template>
  
<script lang="ts">
import { defineComponent } from 'vue';
import store from '@/store';

export default defineComponent({
    data() {
        return {
            active: false,
            opacity: 0,
            store: store.state,
            currSel: { dms: 16, ads: 30216, cdc: 7 },
            resolve: null as ((value: any) => void) | null
        };
    },
    computed: {
        mediaProfile() { return store.state.data.mediaProfile },
    },
    methods: {
        async newPopup(): Promise<typeof this.currSel> {
            this.active = true;
            this.$nextTick(() => requestAnimationFrame(() => this.opacity = 1));
            document.addEventListener('keydown', this.handleEsc, { capture: true });
            this.currSel = {
                dms: this.getCurr("dms"),
                ads: this.getCurr("ads"),
                cdc: this.getCurr("cdc"),
            }
            return new Promise((resolve) => {
                this.resolve = resolve;
            });
        },
        closePopup(result: boolean, event?: MouseEvent) {
            if ((this.$refs.popup as HTMLElement).contains(event?.target as Node)) return null;
            if (result && this.resolve) {
                this.resolve(this.currSel);
                this.resolve = null;
            }
            this.opacity = 0;
            setTimeout(() => this.active = false, 200);
            document.removeEventListener('keydown', this.handleEsc, { capture: true });
        },
        handleEsc(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                event.stopPropagation();
                this.closePopup(false);
            }
        },
        getCurr(id: string) {
            const storeId = store.state.data.mediaProfile[id as keyof typeof store.state.data.mediaProfile];
            const df = store.state.settings['df_' + id as keyof typeof store.state.settings] as number;
            const maxId = Math.max(...storeId);
            return maxId > df ? df : maxId;
        }
    }
});
</script>

<style scoped lang="scss">
.popup {
    position: relative;
    border: 1px solid var(--split-color);
    background: var(--section-color);
    padding: 20px;
    width: 900px;
    height: 400px;
    display: flex;
    flex-direction: column;
    border-radius: var(--block-radius);
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    .dis-placeholder {
        font-size: 14px;
    }
}
.popup-wrapper {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 98;
    background: rgba(0, 0, 0, 0.4);
    transition: opacity 0.2s;
    display: flex;
    justify-content: center;
    align-items: center;
}
button.close,
button.confirm {
    position: absolute;
}
button.close {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: none;
    top: 10px;
    right: 10px;
}
button.confirm {
    right: 20px;
    bottom: 20px;
}
button {
    padding: 6px 8px;
}
section button,
button.confirm {
    border-radius: var(--block-radius);
    display: flex;
    align-items: center;
    gap: 8px;
}
section button.checked,
button.confirm:hover {
    background: #505050;
}
section button:hover {
    background: #2b2b2b;
}
button i {
    font-size: 14px;
}
button span {
    font-size: 13px;
}
section {
    display: flex;
    gap: 4px;
    margin-bottom: 22.4px;
}
button:hover {
    background: var(--block-color);
}
</style>