import { createRouter, createWebHistory } from 'vue-router';
import { UserPage, SearchPage, DownPage, FavPage, SettingPage } from '@/views';
import { ApplicationError } from '@/services/utils';
import { useAppStore } from "@/store";
import i18n from '@/i18n';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/user-page', component: UserPage },
    { path: '/', component: SearchPage },
    { path: '/down-page', component: DownPage },
    { path: '/fav-page', component: FavPage },
    { path: '/setting-page', component: SettingPage },
  ],
});

router.beforeEach((to, __, next) => {
  if (to.path !== '/' && to.path !== '/setting-page' && !useAppStore().inited) {
    new ApplicationError(i18n.global.t('error.waitInit'), { noStack: true }).handleError();
    next(false);
  } else next()
})

export default router;