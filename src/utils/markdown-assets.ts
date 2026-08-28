import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

type MarkdownAssetFeature =
	| "abbreviations"
	| "admonitions"
	| "collapsePanels"
	| "contentAnnotations"
	| "marker"
	| "optionGroups"
	| "steps"
	| "trees";
type MarkdownStylesheetPack =
	| "abbreviations"
	| "admonitions"
	| "collapse-panels"
	| "content-annotations"
	| "marker"
	| "option-groups"
	| "steps"
	| "trees";

const treesStylesheetPath = resolve(
	process.cwd(),
	"src/styles/markdown/trees.css",
);
const abbreviationsStylesheetPath = resolve(
	process.cwd(),
	"src/styles/markdown/abbreviations.css",
);
const admonitionsStylesheetPath = resolve(
	process.cwd(),
	"src/styles/markdown/admonitions.css",
);
const collapsePanelsStylesheetPath = resolve(
	process.cwd(),
	"src/styles/markdown/collapse-panels.css",
);
const markerStylesheetPath = resolve(
	process.cwd(),
	"src/styles/markdown/marker.css",
);
const contentAnnotationsStylesheetPath = resolve(
	process.cwd(),
	"src/styles/markdown/content-annotations.css",
);
const optionGroupsStylesheetPath = resolve(
	process.cwd(),
	"src/styles/markdown/option-groups.css",
);
const stepsStylesheetPath = resolve(
	process.cwd(),
	"src/styles/markdown/steps.css",
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
	abbreviations: [
		{
			pack: "abbreviations",
			loadCss: () => readFile(abbreviationsStylesheetPath, "utf8"),
		},
	],
	admonitions: [
		{
			pack: "admonitions",
			loadCss: () => readFile(admonitionsStylesheetPath, "utf8"),
		},
	],
	collapsePanels: [
		{
			pack: "collapse-panels",
			loadCss: () => readFile(collapsePanelsStylesheetPath, "utf8"),
		},
	],
	contentAnnotations: [
		{
			pack: "content-annotations",
			loadCss: () => readFile(contentAnnotationsStylesheetPath, "utf8"),
		},
	],
	marker: [
		{
			pack: "marker",
			loadCss: () => readFile(markerStylesheetPath, "utf8"),
		},
	],
	optionGroups: [
		{
			pack: "option-groups",
			loadCss: () => readFile(optionGroupsStylesheetPath, "utf8"),
		},
	],
	steps: [
		{
			pack: "steps",
			loadCss: () => readFile(stepsStylesheetPath, "utf8"),
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
