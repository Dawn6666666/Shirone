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
| `sidebarConfig.ts` | 侧栏编排与 widget 清单（`arrangement` 单/双栏、`side` 主栏物理侧、widget `column` 分栏标签；判别联合类型见 `types/sidebarConfig.ts`；编排指导见 `docs/sidebar-system.md`，组件文档见 `docs/sidebar-widgets.md`，新增 widget checklist 见 `docs/common-components.md` §3.1） |
| `announcementConfig.ts` | 公告内容（侧栏 announcement widget 消费，text 为空不渲染） |
| `postListConfig.ts` | 文章列表：分页大小 + 布局（list/grid 模式、封面位置、grid 卡片宽度档位） |
| `articleConfig.ts` | 文章详情：最后更新提示，以及文章尾部延伸阅读的总开关、相关文章/随机文章独立开关与数量；随机文章按当前 slug 稳定抽样，同一构建结果可复现 |
| `skillsConfig.ts` | 技能页：页面总开关、分类清单、技能数据、单项开关与离散熟练度；关闭页面时导航入口同步隐藏 |

非首页 Banner 的标题、说明和可选日期由各页面通过 `MainGridLayout` 提供，并在 Swup 导航后从被替换的主内容容器同步。该上下文默认显示、不设配置开关；说明为空或与标题相同时自动省略，移动端非首页仍沿用紧凑布局并隐藏 Banner。

## 侧栏编排与页框宽度

- `arrangement: "single"`（默认）——全部 widget 渲染进唯一侧栏，页框 85rem；
- `arrangement: "dual"`——`column: "secondary"` 的 widget 进入副栏（视口 ≥1280px 起三列），
  其余留在主栏；页框自动放宽到 96rem，TOC 悬浮 rail 自动让位（右侧余量被副栏占据）。
  1280px 以下自动退化为单栏（只显主栏），无需配置。
- `side: "left" | "right"` 决定主栏物理侧，dual 下副栏落在对面。
- 页框宽度由 `resolvePageWidth()`（`src/utils/responsive-utils.ts`）按编排自动解析，
  常量在 `src/constants/constants.ts`（`PAGE_WIDTH` / `PAGE_WIDTH_DUAL`），不提供手动覆盖。
