import type { AUTO_MODE, DARK_MODE, LIGHT_MODE } from "@constants/constants";

export type WallpaperMode = "banner" | "none";

export type SiteConfig = {
	title: string;
	subtitle: string;

	lang:
		| "en"
		| "zh_CN"
		| "zh_TW"
		| "ja"
		| "ko"
		| "es"
		| "th"
		| "vi"
		| "tr"
		| "id";

	themeColor: {
		hue: number;
		fixed: boolean;
		style: string;
		spec: string;
	};
	wallpaperMode: {
		defaultMode: WallpaperMode;
	};
	banner: {
		src: {
			desktop: string[];
			mobile: string[];
		};
		position?: "top" | "center" | "bottom";
		dim: {
			enable: boolean;
			opacity: number;
		};
		homeText: {
			enable: boolean;
			title: string;
			subtitle: string;
		};
		carousel: {
			enable: boolean;
			interval: number;
		};
	};
	toc: {
		enable: boolean;
		depth: 1 | 2 | 3;
	};

	/** 进度条预设样式（页面切换进度条等，仅线性扫描模式） */
	progressIndicator: {
		/** dual 双向扫描（官方默认双线）/ single 单向扫描（单线） */
		style: "dual" | "single";
	};

	favicon: Favicon[];
};

export type Favicon = {
	src: string;
	theme?: "light" | "dark";
	sizes?: string;
};

export type ProfileConfig = {
	avatar?: string;
	name: string;
	bio?: string;
	links: {
		name: string;
		url: string;
		icon: string;
	}[];
};

export type LicenseConfig = {
	enable: boolean;
	name: string;
	url: string;
};

export type LIGHT_DARK_MODE =
	| typeof LIGHT_MODE
	| typeof DARK_MODE
	| typeof AUTO_MODE;

export type BlogPostData = {
	body: string;
	title: string;
	published: Date;
	description: string;
	tags: string[];
	draft?: boolean;
	image?: string;
	category?: string;
	prevTitle?: string;
	prevSlug?: string;
	nextTitle?: string;
	nextSlug?: string;
};

export type ExpressiveCodeConfig = {
	theme: string;
	lightTheme?: string;
	darkTheme?: string;
};
