# 设置页

在左侧侧栏中，点击最下方的齿轮即可进入设置页面。<br>
在此页，你可以配置应用的各项行为，包括但不限于：存储、下载、策略、格式。

## <i class="fa-solid fa-sliders"></i> 通用

在第一次启动应用时 / 数据库重置后，会尝试自动检测系统语言。<br>
若系统语言未知或未被适配，将回退为美国英语 (en-US).

### 主题

你可以使用 `遵循系统` 来自适应系统主题，也可以使用 `深色` 或 `浅色` 指定主题。

### 窗口效果

配置在各操作系统上可供使用的窗口效果。

你可以在 [此处](https://github.com/tauri-apps/window-vibrancy?tab=readme-ov-file#screenshots) 预览这些效果。

- 自动
  - Windows 11 默认使用 [云母 (Mica)](https://learn.microsoft.com/en-us/windows/apps/design/style/mica) 效果，macOS 10.11+ 默认使用 [Sidebar](https://developer.apple.com/documentation/appkit/nsvisualeffectview#overview) 效果。
- Mica 
  - 即云母效果，仅适用于 Windows 11.
- Acrylic
  - 即亚克力效果，适用于 Windows 10/11.
  - 在 Windows 10 v1903+ 及 Windows 11 build 22000 上，该效果会导致 [窗口拖拽产生延迟](https://github.com/tauri-apps/window-vibrancy?tab=readme-ov-file#available-functions)。
- Sidebar
  - 仅适用于 macOS 10.11+.
- 无
  - 不应用窗口效果，使用默认不透明配色方案。

### 监听剪切板

启用后，则会自动检测剪贴板中是否含有有效哔哩哔哩链接，并自动搜索。

### 通知系统

启用后，将会在 **单次多选 / 单选** 的所有任务处理完成时，发送系统通知。

### 自动开始下载

启用后，将会在添加任务后自动开始下载。

## <i class="fa-solid fa-database"></i> 存储

### 路径

> [!TIP]
> 为避免混乱，临时文件的真实存放路径为 `临时文件/com.btjawa.bilitools`。

点击左侧显示路径的 <code style="color: #a2a7ae">浅色按钮</code> 可打开对应路径，点击右侧文件夹图标的 <code style="color: rgb(0, 161, 214)">深色按钮</code> 可更改对应路径。

在下载 / 处理文件时，应用会先存储至临时目录。在处理完成后文件会被复制至输出目录，随后删除临时目录中的对应文件。
输出目录中文件夹、文件的命名将会遵循 [命名格式](#命名格式) 中配置的格式。

有时（例如在下载时退出应用）会导致部分文件滞留在临时目录。若不打算断点续传，可在 [缓存](#缓存) 中清除 `临时文件` 缓存。

### 缓存

点击左侧显示路径的 <code style="color: #a2a7ae">浅色按钮</code> 可打开对应缓存路径，点击右侧文件夹图标的 <code style="color: rgb(0, 161, 214)">深色按钮</code> 可清除对应缓存。

- 日志
  - 应用运行时记录的状态信息，在分析报错时非常有用，因此在提交 Issue 时请附上日志。
- 临时文件
  - 即 [路径](#路径) 中提到的临时目录。
- WebView 缓存
  - Edge WebView2 (该应用的运行时) 产生的缓存，可定期清理。
- 数据库
  - 应用存储配置、下载信息、登录信息等使用的数据库，删除即为重置应用。

### 操作数据库

> [!CAUTION]
> 请确保在没有下载任务时导入数据库，否则下载数据可能出现损坏。

导出即备份数据库，导入即恢复数据库。

请确保数据库中的 `meta` 表均已迁移至最新版本，否则表可能在运行时因迁移机制被丢弃。

请确保数据库中的数据符合类型定义，否则运行时将无法读取数据。

## <i class="fa-solid fa-download"></i> 下载

### 默认选项

在下载参数选择界面初始化时，及下载过程中尝试自动回退时，会使用到这些参数。

在下载资源时，若目标资源不支持其中配置的某一参数：

- 例：目标视频最高仅有 `720P 准高清`，而此处的参数中配置了 `1080P 高清`

则会自动回退到此资源支持的最高参数（在上面的例子中是 `720P 准高清`）。

### 最大并发下载数

> [!WARNING]
> 若该值较高，可能导致 [风控](/guide/risk) 概率上升。

控制最大并发处理任务的数量。

## <i class="fa-solid fa-bullseye"></i> 策略

> [!CAUTION]
> 此处是高级配置。如果你不 **清楚** 了解每一个选项的含义及作用，请勿更改它们。

### 自动为音频文件嵌入元数据

在下载音乐时，该功能可以派上用场。

考虑到部分音频格式的适配与兼容问题，暂不会写入封面图像

启用后，会在下载音频文件时自动为音频文件写入以下元数据信息：
- 标题 (`title`)
- 编号 (`track`)
- 艺术家 / 作者 (`ARTIST / artist`)
- 日期 (`DATE & YEAR`，`YYYY-MM-DD`)
- 标题 (`title`)
- 流派 / 标签 (`GENRE / genre`)
- 备注 / 简介 (`comment`)

### 尝试屏蔽 PCDN

实现参考：[#77](https://github.com/btjawa/BiliTools/issues/77), [LINUX.DO](https://linux.do/t/topic/642419)

若启用，则会尝试在下载时优先选择质量更高的下载链接，并尝试过滤 PCDN 链接。

因为是 “尝试”，因此会有一定概率碰到启用该选项后，无法下载或下载非常缓慢的情况。此时请关闭该选项后再次重试。

（如果可以的话，请同时报告 Issue，并贴上你的运营商或地区。）

### 转换策略

### 将 XML 弹幕转换为 ASS 字幕

在下载弹幕时，该功能可以派上用场。

启用后，会在下载弹幕文件时调用 [DanmakuFactory](https://github.com/hihkm/DanmakuFactory) 将从 ProtoBuf 裸流生成的 XML 文件转换为可供播放器使用的外挂字幕。

在使用诸如 PotPlayer 的播放器时，挂载转换过的字幕就可以在观看时享受弹幕了。

可编辑（或创建）以下文件来自定义 DanmakuFactory 配置：

> Windows: `%AppData%\com.btjawa.bilitools\DanmakuFactory.json`<br>
> macOS: `$HOME/Library/Application Support/com.btjawa.bilitools/DanmakuFactory.json`<br>
> Linux: `$HOME/.local/share/com.btjawa.bilitools/DanmakuFactory.json`

示例配置：

```json
{
  "resolution": [1920, 1080],
  "scrolltime": 12.000000,
  "fixtime": 5.000000,
  "density": 0,
  "fontname": "Microsoft YaHei",
  "fontsize": 38,
  "opacity": 180,
  "outline": 0.0,
  "shadow": 1.0,
  "displayArea": 1.000000,
  "scrollArea": 1.000000,
  "bold": false,
  "showUsernames": false,
  "showMsgbox": false,
  "msgboxSize": [500, 1080],
  "msgboxPos": [20, 0],
  "msgboxFontsize": 38,
  "msgboxDuration": 0.00,
  "giftMinPrice": 0.00,
  "giftMergeTolerance": 0.00,
  "blockmode": [],
  "statmode": []
}
```

### 将音频转换为 MP3 格式

> [!WARNING]
> 在下载高音质 / 比特率的音频时，不建议启用此选项。

启用后，会在下载音频时调用 FFmpeg 将音频文件 **强制** 转换为 MP3 格式的音频文件。对于高音质 / 比特率的音频，有损失音质的可能。

### 组织策略

详细请见 [命名](#命名)。

> [!TIP]
> 若禁用 [顶层文件夹](#顶层文件夹)，则会直接将 “输出目录” 视为 “顶层文件夹”。

### 自动检测重名

若启用了此选项，则会在下载时检查文件是否重名，并自动重命名。
```
文件夹
文件夹_1
文件夹_2
```

### 顶层文件夹

若启用了此选项，则每个任务在下载时在输出目录新建 “顶层文件夹”，将文件存放于其中。
```txt
输出目录
└── 顶层文件夹
      └── 文件
```

若禁用用了此选项，则每个任务在下载时将会把文件 “平铺” 存放于输出目录中，不再创建顶层文件夹。
```txt
输出目录
  └── 文件
```

### 子文件夹

若启用了此选项，则每个任务在下载时在顶层文件夹中新建 “子文件夹”，将文件存放于其中。
```txt
顶层文件夹
  └── 子文件夹
      └── 文件
```

若禁用了此选项，则每个任务在下载时将会把文件 “平铺” 存放于顶层文件夹中，不再创建子文件夹。
```txt
顶层文件夹
  └── 文件
```

## <i class="fa-solid fa-file-signature"></i> 命名

> [!TIP]
> 此处可以配置下载时文件夹及文件使用的命名格式。<br>
> 此处的配置会影响 [输出文件](#存储)，同时 [组织策略](#组织策略) 会影响是否创建对应文件夹。

时间格式自定义参见 [时间格式](#时间格式)。

应用在下载时，默认采用的文件夹结构为：

```txt
输出目录
└── 顶层文件夹
    ├── poster.jpg
    ├── tvshow.nfo
    └── 子文件夹
        ├── 刮削.nfo
        ├── 弹幕.ass
        ├── 弹幕.xml
        ├── 视频.mp4
        └── 文件名
```

`顶层文件夹`、`子文件夹` 及 `文件名` 可以自定义上述结构中对应节点的命名格式。

点击对应变量的按钮即可向输入框中添加对应变量，若手动输入，请注意变量格式为 `{变量}`（两边大括号需闭合）否则变量不会生效。

若某资源没有对应的变量（例如视频没有 `EP号` `SS号`），该变量则会留空。

对于 `/` `\` `:` `*` `?` `"` `<` `>` `|` 非法字符，会被一律替换为下划线（`_`）。

`顶层文件夹` 可供使用的变量较少的原因是：
- 顶层文件夹在任务处理流程中是唯一的，不可受每种资源的 ID 影响（例如，每个任务的 AID / BVID 不一致）
- 需要考虑 `收藏夹` 这种脏数据的兼容性问题

### 部分示例

若设置如下命名格式：

- 顶层文件夹
  - `{container} - {showtitle} ({downtime:YYYY-MM-DD_HH-mm-ss})`
- 子文件夹
  - `({index}) {mediaType} - {title}`
- 文件名
  - `{taskType} - {title}`

输出效果如下：

```txt
输出目录
└── 收藏夹 - 标题 (2020-01-01_00-00-00)
    ├── (1) 视频 - 标题
    │   ├── 单集刮削 - 标题.nfo
    │   ├── 实时弹幕 - 标题.ass
    │   ├── 历史弹幕 - 标题.xml
    │   ├── 音视频 - 标题.mp4
    │   └── 字幕 - 标题.zh-CN.srt
    ├── (2) 番剧 - 标题
    ...
```

### 时间格式

`{pubtime}` 与 `{downtime}` 变量支持格式化时间。

目前提供两种格式化方案：
- `{var:<ISO8601>}`
  - 格式需遵循 [ISO8601](https://www.wikiwand.com/en/articles/ISO_8601) 标准
- `{var:ts}`
  - 填充为秒级 UNIX 时间戳

| 常见格式 | 预览 |
|---------|------|
| `{downtime:YYYY-MM-DD_HH-mm-ss}` | 2020-01-01_00-00-00 |
| `{downtime:YYYY年MM月DD日}` | 2020年01月01日 |
| `{downtime:YYYY-MM-DD}` | 2020-01-01 |
| `{downtime:HH:mm:ss}` | 00:00:00 |
| `{downtime:ts}` | 1577836800 |
