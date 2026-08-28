// The stylesheets are inlined by the bundler rather than read from disk at
// render time: `process.cwd()` is the *user's* project when the theme runs as
// an npm package, where `src/styles/` does not exist, so a filesystem lookup
// would fail the build for every article that uses these features.
import collapsePanelsCss from "../styles/markdown/collapse-panels.css?raw";
import treesCss from "../styles/markdown/trees.css?raw";

type MarkdownAssetFeature = "collapsePanels" | "trees";
type MarkdownStylesheetPack = "collapse-panels" | "trees";

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
			loadCss: async () => collapsePanelsCss,
		},
	],
	trees: [
		{
			pack: "trees",
			loadCss: async () => treesCss,
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
