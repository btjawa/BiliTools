<div align="center">
<img src=".github/logo.svg" width=500 />

<h1>BiliTools - Bilibili ツールボックス</h1>

<div>
<a href="https://github.com/btjawa/BiliTools/stargazers" target="_blank"><img src="https://img.shields.io/github/stars/btjawa/BiliTools" /></a>
<a href="https://github.com/btjawa/BiliTools/forks" target="_blank"><img src="https://img.shields.io/github/forks/btjawa/BiliTools" /></a>
<a href="https://github.com/btjawa/BiliTools/actions/workflows/release.yml" target="_blank"><img src="https://img.shields.io/github/actions/workflow/status/btjawa/BiliTools/release.yml" /></a>
<a href="https://github.com/btjawa/BiliTools/releases/latest" target="_blank"><img src="https://img.shields.io/github/v/release/btjawa/BiliTools" /></a>
<a href="https://github.com/btjawa/BiliTools/blob/master/LICENSE" target="_blank"><img src="https://img.shields.io/github/license/btjawa/BiliTools" /></a>
</div>

<a href="https://trendshift.io/repositories/13286" target="_blank">
    <img src="https://trendshift.io/api/badge/repositories/13286" alt="btjawa%2FBiliTools | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/>
</a>

[简体中文](./README.md) | [English](/README_EN.md) | 日本語 | [ChangeLog](./CHANGELOG.md) | [Contributing](./CONTRIBUTING.md) | [CODE_OF_CONDUCT](./CODE_OF_CONDUCT.md)
</div>

<hr />

> [!WARNING]
> この記事の翻訳はまだ完全には完了していません。

