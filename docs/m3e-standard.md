# M3E 标准 — Shirone 的 Material 3 Expressive 主题规范

> 本文档描述 Shirone 主题的 M3E（Material 3 / Material 3 Expressive）实现标准：
> 设计原则、令牌层、原子组件、角色映射与扩展方式。
> 适用版本：基于 Astro 7 + Tailwind CSS 4 + `@material/material-color-utilities@0.4.0`。

---

## 1. 设计原则

1. **动态配色（HCT）**：所有颜色由客户端引擎按 种子色相 × 风格 × 规范 × 明暗 实时计算（`mc-utils.ts`），而非硬编码。
2. **令牌驱动**：组件只引用语义令牌（`--primary`、`--surface-container-high`…），不出现具体色值。
3. **原子化**：UI 由 `src/components/atoms/` 下的原子组件组合而成，原子统一消费令牌与状态层。
4. **站内风格优先**：M3 规范与站点既有视觉冲突时，以站点风格为准（例：按钮圆角用 12px `--shape-corner-m` 而非 M3 胶囊）。

---

## 2. 架构总览

```
config.ts（种子色相/风格/规范）
   │
   ▼
mc-utils.ts  HCT 引擎（material-color-utilities）
   │  resolveScheme(hue, isDark, style, spec) → 56 个角色 hex
   ▼
theme-utils.ts  写入 :root 的 --mc-* 自定义属性（localStorage 持久化）
   │
   ▼
variables.styl  --mc-* → 语义令牌（--primary、--surface-container-low…），带 oklch 回退
   │
   ▼
原子组件（55 个：Button / Chip / IconButton / FAB / FABMenu / Slider / SegmentedButton / TextField / Switch / Checkbox / RadioButton / Dialog / Menu / Badge / Divider / Snackbar / Tabs / Select / DataTable / SearchView / Autocomplete / SheetSide / Carousel / PullToRefresh / DatePicker / TimePicker / Chips / Banner / Tooltip / …，完整清单见 §4）
   │
   ▼
分子/有机体（Navbar / SideBar / Search / PostCard…）
```

明暗切换：`.dark` class → `:root.dark` 覆盖语义令牌 → 引擎按暗色方案重算 `--mc-*`。

---

## 3. 令牌层（Design Tokens）

### 3.1 颜色角色

引擎解析全部 M3/M3E 角色为 `--mc-<role>`（约 56 个，见 `theme-utils.ts` 的 `ROLE_TO_CSS`）。
`variables.styl` 将常用角色映射为语义别名（`var(--mc-<role>, <oklch 回退>)`，明暗各一份）：

| 族 | 令牌 |
|---|---|
| primary | `--primary` `--on-primary` `--primary-container` `--on-primary-container` `--inverse-primary` |
| secondary | `--secondary` `--on-secondary` `--secondary-container` `--on-secondary-container` |
| tertiary | `--tertiary` `--on-tertiary` `--tertiary-container` `--on-tertiary-container` |
| fixed | `--primary-fixed` `--on-primary-fixed` |
| surface | `--surface` `--surface-dim` `--surface-bright` `--surface-container-lowest/low/container/high/highest` `--surface-tint` `--on-surface` `--on-surface-variant` `--surface-variant` `--inverse-surface` `--inverse-on-surface` |
| outline | `--outline` `--outline-variant` |
| error | `--error` `--on-error` `--error-container` `--on-error-container` |

语义别名（供组件直接使用）：

| 令牌 | 含义 |
|---|---|
| `--page-bg` | 页面背景（light: container-low / dark: surface） |
| `--card-bg` | 卡片背景（light: container-lowest / dark: container-high） |
| `--float-panel-bg` | 浮层面板背景（container） |
| `--btn-regular-bg/-hover/-active` | 常规按钮的层级渐升（container-low → container → high → highest） |
| `--btn-plain-bg-hover/-active`、`--btn-card-bg-hover/-active` | 其他按钮层叠 |
| `--deep-text` | 主色背景上的深色文字（= on-primary） |
| `--link-underline/-hover/-active`、`--title-active` | 链接 / 标题强调色 |
| `--line-divider`、`--line-color`、`--meta-divider` | 分隔线 |
| `--inline-code-bg/-color`、`--codeblock-bg`、`--codeblock-topbar-bg` | 代码块 |
| `--admonitions-color-*` | 提示块语义色（固定色相，不随种子） |

### 3.2 形状

`--shape-corner-xs: 4px` / `s: 8px` / `m: 12px` / `l: 16px` / `xl: 28px` / `full: 999px`；`--radius-large: var(--shape-corner-l)`（卡片圆角）。

### 3.3 动效（M3 2025 motion spec）

| 令牌 | 值 |
|---|---|
| `--m3e-duration-short / medium / long` | 150ms / 250ms / 400ms |
| `--m3e-easing-standard` | `cubic-bezier(0.2, 0, 0, 1)` |
| `--m3e-easing-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` |
| `--m3e-easing-emphasized-decelerate` | `cubic-bezier(0.05, 0.7, 0.1, 1)` |
| `--m3e-easing-emphasized-accelerate` | `cubic-bezier(0.3, 0, 0.8, 0.15)` |

### 3.4 高度（tonal elevation）

`--m3e-elevation-0..5`，阴影叠加在 `--mc-shadow` 上（无 JS 时回退黑色），低透明度的多层阴影。

### 3.5 字体阶梯

`--m3e-type-label-small/medium/large`、`--m3e-type-body-medium/large`、`--m3e-type-title-medium/large`、`--m3e-type-headline-small`。
均为 font 简写（`weight size/line-height family`），组件用 `font: var(--m3e-type-*)` 引用。

### 3.6 状态层（.m3-state-layer）

交互组件统一挂 `m3-state-layer` 类，获得 M3 状态层：

- 叠色：`--m3e-state-color`（默认 `--on-surface`）
- 透明度：hover 8% / focus 10% / pressed 12%（`--m3e-state-hover/focus/pressed-alpha` 可调）
- `:focus-within` 支持（容器内含聚焦输入框时高亮，用于 TextField 等）
- `:focus-visible` 描边：`--m3e-focus-outline`（默认 `--primary`）
- `[disabled]`：pointer-events none + opacity 0.38

---

## 4. 原子组件（src/components/atoms/）

组件按 M3 分类存放于子目录：`action/`（按钮/操作）、`selection/`（选择控件）、`input/`（输入与表单）、`navigation/`（导航）、`overlay/`（弹层与反馈）、`feedback/`（进度/加载）、`display/`（数据展示）。下表文件列为相对路径。

