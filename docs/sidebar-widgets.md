# 侧栏组件文档（SideBar widgets）— Shirone 主题

> 内置侧栏 widget 的逐个说明：数据源、Props、设计要点与启用方式。
> 配套文档：`sidebar-system.md`（编排模型与响应式）、`common-components.md`（新增 widget 流程）。

---

## 1. 概览

所有 widget 组件的 Props 模式一致：`class?` / `style?`（来自 SideBar 的布局类与 stagger 动画延迟）+
`widget?`（自己的配置条目，整份透传）。数据来源遵循「组件不直接 `getCollection`，统一走 `utils/` 或内容集合工具」。

| type | 组件 | 停靠建议 | 说明 |
|---|---|---|---|
| `profile` | `Profile` | top | 博主资料卡，无标题外壳 |
| `categories` | `Categories` | sticky | 分类列表 + 数量，可折叠 |
| `tags` | `Tags` | sticky | 标签云（tonal Chip），可折叠 |
| `announcement` | `Announcement` | top | 公告横幅，无标题外壳 |
| `stats` | `SiteStats` | top | 站点统计规格表 |
| `calendar` | `Calendar` | sticky | 月度文章历（SSR 直出 + 水合岛） |
| `music` | `MusicSidebar` | top | 持久音乐播放器（全局配置 + widget 双开关，默认关闭） |
| `toc` | `SidebarTOC` | sticky | 当前文章目录（通常只在文章页显示） |

### 1.1 通用字段

每个 widget 条目都支持以下字段（判别联合类型中的公共部分）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `enable` | `boolean` | ✓ | 独立开关 |
| `slot` | `"top" \| "sticky"` | ✓ | 栏内停靠位 |
| `column` | `"primary" \| "secondary"` | — | 分栏标签（默认 `"primary"`，仅 `arrangement: "dual"` 时生效） |
| `pages` | `SidebarPage[]` | — | **页面级过滤**：限定显示的页面，省略或空数组表示所有页面；判定逻辑在 `utils/sidebar-page.ts`，站内导航（Swup）后由 SideBar 脚本按 `#swup-container` 的 `data-current-page` 自动同步 |

页面标识符（`SidebarPage`）：`"home" | "archive" | "friends" | "moments" | "anime" | "compass" | "skills" | "projects" | "timeline" | "albums" | "about" | "categories" | "tags" | "post"`。详见 `sidebar-system.md` §2.4。

## 2. WidgetLayout（标题外壳）

所有带标题的 widget 共用 `molecules/WidgetLayout.astro`。

| Prop | 类型 | 说明 |
|---|---|---|
| `id` | `string` | 折叠容器的元素 id（`data-id`，折叠按钮按它定位内容区） |
| `name` | `string` | 标题文案（消费方传 `i18n(...)` 结果，不写死） |
| `isCollapsed` | `boolean` | 初始是否折叠（超过阈值时由 widget 自己算） |
| `collapsedHeight` | `string` | 折叠后的高度（如 `"7.5rem"`，约两行） |

- 标题三要素：`AccentBar` 竖条 + 标题文字（`title-large`），与站点卡片标题同语言；
- 折叠交互：内容区收起至 `collapsedHeight`，底部「更多」按钮展开（`m3e-duration` 过渡），按钮点击后隐藏；
- `id` 在 dual 双实例下不会冲突（主/副栏是不同 widget）。

## 3. Profile — 博主资料卡

- **数据源**：`src/config/profileConfig.ts`（头像 / 名称 / 简介 / 社交链接）；
- **结构**：`Card`（`card-bg`、corner-l）+ `Avatar`（176px、rounded，整图链接到 `/about/`，hover 遮罩）+ 名称 + primary 分隔线 + 简介 + 社交链接；
- **无 WidgetLayout 外壳**：资料卡是完整独立卡片，套标题外壳会破坏视觉层级；
- **社交链接**：>1 个时渲染为 `IconButton` 行；恰 1 个时渲染为 `Button`（text 变体，带图标和站名）。

## 4. Categories — 分类列表

