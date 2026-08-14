import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import type { NavBarConfig, NavBarLink } from "@/types/navBarConfig";

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
		pageKey: "home",
	},
	Archive: {
		name: i18n(I18nKey.archive),
		url: "/archive/",
		icon: "material-symbols:archive-outline-rounded",
		pageKey: "archive",
	},
	Categories: {
		name: i18n(I18nKey.categories),
		url: "/archive/",
		icon: "material-symbols:folder-outline-rounded",
		pageKey: "categories",
	},
	Tags: {
		name: i18n(I18nKey.tags),
		url: "/archive/",
		icon: "material-symbols:tag-rounded",
		pageKey: "tags",
	},
	About: {
		name: i18n(I18nKey.about),
		url: "/about/",
		icon: "material-symbols:info-outline-rounded",
		pageKey: "about",
	},
	GitHub: {
		name: "GitHub",
		url: "https://github.com/saicaca/fuwari",
		icon: "fa6-brands:github",
		external: true,
		pageKey: "github",
	},
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPresets.Home,
		LinkPresets.Archive,
		{
			name: i18n(I18nKey.more),
			icon: "material-symbols:apps-rounded",
			children: [
				// 分类/标签入口暂不启用（无独立页面），预设已登记，启用时取消注释即可
				// LinkPresets.Categories,
				// LinkPresets.Tags,
				LinkPresets.About,
				LinkPresets.GitHub,
			],
		},
	],
};
