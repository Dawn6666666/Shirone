/**
 * Umami 统计配置类型（由 oddmisc 提供）。
 */
export type UmamiConfig = {
	/** 全局 Umami 统计总开关：false 时完全不加载 oddmisc 运行时脚本与 DOM */
	enable: boolean;
	/** Umami 分享链接（必填） */
	shareUrl: string;
	/** 缓存 TTL（毫秒，默认 1 小时） */
	cacheTtl?: number;
};

/**
 * 解析后的 Umami 配置选项。
 */
export type ResolvedUmamiOptions = {
	shareUrl: string;
	cacheTtl: number;
} | null;
