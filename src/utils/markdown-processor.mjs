import { unified } from "@astrojs/markdown-remark";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeComponents from "rehype-components"; /* Render the custom directive content */
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive"; /* Handle directives */
import remarkGithubAdmonitionsToDirectives from "remark-github-admonitions-to-directives";
import remarkMath from "remark-math";
import remarkSectionize from "remark-sectionize";
import { AdmonitionComponent } from "../plugins/rehype-component-admonition.mjs";
import { GithubCardComponent } from "../plugins/rehype-component-github-card.mjs";
import { parseDirectiveNode } from "../plugins/remark-directive-rehype.js";
import { remarkExcerpt } from "../plugins/remark-excerpt.js";
import { remarkMermaid } from "../plugins/remark-mermaid.mjs";
import { remarkReadingTime } from "../plugins/remark-reading-time.mjs";

/**
 * 站点统一 Remark 插件链（单一事实来源）
 */
export const siteRemarkPlugins = [
	remarkMath,
	remarkMermaid,
	remarkReadingTime,
	remarkExcerpt,
	remarkGithubAdmonitionsToDirectives,
	remarkDirective,
	remarkSectionize,
	parseDirectiveNode,
];

/**
 * 站点统一 Rehype 插件链（单一事实来源）
 */
export const siteRehypePlugins = [
	rehypeKatex,
	rehypeSlug,
	[
		rehypeComponents,
		{
			components: {
				github: GithubCardComponent,
				note: (x, y) => AdmonitionComponent(x, y, "note"),
				tip: (x, y) => AdmonitionComponent(x, y, "tip"),
				important: (x, y) => AdmonitionComponent(x, y, "important"),
				caution: (x, y) => AdmonitionComponent(x, y, "caution"),
				warning: (x, y) => AdmonitionComponent(x, y, "warning"),
			},
		},
	],
	[
		rehypeAutolinkHeadings,
		{
			behavior: "append",
			properties: {
				className: ["anchor"],
			},
			content: {
				type: "element",
				tagName: "span",
				properties: {
					className: ["anchor-icon"],
					"data-pagefind-ignore": true,
				},
				children: [
					{
						type: "text",
						value: "#",
					},
				],
			},
		},
	],
];

/**
 * 站点统一 markdown 处理器（单一事实来源）。
 * astro.config.mjs 的 `markdown.processor` 与构建期离线渲染
 * （如动态页正文 → HTML 字符串）共用同一条 remark/rehype 插件链，
 * 避免两处配置漂移。
 */
export const siteMarkdownProcessor = unified({
	remarkPlugins: siteRemarkPlugins,
	rehypePlugins: siteRehypePlugins,
});
