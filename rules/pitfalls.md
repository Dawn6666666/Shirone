# 踩坑记录

> 本文档记录 Shirone 开发过程中踩过的坑、根因与正确做法。
> 每踩一个新坑，在此追加一条，避免团队重复踩。
> 配套文档：`rules/project-rules.md`（项目规则）、`docs/m3e-standard.md`（组件标准）。

---

## 1. Svelte 5 与 Astro 集成

### 1.1 cssHash 按文件名会导致 SSR/客户端样式丢失

**现象**：Svelte 组件移动目录后，SSR 渲染的 scope 哈希与客户端水合后的哈希不一致，样式丢失。

**根因**：Svelte 5 默认 `cssHash = hash(filename)`，同一组件在 SSR（源路径）与客户端（构建路径）拿到的 filename 可能不同。

**解法**（已落地）：`astro.config.mjs` 的 svelte 集成里改为基于 CSS 源码哈希，与路径无关：

```js
svelte({
    compilerOptions: {
        cssHash: ({ css, hash }) => `svelte-${hash(css)}`,
    },
}),
```

**教训**：不要回退到默认 filename 哈希。

---

### 1.2 Svelte 组件在 Astro 纯 SSR 下不水合

**现象**：Svelte 组件（如 `onerror`、`onclick`、事件监听）在 Astro 纯 SSR（无 `client:` 指令）下不生效。

**根因**：Astro 纯 SSR 只输出静态 HTML，不注入水合脚本。

**解法**：
- 需要交互就加 `client:load`（立即水合）或 `client:only="svelte"`；
- 纯展示组件（Avatar/Skeleton/AccentBar/Card 等）可接受纯 SSR 渐进增强，无需水合。

**注意**：Card 原子作为 Astro 容器（`<Card>...</Card>`）纯 SSR 渲染正常，children snippet 会被正确填充。

---

### 1.3 Svelte scoped 样式压过 Tailwind 类

**现象**：给 Svelte 原子传入 Tailwind 工具类（如 `hidden`、`flex`、`inline-block`）不生效，布局错乱。

**根因**：Svelte scoped 样式自带 class 哈希，specificity 为 `0,2,0`（如 `.m3-card.svelte-xxx`），而 Tailwind 工具类为 `0,1,0`。scoped 样式优先级更高。

**解法**：覆盖 scoped 样式时用 Tailwind `!`（important）前缀。

**实际案例**：
- 文章页标题 AccentBar：`hidden md:inline-block` → `!hidden md:!inline-block`（否则移动端竖线不隐藏）；
- Navbar 用 Card 原子作容器：`flex` → `!flex`（否则 Card 的 `display: block` 压过 flex，子元素纵向堆叠错乱）；
- Navbar 顶部无圆角：`rounded-t-none` → `!rounded-t-none`。

**教训**：**任何** Svelte 原子作容器时，检查其 scoped 样式里的 `display`/`position`/`overflow` 是否与传入工具类冲突，冲突处一律加 `!`。

---

### 1.4 Astro 作用域 CSS 里的 `.dark &` 不匹配

**现象**：Astro 组件 scoped style 里写 `.dark &` 选择器命中不了。

**根因**：Astro 会给 `.dark` 也加 scope 属性，导致选择器变成 `.dark[data-astro-xxx] &`，实际 DOM 的 `.dark` 没有该属性。

**解法**：用 `:global(.dark) &` 代替 `.dark &`。

**关联**：Svelte 组件（如 Skeleton）在 Astro 组件里要用 `:global()` 选择器才能命中其内部元素。

### 1.5 @iconify/svelte 图标在 Astro 纯 SSR 下渲染空白

**现象**：Svelte 原子（如 IconButton）在**无 `client:*` 指令**的 Astro 页面（TopAppBar / Profile / 文章页）中，`icon` prop 渲染的图标消失，按钮只剩空圆。

**根因**：`@iconify/svelte` 的 `Icon` 组件靠运行时 `loadIcon`（浏览器 API）加载图标数据；SSR 无 hydration 时数据永远为 null → 渲染空。astro-icon 是构建期收集数据、SSR 直出 svg，无此问题。

