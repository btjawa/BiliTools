<div align="center">
<img src="./assets/logo.svg" width=500 />

<h1>BiliTools - 哔哩哔哩工具箱</h1>

<div>
<a href="https://github.com/btjawa/BiliTools/stargazers" target="_blank">
    <img src="https://img.shields.io/github/stars/btjawa/BiliTools" />
</a>
<a href="https://github.com/btjawa/BiliTools/forks" target="_blank">
    <img src="https://img.shields.io/github/forks/btjawa/BiliTools" />
</a>
<img src="https://img.shields.io/github/last-commit/btjawa/BiliTools" />
<a href="https://github.com/btjawa/BiliTools/blob/master/LICENSE" target="_blank">
    <img src="https://img.shields.io/github/license/btjawa/BiliTools" />
</a>
<a href="https://github.com/btjawa/BiliTools/releases/latest" target="_blank">
    <img src="https://img.shields.io/github/v/release/btjawa/BiliTools" />
</a>
</div>

<a href="https://trendshift.io/repositories/13286" target="_blank">
    <img src="https://trendshift.io/api/badge/repositories/13286" alt="btjawa%2FBiliTools | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/>
</a>

简体中文 | [English](./README_EN.md) | [日本語](./README_JA.md) | [ChangeLog](./CHANGELOG.md) | [Contributing](./CONTRIBUTING.md)
</div>

<hr />

