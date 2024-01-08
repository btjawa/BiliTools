# BiliTools

![bilitools.png](https://cdn.jsdelivr.net/gh/btjawa/btjawa/assets/bilitools.png)

# 介绍

基于 [Tauri](https://github.com/tauri-apps/tauri) & [Rust](https://github.com/rust-lang/rust) 实现的 bilibili 第三方轻量工具箱；项目仅作学习用途。

# 功能

## 目前已实现

- 获取大会员/付费资源
- 风控验证 - Wbi, _uuid, buvid3/4, bili_ticket
- 音视频下载 - `视频 / 合集 / 番剧 (AV + BV + SS + EP)`
    - 画质最高支持：`8K + HDR + 杜比视界`
    - 伴音音质最高支持：`192K + HiRes无损 + 杜比全景声`
    - 帧率最高支持：`120FPS`
    - 编码支持：`AVC (H.264) + HEVC (H.265) + AV1`
- 音乐下载 - `AU`
    - 音质最高支持：`320K + 无损SQ FLAC`
- 三种登录方式 + 自动刷新登录状态
    - 扫码登录
    - 密码登录
    - 短信登录: 多国家区号支持

# 更新

应用将在每次启动时自动检查并更新

手动更新可移步 [Releases](https://github.com/btjawa/BiliTools/releases/latest)