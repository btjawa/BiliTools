import { defineAdditionalConfig } from "vitepress";

export default defineAdditionalConfig({
  lang: 'en-US',
  title: 'BiliTools',
  description: 'Simple & Light-weight Bilibili Toolbox',
  themeConfig: {
    nav: [
      { text: 'Get started', link: '/en-US/quick/about', activeMatch: '/quick' },
      { text: 'Guide', link: '/en-US/guide/stream', activeMatch: '/guide' },
      { text: 'FAQ', link: '/en-US/help/windows', activeMatch: '/help' }
    ],

    sidebar: [
      {
        text: 'Get started',
        items: [
          { text: 'About', link: '/en-US/quick/about' },
          { text: 'Download & Install', link: '/en-US/quick/install' }
        ]
      },
      {
        text: 'Guide',
        items: [
          { text: 'About DASH / MP4 / FLV', link: '/en-US/guide/stream' },
          { text: 'About Login', link: '/en-US/guide/login' },
          { text: 'About risk-control', link: '/en-US/guide/risk' },
          { text: 'Search Page', link: '/en-US/guide/search' },
          { text: 'Download Page', link: '/en-US/guide/download' },
          { text: 'Settings Page', link: '/en-US/guide/settings' }
        ]
      },
      {
        text: 'FAQ',
        items: [
          { text: 'Windows', link: '/en-US/help/windows' },
          { text: 'macOS', link: '/en-US/help/macos' },
        ]
      }
    ],

    editLink: {
      pattern: 'https://github.com/btjawa/BiliTools/edit/master/docs/app/:path',
      text: 'Edit this page on GitHub'
    },

    lastUpdated: {
      text: 'Last updated at',
    },

    footer: {
      message: 'Licensed under the <a href="https://github.com/btjawa/BiliTools/blob/master/LICENSE">GPL-3.0-or-later</a>.',
      copyright: 'Copyright © 2023-present <a href="https://github.com/btjawa">btjawa</a>.'
    }
  }
});