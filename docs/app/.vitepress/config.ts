import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'zh-CN',
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN'
    },
    'en-US': {
      label: 'English',
      lang: 'en-US'
    }
  },
  head: [['link', { rel: 'icon', href: '/favicon.ico' }]],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    socialLinks: [
      { icon: 'github', link: 'https://github.com/btjawa/BiliTools' }
    ],
    logo: '/icon.svg',
  }
})
