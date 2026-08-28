import { visit } from "unist-util-visit";

/**
 * Collect content capabilities during the shared Markdown compilation pass.
 * The values are consumed by route templates to keep optional assets page-scoped.
 */
export function remarkFeatureProbes() {
	return (tree, { data }) => {
		const markdownFeatures = {
			math: false,
			mermaid: false,
			codeInteractions: false,
			trees: false,
			collapsePanels: false,
			contentAnnotations: false,
			marker: false,
			steps: false,
			admonitions: false,
			abbreviations: false,
			optionGroups: false,
		};

		visit(tree, (node) => {
			if (node.type === "math" || node.type === "inlineMath") {
				markdownFeatures.math = true;
			}
			if (
				node.type === "mermaid" ||
				(node.type === "code" && node.lang?.toLowerCase() === "mermaid")
			) {
				markdownFeatures.mermaid = true;
			}
			if (
				node.type === "code" &&
				(node.meta?.includes("collapse") || node.meta?.includes("tree"))
			) {
				markdownFeatures.codeInteractions = true;
			}
			if (
				node.type === "fileTree" ||
				(node.type === "containerDirective" && node.name === "file-tree") ||
				(node.type === "containerDirective" &&
					node.name === "code-tree" &&
					node.children?.some((child) => child.type === "code"))
			) {
				markdownFeatures.trees = true;
			}
			if (node.type === "containerDirective" && node.name === "collapse") {
				markdownFeatures.collapsePanels = true;
			}
			if (node.type === "textDirective" && node.name === "m3-mark") {
				markdownFeatures.marker = true;
			}
			if (node.type === "contentAnnotationReference") {
				markdownFeatures.contentAnnotations = true;
			}
			if (node.type === "containerDirective" && node.name === "steps") {
				markdownFeatures.steps = true;
			}
			if (
				node.type === "containerDirective" &&
				[
					"note",
					"info",
					"tip",
					"important",
					"warning",
					"caution",
					"admonition-details",
				].includes(node.name)
			) {
				markdownFeatures.admonitions = true;
			}
			if (node.type === "abbreviation") {
				markdownFeatures.abbreviations = true;
			}
			if (node.type === "containerDirective" && node.name === "tabs") {
				markdownFeatures.optionGroups = true;
			}
		});

		data.astro.frontmatter.markdownFeatures = markdownFeatures;
		data.astro.frontmatter.hasMath = markdownFeatures.math;
		data.astro.frontmatter.hasMermaid = markdownFeatures.mermaid;
		data.astro.frontmatter.hasCodeInteractions =
			markdownFeatures.codeInteractions;
	};
}