💡 基于 [Tauri v2](https://github.com/tauri-apps/tauri) 构建，支持下载解析哔哩哔哩各类资源，将会陆续支持 [更多功能](https://github.com/users/btjawa/projects/4)

📖 文档 / 其他信息：[https://www.btjawa.top/bilitools](https://www.btjawa.top/bilitools) 

> [!IMPORTANT] 
> 本项目的所有 [声明](#声明)，仅适用于发布在 [Release](https://github.com/btjawa/BiliTools/releases/latest) 页的官方版本<br>
> 不建议使用 **在任何第三方平台下载的版本**，我们对此所造成的任何后果概不负责<br>
> **大会员 / 付费** 内容解析仅支持已开通对应服务的账号，普通账号无法解析此类内容<br>

## 💾 安装指南

要求 Windows 版本 >= **8.1**，macOS 版本 >= **11.0**

对于低于上述版本的系统环境，不会提供任何支持

### Windows

下载 `BiliTools_xxx_x64-setup.exe` 并进行安装

若卡在安装 `WebView2`，可前往 [Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2) 手动安装
 
### macOS

下载 `BiliTools_xxx_universal.dmg` 并进行安装

**一般**不建议单独下载对应架构的镜像，参考 [#26](https://github.com/btjawa/BiliTools/issues/26#issuecomment-2785410137)

## 🚀 参与贡献

> [!TIP]
> ### 目前该项目缺少维护者。为支持项目稳步前进，我们需要你的力量！
> 本项目当前由 [我](https://github.com/btjawa) 一人维护：
>
> - **我本人是初中生，时间并不多**
> - 个人能力有限，我也清楚有很多漏洞尚未修复

欢迎各位为本项目做出贡献，让本项目变得更好！

如果你是使用者：
- 仅在 [Issues](https://github.com/btjawa/BiliTools/issues) 提交问题，便于 Issue tracking
- 按照模板填写好 **所有需要的信息**，提交足够的日志或错误页面截图
- **尊重他人的劳动成果**

## 🧪 功能

### 资源解析

| 功能    | 状态    | 备注                      |
|---------|---------|---------------------------|
| 视频    | ✅ 已完成 | <ul><li>支持合集 / 分P / 互动、番剧 / 课程 / 电影</li><li>支持 DASH、MP4、FLV</li><li>支持 4K、8K、HDR、杜比视界</li></ul> |
| 音频    | ✅ 已完成 | <ul><li>支持 AVC、HEVC、AV1</li><li>支持 杜比、Hi-Res</li></ul> |
| 音乐    | ✅ 已完成 | <ul><li>支持无损 FLAC、320Kbps 音乐 / 歌单</li></ul> |
| 历史弹幕 | ✅ 已完成 | <ul><li>ASS 字幕格式</li><li>ProtoBuf 解析方式</li></ul> |
| 实时弹幕 | ✅ 已完成 | <ul><li>ASS 字幕格式</li><li>XML、ProtoBuf 解析方式</li></ul> |
| 封面    | ✅ 已完成 | 支持番剧 / 电影海报等等 |
| 字幕    | ✅ 已完成 | SRT 格式 |
| AI总结  | ✅ 已完成 | Markdown格式，**来自哔哩哔哩 `AI 小助手`**<br>*由Shanghai-Bilibili index-20231207大模型提供技术支持* |
| 收藏夹  | ✅ 已完成 | FID 号解析 |
| 元数据  | ✅ 已完成 | 封面、标题、简介、UP主、上传时间、TAGS |
| NFO    | ⚠️ 进行中 | 优先适配 `Emby` |

### 登录 & 验证相关

| 功能           | 状态       |
|----------------|------------|
| 扫码登录        | ✅ 已完成 |
| 密码登录        | ✅ 已完成 |
| 短信登录        | ✅ 已完成 |
| 自动刷新登录状态 | ✅ 已完成 |
| 参数签名        | ✅ 已完成 |
| 风控验证        | ✅ 已完成 |
| 指纹验证        | ✅ 已完成 |

## 🌎 I18N - 国际化

**简体中文 (zh-CN)** 是最主要维护的语言，同时作为其他语言的翻译源。

| 代码           | 状态       |
|----------------|-----------|
| zh-CN          | ✅ 已完成 |
| zh-HK          | ✅ 已完成 |
| ja-JP          | ✅ 已完成 |
| en-US          | ✅ 已完成 |

## 💻 本地开发 & 构建

> Rust >= **1.70**<br>
> Node.js >= **20**

- 克隆项目并安装依赖
```bash
git clone https://github.com/btjawa/BiliTools.git
cd BiliTools
```

- 启动开发服务器
```bash
npm run tauri dev
```

- 构建发行版
```bash
npm run tauri build
```

## ⚡ 赞助

项目已达到 2k Stars，希望大家多多支持！

目前正在开发 `v1.3.8` ~ `v1.4.0`，届时会有大量更新

如果你喜欢，并想助力这个项目，可以考虑请我喝杯咖啡~

- [爱发电](https://afdian.com/a/BTJ_Shiroi)

你的支持将是我持续维护的一大动力！

## 💫 鸣谢

<a href="https://github.com/btjawa/BiliTools/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=btjawa/BiliTools" />
</a>

<br />

- [bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect) 部分接口请求规范参考

- [aria2](https://github.com/aria2/aria2) 用于多线程高效下载数据

- [ffmpeg](https://git.ffmpeg.org/ffmpeg.git) 用于混流与其他媒体处理

- [DanmakuFactory](https://github.com/hihkm/DanmakuFactory) 用于将 XML 转换为 ASS 字幕


<a href="https://www.star-history.com/#btjawa/BiliTools&Date" alt="Star History Chart">
<picture>
<source
    media="(prefers-color-scheme: dark)"
    srcset="https://api.star-history.com/svg?repos=btjawa/BiliTools&type=Date&theme=dark"
/>
<source
    media="(prefers-color-scheme: light)"
    srcset="https://api.star-history.com/svg?repos=btjawa/BiliTools&type=Date"
/>
<img
    alt="Star History Chart"
    src="https://api.star-history.com/svg?repos=btjawa/BiliTools&type=Date"
/>
</picture>
</a>

## 声明

- 本项目遵守 [GPL-3.0-or-later](/LICENSE) 开源协议，免费开源，任何形式的二次分发必须 **继续开源、遵守相同协议、保留原作者及版权信息**。
- 本项目因其特殊性，使用者需 **自行承担相关风险**，项目作者对任何因 **不当使用、滥用等** 所造成的任何后果 **概不负责**。

- 本项目旨在学习与研究技术，**使用需遵守相关法律法规，切勿滥用**。
- 本项目仅请求已获访问权限的在线资源，无绕过校验、破解付费资源等等行为。
- 本项目产生与获取的所有数据将使用 `SQLite` 格式明文存储于用户本地：

> Windows: `%AppData%\com.btjawa.bilitools`<br>
> macOS: `$HOME/Library/Application Support/com.btjawa.bilitools`<br>
> Linux: `$HOME/.local/share/com.btjawa.bilitools`

- 如有侵权，可随时联系处理。