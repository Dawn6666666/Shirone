---
title: Markdown 提示块
published: 2026-08-27
description: 使用 Shirone 的 M3E Markdown 容器呈现注释、警告与可选详情。
tags: [演示, Markdown, 提示块, Shirone]
category: 指南
lang: zh_CN
draft: false
---

提示块在保持文章阅读流畅的同时，使辅助信息在视觉上更加醒目。所有形式均在服务端渲染，并使用统一的紧凑 M3E 组件。

## 语义变体

::: note 部署上下文
空格分隔形式支持直接传入普通自定义标题，同时兼容参考语法。
:::

:::info
使用信息块呈现中立的上下文信息，帮助读者理解相关章节内容。
:::

:::tip[支持原有的 **中括号** 标题语法]
原有的中括号标题语法依然可用，并支持行内 Markdown 强调样式。
:::

> [!IMPORTANT]
> GitHub Alert 语法也会进入相同的渲染器处理，因此现有文章能保持统一的视觉风格。

:::warning
在运行生产环境构建之前，请仔细检查环境变量配置。
:::

:::caution
切勿在示例代码中发布凭据、本地敏感配置或私钥。
:::

## 可折叠详情

::: details 查看完整命令
该折叠块使用原生浏览器语义，无需客户端 JavaScript 即可支持无障碍键盘操作。

```powershell
npx.cmd astro check
pnpm.cmd build
```

- 默认处于折叠关闭状态。
- 长代码块可在其内部独立滚动。
- 在窄屏设备上，容器自适应保持在文章宽度内。
:::

## 写作语法

```markdown
:::note[已有标题语法]
正文内容
:::

::: warning 空格分隔标题语法
正文内容
:::

> [!TIP]
> GitHub Alert 语法

::: details 可选折叠内容
内容默认隐藏，直到读者展开查看。
:::
```
