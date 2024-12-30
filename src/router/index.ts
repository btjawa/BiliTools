import { createRouter, createWebHistory } from 'vue-router';
import { UserPage, SearchPage, DownPage, FavPage, SettingPage } from '@/views';

export default createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/user-page',
      name: 'UserPage',
      component: UserPage,
    },
    {
      path: '/',
      name: 'SearchPage',
      component: SearchPage,
    },
    {
      path: '/down-page',
      name: 'DownPage',
      component: DownPage,
    },
    {
      path: '/fav-page',
      name: 'FavPage',
      component: FavPage,
    },
    {
      path: '/setting-page',
      name: 'SettingPage',
      component: SettingPage,
    },
  ],
});