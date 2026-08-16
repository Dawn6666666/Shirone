/**
 * 侧栏配置类型。值与默认配置见 src/config/sidebarConfig.ts。
 *
 * 编排采用判别联合：每个 widget 只携带自己的配置项，新增 widget 时
 * 在此扩展联合分支，并在 SideBar.astro 的 componentMap 注册组件。
 */

/** widget 在侧栏中的停靠位：top 固定顶部 / sticky 跟随滚动 */
export type SidebarWidgetSlot = "top" | "sticky";

/**
 * widget 所属列：primary 主栏（默认）/ secondary 副栏。
 * column 标签仅在 arrangement: "dual" 时生效；single 下全部落到主栏。
 */
export type SidebarColumn = "primary" | "secondary";

/** 侧栏编排：single 单栏 / dual 双栏（xl 1280px 起副栏介入） */
export type SidebarArrangement = "single" | "dual";

/** 主栏物理侧：left（默认）/ right；dual 下副栏落在对面 */
export type SidebarSide = "left" | "right";

/** 资料卡（内容来自 profileConfig，无 WidgetLayout 标题外壳） */
export interface ProfileWidget {
	type: "profile";
	enable: boolean;
	slot: SidebarWidgetSlot;
	column?: SidebarColumn;
}

/** 分类列表（超过 collapseAfter 个后折叠出「更多」） */
export interface CategoriesWidget {
	type: "categories";
	enable: boolean;
	slot: SidebarWidgetSlot;
	column?: SidebarColumn;
	/** 折叠阈值，默认 5 */
	collapseAfter?: number;
}

/** 标签云（超过 collapseAfter 个后折叠出「更多」） */
export interface TagsWidget {
	type: "tags";
	enable: boolean;
	slot: SidebarWidgetSlot;
	column?: SidebarColumn;
	/** 折叠阈值，默认 20 */
	collapseAfter?: number;
}

/** 公告（内容来自 announcementConfig，text 为空时不渲染） */
export interface AnnouncementWidget {
	type: "announcement";
	enable: boolean;
	slot: SidebarWidgetSlot;
	column?: SidebarColumn;
}

export type SidebarWidget =
	| ProfileWidget
	| CategoriesWidget
	| TagsWidget
	| AnnouncementWidget;

/**
 * 侧栏整体配置。components 渲染顺序 = 数组顺序，top 恒排在 sticky 之前。
 * arrangement 决定单/双栏：dual 时带 column: "secondary" 标签的 widget
 * 进入副栏（xl 1280px 以下自动退回单栏），其余留在主栏。
 */
export interface SidebarConfig {
	enable: boolean;
	arrangement: SidebarArrangement;
	/** 主栏物理侧，默认 left */
	side: SidebarSide;
	components: SidebarWidget[];
}
