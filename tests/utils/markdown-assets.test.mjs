import assert from "node:assert/strict";
import { test } from "node:test";

import { getMarkdownStylesheetAssets } from "../../src/utils/markdown-assets.ts";

test("resolves only manifest-declared Markdown stylesheet packs", async () => {
	assert.deepEqual(await getMarkdownStylesheetAssets({}), []);

	const assets = await getMarkdownStylesheetAssets({
		imageGrids: true,
		trees: true,
	});

	assert.deepEqual(
		assets.map(({ pack }) => pack),
		["image-grids", "trees"],
	);
	assert.match(assets[0].css, /\.image-grid/);
	assert.match(assets[1].css, /\.m3-file-tree/);
});
