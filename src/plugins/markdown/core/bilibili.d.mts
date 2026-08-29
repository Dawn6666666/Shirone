export const BILIBILI_BVID_PATTERN: RegExp;

export type BilibiliEmbedData = {
	bvid: string;
	title: string;
	part: number;
	poster: string;
};

export function getBilibiliEmbedData(
	attributes?: Record<string, unknown>,
): BilibiliEmbedData | null;

export function getBilibiliPlayerUrl(
	bvid: string,
	part: string | number,
): string | null;
