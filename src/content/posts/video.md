---
title: 在文章中嵌入视频
published: 2023-08-01
description: 演示如何在博客文章中嵌入各平台的视频播放器。
tags: [示例, 视频]
category: 示例
lang: zh_CN
draft: false
---

直接从视频平台复制嵌入代码或使用专属指令，即可在 Markdown 文章中插入视频播放器。

```yaml
---
title: 在文章中嵌入视频
published: 2023-10-19
// ...
---

<iframe width="100%" height="468" src="https://www.youtube.com/embed/5gIf0_xpFPI?si=N1WTorLKL0uwLsU_" title="YouTube 视频播放器" frameborder="0" allowfullscreen></iframe>
```

## YouTube

::youtube{id="5gIf0_xpFPI" title="YouTube 视频" preload="auto"}

## 哔哩哔哩

::bilibili{bvid="BV1fK4y1s7Qf" title="哔哩哔哩视频" p=1 preload="auto"}

## AcFun

::acfun{acid="ac48649632" title="AcFun 视频" preload="auto"}

## ArtPlayer

::artplayer{src="https://www.pexels.com/download/video/38538991/" title="Sintel 预告片" preload="auto"}
