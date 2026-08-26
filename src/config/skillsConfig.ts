import type { SkillsConfig } from "@/types/skillsConfig";

/**
 * 技能页配置（展示与行为控制）。
 * - enable：页面总开关；false 时导航入口同步隐藏，访问 /skills/ 跳转 404；
 * - categories：筛选分类，数组顺序即 chips 顺序；
 * - disabledNames：可选被禁用的技能名称列表；
 * - 具体技能数据维护在 src/data/skills.ts 中。
 */
export const skillsConfig: SkillsConfig = {
	enable: true,
	categories: [
		{
			key: "frontend",
			label: "Frontend",
			icon: "material-symbols:web-rounded",
		},
		{
			key: "backend",
			label: "Backend",
			icon: "material-symbols:dns-rounded",
		},
		{
			key: "tooling",
			label: "Tooling",
			icon: "material-symbols:construction-rounded",
		},
	],
};
