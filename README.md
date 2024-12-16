# BiliTools - 哔哩哔哩工具箱

![bilitools.png](https://cdn.jsdelivr.net/gh/btjawa/btjawa/assets/bilitools.png)

## 介绍

基于 [Tauri v2](https://v2.tauri.app) 实现的哔哩哔哩工具箱

支持 `视频、番剧、课程、音乐` 等等资源下载与解析， 自动刷新登录信息等等

未来还会陆续支持更多功能，尽情期待~

将会优先适配 `Windows`, 次为 `macOS`, 暂不支持 `Apple Silicon`

关于应用使用说明，可以查看[博客](https://www.btjawa.top/bilitools)，其中也包含各种问题的解决方法

由于应用有涉及到登录等等敏感信息，请确保只在该项目的 `Release` 下载（或自行构建）

## 功能

### 登录相关

| 功能           | 状态       |
|----------------|------------|
| 扫码登录       | ✅ 已完成  |
| 密码登录       | ❌ 不稳定  |
| 短信登录       | ✅ 已完成  |
| 自动刷新登录状态| ✅ 已完成  |
| Wbi 签名       | ✅ 已完成  |
| bili_ticket    | ✅ 已完成  |
| v_voucher      | ✅ 已完成  |
| buvid          | ❌ 不稳定  |

### 资源解析

| 功能    | 状态    | 备注                      |
|---------|---------|---------------------------|
| 视频    | ✅ 已完成 | 全分辨率 + HDR + 杜比    |
| 音频    | ✅ 已完成 | 全比特率 + 杜比 + Hi-Res |
| 音乐    | ✅ 已完成 | 全比特率 + 无损 FLAC     |
| 互动视频 | ❌ 未实现 | 暂可解析第一个节点的资源 |
| 封面    | ✅ 已完成 |                         |
| AI总结  | ✅ 已完成 | MD Markdown格式         |
| 历史弹幕 | ✅ 已完成 | ASS 字幕格式            |
| 实时弹幕 | ✅ 已完成 | ASS 字幕格式            |

### 国际化 I18N

| 语言代码       | 状态       |
|----------------|------------|
| zh-CN          | ✅ 已完成  |
| zh-HK          | ✅ 已完成  |
| ja-JP          | ✅ 已完成  |
| en-US          | ✅ 已完成  |

## 开发

```shell
git clone https://github.com/btjawa/BiliTools.git
cd BiliTools
npm install // You can use pnpm, yarn as replacement
npm run tauri dev
```

## 贡献 / 反馈

欢迎成为该项目的下一个贡献者~

项目仍有许多模块未完全完成或不稳定，个人维护精力不足

> [!IMPORTANT]
>
> 对于提交报错， 推荐以下几种方式：
> - 在弹出错误通知时，截图窗口，并贴图至 Issue
> - 将 `BiliTools.log` (在应用内的 设置 -> 存储 -> 缓存 下找到日志，点击左侧按钮可打开日志文件夹) 作为附件上传至 Issue
> 
> 如果可以的话，请尽量描述复现方式与场景

## 声明

本项目的代码部分依据 [MIT 许可证](https://opensource.org/license/mit) 授权，请参考项目根目录下的 `LICENSE` 文件。

本项目参考了 [bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect) 项目的内容，由 [SocialSisterYi](https://github.com/SocialSisterYi) 根据 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/deed.en) 协议发布，并仅限于非商业用途。

### 使用的其他开源项目

 - [aria2](https://github.com/aria2/aria2)

 - [ffmpeg](https://git.ffmpeg.org/ffmpeg.git)

 - [DanmakuFactory](https://github.com/hihkm/DanmakuFactory)

 - 其余可查看 `package.json` 与 `src-tauri/Cargo.toml`
