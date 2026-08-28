import assert from "node:assert/strict";
import { test } from "node:test";

import { getSourceMarkdownFeatures } from "../../src/utils/markdown-source-features.mjs";

test("detects Expressive Code from normalized fenced-code syntax", () => {
	assert.equal(
		getSourceMarkdownFeatures("A plain article with `inline code`.")
			.expressiveCode,
		false,
	);
	assert.equal(
		getSourceMarkdownFeatures("```ts\nexport {};\n```").expressiveCode,
		true,
	);
	assert.equal(
		getSourceMarkdownFeatures("~~~sh\necho hello\n~~~").expressiveCode,
		true,
	);
});

test("does not classify code handled by other Markdown syntaxes as Expressive Code", () => {
	assert.equal(
		getSourceMarkdownFeatures("```mermaid\nflowchart LR\n  A --> B\n```")
			.expressiveCode,
		false,
	);
	assert.equal(
		getSourceMarkdownFeatures("```file-tree\nsrc/\n```").expressiveCode,
		false,
	);
	assert.equal(
		getSourceMarkdownFeatures(
			[
				':::code-tree{title="Source"}',
				"```ts",
				"export {};",
				"```",
				":::",
			].join("\n"),
		).expressiveCode,
		false,
	);
});
