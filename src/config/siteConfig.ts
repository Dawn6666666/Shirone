import type { SiteConfig } from "@/types/config";

/**
 * 站点核心配置：标题 / 语言 / 主题色（HCT 动态配色）/ 横幅 / 目录 / 进度条 / favicon。
 * 类型见 src/types/config.ts。
 */
export const siteConfig: SiteConfig = {
	site: "https://shirone.mysqil.com/",
	base: "/",
	title: "Shirone",
	subtitle: "A Material 3 anime blog",
	// 电脑端顶栏标题与导航内容区域："left" 左对齐，"center" 居中。
	topAppBar: {
		contentAlign: "center",
	},
	// 显示设置面板控制：配置各项前端切换项的可见性（默认全部开启）。
	displaySettings: {
		colorStyle: true, // 是否展示配色风格 9 宫格
		colorSpec: true, // 是否展示 Color Spec 调色规范切换
		wallpaperMode: true, // 是否展示页面背景（纯色/横幅）切换
		layoutMode: true, // 是否展示文章列表布局（列表/网格）切换
		reduceMotion: true, // 是否展示减少动效切换
	},
	lang: "en", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	themeColor: {
		hue: 315, // Default hue 0-360. ★ 站点设计默认粉紫（偏二次元）；262 紫 / 345 粉 也可选
		fixed: false, // Hide the theme color picker for visitors
		// Dynamic Material 3 palette style (TonalSpot/Vibrant/Content/Expressive/Rainbow/FruitSalad/Monochrome/Neutral/Fidelity)
		style: "tonalSpot",
		// Design spec version: "2021" (MD3) or "2025" (M3 Expressive)。角色集一致，
		// 差异仅在调色板派生（库的 colorSpec 静态为 2025 委托）
		spec: "2025",
	},
	// 默认页面背景模式："banner" 使用壁纸横幅，"none" 使用主题纯色。
	// 访客在“显示设置”中的选择会保存在浏览器中，并覆盖这里的默认值。
	wallpaperMode: {
		defaultMode: "banner",
	},
	banner: {
		// 将图片放入 public 目录，并填写以 "/" 开头的站点路径。
		// desktop 用于 >= 1024px；mobile 仅用于 < 1024px 的首页，手机非首页不显示壁纸。
		// 数组顺序就是轮播顺序；只需要静态 Banner 时，每组保留一张图片即可。
		src: {
			desktop: ["/assets/banner/desktop/1.webp"],
			mobile: ["/assets/banner/mobile/1.webp"],
		},
		// 图片裁切焦点："top"、"center" 或 "bottom"。
		position: "center",
		dim: {
			// 在图片上覆盖黑色遮罩以提高标题和顶部栏的对比度；opacity 范围为 0-1。
			enable: true,
			opacity: 0.24,
		},
		homeText: {
			// 仅在首页 Banner 中显示，标题与副标题会上下居中排列。
			enable: true,
			title: "Shirone",
			subtitle: "A Material 3 anime blog",
			typewriter: {
				// 副标题逐字显示；关闭后直接显示完整副标题。
				enable: true,
				// 每个字符（grapheme）的显示间隔，单位为毫秒。
				speed: 120,
				// 完成后是否从头循环播放；关闭表示只播放一次。
				loop: true,
			},
		},
		carousel: {
			// 多张图片时自动交叉淡入；interval 单位为毫秒，运行时最小值为 3000。
			enable: true,
			interval: 6000,
		},
		waves: {
			// 在 Banner 底部渲染页面背景色水波纹；关闭后不输出波浪 DOM。
			enable: true,
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	progressIndicator: {
		// 进度条预设样式：dual 双向扫描（官方默认双线）/ single 单向扫描（单线）
		style: "dual",
	},
	favicon: [
		// Leave this array empty to use the default favicon
		// {
		//   src: '/favicon/icon.png',    // Path of the favicon, relative to the /public directory
		//   theme: 'light',              // (Optional) Either 'light' or 'dark', set only if you have different favicons for light and dark mode
		//   sizes: '32x32',              // (Optional) Only if you have favicons of different sizes
		// }
	],
};

/** 站点默认配色风格（访客未做选择时的回退值） */
export function getDefaultStyle(): string {
	return siteConfig.themeColor.style;
}

/** 站点默认 Color Spec（2021 / 2025） */
export function getDefaultSpec(): string {
	return siteConfig.themeColor.spec;
}

/** 解析并返回显示设置面板各项开关（未配置时默认 true） */
export function resolveDisplaySettings(): {
	colorStyle: boolean;
	colorSpec: boolean;
	wallpaperMode: boolean;
	layoutMode: boolean;
	reduceMotion: boolean;
} {
	const cfg = siteConfig.displaySettings;
	return {
		colorStyle: cfg?.colorStyle ?? true,
		colorSpec: cfg?.colorSpec ?? true,
		wallpaperMode: cfg?.wallpaperMode ?? true,
		layoutMode: cfg?.layoutMode ?? true,
		reduceMotion: cfg?.reduceMotion ?? true,
	};
}