| 原子 | 文件 | 变体 / props | 关键令牌 |
|---|---|---|---|
| Button | `action/Button.astro` | variant: `filled/tonal/outlined/text`；size: `small(32)/medium(40)/large(48)`；`href/target`（渲染 `<a>`）、`full`、`align: center/start/between`、`disabled`；hover 阴影提升过渡（filled/tonal elevation-1→2，150ms） | primary / secondary-container / outline / on-surface；`--m3e-state-color` 按变体 |
| Button | `action/Button.svelte` | 按钮（官方 Button 移植，token 对齐 v0.192 md-comp-{filled,elevated,filled-tonal,outlined,text}-button + latest 尺寸）：五种变体 filled（primary 实底 + on-primary）/ elevated（surface-container-low + primary + elevation-1，hover 升 level2）/ tonal（secondary-container 实底）/ outlined（透明 + outline 描边）/ text（透明无描边）；尺寸 latest：xsmall 32/图标20、small 40/20（默认）、medium 56/24、large 96/32、xlarge 136/40；可选 leading 图标（Iconify）；label-large、corner-full；交互：原生 button + m3-state-layer，filled/elevated/tonal hover 阴影提升（level0→1 / 1→2）；disabled 对齐官方（filled/elevated/tonal 容器 12% + 文字/图标 38%，outlined 边框 12% + 文字 38%，text 文字 38%） | primary / on-primary、secondary-container / on-secondary-container、surface-container-low、outline |
| AppBar | `navigation/AppBar.svelte` | 顶部应用栏（官方 AppBar.kt）：`variant`（**small** 64dp 标题 title-large / **center** 同高标题居中 / **medium** 112dp 标题 headline-small 大字靠下 / **large** 152dp 标题 headline-medium 大字靠下）、`title`（string 或 snippet）、`navigationIcon`/`actions` 插槽（通常 IconButton，渲染在起始/末尾端）；布局 small/center 单行 [nav][title][actions]，medium/large 顶部 64px 工具行 + 底部大字标题（官方 expanded 静态版，scrollBehavior 折叠未做）；背景 surface、标题 on-surface、图标 on-surface-variant（官方 token） | surface / on-surface / on-surface-variant |
| Card | `display/Card.svelte` | 卡片（官方 Card.kt）：`variant`（**filled** 默认 surface-container-highest 无阴影 / **elevated** surface-container-low + 阴影 Level1 hover Level2 / **outlined** surface + outline-variant 1px 边框 hover outline）、形状 corner-medium（12px，官方 ContainerShape）；`onClick` 传入渲染为原生 `<button>`（可点击卡片，`enabled=false` 禁用 opacity 0.38），省略渲染为普通容器 div；可点击卡片 hover/pressed 加 on-surface overlay（4%/8%）+ `focus-visible` primary 焦点环；`color` 覆盖容器背景（`--m3-card-bg`）；内容溢出圆角裁剪 | surface-container-highest / surface-container-low / surface、outline-variant；`--m3e-elevation-1/2` |
| SplitButton | `action/SplitButton.svelte` | M3E 分离式按钮：`variant`（filled/tonal/outlined/elevated）、`size`（xs/s/m/l/xl，M3E 五档 32–136）、`menuOpen`（$bindable，trailing 激活旋转 180°）、`onclick`（leading 主操作）、`trailingLabel`（trailing 按钮无障碍标签）；leading/trailing 插槽；**两段相接内角在 hover/pressed 时变形更圆**（4→12px 等，官方 SplitButton*Tokens） | primary / secondary-container / outline；`--m3e-elevation-*` |
| ToggleButton | `action/ToggleButton.svelte` | M3E 切换按钮：`checked`（$bindable）、`variant`（filled：选中 primary/未选中 surface-container；tonal：选中 secondary/未选中 secondary-container；outlined：选中 inverse-surface + 描边；elevated：选中 primary/未选中 surface-container-low + elevation-1）、`disabled`、`label`、`controlled`（受控模式：点击不自动切换，仅触发 `onclick`，供 ButtonGroup 复用）、插槽；原生 button + `aria-pressed`，40dp 高、图标 20dp、label-large；**形状变形**（官方 ToggleButtonShapes）：未选中 pill → 按压 6dp → 选中 12dp | primary / secondary / inverse-surface / surface-container、`--m3e-state-color` |
| ButtonGroup | `action/ButtonGroup.svelte` | M3E 按钮组（官方 ButtonGroup.kt 数据驱动版）：`items: {value,label,icon?,weight?}[]`、`value`（$bindable 单选）/ `checkedValues`（$bindable 多选，`multiple` 时）、`variant`（standard 12px 间距 / connected 2px 间距）、`disabled`、`onchange`；**weight 布局**：`weight` 项按比例分配剩余空间（flex-basis 0 + flex-grow，官方 NonAdaptiveButtonGroupMeasurePolicy），无 weight 项保持内容宽；connected：**首/尾项外侧全圆 + 内侧 8px、中间项 4dp，按压内角 8→4px，选中项变全圆 pill**（官方 ConnectedButtonGroupTokens）；**溢出指示器**：ResizeObserver 测量父级宽度，宽度不足时溢出项折叠进「更多」按钮下拉菜单（官方 OverflowIndicator + DropdownMenu，菜单项带 checked 状态）；**animateWidth 宽度交换**：按压时 active 项宽度 ×1.15、其余项等比例压缩（官方 expandedRatio 0.15 + expand/compress，weight 项由 flex 分配不受宽度交换影响） | secondary-container / secondary、`--m3e-elevation-1` |
| Chip | `action/Chip.astro` | variant: `assist`（描边）/`filter`（选中 → secondary-container）/`suggestion`（leading 图标 + label，选中 → secondary-container）/`input`（leading + trailing 删除 slot，选中 → secondary-container）/`tonal`（站内药丸）；`selected`、`href` | surface-container-low / outline-variant / secondary-container / btn-regular 系 |
| IconButton | `action/IconButton.astro` | 站点遗留旧版（Navbar/Profile 使用）：variant `standard/tonal/filled`；`label`、`id`、`href/target/rel`（渲染 `<a>`）；组件库正式版见下方 `IconButton.svelte` | on-surface-variant / secondary-container / primary |
| FAB | `action/FAB.astro` | 站点遗留旧版（BackToTop 使用）：size `small(40)/regular(56)`；`label`、`disabled`；组件库正式版见下方 `FAB.svelte` | primary-container ＋ `--m3e-elevation-3` |
| FAB | `action/FAB.svelte` | 悬浮操作按钮（官方 FloatingActionButton / ExtendedFloatingActionButton 移植，token 对齐 v0.192 md-comp-{fab,extended-fab}-{primary,secondary,tertiary,surface} + Compose latest 尺寸）：四种变体 primary（primary-container 实底 + on-primary-container）/ secondary / tertiary / surface（surface-container-high + primary 图标）；尺寸（图标形态）small 40/图标24、regular 56/24（默认）、large 96/36；Extended 形态（传入 `label`）small 与 regular 同为 56 高、large 96 高，label-large、leading 16 + icon-label 8 + trailing 20；高度默认 level3、hover level4、pressed/focus level3，`lowered` 用 level1（hover level2）；`radius` 可覆盖圆角（token 名 `m`/`l`/`xl`/`full` 或任意 CSS 长度如 `24px`）；图标模式可用 `ariaLabel` 设无障碍标签；原生 button + m3-state-layer | primary-container / on-primary-container、secondary-container、tertiary-container、surface-container-high；`--m3e-elevation-1/3/4` |
| DataTable | `display/DataTable.svelte` | 数据表格（官方 DataTable 移植，token 对齐 v0.192 md-comp-data-table）：容器 corner-extra-small 4px + outline-variant 描边；表头 56px title-small on-surface-variant、可排序列点击触发 `onsort({key,direction})` 并维护排序图标；行高 52px body-medium on-surface、行间 1px outline-variant；`selectable` 复选列（Checkbox 联动 `selected` $bindable），选中行 surface-container-highest；`footer` 支持文本（52px）；行点击 `onclick(row)` | surface / surface-container-highest / on-surface / on-surface-variant / outline-variant |
| SearchView | `input/SearchView.svelte` | 搜索视图（官方 SearchViewTokens 移植，token 对齐 v0.192 md-comp-search-view）：`label`（搜索区域标题，多实例需唯一）、`fullScreen`（默认，全屏覆盖 corner-none + 72px 头）/ `docked`（内嵌卡片 corner-extra-large 28px + elevation level3 + 56px 头）；头部返回箭头 + 输入框（body-large）+ 清除按钮；空查询显示 `history`，输入时按 label 过滤 `suggestions`（可带 leading 图标），默认插槽放自定义结果；Esc / 返回关闭（`onclose`）；全屏打开自动聚焦输入框；建议/历史项键盘 ↑↓ 高亮（`--active` 状态层）+ Enter 选中；容器 surface-container-high、分隔线 outline；无内容时不渲染分隔线与内容区；动画对齐官方 SearchBar.kt：open 切换 docked 用 fade + expandVertically/shrinkVertically（进入 600ms + 100ms 延迟 emphasized-decelerate 0.05,0.7,0.1,1 / 退出 350ms + 100ms 延迟 cubic-bezier(0,1,0,1)），fullScreen 仅 fade；内容区/区块淡入 100ms + 50ms 延迟 standard-accelerate 0.3,0,1,1、淡出 100ms standard-decelerate 0,0,0,1 |
| Autocomplete | `input/Autocomplete.svelte` | 自动补全输入（官方 Autocomplete 移植，token 对齐 v0.192 md-comp-{filled,outlined}-autocomplete）：输入框视觉与 TextField 一致（filled / outlined + error/helper）；输入时按 label 过滤 `options`，菜单 surface-container + elevation-2 + corner-extra-small；键盘 ↑↓ 导航、Enter 选中、Esc 关闭；允许自由输入，`onselect` 选项回调、`onchange` 文本变化；`disabled` 支持 | surface-container-high / surface / outline-variant / surface-container / on-surface / on-surface-variant |
| SheetSide | `overlay/SheetSide.svelte` | 侧边弹层（官方 SheetSide / ModalSideSheet 移植，token 对齐 v0.192 md-comp-sheet-side）：面板从 `side`（end 默认右侧 / start 左侧）滑入，全高，`width` 默认 360px；容器 surface-container-low + elevation level1 + corner-large-start（仅起始侧大圆角）；标题 title-large on-surface-variant；`scrim` 可关（false = persistent 无遮罩）；打开自动聚焦面板 + Tab 焦点陷阱（Shift+Tab 反向循环）、关闭后焦点返还触发元素（官方 Modal Sheet）；Esc / 遮罩点击关闭（`onclose`） | surface-container-low / on-surface / on-surface-variant / `--m3e-elevation-1` |
| Carousel | `display/Carousel.svelte` | 轮播（官方 Carousel / HorizontalUncontainedCarousel 移植，scroll-snap 实现）：横向滚动 + `label`（区域标题，多实例需唯一）、`snap`（mandatory 默认 / proximity / none）；`itemWidth`（<100% 露出相邻卡片，即 uncontained 视觉）、`itemSpacing`、`contentPadding`；滚动中计算焦点项触发 `onchange(index)`；children snippet 渲染每一项 | 滚动容器 + 卡片自定义 |
| PullToRefresh | `feedback/PullToRefresh.svelte` | 下拉刷新（官方 PullToRefresh 移植）：包裹可滚动内容，`label`（可滚动区域标题）、顶部下拉超过 `threshold`（默认 80px，阻尼 0.4）松开触发 `onrefresh`（async 可等待）；指示器拉动时缩放、刷新中旋转、完成后淡出；`refreshing` $bindable；仅拦截 scrollTop=0 的下拉手势，overscroll-behavior 阻止浏览器原生刷新；可滚动区域 role=region + tabindex 键盘可达 | `--primary` / surface |
| FABMenu | `action/FABMenu.svelte` | M3E 悬浮菜单：`expanded`（$bindable）、`icon`/`iconExpanded`（Crossfade 切换，50% progress 处交替）、`label`、`size`（small 56 / medium 80 / large 96，展开收缩到 56 全圆 + close 20px）、`align`（end/start/center）、`containerColor`/`containerContentColor`（默认 primary-container/on-primary-container，展开变 primary）、`menuItemColor`/`menuItemContentColor`（默认 primary-container/on-primary-container，→ `--fab-menu-item-bg/-color`）、`exclusive`（默认 true：单开互斥，展开时经 `menu-bus` 通知其他菜单/FABMenu 收起；false 则不参与）；**动画**：rAF 驱动 `--fab-progress`（0→1，300ms emphasized-decelerate，官方 FastSpatial），容器颜色/尺寸/圆角/图标颜色/图标大小统一按 progress 插值（官方 ToggleFAB lerp）；菜单项 `.m3-fab-menu-item`（56px 全圆、18px 图标 + body-medium）+ stagger 展开；**键盘焦点**：展开时 FAB 上 `Tab`/`ArrowDown` 聚焦首个菜单项（菜单项为原生 button，Tab 在项间自然移动）；收起时菜单项 inert（不可聚焦、无障碍树隐藏） | primary-container / primary、`--m3e-elevation-3` |
| Slider | `selection/Slider.svelte` | 滑块（色相选择专用，经典视觉）：`value`（$bindable）、`min/max/step`、`label`；原生 range input（方向键 / PageUp / PageDown / Home / End 步进），focus-visible primary 描边 | 彩虹轨道 `--color-selection-bar`、白色矩形 thumb、`--primary` |
| SegmentedButton | `selection/SegmentedButton.svelte` | M3 分段按钮（官方 SegmentedButton / MultiChoiceSegmentedButton）：`options: {value,label}[]`、单选 `value`（$bindable）/ 多选 `multiple` + `checkedValues`（$bindable 数组，checkbox 语义）、`label`、`disabled`；选中段显示 **check 图标 scaleIn + fade**（官方 TransformOrigin(0,1) 底部左角 + FastSpatial，恒渲染由 `.selected` 驱动）；input 用 sr-only 隐藏（保留可聚焦与键盘支持）：单选段方向键移动（radio 语义）、多选 Space 切换勾选 | container 底、选中段 secondary-container |
| TextField | `input/TextField.svelte` | `value`（$bindable）、`placeholder`、`name/id`、`label`（浮动：focus/有值上浮顶部，M3 标准）、`variant`（**filled** 默认 surface-container-high + 底部下划线 focus 亮起 / **outlined** surface + outline-variant 1px 边框 + focus primary 2px）、`error`（错误提示：下划线/边框变 error + 提示文字）、`onfocus`/`oninput`/`onblur`、`leading` 命名插槽 | surface-container-high / surface / outline-variant、primary、error |
| Switch | `selection/Switch.svelte` | `checked`（$bindable）、`disabled`、`label`、`icons`（M3E 图标变体：传 `icons` 时 thumb 恒 24px 显示 ✓/✕；缺省为 thumb 16↔24 动态无图标的经典样式）；原生 checkbox 自绘 track/thumb | 选中 secondary-container + 状态层 |
| Checkbox | `selection/Checkbox.svelte` | `checked`（$bindable，`boolean \| null`）、`disabled`、`label`、`triState`（半选横线）；原生 checkbox 自绘 18px 方框；**勾选生长动画**（官方 checkDrawFraction 描边生长近似：check/dash scale 0→1 + fade，进入慢 decelerate / 取消快 standard 的非对称） | primary / on-surface-variant、禁用 0.38 |
| RadioButton | `selection/RadioButton.svelte` | `checked`（$bindable）、`disabled`、`label`、`onchange`；原生 radio 自绘 20px 环 + 12px 内点 | primary / on-surface-variant、禁用 0.38 |
| SearchBar | `input/SearchBar.svelte` | M3E 搜索条（官方 SearchBar.kt docked 移植）：`expanded`（$bindable）、`query`（$bindable）、`placeholder`、`label`、`onsearch(query)`（回车/IME 搜索）；**收起态 56dp pill**（surface-container-high + `--m3e-elevation-3`）+ leading search 图标 + 输入框（body-large）+ trailing（展开 close / 有输入时 clear）；**展开态整体 corner-extra-large(28dp)** + Divider（outline）+ 内容插槽（建议/结果，可滚动，官方 ExpandedDockedSearchBar）；交互：点击/focus 展开并聚焦输入、ESC/外部点击/close 收起、展开时 ArrowDown 移入内容区（官方 moveFocus）；聚焦指示 Secondary（官方 FocusIndicatorColor）；展开/收起动画按官方 DockedEnter/Exit（600ms emphasized-decelerate / 350ms linear + 内容 50ms delay 淡入）；无内容插槽时点击仅聚焦不展开；收起时内容区 inert（子项不可聚焦）；FullScreen/TopAppBar 变体未实现 | surface-container-high / secondary、`--m3e-elevation-3` |
| ProgressIndicator | `feedback/ProgressIndicator.svelte` | 进度指示（官方 ProgressIndicator.kt）：`variant`（linear 4dp 高轨道 / circular 圆环）、`progress`（0-1 定值，`$derived` 实时响应；省略/undefined = indeterminate）、`label`、`showStop`（默认 true）、**circular `size`（直径 px，默认 40，官方 Size token；thick 风格 52+8）/ `strokeWidth`（描边厚度 px，默认 4，官方 ActiveThickness/TrackThickness）参数**——viewBox/圆心/半径/周长随 size 动态生成（r = (size-strokeWidth)/2），弧长与 gap 全部按实际像素自适应，indeterminate 弧长动画用 `--pi-circ`×`--pi-sweep` 比例（size 变化自动适配）、**`indeterminate` 变体**（linear：dual 双线官方默认 / wave 波浪 / single 单线；circular：dual 官方弧伸缩 0.1↔0.87 + 6s 旋转 / single 固定弧 0.25 周长旋转 / **wave 官方带弧度旋转组合**：全局 3 圈匀速（6s 1080°）+ 附加步进旋转（每 1.5s 300ms 强调减速转 90° 停 1.2s，4 步 360°）+ 弧长 0.1↔0.87 伸缩上行 standard 回落 linear）、**`color`/`trackColor`/`strokeCap`/`gapSize` 参数**（官方 color/trackColor/StrokeCap round默认·butt/gapSize 默认4px，active 与 track 间空白）；**indeterminate linear 精确复刻官方 head/tail**：4 值关键帧（Line1 head 0→1000ms、tail 250→1250ms；Line2 head 650→1500ms、tail 900→1750ms，总循环 1750ms），线区间 [tail,head] 生长/消失无跳变 + 左右 2px gap，Web 用 `@property` CSS 变量插值；**determinate linear**：track-fill 从 progress + gap 开始（左侧 active+gap 空白），active 填充 + 末端 stop 圆点（官方 StopSize 4dp，0/100% 隐藏）；linear wave 用 mask 正弦波带（官方 ActiveWave：波长 40dp、波幅 3dp，波浪带留白圆滑、上下超出轨道 2px、mask-position 横向流动）；**determinate circular**：circle + dasharray/dashoffset（负值）实现，可 CSS transition 平滑转动；active 完整弧 0→progress（rotate -90 从 12 点起）、track 从 active 末端 + gap 开始（官方 adjustedGapSize = gapSize + strokeWidth，round cap 弧端补偿）；绘制顺序先 track 后 active（官方 active 顶层，避免 track 圆头盖到颜色弧）；无 stop 圆点（官方同）；track 为剩余弧段（非全圆）；**`wavy` 官方 WavyProgressIndicator 波浪形态**（linear 240×10 容器 + 二次贝塞尔波浪线：determinate 振幅按进度阈值 ≤0.1/≥0.95→0 直线、中间→1 满波，500ms standard/emphasized-accelerate tween，波浪以官方段 [s, head+s] 平移 -s 组合连续填满 [0, head]、轨道从 head+gap 开始（波峰自头部向尾部流动），indeterminate 双线 head/tail + 波浪流动（波浪锚定轨道全局坐标，窗口滑动时相位不变、双线同相连续）；circular 48×48 圆↔9 齿星形 RoundedPolygon.star morph：determinate 起点 3 点、indeterminate 全局 1080° 匀速 + 步进 90°×4 停 1.2s + 弧长 0.1↔0.87，弧端固定、齿形在弧内流动（dashoffset 平移 + 同步反向旋转抵消）；`wavelength`/`waveSpeed`/`amplitude` 参数） | primary / surface-container-highest |
| NavigationBar | `navigation/NavigationBar.svelte` | 底部导航（官方 NavigationBar.kt）：`items: {value,label,icon?}[]`、`value`（$bindable）、`label`；64dp 容器 surface-container + `--m3e-elevation-2`，项均分（图标 + label 垂直，原生 button + aria-current）；**选中指示器 pill**（secondary-container 全圆 64×32dp）**scaleX 0→1 生长动画**（官方 animateFloatAsState indicatorWidth）+ 图标 on-secondary-container / label secondary 颜色过渡；inactive on-surface-variant；折叠模式（alwaysShowLabel=false）未实现 | surface-container / secondary-container、`--m3e-elevation-2` |
| NavigationRail | `navigation/NavigationRail.svelte` | 侧边导航栏（官方 NavigationRail.kt）：`items: {value,label,icon?}[]`、`value`（$bindable）、`label`、`header` 插槽（顶部 FAB/头像/Logo）、`alwaysShowLabel`（false = **折叠模式**，官方 CollapsedTokens：仅选中项显示 label、其余只图标 item min 56）；80dp 宽容器（官方 NarrowContainerWidth）背景 surface，垂直排列 items（gap 12px）+ header；Item 72×64（官方 BaselineItemTokens ContainerHeight 64）：icon 24px 顶置 + label（label-medium）gap 4dp，**56×32 指示器 pill（secondary-container 全圆只包图标，选中 scaleX 0→1 生长）**；选中 icon on-secondary-container、label secondary，inactive on-surface-variant；item 按钮输出 aria-label（折叠模式下仍可读） | surface / secondary-container、on-surface-variant |
| ExposedDropdownMenu | `input/ExposedDropdownMenu.svelte` | 下拉选择框（官方 ExposedDropdownMenu）：`options: {value,label}[]`、`value`（$bindable）、`label`/`placeholder`、`variant`（filled 底部主色下划线 / outlined 边框）；触发区显示当前 label + trailing ▾（展开旋转 180°，官方 TrailingIcon），点击弹出选项列表（role=listbox，scale/fade 展开、选中项 check 图标 + hover state layer）；外部点击 / ESC / 选择后关闭 | surface-container-high / surface-container、primary |
| NavigationDrawer | `navigation/NavigationDrawer.svelte` | 模态导航抽屉（官方 ModalNavigationDrawer）：`items: {value,label,icon?}[]`、`open`（$bindable，遮罩点击/Esc 自动置 false）、`value`（$bindable）、`header`/`footer` 插槽；遮罩（scrim 32% 淡入）+ 左侧滑出 **360dp 面板**（官方 ModalNavigationDrawerTokens.ContainerWidth，surface-container-low，右侧 16dp 圆角），translateX(-100%)→0（emphasized-decelerate 400ms）；Item（官方 NavigationDrawerItem）：全宽 56dp 高，selected 整项变 secondary-container 全圆 pill（label-large on-secondary-container），leading 图标 24px，inactive on-surface-variant；始终渲染（CSS class 控制显隐，过渡干净） | surface-container-low / secondary-container、on-surface-variant |
| Tabs | `navigation/Tabs.svelte` | 标签页（官方 M3 Tabs，对齐 material-web 实测）：`items: {value,label,icon?}[]`、`value`（$bindable，空值/未命中自动选中第一项）、`variant: primary/secondary`、`scrollable`、`onchange`；scrollable：内容宽 tab（最小 90dp）、起始边缘留白 52dp、溢出横向滚动（隐藏滚动条）、选中 tab 自动滚动居中；primary：48dp（带图标 64dp，图标上置、间距 2dp）Surface 容器 + 底部 1dp divider，激活指示器 3dp primary、圆角 3,3,0,0、宽度 = 标签内容宽（最小 24dp）、切换滑动；激活项 primary；secondary：48dp、指示器 2dp primary 方角、整格全宽、激活项 on-surface；标签字体官方 title-small（14/20/500），支持方向键/Home/End（ARIA tabs） | surface / primary、on-surface、on-surface-variant、outline-variant |
| Badge | `display/Badge.svelte` | `content`（有内容显示 label-small 文字，否则 6px 圆点）、`disabled`；配 `BadgedBox.svelte` 锚定到右上角；**dot↔数字切换尺寸过渡 + label scale/fade 动画**（恒渲染由 show class 驱动） | error / on-error |
| BadgedBox | `display/BadgedBox.svelte` | 徽标锚定容器（Compose BadgedBox 移植）：默认插槽为锚定内容、`badge` 命名插槽放徽标（配合 `Badge.svelte`），自动定位右上角（translate 50%/-50%） | — |
| Divider | `display/Divider.svelte` | `vertical`、`thickness`、`color`；默认 1px | outline-variant |
| Dialog | `overlay/Dialog.svelte` | `open`（$bindable）、`title`、默认插槽 + `actions` 命名插槽；scrim/ESC 关闭、打开聚焦容器、Tab 焦点陷阱循环、关闭后焦点返还触发元素；**进场 scrim fade + 内容 scale 展开，退场对称动画后卸载**（closing 状态 + animationend） | surface-container-high、`--m3e-elevation-3`、scrim `--mc-scrim` |
| AlertDialog | `overlay/AlertDialog.svelte` | 警示对话框（官方 AlertDialog.kt）：`open`（$bindable）、`title`（headline-small）、`text`（body-medium on-surface-variant）、`icon` 插槽（primary）、`confirmButton`/`dismissButton` 插槽（右对齐，官方 TextButton）；容器 corner-extra-large 28dp（官方 DialogTokens.ContainerShape）+ surface-container-high + elevation-3、min 280 max 560dp；打开自动聚焦（ESC 可接收）、Tab 焦点陷阱循环、关闭后焦点返还触发元素、scrim/ESC 关闭、进场 scrim fade + scale 展开、退场对称动画后卸载（同 Dialog） | surface-container-high、`--m3e-elevation-3`、primary |
| DatePicker | `input/DatePicker.svelte` | 日期选择器（官方 DatePicker 简化日历版）：`value`（ISO "YYYY-MM-DD" $bindable）、`label`、`locale`（周起始/星期名/月份标题按 Intl）、`onchange`；头部月份导航（‹ 年 月 ›）+ 周标题 + 7×6 日期网格；今天 inset primary 1px、选中 primary-container 全圆、hover state layer；简化：未做输入模式/年视图 | surface-container-high / primary-container |
| DateRangePicker | `input/DateRangePicker.svelte` | 日期范围选择器（官方 DateRangePicker 简化版）：`start`/`end`（$bindable ISO）、`locale`、`onchange({start,end})`；选择逻辑第一次点 = start、第二次 = end（end < start 自动交换）；范围中间日期 secondary-container 40% 淡背景（圆角仅两端）、两端 primary-container 全圆；复用 DatePicker 网格结构 | surface-container-high / primary-container、secondary-container |
| TimePicker | `input/TimePicker.svelte` | 时间选择器（官方 TimePicker 表盘 + 输入双模式）：`value`（24h "HH:MM" $bindable）、`format`（h24 双环：外 1-12 + 内 13-24，0 显示为 24 / h12 单环 + 上午/下午）、`label`、`onchange`；表盘 256dp、选中手柄 48dp primary-container 全圆（非整 5 分钟时手柄内显示数字）、轨道 2dp primary（指向选中时刻，h24 内环小时用短轨道）+ 中心点 8dp、点击按角度吸附最近的小时/分钟（官方 ClockFace）；**输入模式（官方 TimeInput）**：表头右上角键盘/时钟图标切换，HH:MM 两个填充输入框（56×64dp），自动过滤非数字、小时满两位自动跳分钟、实时校验（h24 0-23 / h12 1-12、分钟 0-59），非法显示 error 下划线、合法即提交；头部分段点击可切回对应阶段；表头左对齐时间、h12 右侧 AM/PM（tertiary-container） | surface-container-high / primary-container、tertiary-container、error |
| Select | `input/Select.svelte` | 下拉选择（官方 Select 移植，对齐 material-web）：`items: {value,label,leading?}[]`、`value`（$bindable）、`variant: filled/outlined`（官方 Select 高度 56px、label 顶置 8px + 值下移 24px 不重叠）、`label`（恒定浮动顶部 + 必填星号）、`placeholder`、`required`、`disabled`、`helper`/`error`；值 body-large + 右侧箭头（展开翻转）；菜单 surface-container + elevation-2，选项 48px label-large，选中项 surface-container-highest + 右侧 check；disabled 分项透明度（背景实底、outlined 边框 12%、文字 38%）；交互：点击/Enter/Space/方向键展开，方向键/Home/End 移动、Enter 选中、ESC/外部点击关闭、首字母 typeahead；菜单 fixed 锚定触发按钮（滚动/缩放重定位、宽度=按钮宽最小 210px、空间不足向上展开）；combobox + aria-activedescendant，label 通过 aria-labelledby 作为 combobox 名称 | surface-container-high / surface / surface-container（菜单）、surface-container-highest、on-surface-variant、primary、error |
| Banner | `overlay/Banner.svelte` | 横幅（官方 Banner 移植，token v0.192 md-comp-banner）：`text`（body-medium on-surface-variant）、`icon?`（Iconify，40px 圆形 primary 24px）、`actions: {label,onClick}[]`（TextButton 风格 label-large primary、state layer，最多 2 个）；容器 surface-container-low + `--m3e-elevation-1`；`shape`（square 默认方角 / round 最新版 28px 圆角）；`compact` 紧凑形态（图标缩为 24px/16px、内边距收窄，圆角 + 图标 + 多操作也能保持单行 52px，适合提示条/内嵌横幅）；高度自适应吻合官方 token：单行 52px / 带图标 72px / 多行 92px（约 3 行），40px 触摸目标通过负 margin 不撑高容器；适用公告/Cookie 声明/离线提示等 | surface-container-low / primary、on-surface-variant |
| Chips | `action/Chips.svelte` | 标签组（官方 Chip 移植，token 对齐 v0.192 md-comp-{assist,filter,input,suggestion}-chip）：四种形态 assist（描边辅助 + primary 18px 前置图标）/ filter（筛选，单选 `value` / 多选 `multiple`+`values`，均 $bindable，选中 secondary-container + 勾选）/ input（输入，点击切换选中 + 尾部删除 `onremove`，支持 24px 头像、可覆盖 trailing 图标）/ suggestion（建议，描边 + primary 前置图标）；容器 32px 高、corner-small 8px、label-large，flex-wrap 自动换行 gap 8px；原生 button + m3-state-layer（hover/focus/pressed），filter 用 aria-pressed，整体/单 chip 禁用（opacity 0.38）；适用标签筛选/输入标签/搜索建议/辅助操作 | secondary-container / on-secondary-container、on-surface、on-surface-variant、primary、outline |
| IconButton | `action/IconButton.svelte` | 图标按钮（官方 IconButton 移植，token 对齐 v0.192 md-comp-{icon,filled,filled-tonal,outlined}-icon-button + latest 尺寸/shape）：四种变体 standard（透明 + on-surface）/ filled（primary 圆底 + on-primary）/ tonal（secondary-container 圆底）/ outlined（透明 + outline 描边）；尺寸 latest：xsmall 32/图标20、small 40/24（默认）、medium 56/24、large 96/32、xlarge 136/40；shape round（默认圆形）/ square（按尺寸 corner-medium~extra-large），toggle 选中时形状互换（官方行为）；toggle 模式 checked（$bindable）+ checkedIcon 切换、aria-pressed 同步；交互：原生 button + m3-state-layer；disabled 对齐官方（图标 38%、filled/tonal 容器 12%）；适用工具条操作/收藏开关/AppBar 动作 | primary / on-primary、secondary-container / on-secondary-container、on-surface、inverse-on-surface、outline |
| Menu | `navigation/Menu.svelte` | `open`（$bindable）、`label`、`variant`（standard/vibrant，vibrant 为 tertiary 基高强调）、`exclusive`（默认 true：单开互斥，打开时经 `menu-bus` 通知其他菜单/FABMenu 关闭；false 则不参与）、class；受控容器，ESC/外部点击关闭（点击其他菜单内不关闭），**:global(.m3-menu-item)** 项样式（44px）＋ `.selected`/`.checked` 状态、`.m3-menu-group` 分组（surface-container-low 背景 + hover 8→16px 形状变形、组间距 2px）、`width: max-content` 宽度稳定；**动画**：展开/收起 **scale 1↔0.8 + fade**（官方 DropdownMenu transition：FastSpatial/FastEffects spring 近似，展开 250ms decelerate / 收起 150ms accelerate，`--menu-origin` 锚点缩放默认 top center）、菜单项 hover 背景 150ms 过渡、勾选图标 `.m3-menu-item__check`（checked 时 scaleX 0→1 + fade，官方 expandHorizontally）；**项结构辅助类**：`.m3-menu-item__trailing`（margin-left:auto 右对齐 trailing 内容）、`.m3-menu-item__content`（flex 列，标签 + 辅助文字垂直排列）、`.m3-menu-item__label`（label-large）、`.m3-menu-item__supporting`（body-small + on-surface-variant，官方 supportingText） | surface-container / tertiary-container、`--m3e-elevation-2` |
| ListItem | `display/ListItem.svelte` | 列表项（官方 ListItem.kt）：`headline`（label-large）、`overLine`（label-small）、`supporting`（body-medium，最多 2 行省略）、`leading`/`trailing` 插槽（40dp/24dp 区域）；行高按内容自适应：单行 56dp / 两行 72 / 三行 88（官方 ContainerHeight/TwoLine/ThreeLine）；`selected` 选中态 secondary-container、`onClick` 传入渲染为可点击 button（hover on-surface 8% + aria-pressed） | secondary-container / on-surface-variant |
| LoadingIndicator | `feedback/LoadingIndicator.svelte` | 加载指示器（官方 LoadingIndicator.kt，M3E 特有形状 morph 加载器）：形状数据与官方同源（androidx.graphics.shapes 的 RoundedPolygon + Morph feature-matching，cubic 对线性插值，见 `loadingShapes.ts`）；indeterminate 在 **7 形状循环 morph**（SoftBurst/Cookie9/Pentagon/Pill/Sunny/Cookie4/Oval，官方 IndeterminateIndicatorPolygons），每段 spring（damping 0.6/stiffness 200/visibilityThreshold 0.1）+ 650ms 间隔（MorphIntervalMillis）+ 逐段累计旋转 90° + **整体线性旋转 4666ms/圈**（GlobalRotationDurationMillis）；determinate 官方 DeterminateIndicatorPolygons（Circle 旋转 18° → SoftBurst），progress 0→1 线性 morph + 逆时针 `-progress*180°`；指示器缩放 = calculateScaleFactor × ActiveIndicatorScale（38/48）居中于 48×48 容器；`color`/`size`（默认 48）/`contained`（官方 ContainedLoadingIndicator：primary-container 圆形容器 + on-primary-container 指示器）/`containerColor` | primary / on-primary-container + primary-container |
| DateInput | `input/DateInput.svelte` | 日期文本输入（官方 DateInputTextField 独立版）：`value`（ISO "YYYY-MM-DD" $bindable，非法时保持旧值）、`label`（浮动标签）、`placeholder`、`yearRange`、`leading` 插槽（默认日历图标）；输入自动按 YYYY/MM/DD 分段格式化（官方 DateInputFormat）；blur/Enter 校验（官方 DateInputValidator）：格式 / 年份范围 / 月份 / 真实日期（new Date 回验），错误显示 error 色下划线 + 提示；结构对齐 TextField（surface-container-high 填充 + 下划线 + focus primary） | surface-container-high / primary、error |
| FloatingToolbar | `action/FloatingToolbar.svelte` | 浮动工具栏（官方 FloatingToolbar.kt）：`expanded`（$bindable）展开 = CornerFull pill 完整条（`leading`/`children`/`trailing` 插槽 + 阴影 Level2），收起 = 折叠成 40px 小圆按钮（只显示 leading，阴影 Level1）；容器 primary-container / on-primary-container（`containerColor` 覆盖） | primary-container / on-primary-container、`--m3e-elevation-1/2` |
| BottomSheet | `overlay/BottomSheet.svelte` | 模态底部弹层（官方 ModalBottomSheet）：`open`（$bindable，遮罩点击/Esc 置 false）、`title`（headline-small）、`children`；遮罩 32% 淡入 + 面板从底部滑入（translateY 100%→0，emphasized-decelerate 400ms），顶部 16dp 圆角（ShapeCornerTopLarge）+ 拖拽把手（32×4 圆条）+ surface-container-low，宽度 max 656dp 居中（官方 ModalContainerWidth）；始终渲染（CSS visibility 控制）；未做拖拽手势/anchors | surface-container-low、on-surface-variant |
| Snackbar | `overlay/Snackbar.svelte` | 由事件总线 `showSnackbar(msg, opts?)` 触发；`opts`：`action?: {label, onClick}`（操作按钮，label-large + inverse-primary，点击执行并关闭）、`icon?: string`（24dp，inverse-on-surface）；两行文字自适应（官方单行 48dp / 两行 68dp）、corner-xs(4dp)；**进出场 fade + scale 0.8↔1**（官方 SnackbarHost，FastEffects/FastSpatial） | inverse-surface / inverse-on-surface / inverse-primary、`--m3e-elevation-3` |
| Tooltip | `overlay/Tooltip.svelte` | 包裹式（锚点插槽 + 提示内容）；`variant`：`plain`（默认，inverse-surface + corner-xs + body-small）/ `rich`（surface-container + corner-medium + `--m3e-elevation-2`，`title` title-small + `supporting` body-medium + 可选 `action` {label,onClick} primary）；hover 延迟 400ms 显示、focus 立即（键盘可达，注入 `aria-describedby`） | inverse-surface / surface-container / on-surface-variant、`--m3e-elevation-2` |
| PostCard | `blog/PostCard.astro` | 文章卡片（blog 原子，数据驱动）：`href`/`title`/`description`/`image`（封面，桌面端右侧 28%）/`imageAlt`/`published`/`updated`/`category`/`tags`/`readingTime`；容器对齐 display/Card 令牌（surface-container-high + corner-large 16px + hover elevation-2），标题链接 + 进入按钮/封面链接（整卡为 article，避免嵌套 `<a>`），内嵌 blog/PostMeta，描述两行截断 | surface-container-high / on-surface / primary |
| PostMeta | `blog/PostMeta.astro` | 文章元信息行：`published`/`updated`/`category`/`tags`（`{name,href}[]`，展示文本由调用方格式化）、`hideTags`/`hideUpdate`、无分类/无标签占位文案；图标 + 文字 on-surface-variant，链接 hover 变 primary | on-surface-variant / primary |
| TagList | `blog/TagList.astro` | 标签列表：`tags`（`{name,href}[]`）渲染为 tonal Chip 链接组（复用 action/Chip），flex-wrap 自动换行 | btn-regular 系 / primary |
| CategoryList | `blog/CategoryList.astro` | 分类列表：`categories`（`{name,href,count?}[]`）渲染为 text Button 行（align between）+ 数量徽标（surface-container-high 圆角，label-medium 加粗） | on-surface / surface-container-high |
| TocList | `blog/TocList.astro` | 目录列表（静态 SSR 版）：`headings`（`{depth,text,slug}[]`）、`maxDepth`（默认 3）；顶级编号徽标（secondary-container）+ 子级小圆点按层级缩进，hover 状态层，锚点链接；激活态由调用方叠加 | secondary-container / on-secondary-container / on-surface-variant |
| PagePagination | `blog/PagePagination.astro` | 分页器（数据驱动）：`currentPage`/`totalPages`/`buildUrl(page)`/`adjacent`（默认 2）；页码窗口 + 首尾省略号折叠，激活页 primary 实底 + `aria-current`，前后箭头（首/尾页渲染为 `aria-hidden` span 禁用，避免无 href 的 a） | primary / on-primary / surface-container-low |
| ArchiveList | `blog/ArchiveList.astro` | 归档列表：`groups`（`{year, items:{title,href,date,tags?}}[]`）按年份分组；年份头 + primary 节点环 + 时间轴小圆点，条目 hover 标题变 primary 并右移；tags 桌面端显示 | primary / on-surface / on-surface-variant |
| FooterBar | `blog/FooterBar.astro` | 页脚栏：`name`/`year`/`links`/`poweredBy`；顶部虚线分隔 + 居中文本（on-surface-variant），链接 primary；`external` 链接自动补 `target=_blank` + rel | on-surface-variant / primary |

