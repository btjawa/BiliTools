import DefaultTheme from "vitepress/theme";
import { Theme } from 'vitepress';
import { inject } from "@vercel/analytics";
import '@fortawesome/fontawesome-free/css/all.min.css'
import './custom.css';

const theme: Theme = {
    ...DefaultTheme,
    enhanceApp(ctx) {
        DefaultTheme.enhanceApp?.(ctx);
        if (!(window as any).__vercel_analytics_injected__) {
            inject();
            (window as any).__vercel_analytics_injected__ = true
        }
    }
}

export default theme;