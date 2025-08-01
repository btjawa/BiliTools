import { createI18n } from "vue-i18n";
import zhCN from './locales/zh-CN.json';
import zhHK from './locales/zh-HK.json';
import enUS from './locales/en-US.json';
import jaJP from './locales/ja-JP.json';

export const locales = [
    { id: 'zh-CN', name: '简体中文 🇨🇳', msg: zhCN },
    { id: 'zh-HK', name: '繁體中文 🇭🇰', msg: zhHK },
    { id: 'en-US', name: 'English 🇺🇸', msg: enUS },
    { id: 'ja-JP', name: '日本語 🇯🇵', msg: jaJP }
]

export default createI18n({
    legacy: false,
    fallbackLocale: 'zh-CN',
    locale: 'zh-CN', // DEV ONLY!!!
    messages: Object.fromEntries(
        locales.map(loc => [loc.id, loc.msg])
    )
});