约定：
- 静态原子用 Astro，交互原子用 Svelte 5（runes 或 legacy `$:` 均可，同文件内不混用）。
- 原子通过 `class` prop 透传扩展类；需覆盖 scoped 样式时用 Tailwind `!`（important）或 `:global()`。

---

## 5. 角色 → 语义映射速查

| M3 角色 | 语义用途 |
|---|---|
| primary / on-primary | filled 按钮、当前页/选中强调 |
| primary-container / on-primary-container | FAB、代码块选中、某些容器 |
| secondary-container / on-secondary-container | 选中态（segmented、filter chip、菜单项）、tonal 按钮 |
| surface-container-low → highest | 按钮层级、浮层、代码块背景 |
| on-surface / on-surface-variant | 正文 / 次要文字（`.text-90/75/50/30/25` 基于它们） |
| outline / outline-variant | 描边、分隔线 |
| inverse-surface / inverse-on-surface | Snackbar |
| error 家族 | 错误提示（预留） |
| surface-tint / shadow | 高度阴影 |

---

## 6. 设计规范：2021 vs 2025

**重要（已验证）**：在 `@material/material-color-utilities@0.4.0` 中，
`MaterialDynamicColors.colorSpec` 是静态属性、模块加载时固定为 **2025 版委托**
（`material_dynamic_colors.js:295`，从未按 specVersion 切换）。因此：

