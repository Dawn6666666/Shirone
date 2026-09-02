---
title: Markdown 步骤流
published: 2026-08-27
description: 在 Shirone 中将顺序操作指引呈现为紧凑且无障碍的步骤流程。
tags: [演示, Markdown, 步骤流, Shirone]
category: 指南
lang: zh_CN
draft: false
---

步骤流适用于强调先后执行顺序的操作流程。该组件在完整保留文章阅读流畅度的同时，通过低调优雅的数字导轨提供清晰导航，而标题、段落、链接、列表和代码块依然保持原生 Markdown 语义。

## 有序列表语法

将一个 Markdown 有序列表包裹在 `:::steps` 容器中。每个顶层列表项会自动成为一个独立的步骤。

````markdown
:::steps[生产环境部署]
1. **克隆并准备工作区**

   克隆代码仓库并进入项目根目录：

   ```powershell
   git clone https://github.com/LyraVoid/Shirone.git
   Set-Location Shirone
   ```

2. **安装项目依赖**

   使用仓库指定的包管理器进行安装：

   ```powershell
   pnpm.cmd install
   ```

3. **执行项目校验**

   确认 Astro 诊断与 TypeScript 类型检查均通过：

   ```powershell
   npx.cmd astro check
   pnpm.cmd type-check
   ```

4. **构建生产站点**

   生成静态页面与搜索索引产物：

   ```powershell
   pnpm.cmd build
   ```
:::
````

:::steps[生产环境部署]
1. **克隆并准备工作区**

   克隆代码仓库并进入项目根目录：

   ```powershell
   git clone https://github.com/LyraVoid/Shirone.git
   Set-Location Shirone
   ```

2. **安装项目依赖**

   使用仓库指定的包管理器进行安装：

   ```powershell
   pnpm.cmd install
   ```

3. **执行项目校验**

   确认 Astro 诊断与 TypeScript 类型检查均通过：

   ```powershell
   npx.cmd astro check
   pnpm.cmd type-check
   ```

4. **构建生产站点**

   生成静态页面与搜索索引产物：

   ```powershell
   pnpm.cmd build
   ```
:::

## 配置选项

- `:::steps[标题]` 或 `title="标题"` 可添加可见标题与无障碍标签。
- `start=4` 可修改起始展示的步骤编号。
- 容器内必须且仅包含一个有序列表。格式不规范或混合的内容将保持为普通 Markdown 文本展示，不会强行启发式解析。
- 所有渲染均在站点构建期完成，不产生任何客户端 JavaScript 或网络请求。
