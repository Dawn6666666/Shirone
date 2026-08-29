import assert from "node:assert/strict";
import { test } from "node:test";

import { siteMarkdownProcessor } from "../../../../src/utils/markdown-processor.mjs";

const renderer = await siteMarkdownProcessor.createRenderer({});

async function render(markdown) {
	return renderer.render(markdown);
}

test("renders an ArtPlayer directive as a native SSR video", async () => {
	const result = await render(
		'::artplayer{src="https://media.example.com/video.mp4" title="Example video"}',
	);

	assert.deepEqual(result.metadata.frontmatter.markdownSyntaxes, {
		schema: 1,
		syntaxes: ["artplayer"],
	});
	assert.match(result.code, /data-artplayer=""/);
	assert.match(result.code, /not-prose/);
	assert.match(result.code, /<video/);
	assert.match(result.code, /controls/);
	assert.match(result.code, /preload="none"/);
	assert.match(result.code, /playsinline/);
	assert.match(result.code, /aria-label="Example video"/);
	assert.match(result.code, /href="https:\/\/media\.example\.com\/video\.mp4"/);
	assert.doesNotMatch(result.code, /<iframe|<script/);
});

test("rejects malformed ArtPlayer fields without rendering a player", async () => {
	for (const markdown of [
		'::artplayer{title="Missing source"}',
		'::artplayer{src="javascript:alert(1)" title="Unsafe source"}',
		'::artplayer{src="/videos/example.mp4" title=""}',
		'::artplayer{src="/videos/example.mp4" title="Unsafe poster" poster="javascript:alert(1)"}',
	]) {
		const result = await render(markdown);
		assert.doesNotMatch(result.code, /data-artplayer/);
		assert.match(result.code, /::artplayer/);
		assert.deepEqual(result.metadata.frontmatter.markdownSyntaxes.syntaxes, []);
	}
});

test("accepts safe local video and poster sources", async () => {
	const result = await render(
		'::artplayer{src="/videos/example.mp4" title="Local video" poster="/images/poster.webp"}',
	);

	assert.match(result.code, /src="\/videos\/example\.mp4"/);
	assert.match(result.code, /poster="\/images\/poster\.webp"/);
});
