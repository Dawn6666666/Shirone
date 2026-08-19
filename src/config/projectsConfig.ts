import type { ProjectsConfig } from "@/types/projectsConfig";

/**
 * 项目页配置。
 * - enable：页面总开关；false 时导航入口同步隐藏，访问 /projects/ 跳转 404；
 * - categories：筛选分类，数组顺序即 chips 顺序；
 * - items：项目清单，featured 用于标记代表项目，单项可用 enable 独立关闭；
 * - cover：建议放在 public 下并填写站内绝对路径；缺省时使用 icon 视觉面板。
 */
export const projectsConfig: ProjectsConfig = {
	enable: true,
	categories: [
		{
			key: "theme",
			label: "Theme",
			icon: "material-symbols:palette-outline-rounded",
		},
		{
			key: "android",
			label: "Android",
			icon: "material-symbols:android-rounded",
		},
	],
	items: [
		{
			enable: true,
			key: "shirone",
			title: "Shirone",
			summary:
				"An Astro blog theme shaped around an M3E component system, expressive content, and resilient client navigation.",
			category: "theme",
			phase: "building",
			technologies: ["Astro", "Svelte", "TypeScript", "Tailwind CSS"],
			icon: "material-symbols:deployed-code-outline-rounded",
			cover: "/assets/projects/shirone.webp",
			coverAlt: "Shirone theme homepage preview",
			featured: true,
			repository: "https://github.com/LyraVoid/Shirone",
			year: "2026",
		},
		{
			enable: true,
			key: "folkpatch",
			title: "FolkPatch",
			summary: "A kernel-level root solution for Android, built on APatch.",
			category: "android",
			phase: "building",
			technologies: ["Kotlin", "APatch", "Android"],
			icon: "material-symbols:terminal-rounded",
			repository: "https://github.com/LyraVoid/FolkPatch",
		},
		{
			enable: true,
			key: "kernelpatch",
			title: "KernelPatch",
			summary:
				"A kernel patch framework that powers APatch-style root on Android by loading code into the running kernel.",
			category: "android",
			phase: "shipped",
			technologies: ["C", "Linux Kernel", "Android"],
			icon: "material-symbols:extension-outline-rounded",
			repository: "https://github.com/lyravoid/KernelPatch",
		},
	],
};
