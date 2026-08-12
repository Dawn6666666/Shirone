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
原子组件（Button / SplitButton / Chip / IconButton / FAB / FABMenu / Slider / SegmentedButton / TextField / Switch / Checkbox / RadioButton / Dialog / Menu / Badge / Divider / Snackbar）
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

| 原子 | 文件 | 变体 / props | 关键令牌 |
|---|---|---|---|
| Button | `Button.astro` | variant: `filled/tonal/outlined/text`；size: `small(32)/medium(40)/large(48)`；`href/target`（渲染 `<a>`）、`full`、`align: center/start/between`、`disabled`；hover 阴影提升过渡（filled/tonal elevation-1→2，150ms） | primary / secondary-container / outline / on-surface；`--m3e-state-color` 按变体 |
| AppBar | `AppBar.svelte` | 顶部应用栏（官方 AppBar.kt）：`variant`（**small** 64dp 标题 title-large / **center** 同高标题居中 / **medium** 112dp 标题 headline-small 大字靠下 / **large** 152dp 标题 headline-medium 大字靠下）、`title`（string 或 snippet）、`navigationIcon`/`actions` 插槽（通常 IconButton，渲染在起始/末尾端）；布局 small/center 单行 [nav][title][actions]，medium/large 顶部 64px 工具行 + 底部大字标题（官方 expanded 静态版，scrollBehavior 折叠未做）；背景 surface、标题 on-surface、图标 on-surface-variant（官方 token） | surface / on-surface / on-surface-variant |
| Card | `Card.svelte` | 卡片（官方 Card.kt）：`variant`（**filled** 默认 surface-container-highest 无阴影 / **elevated** surface-container-low + 阴影 Level1 hover Level2 / **outlined** surface + outline-variant 1px 边框 hover outline）、形状 corner-medium（12px，官方 ContainerShape）；`onClick` 传入渲染为原生 `<button>`（可点击卡片，`enabled=false` 禁用 opacity 0.38），省略渲染为普通容器 div；可点击卡片 hover/pressed 加 on-surface overlay（4%/8%）+ `focus-visible` primary 焦点环；`color` 覆盖容器背景（`--m3-card-bg`）；内容溢出圆角裁剪 | surface-container-highest / surface-container-low / surface、outline-variant；`--m3e-elevation-1/2` |
| SplitButton | `SplitButton.svelte` | M3E 分离式按钮：`variant`（filled/tonal/outlined/elevated）、`size`（xs/s/m/l/xl，M3E 五档 32–136）、`menuOpen`（$bindable，trailing 激活旋转 180°）、`onclick`（leading 主操作）；leading/trailing 插槽；**两段相接内角在 hover/pressed 时变形更圆**（4→12px 等，官方 SplitButton*Tokens） | primary / secondary-container / outline；`--m3e-elevation-*` |
| ToggleButton | `ToggleButton.svelte` | M3E 切换按钮：`checked`（$bindable）、`variant`（filled：选中 primary/未选中 surface-container；tonal：选中 secondary/未选中 secondary-container；outlined：选中 inverse-surface + 描边；elevated：选中 primary/未选中 surface-container-low + elevation-1）、`disabled`、`label`、`controlled`（受控模式：点击不自动切换，仅触发 `onclick`，供 ButtonGroup 复用）、插槽；原生 button + `aria-pressed`，40dp 高、图标 20dp、label-large；**形状变形**（官方 ToggleButtonShapes）：未选中 pill → 按压 6dp → 选中 12dp | primary / secondary / inverse-surface / surface-container、`--m3e-state-color` |
| ButtonGroup | `ButtonGroup.svelte` | M3E 按钮组（官方 ButtonGroup.kt 数据驱动版）：`items: {value,label,icon?,weight?}[]`、`value`（$bindable 单选）/ `checkedValues`（$bindable 多选，`multiple` 时）、`variant`（standard 12px 间距 / connected 2px 间距）、`disabled`、`onchange`；**weight 布局**：`weight` 项按比例分配剩余空间（flex-basis 0 + flex-grow，官方 NonAdaptiveButtonGroupMeasurePolicy），无 weight 项保持内容宽；connected：**首/尾项外侧全圆 + 内侧 8px、中间项 4dp，按压内角 8→4px，选中项变全圆 pill**（官方 ConnectedButtonGroupTokens）；**溢出指示器**：ResizeObserver 测量父级宽度，宽度不足时溢出项折叠进「更多」按钮下拉菜单（官方 OverflowIndicator + DropdownMenu，菜单项带 checked 状态）；**animateWidth 宽度交换**：按压时 active 项宽度 ×1.15、其余项等比例压缩（官方 expandedRatio 0.15 + expand/compress，weight 项由 flex 分配不受宽度交换影响） | secondary-container / secondary、`--m3e-elevation-1` |
| Chip | `Chip.astro` | variant: `assist`（描边）/`filter`（选中 → secondary-container）/`suggestion`（leading 图标 + label，选中 → secondary-container）/`input`（leading + trailing 删除 slot，选中 → secondary-container）/`tonal`（站内药丸）；`selected`、`href` | surface-container-low / outline-variant / secondary-container / btn-regular 系 |
| IconButton | `IconButton.astro` | variant: `standard/tonal/filled`；`label`、`id`、`href/target/rel`（渲染 `<a>`） | on-surface-variant / secondary-container / primary |
| FAB | `FAB.astro` | size: `small(40)/regular(56)`；`label`、`disabled` | primary-container ＋ `--m3e-elevation-3` |
| FABMenu | `FABMenu.svelte` | M3E 悬浮菜单：`expanded`（$bindable）、`icon`/`iconExpanded`（Crossfade 切换，50% progress 处交替）、`label`、`size`（small 56 / medium 80 / large 96，展开收缩到 56 全圆 + close 20px）、`align`（end/start/center）、`containerColor`/`containerContentColor`（默认 primary-container/on-primary-container，展开变 primary）、`menuItemColor`/`menuItemContentColor`（默认 primary-container/on-primary-container，→ `--fab-menu-item-bg/-color`）、`exclusive`（默认 true：单开互斥，展开时经 `menu-bus` 通知其他菜单/FABMenu 收起；false 则不参与）；**动画**：rAF 驱动 `--fab-progress`（0→1，300ms emphasized-decelerate，官方 FastSpatial），容器颜色/尺寸/圆角/图标颜色/图标大小统一按 progress 插值（官方 ToggleFAB lerp）；菜单项 `.m3-fab-menu-item`（56px 全圆、18px 图标 + body-medium）+ stagger 展开；**键盘焦点**：展开时 FAB 上 `Tab`/`ArrowDown` 聚焦首个菜单项（菜单项为原生 button，Tab 在项间自然移动） | primary-container / primary、`--m3e-elevation-3` |
| Slider | `Slider.svelte` | `value`（$bindable）、`min/max/step`、`label` | 彩虹轨道 `--color-selection-bar`、主色圆点 thumb |
| SegmentedButton | `SegmentedButton.svelte` | `options: {value,label}[]`、`value`（$bindable）、`label`；选中段显示 **check 图标 scaleIn + fade**（官方 TransformOrigin(0,1) 底部左角 + FastSpatial，恒渲染由 `.selected` 驱动） | container 底、选中段 secondary-container |
| TextField | `TextField.svelte` | `value`（$bindable）、`placeholder`、`name/id`、`label`（浮动：focus/有值上浮顶部，M3 标准）、`variant`（**filled** 默认 surface-container-high + 底部下划线 focus 亮起 / **outlined** surface + outline-variant 1px 边框 + focus primary 2px）、`error`（错误提示：下划线/边框变 error + 提示文字）、`onfocus`/`oninput`/`onblur`、`leading` 命名插槽 | surface-container-high / surface / outline-variant、primary、error |
| Switch | `Switch.svelte` | `checked`（$bindable）、`disabled`、`label`、`icons`（M3E 图标变体：传 `icons` 时 thumb 恒 24px 显示 ✓/✕；缺省为 thumb 16↔24 动态无图标的经典样式）；原生 checkbox 自绘 track/thumb | 选中 secondary-container + 状态层 |
| Checkbox | `Checkbox.svelte` | `checked`（$bindable，`boolean \| null`）、`disabled`、`label`、`triState`（半选横线）；原生 checkbox 自绘 18px 方框；**勾选生长动画**（官方 checkDrawFraction 描边生长近似：check/dash scale 0→1 + fade，进入慢 decelerate / 取消快 standard 的非对称） | primary / on-surface-variant、禁用 0.38 |
| RadioButton | `RadioButton.svelte` | `checked`（$bindable）、`disabled`、`label`、`onchange`；原生 radio 自绘 20px 环 + 12px 内点 | primary / on-surface-variant、禁用 0.38 |
| SearchBar | `SearchBar.svelte` | M3E 搜索条（官方 SearchBar.kt docked 移植）：`expanded`（$bindable）、`query`（$bindable）、`placeholder`、`label`、`onsearch(query)`（回车/IME 搜索）；**收起态 56dp pill**（surface-container-high + `--m3e-elevation-3`）+ leading search 图标 + 输入框（body-large）+ trailing（展开 close / 有输入时 clear）；**展开态整体 corner-extra-large(28dp)** + Divider（outline）+ 内容插槽（建议/结果，可滚动，官方 ExpandedDockedSearchBar）；交互：点击/focus 展开并聚焦输入、ESC/外部点击/close 收起、展开时 ArrowDown 移入内容区（官方 moveFocus）；聚焦指示 Secondary（官方 FocusIndicatorColor）；展开/收起动画按官方 DockedEnter/Exit（600ms emphasized-decelerate / 350ms linear + 内容 50ms delay 淡入）；无内容插槽时点击仅聚焦不展开；FullScreen/TopAppBar 变体未实现 | surface-container-high / secondary、`--m3e-elevation-3` |
| ProgressIndicator | `ProgressIndicator.svelte` | 进度指示（官方 ProgressIndicator.kt）：`variant`（linear 4dp 高轨道 / circular 圆环）、`progress`（0-1 定值，`$derived` 实时响应；省略/undefined = indeterminate）、`label`、`showStop`（默认 true）、**circular `size`（直径 px，默认 40，官方 Size token；thick 风格 52+8）/ `strokeWidth`（描边厚度 px，默认 4，官方 ActiveThickness/TrackThickness）参数**——viewBox/圆心/半径/周长随 size 动态生成（r = (size-strokeWidth)/2），弧长与 gap 全部按实际像素自适应，indeterminate 弧长动画用 `--pi-circ`×`--pi-sweep` 比例（size 变化自动适配）、**`indeterminate` 变体**（linear：dual 双线官方默认 / wave 波浪 / single 单线；circular：dual 官方弧伸缩 0.1↔0.87 + 6s 旋转 / single 固定弧 0.25 周长旋转 / **wave 官方带弧度旋转组合**：全局 3 圈匀速（6s 1080°）+ 附加步进旋转（每 1.5s 300ms 强调减速转 90° 停 1.2s，4 步 360°）+ 弧长 0.1↔0.87 伸缩上行 standard 回落 linear）、**`color`/`trackColor`/`strokeCap`/`gapSize` 参数**（官方 color/trackColor/StrokeCap round默认·butt/gapSize 默认4px，active 与 track 间空白）；**indeterminate linear 精确复刻官方 head/tail**：4 值关键帧（Line1 head 0→1000ms、tail 250→1250ms；Line2 head 650→1500ms、tail 900→1750ms，总循环 1750ms），线区间 [tail,head] 生长/消失无跳变 + 左右 2px gap，Web 用 `@property` CSS 变量插值；**determinate linear**：track-fill 从 progress + gap 开始（左侧 active+gap 空白），active 填充 + 末端 stop 圆点（官方 StopSize 4dp，0/100% 隐藏）；linear wave 用 mask 正弦波带（官方 ActiveWave：波长 40dp、波幅 3dp，波浪带留白圆滑、上下超出轨道 2px、mask-position 横向流动）；**determinate circular**：circle + dasharray/dashoffset（负值）实现，可 CSS transition 平滑转动；active 完整弧 0→progress（rotate -90 从 12 点起）、track 从 active 末端 + gap 开始（官方 adjustedGapSize = gapSize + strokeWidth，round cap 弧端补偿）；绘制顺序先 track 后 active（官方 active 顶层，避免 track 圆头盖到颜色弧）；无 stop 圆点（官方同）；track 为剩余弧段（非全圆）；**`wavy` 官方 WavyProgressIndicator 波浪形态**（linear 240×10 容器 + 二次贝塞尔波浪线：determinate 振幅按进度阈值 ≤0.1/≥0.95→0 直线、中间→1 满波，500ms standard/emphasized-accelerate tween，波浪以官方段 [s, head+s] 平移 -s 组合连续填满 [0, head]、轨道从 head+gap 开始（波峰自头部向尾部流动），indeterminate 双线 head/tail + 波浪流动（波浪锚定轨道全局坐标，窗口滑动时相位不变、双线同相连续）；circular 48×48 圆↔9 齿星形 RoundedPolygon.star morph：determinate 起点 3 点、indeterminate 全局 1080° 匀速 + 步进 90°×4 停 1.2s + 弧长 0.1↔0.87，弧端固定、齿形在弧内流动（dashoffset 平移 + 同步反向旋转抵消）；`wavelength`/`waveSpeed`/`amplitude` 参数） | primary / surface-container-highest |
| NavigationBar | `NavigationBar.svelte` | 底部导航（官方 NavigationBar.kt）：`items: {value,label,icon?}[]`、`value`（$bindable）、`label`；64dp 容器 surface-container + `--m3e-elevation-2`，项均分（图标 + label 垂直，原生 button + aria-current）；**选中指示器 pill**（secondary-container 全圆 64×32dp）**scaleX 0→1 生长动画**（官方 animateFloatAsState indicatorWidth）+ 图标 on-secondary-container / label secondary 颜色过渡；inactive on-surface-variant；折叠模式（alwaysShowLabel=false）未实现 | surface-container / secondary-container、`--m3e-elevation-2` |
| NavigationRail | `NavigationRail.svelte` | 侧边导航栏（官方 NavigationRail.kt）：`items: {value,label,icon?}[]`、`value`（$bindable）、`label`、`header` 插槽（顶部 FAB/头像/Logo）；80dp 宽容器（官方 NarrowContainerWidth）背景 surface，垂直排列 items（gap 12px）+ header；Item 72×64（官方 BaselineItemTokens ContainerHeight 64）：icon 24px 顶置 + label（label-medium）gap 4dp，**56×32 指示器 pill（secondary-container 全圆只包图标，选中 scaleX 0→1 生长）**；选中 icon on-secondary-container、label secondary，inactive on-surface-variant | surface / secondary-container、on-surface-variant |
| NavigationDrawer | `NavigationDrawer.svelte` | 模态导航抽屉（官方 ModalNavigationDrawer）：`items: {value,label,icon?}[]`、`open`（$bindable，遮罩点击/Esc 自动置 false）、`value`（$bindable）、`header`/`footer` 插槽；遮罩（scrim 32% 淡入）+ 左侧滑出 **360dp 面板**（官方 ModalNavigationDrawerTokens.ContainerWidth，surface-container-low，右侧 16dp 圆角），translateX(-100%)→0（emphasized-decelerate 400ms）；Item（官方 NavigationDrawerItem）：全宽 56dp 高，selected 整项变 secondary-container 全圆 pill（label-large on-secondary-container），leading 图标 24px，inactive on-surface-variant；始终渲染（CSS class 控制显隐，过渡干净） | surface-container-low / secondary-container、on-surface-variant |
| Tabs | `Tabs.svelte` | 标签页（官方 M3 Tabs，对齐 material-web 实测）：`items: {value,label,icon?}[]`、`value`（$bindable，空值/未命中自动选中第一项）、`variant: primary/secondary`、`scrollable`、`onchange`；scrollable：内容宽 tab（最小 90dp）、起始边缘留白 52dp、溢出横向滚动（隐藏滚动条）、选中 tab 自动滚动居中；primary：48dp（带图标 64dp，图标上置、间距 2dp）Surface 容器 + 底部 1dp divider，激活指示器 3dp primary、圆角 3,3,0,0、宽度 = 标签内容宽（最小 24dp）、切换滑动；激活项 primary；secondary：48dp、指示器 2dp primary 方角、整格全宽、激活项 on-surface；标签字体官方 title-small（14/20/500），支持方向键/Home/End（ARIA tabs） | surface / primary、on-surface、on-surface-variant、outline-variant |
| Badge | `Badge.svelte` | `content`（有内容显示 label-small 文字，否则 6px 圆点）、`disabled`；配 `BadgedBox.svelte` 锚定到右上角；**dot↔数字切换尺寸过渡 + label scale/fade 动画**（恒渲染由 show class 驱动） | error / on-error |
| Divider | `Divider.svelte` | `vertical`、`thickness`、`color`；默认 1px | outline-variant |
| Dialog | `Dialog.svelte` | `open`（$bindable）、`title`、默认插槽 + `actions` 命名插槽；scrim/ESC 关闭、打开聚焦；**进场 scrim fade + 内容 scale 展开，退场对称动画后卸载**（closing 状态 + animationend） | surface-container-high、`--m3e-elevation-3`、scrim `--mc-scrim` |
| AlertDialog | `AlertDialog.svelte` | 警示对话框（官方 AlertDialog.kt）：`open`（$bindable）、`title`（headline-small）、`text`（body-medium on-surface-variant）、`icon` 插槽（primary）、`confirmButton`/`dismissButton` 插槽（右对齐，官方 TextButton）；容器 corner-extra-large 28dp（官方 DialogTokens.ContainerShape）+ surface-container-high + elevation-3、min 280 max 560dp；打开自动聚焦（ESC 可接收）、scrim/ESC 关闭、进场 scrim fade + scale 展开、退场对称动画后卸载（同 Dialog） | surface-container-high、`--m3e-elevation-3`、primary |
| DatePicker | `DatePicker.svelte` | 日期选择器（官方 DatePicker 简化日历版）：`value`（ISO "YYYY-MM-DD" $bindable）、`label`、`locale`（周起始/星期名/月份标题按 Intl）、`onchange`；头部月份导航（‹ 年 月 ›）+ 周标题 + 7×6 日期网格；今天 inset primary 1px、选中 primary-container 全圆、hover state layer；简化：未做输入模式/年视图 | surface-container-high / primary-container |
| DateRangePicker | `DateRangePicker.svelte` | 日期范围选择器（官方 DateRangePicker 简化版）：`start`/`end`（$bindable ISO）、`locale`、`onchange({start,end})`；选择逻辑第一次点 = start、第二次 = end（end < start 自动交换）；范围中间日期 secondary-container 40% 淡背景（圆角仅两端）、两端 primary-container 全圆；复用 DatePicker 网格结构 | surface-container-high / primary-container、secondary-container |
| TimePicker | `TimePicker.svelte` | 时间选择器（官方 TimePicker 表盘 + 输入双模式）：`value`（24h "HH:MM" $bindable）、`format`（h24 双环：外 1-12 + 内 13-24，0 显示为 24 / h12 单环 + 上午/下午）、`label`、`onchange`；表盘 256dp、选中手柄 48dp primary-container 全圆（非整 5 分钟时手柄内显示数字）、轨道 2dp primary + 中心点 8dp、点击按角度吸附最近的小时/分钟（官方 ClockFace）；**输入模式（官方 TimeInput）**：表头右上角键盘/时钟图标切换，HH:MM 两个填充输入框（56×64dp），自动过滤非数字、小时满两位自动跳分钟、实时校验（h24 0-23 / h12 1-12、分钟 0-59），非法显示 error 下划线、合法即提交；头部分段点击可切回对应阶段；表头左对齐时间、h12 右侧 AM/PM（tertiary-container） | surface-container-high / primary-container、tertiary-container、error |
| Menu | `Menu.svelte` | `open`（$bindable）、`label`、`variant`（standard/vibrant，vibrant 为 tertiary 基高强调）、`exclusive`（默认 true：单开互斥，打开时经 `menu-bus` 通知其他菜单/FABMenu 关闭；false 则不参与）、class；受控容器，ESC/外部点击关闭（点击其他菜单内不关闭），**:global(.m3-menu-item)** 项样式（44px）＋ `.selected`/`.checked` 状态、`.m3-menu-group` 分组（surface-container-low 背景 + hover 8→16px 形状变形、组间距 2px）、`width: max-content` 宽度稳定；**动画**：展开/收起 **scale 1↔0.8 + fade**（官方 DropdownMenu transition：FastSpatial/FastEffects spring 近似，展开 250ms decelerate / 收起 150ms accelerate，`--menu-origin` 锚点缩放默认 top center）、菜单项 hover 背景 150ms 过渡、勾选图标 `.m3-menu-item__check`（checked 时 scaleX 0→1 + fade，官方 expandHorizontally）；**项结构辅助类**：`.m3-menu-item__trailing`（margin-left:auto 右对齐 trailing 内容）、`.m3-menu-item__content`（flex 列，标签 + 辅助文字垂直排列）、`.m3-menu-item__label`（label-large）、`.m3-menu-item__supporting`（body-small + on-surface-variant，官方 supportingText） | surface-container / tertiary-container、`--m3e-elevation-2` |
| ListItem | `ListItem.svelte` | 列表项（官方 ListItem.kt）：`headline`（label-large）、`overLine`（label-small）、`supporting`（body-medium，最多 2 行省略）、`leading`/`trailing` 插槽（40dp/24dp 区域）；行高按内容自适应：单行 56dp / 两行 72 / 三行 88（官方 ContainerHeight/TwoLine/ThreeLine）；`selected` 选中态 secondary-container、`onClick` 传入渲染为可点击 button（hover on-surface 8% + aria-pressed） | secondary-container / on-surface-variant |
| LoadingIndicator | `LoadingIndicator.svelte` | 加载指示器（官方 LoadingIndicator.kt，M3E 特有形状 morph 加载器）：形状数据与官方同源（androidx.graphics.shapes 的 RoundedPolygon + Morph feature-matching，cubic 对线性插值，见 `loadingShapes.ts`）；indeterminate 在 **7 形状循环 morph**（SoftBurst/Cookie9/Pentagon/Pill/Sunny/Cookie4/Oval，官方 IndeterminateIndicatorPolygons），每段 spring（damping 0.6/stiffness 200/visibilityThreshold 0.1）+ 650ms 间隔（MorphIntervalMillis）+ 逐段累计旋转 90° + **整体线性旋转 4666ms/圈**（GlobalRotationDurationMillis）；determinate 官方 DeterminateIndicatorPolygons（Circle 旋转 18° → SoftBurst），progress 0→1 线性 morph + 逆时针 `-progress*180°`；指示器缩放 = calculateScaleFactor × ActiveIndicatorScale（38/48）居中于 48×48 容器；`color`/`size`（默认 48）/`contained`（官方 ContainedLoadingIndicator：primary-container 圆形容器 + on-primary-container 指示器）/`containerColor` | primary / on-primary-container + primary-container |
| DateInput | `DateInput.svelte` | 日期文本输入（官方 DateInputTextField 独立版）：`value`（ISO "YYYY-MM-DD" $bindable，非法时保持旧值）、`label`（浮动标签）、`placeholder`、`yearRange`、`leading` 插槽（默认日历图标）；输入自动按 YYYY/MM/DD 分段格式化（官方 DateInputFormat）；blur/Enter 校验（官方 DateInputValidator）：格式 / 年份范围 / 月份 / 真实日期（new Date 回验），错误显示 error 色下划线 + 提示；结构对齐 TextField（surface-container-high 填充 + 下划线 + focus primary） | surface-container-high / primary、error |
| FloatingToolbar | `FloatingToolbar.svelte` | 浮动工具栏（官方 FloatingToolbar.kt）：`expanded`（$bindable）展开 = CornerFull pill 完整条（`leading`/`children`/`trailing` 插槽 + 阴影 Level2），收起 = 折叠成 40px 小圆按钮（只显示 leading，阴影 Level1）；容器 primary-container / on-primary-container（`containerColor` 覆盖） | primary-container / on-primary-container、`--m3e-elevation-1/2` |
| BottomSheet | `BottomSheet.svelte` | 模态底部弹层（官方 ModalBottomSheet）：`open`（$bindable，遮罩点击/Esc 置 false）、`title`（headline-small）、`children`；遮罩 32% 淡入 + 面板从底部滑入（translateY 100%→0，emphasized-decelerate 400ms），顶部 16dp 圆角（ShapeCornerTopLarge）+ 拖拽把手（32×4 圆条）+ surface-container-low，宽度 max 656dp 居中（官方 ModalContainerWidth）；始终渲染（CSS visibility 控制）；未做拖拽手势/anchors | surface-container-low、on-surface-variant |
| Snackbar | `Snackbar.svelte` | 由事件总线 `showSnackbar(msg, opts?)` 触发；`opts`：`action?: {label, onClick}`（操作按钮，label-large + inverse-primary，点击执行并关闭）、`icon?: string`（24dp，inverse-on-surface）；两行文字自适应（官方单行 48dp / 两行 68dp）、corner-xs(4dp)；**进出场 fade + scale 0.8↔1**（官方 SnackbarHost，FastEffects/FastSpatial） | inverse-surface / inverse-on-surface / inverse-primary、`--m3e-elevation-3` |
| Tooltip | `Tooltip.svelte` | 包裹式（锚点插槽 + 提示内容）；`variant`：`plain`（默认，inverse-surface + corner-xs + body-small）/ `rich`（surface-container + corner-medium + `--m3e-elevation-2`，`title` title-small + `supporting` body-medium + 可选 `action` {label,onClick} primary）；hover 延迟 400ms 显示、focus 立即（键盘可达，注入 `aria-describedby`） | inverse-surface / surface-container / on-surface-variant、`--m3e-elevation-2` |

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
| `src/components/atoms/*` | 17 个原子组件 |
| `src/components/organisms/DisplaySettings.svelte` | 色相/风格/规范控制面板 |
