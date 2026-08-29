import type { ResolvedUmamiOptions, UmamiConfig } from "@/types/umamiConfig";

/**
 * Umami 统计配置单一真源（由 oddmisc 提供）。
 *
 * 遵循「零额外负担」原则：默认全局关闭（enable: false），
 * 在未开启时不产生任何外部网络请求、零额外 DOM 占位与零包体积膨胀。
 *
 * 详细用法见：`docs/umami-guide.md`
 */
export const umamiConfig: UmamiConfig = {
	/** 全局 Umami 统计总开关：false 时完全不加载 oddmisc 运行时脚本与 DOM */
	enable: false,
	/** Umami 分享链接（必填） */
	shareUrl: "",
	/** 缓存 TTL（毫秒，默认 1 小时） */
	cacheTtl: 3600_000,
};

/**
 * 解析并校验 Umami 配置。未启用或关键参数缺失时返回 null。
 */
export function resolveUmamiOptions(config: UmamiConfig): ResolvedUmamiOptions {
	if (!config.enable) {
		return null;
	}
	const shareUrl = config.shareUrl?.trim();
	if (!shareUrl) {
		return null;
	}
	return {
		shareUrl,
		cacheTtl: config.cacheTtl ?? 3600_000,
	};
}

export type { ResolvedUmamiOptions };
