import { createRouter, createWebHistory } from 'vue-router';
import { UserPage, SearchPage, HistoryPage, DownPage, SettingsPage, InfoPage } from '@/views';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/user-page', component: UserPage },
    { path: '/', component: SearchPage },
    { path: '/history-page', component: HistoryPage },
    { path: '/down-page', component: DownPage },
    { path: '/settings-page', component: SettingsPage },
    { path: '/info-page', component: InfoPage },
  ],
});