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

支持下载解析各类资源，未来还会陆续支持更多功能（请看 [#TODO 列表](#todo-列表)

请确保只在该项目的 `Release` 页下载应用（或自行构建），不保证其他来源的安全性

**大会员下载仅限本身开通了大会员服务的账号，普通账号无法解析付费、大会员内容**

**本项目仅供学习用途，请勿将本项目用于商业用途**

- 文档：[博客](https://www.btjawa.top/bilitools) 
- 反馈：[Issues](https://github.com/btjawa/BiliTools/issues/new/choose)

## 功能

### 资源解析

| 功能    | 状态    | 备注                      |
|---------|---------|---------------------------|
| 视频    | ✅ 已完成 | <ul><li>支持视频 / 互动视频(AV/BV)、番剧 / 课程 / 电影(EP/SS)</li><li>支持 DASH、MP4、FLV</li><li>支持 4K、8K、HDR、杜比视界</li></ul> |
| 音频    | ✅ 已完成 | <ul><li>支持 AVC、HEVC、AV1</li><li>支持 杜比、Hi-Res</li></ul> |
| 音乐    | ✅ 已完成 | <ul><li>支持无损 FLAC 与 320Kbps 音乐(AU)</li></ul> |
| 历史弹幕 | ✅ 已完成 | <ul><li>ASS 字幕格式</li><li>支持 ProtoBuf 方式</li></ul> |
| 实时弹幕 | ✅ 已完成 | <ul><li>ASS 字幕格式</li><li>支持 XML、ProtoBuf 方式</li></ul> |
| 封面    | ✅ 已完成 |                         |
| AI总结  | ✅ 已完成 | MD Markdown格式         |
| 漫画    | ❌ TODO | 暂时停止该功能的更新 \| 原因：[博客](https://btjawa.top/bilitools#关于漫画) |

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

### I18N 国际化

I do translations mainly to improve my writing skills. If you find anything that could be improved, feel free to open an issue!

| Code           | Status      |
|----------------|-------------|
| zh-CN          | ✅ Complete |
| zh-HK          | ✅ Complete |
| ja-JP          | ✅ Complete |
| en-US          | ✅ Complete |

## TODO 列表

可以通过 [Issues](https://github.com/btjawa/BiliTools/issues/new/choose) 提出新改进、功能

后续此栏可能会迁移至 `Roadmap`

*顺序即为优先级*

 - [ ] 字幕下载
 - [ ] AV 与 BV 互转
 - [ ] 元信息快照
 - [ ] 视频播放
 - [ ] SOCKS 代理
 - [ ] 完善漫画解析
 - [x] 自定义文件名格式
 - [x] 完善密码登录

## 开发 / 构建

需要 Rust 2021+ Edition 与 Node.js 20+

### 克隆项目与安装依赖
```bash
git clone https://github.com/btjawa/BiliTools.git
cd BiliTools
npm install // pnpm, yarn, etc.
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

数据仅存储于用户本地，使用 `SQLite` 格式明文存储于以下路径：

- Windows: `%AppData%\com.btjawa.bilitools\Storage`
- macOS: `$HOME/Library/Application Support/com.btjawa.bilitools/Storage`
- Linux: `$HOME/.local/share/com.btjawa.bilitools/Storage`

该项目根据 `GPL-3.0-or-later` 许可证进行授权，请参考 [LICENSE](/LICENSE) 文件

本项目参考了 [bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect) 项目的内容，由 [SocialSisterYi](https://github.com/SocialSisterYi) 根据 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/deed.en) 协议发布，并仅限于非商业用途。

### 使用、参考的其他开源项目

 - [bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect) 部分接口请求参考

 - [aria2](https://github.com/aria2/aria2) 用于多线程高效下载数据

 - [ffmpeg](https://git.ffmpeg.org/ffmpeg.git) 用于音频、视频合并与混流与其他媒体处理

 - [DanmakuFactory](https://github.com/hihkm/DanmakuFactory) 用于将 XML 转换为 ASS 字幕

 - 其余可查看 `package.json` 与 `src-tauri/Cargo.toml`
