# Contributing

> [!WARNING] 
> **本文档目前为简体中文 (zh-CN) 版。**
> 
> 如您希望贡献其他语言，欢迎提交 Pull Request 或 Issue！
>
> **This document is currently written in Simplified Chinese (zh-CN).**
> 
> If you'd like to contribute versions in other languages, feel free to submit a Pull Request or Issue!

感谢您有兴趣为 BiliTools 做出贡献！

无论是报告 bug、提交代码、改进文档、亦或是提出建议，我们都非常欢迎。

## 问题报告

**请不要在 Issues 中提交与项目无关的内容。**

如果您准备提交功能请求或是报告 bug，请创建 [Issue](https://github.com/btjawa/BiliTools/issues/new/choose)。

对于一般性问题（如 *xxx无法下载*、*xxx报错* 等）或是求助，请发起 [Discussion](https://github.com/btjawa/BiliTools/discussions/new/choose)。

- 请尽可能清晰而准确的描述您的需求或问题，对于错误，请提供尽可能详细的复现步骤。**如果没有充足的错误信息，我们将很难排查问题。**
- 请您耐心等待：我们的时间与精力有限，同时鉴于本项目免费公益的性质，我们无法保证您的问题可被快速处理。

## Pull Request

**提交 PR 时请提交至主仓库的 `dev` 分支，不要提交至 `master` 分支。**

所有提交信息都应遵循 [约定式提交](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 规范，例：
- `feat: add notifications support for macOS`
- `fix: ffmpeg path handling issue`
- `chore: cleanup unused assets`
- `refactor: simplify error handling`
- `docs: update install guide`
- `pref: improve playurl parsing speed`

1. [Fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo) 并克隆仓库
2. 为更改创建一个新分支
3. 遵循上述的提交信息规范来提交更改
4. 将分支推送到您的 Fork，随后在主仓库打开 Pull Request

## 开发向导

请按照 [Tauri 官方文档](https://v2.tauri.app/start/prerequisites/) 配置您的环境。以下依赖有版本要求：
 - [Rust 1.80.0+](https://www.rust-lang.org/tools/install)
 - [Node.js 20.0+](https://nodejs.org/en/download)

### App 开发

在定位到项目根目录后：

- 安装前端依赖

```bash
npm install
```

- 对于 **Ubuntu**，安装以下依赖

```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

- 启动开发服务器

```bash
npm run tauri dev
```

- 构建项目

```bash
npm run tauri build
```

### 文档开发

本项目使用 [Vitepress](https://vitepress.dev/) 托管文档，位于 `docs` 文件夹内，使用单独的 `package.json`。

在定位到 `docs` 目录后：

- 安装依赖

```bash
npm install
```

- 启动文档开发服务器

```bash
npm run docs:dev
```

- 构建文档

```bash
npm run docs:build
```

### 贡献更改

在提交更改前，请至少进行以下质量及编译检查，并确保尽数通过：

- 在 `./` 目录下：

```bash
npm run build
```

- 在 `./src-tauri` 目录下：

```bash
cargo clippy
```

确保代码合格后，请参考 [Pull Request](#pull-request) 进行贡献。

非常感谢您对本项目做出的贡献！

## 技术选型 & 代码风格

### 前端

我们推荐优先使用 [TypeScript](https://www.typescriptlang.org/) 而非传统 [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)。

TypeScript 相比后者具有更强的类型系统，有助于在开发阶段修复潜在错误，提升可维护性。

例：

- 使用 `.ts` 文件而不是 `.js` 文件。
- 在 `.vue` 文件中，为 `<script>` 标签添加 `lang="ts"` 属性:
```html
<script lang="ts">
</script>
```

Vue 开发时，请使用 `Composition API` 而不是 `Options API`。

例：

- 为 `<script>` 标签添加 `setup` 属性：
```html
<script lang="ts" setup>
</script>
```

### 后端

尽可能使用 `anyhow::Result` 代替标准库的 Result，同时请尽可能少的使用 `unwrap()` ，而是使用 `?` 冒泡向上传递错误。

对于关键逻辑，请使用 `anyhow::Context` 添加报错上下文。

## 关于 AI

请不要提交完全由 AI 生成，且未经您本人理解、 测试与检查的代码。

AI 工具可以辅助您更高效的开发，但请不要让 AI 负责编写全部代码。

因此，最终提交的代码需：

- 符合项目整体的代码风格；
- 经过充分测试、检查与验证；
- 可以由您本人清楚解释其实现逻辑。