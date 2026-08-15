# 原子化分层结构规范 — Shirone 主题

> 本文档定义 `src/components/` 的原子化（Atomic Design）分层结构：
> 各层职责、依赖方向与**禁止事项**。
> 适用版本：基于 Astro 7 + Svelte 5 + Tailwind CSS 4。
> 配套文档：`docs/m3e-standard.md`（M3E 令牌与设计规范）。

---

## 1. 分层总览

```
┌─────────────────────────────────────────────┐
│ pages/          页面路由（唯一入口，编排模板） │
├─────────────────────────────────────────────┤
│ layouts/        Templates：页面骨架与布局     │
├─────────────────────────────────────────────┤
│ organisms/      有机体：独立 UI 区块 + 业务   │
├─────────────────────────────────────────────┤
│ molecules/      分子：原子的组合              │
├─────────────────────────────────────────────┤
│ atoms/          原子：最小可复用 UI 元素      │
└─────────────────────────────────────────────┘
        ▲ 依赖方向：只允许向上引用
```

特殊层（不参与组合链，但归属同一目录体系）：

| 目录 | 职责 | 引用方 |
|---|---|---|
| `system/` | 全局基础设施（ConfigCarrier、GlobalStyles） | 仅 templates（layouts） |
| `content/` | 内容渲染器（Markdown 正文） | 仅 pages |

---

## 2. 各层职责与允许依赖

| 层 | 目录 | 职责 | 允许依赖 |
|---|---|---|---|
| **原子** | `atoms/` | 单一职责的 UI 元素（63 个，清单单一真源见 `atoms/manifest.json`） | 仅设计令牌（`--mc-*`、`--m3e-*`、语义别名）与 `.m3-state-layer`；**不得 import 任何组件** |
| **分子** | `molecules/` | 原子的固定组合：ButtonLink、ButtonTag、Tags、Categories、PostMeta、SearchBar、TOC、WidgetLayout、ImageWrapper、License、Pagination | atoms + 同层分子（须同层方向合理） |
| **有机体** | `organisms/` | 独立业务区块：TopAppBar、SideBar、Footer、Search、PostCard、PostPage、ArchivePanel、DisplaySettings、Profile、LightDarkSwitch、SiteNavigationDrawer、RouteProgress、CategoryBar、BackToTop | atoms + molecules + 被组合的**更小** organism |
| **模板** | `layouts/` | 页面骨架与网格布局：Layout、MainGridLayout | organisms + molecules + system |
| **页面** | `pages/` | 路由级编排：`[...page].astro`、`about.astro`、`archive.astro`、`posts/[...slug].astro` | layouts + organisms + molecules + content |
| **系统** | `system/` | 全局基础设施 | 仅令牌与 utils |
| **内容** | `content/` | Markdown 正文渲染 | 仅令牌与 utils |

---

## 3. 依赖规则

1. **单向向上**：`atoms ← molecules ← organisms ← templates ← pages`。任何层只能依赖自己与更底层。
2. **同层分子互依赖**允许，但禁止形成环（A→B 且 B→A）。
3. **organism 组合 organism**：仅允许"主从"组合（如 TopAppBar 组合 Search / DisplaySettings / LightDarkSwitch，PostPage 组合 PostCard）；禁止 organism 间平铺式的互相引用——需要共享时，把共享部分下沉为 molecule。
4. **组件禁止反向依赖模板与页面**：任何 `src/components/` 下的文件不得 import `layouts/` 或 `pages/`。
5. **跨目录引用一律用 `@components/<层>/<文件>` 别名**，禁止 `../../` 相对链。

---

## 4. 禁止事项

### 4.1 目录与命名

1. **禁止新建或恢复 `control/`、`misc/`、`widget/` 目录**——历史遗留布局，已分别并入 molecules / organisms，不得复活。
2. **禁止在 `src/components/` 根目录直接放置组件**——所有组件必须落入七层之一，根目录只允许存在这七个子目录。
3. **禁止非 PascalCase 命名**（如 `search-bar.svelte`、`footer.astro`）——统一 `SearchBar.svelte`、`Footer.astro`。
4. **禁止把组件放进 `src/utils/`、`src/styles/` 或 `src/layouts/`**——组件只属于 `src/components/<层>/`。

### 4.2 依赖方向

5. **禁止低层依赖高层**：`atoms/` 内禁止出现 `import ... from "@components/molecules/..."` 或 `@components/organisms/..."`；`molecules/` 禁止 import `organisms/`。
6. **禁止循环依赖**：任何两组件（或两层）之间不得 A→B→A。
7. **禁止组件 import `layouts/` 或 `pages/`**——反向依赖模板/页面层。
8. **禁止 organism 互相平铺引用**：若 organism X 与 organism Y 需要共享某块 UI，该块应下沉为 molecule，而不是 X→Y 或 Y→X。

