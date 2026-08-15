/**
 * 侧栏配置类型。值与默认配置见 src/config/sidebarConfig.ts。
 * 对齐 navBarConfig 先例：类型放 src/types/，配置文件只放值。
 */

/** 单个侧栏组件的编排配置（出现顺序 / 启用 / 位置） */
export interface SidebarComponentConfig {
	type: "profile" | "categories" | "tags";
	enable: boolean;
	position: "top" | "sticky";
}

/** 侧栏整体配置（Shirone 精简版：单侧栏，不做 both 双侧栏与平板降级） */
export interface SidebarConfig {
	enable: boolean;
	/** left（默认，站点既有）/ right */
	position: "left" | "right";
	components: SidebarComponentConfig[];
}
