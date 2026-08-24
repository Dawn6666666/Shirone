import type { FabConfig } from "@/types/fabConfig";

/**
 * 右下角 FAB 导航系统配置。
 * - 桌面端使用持久侧栏 TOC，隐藏悬浮 TOC；
 * - 手机/平板端显示悬浮 TOC；
 * - 评论 FAB 仅在评论系统与当前文章同时启用时输出。
 */
export const fabConfig: FabConfig = {
	enable: true,
	align: "end",
	size: "regular",
	offset: {
		bottom: "var(--m3e-space-8)",
		right: "var(--m3e-space-6)",
	},
	items: [
		{
			type: "top",
			enable: true,
			devices: ["mobile", "tablet", "desktop"],
		},
		{
			type: "toc",
			enable: true,
			devices: ["mobile", "tablet"],
			pages: ["post"],
			depth: 3,
			closeOnSelect: true,
		},
		{
			type: "comment",
			enable: true,
			devices: ["mobile", "tablet"],
			pages: ["post"],
		},
		{
			type: "home",
			enable: true,
			devices: ["mobile", "tablet"],
			onlySubPages: true,
		},
	],
};
