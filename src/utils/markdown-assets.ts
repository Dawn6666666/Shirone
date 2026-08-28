import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

type MarkdownAssetFeature = "collapsePanels" | "trees";
type MarkdownStylesheetPack = "collapse-panels" | "trees";

const treesStylesheetPath = resolve(
	process.cwd(),
	"src/styles/markdown/trees.css",
);
const collapsePanelsStylesheetPath = resolve(
	process.cwd(),
	"src/styles/markdown/collapse-panels.css",
);

export type MarkdownFeatureSnapshot = Partial<
	Record<MarkdownAssetFeature, boolean>
>;

export type MarkdownStylesheetAsset = {
	pack: MarkdownStylesheetPack;
	loadCss: () => Promise<string>;
};

const stylesheetAssets: Record<
	MarkdownAssetFeature,
	readonly MarkdownStylesheetAsset[]
> = {
	collapsePanels: [
		{
			pack: "collapse-panels",
			loadCss: () => readFile(collapsePanelsStylesheetPath, "utf8"),
		},
	],
	trees: [
		{
			pack: "trees",
			loadCss: () => readFile(treesStylesheetPath, "utf8"),
		},
	],
};

/**
 * Resolves page-scoped stylesheets from the Markdown compiler's feature snapshot.
 * The template marks each style block as Swup-optional so stale syntax styles are removed.
 */
export async function getMarkdownStylesheetAssets(
	features: MarkdownFeatureSnapshot,
): Promise<Array<{ pack: MarkdownStylesheetPack; css: string }>> {
	const assets = (
		Object.keys(stylesheetAssets) as MarkdownAssetFeature[]
	).flatMap((feature) => (features[feature] ? stylesheetAssets[feature] : []));
	return Promise.all(
		assets.map(async ({ pack, loadCss }) => ({
			pack,
			css: await loadCss(),
		})),
	);
}
