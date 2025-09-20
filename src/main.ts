import { createApp } from 'vue';
import { AppError } from './services/error';
import store from './store';
import router from './router';
import i18n from './i18n';
import App from './App.vue';

import { getVersion as getAppVersion } from '@tauri-apps/api/app';
import Toast, { PluginOptions, POSITION } from 'vue-toastification';
import VueDatePicker from '@vuepic/vue-datepicker';

import '@/style.css';
import 'vue-toastification/dist/index.css';
import '@vuepic/vue-datepicker/dist/main.css';

const ToastOptions: PluginOptions = {
  transition: 'Vue-Toastification__fade',
  position: POSITION.TOP_CENTER,
  draggable: false,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  closeButton: 'button',
  closeOnClick: false,
  maxToasts: 20,
  newestOnTop: true,
  icon: true,
};

window.onerror = (_, __, ___, ____, e) => {
  if (e) new AppError(e, { name: 'WindowError' }).handle();
};

window.onrejectionhandled = (e) => {
  new AppError(e.reason, { name: 'HandledRejection' }).handle();
};

window.onunhandledrejection = (e) => {
  new AppError(e.reason, { name: 'UnhandledRejection' }).handle();
};

createApp(App)
  .use(store)
  .use(router)
  .use(i18n)
  .use(Toast, ToastOptions)
  .component('VueDatePicker', VueDatePicker)
  .mount('#app');

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
