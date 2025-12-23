import { createApp } from 'vue';
import { AppError } from './services/error';
import store from './store';
import router from './router';
import i18n from './i18n';
import { PAGINATION } from '@/constants';
import App from './App.vue';

import { getVersion as getAppVersion } from '@tauri-apps/api/app';

import '@/style.css';
import '@vuepic/vue-datepicker/dist/main.css';
import 'vue-sonner/style.css';

window.onerror = (_, __, ___, ____, e) => {
  if (e) new AppError(e, { name: 'WindowError' }).handle();
};

window.onrejectionhandled = (e) => {
  new AppError(e.reason, { name: 'HandledRejection' }).handle();
};

window.onunhandledrejection = (e) => {
  new AppError(e.reason, { name: 'UnhandledRejection' }).handle();
};

createApp(App).use(store).use(router).use(i18n).mount('#app');

const version = await getAppVersion();
console.log(
  '\n' +
    ' %c BiliTools v' +
    version +
    ' %c https://btjawa.top/bilitools ' +
    '\n',
  'color: rgb(233,233,233) ; background: rgb(212,78,125); padding:5px 0;',
  'background: #fadfa3; padding:5px 0;',
);
