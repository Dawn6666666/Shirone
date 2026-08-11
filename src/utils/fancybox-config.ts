/**
 * Fancybox 配置模块
 * 提供图片灯箱的选择器和默认选项
 */

import type { FancyboxOptions } from "@fancyapps/ui";

// Fancybox 配置类型
export type FancyboxConfig = Partial<FancyboxOptions>;

// 默认 Fancybox 配置
export const getDefaultFancyboxConfig = (): FancyboxConfig => ({
	Carousel: {
		infinite: true,
		Lazyload: { preload: 3 },
		Thumbs: { showOnStart: true },
		Toolbar: {
			display: {
				left: ["counter"],
				middle: [
					"zoomIn",
					"zoomOut",
					"toggle1to1",
					"rotateCCW",
					"rotateCW",
					"flipX",
					"flipY",
					"reset",
				],
				right: ["autoplay", "fullscreen", "thumbs", "close"],
			},
		},
		Zoomable: {
			Panzoom: { maxScale: 3, minScale: 1 },
		},
	},
	dragToClose: true,
	keyboard: {
		Escape: "close",
		Delete: "close",
		Backspace: "close",
		PageUp: "next",
		PageDown: "prev",
		ArrowUp: "next",
		ArrowDown: "prev",
		ArrowRight: "next",
		ArrowLeft: "prev",
	},
});

// Fancybox 选择器
export const FANCYBOX_SELECTORS = {
	// 文章正文图片和封面图
	articleImages: ".custom-md img, #post-cover img",

	// 带 data-fancybox 属性的元素（预留扩展）
	singleFancybox: "[data-fancybox]",
} as const;