### 4.3 代码与样式

9. **禁止硬编码色值、圆角、阴影、动效时长**——一律引用 `--mc-*`、语义令牌（`--primary`、`--surface-container-high`…）与 `--m3e-*`；例外仅限站点固有内容色（如广告牌语义色，见 m3e-standard.md §3.1）。
10. **禁止散落的非令牌动效**——如 `transition: all 0.3s`、`animation: xxx 1s linear`；统一用 `--m3e-duration-*` + `--m3e-easing-*`。
11. **禁止在 Svelte 组件内混用 runes 与 legacy 语法**——同一文件内不得同时出现 `$state/$props/$bindable` 与 `export let`/`$:`。
12. **禁止重复实现交互反馈**——hover/focus/pressed 叠色统一用 `.m3-state-layer`，不得在各组件里自造 `:hover { background: ... }` 叠色逻辑。
13. **禁止跨层 relative import**——`../../`、`../misc/` 等一律替换为 `@components/<层>/<文件>`。

### 4.4 职责边界

14. **禁止在原子 / 分子中引入业务副作用**——数据获取（pagefind、`getSortedPosts`）、持久化（localStorage）、路由跳转属于有机体；交互副作用（事件监听、焦点管理，如 SearchBar 的窗口焦点保护）允许留在分子。
15. **禁止在分子中编排页面级布局**——网格列数、固定定位、`hidden lg:block` 之类的响应式骨架属于模板（MainGridLayout）与有机体；分子只承载自身尺寸。
16. **禁止原子 / 分子直接查询站点内容集合**——`posts` / `categories` / `tags` 的集合访问在 molecules（Tags、Categories）及以上层。
17. **禁止在分子中渲染 Markdown 正文**——正文渲染唯一入口是 `content/Markdown.astro`，由 pages 调用。

---

## 5. 新增组件时如何落层（决策表）

| 新组件是什么 | 落层 |
|---|---|
| 单一 UI 元素，无组合、无业务，可被任意复用 | atoms |
| 2 个以上原子的固定组合（如"标签 chip 列表"） | molecules |
| 独立业务区块，带数据/状态/布局职责（如"文章卡片流"） | organisms |
| 全局基础设施（脚本注入、全局样式载体） | system |
| 渲染 content 集合正文 | content |
| 页面骨架 / 网格 | layouts |

落层后检查：
1. import 是否只指向本层与更低层？
2. 是否有循环依赖？
3. 是否用了 `@components/<层>/<文件>` 别名？
4. 是否只消费令牌、未硬编码数值？
5. 是否把业务副作用留在了 organisms？

---

## 6. 当前分层清单（2026-08）

| 层 | 组件 |
|---|---|
| atoms/ | 63 个原子组件（Button、Chip、IconButton、FAB、FABMenu、Slider、SegmentedButton、TextField、Switch、Checkbox、RadioButton、Dialog、Menu、Badge、Divider、Snackbar、Tabs、Select、DataTable、SearchView、Autocomplete、SheetSide、Carousel、PullToRefresh、DatePicker、TimePicker、Chips、Banner、Tooltip、Card、AppBar、NavigationBar/Rail/Drawer、ExposedDropdownMenu、ListItem、LoadingIndicator、ProgressIndicator、AlertDialog、BadgedBox、SplitButton、ToggleButton、ButtonGroup、SearchBar、DateInput、FloatingToolbar、BottomSheet 等；完整清单与 tier 见 `atoms/manifest.json`） |
| molecules/ | ButtonLink、ButtonTag、Tags、Categories、PostMeta、SearchBar、TOC、WidgetLayout、ImageWrapper、License、Pagination（11） |
| organisms/ | TopAppBar、SideBar、Footer、Search、PostCard、PostPage、ArchivePanel、DisplaySettings、Profile、LightDarkSwitch、SiteNavigationDrawer、RouteProgress、CategoryBar、BackToTop（14） |
| system/ | ConfigCarrier、GlobalStyles（2） |
| content/ | Markdown（1） |
| layouts/ | Layout、MainGridLayout（2） |
| pages/ | 首页、archive、about、posts/[...slug]、[…page] 等路由 |

---

## 7. 维护约定

- 重构涉及组件移动时，用 `git mv`（保留历史），并同步更新全部 import（`@components/<新层>/<文件>`）。
- 层清单（§6）与 m3e-standard.md 的 §8 文件索引随结构变更同步维护。
