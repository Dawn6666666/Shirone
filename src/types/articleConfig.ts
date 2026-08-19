/** 文章详情页配置。 */
export interface ArticleConfig {
	lastUpdated: {
		/** 是否显示文章最后更新提示。 */
		enable: boolean;
		/** 距最后更新达到该日历天数时显示；0 表示立即显示。 */
		minimumAgeDays: number;
	};
}