- **角色集在 2021 与 2025 下完全一致**——`*Dim`/`*Fixed` 等角色两种规范都会解析出值。
- 2021/2025 的实际差异**仅在调色板派生层**（`DynamicSchemePalettesDelegateImpl2021` vs `2025` 的 `getPrimaryPalette` 等），表现为微妙的色相/色度差异。
- 引擎仍按规范生成 scheme（`new SchemeTonalSpot(hct, isDark, 0, spec)`），只是角色解析统一走 2025 委托。

因此"Color Spec"切换控件是**有效的**（调色板确实不同），但它**不会**增减角色。
若未来升级库版本改变了这一行为，需同步更新本文档与 `mc-utils.ts` 的注释。

---

## 7. 扩展指南

### 新增令牌
在 `variables.styl` 中：
1. 颜色类令牌放进 `define({...})`（明暗自适应，`value[0]`=亮、`value[1]`=暗）。
2. 通用令牌放 `:root` 块（形状/动效/高度/字体）。
3. 优先引用已有 `--mc-*` / 语义令牌，禁止硬编码色值。

### 新增原子
1. 在 `src/components/atoms/` 创建组件（交互用 Svelte，静态用 Astro）。
2. 根元素挂 `m3-state-layer`（若需交互反馈），引用 `--m3e-*` / 语义令牌。
3. 提供 `class` prop 透传；对外保持最小 props 集。

