# Contributing

> [!WARNING] 
> **本文档目前仅有简体中文 (zh-CN) 版。**
> 
> 如您希望贡献其他语言，欢迎提交 Pull Request 或 Issue！
>
> **This document is currently written in Simplified Chinese (zh-CN).**
> 
> If you'd like to contribute versions in other languages, feel free to submit a Pull Request or Issue!

感谢您有意为 BiliTools 做出贡献！

无论是报告 bug、提出建议、改进文档、亦或是提交代码，我们都非常欢迎。

## 总览

本项目是一个公益、开源的 [哔哩哔哩](https://www.bilibili.com) 工具箱，旨在学习技术与测试代码。

本项目遵循 [GPL-3.0-or-later](/LICENSE) 开源协议，任何形式的二次分发必须 **继续开源、遵守相同协议、保留原作者及版权信息**。

本项目基于 [Tauri v2](https://v2.tauri.app) 框架构建，采用 “前后端分离” 架构：
- 前端由 [Vite](https://vitejs.dev/) + [Vue3](https://vuejs.org/) 构建，负责用户界面与交互
- 后端使用 [Rust](https://www.rust-lang.org/) 实现本地功能逻辑，通过 IPC 通道与前端通信

## 目录结构

- `src/` 前端源代码
  - `assets/` 静态资源
  - `components/` 各 Vue 组件
  - `views/` 页面入口
  - `lib/` 静态库
  - `proto/` ProtoBuf 相关
  - `router/` 页面导航路由
  - `services/` 前端逻辑 (API 请求，推送队列与同步状态等)
  - `store/` Pinia 全局响应式状态管理
  - `i18n/` 多语言支持
    - `locales` 多语言翻译
  - `types/` TS 类型声明
- `src-tauri`
  - `binaries/` Sidecar
  - `capabilities/` Tauri 运行时权限
  - `src/` 后端源代码
    - `services/` 后端服务 (aria2c, ffmpeg, login, queue)
    - `storage/` 数据持久化 (config, cookies, archive)
- `scripts/` 构建工具脚本

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

启动开发服务器与实例：

```bash
npm run tauri dev
```

### 分支策略

- `dev`：开发分支，存储开发中、且不稳定的代码，提交新功能与修复
- `master`：稳定分支，仅在发布版本时合并

**提交 PR 时请提交至主仓库的 `dev` 分支，切勿提交至 `master` 分支。**

### 提交规范

所有提交信息都应遵循 [约定式提交](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 规范。

例：
- `feat: notifications for Linux`
- `fix: increase aria2c polling interval`
- `chore: cleanup unused assets`

### 代码风格 & 技术选型

#### 前端

我们推荐优先使用 [TypeScript](https://www.typescriptlang.org/) 而非传统 [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)。

TypeScript 相比后者具有更强的类型系统，有助于在开发阶段修复潜在错误，提升可维护性。

例如：

- 使用 `.ts` 文件而不是 `.js` 文件。
- 在 `.vue` 文件中，为 `<script>` 标签添加 `lang="ts"` 属性:
```html
<script lang="ts">
</script>
```

Vue 开发时，请使用 `Composition API` 而不是 `Options API`。

例如：

- 为 `<script>` 标签添加 `setup` 属性：
```html
<script lang="ts" setup>
</script>
```

#### 后端

尽可能使用 `anyhow::Result` 代替标准库的 Result，同时请尽可能少的使用 `unwrap()` ，而是使用 `?` 冒泡向上传递错误。

对于关键逻辑，请使用 `anyhow::Context` 添加报错上下文。