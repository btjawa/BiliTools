import { createRouter, createWebHistory } from 'vue-router';
import { UserPage, SearchPage, DownPage, SettingsPage, InfoPage } from '@/views';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/user-page', component: UserPage },
    { path: '/', component: SearchPage },
    { path: '/down-page', component: DownPage },
    { path: '/settings-page', component: SettingsPage },
    { path: '/info-page', component: InfoPage },
  ],
});