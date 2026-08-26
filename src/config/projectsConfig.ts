import type { ProjectsConfig } from "@/types/projectsConfig";

/**
 * 项目页配置（展示与行为控制）。
 * - enable：页面总开关；false 时导航入口同步隐藏，访问 /projects/ 跳转 404；
 * - categories：筛选分类，数组顺序即 chips 顺序；
 * - disabledKeys：可选被禁用的项目 key 列表；
 * - 具体项目数据维护在 src/data/projects.ts 中。
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
};
