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
基于 [Tauri v2](https://github.com/tauri-apps/tauri) 构建，支持下载解析哔哩哔哩各类资源，未来还会陆续支持更多功能（请看 [Project](https://github.com/users/btjawa/projects/4)）

请确保只在该项目的 `Release` 页下载应用（或自行构建），**不保证其他来源的安全性**

文档 / 其他信息发布页：[https://www.btjawa.top/bilitools](https://www.btjawa.top/bilitools) 

> [!WARNING]  
> **大会员下载仅限本身开通了大会员服务的账号，普通账号无法解析付费、大会员内容**<br>
> **本项目优先适配 Windows，macOS 为次**<br>
> **添加下载项目后，须在 下载->等待中 右上角点击开始下载，不写成立即下载是为了方便添加后续项目**<br>
> **`bcryptprimitives.dll` 是 `Windows 7` 相关问题，由于该操作系统太老，未来不会兼容**

## 参与贡献

该项目由我一人维护，开发难度较大；**我本人是学生，要准备中考，时间并不多**

如果想要提出新功能，或是有任何问题，欢迎提交 Issue

请只在 [Issues](https://github.com/btjawa/BiliTools/issues/new/choose) 页面提交，其他渠道提交的问题我 **也许** 不会处理

注意事项：

- 按照对应需求选择Issue模板创建新Issue，不要在已有的与问题无关的Issue下跟楼
- 尽量把问题或需求描述清楚，若是 `BUG`，提交足够的日志或错误页面截图
- **说话客气点，这是开源 & 免费项目**

不符合以上条件的 Issue 我 **也许** 不会处理

## 功能

### 资源解析

| 功能    | 状态    | 备注                      |
|---------|---------|---------------------------|
| 视频    | ✅ 已完成 | <ul><li>支持视频 / 互动视频(AV/BV)、番剧 / 课程 / 电影(EP/SS)</li><li>支持 DASH、MP4、FLV</li><li>支持 4K、8K、HDR、杜比视界</li></ul> |
| 音频    | ✅ 已完成 | <ul><li>支持 AVC、HEVC、AV1</li><li>支持 杜比、Hi-Res</li></ul> |
| 音乐    | ✅ 已完成 | <ul><li>支持无损 FLAC、320Kbps 音乐(AU) 与 歌单(AM)</li></ul> |
| 历史弹幕 | ✅ 已完成 | <ul><li>ASS 字幕格式</li><li>支持 ProtoBuf 方式</li></ul> |
| 实时弹幕 | ✅ 已完成 | <ul><li>ASS 字幕格式</li><li>支持 XML、ProtoBuf 方式</li></ul> |
| 封面    | ✅ 已完成 ||
| 字幕    | ✅ 已完成 | 支持 SRT 格式 |
| AI总结  | ✅ 已完成 | MD Markdown格式，来自于哔哩哔哩 |
| 漫画    | ❌ TODO | 暂时停止该功能的更新 \| 原因：[博客](https://btjawa.top/bilitools#关于漫画) |

### 登录相关

| 功能             | 状态       |
|------------------|------------|
| 扫码登录          | ✅ 已完成 |
| 密码登录          | ✅ 已完成 |
| 短信登录          | ✅ 已完成 |
| 自动刷新登录状态   | ✅ 已完成 |
| Wbi 签名          | ✅ 已完成 |
| buvid 参数验证     | ✅ 已完成 |
| v_voucher 风控验证 | ✅ 已完成 |
| 客户端指纹验证      | ✅ 已完成 |

### I18N Translations

I work on translations mainly to improve my English. If you find anything unnatural or incorrect, feel free to open an issue!

日本語の表現力を高めるために翻訳をしています。もし不自然な表現や誤用などがありましたら、Issue を立てていただけると助かります。

| Code           | Status      |
|----------------|-------------|
| zh-CN          | ✅ Complete |
| zh-HK          | ✅ Complete |
| ja-JP          | ✅ Complete |
| en-US          | ✅ Complete |

## 开发 / 构建

- 需要 Rust 2021+ Edition 与 Node.js 20+

1. 克隆项目 `git clone https://github.com/btjawa/BiliTools.git`
2. 进入目录 `cd BiliTools`
3. 安装依赖 `npm install`

- 开发 `npm run tauri dev`
- 构建 `npm run tauri build`

## 声明

该项目根据 `GPL-3.0-or-later` 许可证进行授权，请参考 [LICENSE](/LICENSE) 文件

本项目仅作学习、技术研究用途，作者不不当使用本项目所导致的任何后果负责，若有疑似侵权、违规内容，可随时联系处理

所有请求行为仅基于用户已获访问权限的在线资源，不包含任何形式的服务端破解、绕过付费会员、绕过安全校验等等行为

应用数据仅存储于用户本地，使用 `SQLite` 格式明文存储于以下路径：

- Windows: `%AppData%\com.btjawa.bilitools\Storage`
- macOS: `$HOME/Library/Application Support/com.btjawa.bilitools/Storage`
- Linux: `$HOME/.local/share/com.btjawa.bilitools/Storage`

参考、使用的其他开源项目：

- [bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect) 部分接口请求规范参考

 - [aria2](https://github.com/aria2/aria2) 用于多线程高效下载数据

 - [ffmpeg](https://git.ffmpeg.org/ffmpeg.git) 用于音频、视频合并与混流与其他媒体处理

 - [DanmakuFactory](https://github.com/hihkm/DanmakuFactory) 用于将 XML 转换为 ASS 字幕

 - 其余可查看 `package.json` 与 `src-tauri/Cargo.toml`

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=btjawa/BiliTools&type=Date)](https://www.star-history.com/#btjawa/BiliTools&Date)