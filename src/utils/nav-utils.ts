import { LinkPresets } from "@constants/link-presets";
import type { LinkPreset, NavBarEntry, NavBarLink } from "@/types/config";

export type ResolvedNavBarLink = Omit<NavBarLink, "children"> & {
	children?: ResolvedNavBarLink[];
};

export function resolveNavBarLinks(entries: NavBarEntry[]): ResolvedNavBarLink[] {
	return entries.map((entry) => {
		const link =
			typeof entry === "number" ? LinkPresets[entry as LinkPreset] : entry;
		return {
			...link,
			children: link.children
				? resolveNavBarLinks(link.children)
				: undefined,
		};
	});
}
