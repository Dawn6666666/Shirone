import type { TimelineConfig } from "@/types/timelineConfig";

/**
 * 时间线页配置（展示与行为控制）。
 * - enable：页面总开关；false 时导航入口同步隐藏，访问 /timeline/ 跳转 404；
 * - categories：筛选分类，数组顺序即 chips 顺序；
 * - order：排序方向，默认为 "desc"（时间倒序）；
 * - disabledTitles：可选被禁用的事件标题列表；
 * - 具体时间线数据维护在 src/data/timeline.ts 中。
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
};
