---
name: shirone-writing
description: Writing blog posts and moments for a Shirone blog - frontmatter schemas, drafts, pinned posts, encrypted posts, images, tags, categories, and the new-post scaffold. Use when creating or editing content under src/content/.
---

# Shirone 内容写作(文章与动态)

内容放在 `src/content/posts/`(文章,支持 `.md`/`.mdx`)与 `src/content/moments/`(动态,仅 `.md`)。Schema 定义在 `src/content.config.ts`。相册不属于 Content Collection，改用 `shirone-data`。

## 文章 frontmatter

```yaml
---
title: 必填
published: 2026-01-01   # 必填日期
updated: 2026-02-01     # 可选
description: 摘要文本
image: 封面图路径
tags: [astro, 笔记]
category: 随笔
pinned: false           # 置顶
draft: false            # 草稿(不发布)
comment: true           # 文章级评论开关(默认 true,继承全局)
lang: ""                # 覆盖站点默认语言的渲染语言
# 加密文章
encrypted: false
password: ""            # 字符串或数字
passwordHint: ""        # 密码提示
hideHomeContent: true   # 加密内容在首页隐藏(默认 true)
---
```

`prevTitle`/`prevSlug`/`nextTitle`/`nextSlug` 为系统内部字段,不要手写。

## 动态(moments)frontmatter

`published`(必填)、`pinned`、`location`、`mood`(Iconify 图标名,如 `material-symbols:sentiment-excited-outline-rounded`)、`tags: []`、`images: [{src, alt}]`、`draft`。

## 工作流

1. 脚手架:`pnpm.cmd new-post <filename>` 生成 `src/content/posts/<filename>.md` 骨架;
2. 写正文:自定义语法直接使用,无需任何启用开关(见 `shirone-markdown-syntax` 技能);图片可用相对路径引用同目录资源;
3. 本地预览:`pnpm.cmd dev` 后访问 `http://localhost:4321`。

## 现成范例(demo 文章即文档)

`src/content/posts/` 下的示例文章同时是语法文档,写作前可参考:`markdown.md`(基础)、`markdown-extended.md`(扩展语法)、`admonitions.md`、`spoilers.md`、`steps.md`、`option-groups.md`、`collapse-panels.md`、`marker-highlights.md`、`markdown-abbreviations.md`、`markdown-mermaid.md`、`expressive-code.md`、`encrypted-demo.md`(加密)、`video.md`、`image-grid-demo/`(图片画廊)、`markdown-includes.md`(文件包含)。

## 注意事项

- 正式发布前删除或保持 `draft: false`;不要提交带真实密码的加密文章到公开仓库;
- 站点级设置(语言、主题色等)不属于文章 frontmatter,见 `shirone-config` 技能;
- frontmatter 字段校验失败会导致构建报错,先对照 `src/content.config.ts` 的 schema 排查。

## 必读文档

- `src/content.config.ts` — posts/moments 的 zod schema 权威定义
- `scripts/new-post.js` — `pnpm new-post` 脚手架行为
- `src/content/posts/` — 示例文章(语法活文档)
- `src/content/moments/` — 动态示例
