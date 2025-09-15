import { defineAdditionalConfig } from 'vitepress';
import pkg from '../package.json';

export default defineAdditionalConfig({
  lang: 'zh-CN',
  title: 'BiliTools',
  description: '简约 & 轻量的哔哩哔哩工具箱',
  themeConfig: {
    nav: [
      { text: '使用说明', link: '/guide/stream', activeMatch: '/guide' },
      { text: '常见问题', link: '/help/', activeMatch: '/help' },
      { text: `v${pkg.version}`, items: [
        {
          text: 'Releases',
          link: `https://github.com/btjawa/BiliTools/releases/tag/v${pkg.version}`
        },
        {
          text: '更新日志',
          link: `https://github.com/btjawa/BiliTools/blob/v${pkg.version}/CHANGELOG.md`
        },
        {
          text: '参与贡献',
          link: `https://github.com/btjawa/BiliTools/blob/v${pkg.version}/CONTRIBUTING.md`
        }
      ] }
    ],

    sidebar: [
      {
        text: '快速开始',
        collapsed: false,
        items: [
          { text: '关于', link: '/guide/about' },
          { text: '下载 & 安装', link: '/guide/install' },
        ],
      },
      {
        text: '须知',
        collapsed: false,
        items: [
          { text: '关于 DASH / MP4 / FLV', link: '/guide/stream' },
          { text: '关于登录', link: '/guide/login' },
          { text: '关于风控', link: '/guide/risk' },
        ]
      },
      {
        text: '资源下载',
        collapsed: false,
        items: [
          { text: '解析链接', link: '/guide/parsing' },
          { text: '选择资源', link: '/guide/resource' },
          { text: '下载与处理', link: '/guide/download' },
        ],
      },
      {
        text: '工具箱',
        collapsed: false,
        items: [
          { text: 'AV BV 互转', link: '/guide/av-bv' },
        ]
      },
      {
        text: '设置页',
        link: '/guide/settings',
      },
      {
        text: '常见问题',
        link: '/help/',
      },
    ],

    editLink: {
      pattern: 'https://github.com/btjawa/BiliTools/edit/master/docs/app/:path',
      text: '在 GitHub 上编辑此页',
    },

    lastUpdated: {
      text: '最后更新于',
    },

    footer: {
      message:
        'Licensed under the <a href="https://github.com/btjawa/BiliTools/blob/master/LICENSE">GPL-3.0-or-later</a>.',
      copyright:
        'Copyright © 2023-present <a href="https://github.com/btjawa">btjawa</a>.',
    },
  },
});
