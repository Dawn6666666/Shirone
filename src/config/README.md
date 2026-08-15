# 配置目录约定

本目录是 Shirone 全部用户可改配置的唯一入口。约定如下：

## 文件组织

| 内容 | 位置 | 示例 |
|---|---|---|
| 配置值（带注释的默认值） | `src/config/<domain>Config.ts` | `siteConfig.ts`、`sidebarConfig.ts` |
| 配置类型 | `src/types/<domain>Config.ts` | `types/sidebarConfig.ts`、`types/navBarConfig.ts` |

通用类型（多领域共享，如 `Favicon`、`LIGHT_DARK_MODE`）放在 `src/types/config.ts`。

## 导入规则

1. **消费方统一从 barrel 导入**：`import { siteConfig } from "@/config"`；
   只需要单一领域时可用具体文件：`import { siteConfig } from "@/config/siteConfig"`。
2. **禁止相对路径杂写法**：不允许 `../../config`、`../config`、`src/config` 三种历史写法。
3. **循环依赖规避**：`i18n/translation.ts` 依赖 `siteConfig`，而 `navBarConfig` 等又消费
   i18n——该类反向依赖模块只允许从具体文件导入（如 `@/config/siteConfig`），
   **禁止走 barrel**，否则形成 `index → navBar → translation → index` 环。
4. `astro.config.mjs` 在 Astro 配置层运行，用相对路径 `./src/config/<file>.ts` 导入。

## 新增一个配置项 / 配置文件

1. 类型定义加入 `src/types/<domain>Config.ts`（新领域则新建文件，字段带中文注释说明语义与默认值）；
2. 值加入 `src/config/<domain>Config.ts`，保持注释完整——注释是配置的文档；
3. 新文件在 `src/config/index.ts` barrel 注册导出；
4. UI 文案走 `I18nKey` 枚举 + `i18n()`（如 `navBarConfig` 的用法），**不写死字符串**；
   新增 i18n key 必须同步补全 `src/i18n/languages/` 下全部 10 种语言；
5. 跑 `npx.cmd astro check` 确认 0 错误 0 警告。

## 现有配置一览

| 文件 | 职责 |
|---|---|
| `siteConfig.ts` | 站点标识 / 语言 / HCT 主题色 / 横幅 / TOC / 进度条 / favicon（含 `getDefaultStyle` / `getDefaultSpec` 回退值） |
| `profileConfig.ts` | 博主资料：头像 / 名称 / 简介 / 社交链接 |
| `licenseConfig.ts` | 文章版权声明 |
| `expressiveCodeConfig.ts` | 代码块明暗主题 |
| `navBarConfig.ts` | 导航栏链接（`LinkPresets` 预设表 + 组装） |
| `sidebarConfig.ts` | 侧栏位置与 widget 编排（判别联合类型见 `types/sidebarConfig.ts`，新增 widget 的 checklist 见 `docs/common-components.md` §3.1） |
| `announcementConfig.ts` | 公告内容（侧栏 announcement widget 消费，text 为空不渲染） |
| `postListConfig.ts` | 文章列表：分页大小 + 布局（list/grid 模式、封面位置、grid 卡片宽度档位） |
