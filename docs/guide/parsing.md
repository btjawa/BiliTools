# 资源解析

## 搜索

点击左侧边栏的 <i class="fa-solid fa-magnifying-glass"></i> 图标即可切换至搜索页。

页面上侧搜索组件中，左侧为输入栏，略靠右的下拉栏为资源分类，最右侧的按钮为搜索按钮。

> [!TIP]
> 一般情况下，资源分类保持“自动检测”即可。但在以下情况，需手动选择对应资源分类：<br>
> 1. 仅输入了收藏夹 `fid` 的情况
> 2. 仅输入了 **课程** SS 号 / EP 号的情况

目前支持解析：

- 常规链接 / B23.TV 链接 / AV 号 / BV 号
  - https://www.bilibili.com/video/av11451
  - https://www.bilibili.com/video/BV1tx411c77w
  - https://b23.tv/pigt3PQ
  - av11451
  - BV1tx411c77w
- 稍后再看
  - https://www.bilibili.com/list/watchlater/?bvid=BV1tx411c77w&oid=11451
> 对于收藏夹，链接中需带有 `fid` 参数，否则无法解析。<br>
> 暂不支持 ML 收藏夹解析。
- 收藏夹
  - https://space.bilibili.com/7624233/favlist?fid=68586733
  - 68586733
> 暂不支持 MD 号解析。<br>
- 番剧 / 影视 / SS 号 / EP 号
  - https://www.bilibili.com/bangumi/play/ss2539
  - https://www.bilibili.com/bangumi/play/ep341254
  - ss2539
  - ep341254
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

## 解析功能区

解析完成后，页面左侧会展示资源列表，右侧会展示可用的解析功能。

资源列表可通过手动点击左侧复选框选中多个项目，也可通过按下 Shift 键并点击来选中连续项目。

关于选择的注意事项，请参见 [关于风控](/guide/risk)。**不建议一次性选中超过 30 个项目。**

> [!TIP]
> 对于合集、番剧等，右下方会展示对应的标签页，诸如PV、花絮等。<br>
> 对于收藏夹、歌单，右下方会展示“页面”控件，便于翻页（而不是无限滚动）。

### 常规下载

点击后，将会弹出参数页面来确定需要处理的任务。详细注意事项请参见 [选择资源](/guide/resource)。

### 其他信息

> 该功能正开发中。

### 导出数据

该功能可以导出 JSON 格式的媒体存档信息。

你可以在 [`/src/types/shared.d.ts:153:1`](https://github.com/btjawa/BiliTools/blob/v1.4.0/src/types/shared.d.ts#L153) 找到数据结构定义（`interface MediaInfo`）。
