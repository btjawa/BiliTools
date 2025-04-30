import { createI18n } from "vue-i18n";

export async function loadLanguage() {
    const modules = import.meta.glob('../locales/*/*.json');
    const messages: Record<string, any> = {};
    for (const path in modules) {
        if (path.includes('locales/index.json')) {
            continue;
        }
        const parts = path.split('/');
        const code = parts[2];
        if (!messages[code]) {
            messages[code] = {};
        }
        const module = await modules[path]() as { default: Record<string, any> };
        messages[code][parts[3].split('.')[0]] = module.default;
    }
    return messages;
}

export const locales = [
    { "id": "zh-CN", "name": "简体中文 🇨🇳" },
    { "id": "zh-HK", "name": "繁體中文 🇭🇰" },
    { "id": "en-US", "name": "English 🇺🇸" },
    { "id": "ja-JP", "name": "日本語 🇯🇵" }
]

export default createI18n({
    legacy: false,
    locale: window.navigator.language,
    fallbackLocale: 'zh-CN',
    messages: await loadLanguage()
});