### 消费新角色
1. `mc-utils.ts` 的 `roleMap` 已覆盖全部 56 角色；新增角色需补进 `roleMap` 与 `theme-utils.ts` 的 `ROLE_TO_CSS`。
2. `variables.styl` 增加对应语义别名（带 oklch 回退，参照现有写法）。

### 动效
过渡统一用 `--m3e-duration-*` + `--m3e-easing-*`，禁止散落的 `transition: all 0.3s`。

---

## 8. 文件索引

| 文件 | 职责 |
|---|---|
| `src/utils/mc-utils.ts` | HCT 引擎：9 风格 × 2 规范 × 56 角色 → hex |
| `src/utils/theme-utils.ts` | 角色 → `--mc-*` 映射、localStorage（`mc-style`/`mc-spec`）、`applyCurrentScheme` |
| `src/utils/setting-utils.ts` | 色相 / 明暗 / Expressive Code 主题联动 |
| `src/utils/snackbar.ts` | Snackbar 事件总线 |
| `src/utils/menu-bus.ts` | 菜单互斥事件总线（Menu/FABMenu 单开联动，`exclusive` 参数） |
| `src/styles/variables.styl` | 全部设计令牌（颜色/形状/动效/高度/字体） |
| `src/styles/main.css` | Tailwind 层序、状态层、组件类 |
| `src/components/atoms/*` | 55 个原子组件 |
| `src/components/organisms/DisplaySettings.svelte` | 色相/风格/规范控制面板 |

