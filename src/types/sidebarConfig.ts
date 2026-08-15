/**
 * 侧栏配置类型。值与默认配置见 src/config/sidebarConfig.ts。
 *
 * 编排采用判别联合：每个 widget 只携带自己的配置项，新增 widget 时
 * 在此扩展联合分支，并在 SideBar.astro 的 componentMap 注册组件。
 */

/** widget 在侧栏中的停靠位：top 固定顶部 / sticky 跟随滚动 */
export type SidebarWidgetSlot = "top" | "sticky";

/** 资料卡（内容来自 profileConfig，无 WidgetLayout 标题外壳） */
export interface ProfileWidget {
	type: "profile";
	enable: boolean;
	slot: SidebarWidgetSlot;
}

/** 分类列表（超过 collapseAfter 个后折叠出「更多」） */
export interface CategoriesWidget {
	type: "categories";
	enable: boolean;
	slot: SidebarWidgetSlot;
	/** 折叠阈值，默认 5 */
	collapseAfter?: number;
}

/** 标签云（超过 collapseAfter 个后折叠出「更多」） */
export interface TagsWidget {
	type: "tags";
	enable: boolean;
	slot: SidebarWidgetSlot;
	/** 折叠阈值，默认 20 */
	collapseAfter?: number;
}

/** 公告（内容来自 announcementConfig，text 为空时不渲染） */
export interface AnnouncementWidget {
	type: "announcement";
	enable: boolean;
	slot: SidebarWidgetSlot;
}

export type SidebarWidget =
	| ProfileWidget
	| CategoriesWidget
	| TagsWidget
	| AnnouncementWidget;

/**
 * 侧栏整体配置（Shirone 精简版：单侧栏，不做 both 双侧栏与平板降级）。
 * components 渲染顺序 = 数组顺序，top 恒排在 sticky 之前。
 */
export interface SidebarConfig {
	enable: boolean;
	/** left（默认，站点既有）/ right */
	position: "left" | "right";
	components: SidebarWidget[];
}
