---
title: 草稿示例
published: 2022-07-01
description: 演示草稿文章的配置方式与发布状态控制。
tags: [Markdown, 博客, 演示]
category: 示例
lang: zh_CN
draft: true
---

# 这是一篇草稿文章

本文当前处于草稿状态，尚未正式发布。因此普通访客无法在公开列表中浏览到此内容。正文尚在撰写中，可能需要进一步编辑和校对。

当文章准备好公开发布时，只需在 Frontmatter 中将 `draft` 字段修改为 `false`：

```markdown
---
title: 草稿示例
published: 2024-01-11
tags: [Markdown, 博客, 演示]
category: 示例
draft: false
---
```
