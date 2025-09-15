<script setup>
const __APP_VERSION__ = '1.4.0';
</script>

# 下载 & 安装

> [!IMPORTANT]
> 本项目的唯一官方发行渠道为 [GitHub Releases](https://github.com/btjawa/BiliTools/releases)，请注意辨别<br>
> 对于第三方平台分发的安装包，**我们无法保证其完整性与安全性**

若安装后应用无法打开或遇到其他问题，请查阅 [常见问题](/help/)

## <i class="fa-brands fa-windows"></i> Windows

> [!WARNING]
> 暂不支持 Windows ARM 平台，不支持 Windows 7<br>
> 若未安装 `WebView2 运行时`，请前往 [Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2) 获取并安装

| x64 | arm64 |
| ------------------- | --------------- |
| <a target="_blank" :href="`https://github.com/btjawa/BiliTools/releases/download/v${__APP_VERSION__}/BiliTools_${__APP_VERSION__}_x64-setup.exe`">GitHub Releases</a> | / |

下载后，按照常规流程安装即可，按需更改安装路径

## <i class="fa-brands fa-apple"></i> macOS

> [!Warning]
> 支持 macOS 11.0 及以上版本<br>
> **切勿** 直接下载 `tar.gz` 包使用，请下载 `dmg` 镜像

| Intel 芯片 | Apple M 芯片 |
| ----------------------- | -------------------------- |
| <a target="_blank" :href="`https://github.com/btjawa/BiliTools/releases/download/v${__APP_VERSION__}/BiliTools_${__APP_VERSION__}_x64.dmg`">GitHub Releases</a> | <a target="_blank" :href="`https://github.com/btjawa/BiliTools/releases/download/v${__APP_VERSION__}/BiliTools_${__APP_VERSION__}_aarch64.dmg`">GitHub Releases</a> |

下载后，双击 `dmg` 文件挂载镜像，随后在弹出的窗口中将应用图标 **拖拽** 到右侧文件夹图标即可

## <i class="fa-brands fa-linux"></i> Linux

### <i class="fa-brands fa-debian"></i> Debian / <i class="fa-brands fa-ubuntu"></i> Ubuntu

> [!WARNING]
> 支持 Ubuntu 22.04 及以上版本，Debian 12 及以上版本<br>

| x64 | arm64 |
| ------------------- | --------------- |
| <a target="_blank" :href="`https://github.com/btjawa/BiliTools/releases/download/v${__APP_VERSION__}/bilitools_${__APP_VERSION__}_amd64.deb`">GitHub Releases</a> | <a target="_blank" :href="`https://github.com/btjawa/BiliTools/releases/download/v${__APP_VERSION__}/bilitools_${__APP_VERSION__}_arm64.deb`">GitHub Releases</a> |

下载后，定位到下载目录并使用 apt 安装 deb 包：

```bash
sudo apt-get install -y ./bilitools_x.y.z_arch.deb
```
