import type { CommentConfig, TwikooConfig } from "@/types/commentConfig";

/**
 * 评论系统配置单一真源。
 * 遵循「零额外负担」原则：默认全局关闭（enable: false），不产生任何网络请求与额外 DOM。
 */
export const commentConfig: CommentConfig = {
	enable: false,
	provider: "none",
	lazy: true,
	twikoo: {
		envId: "",
		scriptUrl: "https://cdn.jsdelivr.net/npm/twikoo@1.7.19/dist/twikoo.min.js",
		lang: "auto",
		// 评论输入框内的灰色说明文字，例如："Share your thoughts..."
		placeholder: "Share your thoughts...",
	},
};

export type ResolvedCommentOptions = {
	provider: "twikoo";
	lazy: boolean;
	twikoo: TwikooConfig;
} | null;

/**
 * 解析并校验评论配置。未启用、提供商为 none 或关键参数缺失时返回 null。
 */
export function resolveCommentOptions(
	config: CommentConfig,
): ResolvedCommentOptions {
	if (!config.enable || config.provider === "none") {
		return null;
	}
	if (config.provider === "twikoo") {
		const envId = config.twikoo.envId?.trim();
		const scriptUrl = config.twikoo.scriptUrl?.trim();
		if (!envId || !scriptUrl) {
			return null;
		}
		return {
			provider: "twikoo",
			lazy: config.lazy,
			twikoo: {
				...config.twikoo,
				envId,
				scriptUrl,
			},
		};
	}
	return null;
}
