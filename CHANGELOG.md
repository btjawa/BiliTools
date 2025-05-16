# Changelog

## [1.3.7] - 2025-05-17

Update STORAGE_VERSION to 5

重构配置读写逻辑，提高效率<br>
自定义文件名设置更名为 `命名格式`，同时支持自定义文件夹命名，并添加了更多变量

### 更新

- [`43b760c`](https://github.com/btjawa/BiliTools/commit/43b760c0606708927ebfb9959ba7b09f6c7f7da1) 对图标细节重新进行设计，`macOS` 下将会使用白底圆角图标 ([#46](https://github.com/btjawa/BiliTools/issues/46) by [@hqc8848](https://github.com/hqc8848))
- [`1ef31a3`](https://github.com/btjawa/BiliTools/commit/1ef31a3da8d563a0c889463dcc712df0389060ee) 支持将元数据自动嵌入媒体文件 ([#50](https://github.com/btjawa/BiliTools/issues/50) by [@include-H](https://github.com/include-H))
- [`bd8048e`](https://github.com/btjawa/BiliTools/commit/bd8048e4c3c1ef30e9f8302b03035c98d1b36cce) 支持自定义文件夹命名格式 ([#54](https://github.com/btjawa/BiliTools/issues/54) by [@Excitedfighter](https://github.com/Excitedfighter))
- [`5c9ac31`](https://github.com/btjawa/BiliTools/commit/5c9ac31482528bff99115ce586361c3fef8c2958) (`1.3.7-1`) 增强 `自动检测` 输入链接的识别能力
- [`884aa45`](https://github.com/btjawa/BiliTools/commit/884aa455bcd7fe7939c4cd98c7ae75d4f27d3992) (`1.3.7-1`) 允许在 `设置->下载` 中启用 `添加任务后自动开始下载` ([#46](https://github.com/btjawa/BiliTools/issues/46) by [@hqc8848](https://github.com/hqc8848))

### 修复

- [`1ef31a3`](https://github.com/btjawa/BiliTools/commit/1ef31a3da8d563a0c889463dcc712df0389060ee) 修复合集视频检测合集错误问题 ([#55](https://github.com/btjawa/BiliTools/issues/55) by [@vce527](https://github.com/vce527))
- [`1ef31a3`](https://github.com/btjawa/BiliTools/commit/1ef31a3da8d563a0c889463dcc712df0389060ee) 修复代理检测混乱问题 ([#34](https://github.com/btjawa/BiliTools/issues/34) by [@AceCandy](https://github.com/AceCandy))
- [`745061a`](https://github.com/btjawa/BiliTools/commit/745061ae9568feb7592a2ba04dee63242dbf4033) 修复多选下载时文件夹创建混乱问题 ([#49](https://github.com/btjawa/BiliTools/issues/49) by [@yuabc66](https://github.com/yuabc66))
- [`1ef31a3`](https://github.com/btjawa/BiliTools/commit/1ef31a3da8d563a0c889463dcc712df0389060ee) 修复 "系统无法将文件移到不同的磁盘驱动器。 (os error 17)" ([#52](https://github.com/btjawa/BiliTools/issues/52) by [@caty17173](https://github.com/caty17173))
- [`5c9ac31`](https://github.com/btjawa/BiliTools/commit/5c9ac31482528bff99115ce586361c3fef8c2958) (`1.3.7-1`) 修复课程下载链接格式问题 ([#39](https://github.com/btjawa/BiliTools/issues/39) by [@ShannonNi](https://github.com/ShannonNi))
- [`5c9ac31`](https://github.com/btjawa/BiliTools/commit/5c9ac31482528bff99115ce586361c3fef8c2958) (`1.3.7-1`) 修复不合法文件名问题 ([#48](https://github.com/btjawa/BiliTools/issues/48) by [@yuabc66](https://github.com/yuabc66))

## [1.3.7-1] - 2025-05-05

Update STORAGE_VERSION to 4

### 更新

- [`5c9ac31`](https://github.com/btjawa/BiliTools/commit/5c9ac31482528bff99115ce586361c3fef8c2958) 增强 `自动检测` 输入链接的识别能力
- [`884aa45`](https://github.com/btjawa/BiliTools/commit/884aa455bcd7fe7939c4cd98c7ae75d4f27d3992) 允许在 `设置->下载` 中启用 `添加任务后自动开始下载` ([#46](https://github.com/btjawa/BiliTools/issues/46) by [@hqc8848](https://github.com/hqc8848))

### 修复

- [`5c9ac31`](https://github.com/btjawa/BiliTools/commit/5c9ac31482528bff99115ce586361c3fef8c2958) 修复课程下载链接格式问题 ([#39](https://github.com/btjawa/BiliTools/issues/39) by [@ShannonNi](https://github.com/ShannonNi))
- [`5c9ac31`](https://github.com/btjawa/BiliTools/commit/5c9ac31482528bff99115ce586361c3fef8c2958) 修复不合法文件名问题 ([#48](https://github.com/btjawa/BiliTools/issues/48) by [@yuabc66](https://github.com/yuabc66))

## [1.3.6] - 2025-05-04

Update STORAGE_VERSION to 3

自定义文件名设置由 `设置->下载` 迁移至 `设置->高级`，支持高级自定义，同时添加了更多变量<br>
`下载音视频` 与 `下载其他` 合并至 `常规下载`，同时支持 `打包下载`

### 更新

- [`a9a03be`](https://github.com/btjawa/BiliTools/commit/a9a03bec77e1b21517fc6928d77d0c5eb167c2f2) 支持高级自定义文件名 ([#35](https://github.com/btjawa/BiliTools/issues/35) by [@Excitedfighter](https://github.com/Excitedfighter))
- [`41fe352`](https://github.com/btjawa/BiliTools/commit/41fe3520c96bf950aafe2b7a334d6d20dd7275ed) 支持打包下载 ([#35](https://github.com/btjawa/BiliTools/issues/35) by [@Excitedfighter](https://github.com/Excitedfighter))
- [`41fe352`](https://github.com/btjawa/BiliTools/commit/41fe3520c96bf950aafe2b7a334d6d20dd7275ed) 收藏夹支持显示番剧 ([#43](https://github.com/btjawa/BiliTools/issues/43) by [@Soltus](https://github.com/Soltus))
- [`13dbd60`](https://github.com/btjawa/BiliTools/commit/13dbd602e911d5d796f1f5ff32c3dffd1eb9a2ab) 支持解析 `FID` 收藏夹，以及支持指定资源类型 ([#37](https://github.com/btjawa/BiliTools/issues/37) by [@obentnet](https://github.com/obentnet))

### 修复

- [`a9a03be`](https://github.com/btjawa/BiliTools/commit/a9a03bec77e1b21517fc6928d77d0c5eb167c2f2) 修复设置同步逻辑

## [1.3.5] - 2025-04-09

### 更新

- [`f2719de`](https://github.com/btjawa/BiliTools/commit/f2719de4bfdda84892928d9b9456a1a841a284cd) 多选下载节流机制 ([#33](https://github.com/btjawa/BiliTools/issues/33) by [@zss2430922519](https://github.com/zss2430922519))
- [`f2719de`](https://github.com/btjawa/BiliTools/commit/f2719de4bfdda84892928d9b9456a1a841a284cd) 更新部分翻译文本

## [1.3.4] - 2025-04-08

现已支持 M 系列芯片 Mac

Update STORAGE_VERSION to 2

### 更新

- [`fcc2674`](https://github.com/btjawa/BiliTools/commit/fcc2674696716ed160cd5485f2a443ec124e9732) 支持 `aarch64-darwin` (Apple Silicon / M-series chips) (尚未广泛测试)
- [`20068e5`](https://github.com/btjawa/BiliTools/commit/20068e50b0bc868b03f089b7783e812aa9a03769) 大幅减小 `ffmpeg` 体积，`macOS` Sidecars 使用静态链接库二进制文件
- [`c520a2a`](https://github.com/btjawa/BiliTools/commit/c520a2acfa5ac776d0f363fd8518d84c3e26e87d) 恢复音乐下载，以及支持下载歌单 ([#28](https://github.com/btjawa/BiliTools/issues/28) by [@Xavier9896](https://github.com/Xavier9896))
- [`34acd37`](https://github.com/btjawa/BiliTools/commit/34acd3796c5c1118ed93f85239c3e6eab6475d12) 支持下载音视频时自动处理音频流格式 ([#24](https://github.com/btjawa/BiliTools/issues/24) by [@Ningaqua](https://github.com/Ningaqua))
- [`c56a319`](https://github.com/btjawa/BiliTools/commit/c56a319572bb1f660ffd558e4f8e3036f7549f6d) (`v1.3.4-1`) 自动处理旧版本数据库，应用更新后不再需要像 `v1.3.3` 手动处理

### 修复

- [`b28cb29`](https://github.com/btjawa/BiliTools/commit/b28cb299bffb732af389425e7d74e46f57463f7c) (`v1.3.4-1`) 修复更新界面文字显示问题

## [1.3.4-1] - 2025-04-06

### 更新

- [`c56a319`](https://github.com/btjawa/BiliTools/commit/c56a319572bb1f660ffd558e4f8e3036f7549f6d) 自动处理旧版本数据库，应用更新后不再需要像 `v1.3.3` 手动处理

### 修复

- [`b28cb29`](https://github.com/btjawa/BiliTools/commit/b28cb299bffb732af389425e7d74e46f57463f7c) 修复更新界面文字显示问题

## [1.3.3] - 2025-04-04

项目的开源协议从 `MIT` 迁移至 `GPL-3.0-or-later`

由于更新了数据结构，因此启动应用时会遇到数据库相关报错<br>
在 `设置页 -> 缓存` 中删除 `用户数据库` 后，重启应用即可正常使用

该项目将暂时不再更新漫画下载，见 [博客](https://btjawa.top/bilitools#关于漫画)

### 更新

- [`eed34a3`](https://github.com/btjawa/BiliTools/commit/eed34a311f4f7e1f3c9def09eecb9db5bc098352) 支持下载字幕
- [`47319e4`](https://github.com/btjawa/BiliTools/commit/47319e4efd9f6b6014ac5473921e65580248e28a) 重构下载链接解析、下载选择界面、多选下载推送逻辑
- [`e23a9ee`](https://github.com/btjawa/BiliTools/commit/e23a9ee9bc6b2a58feda2f17b64cee3041199aa9) 完善 Sidecar 轮询守护逻辑
- [`27fb5fe`](https://github.com/btjawa/BiliTools/commit/27fb5fe7286f24a0b532f08ad6849f6300618996) 由 `iziToast` 迁移至 `vue-notification`
- [`9963992`](https://github.com/btjawa/BiliTools/commit/99639922cecc9723df925ec908812b234ce16923) 由 `Vuex` 迁移至 `Pinia`
- [`e3c6680`](https://github.com/btjawa/BiliTools/commit/e3c668075eb62f7ca58914d2d16917d31fe0844f) [`7358534`](https://github.com/btjawa/BiliTools/commit/7358534e2b32dbdb2f2586fb75de26d04ea5362d) 由 `Options API` 迁移至 `Composition API`

### 修复

- [`9278ce2`](https://github.com/btjawa/BiliTools/commit/9278ce23d3c4c32d0ed230e65c9aa8cb3d3a4561) 完善 `密码登录` 的风控对应逻辑
- [`17f7579`](https://github.com/btjawa/BiliTools/commit/17f7579c49ad948084afdaac0d444d75cba5c540) 修复 `下载其他` 中内容显示问题
- [`dae071a`](https://github.com/btjawa/BiliTools/commit/dae071abcc2aaa7bdc3d7796381f0ecf72408fd0) 使用自定义下拉菜单 ([#21](https://github.com/btjawa/BiliTools/issues/21) by [@BabaBoyGegeBoy](https://github.com/BabaBoyGegeBoy))

## [1.3.2] - 2025-02-02

### 更新

- [`2049ad7`](https://github.com/btjawa/BiliTools/commit/2049ad755da6d0d9a5b483b14419c54baba836a1) 搜索时可自动滚动至目标视频

### 修复

- [`d929ed0`](https://github.com/btjawa/BiliTools/commit/d929ed0b8e634c499cb0afe0567023d9e4fd5364) ([#8](https://github.com/btjawa/BiliTools/issues/8) by [@hqc8848](https://github.com/hqc8848)) 修复 Unix-like 系统上的权限问题
- [`74fb013`](https://github.com/btjawa/BiliTools/commit/74fb0135c24f19cb86883c7a7ab913101d884fb6) [`3cab821`](https://github.com/btjawa/BiliTools/commit/3cab821efa71d8b9e55ee90e2d40ab0eb43b36d0) ([#13](https://github.com/btjawa/BiliTools/issues/13) by [@masterrite](https://github.com/masterrite)) 补充漫画接口的 `ultra_sign` 验证参数
- [`fc1a15d`](https://github.com/btjawa/BiliTools/commit/fc1a15dd96b0328a5604495504cf81dce83268c9) 由于漫画接口不稳定，因此暂时关闭漫画解析入口
- [`41582bc`](https://github.com/btjawa/BiliTools/commit/41582bc4c021b9601215c4c9643c29c6998f0d88) [`d929ed0`](https://github.com/btjawa/BiliTools/commit/d929ed0b8e634c499cb0afe0567023d9e4fd5364) 修复对 `geetest` `FFmpeg` 的错误处理

## [1.3.2-1] - 2025-01-19

### 修复

- 修复 Unix-like 系统上的权限问题
- 修复 FFmpeg 的错误处理

## [1.3.1] - 2025-01-12

包含逻辑/BUG更新<br>
使用 anyhow 优化错误处理方式

### 更新

- Linux支持
- 支持解析漫画
- 支持断点续传
- 支持下载完成时通知
- 支持自定义文件名格式
- 支持解析 XML 实时弹幕
- 支持自定义 Aria2c / DanmakuFactory 配置

### 修复

- 重构 Aria2c 队列管理逻辑
- 修复 FFmpeg 解析帧数与更新进度不正确问题
- 修复 ASS / ProtoBuf 方式实时弹幕解析不完整问题

## [1.3.0] - 2025-01-01

使用 Vue 与 Typescript 完全重构所有功能<br>
包含大量逻辑/BUG更新，提升稳定性<br>
更新已无法使用的API接口、校验算法<br>
停止低于1.3.0版本的维护

### 更新

- 更新内核版本至 Tauri v2.1.1
- 完全重构操作界面
- macOS支持
- 明暗主题
- 下载相关
    - DASH / MP4
    - 支持收藏夹解析
    - 多选下载支持更多资源
    - 支持解析AI总结（Markdown）
    - 支持历史与实时弹幕（ASS 字幕）
    - 支持 AAC EAC3 FLAC MKV
    - 支持动态删除下载任务
- 设置相关
    - I18N 多语言支持
    - HTTP(S) 代理支持
    - 缓存管理（日志、临时文件、WebView、数据库）
  
### 修复

- 优化数据持久化逻辑
- 完善错误捕获与处理
- 规范数据处理方式
- 优化性能与内存效率
- 提高登录稳定性
- 下载相关
    - 优化大量数据列表的滚动效率
    - 提升资源解析稳定性
    - 重写下载逻辑

## [1.2.0-dev.13] - 2024-08-28

使用 Vue 重写的第一个版本，由于没有实现下载功能，因此将 v1.2.0 做存档处理

### 更新

- Vue重写前端界面(WIP)
- macOS支持(WIP)
- 自动化代码签名
- 更新内核版本至 Tauri v2.0.0-beta

### 修复

- 使用sea-orm存储数据
- 重构项目结构
- 优化逻辑

## [1.1.2] - 2024-03-25

包含逻辑/BUG更新，以及新功能

### 更新
- FLV 支持
- 历史弹幕/实时弹幕支持 XML+ASS 下载
- 持久化存储下载记录
### 修复
- 优化特殊字符检测
- 优化链接获取
- 优化下载处理逻辑
### 杂项
- 修复一系列BUG

## [1.1.1] - 2024-02-20

包含BUG更新

### 修复
- 修复下载完成时的报错 "找不到指定的路径"
- 修正部分文本

## [1.1.0] - 2024-02-02

包含逻辑/BUG更新，以及新功能<br>
使用ts+vite模块化重构，提高安全性<br>
前后端交互添加secret校验，提高安全性

### 更新
- 支持课程解析/下载
- 引入等待/下载中/完成队列（多选/普通下载默认加入等待队列）
- 下载暂停/继续
- 添加标签（会员/限免等）
- 下载文件夹命名将会添加下载时的时间
### 修复
- 前端：重写多选/视频解析/视频下载/右键菜单
- 后端：重写处理队列，优化并发下载模式
- 下载总体更加稳定
- 功能: 设置相关
- 为设置添加描述
- aria2c管理（重启）
- 临时文件（计算大小/清理）
### 杂项
- 修复一系列BUG
- 优化Updater更新体验
- 合并重复/优化大部分逻辑/23M~17M
- 前后端队列同步
- 优化aria2c等后端服务session
- 弹幕解析仅保留“历史弹幕”模块
- 确保应用仅运行单个实例
- 重写配置读写/aria2c管理

## [1.0.3] - 2024-01-14

包含逻辑/BUG更新，以及新功能

### 更新
- aria2c RPC, 支持多线程下载/断点续传
- 支持互动视频: 回溯 + 控制剧情走向 + 下载每一个剧情对应的资源
- 弹幕历史 + 实时弹幕 + 视频AI总结
- 自动选择下载线路
### 修复
- 修正Dolby/Hi-Res下载链接获取方式
- 优化多次下载同一视频的体验
### 杂项
- 修复登录时在密码栏按下Enter会导致崩溃的问题
- 大幅减小应用体积 (本体 42M ~ 23M)
- 临时文件夹默认改为 %TEMP%
- 重构繁琐代码

## [1.0.2] - 2024-01-06

包含逻辑/BUG更新，以及新功能

### 更新
- 支持设置"最大下载并发数"
- 音乐/AU号解析 & 最高无损SQ FLAC
- 文件命名支持空格/特殊字符
### 修复
- 修正Dolby/Hi-Res下载链接获取方式
- 优化多次下载同一视频的体验
### 杂项
- 优化退出登录逻辑
- 修改“定位文件”定位方式
- 前端正确解包gzip
- 短信登录自动根据地区选择国家区号
- 大幅减小ffmpeg体积
- ffmpeg改为使用COPYING许可

## [1.0.0] - 2024-01-01

更名为 "BiliTools", 全新图标

### 更新
- 支持 8K & Hi-Res无损 & 杜比视界 + 全景声 & 编码格式
- 并发下载, 多个视频将会打包在一个文件夹内
- 个人主页
- 扫码 & 密码 & 短信登录 + 自动刷新登录状态
### 修复
- 不再使用反代服务器解决CORS
### 杂项
- 现在可以设置了 - 引入配置文件
- 自动检测新版本并更新

## [0.1.0] - 2023-11-24

Initial commit