---

## 9. 组件质量与测试（Playwright）

组件质量专项以官方 Material Web（`md-comp-*`，`research/material-web/tokens/versions/v0_192`）为基准，
用 Playwright 对原子组件做渲染 / 交互断言，防止令牌漂移与行为回退。

### 9.1 运行

```bash
pnpm test                                     # 全量（等价 npx playwright test）
npx playwright test tests/atoms/button.spec.ts # 单个文件
npx playwright test -g "Menu"                 # 按标题过滤
```

- 配置：`playwright.config.ts`，testDir `./tests`，单 worker，`webServer` 自动拉起 Astro dev（http://localhost:4321）。
- 测试页：`src/pages/atoms-*-test.astro` 仅作本地验证用、不入库；运行时真实加载组件，并等待主题引擎把 `--mc-*` 写入 `:root`。

### 9.2 断言辅助（tests/helpers/atoms.ts）

| 函数 | 用途 |
|---|---|
| `openTestPage(page, slug)` | 打开测试页，等待主题初始化（`--mc-primary` 写入 `:root`）+ 350ms 过渡收敛 |
| `expectMatchesToken(page, sel, prop, token)` | 断言元素 computed 样式 === token 解析值（`var(--xxx)` 计算） |
| `expectStyle` / `readStyle` / `readBox` | 断言 / 读取 computed 样式与盒尺寸 |
| `resolveVar(page, prop, token)` | 把 token 变量解析为最终计算值 |

