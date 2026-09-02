---
title: Shirone Markdown 进阶语法增强
published: 2026-08-19
pinned: true
description: 探索 Shirone 的专属 Markdown 扩展、表现力组件与写作语法。
tags: [演示, Markdown, 扩展, 主题, Shirone]
category: 指南
lang: zh_CN
draft: false
---

Shirone 提供了一系列主题专属的 Markdown 扩展语法与自定义容器。基于原生的 unified 抽象语法树处理管道，所有扩展均在构建期被编译为语义化且支持无障碍访问的 HTML，不产生任何客户端 JavaScript 水合开销，并与 M3E 设计令牌保持一致。

## 文件树

文件树功能可将多层级项目结构、源码目录以及终端目录输出转化为紧凑的交互式树状视图，支持自动识别后缀图标、Diff 差异高亮以及可折叠分支。

### 1. 嵌套列表语法

当直接在 Markdown 中以嵌套列表的形式组织文件层级时，使用 `:::file-tree` 块指令：

```markdown
:::file-tree{title="Shirone 源码树"}
- src
  - components/
    - ++ Navigation.svelte # 新增组件
    - -- Button.astro # 移除组件
  - content
    - posts/
      - markdown-enhancements.md
  - layouts/
    - PostLayout.astro
  - plugins
    - markdown/
      - rehype-file-tree.mjs
  - styles
    - markdown/
      - trees.css
  - **content.config.ts** # 核心配置文件
- public/
  - favicon.svg
- package.json
:::
```

:::file-tree{title="Shirone 源码树"}
- src
  - components/
    - ++ Navigation.svelte # 新增组件
    - -- Button.astro # 移除组件
  - content
    - posts/
      - markdown-enhancements.md
  - layouts/
    - PostLayout.astro
  - plugins
    - markdown/
      - rehype-file-tree.mjs
  - styles
    - markdown/
      - trees.css
  - **content.config.ts** # 核心配置文件
- public/
  - favicon.svg
- package.json
:::

#### 写作规则与标记语法

- **Diff 变更状态**：在列表项前添加 `++`（绿色背景与徽章）或 `--`（红色背景与删除线）以高亮文件增删变动。
- **注释说明**：在 `#` 后跟随的任何文本都会被渲染为靠右对齐的淡色行内注释。
- **重点强调**：使用 `**粗体**` 包裹文件名，赋予核心文件更醒目的视觉层级。
- **可折叠目录**：由嵌套列表推断出的目录默认处于展开状态。添加末尾斜杠（例如 `components/`）可创建折叠目录，读者可通过点击或键盘导航展开。

---

### 2. 终端输出语法

当从命令行工具（如 `tree`）直接复制了目录树文本时，可将其直接粘贴到 `file-tree` 代码块中。无论是 Unicode 分支字符（`├──`, `└──`, `│`）还是 ASCII 分支字符均可自动解析。

````markdown
```file-tree title="构建产物" icon="simple"
dist
├── _astro/
│   ├── index.css
│   └── page.js
└── favicon.ico
```
````

```file-tree title="构建产物" icon="simple"
dist
├── _astro/
│   ├── index.css
│   └── page.js
└── favicon.ico
```

#### 配置项说明

- `title="string"`：设置文件树的自定义标题与无障碍标签。
- `icon="colored" | "simple"`：在彩色后缀图标（`colored`，默认）与极简单色图标（`simple`）之间切换。

---

## 代码树

交互式代码树将左侧的多级文件层级导航与右侧的代码即时预览组合呈现。在展示多文件示例、模块拆分或整个目录结构时，能够带来类似集成开发环境的沉浸式阅读体验。

### 1. 容器语法

在 `:::code-tree` 块指令中组合多个代码块。每个代码块通过 `title="path/to/file"` 指定其相对路径。

````markdown
:::code-tree{title="Shirone 组件演示" height="380px" entry="src/Button.svelte"}
```svelte title="src/Button.svelte"
<script lang="ts">
  let { label = "点击我" } = $props();
</script>

<button class="m3-btn">{label}</button>
```

```stylus title="src/styles/button.styl"
.m3-btn
  background: var(--primary)
  color: var(--on-primary)
  border-radius: var(--shape-corner-m)
```

```json title="package.json"
{
  "name": "button-demo",
  "version": "1.0.0"
}
```
:::
````

:::code-tree{title="Shirone 组件演示" height="380px" entry="src/Button.svelte"}
```svelte title="src/Button.svelte"
<script lang="ts">
  let { label = "点击我" } = $props();
</script>

<button class="m3-btn">{label}</button>
```

```stylus title="src/styles/button.styl"
.m3-btn
  background: var(--primary)
  color: var(--on-primary)
  border-radius: var(--shape-corner-m)
```

```json title="package.json"
{
  "name": "button-demo",
  "version": "1.0.0"
}
```
:::

#### 配置项与标记

- `title="string"`：设置代码树顶栏标题与无障碍标签。
- `height="string"`：设置桌面端视图高度（默认 `420px`，如 `380px`, `26rem`）。
- `entry="filepath"`：指定页面初次加载时默认激活展示的文件路径。
- `icon="colored" | "simple"`：在彩色或极简单色文件图标之间切换。
- `:active`：在任意代码块后添加 `:active` 可将其设为默认激活的标签页。

---

### 2. 本地目录自动导入

直接指定工作区内的本地目录路径，即可在构建期自动扫描目录内容并生成交互式代码树，无需手动复制粘贴文件内容。

```markdown
@[code-tree title="番剧工具模块" entry="status.ts"](/src/utils/anime)
```

@[code-tree title="站点配置目录" entry="siteConfig.ts"](/src/config)
