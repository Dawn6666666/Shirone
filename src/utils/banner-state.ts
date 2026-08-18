import type { WallpaperMode } from "@/types/config";
import type { SidebarPage } from "@/types/sidebarConfig";

export type BannerViewport = "desktop" | "mobile";
export type BannerContentLayout = "banner" | "compact";

export interface BannerStateInput {
	mode: WallpaperMode;
	page: SidebarPage | undefined;
	viewport: BannerViewport;
	imageCount: number;
	carouselEnabled: boolean;
	reducedMotion: boolean;
}

export interface BannerState {
	visible: boolean;
	assetGroup: BannerViewport | null;
	showHomeText: boolean;
	rotate: boolean;
	transparentTopAppBar: boolean;
	contentLayout: BannerContentLayout;
}

export function resolveBannerState(input: BannerStateInput): BannerState {
	const isHome = input.page === "home";
	const visible =
		input.mode === "banner" &&
		input.imageCount > 0 &&
		(input.viewport === "desktop" || isHome);

	return {
		visible,
		assetGroup: visible ? input.viewport : null,
		showHomeText: visible && isHome,
		rotate:
			visible &&
			input.carouselEnabled &&
			input.imageCount > 1 &&
			!input.reducedMotion,
		transparentTopAppBar: visible,
		contentLayout: visible ? "banner" : "compact",
	};
}
