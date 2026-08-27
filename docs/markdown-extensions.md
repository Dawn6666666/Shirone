# Markdown 扩展开发规范

> 本文档定义 Shirone 的 remark/rehype 扩展、生成式 Markdown 小组件、全局内容样式、缓存刷新和验证契约。

已落地的作者语法以 `src/plugins/markdown/manifest.json` 为机器可读单一索引；字段含义、查询和维护流程见 [`markdown-syntax-manifest.md`](markdown-syntax-manifest.md)。未落地的研究能力不得提前登记。

## 1. 处理链与所有权

`src/utils/markdown-processor.mjs` 是站点 Markdown 插件链的单一事实来源。Astro 页面渲染与构建期离线渲染必须共用 `siteRemarkPlugins` 和 `siteRehypePlugins`，不得在第二处复制插件配置。

职责边界如下：

| 层 | 位置 | 职责 |
| --- | --- | --- |
| 语法解析 | `src/plugins/markdown/code/`、remark 插件 | 把作者输入转换为稳定 AST，不拥有视觉样式 |
| DOM 生成 | `src/plugins/markdown/containers/`、rehype 插件 | 输出语义 HTML、无障碍属性和稳定组件 class |
| 可复用核心 | `src/plugins/markdown/core/` | 共享纯函数、图标和 SSR 原语，不查询浏览器状态 |
| 组件样式 | `src/styles/markdown/` | 生成式小组件的 token 驱动样式 |
| 样式入口 | `src/styles/markdown.css`、`src/components/content/Markdown.astro` | 确保全站文章页加载对应全局样式 |

扩展默认在构建期完成。能由原生 HTML 表达的交互优先使用 `<details>/<summary>` 等 SSR 可用原语，不为静态内容增加 hydration、客户端脚本或网络请求。

## 2. Typography 边界

`Markdown.astro` 使用 `.prose` 和 `@tailwindcss/typography` 管理普通文章内容。生成式组件必须先判断自己属于哪一类：

- **正文型扩展**：希望继承文章段落、标题、列表或链接排版，保留在 `.prose` 管理下。
- **完整小组件**：拥有自己的列表、网格、工具栏、树或卡片布局，根节点必须添加 `not-prose`，由组件 CSS 完整拥有内部几何。

完整小组件仍需显式重置会影响几何的原生样式：

```css
.custom-md .m3-example__root,
.custom-md .m3-example__children {
	margin: 0;
	padding: 0;
	list-style: none;
}
```

原因不是普通 specificity 不足。`src/styles/main.css` 将 `markdown.css` 导入 `layer(components)`，而 Typography 规则可能位于不同层；cascade layer 顺序优先于选择器权重。遇到冲突时：

1. 先确定 Typography 是否应该拥有该节点；
2. 完整小组件使用 `not-prose` 建立边界；
3. 修正样式入口、scope 或源码顺序；
4. 不使用 `!important` 或堆叠选择器掩盖错误所有权。

`!important` 的例外边界仍以 `rules/css-important.md` 为准。

## 3. 样式入口

- `src/styles/main.css` 全局导入 `src/styles/markdown.css`；后者再导入 `src/styles/markdown/*.css`。
- `src/styles/markdown-typography.css` 是受限的 Typography 级联桥接入口：仅允许包含 `.markdown-content` 范围内、需要与 `@tailwindcss/typography` 同处 `utilities` 层的正文排版覆盖。不得把普通 Markdown 组件样式迁入该文件或借此建立新的通用优先级层。
- `src/components/content/Markdown.astro` 以全局 Stylus 样式导入 `src/styles/markdown-extend.styl`，供历史 Markdown 扩展使用。
- 新的独立小组件优先放入 `src/styles/markdown/`，由 `markdown.css` 显式导入；不要在文章、页面或插件生成的 HTML 中内联重复样式。
- 颜色、圆角、字体、间距和动效使用项目 token。生成式组件 class 必须稳定，不能依赖随机 ID 作为样式契约。

## 4. 缓存与刷新

修改 remark/rehype 插件后，Astro dev 可能继续提供旧的 Markdown 编译结果。典型信号是：新 CSS 已出现，但插件新增的 class 或 DOM 结构不存在。

Windows 下的最小刷新流程：

```powershell
# 先在运行 dev server 的终端按 Ctrl+C
Remove-Item -LiteralPath ".astro\data-store.json" -Force
pnpm.cmd astro dev --port 4321
```

只在出现 Svelte scope hash、Vite 模块或 Stylus 产物不一致时，才进一步清理 `node_modules/.vite` 与整个 `.astro`。不要先清浏览器缓存，也不要通过长期保留无意义的文章正文改动来驱动重编译。

## 5. CSS 不生效的诊断顺序

| 观察 | 判断 | 下一步 |
| --- | --- | --- |
| 预期 class/DOM 不存在 | Markdown 编译结果陈旧或插件未注册 | 查 `markdown-processor.mjs`，再清 `.astro/data-store.json` 并重启 |
| DOM 正确，但组件规则不在样式表 | 样式入口遗漏或构建时被移除 | 查 `main.css`、`markdown.css`、`Markdown.astro` 与产物 CSS |
| 规则存在且命中，但 computed style 被改写 | Typography、cascade layer 或其他所有者冲突 | 判断是否应加 `not-prose`，检查 layer，不先加 `!important` |
| Svelte DOM 与 scoped class hash 不一致 | Vite/Svelte 编译缓存陈旧 | 清 `node_modules/.vite` 与 `.astro`，重启 |
| 直接加载正常，Swup 导航后异常 | 生命周期或页面替换边界错误 | 同时验证 direct load 与 client navigation |

检查顺序必须是 **DOM -> 样式表 -> computed style -> 缓存/生命周期**。只看源码声明无法证明浏览器最终采用了该值。

## 6. 测试契约

每个新的 Markdown 小组件至少覆盖：

1. Node 单元测试：输入语法、SSR DOM、稳定 class、无障碍属性、空输入和错误回退；完整小组件断言根节点含 `not-prose`。
2. Playwright：真实文章直接加载，断言关键 computed style、布局边界、键盘操作和无横向溢出。
3. 响应式：至少验证一个窄屏尺寸；移动端隐藏或换行策略必须有明确断言。
4. 无障碍：运行最小组件用例及 `tests/site/a11y.spec.ts` 的相关页面。
5. 构建验证：运行 `npx.cmd astro check` 与 `pnpm.cmd build`，不能只依赖 dev server 热更新结果。

File Tree 与 Code Tree 的对应覆盖位于：

- `tests/plugins/markdown/containers/file-tree.test.mjs`
- `tests/plugins/markdown/containers/code-tree.test.mjs`
- `tests/plugins/markdown/core/disclosure.test.mjs`
- `tests/site/file-tree.spec.ts`
- `tests/site/code-tree.spec.ts`

## 7. 提交前检查

- [ ] 插件已注册到统一 Markdown 处理链；
- [ ] 作者语法已登记到 `src/plugins/markdown/manifest.json`，且路径、状态与运行时成本真实；
- [ ] SSR 输出无不必要脚本、hydration 或外部请求；
- [ ] 完整小组件根节点包含 `not-prose`；
- [ ] 列表、网格和工具栏的几何由组件样式明确拥有；
- [ ] 没有使用 `!important` 对抗 Typography 或 cascade layer；
- [ ] 清理内容缓存后验证过真实输出；
- [ ] 单元测试、Playwright、a11y、Astro Check 与构建通过。
