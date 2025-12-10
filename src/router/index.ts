import { createRouter, createWebHistory } from 'vue-router';
import {
  UserPage,
  SearchPage,
  HistoryPage,
  DownPage,
  SettingsPage,
  InfoPage,
  CacheImportPage,
  CacheListPage,
} from '@/views';

export const routes = [
  {
    path: '/user-page',
    name: 'userPage',
    component: UserPage,
  },
  {
    path: '/',
    name: 'searchPage',
    component: SearchPage,
  },
  {
    path: '/history-page',
    name: 'historyPage',
    component: HistoryPage,
  },
  {
    path: '/down-page',
    name: 'downPage',
    component: DownPage,
  },
  {
    path: '/settings-page',
    name: 'settingsPage',
    component: SettingsPage,
  },
  {
    path: '/info-page',
    name: 'infoPage',
    component: InfoPage,
  },
  {
    path: '/cache-import',
    name: 'cacheImportPage',
    component: CacheImportPage,
  },
  {
    path: '/cache-list',
    name: 'cacheListPage',
    component: CacheListPage,
  },
] as const;

export default createRouter({
  history: createWebHistory(),
  routes,
});
