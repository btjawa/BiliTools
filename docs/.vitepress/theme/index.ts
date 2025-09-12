import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './custom.css';

const theme: Theme = {
  ...DefaultTheme,
  enhanceApp(ctx) {
    DefaultTheme.enhanceApp?.(ctx);
    if (typeof window === 'undefined') return;
    if (!(window as any).__va_first_pv__) {
      (window as any).va?.('pageview');
      (window as any).__va_first_pv__ = true;
    }
    const prev = ctx.router.onAfterRouteChange;
    ctx.router.onAfterRouteChange = async (to) => {
      if (prev) await prev(to);
      (window as any).va?.('pageview');
    };
  },
};

export default theme;
