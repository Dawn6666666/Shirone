import type { TimelineConfig } from "@/types/timelineConfig";

/**
 * 时间线页配置。
 * - enable：页面总开关；false 时导航入口同步隐藏，访问 /timeline/ 跳转 404；
 * - categories：筛选分类，数组顺序即 chips 顺序；
 * - items：时间线节点清单，建议按时间倒序排列，单项可用 enable 独立关闭；
 * - featured：重点里程碑标记，带主题色外环与突出展示。
 */
export const timelineConfig: TimelineConfig = {
	enable: true,
	categories: [
		{
			key: "milestone",
			label: "Milestones",
			icon: "material-symbols:flag-rounded",
		},
		{
			key: "project",
			label: "Projects",
			icon: "material-symbols:code-rounded",
		},
		{
			key: "career",
			label: "Career",
			icon: "material-symbols:work-rounded",
		},
		{
			key: "education",
			label: "Education",
			icon: "material-symbols:school-rounded",
		},
		{
			key: "life",
			label: "Life",
			icon: "material-symbols:favorite-rounded",
		},
	],
	items: [
		{
			enable: true,
			title: "Shirone Theme M3E Major Architecture Upgrade",
			date: "2026.08",
			category: "milestone",
			subtitle: "Open Source Project",
			description:
				"Refactored the entire blog theme into a Material 3 Expressive atomic component system with token-driven styling, complete keyboard navigation, and full accessibility compliance.",
			highlights: [
				"Implemented dynamic HCT palette calculation and state layer tokens",
				"Added multi-page capabilities: Timeline, Skills, Projects, and Protected Albums",
				"Zero-error strict type-checking and automated visual regression locks",
			],
			tags: ["Astro", "Svelte 5", "M3E", "Tailwind 4"],
			links: [
				{
					label: "GitHub Repository",
					url: "https://github.com/saicaca/fuwari",
					icon: "fa6-brands:github",
				},
			],
			icon: "material-symbols:rocket-launch-rounded",
			featured: true,
		},
		{
			enable: true,
			title: "Senior Frontend Engineer",
			date: "2025.03 – Present",
			category: "career",
			subtitle: "Technology Lab",
			location: "Tokyo, Japan",
			description:
				"Leading frontend architecture, web performance optimization, and interactive design system development for modern web platforms.",
			highlights: [
				"Spearheaded design system unification across web products",
				"Reduced core bundle load times by 40% using modern SSR and asset pipelines",
			],
			tags: ["TypeScript", "Architecture", "Performance", "Design System"],
			icon: "material-symbols:work-rounded",
			featured: true,
		},
		{
			enable: true,
			title: "Full-Stack Web Application Launch",
			date: "2024.11",
			category: "project",
			subtitle: "Independent Creation",
			description:
				"Designed and built an end-to-end creative workflow application with real-time collaboration and cloud synchronization.",
			highlights: [
				"Designed intuitive fluid canvas interface with low-latency interaction",
				"Built serverless backend APIs with edge caching and relational persistence",
			],
			tags: ["Svelte", "Node.js", "PostgreSQL", "Cloudflare"],
			icon: "material-symbols:deployed-code-outline-rounded",
		},
		{
			enable: true,
			title: "Computer Science & Engineering Degree",
			date: "2020.09 – 2024.06",
			category: "education",
			subtitle: "University of Technology",
			location: "Hangzhou, China",
			description:
				"Focused on computer systems, software engineering, human-computer interaction, and distributed architectures.",
			highlights: [
				"Graduated with honors and outstanding graduate thesis award",
				"Led university open source student community and hackathons",
			],
			tags: ["Computer Science", "Algorithms", "Software Engineering"],
			icon: "material-symbols:school-rounded",
		},
		{
			enable: true,
			title: "Started Personal Blog & Tech Notes",
			date: "2022.04",
			category: "life",
			subtitle: "First Step into Tech Writing",
			description:
				"Published my first article online and began documenting frontend exploration, creative coding, and personal reflections.",
			tags: ["Blogging", "Writing", "Open Web"],
			icon: "material-symbols:edit-note-rounded",
		},
	],
};
