import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import type { NavBarConfig, NavBarLink } from "@/types/config";

/**
 * 导航栏配置（统一单一来源）。
 * - LinkPresets：命名链接预设表 —— 名称 / 地址 / 图标单点维护，可整体复用；
 * - navBarConfig：导航结构 —— 顺序 + 分组（children 子菜单），
 *   同时驱动顶栏下拉菜单与全端导航抽屉。
 * 新增入口：先在 LinkPresets 登记预设，再在 navBarConfig.links 按序引用。
 */
export const LinkPresets: Record<string, NavBarLink> = {
	Home: {
		name: i18n(I18nKey.home),
		url: "/",
		icon: "material-symbols:home-outline-rounded",
	},
	Archive: {
		name: i18n(I18nKey.archive),
		url: "/archive/",
		icon: "material-symbols:archive-outline-rounded",
	},
	About: {
		name: i18n(I18nKey.about),
		url: "/about/",
		icon: "material-symbols:info-outline-rounded",
	},
	GitHub: {
		name: "GitHub",
		url: "https://github.com/saicaca/fuwari",
		icon: "fa6-brands:github",
		external: true,
	},
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPresets.Home,
		LinkPresets.Archive,
		{
			name: i18n(I18nKey.more),
			icon: "material-symbols:apps-rounded",
			children: [LinkPresets.About, LinkPresets.GitHub],
		},
	],
};
