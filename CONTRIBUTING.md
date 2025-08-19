# Contributing

> [!IMPORTANT]
> 此项目的开发仍处于早期阶段，因此请耐心等待我们完善此文档。
>
> The development of this project is still in its early stages, so please be patient for us to complete this document.

> [!WARNING] 
> **当前文档为简体中文 (zh-CN) 版。**
> 
> 如您希望贡献其他语言，欢迎提交 Pull Request 或 Issue！
>
> **This document is currently written in Simplified Chinese (zh-CN).**
> 
> If you'd like to contribute versions in other languages, feel free to submit a Pull Request or Issue!

感谢您有意为 BiliTools 做出贡献！我们欢迎任何形式的参与，无论是报告 bug、提出建议、改进文档，亦或是提交代码。

若您欲直接提交您实现的代码，请通过 Pull Request 提交，并遵循 [代码提交](#代码提交) 的规范，并参考 [开发向导](#开发向导)。

若您欲提交建议而并非直接实现，请通过 Issues / Discussions 提交，并遵循 [Issue 与 Discussion](#issue-与-discussion) 的规范。

## 总览

本项目是一个公益、开源，同时仅用于学习与研究的 [哔哩哔哩](https://www.bilibili.com) 资源解析与下载工具。

本项目遵循 [GPL-3.0-or-later](/LICENSE) 开源协议，任何形式的二次分发必须 **继续开源、遵守相同协议、保留原作者及版权信息**。

本项目基于 [Tauri v2](https://v2.tauri.app) 框架构建，采用 “前后端分离” 架构：
- 前端由 [Vite](https://vitejs.dev/) + [Vue3](https://vuejs.org/) 构建，负责用户界面与交互。
- 后端使用 [Rust](https://www.rust-lang.org/) 实现本地功能逻辑，通过 IPC 通道与前端通信。

## 目录与路径结构

> Work in progress.

## Issue 与 Discussion

如果您准备提交 **代码相关问题或建议**（如功能请求、BUG 反馈等）请提交 **Issue**。

对于 **一般性问题**（如 *xxx无法下载*、*xxx报错* 等）请优先发起 **Discussion**。

### Issue

[创建 Issue](https://github.com/btjawa/BiliTools/issues/new/choose) 时，根据对应的需求选择对应的模板，并按照指示填写足够的信息。

根据对应模板的指示填写足够的信息，例如上传足够的日志或截图。

我们会优先处理 *实现参考* 或 *复现步骤* 足够的 Issue。

1. 标题应简要概述主题，**不可留空**，同时保留模板中已有前缀。
2. 强烈建议将日志作为文件上传，而不是粘贴日志文本，后者不便阅读。

### Discussion

[发起 Discussion](https://github.com/btjawa/BiliTools/discussions/new/choose) 时，根据对应的需求选择对应的模板。

1. 标题应简要概述主题，**不可留空**。
2. 正文部分需描述清楚问题，请尽量详细以便于社区帮助您。

## 开发向导

`dev` 分支存储开发中、且不稳定的代码，您在进行开发时应优先使用该分支作为 `base`.

`master` 分支存储已稳定、且可发行的代码，只有在部分文档修改时，才考虑使用该分支。

### 准备

如总览所述，您需要准备以下环境：

- [Rust 1.70+](https://www.rust-lang.org/tools/install)
- [Node.js 20.0+](https://nodejs.org/en/download)

参考 Tauri 官方文档进行完整配置：[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

克隆项目并安装依赖：

```bash
$ git clone https://github.com/btjawa/BiliTools.git
$ cd BiliTools
$ npm install
```

### 技术选型

对于前端，我们推荐优先使用 [TypeScript](https://www.typescriptlang.org/) 而非传统 [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)。

TypeScript 相比后者具有更强的类型系统，有助于在开发阶段修复潜在错误，提升可维护性。

例如：

- 使用 `.ts` 文件而不是 `.js` 文件。
- 在 `.vue` 文件中，为 `<script>` 标签添加 `lang="ts"` 属性:
```vue
<script lang="ts">
</script>
```

### 预览

启动开发服务器：

```bash
npm run tauri dev
```

对于前端，得益于 Vite 的热重载支持，修改源文件后可立刻看到更新后的效果。

对于后端，修改源文件后会触发 Tauri 的自动重新编译，也可中断当前开发服务器实例后，手动重新启动开发服务器。

## 代码提交

所有提交信息都应遵循 [约定式提交](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 规范。

> Work in progress.