import remarkDirective from "remark-directive";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { remarkCodeTree } from "../plugins/markdown/code/remark-code-tree.mjs";
import { remarkFileTree } from "../plugins/markdown/code/remark-file-tree.mjs";
import { remarkMermaid } from "../plugins/remark-mermaid.mjs";

const sourceFeatureProcessor = unified()
	.use(remarkParse)
	.use(remarkDirective)
	.use(remarkFileTree)
	.use(remarkCodeTree)
	.use(remarkMermaid);

/**
 * Detects page-scoped Markdown features from the normalized source AST.
 *
 * This runs only during SSR/builds. It complements render metadata for
 * integrations that consume their input before Astro exposes frontmatter.
 */
export function getSourceMarkdownFeatures(source = "") {
	const tree = sourceFeatureProcessor.runSync(
		sourceFeatureProcessor.parse(source),
	);
	let expressiveCode = false;

	visit(tree, "code", (_node, _index, parent) => {
		if (parent?.type === "containerDirective" && parent.name === "code-tree") {
			return;
		}

		expressiveCode = true;
	});

	return { expressiveCode };
}
