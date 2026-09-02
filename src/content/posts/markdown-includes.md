---
title: "Markdown 文件包含"
published: 2026-08-28
description: "构建期 Markdown 文件与片段包含语法演示。"
tags: [Markdown, Shirone]
category: 指南
lang: zh_CN
draft: false
---

Shirone 支持在构建期包含本地 Markdown 文件或其指定的安全片段。

<!-- @include: src/content/snippets/include-example.md#public-api -->

同时也支持全文件包含与按行范围切片包含：

```markdown
<!-- @include: src/content/snippets/include-example.md -->
<!-- @include: src/content/snippets/include-example.md{1-4} -->
<!-- @include: src/content/snippets/include-example.md{5-} -->
<!-- @include: src/content/snippets/include-example.md{-4} -->
```

代码块内部的包含注释将保持为纯文本字面量，不会被解析执行。
