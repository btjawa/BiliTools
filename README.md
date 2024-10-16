# BiliTools - 哔哩哔哩工具箱

![bilitools.png](https://cdn.jsdelivr.net/gh/btjawa/btjawa/assets/bilitools.png)

## 介绍

基于 [Tauri v2](https://v2.tauri.app) 实现的哔哩哔哩工具箱

目前大致实现了资源下载：支持 `视频、番剧、课程、音乐` 下载， 自动刷新登录信息等等

未来还会陆续支持更多功能，尽情期待~

将会优先适配 `Windows`, 次为 `macOS`

## 功能

### 当前版本 - v1.3.0-dev.3

### 下列部分未实现功能都将在 v1.3.0 正式版中实现

### 风控验证

 - [x] Wbi 签名
 - [x] bili_ticket
 - [ ] v_voucher (不稳定)
 - [ ] buvid (不稳定)

### 登录

 - [x] 扫码登录
 - [ ] 密码登录 (不稳定)
 - [x] 短信登录
 - [ ] 第三方登录 (TODO)

### 音频 / 视频

 - [x] 120 FPS
 - [x] 480P ~ 8K
 - [x] HDR 真彩
 - [x] 杜比视界
 - [ ] 互动视频 （`v1.3.0-dev` 暂未实现，但 `v1.1.2` 有此功能的不稳定版本)
 - [x] 64K ~ 192K
 - [x] 杜比全景声
 - [x] Hi-Res 无损

### 其他下载

 - [x] 封面
 - [ ] 弹幕 (`v1.3.0-dev` 暂未实现，但 `v1.1.2` 有此功能的不稳定版本)
 - [ ] AI总结 (`v1.3.0-dev` 暂未实现，但 `v1.1.2` 有此功能的不稳定版本)

## 开发

```shell
git clone https://github.com/btjawa/BiliTools.git
cd BiliTools
npm install // You can use pnpm, yarn as replacement
npm run tauri dev
```

## 参与贡献 / 提交报错

欢迎成为该项目的下一个贡献者~

项目仍有许多模块未完全完成或不稳定，个人维护精力不足

> [!IMPORTANT]
>
> 对于提交报错， 推荐以下几种方式：
> - 在弹出错误通知时，截图窗口，并贴图至 Issue
> - 将 `BiliTools.log` (对于 Windows, 位于 `%LOCALAPPDATA%/com.btjawa.bilitools/logs`) 作为附件上传至 Issue
> 
> 如果可以的话，请尽量描述复现方式与场景

## 本项目使用的其他开源项目

 - [aria2c](https://github.com/aria2/aria2c)

 - [ffmpeg](https://git.ffmpeg.org/ffmpeg.git)

 - 其余可查看 `package.json` 与 `src-tauri/Cargo.toml`

## 引用文档

 - [哔哩哔哩-API收集整理](https://socialsisteryi.github.io/bilibili-API-collect/)

 - [aria2 Documentation](https://aria2.github.io/manual/en/html/aria2c.html)
