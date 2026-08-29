import assert from "node:assert/strict";
import { test } from "node:test";

import { siteMarkdownProcessor } from "../../../../src/utils/markdown-processor.mjs";

const renderer = await siteMarkdownProcessor.createRenderer({});

async function render(markdown) {
	return renderer.render(markdown);
}

test("renders a YouTube facade without a provider iframe", async () => {
	const result = await render(
		'::youtube{id="5gIf0_xpFPI" title="Example video"}',
	);

	assert.deepEqual(result.metadata.frontmatter.markdownSyntaxes, {
		schema: 1,
		syntaxes: ["youtube"],
	});
	assert.match(result.code, /data-youtube=""/);
	assert.match(result.code, /data-youtube-id="5gIf0_xpFPI"/);
	assert.match(result.code, /aria-label="Example video"/);
	assert.match(
		result.code,
		/href="https:\/\/www\.youtube\.com\/watch\?v=5gIf0_xpFPI"/,
	);
	assert.match(result.code, /rel="noopener noreferrer"/);
	assert.doesNotMatch(
		result.code,
		/<iframe|youtube-nocookie\.com|<script/,
	);
});

test("rejects malformed YouTube fields without producing a facade", async () => {
	for (const markdown of [
		'::youtube{id="https://youtu.be/5gIf0_xpFPI" title="URL input"}',
		'::youtube{id="too-short" title="Invalid ID"}',
		'::youtube{id="5gIf0_xpFPI" title=""}',
	]) {
		const result = await render(markdown);
		assert.doesNotMatch(result.code, /data-youtube/);
		assert.match(result.code, /::youtube/);
		assert.deepEqual(result.metadata.frontmatter.markdownSyntaxes.syntaxes, []);
	}
});

test("accepts only safe poster sources", async () => {
	const localPoster = await render(
		'::youtube{id="5gIf0_xpFPI" title="Local poster" poster="/images/poster.webp"}',
	);
	assert.match(localPoster.code, /src="\/images\/poster\.webp"/);

	const unsafePoster = await render(
		'::youtube{id="5gIf0_xpFPI" title="Unsafe poster" poster="javascript:alert(1)"}',
	);
	assert.doesNotMatch(unsafePoster.code, /data-youtube/);
	assert.match(unsafePoster.code, /::youtube/);
	assert.deepEqual(unsafePoster.metadata.frontmatter.markdownSyntaxes.syntaxes, []);
});
