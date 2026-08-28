import assert from "node:assert/strict";
import { test } from "node:test";

import { siteMarkdownProcessor } from "../../../src/utils/markdown-processor.mjs";

const renderer = await siteMarkdownProcessor.createRenderer({});

test("records math and Mermaid capabilities in render frontmatter", async () => {
	const math = await renderer.render("Euler: $e^{i\\pi}+1=0$");
	assert.equal(math.metadata.frontmatter.hasMath, true);
	assert.equal(math.metadata.frontmatter.hasMermaid, false);
	assert.deepEqual(math.metadata.frontmatter.markdownFeatures, {
		math: true,
		mermaid: false,
		codeInteractions: false,
		trees: false,
		collapsePanels: false,
		contentAnnotations: false,
		marker: false,
		steps: false,
		admonitions: false,
		abbreviations: false,
		imageGrids: false,
		imagePresentations: false,
		optionGroups: false,
	});

	const mermaid = await renderer.render(
		"```mermaid\nflowchart LR\n  A --> B\n```",
	);
	assert.equal(mermaid.metadata.frontmatter.hasMath, false);
	assert.equal(mermaid.metadata.frontmatter.hasMermaid, true);
	assert.deepEqual(mermaid.metadata.frontmatter.markdownFeatures, {
		math: false,
		mermaid: true,
		codeInteractions: false,
		trees: false,
		collapsePanels: false,
		contentAnnotations: false,
		marker: false,
		steps: false,
		admonitions: false,
		abbreviations: false,
		imageGrids: false,
		imagePresentations: false,
		optionGroups: false,
	});
});

test("records file-tree and code-tree capabilities after syntax transforms", async () => {
	const fileTree = await renderer.render(
		[':::file-tree{title="Source"}', "- src/", "  - index.ts", ":::"].join(
			"\n",
		),
	);
	assert.equal(fileTree.metadata.frontmatter.markdownFeatures.trees, true);

	const codeTree = await renderer.render(
		[
			':::code-tree{title="Source"}',
			'```ts title="src/index.ts"',
			"export {};",
			"```",
			":::",
		].join("\n"),
	);
	assert.equal(codeTree.metadata.frontmatter.markdownFeatures.trees, true);
});

test("records collapse panels after syntax normalization", async () => {
	const collapsePanels = await renderer.render(
		[
			"::: collapse accordion",
			"- First panel",
			"",
			"  Panel content.",
			":::",
		].join("\n"),
	);
	assert.equal(
		collapsePanels.metadata.frontmatter.markdownFeatures.collapsePanels,
		true,
	);
});

test("records marker highlights after syntax normalization", async () => {
	const marker = await renderer.render("Use ==semantic emphasis==.");
	assert.equal(marker.metadata.frontmatter.markdownFeatures.marker, true);
});

test("records steps containers before directive normalization", async () => {
	const steps = await renderer.render(
		[
			':::steps{title="Deploy"}',
			"1. Build the site.",
			"2. Publish the result.",
			":::",
		].join("\n"),
	);
	assert.equal(steps.metadata.frontmatter.markdownFeatures.steps, true);
});

test("records normalized admonitions including GitHub Alerts", async () => {
	const admonitions = await renderer.render(
		"> [!TIP]\n> Rendered through the shared admonition component.",
	);
	assert.equal(
		admonitions.metadata.frontmatter.markdownFeatures.admonitions,
		true,
	);
});

test("records visible abbreviations after reference replacement", async () => {
	const abbreviations = await renderer.render(
		"*[SSR]: Server-Side Rendering\n\nSSR stays readable without JavaScript.",
	);
	assert.equal(
		abbreviations.metadata.frontmatter.markdownFeatures.abbreviations,
		true,
	);
});

test("records option group containers after syntax normalization", async () => {
	const optionGroups = await renderer.render(
		[
			"::: tabs",
			"",
			"@tab First",
			"",
			"First body.",
			"",
			"@tab Second",
			"",
			"Second body.",
			"",
			":::",
		].join("\n"),
	);
	assert.equal(
		optionGroups.metadata.frontmatter.markdownFeatures.optionGroups,
		true,
	);
});

test("records image grid containers before directive normalization", async () => {
	const imageGrid = await renderer.render(
		":::grid\n\n![Example](/images/example.webp)\n\n:::",
	);
	assert.equal(
		imageGrid.metadata.frontmatter.markdownFeatures.imageGrids,
		true,
	);
});

test("records standalone image presentations without matching inline images", async () => {
	const presentation = await renderer.render(
		'![Example w-50%](/images/example.webp "Caption")',
	);
	assert.equal(
		presentation.metadata.frontmatter.markdownFeatures.imagePresentations,
		true,
	);

	const inlineImage = await renderer.render(
		'Inline ![Example w-50%](/images/example.webp "Caption") text.',
	);
	assert.equal(
		inlineImage.metadata.frontmatter.markdownFeatures.imagePresentations,
		false,
	);
});

test("records defined content annotations after reference resolution", async () => {
	const annotations = await renderer.render(
		"A note [+example].\n\n[+example]: Annotation content.",
	);
	assert.equal(
		annotations.metadata.frontmatter.markdownFeatures.contentAnnotations,
		true,
	);
});

test("does not mark ordinary prose with optional capabilities", async () => {
	const result = await renderer.render("A plain article with no extensions.");
	assert.deepEqual(
		{
			markdownFeatures: result.metadata.frontmatter.markdownFeatures,
			hasMath: result.metadata.frontmatter.hasMath,
			hasMermaid: result.metadata.frontmatter.hasMermaid,
			hasCodeInteractions: result.metadata.frontmatter.hasCodeInteractions,
		},
		{
			markdownFeatures: {
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
				imageGrids: false,
				imagePresentations: false,
				optionGroups: false,
			},
			hasMath: false,
			hasMermaid: false,
			hasCodeInteractions: false,
		},
	);
});
