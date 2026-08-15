/**
 * 侧边栏布局配置（Shirone 精简版，只保留 left/right 单侧栏，
 * 不做 both 双侧栏与 tablet 降级）。
 * widget 编排数据驱动：type 对应 SideBar.astro componentMap 中注册的
 * 组件，slot 决定 top（固定顶部）还是 sticky（跟随滚动），
 * 渲染顺序 = 数组顺序（top 恒在 sticky 之前）。
 * 类型见 src/types/sidebarConfig.ts（判别联合，新增 widget 先扩展联合分支）。
 */
import type { SidebarConfig } from "@/types/sidebarConfig";

export const sidebarConfig: SidebarConfig = {
	enable: true,
	position: "left",
	components: [
		{ type: "profile", enable: true, slot: "top" },
		{ type: "announcement", enable: false, slot: "top" },
		{ type: "categories", enable: true, slot: "sticky" },
		{ type: "tags", enable: true, slot: "sticky" },
	],
};
