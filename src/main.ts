import { createApp } from 'vue';
import { getVersion as getAppVersion } from '@tauri-apps/api/app';
import App from './App.vue';
import router from '@/router';
import store from '@/store';
import i18n from '@/i18n';
import '@/assets/css/style.css';

const app = createApp(App);
app.use(store).use(router).use(i18n).mount('#app');

getAppVersion().then(version => {
    console.log('\n' + ' %c BiliTools v' + version + ' %c https://btjawa.top/bilitools ' + '\n', 'color: rgb(233,233,233) ; background: rgb(212,78,125); padding:5px 0;', 'background: #fadfa3; padding:5px 0;');
});