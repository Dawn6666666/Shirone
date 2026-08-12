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
| Button | `Button.astro` | variant: `filled/tonal/outlined/text`；size: `small(32)/medium(40)/large(48)`；`href/target`（渲染 `<a>`）、`full`、`align: center/start/between`、`disabled` | primary / secondary-container / outline / on-surface；`--m3e-state-color` 按变体 |
| SplitButton | `SplitButton.svelte` | M3E 分离式按钮：`variant`（filled/tonal/outlined/elevated）、`size`（xs/s/m/l/xl，M3E 五档 32–136）、`menuOpen`（$bindable，trailing 激活旋转 180°）、`onclick`（leading 主操作）；leading/trailing 插槽；**两段相接内角在 hover/pressed 时变形更圆**（4→12px 等，官方 SplitButton*Tokens） | primary / secondary-container / outline；`--m3e-elevation-*` |
| Chip | `Chip.astro` | variant: `assist`（描边）/`filter`（选中 → secondary-container）/`tonal`（站内药丸）；`selected`、`href` | surface-container-low / outline-variant / secondary-container / btn-regular 系 |
| IconButton | `IconButton.astro` | variant: `standard/tonal/filled`；`label`、`id`、`href/target/rel`（渲染 `<a>`） | on-surface-variant / secondary-container / primary |
| FAB | `FAB.astro` | size: `small(40)/regular(56)`；`label`、`disabled` | primary-container ＋ `--m3e-elevation-3` |
| FABMenu | `FABMenu.svelte` | M3E 悬浮菜单：`expanded`（$bindable）、`icon`/`iconExpanded`（Crossfade 切换，50% progress 处交替）、`label`、`size`（small 56 / medium 80 / large 96，展开收缩到 56 全圆 + close 20px）、`align`（end/start/center）、`containerColor`/`containerContentColor`（默认 primary-container/on-primary-container，展开变 primary）、`menuItemColor`/`menuItemContentColor`（默认 primary-container/on-primary-container，→ `--fab-menu-item-bg/-color`）、`exclusive`（默认 true：单开互斥，展开时经 `menu-bus` 通知其他菜单/FABMenu 收起；false 则不参与）；**动画**：rAF 驱动 `--fab-progress`（0→1，300ms emphasized-decelerate，官方 FastSpatial），容器颜色/尺寸/圆角/图标颜色/图标大小统一按 progress 插值（官方 ToggleFAB lerp）；菜单项 `.m3-fab-menu-item`（56px 全圆、18px 图标 + body-medium）+ stagger 展开；**键盘焦点**：展开时 FAB 上 `Tab`/`ArrowDown` 聚焦首个菜单项（菜单项为原生 button，Tab 在项间自然移动） | primary-container / primary、`--m3e-elevation-3` |
| Slider | `Slider.svelte` | `value`（$bindable）、`min/max/step`、`label` | 彩虹轨道 `--color-selection-bar`、主色圆点 thumb |
| SegmentedButton | `SegmentedButton.svelte` | `options: {value,label}[]`、`value`（$bindable）、`label` | container 底、选中段 secondary-container |
| TextField | `TextField.svelte` | `value`（$bindable）、`placeholder`、`name/id`、`label`、`onfocus`/`oninput`、`leading` 命名插槽 | surface-container-high、聚焦主色下划线 |
| Switch | `Switch.svelte` | `checked`（$bindable）、`disabled`、`label`、`icons`（M3E 图标变体：传 `icons` 时 thumb 恒 24px 显示 ✓/✕；缺省为 thumb 16↔24 动态无图标的经典样式）；原生 checkbox 自绘 track/thumb | 选中 secondary-container + 状态层 |
| Checkbox | `Checkbox.svelte` | `checked`（$bindable，`boolean \| null`）、`disabled`、`label`、`triState`（半选横线）；原生 checkbox 自绘 18px 方框 | primary / on-surface-variant、禁用 0.38 |
| RadioButton | `RadioButton.svelte` | `checked`（$bindable）、`disabled`、`label`、`onchange`；原生 radio 自绘 20px 环 + 12px 内点 | primary / on-surface-variant、禁用 0.38 |
| Badge | `Badge.svelte` | `content`（有内容显示 label-small 文字，否则 6px 圆点）、`disabled`；配 `BadgedBox.svelte` 锚定到右上角 | error / on-error |
| Divider | `Divider.svelte` | `vertical`、`thickness`、`color`；默认 1px | outline-variant |
| Dialog | `Dialog.svelte` | `open`（$bindable）、`title`、默认插槽 + `actions` 命名插槽；scrim/ESC 关闭、打开聚焦 | surface-container-high、`--m3e-elevation-3`、scrim `--mc-scrim` |
| Menu | `Menu.svelte` | `open`（$bindable）、`label`、`variant`（standard/vibrant，vibrant 为 tertiary 基高强调）、`exclusive`（默认 true：单开互斥，打开时经 `menu-bus` 通知其他菜单/FABMenu 关闭；false 则不参与）、class；受控容器，ESC/外部点击关闭（点击其他菜单内不关闭），`:global(.m3-menu-item)` 项样式（44px）＋ `.selected`/`.checked` 状态、`.m3-menu-group` 分组（surface-container-low 背景 + hover 8→16px 形状变形、组间距 2px）、`width: max-content` 宽度稳定；**项结构辅助类**：`.m3-menu-item__trailing`（margin-left:auto 右对齐 trailing 内容）、`.m3-menu-item__content`（flex 列，标签 + 辅助文字垂直排列）、`.m3-menu-item__label`（label-large）、`.m3-menu-item__supporting`（body-small + on-surface-variant，官方 supportingText） | surface-container / tertiary-container、`--m3e-elevation-2` |
| Snackbar | `Snackbar.svelte` | 由事件总线 `showSnackbar(msg, opts?)` 触发；`opts`：`action?: {label, onClick}`（操作按钮，label-large + inverse-primary，点击执行并关闭）、`icon?: string`（24dp，inverse-on-surface）；两行文字自适应（官方单行 48dp / 两行 68dp）、corner-xs(4dp) | inverse-surface / inverse-on-surface / inverse-primary、`--m3e-elevation-3` |
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
