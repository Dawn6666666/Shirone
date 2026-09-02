---
title: Markdown 选项卡组
published: 2026-08-28
description: 使用紧凑、可同步的 M3E 选项卡组呈现关联的 Markdown 替代选项。
tags: [演示, Markdown, 标签页, Shirone]
category: 指南
lang: zh_CN
draft: false
---

选项卡组可将不同技术方案的等效操作指令聚合在一起，避免重复书写外围背景说明。每个选项均支持完整的块级 Markdown，且选中的状态可在同页面的其他选项卡组之间联动同步。

## 选择包管理器

使用 `@tab:active` 指定初始激活的选项。在 `#` 后的后缀提供稳定的标识值，且不改变标签的可见标题。

::: tabs#package-manager

@tab npm

使用 npm 安装依赖包：

```powershell
npm install astro
```

@tab:active **pnpm**#pnpm

使用 pnpm 安装依赖包：

```powershell
pnpm.cmd add astro
```

@tab Bun#bun

使用 Bun 安装依赖包：

```powershell
bun add astro
```

:::

## 运行项目

此选项卡组共享 `package-manager` 标识。在上方选择某一项时，下方的对应命令会自动同步更新，并在下次访问时记住该偏好。

::: tabs#package-manager

@tab npm

```powershell
npm run dev
```

@tab pnpm

```powershell
pnpm.cmd dev
```

@tab Bun#bun

```powershell
bun run dev
```

:::

## 多选项横向滚动

当选项较多时，选项卡栏保持在单行内，并在窄屏或移动端上支持在导航区域内独立横向滑动。

::: tabs

@tab 本地工作站

在开发功能特性时使用本地工具链。

@tab 托管预览环境

发布临时预览分支供团队评审。

@tab 持续集成

对每次代码提交运行确定性的自动化校验。

@tab 生产环境部署

将经过验证的构建产物发布至生产环境。

@tab 离线恢复流程

在网络不可用时通过本地备份进行恢复。

:::

## 写作语法

````markdown
::: tabs#package-manager

@tab npm

在此处书写 npm 相关的操作说明。

@tab:active **pnpm**#pnpm

在此处书写 pnpm 相关的操作说明。

:::
````

每个选项卡组至少需要两个 `@tab` 分区，且每个分区的内容需与标记行之间保留一个空行。格式不完整或非法的分组将安全降级为普通 Markdown 文本展示。