**解法**：
- 静态 SSR 场景：用 `children` snippet 传 astro-icon 的 `<Icon>`（或任何已渲染 svg），**禁止**用 `icon` prop；
- `icon` prop 只留给 `client:only` / `client:load` 场景；
- 组件 scoped CSS 里 `> :global(svg)` 会强制覆盖 children 图标的尺寸（如强制 24px 覆盖调用方 `text-[1.25rem]`）——尺寸规则只应作用于 `icon` prop 模式的图标容器（`.m3-icon-button__icon`），children 图标尺寸由调用方 class 控制。

**防回归**：`tests/site/icons.spec.ts` 断言真实页面（首页/侧栏/文章页）SSR 输出 svg 可见；静态场景改回 `icon` prop 会立刻变红。

---

### 1.6 Svelte 5 unused-CSS 分析剥离条件类选择器

**现象**：`class:m3-tooltip--top={cond}` + 字面类名选择器 `.m3-tooltip--top { ... }` 的规则不出现在编译产物里，样式静默失效。日历组件也踩过同款（`{@const}` 块里的 class 指令被误判 unused，整段规则被注释掉）。

**根因**：vite-plugin-svelte 的 unused-CSS 分析对部分条件类写法误判为未使用并剥离——字面类名选择器（非 `&` 拼接产生）尤其容易中招。

**解法**（已验证）：
- 模板类名统一用 **template-literal class**：`class={`m3-tooltip m3-tooltip--${variant}${cond ? " m3-tooltip--top" : ""}`}`，不依赖 class 指令；
- CSS 选择器用 stylus `&` 拼接形态（`&--top`、`&--open`），与组件 class 绑定同源；
- 改完遍历 `document.styleSheets` 确认规则真实存在，再测行为。

---

### 1.7 Svelte 模板注释必须用 `<!-- -->`，`{/* */}` 会直接 parse error

**现象**：在 Svelte 模板（markup）里写 `/* 注释 */`（无花括号），注释文本被渲染进 DOM；改成 `{/* 注释 */}` 后反而编译报 `Unexpected token`（svelte 5.56.8，js_parse_error）。

**根因**：本项目 svelte 5.56.8 的模板解析对 `{/* */}` 不识别（实测 `compile('<div>{/* a */}</div>')` 即失败）。

**解法**：模板里的注释一律用 HTML 注释 `<!-- ... -->`（支持多行）；`/* ... */` 风格注释只放在 `<script>` / `<style>` 块内。

---

### 1.8 不能从子组件根（class 透传）做后代选择器：父组件 scope 类不在其上

**现象**：`<Card class="anime-section">` 包内容，样式写 `& .anime-list { display: grid }`（编译为 `.anime-section.svelte-父xx .anime-list.svelte-父xx`）——规则静默失效，`display:grid` 从未生效，列表全宽单列堆叠。单类规则（`&__tools` 等）不受影响，只有**从 Card 根出发的后代选择器**失效（番剧页布局 bug 的根因）。

**根因**：class 透传后落在 Card 模板内的根元素上，该元素带的是 **Card 的 scope class**（`svelte-pl9i7u`），不是父组件（AnimeSection）的 `svelte-1ds0vm7`，父样式选择器永远匹配不上。

**解法**：
- 单类规则（`&__xx`）照常写；
- 需要后代/子级选择器时，把宿主类放到模板内的真实元素上（如内层 `<div class="anime-section">`），或用 `:global(.宿主类)` 声明跨边界（容器查询宿主即用此法：`:global(.anime-section){container-type:inline-size}`）；
- 跨组件边界覆盖子组件内部类，统一 `:global(.子类)`，规则集中在布局拥有方（见 AnimeSection 的 list 模式）。

---

## 2. CSS / Stylus

### 2.1 Stylus 嵌套同名子元素会拼错类名

**现象**：`&__cover` 里再写 `&__cover-mask` 会编译成 `__cover__cover-mask`。

**根因**：Stylus 的 `&` 引用完整父选择器，同名前缀二次拼接。同类问题：`&--top` 里嵌套 `&__tip` 会拼成单类名 `.m3-tooltip--top__tip`（修饰符与元素合并，丢失后代关系）。

**解法**：把 `__cover-mask`、`__cover-arrow` 等放到 `&__cover` 同级，不要嵌套在 `&__cover` 内；修饰符块内的子元素选择器用完整类名 + 空格（`.m3-tooltip--top .m3-tooltip__tip`）或 `& .m3-tooltip__tip`，不要用 `&__tip`。

