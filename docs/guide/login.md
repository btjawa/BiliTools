# 关于登录

## 简介

就成功率而言，目前 扫码登录 > 短信登录 > 密码登录

由于登录逻辑基于哔哩哔哩的 Web API，因此登录过程实质为模拟 Chrome 浏览器的登录过程<br>
所以，在登录后账号后台看到的提示很大概率为 “Chrome 浏览器”

目前已知密码/短信登录会提示 “未知设备”，密码登录目前因风控问题暂不可用

## 导入 Cookie

> [!CAUTION]
> 编辑数据库有一定风险，请确保你知道自己正在做什么。

参考 Discussion [#152](https://github.com/btjawa/BiliTools/discussions/152)

如果你在哔哩哔哩官方网站获得了 Cookie 序列，可以通过编辑数据库的方式来直接使用这些 Cookie。

使用支持 SQLite 的数据库编辑器打开应用数据库：

> Windows: `%APPDATA%\com.btjawa.bilitools\Storage`<br>
> macOS: `$HOME/Library/Application Support/com.btjawa.bilitools/Storage`<br>
> Linux: `$HOME/.local/share/com.btjawa.bilitools/Storage`

切换至 `cookies` 表，将 Cookies 拆分成键值对，随后插入数据库即可。其余字段（如 `path` `domain` 等）可留空，如果你知道如何获取这些字段的话，也可填入。
