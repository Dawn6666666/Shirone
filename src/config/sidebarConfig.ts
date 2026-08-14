/**
 * 侧边栏布局配置（Shirone 精简版，只保留 left/right 单侧栏，
 * 不做 both 双侧栏与 tablet 降级）。
 * 侧栏组件数据驱动：type 对应 components/molecules 或 organisms 的分子，
 * position 决定 top（固定顶部）还是 sticky（跟随滚动）。
 */
export interface SidebarComponentConfig {
	type: "profile" | "categories" | "tags";
	enable: boolean;
	position: "top" | "sticky";
}

export interface SidebarConfig {
	enable: boolean;
	/** left（默认，站点既有）/ right */
	position: "left" | "right";
	components: SidebarComponentConfig[];
}

export const sidebarConfig: SidebarConfig = {
	enable: true,
	position: "left",
	components: [
		{ type: "profile", enable: true, position: "top" },
		{ type: "categories", enable: true, position: "sticky" },
		{ type: "tags", enable: true, position: "sticky" },
	],
};