---

### 2.2 禁止硬编码色值 / 圆角 / 时长

**现象**：硬编码 `text-black/90`、`bg-black/60`、`transition: all 0.3s` 等，深浅色切换不统一。

**解法**：一律引用语义令牌：
- 文字：`text-90` / `text-75` / `text-50` / `text-30` / `text-25`（基于 on-surface 系，见 main.css）；
- 卡片：`var(--card-bg)` / `--float-panel-bg`；
- 圆角：`var(--radius-large)` / `--shape-corner-*`；
- 动效：`--m3e-duration-*` + `--m3e-easing-*`。

**唯一例外**：图片上的覆盖层（banner credit、头像 hover 遮罩、ImageWrapper 暗角、封面触摸箭头）必须用固定黑/白，保证在任意图片上可读。

---

## 3. 组件结构

### 3.1 不要用整个 `<a>` 包卡片

**现象**：卡片外层是 `<a>`，内部又有链接（标题、封面、分类），导致非法嵌套 `<a>` 套 `<a>`。

**解法**：卡片用 `<article>` + 多个独立 `<a>`（PostCard 原子已如此实现）。

---

### 3.2 原子 / 分子禁止跨层与业务副作用

- 原子不得 import 任何组件，只消费 token；
- 分子禁止 import 有机体；有机体间禁止平铺互相引用；
- 跨目录引用一律 `@components/<层>/<文件>`，禁止 `../../` 相对链；
- 数据获取（pagefind、`getSortedPosts`）、持久化（localStorage）属于有机体；原子/分子不做。

详见 `docs/atomic-structure.md`。

---

## 4. 内容插件（rehype/remark）

### 4.1 rehype 插件改动不热更新（构建期缓存）

**现象**：改了 `src/plugins/*.mjs`（如 github 卡片），dev server 页面 HTML 不变。

**根因**：rehype 插件在 markdown 编译期运行，Astro dev 缓存了编译结果，改插件不触发重新编译。

**解法**：重启 dev server（必要时清 `.astro/` 内容缓存）才能让页面重新编译。

**验证技巧**：插件生成的 HTML 常带随机 UUID（如 `GCxxxxxx`），可通过 UUID 是否变化判断是否重新编译。

---

### 4.2 fetch 必须检查 response.ok

**现象**：GitHub 卡片在 API 返回 403（限流）时显示 `NaN` / `Description not set`，而不是错误提示。

**根因**：`fetch(...).then(r => r.json())` 不检查 `response.ok`，403 的错误 JSON 被当成功数据解析，`data.forks` 是 undefined → `Intl.NumberFormat.format(undefined)` → `NaN`。

**解法**：
- 检查 `response.ok`，非 2xx 抛错走 catch；
- 加 AbortController 超时，防请求悬挂；
- catch 里替换为明确的错误文案。

**附加**：未认证的 GitHub API 按 IP 限流（60 次/小时），测试中务必 mock（`page.route`）避免 flaky。

---

## 5. 测试

### 5.1 主题初始化后要等过渡收敛

**现象**：断言 computed 样式拿到动画中间帧的 rgba 混合值。

**根因**：主题引擎写入 `--mc-*` 后组件颜色带 transition。

**解法**：`openTestPage` 里已等待 `--mc-primary` 写入 + 350ms；视觉回归用 `emulateMedia({ reducedMotion: "reduce" })` 折叠动画。

---

### 5.2 axe 扫描要防「假通过」

**现象**：主题未应用、动画未收敛时扫描，可能漏报或误报。

**解法**：
- 断言页面确实处于目标模式（`document.documentElement.classList.contains("dark")`）；
- 等待 `onload-animation` 全部收敛（opacity 1）；
- 真实页面的 GitHub 卡片 API mock 固定响应，避免骨架屏误报。

---

### 5.3 视觉截图命名去掉平台后缀

**现象**：`toHaveScreenshot` 生成 `xxx-win32.png`，跨平台 CI 不一致。

**解法**（已落地）：`playwright.config.ts` 里：

```ts
snapshotPathTemplate: "{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}",
```

**注意**：黄金截图默认不入库（`.gitignore` 忽略 `tests/site/visual.spec.ts-snapshots/`），新环境首次需 `--update-snapshots` 生成。

