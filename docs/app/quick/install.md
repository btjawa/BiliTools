<script setup>
const APP_VERSION = '1.4.0-6';
</script>

# 下载 & 安装

> [!IMPORTANT]
> 本项目的唯一官方发行渠道为 [GitHub Releases](https://github.com/btjawa/BiliTools/releases)，请注意辨别<br>
> 对于第三方平台分发的安装包，**我们无法保证其完整性与安全性**

若安装后应用无法打开或遇到其他问题，请查阅 [常见问题](/help/windows)

## <i class="fa-brands fa-windows"></i> Windows

> [!WARNING]
> 暂不支持 Windows ARM 平台，不支持 Windows 7<br>
> 若未安装 `WebView2 运行时`，请前往 [Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2) 获取并安装

| x64 (x86-64, amd64) | arm64 (aarch64) |
| ------------------- | --------------- |
| <a target="_blank" :href="`https://github.com/btjawa/BiliTools/releases/download/v${APP_VERSION}/BiliTools_${APP_VERSION}_x64-setup.exe`">GitHub Releases</a> | / |

下载后，按照常规流程安装即可，按需更改安装路径

## <i class="fa-brands fa-apple"></i> macOS

> [!Warning]
> 尚未验证版本低于 macOS 11.0 的机器可否正常运行<br>
> **切勿** 直接下载 `tar.gz` 包使用，请下载 `dmg` 镜像

| Intel 芯片 (x64, amd64) | M 系列芯片 (arm64, aarch64) |
| ----------------------- | -------------------------- |
| <a target="_blank" :href="`https://github.com/btjawa/BiliTools/releases/download/v${APP_VERSION}/BiliTools_${APP_VERSION}_x64.dmg`">GitHub Releases</a> | <a target="_blank" :href="`https://github.com/btjawa/BiliTools/releases/download/v${APP_VERSION}/BiliTools_${APP_VERSION}_aarch64.dmg`">GitHub Releases</a> |

下载后，双击 `dmg` 文件挂载镜像，随后在弹出的窗口中将应用图标 **拖拽** 到右侧文件夹图标即可

## <i class="fa-brands fa-linux"></i> Linux

> [!INFO]
> 由于 `AppImage` 的局限性，我们正在寻找新的打包方案<br>
> 可在此 Issue 跟踪进度：[#97](https://github.com/btjawa/BiliTools/issues/97)