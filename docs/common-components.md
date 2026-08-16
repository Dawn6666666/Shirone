# 通用组件规范（molecules）— Shirone 主题

> 记录 `src/components/molecules/` 中**跨页面 / 区块复用**的通用组件：
> 职责、Props、用法与新增约定。配套文档：
> `atomic-structure.md`（分层）、`m3e-standard.md`（令牌与原子）、`animation.md`（动效库）。

---

## 1. 定位

通用组件 = molecules 层可复用的 UI 组合：

- **与原子（atoms）区别**：由多个原子组合而成，可含简单布局（如"图标 + 标题 + 副标题"）；
- **与有机体（organisms）区别**：不承载业务数据、不依赖站点内容集合、无路由/持久化副作用；
- 命名 PascalCase，跨目录引用用 `@components/molecules/<Name>`。

## 2. 标题组件族

站内标题统一走「图标 + 标题 + 副标题」三要素，分两级：

| 场景 | 组件 | 层级 | 三要素 |
|---|---|---|---|
| 页面顶部大标题 | `PageHeader` | 页面级 | 大号 `primary` 线性图标 + `headline-medium` 标题 + 副标题 |
| 区块/卡片内小标题 | `SectionTitle` | 区块级 | 可选小图标 + `title-large` 标题 + 可选副标题 |

### 2.1 PageHeader — 页面级标题

```svelte
<PageHeader
	icon="material-symbols:handshake-outline-rounded"
	title={i18n(I18nKey.friends)}
	subtitle={i18n(I18nKey.friendsBanner)}
/>
```

- 图标为无容器 `primary` 线性图标（不用实底方形容器）；
- 标题与副标题左缘对齐（副标题不缩进），与下方内容区齐平；
- 用于非首页内容页顶部（友链、归档、关于等），替代各页自维护的 h1 块。

### 2.2 SectionTitle — 区块标题

```svelte
<SectionTitle
	icon="material-symbols:tag-rounded"
	title="Categories"
	subtitle="Browse posts by topic"
/>
<!-- 省略 icon / subtitle 也可 -->
<SectionTitle title="Categories" />
```

- 用于侧栏卡片、设置面板等区块内的小标题；
- 图标可选、副标题可选，三者缺省时自动省略对应 DOM。

### 2.3 选择规则

- 页面级语义（`<h1>`）→ `PageHeader`；
- 区块级语义（`<h2>`/分组标题）→ `SectionTitle`；
- 已有标题但仅需微调（如设置面板内联标题）可暂不替换，后续统一收敛。

## 3. 其它通用组件

| 组件 | 用途 |
|---|---|
| `ButtonLink` / `ButtonTag` | 链接/标签形态的按钮（atoms 组合） |
| `PostMeta` | 文章元信息（日期/分类/标签） |
| `FriendCard` | 友链卡片（头像 + 站名 + 描述 + 标签，整卡链接） |
| `MomentCard` | 动态卡片（`<article>` 语义：头像/作者/时间/置顶/心情/正文/位置/标签） |
| `MomentGallery` | 动态图片画廊（两段式：自适应网格瓦片 → 内联查看器主舞台/缩略图条/键盘导航 → Fancybox 灯箱） |
| `Pagination` | 分页控件 |
| `SearchBar` | 搜索输入（分子层，docked 视觉） |
| `WidgetLayout` | 侧栏卡片容器（折叠标题 + 内容） |
| `Announcement` | 公告侧栏 widget（Banner 原子 round 形态，无标题外壳；内容源 `announcementConfig`） |
| `SiteStats` | 站点统计侧栏 widget（规格表行：MetaIcon 徽标 + 点线引导 + 表格数字；数据源 `utils/site-stats` 备忘化汇总） |

原子层通用件（`Button` / `Card` / `IconButton` / `Avatar` / `AccentBar` 等）见 `m3e-standard.md` §4。

### 3.1 侧栏 widget 编排

侧栏 widget 由 `src/config/sidebarConfig.ts` 数据驱动，`SideBar.astro` 的 `componentMap` 是唯一注册表。新增一个侧栏 widget 的 checklist：

1. 在 `src/types/sidebarConfig.ts` 的 `SidebarWidget` 判别联合扩展分支（widget 自己的配置项放分支内，不搞扁平大对象）；
2. 实现 widget 组件（molecules 或 organisms），接收可选 `widget` prop 读取自己的配置；
3. 在 `SideBar.astro` 的 `componentMap` 注册（`satisfies Record<SidebarWidget["type"], unknown>` 保证不漏键）；
4. 在 `sidebarConfig.components` 追加默认条目（新 widget 默认 `enable: false`，保证存量站点 DOM 零变化）；
5. 若有独立内容源（如 `announcementConfig`），类型放 `src/types/`、值放 `src/config/` 并在 barrel 注册；
6. 本文件 §3 登记 + `atomic-structure.md` §6 分层清单同步。

widget 编排还带两个通用标签（见 `sidebarConfig.ts` 注释）：

- `slot: "top" | "sticky"`——栏内停靠位（固定顶部 / 跟随滚动）；
- `column: "primary" | "secondary"`——分栏标签，仅在 `arrangement: "dual"` 时生效，
  标记为 `secondary` 的 widget 渲染进副栏（`SideBar.astro` 按标签过滤，主/副栏各一个实例）。

## 4. 新增通用组件约定

1. 判断落层：跨场景复用的原子组合 → molecules；单元素 → atoms；带业务 → organisms；
2. 三要素齐全的标题组件优先复用 `PageHeader` / `SectionTitle`，不要各自手写；
3. 新增通用组件后：
   - 在本文件 §2 / §3 登记；
   - 更新 `atomic-structure.md` §6 的 molecules 清单；
   - 更新 `m3e-standard.md` §8 文件索引。

## 5. 关联文档

- `docs/atomic-structure.md` — 分层与依赖规则
- `docs/m3e-standard.md` — 设计令牌、原子组件、文件索引
- `docs/animation.md` — 动效令牌、`use:collapse` 插件与 reduced-motion
