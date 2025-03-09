import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { getVersion as getAppVersion } from '@tauri-apps/api/app';
import VueVirtualScroller from 'vue-virtual-scroller'
import VueDatePicker from '@vuepic/vue-datepicker';
import App from './App.vue';
import router from '@/router';
import i18n from '@/i18n';
import Toast, { PluginOptions, POSITION } from "vue-toastification";
import '@/assets/css/style.css';
import "vue-toastification/dist/index.css";
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import '@vuepic/vue-datepicker/dist/main.css'
import '@wcj/markdown-style';

const url = new URL('/node_modules/source-map-support/browser-source-map-support.js', import.meta.url).href;
const script = document.createElement('script');
script.src = url;
script.onload = () => {
    const install = document.createElement('script')
    install.textContent = 'sourceMapSupport.install();';
    document.body.appendChild(install);
};
document.body.appendChild(script);

const ToastOptions: PluginOptions = {
    transition: "Vue-Toastification__fade",
    position: POSITION.TOP_RIGHT,
    draggable: false,
    pauseOnFocusLoss: true,
    pauseOnHover: true,
    closeButton: "button",
    icon: true,
}

const app = createApp(App);
app.use(createPinia()).use(router).use(i18n).use(Toast, ToastOptions);
app.use(VueVirtualScroller).component('VueDatePicker', VueDatePicker);
app.mount('#app');

const version = await getAppVersion();
console.log('\n' + ' %c BiliTools v' + version + ' %c https://btjawa.top/bilitools ' + '\n', 'color: rgb(233,233,233) ; background: rgb(212,78,125); padding:5px 0;', 'background: #fadfa3; padding:5px 0;');