要点：

- 主题引擎写入 `--mc-*` 后组件颜色带 transition，断言前必须等过渡收敛（`--m3e-duration-short` 150ms），否则会拿到中间帧的 `rgba` 混合值。
- 交互类断言（点击切换、菜单开关）同样要等动画结束；菜单项选中后容器加 `.closed` 隐藏（项保留在 DOM，应断言容器而非计数）。
- 颜色一律按 token 对齐（`--secondary-container` 等），不写死具体色值。

### 9.3 键盘/焦点深度测试（B 专项）

对核心可交互组件补充了键盘与焦点断言（`tests/atoms/*.spec.ts`）：

- DataTable：表头点击 / Enter 触发排序，排序后行顺序真实重排；
- TimePicker：拨盘选小时自动切分钟并回填、h12 下午切换（07:05 → 19:05）、输入模式键入回填；
- DatePicker：月份导航往返切换；
- Select：Home/End 定位首尾项、首字母 typeahead；
- Tabs：方向键 + Home/End 移动（焦点与激活跟随）；
- Autocomplete：`aria-activedescendant` 指向活动项、点击外部关闭；
- Slider：PageUp/PageDown/Home/End 大跨度步进；
- SheetSide：打开聚焦面板、Tab 焦点陷阱循环、关闭后焦点返还触发元素；
- SearchView：全屏 Esc 关闭、打开自动聚焦输入框、建议/历史项 ↑↓ + Enter 键盘选择。



