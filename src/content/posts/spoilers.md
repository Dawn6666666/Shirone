---
title: Markdown 黑幕与防剧透
published: 2026-08-28
description: 隐藏行内答案或剧透内容，同时保证无障碍可访问性。
tags: [演示, Markdown, 无障碍, Shirone]
category: 指南
lang: zh_CN
draft: false
---

黑幕功能可以在不从文档中删除内容的前提下，隐藏简短答案或情节细节。鼠标悬停、聚焦或点击激活控件即可显示被隐藏的内容。

## 行内隐藏详情

最终的答案是 :spoiler[**42**]，周围的句子依然保持为正常的 Markdown 文本。

黑幕内部支持 `行内代码` 以及 :spoiler[包含 **加粗强调** 的较长详情]。

## 写作语法

```markdown
最终的答案是 :spoiler[42]。
```

生成的 HTML 采用带有 `aria-expanded` 状态的原生按钮。即使在未加载 JavaScript 的情况下，鼠标悬停与键盘聚焦依然可以揭示文本；运行时脚本则进一步提供点击与键盘切换展开支持。
