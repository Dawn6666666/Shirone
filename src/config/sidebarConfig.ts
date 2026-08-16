/**
 * 侧边栏布局配置（数据驱动编排）。
 * widget 编排：type 对应 SideBar.astro componentMap 中注册的组件，
 * slot 决定 top（固定顶部）还是 sticky（跟随滚动），
 * 渲染顺序 = 数组顺序（top 恒在 sticky 之前）。
 * arrangement 控制单/双栏：
 * - "single"（默认）：全部 widget 渲染进唯一侧栏；
 * - "dual"：column: "secondary" 的 widget 进入副栏（xl 1280px 起），
 *   lg→xl 之间自动退回单栏；side 决定主栏在左还是在右，副栏落对面。
 * 类型见 src/types/sidebarConfig.ts（判别联合，新增 widget 先扩展联合分支）。
 */
import type { SidebarConfig } from "@/types/sidebarConfig";

export const sidebarConfig: SidebarConfig = {
	enable: true,
	arrangement: "dual",
	side: "left",
	components: [
		{ type: "profile", enable: true, slot: "top" },
		{ type: "announcement", enable: false, slot: "top", pages: ["home"] },
		{ type: "categories", enable: true, slot: "sticky" },
		{ type: "stats", enable: true, slot: "top", column: "secondary", pages: ["home", "archive"] },
		{ type: "tags", enable: true, slot: "sticky", column: "secondary" },
	],
};
