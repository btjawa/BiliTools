import { defineAdditionalConfig } from "vitepress";

export default defineAdditionalConfig({
  lang: 'zh-CN',
  title: 'BiliTools',
  description: '简约 & 轻量的哔哩哔哩工具箱',
  themeConfig: {
    nav: [
      { text: '快速开始', link: '/quick/about', activeMatch: '/quick' },
      { text: '使用说明', link: '/guide/stream', activeMatch: '/guide' },
      { text: '常见问题', link: '/help/windows', activeMatch: '/help' }
    ],

    sidebar: [
      {
        text: '快速开始',
        items: [
          { text: '关于', link: '/quick/about' },
          { text: '下载 & 安装', link: '/quick/install' }
        ]
      },
      {
        text: '使用说明',
        items: [
          { text: '关于 DASH / MP4 / FLV', link: '/guide/stream' },
          { text: '关于登录', link: '/guide/login' },
          { text: '关于风控', link: '/guide/risk' },
          { text: '搜索页', link: '/guide/search' },
          { text: '下载页', link: '/guide/download' },
          { text: '设置页', link: '/guide/settings' }
        ]
      },
      {
        text: '常见问题',
        items: [
          { text: 'Windows', link: '/help/windows' },
          { text: 'macOS', link: '/help/macos' },
        ]
      }
    ],

    footer: {
      message: 'Licensed under the <a href="https://github.com/btjawa/BiliTools/blob/master/LICENSE">GPL-3.0-or-later</a>.',
      copyright: 'Copyright © 2023-present <a href="https://github.com/btjawa">btjawa</a>.'
    }
  }
});