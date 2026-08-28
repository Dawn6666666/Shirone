import assert from "node:assert/strict";
import { test } from "node:test";

import { siteMarkdownProcessor } from "../../../src/utils/markdown-processor.mjs";

const renderer = await siteMarkdownProcessor.createRenderer({});

test("records math and Mermaid capabilities in render frontmatter", async () => {
	const math = await renderer.render("Euler: $e^{i\\pi}+1=0$");
	assert.equal(math.metadata.frontmatter.hasMath, true);
	assert.equal(math.metadata.frontmatter.hasMermaid, false);

	const mermaid = await renderer.render(
		"```mermaid\nflowchart LR\n  A --> B\n```",
	);
	assert.equal(mermaid.metadata.frontmatter.hasMath, false);
	assert.equal(mermaid.metadata.frontmatter.hasMermaid, true);
});

test("does not mark ordinary prose with optional capabilities", async () => {
	const result = await renderer.render("A plain article with no extensions.");
	assert.deepEqual(
		{
			hasMath: result.metadata.frontmatter.hasMath,
			hasMermaid: result.metadata.frontmatter.hasMermaid,
			hasCodeInteractions: result.metadata.frontmatter.hasCodeInteractions,
		},
		{ hasMath: false, hasMermaid: false, hasCodeInteractions: false },
	);
});
