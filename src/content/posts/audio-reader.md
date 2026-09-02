---
title: "音频朗读者：日漫神秘语音片段"
published: 2026-08-29
description: 一组简短的日系动漫语音片段集锦，通过 Audio Reader 按需点击播放。
tags: [示例, 音频朗读, Audio Reader]
category: 示例
lang: zh_CN
draft: false
---

这些简短的日语语音片段仿佛取自动漫场景的一角：一声呼唤、一句问候、一声轻笑，或是几句来历不明的台词。它们更像是烘托氛围的声音采样而非完整对白，静下心来让声音传递情绪。

Audio Reader 会保持静默，直到主动选择收听。每个语音按钮仅在被点击时才会加载并播放对应音频。

```markdown
:audio-reader[音频标题]{src="/assets/audio/filename.wav"}
```

## 语音片段

- **Baka**: :audio-reader[バカ]{src="/assets/audio/Baka.wav"}
- **Ciallo**: :audio-reader[Ciallo！！]{src="/assets/audio/Ciallo.wav"}
- **Ehe**: :audio-reader[调皮的声音]{src="/assets/audio/Ehe.wav"}
- **Imoi**: :audio-reader[イモい]{src="/assets/audio/Imoi.wav"}
- **Zako**: :audio-reader[雑魚じゃん、雑魚雑魚]{src="/assets/audio/Zako.wav"}

`src` 必须使用站点根路径或 HTTPS 链接，且指令标签不能为空。无效或不完整的指令将保留为普通 Markdown 文本展示，不会加载 Audio Reader 相关资源。
