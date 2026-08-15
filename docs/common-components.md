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
| `Pagination` | 分页控件 |
| `SearchBar` | 搜索输入（分子层，docked 视觉） |
| `WidgetLayout` | 侧栏卡片容器（折叠标题 + 内容） |

原子层通用件（`Button` / `Card` / `IconButton` / `Avatar` / `AccentBar` 等）见 `m3e-standard.md` §4。

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