- **数据源**：`getCategoryList()`（`utils/content-utils`），含分类名 / URL / 文章计数；
- **渲染**：`atoms/blog/CategoryList`——text 按钮 + 右对齐数量徽标，垂直排列；
- **折叠**：分类数 ≥ `collapseAfter` 时折叠（`WidgetLayout` 的「更多」展开），默认阈值 5，条目上可配：

```ts
{ type: "categories", enable: true, slot: "sticky", collapseAfter: 8 }
```

## 5. Tags — 标签云

- **数据源**：`getTagList()`（`utils/content-utils`），标签名 + URL；
- **渲染**：`atoms/blog/TagList`——tonal `Chip` 组（flex-wrap），跟随明暗模式；
- **折叠**：标签数 ≥ `collapseAfter` 时折叠，默认阈值 20（标签多，阈值比分类高）：

```ts
{ type: "tags", enable: true, slot: "sticky", column: "secondary", collapseAfter: 12 }
```

## 6. Announcement — 公告

- **数据源**：`src/config/announcementConfig.ts`（`icon` + `text`）；
- **渲染**：`atoms/overlay/Banner`（round 形态，贴合 M3E 浮层圆角语言）；
- **无 WidgetLayout 外壳**：公告是短消息，不是分组卡片；
- **启用两步**：① `announcementConfig` 填 `text`（非空才渲染）；② `sidebarConfig` 里把 announcement 条目的 `enable` 置 `true`：

```ts
// src/config/announcementConfig.ts
export const announcementConfig = {
	icon: "material-symbols:campaign-rounded",
	text: "站点正在迁移中，部分文章暂时不可用",
};
```

## 7. SiteStats — 站点统计

- **数据源**：`utils/site-stats.ts` 的 `getSiteStats()`（模块级备忘化，构建期多页面共享一次汇总）；
- **渲染**：规格表风格——每行 = `MetaIcon` tonal 徽标（32px，与 PostMeta 元信息同语言）+ 标签 + 点线引导 + 表格数字（`tabular-nums`，千位分隔固定 en-US，构建产物数值稳定）；
- **七项指标**：

| 行 | 图标 | 来源 |
|---|---|---|
| 文章 | `article-outline-rounded` | 非草稿文章数 |
| 动态 | `forum-outline-rounded` | moments 条数 |
| 分类 | `folder-outline-rounded` | 分类数 |
| 标签 | `tag-rounded` | 标签数 |
| 总字数 | `edit-note-outline-rounded` | 全部文章 remark 字数之和（与文章卡片同一统计口径） |
| 运行天数 | `calendar-month-outline-rounded` | 以最早一篇文章发布日为起点推导，无需配置建站日期 |
| 最近更新 | `update-rounded` | 全站最新一篇的发布/更新日（取二者较新） |

- **最近更新的渐进增强**：SSR 直出绝对日期（`YYYY-MM-DD`，构建产物稳定、无 JS 也可读）；
  页面加载后内联脚本升级为相对时间——今天 / 昨天 / `{days} 天前`（`{days}` 占位符，按本地
  时区日界计算，差值恒为整天数）；无文章时显示 `—`；
- 无专属配置项；停靠建议 `top`（信息密度高，放 sticky 会频繁扫过）。

## 8. Calendar — 月度文章历

- **数据源**：`utils/calendar-data.ts` 的 `getCalendarData()`（模块级备忘化）——聚合全部文章的
  发布日（`dateKey → 当日文章`），**SSR 直出**（侧栏静态渲染在 Swup 容器外，不走 API 端点）；
  日期口径与文章卡片一致（`formatDateToYYYYMMDD`），URL 复用 `getPostUrlBySlug`；
- **结构**：`Calendar.astro` wrapper（取数 + i18n 外壳）+ `CalendarView.svelte`（`client:visible`
  惰性水合岛）；月/周名由 `Intl.DateTimeFormat` 按站点 locale 生成——本地化数据不占 i18n key，
  仅 widget 标题与操作按钮走 `I18nKey`；
- **视图（克制）**：单月视图 + 上/下月 + 回今天（非当前月时标题可点击回今天），
  不做年视图/热力图/三级钻取；
