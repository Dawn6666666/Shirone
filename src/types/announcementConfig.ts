/**
 * 公告配置（侧栏 announcement widget 的内容源）。
 * 可见性由 sidebarConfig 对应 widget 条目的 enable 控制，这里只放内容。
 */
export interface AnnouncementConfig {
	/** leading 图标（iconify 名，留空则纯文本） */
	icon: string;
	/** 公告正文；为空时 widget 不渲染任何内容 */
	text: string;
}
