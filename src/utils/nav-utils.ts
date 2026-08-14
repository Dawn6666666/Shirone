import type { NavBarLink } from "@/types/config";

export type ResolvedNavBarLink = Omit<NavBarLink, "children"> & {
	children?: ResolvedNavBarLink[];
};

export function resolveNavBarLinks(links: NavBarLink[]): ResolvedNavBarLink[] {
	return links.map((link) => ({
		...link,
		children: link.children ? resolveNavBarLinks(link.children) : undefined,
	}));
}
