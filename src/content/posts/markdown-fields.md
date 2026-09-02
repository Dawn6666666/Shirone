---
title: Markdown 字段与参数卡片
description: 接口与组件参数文档卡片语法演示。
published: 2026-08-30
tags: [演示, Markdown, 参数卡片, Shirone]
category: 指南
lang: zh_CN
draft: true
---

当多个相关选项属于同一个接口或组件时，可以使用 `field-group`。在起始行填写字段名称，并在正文描述前添加元数据标签。

:::: field-group

::: field tex
@type object
@optional

TeX 解析器配置选项。
:::

::: field output
@type `'svg' | 'chtml'`
@default `'svg'`
@optional

输出格式，支持 SVG 或通用 HTML。
:::

::::

## 基础字段卡片

必填、可选与弃用状态可以在同一个分组中混合使用。默认值与类型分开展示，便于快速阅读。

:::: field-group

::: field title
@type string
@required

组件的可见标题。该值将显示在页面头部，应当保持简短以便快速浏览。
:::

::: field disabled
@type boolean
@default `false`
@optional

指示该控件是否初始处于禁用状态。
:::

::: field locale
@type `'en' | 'zh-CN' | 'ja-JP'`
@default `'en'`
@optional

用于格式化日期、数字与无障碍标签的语言区域设置。
:::

::::

## 富文本描述

字段描述支持完整 Markdown 语法。在元数据行之后可以正常使用链接、加粗强调、列表以及行内代码。

:::: field-group

::: field render
@type `(value: unknown) => string`
@required

将值渲染为最终输出。回调函数应返回安全字符串，并可调用 `formatValue` 辅助函数。

- 保持渲染逻辑的确定性。
- 避免在回调函数内部发起网络请求。
:::

::: field retries
@type number
@default `3`
@optional

请求被判定为失败前的最大重试尝试次数。
:::

::: field legacyMode
@type boolean
@deprecated

为向后兼容而保留。新集成应改用 `compatibility` 字段。
:::

::::

## 独立字段卡片

当在示例或代码块旁单独说明一个选项时，可以无需外层分组直接使用独立字段：

::: field format
@type `'short' | 'long'`
@default `'short'`
@optional

控制输出结果的格式化方式。
:::

## 写作说明

- `@type` 与 `@default` 的值会被渲染为代码标签。
- `@required`、`@optional` 与 `@deprecated` 会生成对应的状态徽章。
- 元数据行之后的普通 Markdown 文本将成为该字段的正文描述。
- 未知的元数据标签会保留为普通描述文本展示，而不会被静默丢弃。
