import { visit } from "unist-util-visit";

/**
 * Collect content capabilities during the shared Markdown compilation pass.
 * The values are consumed by route templates to keep optional assets page-scoped.
 */
export function remarkFeatureProbes() {
	return (tree, { data }) => {
		const features = {
			hasMath: false,
			hasMermaid: false,
			hasCodeInteractions: false,
		};

		visit(tree, (node) => {
			if (node.type === "math" || node.type === "inlineMath") {
				features.hasMath = true;
			}
			if (
				node.type === "mermaid" ||
				(node.type === "code" && node.lang?.toLowerCase() === "mermaid")
			) {
				features.hasMermaid = true;
			}
			if (
				node.type === "code" &&
				(node.meta?.includes("collapse") || node.meta?.includes("tree"))
			) {
				features.hasCodeInteractions = true;
			}
		});

		data.astro.frontmatter.hasMath = features.hasMath;
		data.astro.frontmatter.hasMermaid = features.hasMermaid;
		data.astro.frontmatter.hasCodeInteractions = features.hasCodeInteractions;
	};
}
