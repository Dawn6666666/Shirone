---
name: shirone-markdown-syntax
description: Authoring content with Shirone's custom Markdown syntaxes - admonitions, code trees, tabs, steps, marker highlights, math, mermaid, image grids and sizing, abbreviations, annotations, spoilers, includes, and GitHub cards. Use when writing or editing Markdown/MDX content and choosing the right syntax.
---

# Shirone 自定义 Markdown 语法(作者向)

以下语法**开箱即用、自激活**:写进正文即可,无需 frontmatter 开关或配置;页面只加载实际用到的语法的 CSS/JS。机器可读的完整契约(pattern、参数、默认值、示例)以 `src/plugins/markdown/manifest.json` 为单一索引。普通 CommonMark/GFM 之外的所有自定义语法如下:

| 语法 | 写法 | 演示文章 |
|---|---|---|
| 提示容器 | `:::tip[标题] ... :::` 或 `> [!NOTE]`,类型:`note/info/tip/important/warning/caution/details` | `admonitions.md` |
| 折叠面板 | `::: collapse [accordion] [expand]` 包裹无序列表,项首 `:+`/`:-` 控制开合 | `collapse-panels.md` |
| 选项组(Tabs) | `::: tabs[#同步id]` + `@tab 标题#值`,值相同的组跨页同步 | `option-groups.md` |
| 步骤流 | `:::steps{title start}` 包裹有序列表 | `steps.md` |
| 代码树 | `:::code-tree{title height entry icon}` 内嵌多文件代码块,或 `@[code-tree](目录)` | `markdown-enhancements.md` |
| 文件树 | `:::file-tree{title icon}` 嵌套列表或 ```file-tree 围栏(tree 输出) | `markdown-enhancements.md` |
| 马克笔高亮 | `==内容==`,变体 `==...=={.error}`(`primary/secondary/tertiary/error/tip`) | `marker-highlights.md` |
| 数学公式 | `$行内$` 与 `$$块级$$`(KaTeX) | `markdown.md` |
| Mermaid 图 | ` ```mermaid ` 围栏,客户端按需主题化渲染 | `markdown-mermaid.md` |
| 图片画廊 | `:::grid{columns="1..6" aspect="W/H" fit="cover\|contain"}` 包裹图片 | `image-grid-demo/` |
| 图片尺寸/图注 | `![说明 w-60%](src "图注")` | `spoilers.md` |
| 缩写释义 | `*[SSR]: Server-Side Rendering` 定义行,悬停/聚焦/触屏出释义 | `markdown-abbreviations.md` |
| 内容标注 | 行内 `[+label]` 引用 + `[+label]:` 定义块,原生 Popover 展示 | `content-annotations.md` |
| 行内剧透 | `:spoiler[内容]` | `markdown-extended.md` |
| GitHub 卡片 | `::github{repo="owner/repo"}`,客户端按需取仓库元数据 | `markdown-extended.md` |
| 文件包含 | `<!-- @include: 路径 -->`,支持 `{2-6}` 行范围与 `#region` | `markdown-includes.md` |
| 代码块元数据 | Expressive Code:`title`、`ins={2}`、`del={3-5}`、`collapse={4-8}`、`showLineNumbers`、`frame` 等 | `expressive-code.md` |

## Bilibili 视频

使用 `::bilibili{bvid="BV..." title="..." p=1 poster="/..."}` 嵌入视频。`bvid` 和非空 `title` 必填，`p` 为可选正整数，`poster` 仅接受站内根路径或显式 HTTPS 图片地址。首屏输出标题、播放按钮和 Bilibili 回退链接；点击播放按钮后才加载播放器。非法输入保留为普通 Markdown。

## 使用要点

- 大多数语法对**非法或残缺输入回退为普通 Markdown** 并保留原文,不会静默改写;
- `abbreviation` 与 `content-annotation` 的定义只在当前文章内生效;
- `:::details` 折叠是纯原生 `<details>`,无 JS;tabs/code-tree 等交互增强在脚本失败时正文仍完整可读;
- 加密文章的语法增强(如 mermaid)在解密后会正确初始化,无需额外处理;
- 内联 `w-N%` 是 alt 中的宽度令牌(1–100),越界值保留原文。

## 必读文档

- `src/plugins/markdown/manifest.json` — 每种语法的 forms/attributes/示例/运行时成本(单一真源)
- `docs/markdown-syntax-manifest.md` — 清单字段与状态含义(stable/legacy/deprecated)
- `src/content/posts/` — 上述演示文章,均含可复制示例
