import type { PostCardWidth, PostListConfig } from "@/types/postListConfig";

/**
 * 文章列表配置：分页大小与布局（list/grid × 封面位置 × 卡片宽度档位）。
 * 访客可在设置面板运行时切换 list/grid（localStorage `post-list-mode`，
 * 见 utils/layout-mode.ts），此处 mode 是站点默认值。
 */
export const postListConfig: PostListConfig = {
	pageSize: 8,
	layout: {
		mode: "list",
		cover: "right",
		cardWidth: "regular",
	},
};

/** grid 档位 → 卡片最小宽度（--post-card-min 预设，与 shape/type 分档哲学同构） */
export const POST_CARD_MIN_WIDTH: Record<PostCardWidth, string> = {
	compact: "17rem",
	regular: "20rem",
	relaxed: "24rem",
};
