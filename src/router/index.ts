import { createRouter, createWebHistory } from 'vue-router';
import { UserPage, HomePage, DownPage, SettingPage } from '@/views';

const routes = [
  {
    path: '/user-page',
    name: 'UserPage',
    component: UserPage,
  },
  {
    path: '/',
    name: 'HomePage',
    component: HomePage,
  },
  {
    path: '/down-page',
    name: 'DownPage',
    component: DownPage,
  },
  {
    path: '/setting-page',
    name: 'SettingPage',
    component: SettingPage,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;