---

## 6. 环境与命令

### 6.1 PowerShell 中文乱码

**现象**：PowerShell 读中文文件、写中文提交信息乱码。

**解法**：
- 读中文文件前 `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)`；
- 写含中文文件用 `[System.IO.File]::WriteAllText(path, content, [System.Text.UTF8Encoding]::new($false))`；
- 提交信息含中文/引号时，写临时文件 `git commit -F`，避免命令行转义问题（直接 `git commit -m "中文 \"引号\""` 会被 PowerShell 转义搞乱）。

---

### 6.2 一律用 npx.cmd / npm.cmd / pnpm.cmd

系统 PowerShell 禁脚本执行，裸 `npx` / `pnpm` 可能失败，统一用 `.cmd` 后缀。

---

### 6.3 npm 的「Unknown project config」警告可忽略

`npx.cmd xxx` 常带 stderr 警告 `npm warn Unknown project config "manage-package-manager-versions"`，导致 `[exit code: 1]`。这是 npm 无关警告，不是命令失败——判断成败以 stdout 的实质结果为准（如 `0 errors`、`N passed`）。

---

### 6.4 改了 Svelte 组件样式不生效？先清 vite 缓存

**现象**：改了 Svelte 组件（如 Tooltip）后，页面上同一组件内 root 与子元素的 scope hash 不一致（`svelte-a` vs `svelte-b`），或新 CSS 规则不在产物里；重启 dev server 也无效。

**根因**：Astro dev 的 vite 模块缓存（`node_modules/.vite`）残留旧编译产物，新编译的 DOM 与旧编译的 CSS scope 对不上。

**解法**：删 `node_modules/.vite` + `.astro` 后重启 dev server。

**验证技巧**：怀疑样式未生效时，先遍历 `document.styleSheets` 确认规则存在、并比对元素 scope 属性是否一致，再决定清缓存还是查选择器。

---

## 7. 相册系统

### 7.1 受保护相册的布局必须和普通相册保持一致

**现象**：相册解锁后看起来不像普通相册：出现固定网格、空列、横图像竖图一样被限制，或解锁前后的容器背景/内边距冲突。

**根因**：`public/images/albums/<id>/info.json` 的 `layout` 同时传给锁定前的 `ProtectedAlbum` 和解锁后的 `AlbumGallery`。示例相册曾误写为 `"grid"`，而普通相册使用 `"masonry"`，导致解锁后切换成另一套布局。外层容器又曾按锁定态永久去掉背景和内边距，进一步放大了差异。

**解法**：
- 瀑布流相册明确写 `"layout": "masonry"`；只有确实需要等宽网格时才使用 `"grid"`；
- 解锁后的内容必须复用同一个 `AlbumGallery`，不要为受保护相册复制一套画廊 CSS；
- 外层受保护容器只在仍包含 `.password-gate` 时取消背景/内边距，解锁后恢复普通相册容器；
- 回归测试必须在输入正确密码后断言 `album-gallery--masonry`、图片方向和容器样式。

**教训**：保护机制只负责隐藏/解密数据，不应改变相册展示契约。

### 7.2 本地相册文件名会影响顺序、标题、标签和 URL

**现象**：文件名包含 SHA 哈希、混用 `1.webp` / `d1.webp` / 无规律前缀时，页面显示标题不可读，排序难以预测；批量改名后若没有沿用扫描器排序，图片顺序会改变。

**根因**：本地相册扫描器直接使用文件 basename 生成 `AlbumPhoto` 的 `alt`/`title`，并用 `localeCompare(..., { numeric: true })` 排序；basename 中的下划线还会被解析为标签。文件名也是公开图片 URL 的一部分。

**解法**：
- 本地相册图片使用统一的零填充编号，如 `01.webp`、`02.webp`；`cover.webp` 必须保留；
- 批量重名前先统计实际图片数量，不要假设数量；
- 按扫描器的完整排序函数生成映射，先临时改名再改最终名，避免 Windows 文件名冲突；
- 若需要语义标题，使用明确的 basename，并确认下划线后的片段确实应该成为标签；
- 重命名后检查所有代码/测试/文档中的具体文件 URL，并运行相册回归测试。

**教训**：相册文件名不是只影响磁盘可读性的内部细节，它是内容元数据和路由资源的一部分。
