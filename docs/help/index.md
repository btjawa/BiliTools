# 常见问题

## 杀毒软件报告木马

我们可以保证应用中无任何恶意代码，可以确定为**误报**。鉴于此为架构问题，你可以跟进 [tauri#2486](https://github.com/tauri-apps/tauri/issues/2486)。

## 已损坏，无法打开

打开 `终端` 运行以下命令移除隔离：

```bash
sudo xattr -r -d com.apple.quarantine /Applications/BiliTools.app
```

## Permission denied / Process ... is dead

有以下几种解决方案：

- 检查你下载的版本是否匹配你的平台，参见 [下载 & 安装](/guide/install)
- 在 <i class="fa-brands fa-apple"></i> > 系统设置 > 网络 > 防火墙 中临时禁用防火墙后，重试应用是否恢复正常
- 若以上方案均无效，打开 `终端` 运行以下命令尝试为 Sidecar 加权，随后重启系统：

```bash
sudo chown root:admin /Applications/BiliTools.app/Contents/MacOS/aria2c
sudo chmod +sx /Applications/BiliTools.app/Contents/MacOS/aria2c

sudo chown root:admin /Applications/BiliTools.app/Contents/MacOS/ffmpeg
sudo chmod +sx /Applications/BiliTools.app/Contents/MacOS/ffmpeg

sudo chown root:admin /Applications/BiliTools.app/Contents/MacOS/DanmakuFactory
sudo chmod +sx /Applications/BiliTools.app/Contents/MacOS/DanmakuFactory
```

## ... operation timeout

> [!IMPORTANT]
> 如果是在下载资源时遇到的报错，请升级到 [v1.4.0-5](https://github.com/btjawa/BiliTools/releases/v1.4.0-5) 或更高版本后重试<br>
> 该版本修复了 aria2c 轮询时的部分问题，大概率可以解决此问题

由于仅部分用户报告此问题，且我们无法在测试机器上复现该问题，因此短期内无法解决该问题。

请检查网络问题，以及尝试本页面其他问题提供的解决方案
