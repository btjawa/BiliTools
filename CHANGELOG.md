# Changelog

## [1.4.4] - 2025-10-01

### 新增功能

- [`9cb50bd`](https://github.com/btjawa/BiliTools/commit/9cb50bdf2da3773f974d59ba296432ddaa2842e4) 支持解析分享链接 ([#187](https://github.com/btjawa/BiliTools/issues/187))
- [`9cb50bd`](https://github.com/btjawa/BiliTools/commit/9cb50bdf2da3773f974d59ba296432ddaa2842e4) 支持网络限速 ([#187](https://github.com/btjawa/BiliTools/issues/187))
- [`9cb50bd`](https://github.com/btjawa/BiliTools/commit/9cb50bdf2da3773f974d59ba296432ddaa2842e4) 支持自定义各 Sidecar 的执行路径
- [`764ad4f`](https://github.com/btjawa/BiliTools/commit/764ad4f043ceaafa98dda8699eefd1e69f845376) 支持为视频嵌入元数据
- [`764ad4f`](https://github.com/btjawa/BiliTools/commit/764ad4f043ceaafa98dda8699eefd1e69f845376) 支持为媒体嵌入原始 URL ([#147](https://github.com/btjawa/BiliTools/issues/147))

### 问题修复

- [`764ad4f`](https://github.com/btjawa/BiliTools/commit/764ad4f043ceaafa98dda8699eefd1e69f845376) 修复合集视频 `section_id` 不匹配的问题
- [`7bd30ae`](https://github.com/btjawa/BiliTools/commit/7bd30ae311762945aa8cff858eee1f1a912bc447) 修复剪贴板识别其他内容报错的问题 ([#188](https://github.com/btjawa/BiliTools/issues/188))
- [`7bd30ae`](https://github.com/btjawa/BiliTools/commit/7bd30ae311762945aa8cff858eee1f1a912bc447) 修复 macOS 下 `Could not find codec parameters` 的问题 ([#189](https://github.com/btjawa/BiliTools/issues/189))

### 优化改进

- [`96f967f`](https://github.com/btjawa/BiliTools/commit/96f967f2b1c01055eabe69357abe90ecb776c111) 后端更加详细的错误栈处理

## [1.4.3] - 2025-09-24

### 新增功能

- [`efc3ed6`](https://github.com/btjawa/BiliTools/commit/efc3ed670ead3821b6861709a7c01b2451d5539c) 支持拖拽并自动搜索哔哩哔哩链接 ([#183](https://github.com/btjawa/BiliTools/issues/183))
- [`b5a760f`](https://github.com/btjawa/BiliTools/commit/b5a760fb8ce05e06283b5c4bc4b06e9d534815c4) 支持解析用户完整投稿视频列表

### 问题修复

- [`d8b09fb`](https://github.com/btjawa/BiliTools/commit/d8b09fb5733ea0c15285dc8ea12e68bd55ffe42c) 修复数据库迁移与 `staff` 解析不完整的问题 ([#182](https://github.com/btjawa/BiliTools/issues/182))
- [`78b5f06`](https://github.com/btjawa/BiliTools/commit/78b5f06088f13150f753f7b23055fc4293887b6f) 修复 Linux 下 Sidecar 的打包策略问题 ([#182](https://github.com/btjawa/BiliTools/issues/182))

## [1.4.2] - 2025-09-23

### 新增功能

- [`b31bba8`](https://github.com/btjawa/BiliTools/commit/b31bba826dbe9492f43a2c7f54fc59c229b7f110) 支持 RPM 与 AppImage

### 问题修复

- [`b31bba8`](https://github.com/btjawa/BiliTools/commit/b31bba826dbe9492f43a2c7f54fc59c229b7f110) 修复无法解析字幕的问题
- [`0dde111`](https://github.com/btjawa/BiliTools/commit/0dde1111296800052a251e4e7bef2f8d66c79611) 修复 AV 号的精度问题

## [1.4.1] - 2025-09-23

### 新增功能

- [`51bb916`](https://github.com/btjawa/BiliTools/commit/51bb916af5262d041e73cfc85beb9d822a5f1729) 支持解析用户投稿视频 ([#175](https://github.com/btjawa/BiliTools/issues/175))
- [`1b5abe8`](https://github.com/btjawa/BiliTools/commit/1b5abe82838d857debba8b73fe7dc4b04ce57a38) 支持解析用户投稿音频 ([#175](https://github.com/btjawa/BiliTools/issues/175))
- [`3816ecf`](https://github.com/btjawa/BiliTools/commit/3816ecf5859e6bc30dab4577185c8eb832a47d62) 支持为音频文件嵌入封面 ([#161](https://github.com/btjawa/BiliTools/issues/161))
- [`84a5209`](https://github.com/btjawa/BiliTools/commit/84a520985464f381c4aa08efb025011e5bc971a0) [`2d2ac88`](https://github.com/btjawa/BiliTools/commit/82d2ac88358fcb092ed4a1457d3765e36ffecbae) 支持重试任务 ([#174](https://github.com/btjawa/BiliTools/issues/174), [#179](https://github.com/btjawa/BiliTools/issues/179))
- [`1f5abc7`](https://github.com/btjawa/BiliTools/commit/1f5abc75c6eeceffad54a237a545f96456a9bfa8) [`6ab9129`](https://github.com/btjawa/BiliTools/commit/6ab91298b5acfbdcabc2dda4f73eb8655711fa46) 支持解析用户投稿图文 & 动态 & 专栏 ([#175](https://github.com/btjawa/BiliTools/issues/175))

### 问题修复

- [`588819b`](https://github.com/btjawa/BiliTools/commit/588819b3b5fa2766f78e49e94eefb57573965c6e) 修复 `dash.audio` 不可遍历的问题 ([#176](https://github.com/btjawa/BiliTools/issues/176))
- [`588819b`](https://github.com/btjawa/BiliTools/commit/588819b3b5fa2766f78e49e94eefb57573965c6e) 修复 Debian 平台依赖过时的问题 ([#177](https://github.com/btjawa/BiliTools/issues/177))
- [`588819b`](https://github.com/btjawa/BiliTools/commit/588819b3b5fa2766f78e49e94eefb57573965c6e) 修复互动视频剧情图分支错误的问题 ([#178](https://github.com/btjawa/BiliTools/issues/178))

### 优化改进

- [`51bb916`](https://github.com/btjawa/BiliTools/commit/51bb916af5262d041e73cfc85beb9d822a5f1729) 优化 NFO 解析 & 优化收藏夹解析逻辑

## [1.4.0] - 2025-09-15

### 重大更新

- [`87eaa5a`](https://github.com/btjawa/BiliTools/commit/87eaa5a5546b533682031720dd9ae1d4e1ace9cc) 大规模 UI / UX 重构
- [`d6db8b5`](https://github.com/btjawa/BiliTools/commit/d6db8b5809880e551fc883416e44748be3cb07fd) 重构任务存档逻辑
- [`b82414d`](https://github.com/btjawa/BiliTools/commit/b82414dbce214ebf5a5ae05c51d5d2ff7e8ed5d9) 支持恢复下载任务 & 顶层文件夹格式 ([#136](https://github.com/btjawa/BiliTools/issues/136), [#41](https://github.com/btjawa/BiliTools/issues/41), [#141](https://github.com/btjawa/BiliTools/issues/141))
- [`d758ffe`](https://github.com/btjawa/BiliTools/commit/d758ffea5b01de9e90728799ddf7310db528e8bf) [`220fb70`](https://github.com/btjawa/BiliTools/commit/220fb709fcf0d18a2a1618db99b8dc3bebef57d6) 重构命名格式 & 支持 ISO 8601 的时间占位符 ([#134](https://github.com/btjawa/BiliTools/issues/134))
- [`b82414d`](https://github.com/btjawa/BiliTools/commit/b82414dbce214ebf5a5ae05c51d5d2ff7e8ed5d9) [`3924441`](https://github.com/btjawa/BiliTools/commit/39244411ac8c41deed3ac65a7e540f65bc7c7543) 支持自动迁移 & 导入 & 导出数据库 ([#125](https://github.com/btjawa/BiliTools/issues/125))
- [`c7be98d`](https://github.com/btjawa/BiliTools/commit/c7be98d068f48601b9401a765f21eade5368547d) [`3e36a43`](https://github.com/btjawa/BiliTools/commit/b4a94506706a8352c5f9bfd0109b1e75f7198a13) 支持基于 Debian 的 Linux 发行版 ([#97](https://github.com/btjawa/BiliTools/issues/97))
- [`4fde227`](https://github.com/btjawa/BiliTools/commit/4fde227a819d86cb3824bb287536a70584d5ad5b) [`75558de`](https://github.com/btjawa/BiliTools/commit/75558de62883817839d6e0935dc50f04fc06cff1) 重构队列推送、任务同步、并发处理等逻辑 ([#86](https://github.com/btjawa/BiliTools/issues/86))
- [`87eaa5a`](https://github.com/btjawa/BiliTools/commit/87eaa5a5546b533682031720dd9ae1d4e1ace9cc) [`eaf88ab`](https://github.com/btjawa/BiliTools/commit/eaf88abbd6948836d8aedb7e440706e0da13aa6b) 整合多选下载、打包下载与常规下载 ([#87](https://github.com/btjawa/BiliTools/issues/87), [#80](https://github.com/btjawa/BiliTools/issues/80), [#81](https://github.com/btjawa/BiliTools/issues/81), [#89](https://github.com/btjawa/BiliTools/issues/89), [#78](https://github.com/btjawa/BiliTools/issues/78))

### 新增功能

- [`a4c603f`](https://github.com/btjawa/BiliTools/commit/a4c603f1f91fea8fe9219fd24a4872dd0acef113) 支持导出 & 查看媒体存档信息
- [`d798337`](https://github.com/btjawa/BiliTools/commit/d79833780a5d52f36b0071f94b909a4597edd2a2) 支持修改等待任务的参数 ([#149](https://github.com/btjawa/BiliTools/issues/149))
- [`e05f910`](https://github.com/btjawa/BiliTools/commit/e05f91058e1ccabeae602889ccbe379c24868d00) 支持置顶窗口 ([#170](https://github.com/btjawa/BiliTools/issues/170))
- [`d33013a`](https://github.com/btjawa/BiliTools/commit/d33013aebe26db553bd0145b66ae8972470c5627) 支持自定义窗口效果 ([#163](https://github.com/btjawa/BiliTools/issues/170))
- [`d042886`](https://github.com/btjawa/BiliTools/commit/d042886641ea95f646ce985a6ebd2caf7c405439) 支持解析历史记录 ([#107](https://github.com/btjawa/BiliTools/pull/107))
- [`210a1ba`](https://github.com/btjawa/BiliTools/commit/210a1ba48508463947648360165a238d8d85285a) 支持设置检测重名 ([#146](https://github.com/btjawa/BiliTools/issues/146))
- [`27a48bb`](https://github.com/btjawa/BiliTools/commit/27a48bbd2baf652aaadb0a0be9e97b054972075d) 支持 Shift 多选 ([#129](https://github.com/btjawa/BiliTools/issues/129))
- [`4e82999`](https://github.com/btjawa/BiliTools/commit/4e82999946f6c5e948eca2ebd89069dc453247f5) 支持监听剪切板 ([#70](https://github.com/btjawa/BiliTools/issues/70))
- [`75fc043`](https://github.com/btjawa/BiliTools/commit/75fc043351d9669ee54f09b5316c31344d4f27f1) 支持解析稍后再看 ([#83](https://github.com/btjawa/BiliTools/issues/83))
- [`59a3ddb`](https://github.com/btjawa/BiliTools/commit/59a3ddb035c96d2ddb9e4f0116308d1f6b523aff) 支持解析子合集与番剧PV等资源 ([#55](https://github.com/btjawa/BiliTools/issues/55), [#64](https://github.com/btjawa/BiliTools/issues/64), [#108](https://github.com/btjawa/BiliTools/issues/108))
- [`f099939`](https://github.com/btjawa/BiliTools/commit/f099939911aadb2c755d57bf6fb7ffd32db37e5a) 支持转换音频为 `MP3` 格式 （[#95](https://github.com/btjawa/BiliTools/issues/95)）
- [`75558de`](https://github.com/btjawa/BiliTools/commit/75558de62883817839d6e0935dc50f04fc06cff1) 支持解析 XML 格式弹幕 ([#118](https://github.com/btjawa/BiliTools/issues/118))
- [`eaf88ab`](https://github.com/btjawa/BiliTools/commit/eaf88abbd6948836d8aedb7e440706e0da13aa6b) 支持屏蔽 PCDN ([#77](https://github.com/btjawa/BiliTools/issues/77))

### 问题修复

- [`0f6017f`](https://github.com/btjawa/BiliTools/commit/0f6017f51af5947e22f26663224b1e01adbcfcc4) 修复点号导致路径解析错误的问题 ([#165](https://github.com/btjawa/BiliTools/issues/165))
- [`cc74e3b`](https://github.com/btjawa/BiliTools/commit/cc74e3bbb06d6424b63d4356791502ef6d5738e4) 修复 FLAC 在 MKV 下的混流问题 ([#151](https://github.com/btjawa/BiliTools/issues/151))
- [`89caa66`](https://github.com/btjawa/BiliTools/commit/89caa665a94875301038fc0159997591ba677465) 修复临时路径指向错误的恶性漏洞
- [`6c347a5`](https://github.com/btjawa/BiliTools/commit/6c347a5b8c46d8990b24eeb30a331d7dc9105441) 适配多种合集的解析方案 ([#158](https://github.com/btjawa/BiliTools/issues/158), [#159](https://github.com/btjawa/BiliTools/issues/159))
- [`75fc043`](https://github.com/btjawa/BiliTools/commit/75fc043351d9669ee54f09b5316c31344d4f27f1) 修复 aria2c 超时问题 ([#127](https://github.com/btjawa/BiliTools/issues/127), [#122](https://github.com/btjawa/BiliTools/issues/122), [#111](https://github.com/btjawa/BiliTools/issues/111), [#103](https://github.com/btjawa/BiliTools/issues/103), [#93](https://github.com/btjawa/BiliTools/issues/93))
- [`fbe5adc`](https://github.com/btjawa/BiliTools/commit/fbe5adce71b0043cfbe23703fe792b65be64f230) 修复视频列表中索引偏移量问题 ([#128](https://github.com/btjawa/BiliTools/issues/128), [#126](https://github.com/btjawa/BiliTools/issues/126))
- [`d758ffe`](https://github.com/btjawa/BiliTools/commit/d758ffea5b01de9e90728799ddf7310db528e8bf) 修复 `duration` 字段格式不匹配问题 ([#119](https://github.com/btjawa/BiliTools/issues/119), [#124](https://github.com/btjawa/BiliTools/issues/124))
- [`d758ffe`](https://github.com/btjawa/BiliTools/commit/d758ffea5b01de9e90728799ddf7310db528e8bf) 规范文件编号排序 ([#115](https://github.com/btjawa/BiliTools/issues/115), [#119](https://github.com/btjawa/BiliTools/issues/119), [#121](https://github.com/btjawa/BiliTools/issues/121))
- [`eaf88ab`](https://github.com/btjawa/BiliTools/commit/eaf88abbd6948836d8aedb7e440706e0da13aa6b) 修复收藏夹缺少 `cid` 参数问题 ([#106](https://github.com/btjawa/BiliTools/issues/106))
- [`87eaa5a`](https://github.com/btjawa/BiliTools/commit/87eaa5a5546b533682031720dd9ae1d4e1ace9cc) 修复 `uname` 字段缺失问题 ([#82](https://github.com/btjawa/BiliTools/issues/82), [#94](https://github.com/btjawa/BiliTools/issues/94), [#113](https://github.com/btjawa/BiliTools/issues/113), [#117](https://github.com/btjawa/BiliTools/issues/117))
- [`d6db8b5`](https://github.com/btjawa/BiliTools/commit/d6db8b5809880e551fc883416e44748be3cb07fd) 规范 aria2c 的请求参数 ([#100](https://github.com/btjawa/BiliTools/issues/100))
- [`a6c4a64`](https://github.com/btjawa/BiliTools/commit/a6c4a646dfc795e4f8879e03a989c289a3a72e13) 更新头图链接使用的 API 字段 ([#72](https://github.com/btjawa/BiliTools/issues/72), [#75](https://github.com/btjawa/BiliTools/issues/75), [#76](https://github.com/btjawa/BiliTools/issues/76))

### 优化改进

- [`3e36a43`](https://github.com/btjawa/BiliTools/commit/3e36a439d9a71cb0095f561415ed99dadaf540fe) 重构弹幕解析逻辑 & 重新构建所有 Sidecar ([#167](https://github.com/btjawa/BiliTools/issues/167))
- [`db6ade4`](https://github.com/btjawa/BiliTools/commit/db6ade470b06ad9a32aad09d4c57a757089c6fd7) 支持更详细的错误栈追踪 & 更新调色方案
- [`b82414d`](https://github.com/btjawa/BiliTools/commit/b82414dbce214ebf5a5ae05c51d5d2ff7e8ed5d9) 增强非法字符的校验 ([#135](https://github.com/btjawa/BiliTools/issues/135))
- [`6e11760`](https://github.com/btjawa/BiliTools/commit/6e117604a17aac5c654634b59c4abfb32eeefdc8) 为音频添加元数据 & 优化 EAC3 支持
- [`6e11760`](https://github.com/btjawa/BiliTools/commit/6e117604a17aac5c654634b59c4abfb32eeefdc8) 规范元数据格式 ([#104](https://github.com/btjawa/BiliTools/issues/104), [#114](https://github.com/btjawa/BiliTools/issues/114))
- [`87eaa5a`](https://github.com/btjawa/BiliTools/commit/87eaa5a5546b533682031720dd9ae1d4e1ace9cc) 缩小默认窗口大小 ([#96](https://github.com/btjawa/BiliTools/issues/96), [#83](https://github.com/btjawa/BiliTools/issues/83))
- [`75558de`](https://github.com/btjawa/BiliTools/commit/75558de62883817839d6e0935dc50f04fc06cff1) 为 macOS 分发包增加签名 ([#103](https://github.com/btjawa/BiliTools/issues/103), [#91](https://github.com/btjawa/BiliTools/issues/91), [#26](https://github.com/btjawa/BiliTools/issues/26))

## [1.4.0-8] - 2025-09-11

## 更新

- [`a4c603f`](https://github.com/btjawa/BiliTools/commit/a4c603f1f91fea8fe9219fd24a4872dd0acef113) 支持导出媒体存档信息，支持查看详细任务信息
- [`d798337`](https://github.com/btjawa/BiliTools/commit/d79833780a5d52f36b0071f94b909a4597edd2a2) 支持修改等待任务的参数 ([#149](https://github.com/btjawa/BiliTools/issues/149))
- [`e05f910`](https://github.com/btjawa/BiliTools/commit/e05f91058e1ccabeae602889ccbe379c24868d00) 支持置顶窗口 ([#170](https://github.com/btjawa/BiliTools/issues/170))
- [`d33013a`](https://github.com/btjawa/BiliTools/commit/d33013aebe26db553bd0145b66ae8972470c5627) 支持自定义窗口效果 ([#163](https://github.com/btjawa/BiliTools/issues/170))
- [`3e36a43`](https://github.com/btjawa/BiliTools/commit/b4a94506706a8352c5f9bfd0109b1e75f7198a13) 支持 Linux arm64

## 修复

- [`0f6017f`](https://github.com/btjawa/BiliTools/commit/0f6017f51af5947e22f26663224b1e01adbcfcc4) 修复点号导致路径解析错误的问题 ([#165](https://github.com/btjawa/BiliTools/issues/165))
- [`3e36a43`](https://github.com/btjawa/BiliTools/commit/3e36a439d9a71cb0095f561415ed99dadaf540fe) 重构弹幕解析逻辑，修复空弹幕处理逻辑
- [`3e36a43`](https://github.com/btjawa/BiliTools/commit/b4a94506706a8352c5f9bfd0109b1e75f7198a13) 重新构建所有 Sidecar ([#167](https://github.com/btjawa/BiliTools/issues/167))

## [1.4.0-7] - 2025-09-06

## 更新

- [`c7be98d`](https://github.com/btjawa/BiliTools/commit/c7be98d068f48601b9401a765f21eade5368547d) 支持 Linux -> Debian 系统 ([#97](https://github.com/btjawa/BiliTools/issues/97))
- [`db6ade4`](https://github.com/btjawa/BiliTools/commit/db6ade470b06ad9a32aad09d4c57a757089c6fd7) 支持自动迁移数据库 ([#154](https://github.com/btjawa/BiliTools/issues/154))
- [`db6ade4`](https://github.com/btjawa/BiliTools/commit/db6ade470b06ad9a32aad09d4c57a757089c6fd7) 支持更详细的错误栈追踪 & 微调调色方案
- [`d042886`](https://github.com/btjawa/BiliTools/commit/d042886641ea95f646ce985a6ebd2caf7c405439) 支持解析历史记录 ([#107](https://github.com/btjawa/BiliTools/pull/107))

## 修复

- [`cc74e3b`](https://github.com/btjawa/BiliTools/commit/cc74e3bbb06d6424b63d4356791502ef6d5738e4) 修复 FLAC 在 MKV 下的混流问题 ([#151](https://github.com/btjawa/BiliTools/issues/151))
- [`6c347a5`](https://github.com/btjawa/BiliTools/commit/6c347a5b8c46d8990b24eeb30a331d7dc9105441) 适配多种合集的解析方案 ([#158](https://github.com/btjawa/BiliTools/issues/158), [#159](https://github.com/btjawa/BiliTools/issues/159))

## [1.4.0-6] - 2025-09-02

## 更新

- [`210a1ba`](https://github.com/btjawa/BiliTools/commit/210a1ba48508463947648360165a238d8d85285a) 支持设置是否检测重名 ([#146](https://github.com/btjawa/BiliTools/issues/146))
- [`27a48bb`](https://github.com/btjawa/BiliTools/commit/27a48bbd2baf652aaadb0a0be9e97b054972075d) [`d78fd38`](https://github.com/btjawa/BiliTools/commit/d78fd3862be898b062012c082001ab8ff023c6d5) 支持 Shift 多选 ([#129](https://github.com/btjawa/BiliTools/issues/129))
- [`4e82999`](https://github.com/btjawa/BiliTools/commit/4e82999946f6c5e948eca2ebd89069dc453247f5) [`31721fe`](https://github.com/btjawa/BiliTools/commit/31721fe12eae83ebf0787d6af0d582af87262d05) 支持监听剪切板 ([#70](https://github.com/btjawa/BiliTools/issues/70))
- [`b82414d`](https://github.com/btjawa/BiliTools/commit/b82414dbce214ebf5a5ae05c51d5d2ff7e8ed5d9) [`3924441`](https://github.com/btjawa/BiliTools/commit/39244411ac8c41deed3ac65a7e540f65bc7c7543) 支持自动迁移数据库 ([#125](https://github.com/btjawa/BiliTools/issues/125))
- [`b82414d`](https://github.com/btjawa/BiliTools/commit/b82414dbce214ebf5a5ae05c51d5d2ff7e8ed5d9) 支持控制是否创建顶层文件夹 ([#141](https://github.com/btjawa/BiliTools/issues/141))
- [`b82414d`](https://github.com/btjawa/BiliTools/commit/b82414dbce214ebf5a5ae05c51d5d2ff7e8ed5d9) 支持 Scheduler 级别控制 & 自动恢复下载任务 ([#136](https://github.com/btjawa/BiliTools/issues/136), [#41](https://github.com/btjawa/BiliTools/issues/41))
- [`220fb70`](https://github.com/btjawa/BiliTools/commit/220fb709fcf0d18a2a1618db99b8dc3bebef57d6) 支持 ISO 8601 的完整占位符 ([#134](https://github.com/btjawa/BiliTools/issues/134))

## 修复

- [`89caa66`](https://github.com/btjawa/BiliTools/commit/89caa665a94875301038fc0159997591ba677465) 修复临时路径指向错误的恶性漏洞
- [`b82414d`](https://github.com/btjawa/BiliTools/commit/b82414dbce214ebf5a5ae05c51d5d2ff7e8ed5d9) 修复无法输出 FLAC 的问题 ([#138](https://github.com/btjawa/BiliTools/issues/138))
- [`b82414d`](https://github.com/btjawa/BiliTools/commit/b82414dbce214ebf5a5ae05c51d5d2ff7e8ed5d9) 增强非法字符的校验 ([#135](https://github.com/btjawa/BiliTools/issues/135))
- [`220fb70`](https://github.com/btjawa/BiliTools/commit/220fb709fcf0d18a2a1618db99b8dc3bebef57d6) 修复任务进度同步问题 ([#130](https://github.com/btjawa/BiliTools/issues/130))


## [1.4.0-5] - 2025-08-22

## 更新

- [`75fc043`](https://github.com/btjawa/BiliTools/commit/75fc043351d9669ee54f09b5316c31344d4f27f1) 支持解析稍后再看 ([#83](https://github.com/btjawa/BiliTools/issues/83))

## 修复

- [`75fc043`](https://github.com/btjawa/BiliTools/commit/75fc043351d9669ee54f09b5316c31344d4f27f1) 修复 aria2c 超时问题 ([#127](https://github.com/btjawa/BiliTools/issues/127), [#122](https://github.com/btjawa/BiliTools/issues/122), [#111](https://github.com/btjawa/BiliTools/issues/111), [#103](https://github.com/btjawa/BiliTools/issues/103), [#93](https://github.com/btjawa/BiliTools/issues/93))
- [`fbe5adc`](https://github.com/btjawa/BiliTools/commit/fbe5adce71b0043cfbe23703fe792b65be64f230) 修复视频列表中索引偏移量问题 ([#128](https://github.com/btjawa/BiliTools/issues/128), [#126](https://github.com/btjawa/BiliTools/issues/126))

## [1.4.0-4] - 2025-08-21

(`1.4.0-3`) Update STORAGE_VERSION to 8

## 更新

- [`f099939`](https://github.com/btjawa/BiliTools/commit/f099939911aadb2c755d57bf6fb7ffd32db37e5a) (`1.4.0-3`) 支持强制转换音频为 `MP3` 格式 （[#95](https://github.com/btjawa/BiliTools/issues/95)）
- [`d758ffe`](https://github.com/btjawa/BiliTools/commit/d758ffea5b01de9e90728799ddf7310db528e8bf) (`1.4.0-3`) 重构命名格式，支持顶层文件夹格式与自定义事件格式
- [`6e11760`](https://github.com/btjawa/BiliTools/commit/6e117604a17aac5c654634b59c4abfb32eeefdc8) (`1.4.0-3`) 支持为音频添加元数据，EAC3 支持
- [`59a3ddb`](https://github.com/btjawa/BiliTools/commit/59a3ddb035c96d2ddb9e4f0116308d1f6b523aff) (`1.4.0-3`) 支持解析子合集与番剧PV等资源 ([#55](https://github.com/btjawa/BiliTools/issues/55), [#64](https://github.com/btjawa/BiliTools/issues/64))

## 修复

- [`d99e608`](https://github.com/btjawa/BiliTools/commit/d99e608ae3e6c6843db14b233241573f070e35b1) 修复若干杂项 BUG
- [`6e11760`](https://github.com/btjawa/BiliTools/commit/6e117604a17aac5c654634b59c4abfb32eeefdc8) (`1.4.0-3`) 规范元数据格式 ([#104](https://github.com/btjawa/BiliTools/issues/104), [#114](https://github.com/btjawa/BiliTools/issues/114))
- [`d758ffe`](https://github.com/btjawa/BiliTools/commit/d758ffea5b01de9e90728799ddf7310db528e8bf) (`1.4.0-3`) 修复 `duration` 字段格式不匹配问题 ([#119](https://github.com/btjawa/BiliTools/issues/119), [#124](https://github.com/btjawa/BiliTools/issues/124))
- [`d758ffe`](https://github.com/btjawa/BiliTools/commit/d758ffea5b01de9e90728799ddf7310db528e8bf) (`1.4.0-3`) 规范文件编号排序 ([#115](https://github.com/btjawa/BiliTools/issues/115), [#119](https://github.com/btjawa/BiliTools/issues/119), [#121](https://github.com/btjawa/BiliTools/issues/121))
- [`d758ffe`](https://github.com/btjawa/BiliTools/commit/d758ffea5b01de9e90728799ddf7310db528e8bf) (`1.4.0-3`) 规范文件名，去除非法字符 ([#120](https://github.com/btjawa/BiliTools/issues/120))

## [1.4.0-3] - 2025-08-21

Update STORAGE_VERSION to 8

## 更新

- [`f099939`](https://github.com/btjawa/BiliTools/commit/f099939911aadb2c755d57bf6fb7ffd32db37e5a) 支持强制转换音频为 `MP3` 格式 （[#95](https://github.com/btjawa/BiliTools/issues/95)）
- [`d758ffe`](https://github.com/btjawa/BiliTools/commit/d758ffea5b01de9e90728799ddf7310db528e8bf) 重构命名格式，支持顶层文件夹格式与自定义事件格式
- [`6e11760`](https://github.com/btjawa/BiliTools/commit/6e117604a17aac5c654634b59c4abfb32eeefdc8) 支持为音频添加元数据，EAC3 支持
- [`59a3ddb`](https://github.com/btjawa/BiliTools/commit/59a3ddb035c96d2ddb9e4f0116308d1f6b523aff) 支持解析子合集与番剧PV等资源 ([#55](https://github.com/btjawa/BiliTools/issues/55), [#64](https://github.com/btjawa/BiliTools/issues/64))

## 修复

- [`6e11760`](https://github.com/btjawa/BiliTools/commit/6e117604a17aac5c654634b59c4abfb32eeefdc8) 规范元数据格式 ([#104](https://github.com/btjawa/BiliTools/issues/104), [#114](https://github.com/btjawa/BiliTools/issues/114))
- [`d758ffe`](https://github.com/btjawa/BiliTools/commit/d758ffea5b01de9e90728799ddf7310db528e8bf) 修复 `duration` 字段格式不匹配问题 ([#119](https://github.com/btjawa/BiliTools/issues/119), [#124](https://github.com/btjawa/BiliTools/issues/124))
- [`d758ffe`](https://github.com/btjawa/BiliTools/commit/d758ffea5b01de9e90728799ddf7310db528e8bf) 规范文件编号排序 ([#115](https://github.com/btjawa/BiliTools/issues/115), [#119](https://github.com/btjawa/BiliTools/issues/119), [#121](https://github.com/btjawa/BiliTools/issues/121))
- [`d758ffe`](https://github.com/btjawa/BiliTools/commit/d758ffea5b01de9e90728799ddf7310db528e8bf) 规范文件名，去除非法字符 ([#120](https://github.com/btjawa/BiliTools/issues/120))

## [1.4.0-2] - 2025-08-19

Update STORAGE_VERSION to 7

大规模 UI / UX 重构，重构几乎所有交互逻辑<br>
完全重写下载任务推送逻辑，更加稳定<br>
整合多选下载、打包下载至常规下载<br>
重写错误提交逻辑<br>

从该版本开始，不再提供 universal 版本

## 更新

- [`87eaa5a`](https://github.com/btjawa/BiliTools/commit/87eaa5a5546b533682031720dd9ae1d4e1ace9cc) 重写所有语言的翻译
- [`87eaa5a`](https://github.com/btjawa/BiliTools/commit/87eaa5a5546b533682031720dd9ae1d4e1ace9cc) 添加 “关于” 页面
- [`eaf88ab`](https://github.com/btjawa/BiliTools/commit/eaf88abbd6948836d8aedb7e440706e0da13aa6b) 重构任务并发逻辑
- [`4fde227`](https://github.com/btjawa/BiliTools/commit/4fde227a819d86cb3824bb287536a70584d5ad5b) 使用自建更新源
- [`4fde227`](https://github.com/btjawa/BiliTools/commit/4fde227a819d86cb3824bb287536a70584d5ad5b) [`75558de`](https://github.com/btjawa/BiliTools/commit/75558de62883817839d6e0935dc50f04fc06cff1) 重构任务处理与队列推送逻辑
- [`75558de`](https://github.com/btjawa/BiliTools/commit/75558de62883817839d6e0935dc50f04fc06cff1) 重构前端任务同步逻辑
- [`d6db8b5`](https://github.com/btjawa/BiliTools/commit/d6db8b5809880e551fc883416e44748be3cb07fd) 重构已完成任务存档逻辑
- [`87eaa5a`](https://github.com/btjawa/BiliTools/commit/87eaa5a5546b533682031720dd9ae1d4e1ace9cc) 缩小默认窗口大小 ([#96](https://github.com/btjawa/BiliTools/issues/96), [#83](https://github.com/btjawa/BiliTools/issues/83))
- [`87eaa5a`](https://github.com/btjawa/BiliTools/commit/87eaa5a5546b533682031720dd9ae1d4e1ace9cc) [`eaf88ab`](https://github.com/btjawa/BiliTools/commit/eaf88abbd6948836d8aedb7e440706e0da13aa6b) 整合多选下载、打包下载与常规下载 ([#87](https://github.com/btjawa/BiliTools/issues/87), [#80](https://github.com/btjawa/BiliTools/issues/80), [#81](https://github.com/btjawa/BiliTools/issues/81))
- [`75558de`](https://github.com/btjawa/BiliTools/commit/75558de62883817839d6e0935dc50f04fc06cff1) 支持解析 XML 格式弹幕 ([#118](https://github.com/btjawa/BiliTools/issues/118))
- [`eaf88ab`](https://github.com/btjawa/BiliTools/commit/eaf88abbd6948836d8aedb7e440706e0da13aa6b) 支持屏蔽 PCDN ([#77](https://github.com/btjawa/BiliTools/issues/77))
- [`4fde227`](https://github.com/btjawa/BiliTools/commit/4fde227a819d86cb3824bb287536a70584d5ad5b) 支持视频发布日期变量（[#68](https://github.com/btjawa/BiliTools/issues/68)）
- [`75558de`](https://github.com/btjawa/BiliTools/commit/75558de62883817839d6e0935dc50f04fc06cff1) 为 macOS 分发包增加签名 ([#103](https://github.com/btjawa/BiliTools/issues/103), [#91](https://github.com/btjawa/BiliTools/issues/91), [#26](https://github.com/btjawa/BiliTools/issues/26))

## 修复

- [`87eaa5a`](https://github.com/btjawa/BiliTools/commit/87eaa5a5546b533682031720dd9ae1d4e1ace9cc) 修复 `uname` 字段不存在问题 ([#82](https://github.com/btjawa/BiliTools/issues/82), [#94](https://github.com/btjawa/BiliTools/issues/94), [#113](https://github.com/btjawa/BiliTools/issues/113), [#117](https://github.com/btjawa/BiliTools/issues/117))
- [`eaf88ab`](https://github.com/btjawa/BiliTools/commit/eaf88abbd6948836d8aedb7e440706e0da13aa6b) 修复合集中无法解析分P问题 ([#108](https://github.com/btjawa/BiliTools/issues/108))
- [`eaf88ab`](https://github.com/btjawa/BiliTools/commit/eaf88abbd6948836d8aedb7e440706e0da13aa6b) 修复收藏夹缺少 `cid` 参数问题 ([#106](https://github.com/btjawa/BiliTools/issues/106))
- [`eaf88ab`](https://github.com/btjawa/BiliTools/commit/eaf88abbd6948836d8aedb7e440706e0da13aa6b) 修复下载任务推送错误处理问题 ([#86](https://github.com/btjawa/BiliTools/issues/86))
- [`d6db8b5`](https://github.com/btjawa/BiliTools/commit/d6db8b5809880e551fc883416e44748be3cb07fd) 修复 NFO 参数问题 ([#89](https://github.com/btjawa/BiliTools/issues/89), [#78](https://github.com/btjawa/BiliTools/issues/78))
- [`d6db8b5`](https://github.com/btjawa/BiliTools/commit/d6db8b5809880e551fc883416e44748be3cb07fd) Aria2c JSONRPC 调用重构 ([#100](https://github.com/btjawa/BiliTools/issues/100))
- [`d6db8b5`](https://github.com/btjawa/BiliTools/commit/d6db8b5809880e551fc883416e44748be3cb07fd) 修复部分机器上的监听端口与地址问题 ([#111](https://github.com/btjawa/BiliTools/issues/111), [#93](https://github.com/btjawa/BiliTools/issues/93))

## [1.4.0-1] - 2025-06-19

## 修复

- [`a6c4a64`](https://github.com/btjawa/BiliTools/commit/a6c4a646dfc795e4f8879e03a989c289a3a72e13) 更新头图链接使用的 API 字段 ([#72](https://github.com/btjawa/BiliTools/issues/72) by [@AgentOpen](https://github.com/AgentOpen))

## [1.3.8] - 2025-06-14

Update STORAGE_VERSION to 6

### 更新

- [`c8f353a`](https://github.com/btjawa/BiliTools/commit/c8f353a0f8c6d2037e8b59c077abd8c3dce9f38b) NFO 元数据刮削 (Preview) ([#54](https://github.com/btjawa/BiliTools/issues/54) by [@Excitedfighter](https://github.com/Excitedfighter))
- [`d08bad2`](https://github.com/btjawa/BiliTools/commit/d08bad255689b06c24cea5297f92f84d58eaa76c) 为 DASH 格式增加描述

### 修复

- [`c8f353a`](https://github.com/btjawa/BiliTools/commit/c8f353a0f8c6d2037e8b59c077abd8c3dce9f38b) 修复选择界面溢出问题 ([#56](https://github.com/btjawa/BiliTools/issues/56) by [@ream2006](https://github.com/ream2006))
- [`c8f353a`](https://github.com/btjawa/BiliTools/commit/c8f353a0f8c6d2037e8b59c077abd8c3dce9f38b) 修复 FLAC 解析问题
- [`d08bad2`](https://github.com/btjawa/BiliTools/commit/d08bad255689b06c24cea5297f92f84d58eaa76c) 修复 Dolby 解析问题
- [`d08bad2`](https://github.com/btjawa/BiliTools/commit/d08bad255689b06c24cea5297f92f84d58eaa76c) 修复收藏夹链接解析问题 ([#58](https://github.com/btjawa/BiliTools/issues/58) by [@C2dark](https://github.com/C2dark))
- [`d08bad2`](https://github.com/btjawa/BiliTools/commit/d08bad255689b06c24cea5297f92f84d58eaa76c) 修复 MP4 格式解析问题

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