- **视觉（M3E 填色语言）**：有文日 = `primary-container` 淡底 + `on-primary-container` 深色数字；
  今天 = `primary` 实底 + `on-primary` 数字（叠加描边选中态用 `outline`）；无文日 disabled 55%；
- **交互**：点击有文日在网格下方 `collapse` 展开当日文章（标题 + MM-DD，hover 状态层），
  再点收起；切月网格 `reveal` 淡入——均走 `motion.ts` 原语，reduced-motion 瞬切；
- **配置**：`startOfWeek?: "mon" | "sun"`（默认周一），其余走通用 `slot`/`column`/`pages` 标签。

## 9. MusicSidebar — 持久音乐播放器

- **分层与外壳**：`MusicSidebar` 属于 organisms，而不是 molecule。它复用 `WidgetLayout` 作为标题外壳，但自身持有音频实例、播放状态和持久 shell 生命周期；
- **数据源**：`src/config/musicConfig.ts`（开关/模式/默认设置）与 `src/data/music.ts`（本地曲目清单）。`defaultVolume` 与 `defaultMode` 只用于首次初始化；
- **三项启用条件**：`musicConfig.enable: true`、至少一首有效 track、`sidebarConfig` 的 music 条目 `enable: true` 缺一不可。全局开关和 widget 开关均默认关闭；
- **预期信息与控制**：显示当前曲目的必要信息，并提供上一首、播放/暂停、下一首、播放模式切换、播放进度拖动与音量调节。图标按钮必须有本地化可访问名称，状态按钮同步暴露当前状态；
- **自适应波浪进度与原生 range 语义**：播放进度采用 M3E 自适应波浪 `ProgressIndicator` 原子，在当前播放位置提供平滑的 `showThumb` 手柄；交互层使用原生 `<input type="range">`，保留各自的 `min` / `max` / `step` / `value` 和可访问名称。不得用只响应指针拖拽的 `div` 模拟；键盘用户保有浏览器原生的方向键、Page Up / Page Down、Home / End 调节语义。进度范围随媒体时长更新，音量 range 与实际音频音量双向同步；
- **Swup 持久性**：组件挂在 `#swup-container` 外，只在直接加载时初始化一次。站内导航不重建音频实例，不中断播放，也不丢失当前曲目、位置、音量或模式；页面过滤只改变 widget 可见性，不把 Swup 生命周期当作播放器重置信号；
- **关闭零负担**：三项启用条件未全部满足时，在动态导入前短路，不输出 DOM/CSS，不请求曲目、封面或其他媒体，不加载播放器模块/依赖进主 bundle。样式不得因 Astro CSS 提升进入共享 CSS。

默认侧栏条目：

```ts
{ type: "music", enable: false, slot: "top" }
```

## 10. SidebarTOC — 当前文章目录

- **数据源**：当前文章的 Markdown headings，由页面布局传给 SideBar，再透传给 `SidebarTOC`；
- **渲染**：`WidgetLayout` + `TOC`，内容区限制为视口内高度并独立滚动；
- **页面范围**：默认使用 `pages: ["post"]`，侧栏位于 Swup 容器外，目录内容与当前锚点状态由既有 Swup 同步逻辑维护。

## 11. 新增 widget 的设计约束

1. **外观语言**：优先复用既有原子——`MetaIcon`（单图标徽标）、`Chip` / `Button` / `Card`、`WidgetLayout`（标题外壳）、`AccentBar`；不要自创新的徽标/容器风格；
2. **外壳取舍**：短消息类（如公告）不用 `WidgetLayout`；有明确"分组 + 列表"语义的（分类/标签/统计），以及音乐等需要统一侧栏标题的有机体使用；
3. **取数**：一律走 `utils/content-utils` 或独立 utils（如 `site-stats`），组件内不直接 `getCollection`；多页面共享的重计算（如总字数）要备忘化；
4. **文案**：标题与标签用 `i18n(I18nKey.*)`，新增 key 必须补全 `src/i18n/languages/` 全部 10 种语言；
5. **默认关闭**：新 widget 的默认条目 `enable: false`，保证存量站点 DOM 零变化；
6. **文档同步**：`sidebar-system.md` §7 总览表 + 本文件补一节；新增 organism 同步更新 `atomic-structure.md` §6 的清单与数量。
