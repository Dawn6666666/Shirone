/** 技能熟练度：用于离散等级展示，不映射为伪精确百分比。 */
export type SkillLevel = "beginner" | "intermediate" | "advanced" | "expert";

/** 技能页分类。 */
export interface SkillCategory {
	/** 稳定标识，供技能引用与筛选。 */
	key: string;
	/** 用户可编辑的分类名称。 */
	label: string;
	/** Iconify 图标名。 */
	icon?: string;
}

/** 单项技能。 */
export interface SkillItem {
	/** 独立开关；关闭后不参与渲染与计数。 */
	enable: boolean;
	name: string;
	description?: string;
	icon?: string;
	category: SkillCategory["key"];
	level: SkillLevel;
}

/** 技能页配置。 */
export interface SkillsConfig {
	/** 页面总开关；关闭后隐藏导航入口并将 /skills/ 重定向到 404。 */
	enable: boolean;
	categories: SkillCategory[];
	items: SkillItem[];
}