💡 シンプルで軽量な Bilibili ツールボックス、[Tauri](https://github.com/tauri-apps/tauri) をベースに開発。

- 📖 ドキュメント：[https://bilitools.btjawa.top](https://bilitools.btjawa.top)

- 🧾 その他情報：[https://btjawa.top/bilitools](https://btjawa.top/bilitools)

- 🚀 ダウンロード：[Releases](https://github.com/btjawa/BiliTools/releases)

> [!IMPORTANT] 
> **本プロジェクトは [ビリビリ中国版](https://www.bilibili.com) を対象としています。[ビリビリ海外版](https://www.bilibili.tv) には対応していません。**<br>
> **有料/VIP コンテンツ**の解析とダウンロードは、該当サービスに加入済みのアカウントのみ可能です。<br>

## 🧪 機能

> 中国語版をご覧ください。ここの翻訳は未完成です。

| 资源解析 | 状态    | 备注                      |
|---------|---------|---------------------------|
| 视频    | ✅ 已完成 | <ul><li>支持合集 / 分P / 互动、番剧 / 课程 / 电影</li><li>支持 DASH、MP4、FLV</li><li>支持 4K、8K、HDR、杜比视界</li></ul> |
| 音频    | ✅ 已完成 | <ul><li>支持 AVC、HEVC、AV1</li><li>支持 杜比全景声、Hi-Res</li></ul> |
| 实时弹幕 | ✅ 已完成 | <ul><li>ASS / XML 格式</li><li>可解析弹幕池中几乎所有弹幕</li></ul> |
| 历史弹幕 | ✅ 已完成 | ASS / XML 格式 |
| 音乐    | ✅ 已完成 | 支持无损 FLAC、320Kbps 音乐 / 歌单 |
| 封面    | ✅ 已完成 | 支持番剧 / 电影海报 / 合集封面 / 课程预览等等 |
| 字幕    | ✅ 已完成 | SRT 格式 |
| 收藏夹  | ✅ 已完成 | FID 号解析 |
| NFO刮削 | ✅ 已完成 | 合集/剧集刮削、单集刮削 |
| 元数据  | ✅ 已完成 | 音频文件支持写入基本元数据 |
| AI总结  | ✅ 已完成 | Markdown格式，来自哔哩哔哩 `AI 小助手` |

| 登录 & 验证    | 状态       | 杂项      | 状态      |
|----------------|-----------|-----------|-----------|
| 扫码登录        | ✅ 已完成 | 明暗主题   | ✅ 已完成 |
| 密码登录        | ✅ 已完成 | 监听剪切板 | ✅ 已完成 |
| 短信登录        | ✅ 已完成 | HTTP 代理  | ✅ 已完成 |
| 自动刷新登录状态 | ✅ 已完成 | 过滤 PCDN  | ✅ 已完成 |
| 参数签名        | ✅ 已完成 | 音频转 MP3 | ✅ 已完成 |
| 风控验证        | ✅ 已完成 | 命名格式   | ✅ 已完成 |
| 指纹验证        | ✅ 已完成 | 历史记录   | ✅ 已完成 |

## 🛠️ 参与贡献

> [!TIP]
> ### 本プロジェクトは `1.4.0` 正式版リリース後、安定状態に入り、更新を一時停止します。

本プロジェクトをより良くする為に、ぜひご貢献ください！

貢献方法について、詳しくは [Contributing](./CONTRIBUTING.md) をご参照してくださいね～

Issue を提出する時には、メンテナが問題を分析・解決できるよう、十分な情報をご提供ください。

## 🌎 I18N - 国際化

**簡体字中国語 (zh-CN)** をメインの開発言語としており、他言語の翻訳元にもなっています。

| コード          | 対応状況    |
|----------------|-------------|
| zh-CN          | ✅ 対応済み |
| zh-HK          | ✅ 対応済み |
| en-US          | ✅ 対応済み |
| ja-JP          | ✅ 対応済み |

## ⚡ 寄付のお願い

もしこのプロジェクトが役に立ったと感じていただけたら、

ぜひ [爱发电 (afdian)](https://afdian.com/a/BTJ_Shiroi) でコーヒー一杯のご支援をいただけると、嬉しいです！

皆様からのご支援が、継続的な開発・改善の大きな原動力になります！

## 💫 謝辞

<a href="https://github.com/btjawa/BiliTools/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=btjawa/BiliTools" />
</a>

<br />

- [tauri](https://github.com/tauri-apps/tauri) Build smaller, faster, and more secure desktop and mobile applications with a web frontend.

- [aria2](https://github.com/aria2/aria2) aria2 is a lightweight multi-protocol & multi-source, cross platform download utility.
- [FFmpeg](https://git.ffmpeg.org/ffmpeg.git) FFmpeg is a collection of libraries and tools to process multimedia content.
- [DanmakuFactory](https://github.com/hihkm/DanmakuFactory) 支持特殊弹幕的xml转ass格式转换工具
- [bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect) 哔哩哔哩-API收集整理

- [Vercel](https://github.com/vercel/vercel) Develop. Preview. Ship.


<a href="https://www.star-history.com/#btjawa/BiliTools&Date" alt="Star History Chart">
<picture>
<source
    media="(prefers-color-scheme: dark)"
    srcset="https://api.star-history.com/svg?repos=btjawa/BiliTools&type=Date&theme=dark"
/>
<source
    media="(prefers-color-scheme: light)"
    srcset="https://api.star-history.com/svg?repos=btjawa/BiliTools&type=Date"
/>
<img
    alt="Star History Chart"
    src="https://api.star-history.com/svg?repos=btjawa/BiliTools&type=Date"
/>
</picture>
</a>

## 声明・免責事項

> [!IMPORTANT]
> 本プロジェクトは [GPL-3.0-or-later](/LICENSE) オープンソースライセンスに従い、無償で公開されています：<br>
> 再配布時には **同様のライセンスを継続し、著作者および著作権情報を保持する必要があります**。

<hr />

**本プロジェクトは技術学習およびコード検証を目的としており、濫用は固く禁止します！**

いかなる形態の著作権侵害、無許可の再配布、違法行為、その他いかなる不正使用にも**強く反対し、容認しません。**

- 本プロジェクトをの使用に起因するあらゆる結果（違法使用、アカウント制限、その他の損失を含むがこられに限定されない）は、ユーザー自身の責任であり、[作者](https://github.com/btjawa)とは**無関係であり、いかなる責任を負いません。**
- 本プロジェクトは **オープンソースかつ無料** であり、本人は経済的利益を得ていません。
- 本プロジェクトは認証機構の回避、有料リソースの不正入手、その他の違法行為を行いません。
- 本プロジェクトで生成および取得されたデータは、`SQLite` によりローカルで保存されます:

> Windows: `%AppData%\com.btjawa.bilitools`<br>
> macOS: `$HOME/Library/Application Support/com.btjawa.bilitools`<br>
> Linux: `$HOME/.local/share/com.btjawa.bilitools`

- 「哔哩哔哩」および「Bilibili」の名称・ロゴ・関連する図形は、上海幻電信息科技有限公司の登録商標または商標です。
- 本プロジェクトは哔哩哔哩およびその関連会社とは一切の提携・所属・認可・承認関係にありません。
- 本プロジェクトを通じて取得したコンテンツの著作権は、すべて原権利者に帰属します。関連する法律・規制、ならびに各プラットフォームの利用規約を遵守してください。
- 権利侵害などの問題が確認された場合は、[こちら](mailto:btj2407@gmail.com) までご連絡ください。