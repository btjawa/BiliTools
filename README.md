<p align="center">
    <img src="./assets/bilitools.png" width="500" />
</p>

<div align="center">
    <h1>BiliTools - 哔哩哔哩工具箱</h1>
    <img src="https://img.shields.io/github/v/tag/btjawa/BiliTools" />
    <img src="https://img.shields.io/github/stars/btjawa/BiliTools" />
    <img src="https://img.shields.io/github/forks/btjawa/BiliTools" />
    <img src="https://img.shields.io/github/last-commit/btjawa/BiliTools" />
    <img src="https://img.shields.io/github/license/btjawa/BiliTools" />
    <img src="https://img.shields.io/badge/Tauri-FFC131?logo=Tauri&logoColor=white" />
    <img src="https://shields.io/badge/TypeScript-3178C6?logo=TypeScript&logoColor=FFF" />
    <img src="https://img.shields.io/badge/Rust-000000?logo=Rust&logoColor=white" />
</div>

## 介绍

当前支持下载解析各类资源，未来还会陆续支持更多功能（请看 [#TODO](#todo-列表)），尽情期待~

关于应用使用说明，可以查看[博客](https://www.btjawa.top/bilitools)，其中也包含各种问题的解决方法

请确保只在该项目的 `Release` 页下载应用（或自行构建），不保证其他来源的安全性

**大会员下载仅限本身开通了大会员服务的账号，普通账号无法解析付费、大会员内容**

## 功能

### 资源解析

| 功能    | 状态    | 备注                      |
|---------|---------|---------------------------|
| 视频    | ✅ 已完成 | 8K + HDR + 杜比；多P、合集、番剧、课程、互动视频 |
| 音频    | ✅ 已完成 | 杜比 + Hi-Res |
| 音乐    | ✅ 已完成 | 无损 FLAC     |
| 封面    | ✅ 已完成 |                         |
| AI总结  | ✅ 已完成 | MD Markdown格式         |
| 历史弹幕 | ✅ 已完成 | ASS 字幕格式            |
| 实时弹幕 | ✅ 已完成 | ASS 字幕格式            |
| 漫画    | ❌ 暂时不可用 | 见下                 |

### 关于漫画

目前已可解析到漫画的详情界面，但由于近期官方的一次更新导致所有图像被加密，因此暂时关闭下载入口，等待进一步的开发工作

*若想自行开发相关功能，可在 `src/views/SearchPage.vue` 中手动取消注释*

 - [SocialSisterYi/bilibili-API-collect#1168](https://github.com/SocialSisterYi/bilibili-API-collect/issues/1168)
 - [Nemo2011/bilibili-api#875](https://github.com/Nemo2011/bilibili-api/issues/875)

### 登录相关

| 功能             | 状态       |
|------------------|------------|
| 扫码登录          | ✅ 已完成  |
| 密码登录          | ✅ 已完成  |
| 短信登录          | ✅ 已完成  |
| 自动刷新登录状态   | ✅ 已完成  |
| Wbi 签名          | ✅ 已完成  |
| buvid 参数验证     | ✅ 已完成  |
| v_voucher 风控验证 | ✅ 已完成  |
| 客户端指纹验证      | ✅ 已完成  |

### 国际化 I18N

| 语言代码       | 状态       |
|----------------|------------|
| zh-CN          | ✅ 已完成  |
| zh-HK          | ✅ 已完成  |
| ja-JP          | ✅ 已完成  |
| en-US          | ✅ 已完成  |

## TODO 列表

 - [x] 自定义文件名格式
 - [ ] 元信息快照
 - [ ] SOCKS 代理
 - [x] 完善密码登录
 - [ ] 完善漫画解析
 - [ ] AV 与 BV 互转
 - 可以在 Issue 中提出想要的新功能

## 本地开发 / 构建

### 克隆项目和安装依赖

```shell
git clone https://github.com/btjawa/BiliTools.git
cd BiliTools
npm install // pnpm, yarn, etc.
// Rust, Node.js is required
npm run tauri dev
```

### 开发

```shell
npm run tauri dev
```

### 构建

```shell
npm run tauri build
```

## 声明

本项目仅作学习用途，作者不承担因使用本项目而导致的一切后果，若有侵权，可随时联系删除

数据仅存储于用户本地，使用 `SQLite` 格式明文存储于该路径：

- Windows: `%AppData%\com.btjawa.bilitools\Storage`
- macOS: `$HOME/Library/Application Support/com.btjawa.bilitools/Storage`
- Linux: `$HOME/.local/share/com.btjawa.bilitools/Storage`

该项目根据 `GPL-3.0-or-later` 许可证进行授权，请参考 [LICENSE](/LICENSE) 文件

本项目参考了 [bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect) 项目的内容，由 [SocialSisterYi](https://github.com/SocialSisterYi) 根据 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/deed.en) 协议发布，并仅限于非商业用途。

### 使用的其他开源项目

 - [aria2](https://github.com/aria2/aria2)

 - [ffmpeg](https://git.ffmpeg.org/ffmpeg.git)

 - [DanmakuFactory](https://github.com/hihkm/DanmakuFactory)

 - 其余可查看 `package.json` 与 `src-tauri/Cargo.toml`
