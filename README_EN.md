<div align="center">
<img src="./assets/logo.svg" width=500 />

<h1>BiliTools - A Bilibili Toolbox</h1>

<div>
<a href="https://github.com/btjawa/BiliTools/stargazers" target="_blank"><img src="https://img.shields.io/github/stars/btjawa/BiliTools" /></a>
<a href="https://github.com/btjawa/BiliTools/forks" target="_blank"><img src="https://img.shields.io/github/forks/btjawa/BiliTools" /></a>
<a href="https://github.com/btjawa/BiliTools/actions/workflows/release.yml" target="_blank"><img src="https://img.shields.io/github/actions/workflow/status/btjawa/BiliTools/release.yml" /></a>
<a href="https://github.com/btjawa/BiliTools/releases/latest" target="_blank"><img src="https://img.shields.io/github/v/release/btjawa/BiliTools" /></a>
<a href="https://github.com/btjawa/BiliTools/blob/master/LICENSE" target="_blank"><img src="https://img.shields.io/github/license/btjawa/BiliTools" /></a>
</div>

<a href="https://trendshift.io/repositories/13286" target="_blank">
    <img src="https://trendshift.io/api/badge/repositories/13286" alt="btjawa%2FBiliTools | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/>
</a>

[简体中文](./README.md) | English | [日本語](./README_JA.md) | [ChangeLog](./CHANGELOG.md) | [Contributing](./CONTRIBUTING.md) | [CODE_OF_CONDUCT](./CODE_OF_CONDUCT.md)
</div>

<hr />

> [!WARNING]
> Translation for this article is not fully completed yet.

💡 Powered by [Tauri v2](https://github.com/tauri-apps/tauri), BiliTools supports downloading & parsing various bilibili resources, with [more features](https://github.com/users/btjawa/projects/4) to come.

📖 Document & Other info: [https://www.btjawa.top/bilitools](https://www.btjawa.top/bilitools) (Chinese only)

> [!IMPORTANT] 
> **This project is built for [Bilibili China](https://www.bilibili.com). We do NOT support the [Bilibili Overseas](https://www.bilibili.tv).**<br>
> [Disclaimer](#disclaimer) only applies to the official version released on the [Release](https://github.com/btjawa/BiliTools/releases/latest) page.<br>
> Please avoid using **any versions downloaded from third-party platform**. We are not responsible for any consequences caused by this.<br>
> Accessing **VIP / Paid** content is only available for accounts that have an active subscription to the corresponding service.<br>

## 💾 Installation Guide

Requires Windows >= **8.1**，macOS >= **11.0**

Older systems are not supported.

### Windows

Download `BiliTools_xxx_x64-setup.exe` then follow the installation guide.

If it gets stuck at installing `WebView2`，you can install it manually from [Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2).

### macOS

Download `BiliTools_xxx_universal.dmg` then follow the installation guide.

**Generally**, it is not recommended to use the arch-specific images. See [#26](https://github.com/btjawa/BiliTools/issues/26#issuecomment-2785410137).

## 🚀 Contributing

> [!TIP]
> ### This project currently lacks active maintainers. To keep it going, we need your help!

Everyone is welcome to contribute and help improve this project!

Please use [Contributing](./CONTRIBUTING.md) as reference~

If you are just a user:
- Submit according to the *Issue 与 Discussion* section in [Contributing](./CONTRIBUTING.md).
- **Note the difference between the purpose of Issues and Discussions**.
- **Respect the work of others**.

## 🧪 Features

> See Chinese README. Translations here are not done yet.

## 🌎 Internationalization

**Simplified Chinese (zh-CN)** is the primary language maintained, and acts as the source for other translations.

| Code           | Status      |
|----------------|-------------|
| zh-CN          | ✅ Complete |
| zh-HK          | ✅ Complete |
| ja-JP          | ✅ Complete |
| en-US          | ✅ Complete |

## ⚡ Donate

The project has reached 2k+ stars. Thank you for your support!

Currently we are working on version `v1.3.8` ~ `v1.4.0`, which will include many bug fixes & new features.

If you found it helpful, consider buying me a coffee~

- [Aifadian / 爱发电](https://afdian.com/a/BTJ_Shiroi)

Your support will be a great motivation for me to keep improving!

## 💫 Special Thanks

<a href="https://github.com/btjawa/BiliTools/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=btjawa/BiliTools" />
</a>

<br />

- [bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect) Reference for API requesting

- [aria2](https://github.com/aria2/aria2) For Multi-source & high-efficiency downloading

- [ffmpeg](https://git.ffmpeg.org/ffmpeg.git) For muxing and media processing

- [DanmakuFactory](https://github.com/hihkm/DanmakuFactory) For convert raw XML Danmaku to ASS format


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

## Disclaimer

- This project is licensed under [GPL-3.0-or-later](/LICENSE). It is **free and open-source**, Any redistribution must **remain open-source, use the same license, and retain all original and copyright information**.
- Due to the nature of this project, **users are solely responsible for any risks**. The author has **no liability for any consequences**.

- This project is intended for study and research purposes only. **Please comply with local laws and regulations. Do not abuse it**.
- This project only request resources that the user already has access to. It does not bypass the validation or crack contents.
- All data generated and acquired will be stored locally using `SQLite`:

> Windows: `%AppData%\com.btjawa.bilitools`<br>
> macOS: `$HOME/Library/Application Support/com.btjawa.bilitools`<br>
> Linux: `$HOME/.local/share/com.btjawa.bilitools`

- If there is any infringement, feel free to [contact](mailto:2407356083@qq.com) us.