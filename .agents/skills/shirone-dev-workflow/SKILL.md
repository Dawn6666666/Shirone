---
name: shirone-dev-workflow
description: Daily development workflow for the Shirone Astro blog theme - environment setup, validation gates, cache clearing, and commit conventions. Use when building, testing, validating, formatting, or committing changes in this repository.
---

# Shirone 开发工作流

Shirone 是 Astro 7 + Svelte 5 + Tailwind 4 + Stylus + pnpm 的 M3E 博客主题,开发环境为 Windows。本技能覆盖日常开发的环境、验证与提交流程;架构与组件规范见 `shirone-component-dev` 等专项技能。

## 环境要点

- Windows PowerShell 禁脚本执行:一律使用 `pnpm.cmd` / `npx.cmd` / `npm.cmd` 后缀。
- 包管理器锁定 pnpm(`preinstall` 强制),Node >= 22.12。
- 开发服务器:`pnpm.cmd astro dev --port 4321`(`pnpm.cmd dev` 会先跑图标/缩略图生成)。

## 提交前验证门禁

按变更范围执行下表；运行的门禁必须全绿。`type-check` 适用于 TypeScript/共享 API 变更，性能测量用于观测而不是自动阻断。

| 命令 | 作用 |
|---|---|
| `pnpm.cmd format` | Biome 格式化(`--write`,提交代码前必须跑) |
| `npx.cmd astro check` | 必须报 **0 errors / 0 warnings** |
| `pnpm.cmd check:manifest` | 原子清单 + Markdown 语法清单 + AI skills 校验 |
| `pnpm.cmd type-check` | `tsc --noEmit --isolatedDeclarations` |
| `pnpm.cmd exec biome ci ./src` | 只读 lint 校验(`lint`/`format` 带 `--write`,**不能**当只读检查用) |
| `npx.cmd playwright test tests/site/<spec>.spec.ts` | 只跑最小相关分片;UI 变更必加 `tests/site/a11y.spec.ts` |

## 缓存与陈旧问题

- Stylus/Svelte 变更不生效:清 `node_modules/.vite` 与 `.astro` 后重启 dev。
- Markdown/rehype/remark 变更不生效:清 `.astro/data-store.json` 后重启。

## 测试注意事项

- 断言计算样式或跑无障碍检查前,等待主题初始化(`--mc-primary` 出现)与 `onload-animation` 收敛。
- 视觉回归快照仅存本地(已 gitignore);确认每处差异都 intentional 才更新,不吸收无关的页高/环境漂移。
- Playwright 单 worker,`reuseExistingServer`。

## 提交约定

- Conventional commits:`type(scope): subject`,`type` 取 `feat`/`fix`/`test`/`docs`/`refactor`/`chore`;body 用英语。
- `git add -u` + 显式 `git add <新文件>`,**绝不 `git add -A`**(演示页、临时文件会被带进去);绝不提交 `*Demo.svelte`、`atoms-*-test.astro`。
- 提交前先向用户确认,不擅自提交。
- `research/` 目录已 gitignore、仅供参考,永不提交、不构建、不编辑。

## 必读文档

- `AGENTS.md` — 仓库总纲(必遵规则、必读文档清单、验证命令)
- `rules/project-rules.md` — 项目硬性规则与质量门禁
- `rules/pitfalls.md` — Svelte/Astro/Stylus/缓存/测试踩坑记录
- `INDEX.md` — 部署分层与标准部署流程
