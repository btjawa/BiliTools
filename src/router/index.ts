import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from '../components/LoginPage.vue';
import HomePage from '../components/HomePage.vue';
import DownPage from '../components/DownPage.vue';
import SettingPage from '../components/SettingPage.vue';

const routes = [
  {
    path: '/login-page',
    name: 'LoginPage',
    component: LoginPage,
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