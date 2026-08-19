import type { ArticleConfig } from "@/types/articleConfig";

/**
 * 文章详情页配置。
 */
export const articleConfig: ArticleConfig = {
	lastUpdated: {
		// 关闭后不渲染最后更新提示。
		enable: true,
		// 按 UTC 日历日计算；达到该天数当天开始显示，0 表示立即显示。
		minimumAgeDays: 90,
	},
};

export function resolveLastUpdatedNoticeOptions(
	config: ArticleConfig,
): ArticleConfig["lastUpdated"] | null {
	return config.lastUpdated.enable ? config.lastUpdated : null;
}
