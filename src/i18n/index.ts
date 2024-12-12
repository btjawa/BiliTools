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

export default createI18n({
    legacy: false,
    locale: window.navigator.language,
    fallbackLocale: 'en-US',
    messages: await loadLanguage()
});