### 9.4 无障碍审计（E 专项，axe-core）
以 axe-core（WCAG 2.1 AA）对全部 30 个 atoms 测试页做逐页扫描锁定（`tests/atoms/a11y.spec.ts`），除测试脚手架页面级规则 `page-has-heading-one` 外不允许任何违规。本轮修复：

- FABMenu / SearchBar：收起时内容区加 `inert`，隐藏菜单项/建议结果不再可聚焦（aria-hidden-focus）；
- Select：combobox 名称来自 label（`aria-labelledby`，无 label 回退 `aria-label=placeholder`）；
- SplitButton：trailing 菜单按钮新增 `trailingLabel`（默认“更多操作”）；
- NavigationRail：item 按钮输出 `aria-label`，折叠模式仍可读；
- SearchView / Carousel / PullToRefresh：新增 `label` 区域标题；PullToRefresh 滚动区 `role=region + tabindex=0` 键盘可达；
- TimePicker：修复表盘轨道指向（原偏差 180°，现指向选中时刻），h24 内环小时用短轨道（消除与数字的重叠误判）；
- 演示页：工具栏图标按钮、进度滑杆、空圆形按钮补齐无障碍标签；轮播演示卡加深色渐变衬底保证对比度。


### 9.5 深色模式对比度（F 专项）
在深色模式下再次执行 axe-core 扫描：通过 `localStorage.theme=dark` 强制 `dark` 类，主题引擎写入深色方案的 `--mc-*` 令牌。结果：30 个测试页在深色下无任何组件级违规，说明组件均依赖 token（非硬编码浅色），跟随主题切换。

锁定：`tests/atoms/a11y.spec.ts` 现按 **light / dark 双模式** 逐页执行（60 个用例），并断言页面确实处于目标模式（防止主题未应用导致“假通过”）。

### 9.6 交互深度测试补全（剩余原子）
在 9.3 基础上，为剩余原子补齐键盘 / 焦点 / 状态联动断言（`tests/atoms/interaction-depth.spec.ts`，42 个用例）：

- Dialog / AlertDialog：打开聚焦容器、Tab 焦点陷阱在操作按钮间循环、Esc / 遮罩关闭、关闭后焦点返还触发元素；
- Checkbox：Space 切换、triState 三态循环（false→true→null，indeterminate 同步）；
- SegmentedButton：单选段方向键移动（radio 语义）、多选 Space 切换勾选；
- Switch：Space 切换、disabled 不可交互；
- Card：Enter / Space 触发可点击卡片、禁用卡片不可交互；
- ToggleButton / ButtonGroup：Enter 切换、溢出项经「更多」菜单键盘可访问；
- NavigationBar / ListItem：Enter / Space 切换选中并同步 aria；
- FloatingToolbar：收起态键盘展开、展开态图标按钮可聚焦；
- BottomSheet：遮罩点击关闭；
- Menu：Esc / 点击外部关闭、互斥单开（打开 B 自动关闭 A）；
- ExposedDropdownMenu：aria-expanded 切换、Esc / 外部点击关闭、键盘 Enter 选择；
- DatePicker / DateRangePicker：键盘 Enter 选择日期、月份导航、范围中间高亮、反向选择自动交换；
- TextField：聚焦后 label 浮动；
- TimePicker：键盘切换输入模式、输入小时自动跳分钟、非法值错误态；
- SearchBar：Esc 收起并失焦、ArrowDown 焦点移入建议列表；
- Snackbar：无操作自动消失；Tooltip：键盘聚焦显示 + aria-describedby。

本轮组件修复：

- SegmentedButton：隐藏 input 由 `hidden` 改为 sr-only（clip 隐藏但保留可聚焦与键盘支持），单选 / 多选均可键盘操作；
- Dialog / AlertDialog：新增 Tab 焦点陷阱与关闭后焦点返还（对齐 SheetSide 与官方 Modal Dialog 行为）。

