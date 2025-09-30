# 资源解析

## 搜索

点击左侧边栏的 <i class="fa-solid fa-magnifying-glass"></i> 图标即可切换至搜索页。

页面上侧搜索组件中，左侧为输入栏，略靠右的下拉栏为资源分类，最右侧的按钮为搜索按钮。

> [!TIP]
> 一般情况下，资源分类保持“自动检测”即可。但在以下情况，需手动选择对应资源分类：<br>
> 1. 仅输入了 **纯数字** 的情况
> 2. 仅输入了 **课程** SS 号 / EP 号的情况

> [!IMPORTANT]
> 哔哩哔哩正在合并”专栏“与”动态“为图文，本项目也做了如此处理，请注意辨别资源分类类型。

目前支持解析：

- 常规链接 / B23.TV 链接 / AV 号 / BV 号
  - https://www.bilibili.com/video/av11451
  - https://www.bilibili.com/video/BV1tx411c77w
  - https://b23.tv/pigt3PQ
  - av11451
  - BV1tx411c77w
- 分享链接
  - 【【手描き】 End of Daylight PV 【描いてみたよん】】 https://www.bilibili.com/video/BV1tx411c77w/?share_source=copy_web&vd_source=xxx
- 稍后再看
  - https://www.bilibili.com/watchlater/list
  - https://www.bilibili.com/list/watchlater/?bvid=BV1tx411c77w&oid=11451
- 番剧 / 影视 / SS 号 / EP 号 / MD 号
  - https://www.bilibili.com/bangumi/play/ss2539
  - https://www.bilibili.com/bangumi/play/ep341254
  - https://www.bilibili.com/bangumi/media/md28228367
  - ss2539
  - ep341254
  - md28228367
- 课程 / SS 号 / EP 号
  - https://www.bilibili.com/cheese/play/ss61
  - https://www.bilibili.com/cheese/play/ep812
  - ss61
  - ep812
- 音乐 / AU 号
  - https://www.bilibili.com/audio/au3741236
  - au3741236
- 歌单 / AM 号
  - https://www.bilibili.com/audio/am86055
  - am86055
- 用户投稿视频 & 合集
  - https://space.bilibili.com/8047632
  - https://space.bilibili.com/8047632/video
  - https://space.bilibili.com/8047632/upload/video
  - https://space.bilibili.com/8047632/lists
  - https://space.bilibili.com/8047632/lists/5747470
  - 8047632
- 用户投稿图文（专栏 & 动态）
  - https://space.bilibili.com/8047632/article
  - https://space.bilibili.com/8047632/upload/opus
  - https://www.bilibili.com/read/cv1
  - https://www.bilibili.com/opus/38554821905721204
  - cv1
  - 38554821905721204
- 用户投稿音频
  - https://space.bilibili.com/8047632/audio
  - https://space.bilibili.com/8047632/upload/audio
- 用户收藏夹
  - https://space.bilibili.com/8047632/favlist
  - https://space.bilibili.com/8047632/favlist?fid=338926432
  - 338926432

## 解析功能区

解析完成后，页面左侧会展示资源列表，右侧会展示可用的解析功能。

资源列表可通过手动点击左侧复选框选中多个项目，也可通过按下 Shift 键并点击来选中连续项目。

关于选择的注意事项，请参见 [关于风控](/guide/risk)。**不建议一次性选中超过 30 个项目。**

> [!TIP]
> 对于合集、番剧等，右下方会展示对应的标签页，诸如PV、花絮等。<br>
> 对于收藏夹、歌单等，右下方会展示“页面”控件，便于翻页（而不是无限滚动）。

### 常规下载

点击后，将会弹出参数页面来确定需要处理的任务。详细注意事项请参见 [选择资源](/guide/resource)。

### 导出数据

该功能可以导出 JSON 格式的媒体存档信息。

你可以在 [`/src/types/shared.d.ts:202:1`](https://github.com/btjawa/BiliTools/blob/v1.4.4/src/types/shared.d.ts#L204) 找到数据结构定义（`interface MediaInfo`）。
